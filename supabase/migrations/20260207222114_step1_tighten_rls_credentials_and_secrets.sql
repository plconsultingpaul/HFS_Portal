/*
  # Step 1: Tighten RLS on Credentials & Secrets Tables

  Replaces wide-open (anon/public USING true) policies with restrictive
  authenticated + is_admin() policies on 8 tables that store API keys,
  passwords, and sensitive configuration.

  ## Tables Modified
    - gemini_api_keys      (4 anon policies removed, 4 admin policies added)
    - gemini_models         (4 anon policies removed, 4 admin policies added)
    - api_auth_config       (8 anon+authenticated policies removed, 4 admin policies added)
    - api_settings          (1 public FOR ALL removed, 4 admin policies added)
    - sftp_config           (4 public policies removed, 4 admin policies added)
    - email_monitoring_config (4 anon policies removed, 4 admin policies added)
    - security_settings     (1 public FOR ALL removed, 4 admin policies added)
    - secondary_api_configs (4 public policies removed, 4 admin policies added)

  ## Security Changes
    - SELECT: authenticated + is_admin() on all 8 tables
    - INSERT: authenticated + is_admin() on all 8 tables
    - UPDATE: authenticated + is_admin() on all 8 tables
    - DELETE: authenticated + is_admin() on all 8 tables
    - Anonymous users can no longer read or write any of these tables
    - Non-admin authenticated users can no longer read or write any of these tables
    - Edge functions (service role) are unaffected

  ## Important Notes
    1. All DROP POLICY statements use IF EXISTS to be idempotent
    2. All CREATE POLICY statements use IF NOT EXISTS via DO blocks
    3. The is_admin() function already exists as SECURITY DEFINER
*/

-- ============================================================
-- gemini_api_keys: drop 4 anon policies
-- ============================================================
DROP POLICY IF EXISTS "Allow anon read access to gemini_api_keys" ON gemini_api_keys;
DROP POLICY IF EXISTS "Allow anon insert access to gemini_api_keys" ON gemini_api_keys;
DROP POLICY IF EXISTS "Allow anon update access to gemini_api_keys" ON gemini_api_keys;
DROP POLICY IF EXISTS "Allow anon delete access to gemini_api_keys" ON gemini_api_keys;

CREATE POLICY "Admins can select gemini_api_keys"
  ON gemini_api_keys FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert gemini_api_keys"
  ON gemini_api_keys FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update gemini_api_keys"
  ON gemini_api_keys FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete gemini_api_keys"
  ON gemini_api_keys FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- gemini_models: drop 4 anon policies
-- ============================================================
DROP POLICY IF EXISTS "Allow anon read access to gemini_models" ON gemini_models;
DROP POLICY IF EXISTS "Allow anon insert access to gemini_models" ON gemini_models;
DROP POLICY IF EXISTS "Allow anon update access to gemini_models" ON gemini_models;
DROP POLICY IF EXISTS "Allow anon delete access to gemini_models" ON gemini_models;

CREATE POLICY "Admins can select gemini_models"
  ON gemini_models FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert gemini_models"
  ON gemini_models FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update gemini_models"
  ON gemini_models FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete gemini_models"
  ON gemini_models FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- api_auth_config: drop 8 policies (4 anon + 4 authenticated)
-- ============================================================
DROP POLICY IF EXISTS "Allow anon select on api_auth_config" ON api_auth_config;
DROP POLICY IF EXISTS "Allow anon insert on api_auth_config" ON api_auth_config;
DROP POLICY IF EXISTS "Allow anon update on api_auth_config" ON api_auth_config;
DROP POLICY IF EXISTS "Allow anon delete on api_auth_config" ON api_auth_config;
DROP POLICY IF EXISTS "Allow authenticated select on api_auth_config" ON api_auth_config;
DROP POLICY IF EXISTS "Allow authenticated insert on api_auth_config" ON api_auth_config;
DROP POLICY IF EXISTS "Allow authenticated update on api_auth_config" ON api_auth_config;
DROP POLICY IF EXISTS "Allow authenticated delete on api_auth_config" ON api_auth_config;

CREATE POLICY "Admins can select api_auth_config"
  ON api_auth_config FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert api_auth_config"
  ON api_auth_config FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update api_auth_config"
  ON api_auth_config FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete api_auth_config"
  ON api_auth_config FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- api_settings: drop 1 public FOR ALL policy
-- ============================================================
DROP POLICY IF EXISTS "Allow public access to API settings" ON api_settings;

CREATE POLICY "Admins can select api_settings"
  ON api_settings FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert api_settings"
  ON api_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update api_settings"
  ON api_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete api_settings"
  ON api_settings FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- sftp_config: drop 4 public policies
-- ============================================================
DROP POLICY IF EXISTS "Allow public read access to sftp config" ON sftp_config;
DROP POLICY IF EXISTS "Allow public insert access to sftp config" ON sftp_config;
DROP POLICY IF EXISTS "Allow public update access to sftp config" ON sftp_config;
DROP POLICY IF EXISTS "Allow public delete access to sftp config" ON sftp_config;

CREATE POLICY "Admins can select sftp_config"
  ON sftp_config FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert sftp_config"
  ON sftp_config FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update sftp_config"
  ON sftp_config FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete sftp_config"
  ON sftp_config FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- email_monitoring_config: drop 4 anon policies
-- ============================================================
DROP POLICY IF EXISTS "Allow anon select on email_monitoring_config" ON email_monitoring_config;
DROP POLICY IF EXISTS "Allow anon insert on email_monitoring_config" ON email_monitoring_config;
DROP POLICY IF EXISTS "Allow anon update on email_monitoring_config" ON email_monitoring_config;
DROP POLICY IF EXISTS "Allow anon delete on email_monitoring_config" ON email_monitoring_config;

CREATE POLICY "Admins can select email_monitoring_config"
  ON email_monitoring_config FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert email_monitoring_config"
  ON email_monitoring_config FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update email_monitoring_config"
  ON email_monitoring_config FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete email_monitoring_config"
  ON email_monitoring_config FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- security_settings: drop 1 public FOR ALL policy
-- ============================================================
DROP POLICY IF EXISTS "Allow public access to security settings" ON security_settings;

CREATE POLICY "Admins can select security_settings"
  ON security_settings FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert security_settings"
  ON security_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update security_settings"
  ON security_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete security_settings"
  ON security_settings FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- secondary_api_configs: drop 4 public policies
-- ============================================================
DROP POLICY IF EXISTS "Allow public read access to secondary API configs" ON secondary_api_configs;
DROP POLICY IF EXISTS "Allow public insert to secondary API configs" ON secondary_api_configs;
DROP POLICY IF EXISTS "Allow public update to secondary API configs" ON secondary_api_configs;
DROP POLICY IF EXISTS "Allow public delete to secondary API configs" ON secondary_api_configs;

CREATE POLICY "Admins can select secondary_api_configs"
  ON secondary_api_configs FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert secondary_api_configs"
  ON secondary_api_configs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update secondary_api_configs"
  ON secondary_api_configs FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete secondary_api_configs"
  ON secondary_api_configs FOR DELETE
  TO authenticated
  USING (public.is_admin());
