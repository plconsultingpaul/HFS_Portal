/*
  # Split permissions for Extract, Transform, and Execute

  Previously, a single permission controlled both sidebar access and Type Setup access:
  - `extractionTypes` controlled both the Extract sidebar and the Extraction Types tab
  - `transformationTypes` controlled both the Transform sidebar and the Transformation Types tab
  - `executeSetup` controlled the Execute sidebar; `workflowManagement` controlled both Execute Setup and Workflows tabs

  Now each is independent:
  - `extractPage` - Extract Page sidebar visibility
  - `extractionTypes` - Extraction Types tab in Type Setup only
  - `transformPage` - Transform Page sidebar visibility
  - `transformationTypes` - Transformation Types tab in Type Setup only
  - `executePage` - Execute Page sidebar visibility
  - `executeSetup` - Execute Setup tab in Type Setup only
  - `workflowManagement` - Workflows tab in Type Setup (unchanged)

  This migration updates existing users' JSON permissions to include the new flags,
  preserving their current access by copying the old values forward.

  1. Changes
    - Adds `extractPage` (copied from existing `extractionTypes` value)
    - Adds `transformPage` (copied from existing `transformationTypes` value)
    - Adds `executePage` (copied from existing `executeSetup` value)
    - Sets `executeSetup` from existing `workflowManagement` value where not already set

  2. Security
    - No table or RLS changes; only updates JSON in the existing `permissions` column
*/

UPDATE users
SET permissions = jsonb_build_object(
  'extractPage', COALESCE((permissions::jsonb->>'extractionTypes')::boolean, false),
  'extractionTypes', COALESCE((permissions::jsonb->>'extractionTypes')::boolean, false),
  'transformPage', COALESCE((permissions::jsonb->>'transformationTypes')::boolean, false),
  'transformationTypes', COALESCE((permissions::jsonb->>'transformationTypes')::boolean, false),
  'executePage', COALESCE((permissions::jsonb->>'executeSetup')::boolean, false),
  'executeSetup', COALESCE(
    (permissions::jsonb->>'executeSetup')::boolean,
    (permissions::jsonb->>'workflowManagement')::boolean,
    false
  ),
  'sftp', COALESCE((permissions::jsonb->>'sftp')::boolean, false),
  'api', COALESCE((permissions::jsonb->>'api')::boolean, false),
  'emailMonitoring', COALESCE((permissions::jsonb->>'emailMonitoring')::boolean, false),
  'emailRules', COALESCE((permissions::jsonb->>'emailRules')::boolean, false),
  'processedEmails', COALESCE((permissions::jsonb->>'processedEmails')::boolean, false),
  'extractionLogs', COALESCE((permissions::jsonb->>'extractionLogs')::boolean, false),
  'userManagement', COALESCE((permissions::jsonb->>'userManagement')::boolean, false),
  'workflowManagement', COALESCE((permissions::jsonb->>'workflowManagement')::boolean, false)
)::text
WHERE permissions IS NOT NULL AND permissions != '{}';
