# Fix Empty auth.sessions - Complete Supabase Auth Setup Guide

## Problem
The `auth.sessions` table is completely empty. Users may exist in `auth.users` but no sessions are being created, which means login is not working through Supabase Auth.

## Root Cause
`auth.sessions` rows are created **automatically** by Supabase when `supabase.auth.signInWithPassword()` is called successfully. If sessions are empty, it means one or more of these issues:

1. The login flow is still using the old custom auth (checking `password_hash` in `public.users`) instead of `supabase.auth.signInWithPassword()`
2. Users don't exist in `auth.users` table (the migration wasn't run)
3. Users exist in `auth.users` but are missing from `auth.identities` (Supabase requires both)
4. The `email_confirmed_at` column is NULL in `auth.users` (unconfirmed users can't sign in)

## How Sessions Get Populated

The flow is:
1. User enters username/password on login page
2. If username (not email), the app calls `supabase.rpc('lookup_email_by_username')` to resolve the email
3. App calls `supabase.auth.signInWithPassword({ email, password })`
4. Supabase automatically creates a row in `auth.sessions` and returns a JWT
5. The JWT is used for all subsequent API calls

No manual session creation is needed. Fix the auth setup and sessions will populate on their own.

---

## Step-by-Step Fix

### Step 1: Run the User Migration to auth.users

This migration creates Supabase Auth accounts for all existing users in `public.users`. It preserves the same UUID so all foreign key relationships remain intact.

**IMPORTANT**: Every user in `public.users` must have an `email` column value. If email is missing, populate it first.

```sql
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
```

**After running this**: All users will have temporary password `TempPass123!`. They must log in with their **email** (not username, unless Step 2 is also done) and this password, then change it.

### Step 2: Create Required RPC Helper Functions

These functions are needed by the login flow:

```sql
-- Allow username-based login (resolves username to email for signInWithPassword)
CREATE OR REPLACE FUNCTION public.lookup_email_by_username(
  p_username text,
  p_role_filter text DEFAULT NULL
)
RETURNS TABLE(email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_role_filter = 'client' THEN
    RETURN QUERY
      SELECT u.email FROM public.users u
      WHERE u.username = p_username
        AND u.is_active = true
        AND u.role = 'client'
      LIMIT 1;
  ELSIF p_role_filter = 'admin' THEN
    RETURN QUERY
      SELECT u.email FROM public.users u
      WHERE u.username = p_username
        AND u.is_active = true
        AND u.role != 'client'
      LIMIT 1;
  ELSE
    RETURN QUERY
      SELECT u.email FROM public.users u
      WHERE u.username = p_username
        AND u.is_active = true
      LIMIT 1;
  END IF;
END;
$$;

-- Track last login timestamp
CREATE OR REPLACE FUNCTION public.update_own_last_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET last_login = now()
  WHERE id = auth.uid();
END;
$$;

-- Helper to check if current user is admin (used in RLS policies)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND is_admin = true
    AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### Step 3: Update the Login Flow in useAuth.ts

The `login` function must use `supabase.auth.signInWithPassword()`. Here is the working pattern:

```typescript
const login = async (emailOrUsername: string, password: string, loginType?: 'admin' | 'client') => {
  try {
    let email = emailOrUsername;

    // If user entered a username (not an email), resolve it to an email
    if (!emailOrUsername.includes('@')) {
      const roleFilter = loginType === 'client' ? 'client' : loginType === 'admin' ? 'admin' : null;
      const { data } = await supabase.rpc('lookup_email_by_username', {
        p_username: emailOrUsername,
        p_role_filter: roleFilter
      });
      if (!data || data.length === 0) return { success: false, message: 'Invalid credentials' };
      email = data[0].email;
    }

    // THIS is what creates the auth.sessions row:
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) return { success: false, message: 'Invalid credentials' };

    // Fetch the user profile from public.users
    const profile = await fetchUserProfile(authData.user.id, loginType);
    if (!profile) {
      await supabase.auth.signOut();
      return { success: false, message: 'User profile not found or inactive' };
    }

    // Track last login
    await supabase.rpc('update_own_last_login');

    return { success: true };
  } catch (error) {
    return { success: false, message: 'Login failed. Please try again.' };
  }
};
```

### Step 4: Update Auth State Initialization

On app load, check for an existing Supabase session:

```typescript
useEffect(() => {
  const initializeAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await fetchUserProfile(session.user.id);
      if (profile) {
        setAuthState({ isAuthenticated: true, user: profile });
      }
    }
    setLoading(false);
  };

  initializeAuth();

  // Listen for auth state changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      setAuthState({ isAuthenticated: false, user: null });
    }
    if (event === 'SIGNED_IN' && session?.user) {
      (async () => {
        const profile = await fetchUserProfile(session.user.id);
        if (profile) setAuthState({ isAuthenticated: true, user: profile });
      })();
    }
  });

  return () => subscription.unsubscribe();
}, []);
```

### Step 5: Update Logout to Use Supabase Auth

```typescript
const handleLogout = async () => {
  await supabase.auth.signOut();
  setAuthState({ isAuthenticated: false, user: null });
};
```

### Step 6: Deploy manage-auth-user Edge Function

This edge function handles user create/delete/password operations using the service role key.

**CRITICAL**: Deploy with `verify_jwt: false` because:
- The function handles its own JWT verification internally via `auth.getUser(token)`
- If `verify_jwt` is `true`, Supabase gateway rejects the request with 401 before it reaches your code
- Security is maintained because the function validates the token and checks admin status itself

### Step 7: Update the invokeEdgeFunction Helper

Edge functions should be called with the current session's access token:

```typescript
async function invokeEdgeFunction(functionName: string, body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    return { data: null, error: data?.error || `HTTP ${response.status}` };
  }
  return { data, error: null };
}
```

---

## Verification Checklist

After completing the steps above:

1. **Check auth.users has entries**: `SELECT count(*) FROM auth.users;`
2. **Check auth.identities has entries**: `SELECT count(*) FROM auth.identities;`
3. **Check email_confirmed_at is NOT NULL**: `SELECT id, email, email_confirmed_at FROM auth.users WHERE email_confirmed_at IS NULL;`
4. **Log in with a user** - after successful login, check: `SELECT count(*) FROM auth.sessions;`
5. **If sessions are still empty** after login attempt, check the browser console for errors on the `signInWithPassword` call

## Common Pitfalls

- **Missing auth.identities**: If you only insert into `auth.users` but not `auth.identities`, login will fail silently
- **email_confirmed_at is NULL**: Supabase won't allow sign-in for unconfirmed emails
- **Wrong instance_id**: Must be `'00000000-0000-0000-0000-000000000000'`
- **manage-auth-user deployed with verify_jwt: true**: Will return 401 on all user management operations
- **Old login flow still active**: If the code still checks `password_hash` in `public.users` instead of calling `signInWithPassword`, no sessions will be created
