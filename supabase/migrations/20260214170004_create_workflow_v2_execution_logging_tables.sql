/*
  # Create Workflow v2 Execution Logging Tables

  1. New Tables
    - `workflow_v2_execution_logs`
      - `id` (uuid, primary key)
      - `workflow_id` (uuid, FK to workflows_v2)
      - `extraction_log_id` (uuid, FK to extraction_logs, nullable)
      - `status` (text) - pending, running, completed, failed
      - `current_node_id` (uuid, FK to workflow_v2_nodes, nullable)
      - `current_node_label` (text, nullable)
      - `error_message` (text, nullable)
      - `context_data` (jsonb) - Execution context and state
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz, nullable)
      - `updated_at` (timestamptz)
      - `user_id` (text, nullable)
      - `processing_mode` (text) - extraction or transformation
      - `extraction_type_id` (uuid, nullable)
      - `transformation_type_id` (uuid, nullable)
      - `failure_notification_sent` (boolean)
      - `success_notification_sent` (boolean)

    - `workflow_v2_step_logs`
      - `id` (uuid, primary key)
      - `execution_log_id` (uuid, FK to workflow_v2_execution_logs, cascade delete)
      - `workflow_id` (uuid, FK to workflows_v2)
      - `node_id` (uuid, FK to workflow_v2_nodes)
      - `node_label` (text, nullable)
      - `step_type` (text, nullable)
      - `status` (text) - running, completed, failed, skipped
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz, nullable)
      - `duration_ms` (integer, nullable)
      - `error_message` (text, nullable)
      - `input_data` (jsonb)
      - `output_data` (jsonb)
      - `config_json` (jsonb)
      - `processed_config` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Authenticated users can SELECT
    - Admin users can INSERT, UPDATE, DELETE

  3. Indexes
    - workflow_v2_execution_logs: status, workflow_id, extraction_log_id
    - workflow_v2_step_logs: execution_log_id, workflow_id, status, created_at DESC
*/

-- workflow_v2_execution_logs
CREATE TABLE IF NOT EXISTS workflow_v2_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows_v2(id),
  extraction_log_id uuid REFERENCES extraction_logs(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  current_node_id uuid REFERENCES workflow_v2_nodes(id),
  current_node_label text,
  error_message text,
  context_data jsonb NOT NULL DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id text,
  processing_mode text CHECK (processing_mode IS NULL OR processing_mode IN ('extraction', 'transformation')),
  extraction_type_id uuid,
  transformation_type_id uuid,
  failure_notification_sent boolean NOT NULL DEFAULT false,
  success_notification_sent boolean NOT NULL DEFAULT false
);

ALTER TABLE workflow_v2_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read workflow_v2_execution_logs"
  ON workflow_v2_execution_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert workflow_v2_execution_logs"
  ON workflow_v2_execution_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update workflow_v2_execution_logs"
  ON workflow_v2_execution_logs FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete workflow_v2_execution_logs"
  ON workflow_v2_execution_logs FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_wf_v2_exec_logs_status ON workflow_v2_execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_wf_v2_exec_logs_workflow_id ON workflow_v2_execution_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wf_v2_exec_logs_extraction_log_id ON workflow_v2_execution_logs(extraction_log_id);

-- workflow_v2_step_logs
CREATE TABLE IF NOT EXISTS workflow_v2_step_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_log_id uuid NOT NULL REFERENCES workflow_v2_execution_logs(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES workflows_v2(id),
  node_id uuid NOT NULL REFERENCES workflow_v2_nodes(id),
  node_label text,
  step_type text,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'skipped')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  error_message text,
  input_data jsonb NOT NULL DEFAULT '{}',
  output_data jsonb NOT NULL DEFAULT '{}',
  config_json jsonb NOT NULL DEFAULT '{}',
  processed_config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workflow_v2_step_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read workflow_v2_step_logs"
  ON workflow_v2_step_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert workflow_v2_step_logs"
  ON workflow_v2_step_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update workflow_v2_step_logs"
  ON workflow_v2_step_logs FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete workflow_v2_step_logs"
  ON workflow_v2_step_logs FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_wf_v2_step_logs_exec_log_id ON workflow_v2_step_logs(execution_log_id);
CREATE INDEX IF NOT EXISTS idx_wf_v2_step_logs_workflow_id ON workflow_v2_step_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wf_v2_step_logs_status ON workflow_v2_step_logs(status);
CREATE INDEX IF NOT EXISTS idx_wf_v2_step_logs_created_at ON workflow_v2_step_logs(created_at DESC);
