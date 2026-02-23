/*
  # Add user_response column to workflow_v2_step_logs

  1. Modified Tables
    - `workflow_v2_step_logs`
      - Added `user_response` (text, nullable) - stores the resolved user response message for each V2 workflow step

  2. Purpose
    - Brings V2 workflow step logs to parity with V1 by storing the resolved
      user response template so it can be displayed in the extraction UI
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workflow_v2_step_logs' AND column_name = 'user_response'
  ) THEN
    ALTER TABLE workflow_v2_step_logs ADD COLUMN user_response text;
  END IF;
END $$;
