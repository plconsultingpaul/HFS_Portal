/*
  # Create missing auth.users entries

  1. Changes
    - Creates Supabase Auth accounts for users in `public.users` who have an email
      but were skipped during the original auth migration (because they had no email at that time)
    - Uses the SAME UUID as the existing user to preserve all foreign key relationships
    - Sets a temporary password: 'TempPass123!' (should be changed via password reset)

  2. Important Notes
    - Only affects users who exist in `public.users` but NOT in `auth.users`
    - The admin user was skipped during the original migration because they had no email set at that time
*/

DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN
    SELECT id, email, username
    FROM public.users
    WHERE email IS NOT NULL
    AND id NOT IN (SELECT id FROM auth.users)
  LOOP
    BEGIN
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        user_record.id,
        'authenticated',
        'authenticated',
        user_record.email,
        crypt('TempPass123!', gen_salt('bf')),
        NOW(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
        jsonb_build_object('username', user_record.username),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
      );

      INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        user_record.id,
        user_record.id,
        user_record.email,
        jsonb_build_object('sub', user_record.id::text, 'email', user_record.email),
        'email',
        NOW(),
        NOW(),
        NOW()
      );

      RAISE NOTICE 'Created auth account for user: % (%)', user_record.username, user_record.email;
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'Auth account already exists for user: %', user_record.username;
    END;
  END LOOP;
END $$;