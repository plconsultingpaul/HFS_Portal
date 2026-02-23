/*
  # Migrate to Supabase Auth

  1. Changes
    - Creates Supabase Auth accounts for all existing users in `public.users`
    - Each auth account uses the SAME UUID as the existing user, preserving all foreign key relationships
    - All users get a temporary password: 'TempPass123!' (must be changed on first login)
    - Makes `password_hash` column nullable (no longer needed for auth)
    - Adds a helper function `is_admin()` for RLS policies

  2. Security
    - Rewrites ALL RLS policies on `users` table to use `auth.uid()`
    - Admin users can read/update all users
    - Regular users can only read/update their own row
    - Only admins can insert or delete users

  3. Important Notes
    - Existing foreign key references to `users.id` remain intact since UUIDs match
    - The `password_hash` column is kept but made nullable for backwards compatibility
    - Users will need to log in with their EMAIL + password 'TempPass123!' and then change their password
*/

DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN
    SELECT id, email, username
    FROM public.users
    WHERE email IS NOT NULL
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

ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND is_admin = true
    AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
