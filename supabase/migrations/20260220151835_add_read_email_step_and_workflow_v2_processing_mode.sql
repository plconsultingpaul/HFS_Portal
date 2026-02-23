/*
  # Add Read Email step type and Workflow V2 processing mode

  1. Modified Tables
    - `email_processing_rules`
      - Added `workflow_v2_id` (uuid, nullable, FK to workflows_v2.id) - links a rule to a Workflow V2
      - Updated `processing_mode` CHECK constraint to allow 'workflow_v2'
    - `workflow_v2_nodes`
      - Updated `step_type` CHECK constraint to allow 'read_email'

  2. Security
    - No RLS changes needed (existing policies cover the new column)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_processing_rules' AND column_name = 'workflow_v2_id'
  ) THEN
    ALTER TABLE email_processing_rules ADD COLUMN workflow_v2_id uuid REFERENCES workflows_v2(id);
  END IF;
END $$;

DO $$
BEGIN
  ALTER TABLE email_processing_rules DROP CONSTRAINT IF EXISTS email_processing_rules_processing_mode_check;
  ALTER TABLE email_processing_rules ADD CONSTRAINT email_processing_rules_processing_mode_check
    CHECK (processing_mode IN ('extraction', 'transformation', 'workflow_v2'));
END $$;

DO $$
BEGIN
  ALTER TABLE workflow_v2_nodes DROP CONSTRAINT IF EXISTS workflow_v2_nodes_step_type_check;
  ALTER TABLE workflow_v2_nodes ADD CONSTRAINT workflow_v2_nodes_step_type_check
    CHECK (step_type IS NULL OR step_type IN (
      'api_call', 'api_endpoint', 'conditional_check', 'data_transform',
      'sftp_upload', 'email_action', 'rename_file', 'multipart_form_upload',
      'ai_decision', 'imaging', 'read_email'
    ));
END $$;
