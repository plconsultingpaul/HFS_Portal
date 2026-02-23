/*
  # Add AI Decision Step Type to Workflow V2 Nodes

  1. Modified Tables
    - `workflow_v2_nodes`
      - Updated `step_type` CHECK constraint to include `ai_decision`
      - New step type enables AI-powered matching of source records against
        API candidate results using Gemini

  2. Important Notes
    - The `ai_decision` step combines an API lookup with Gemini AI matching
    - Source fields come from extracted data; candidate results come from an API call
    - Gemini selects the best match and returns the configured return field
*/

ALTER TABLE workflow_v2_nodes
  DROP CONSTRAINT IF EXISTS workflow_v2_nodes_step_type_check;

ALTER TABLE workflow_v2_nodes
  ADD CONSTRAINT workflow_v2_nodes_step_type_check
  CHECK (step_type IS NULL OR step_type IN (
    'api_call', 'api_endpoint', 'conditional_check', 'data_transform',
    'sftp_upload', 'email_action', 'rename_file', 'multipart_form_upload',
    'ai_decision'
  ));
