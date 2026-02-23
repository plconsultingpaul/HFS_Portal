/*
  # Add Vendor Setup, Client Setup, and Check-In Setup Permissions

  1. Changes
    - Adds `vendorSetup` permission to all users' JSON permissions column
      - Defaults to the user's existing `userManagement` value (preserves current access)
    - Adds `clientSetup` permission to all users' JSON permissions column
      - Defaults to the user's existing `userManagement` value (preserves current access)
    - Adds `checkinSetup` permission to all users' JSON permissions column
      - Defaults to `false` (was previously admin-only hardcoded check)
      - Admin users get `true` automatically

  2. Security
    - No RLS changes needed (permissions stored as JSON in existing users table)

  3. Notes
    - These three sidebar items previously shared access with `userManagement` or `isAdmin`
    - This migration gives each its own independent permission flag
    - No existing user loses access since values are copied from their current settings
*/

UPDATE users
SET permissions = jsonb_set(
  jsonb_set(
    jsonb_set(
      COALESCE(permissions::jsonb, '{}'::jsonb),
      '{vendorSetup}',
      COALESCE((permissions::jsonb)->'userManagement', 'false'::jsonb)
    ),
    '{clientSetup}',
    COALESCE((permissions::jsonb)->'userManagement', 'false'::jsonb)
  ),
  '{checkinSetup}',
  CASE WHEN is_admin = true THEN 'true'::jsonb ELSE 'false'::jsonb END
)
WHERE permissions IS NOT NULL
  AND (permissions::jsonb)->'vendorSetup' IS NULL;