/*
  # Fix parse_it_license INSERT RLS policy

  1. Changes
    - Drop the existing INSERT policy that relied on `legacy_user_id` in JWT metadata
    - Create a new INSERT policy that uses `auth.uid()` directly to check admin status
    - This fixes the 42501 RLS violation when admin users try to upload license files

  2. Security
    - INSERT still restricted to authenticated admin users only
    - Uses `auth.uid()` which matches the users table `id` directly
*/

DROP POLICY IF EXISTS "Admin users can insert license data" ON parse_it_license;

CREATE POLICY "Admin users can insert license data"
  ON parse_it_license
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );
