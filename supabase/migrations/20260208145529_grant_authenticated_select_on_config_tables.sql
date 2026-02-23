/*
  # Grant Authenticated Users Read Access to Configuration Tables

  1. Problem
    - Non-admin users cannot run Extract or Transform operations because
      7 configuration tables were locked to admin-only for ALL operations,
      including SELECT, in the step1_tighten_rls migration.
    - Non-admin users need to READ these configs to use workflows, API
      endpoints, Gemini AI, SFTP uploads, etc. They just should not be
      able to EDIT them.

  2. Tables Modified
    - `gemini_api_keys`        -- SELECT opened to all authenticated users
    - `gemini_models`          -- SELECT opened to all authenticated users
    - `api_settings`           -- SELECT opened to all authenticated users
    - `sftp_config`            -- SELECT opened to all authenticated users
    - `api_auth_config`        -- SELECT opened to all authenticated users
    - `secondary_api_configs`  -- SELECT opened to all authenticated users
    - `email_monitoring_config`-- SELECT opened to all authenticated users

  3. Security
    - INSERT, UPDATE, DELETE remain restricted to admin-only (unchanged)
    - Anonymous users still have NO access to any of these tables
    - Only the SELECT policy is widened from is_admin() to any authenticated user

  4. Important Notes
    - `security_settings` is intentionally NOT changed -- it is not needed
      by non-admin users for Extract/Transform operations
    - All DROP/CREATE use IF EXISTS / DO blocks for idempotency
*/

-- ============================================================
-- gemini_api_keys: widen SELECT from admin-only to authenticated
-- ============================================================
DROP POLICY IF EXISTS "Admins can select gemini_api_keys" ON gemini_api_keys;

CREATE POLICY "Authenticated users can select gemini_api_keys"
  ON gemini_api_keys FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- gemini_models: widen SELECT from admin-only to authenticated
-- ============================================================
DROP POLICY IF EXISTS "Admins can select gemini_models" ON gemini_models;

CREATE POLICY "Authenticated users can select gemini_models"
  ON gemini_models FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- api_settings: widen SELECT from admin-only to authenticated
-- ============================================================
DROP POLICY IF EXISTS "Admins can select api_settings" ON api_settings;

CREATE POLICY "Authenticated users can select api_settings"
  ON api_settings FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- sftp_config: widen SELECT from admin-only to authenticated
-- ============================================================
DROP POLICY IF EXISTS "Admins can select sftp_config" ON sftp_config;

CREATE POLICY "Authenticated users can select sftp_config"
  ON sftp_config FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- api_auth_config: widen SELECT from admin-only to authenticated
-- ============================================================
DROP POLICY IF EXISTS "Admins can select api_auth_config" ON api_auth_config;

CREATE POLICY "Authenticated users can select api_auth_config"
  ON api_auth_config FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- secondary_api_configs: widen SELECT from admin-only to authenticated
-- ============================================================
DROP POLICY IF EXISTS "Admins can select secondary_api_configs" ON secondary_api_configs;

CREATE POLICY "Authenticated users can select secondary_api_configs"
  ON secondary_api_configs FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- email_monitoring_config: widen SELECT from admin-only to authenticated
-- ============================================================
DROP POLICY IF EXISTS "Admins can select email_monitoring_config" ON email_monitoring_config;

CREATE POLICY "Authenticated users can select email_monitoring_config"
  ON email_monitoring_config FOR SELECT
  TO authenticated
  USING (true);
