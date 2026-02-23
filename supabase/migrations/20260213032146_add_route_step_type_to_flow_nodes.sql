/*
  # Add Route Step Type to Flow Nodes

  1. Changes
    - Adds 'route' to the allowed step_type values on `execute_button_flow_nodes`
    - Route allows multi-path conditional routing (3+ paths) based on field values

  2. Security
    - No RLS changes needed - uses existing policies
*/

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'execute_button_flow_nodes') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'execute_button_flow_nodes_step_type_check'
      AND table_name = 'execute_button_flow_nodes'
    ) THEN
      ALTER TABLE execute_button_flow_nodes DROP CONSTRAINT execute_button_flow_nodes_step_type_check;
    END IF;

    ALTER TABLE execute_button_flow_nodes ADD CONSTRAINT execute_button_flow_nodes_step_type_check
    CHECK ((step_type IS NULL) OR (step_type = ANY (ARRAY[
      'api_call', 'api_endpoint', 'conditional_check', 'data_transform',
      'sftp_upload', 'email_action', 'rename_file', 'branch',
      'user_confirmation', 'exit', 'ai_lookup', 'google_places_lookup',
      'multipart_form_upload', 'route'
    ])));
  END IF;
END $$;
