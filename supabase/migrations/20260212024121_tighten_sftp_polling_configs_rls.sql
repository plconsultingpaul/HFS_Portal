/*
  # Tighten RLS on sftp_polling_configs

  1. Security Changes
    - Drop the dangerous `USING (true)` policy that grants full public access
    - Add four separate authenticated-only policies for SELECT, INSERT, UPDATE, DELETE
    - Only authenticated users (logged-in app users) can access SFTP credentials
    - The sftp-poller edge function uses the service role key and bypasses RLS, so it is unaffected

  2. Why This Matters
    - This table stores plaintext SFTP host, username, and password
    - The old policy exposed all credentials to any unauthenticated request
*/

-- Drop the wide-open public policy
DROP POLICY IF EXISTS "Allow public access to SFTP polling configs" ON sftp_polling_configs;

-- SELECT: authenticated users only
CREATE POLICY "Authenticated users can view SFTP polling configs"
  ON sftp_polling_configs
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: authenticated users only
CREATE POLICY "Authenticated users can create SFTP polling configs"
  ON sftp_polling_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: authenticated users only
CREATE POLICY "Authenticated users can update SFTP polling configs"
  ON sftp_polling_configs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: authenticated users only
CREATE POLICY "Authenticated users can delete SFTP polling configs"
  ON sftp_polling_configs
  FOR DELETE
  TO authenticated
  USING (true);
