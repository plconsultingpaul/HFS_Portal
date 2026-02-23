/*
  # Add Imaging Step Type to Workflow V2 Nodes

  1. Modified Tables
    - `workflow_v2_nodes`
      - Updated `step_type` CHECK constraint to include `imaging`
      - New step type allows PUT (upload) and GET (retrieve) operations
        against imaging storage buckets within a workflow

  2. Important Notes
    - The `imaging` step supports two modes: PUT and GET
    - PUT mode uploads a PDF to a bucket with detailLineId, billNumber, and documentType
    - GET mode retrieves a document from a bucket by detailLineId and documentType
*/

ALTER TABLE workflow_v2_nodes
  DROP CONSTRAINT IF EXISTS workflow_v2_nodes_step_type_check;

ALTER TABLE workflow_v2_nodes
  ADD CONSTRAINT workflow_v2_nodes_step_type_check
  CHECK (step_type IS NULL OR step_type IN (
    'api_call', 'api_endpoint', 'conditional_check', 'data_transform',
    'sftp_upload', 'email_action', 'rename_file', 'multipart_form_upload',
    'ai_decision', 'imaging'
  ));
