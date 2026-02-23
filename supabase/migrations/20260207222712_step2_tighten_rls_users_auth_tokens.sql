/*
  # Step 2: Tighten RLS on Users, Auth & Token Tables

  Replaces wide-open policies on 6 tables related to user accounts,
  authentication tokens, and invitation/password templates.

  ## New RPC Functions (SECURITY DEFINER)
    - `lookup_email_by_username(p_username text, p_role_filter text)` 
      Returns email for an active user by username (used pre-auth in login flow)
    - `update_own_last_login()` 
      Updates last_login for the calling authenticated user
    - `validate_registration_token(p_token text)` 
      Returns token validity and user_id (used pre-auth in password setup)
    - `mark_registration_token_used(p_token text)` 
      Marks a registration token as used (used pre-auth in password setup)

  ## Tables Modified
    - `users` (4 public policies removed, 4 new policies added)
    - `password_reset_tokens` (3 public policies removed, no public policies added)
    - `password_reset_templates` (3 policies removed, 4 admin policies added)
    - `user_registration_tokens` (4 public policies removed, no public policies added)
    - `invitation_email_templates` (6 anon/auth policies removed, 4 admin policies added)
    - `clients` (1 public FOR ALL removed, 4 policies added)

  ## Security Changes
    - `users`: SELECT requires auth (own row or admin); all writes require admin
    - `password_reset_tokens`: no public/anon/authenticated policies (service role only)
    - `password_reset_templates`: all operations require admin
    - `user_registration_tokens`: no public policies (service role only); RPC for validate/mark-used
    - `invitation_email_templates`: all operations require admin
    - `clients`: SELECT requires auth; writes require admin
    - Edge functions (service role) are unaffected

  ## Important Notes
    1. Pre-auth username lookup now goes through a SECURITY DEFINER RPC
    2. Registration token validation now goes through SECURITY DEFINER RPCs
    3. Non-admin users can only SELECT their own row in `users`
    4. The `last_login` update is now handled by a SECURITY DEFINER RPC
*/

-- ============================================================
-- RPC: lookup_email_by_username
-- Used pre-auth in login flow to convert username -> email
-- ============================================================
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

-- ============================================================
-- RPC: update_own_last_login
-- Authenticated user updates only their own last_login
-- ============================================================
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

-- ============================================================
-- RPC: validate_registration_token
-- Returns token validity + user_id for password setup page
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_registration_token(p_token text)
RETURNS TABLE(valid boolean, user_id uuid, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
BEGIN
  SELECT t.user_id, t.expires_at, t.is_used
  INTO v_record
  FROM public.user_registration_tokens t
  WHERE t.token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Invalid token'::text;
    RETURN;
  END IF;

  IF v_record.is_used THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Token has already been used'::text;
    RETURN;
  END IF;

  IF v_record.expires_at < now() THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Token has expired'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_record.user_id, NULL::text;
END;
$$;

-- ============================================================
-- RPC: mark_registration_token_used
-- Marks a token as used during password setup
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_registration_token_used(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_registration_tokens
  SET is_used = true, used_at = now()
  WHERE token = p_token AND is_used = false;

  RETURN FOUND;
END;
$$;

-- ============================================================
-- users: drop 4 public policies, add admin + own-row policies
-- ============================================================
DROP POLICY IF EXISTS "Allow public read access to users" ON users;
DROP POLICY IF EXISTS "Allow public insert access to users" ON users;
DROP POLICY IF EXISTS "Allow public update access to users" ON users;
DROP POLICY IF EXISTS "Allow public delete access to users" ON users;

CREATE POLICY "Authenticated can select own row or admin all"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- password_reset_tokens: drop all public policies (service role only)
-- ============================================================
DROP POLICY IF EXISTS "Public can validate tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "System can create tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "System can update tokens" ON password_reset_tokens;

-- ============================================================
-- password_reset_templates: drop existing, add admin-only
-- ============================================================
DROP POLICY IF EXISTS "Public can read templates" ON password_reset_templates;
DROP POLICY IF EXISTS "Authenticated can insert templates" ON password_reset_templates;
DROP POLICY IF EXISTS "Authenticated can update templates" ON password_reset_templates;

CREATE POLICY "Admins can select password_reset_templates"
  ON password_reset_templates FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert password_reset_templates"
  ON password_reset_templates FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update password_reset_templates"
  ON password_reset_templates FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete password_reset_templates"
  ON password_reset_templates FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- user_registration_tokens: drop all public policies (service role + RPC only)
-- ============================================================
DROP POLICY IF EXISTS "Allow public read access to registration tokens" ON user_registration_tokens;
DROP POLICY IF EXISTS "Allow public insert access to registration tokens" ON user_registration_tokens;
DROP POLICY IF EXISTS "Allow public update access to registration tokens" ON user_registration_tokens;
DROP POLICY IF EXISTS "Allow public delete access to registration tokens" ON user_registration_tokens;

-- ============================================================
-- invitation_email_templates: drop 6 anon/auth policies, add admin-only
-- ============================================================
DROP POLICY IF EXISTS "Allow anon to read invitation templates" ON invitation_email_templates;
DROP POLICY IF EXISTS "Allow anon to insert invitation templates" ON invitation_email_templates;
DROP POLICY IF EXISTS "Allow anon to update invitation templates" ON invitation_email_templates;
DROP POLICY IF EXISTS "Allow anon to delete invitation templates" ON invitation_email_templates;
DROP POLICY IF EXISTS "Allow authenticated to read invitation templates" ON invitation_email_templates;
DROP POLICY IF EXISTS "Allow authenticated to update invitation templates" ON invitation_email_templates;

CREATE POLICY "Admins can select invitation_email_templates"
  ON invitation_email_templates FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert invitation_email_templates"
  ON invitation_email_templates FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update invitation_email_templates"
  ON invitation_email_templates FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete invitation_email_templates"
  ON invitation_email_templates FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- clients: drop 1 public FOR ALL, add auth SELECT + admin writes
-- ============================================================
DROP POLICY IF EXISTS "Enable all access for clients" ON clients;

CREATE POLICY "Authenticated can select clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (public.is_admin());
