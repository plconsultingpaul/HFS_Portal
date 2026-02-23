/*
  # Add workflow_type column to workflows_v2

  1. Modified Tables
    - `workflows_v2`
      - Added `workflow_type` (text, NOT NULL, DEFAULT 'extraction')
      - CHECK constraint: must be 'extraction', 'transformation', or 'imaging'

  2. Notes
    - Existing workflows default to 'extraction'
    - Index added on workflow_type for efficient filtering
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workflows_v2' AND column_name = 'workflow_type'
  ) THEN
    ALTER TABLE workflows_v2 ADD COLUMN workflow_type text NOT NULL DEFAULT 'extraction';
    ALTER TABLE workflows_v2 ADD CONSTRAINT workflows_v2_workflow_type_check
      CHECK (workflow_type IN ('extraction', 'transformation', 'imaging'));
    CREATE INDEX IF NOT EXISTS idx_workflows_v2_workflow_type ON workflows_v2(workflow_type);
  END IF;
END $$;
