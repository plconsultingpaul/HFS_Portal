/*
  # Create Config Change Logs Table

  1. New Tables
    - `config_change_logs`
      - `id` (uuid, primary key)
      - `config_type` (text) - one of: extraction, transformation, execute, workflow_v2
      - `item_name` (text) - name of the specific item that was changed
      - `changed_by` (uuid) - references auth.users
      - `changed_by_username` (text) - stored username for display
      - `created_at` (timestamptz) - when the change occurred

  2. Security
    - Enable RLS on `config_change_logs`
    - Authenticated users can read all logs
    - Authenticated users can insert their own logs

  3. Indexes
    - Composite index on (config_type, created_at desc) for fast filtered queries
*/

CREATE TABLE IF NOT EXISTS config_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_type text NOT NULL CHECK (config_type IN ('extraction', 'transformation', 'execute', 'workflow_v2')),
  item_name text NOT NULL DEFAULT '',
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  changed_by_username text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE config_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read config change logs"
  ON config_change_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert own config change logs"
  ON config_change_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = changed_by);

CREATE INDEX IF NOT EXISTS idx_config_change_logs_type_created
  ON config_change_logs (config_type, created_at DESC);
