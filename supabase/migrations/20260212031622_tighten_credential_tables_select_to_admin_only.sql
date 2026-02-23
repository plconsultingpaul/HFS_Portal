/*
  # Restrict credential table SELECT to admins only

  1. Security Changes
    - `gemini_api_keys` -- Replace open SELECT policy with admin-only
    - `api_auth_config` -- Replace open SELECT policy with admin-only
    - `sftp_config` -- Replace open SELECT policy with admin-only
    - `email_monitoring_config` -- Replace open SELECT policy with admin-only
    - `secondary_api_configs` -- Replace open SELECT policy with admin-only

  2. Rationale
    - All five tables store sensitive credentials (API keys, SFTP passwords, OAuth tokens, etc.)
    - Previous policies used USING (true) for SELECT, exposing secrets to any authenticated user
    - Only admins need to read these tables from the frontend (settings pages)
    - Edge functions use the service role key and bypass RLS, so they are unaffected

  3. Important Notes
    - INSERT, UPDATE, DELETE policies already require is_admin() and are not changed
    - No data is modified; only policy definitions are updated
*/

-- gemini_api_keys
DROP POLICY IF EXISTS "Authenticated users can select gemini_api_keys" ON gemini_api_keys;
CREATE POLICY "Admins can select gemini_api_keys"
  ON gemini_api_keys
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- api_auth_config
DROP POLICY IF EXISTS "Authenticated users can select api_auth_config" ON api_auth_config;
CREATE POLICY "Admins can select api_auth_config"
  ON api_auth_config
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- sftp_config
DROP POLICY IF EXISTS "Authenticated users can select sftp_config" ON sftp_config;
CREATE POLICY "Admins can select sftp_config"
  ON sftp_config
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- email_monitoring_config
DROP POLICY IF EXISTS "Authenticated users can select email_monitoring_config" ON email_monitoring_config;
CREATE POLICY "Admins can select email_monitoring_config"
  ON email_monitoring_config
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- secondary_api_configs
DROP POLICY IF EXISTS "Authenticated users can select secondary_api_configs" ON secondary_api_configs;
CREATE POLICY "Admins can select secondary_api_configs"
  ON secondary_api_configs
  FOR SELECT
  TO authenticated
  USING (is_admin());
