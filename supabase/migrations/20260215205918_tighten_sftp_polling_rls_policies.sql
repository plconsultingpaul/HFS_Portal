/*
  # Tighten SFTP polling RLS policies

  1. Changes to `sftp_polling_configs`
    - DROP open INSERT, UPDATE, DELETE policies that allowed any authenticated user
    - Replace with admin-only INSERT, UPDATE, DELETE policies using `is_admin()`
    - SELECT remains open to authenticated users (read-only is safe)

  2. Changes to `sftp_polling_logs`
    - DROP the public ALL policy that allowed unrestricted anonymous access
    - Add authenticated SELECT policy (read-only for any logged-in user)
    - Add authenticated INSERT policy (edge functions insert logs on behalf of users)
    - No UPDATE or DELETE needed for log tables

  3. Security
    - Only admins can now modify SFTP polling configurations
    - SFTP polling logs are no longer accessible to anonymous users
*/

-- sftp_polling_configs: drop open write policies
DROP POLICY IF EXISTS "Authenticated users can create SFTP polling configs" ON public.sftp_polling_configs;
DROP POLICY IF EXISTS "Authenticated users can update SFTP polling configs" ON public.sftp_polling_configs;
DROP POLICY IF EXISTS "Authenticated users can delete SFTP polling configs" ON public.sftp_polling_configs;

-- sftp_polling_configs: add admin-only write policies
CREATE POLICY "Admins can insert sftp_polling_configs"
  ON public.sftp_polling_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update sftp_polling_configs"
  ON public.sftp_polling_configs
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete sftp_polling_configs"
  ON public.sftp_polling_configs
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- sftp_polling_logs: drop open public policy
DROP POLICY IF EXISTS "Allow public access to SFTP polling logs" ON public.sftp_polling_logs;

-- sftp_polling_logs: add scoped policies
CREATE POLICY "Authenticated can view sftp_polling_logs"
  ON public.sftp_polling_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert sftp_polling_logs"
  ON public.sftp_polling_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
