/*
  # Fix invitation email templates RLS for authenticated users

  After migrating to Supabase Auth, admin users now operate under the
  `authenticated` role instead of `anon`. The existing RLS policies on
  `invitation_email_templates` only grant access to `anon`, so
  authenticated users get zero rows back and the Edit Invite Email
  modal appears empty.

  1. Security Changes
    - Add SELECT policy for `authenticated` role on `invitation_email_templates`
    - Add UPDATE policy for `authenticated` role on `invitation_email_templates`

  2. Important Notes
    - No data changes, no schema changes
    - Existing `anon` policies are left untouched for backward compatibility
*/

CREATE POLICY "Allow authenticated to read invitation templates"
  ON invitation_email_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated to update invitation templates"
  ON invitation_email_templates
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
