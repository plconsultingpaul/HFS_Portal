/*
  # Create Workflow v2 Core Tables

  1. New Tables
    - `workflows_v2`
      - `id` (uuid, primary key)
      - `name` (text, not null) - Workflow name
      - `description` (text) - Optional description
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `workflow_v2_nodes`
      - `id` (uuid, primary key)
      - `workflow_id` (uuid, FK to workflows_v2, cascade delete)
      - `node_type` (text) - 'start' or 'workflow'
      - `position_x` (float) - Canvas X position
      - `position_y` (float) - Canvas Y position
      - `width` (float) - Optional node width
      - `height` (float) - Optional node height
      - `label` (text) - Display label
      - `step_type` (text) - Step type for workflow nodes
      - `config_json` (jsonb) - Step configuration
      - `escape_single_quotes_in_body` (boolean) - OData escaping flag
      - `user_response_template` (text) - Optional response template
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `workflow_v2_edges`
      - `id` (uuid, primary key)
      - `workflow_id` (uuid, FK to workflows_v2, cascade delete)
      - `source_node_id` (uuid, FK to workflow_v2_nodes, cascade delete)
      - `target_node_id` (uuid, FK to workflow_v2_nodes, cascade delete)
      - `source_handle` (text) - 'default', 'success', or 'failure'
      - `target_handle` (text) - Target connection handle
      - `label` (text) - Optional edge label
      - `edge_type` (text) - Edge style type
      - `animated` (boolean) - Whether edge is animated
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all three tables
    - Authenticated users can SELECT
    - Admin users can INSERT, UPDATE, DELETE

  3. Indexes
    - workflow_v2_nodes: workflow_id, node_type
    - workflow_v2_edges: workflow_id, source_node_id, target_node_id
*/

-- workflows_v2
CREATE TABLE IF NOT EXISTS workflows_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workflows_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read workflows_v2"
  ON workflows_v2 FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert workflows_v2"
  ON workflows_v2 FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update workflows_v2"
  ON workflows_v2 FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete workflows_v2"
  ON workflows_v2 FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- workflow_v2_nodes
CREATE TABLE IF NOT EXISTS workflow_v2_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows_v2(id) ON DELETE CASCADE,
  node_type text NOT NULL CHECK (node_type IN ('start', 'workflow')),
  position_x float NOT NULL DEFAULT 0,
  position_y float NOT NULL DEFAULT 0,
  width float,
  height float,
  label text NOT NULL DEFAULT '',
  step_type text CHECK (step_type IS NULL OR step_type IN (
    'api_call', 'api_endpoint', 'conditional_check', 'data_transform',
    'sftp_upload', 'email_action', 'rename_file', 'multipart_form_upload'
  )),
  config_json jsonb NOT NULL DEFAULT '{}',
  escape_single_quotes_in_body boolean NOT NULL DEFAULT false,
  user_response_template text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workflow_v2_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read workflow_v2_nodes"
  ON workflow_v2_nodes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert workflow_v2_nodes"
  ON workflow_v2_nodes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update workflow_v2_nodes"
  ON workflow_v2_nodes FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete workflow_v2_nodes"
  ON workflow_v2_nodes FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_workflow_v2_nodes_workflow_id ON workflow_v2_nodes(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_v2_nodes_node_type ON workflow_v2_nodes(node_type);

-- workflow_v2_edges
CREATE TABLE IF NOT EXISTS workflow_v2_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows_v2(id) ON DELETE CASCADE,
  source_node_id uuid NOT NULL REFERENCES workflow_v2_nodes(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL REFERENCES workflow_v2_nodes(id) ON DELETE CASCADE,
  source_handle text NOT NULL DEFAULT 'default',
  target_handle text NOT NULL DEFAULT 'default',
  label text,
  edge_type text NOT NULL DEFAULT 'default',
  animated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workflow_v2_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read workflow_v2_edges"
  ON workflow_v2_edges FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert workflow_v2_edges"
  ON workflow_v2_edges FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update workflow_v2_edges"
  ON workflow_v2_edges FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete workflow_v2_edges"
  ON workflow_v2_edges FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_workflow_v2_edges_workflow_id ON workflow_v2_edges(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_v2_edges_source ON workflow_v2_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_workflow_v2_edges_target ON workflow_v2_edges(target_node_id);
