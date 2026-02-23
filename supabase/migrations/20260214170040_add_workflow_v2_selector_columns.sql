/*
  # Add Workflow V1/V2 Selector Columns

  Adds `workflow_version` and `workflow_v2_id` columns to existing tables so users
  can choose between the original (V1) and new graph-based (V2) workflow engine.

  1. Modified Tables
    - `extraction_types`
      - `workflow_version` (text, default 'v1') - Which workflow engine to use
      - `workflow_v2_id` (uuid, FK to workflows_v2) - Reference to V2 workflow
    - `transformation_types`
      - `workflow_version` (text, default 'v1')
      - `workflow_v2_id` (uuid, FK to workflows_v2)
    - `page_group_configs`
      - `workflow_version` (text, default 'v1')
      - `workflow_v2_id` (uuid, FK to workflows_v2)
    - `execute_button_flow_nodes`
      - `workflow_version` (text, default 'v1')
      - `workflow_v2_id` (uuid, FK to workflows_v2)

  2. Important Notes
    - All existing rows default to 'v1' preserving current behavior
    - V2 columns are nullable so existing data is unaffected
    - Check constraints ensure only 'v1' or 'v2' values
*/

-- extraction_types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'extraction_types' AND column_name = 'workflow_version'
  ) THEN
    ALTER TABLE extraction_types ADD COLUMN workflow_version text NOT NULL DEFAULT 'v1' CHECK (workflow_version IN ('v1', 'v2'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'extraction_types' AND column_name = 'workflow_v2_id'
  ) THEN
    ALTER TABLE extraction_types ADD COLUMN workflow_v2_id uuid REFERENCES workflows_v2(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_extraction_types_workflow_v2_id ON extraction_types(workflow_v2_id);

-- transformation_types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transformation_types' AND column_name = 'workflow_version'
  ) THEN
    ALTER TABLE transformation_types ADD COLUMN workflow_version text NOT NULL DEFAULT 'v1' CHECK (workflow_version IN ('v1', 'v2'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transformation_types' AND column_name = 'workflow_v2_id'
  ) THEN
    ALTER TABLE transformation_types ADD COLUMN workflow_v2_id uuid REFERENCES workflows_v2(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transformation_types_workflow_v2_id ON transformation_types(workflow_v2_id);

-- page_group_configs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'page_group_configs' AND column_name = 'workflow_version'
  ) THEN
    ALTER TABLE page_group_configs ADD COLUMN workflow_version text NOT NULL DEFAULT 'v1' CHECK (workflow_version IN ('v1', 'v2'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'page_group_configs' AND column_name = 'workflow_v2_id'
  ) THEN
    ALTER TABLE page_group_configs ADD COLUMN workflow_v2_id uuid REFERENCES workflows_v2(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_page_group_configs_workflow_v2_id ON page_group_configs(workflow_v2_id);

-- execute_button_flow_nodes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'execute_button_flow_nodes' AND column_name = 'workflow_version'
  ) THEN
    ALTER TABLE execute_button_flow_nodes ADD COLUMN workflow_version text NOT NULL DEFAULT 'v1' CHECK (workflow_version IN ('v1', 'v2'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'execute_button_flow_nodes' AND column_name = 'workflow_v2_id'
  ) THEN
    ALTER TABLE execute_button_flow_nodes ADD COLUMN workflow_v2_id uuid REFERENCES workflows_v2(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_exec_btn_flow_nodes_workflow_v2_id ON execute_button_flow_nodes(workflow_v2_id);
