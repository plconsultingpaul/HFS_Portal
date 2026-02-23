/*
  # Create Imaging Email Monitoring System

  1. New Tables
    - `imaging_email_monitoring_config` (singleton config)
      - `id` (uuid, primary key)
      - `provider` (text) - 'office365' or 'gmail'
      - `tenant_id` (text) - Office 365 tenant ID
      - `client_id` (text) - Office 365 client ID
      - `client_secret` (text) - Office 365 client secret
      - `gmail_client_id` (text) - Gmail OAuth client ID
      - `gmail_client_secret` (text) - Gmail OAuth client secret
      - `gmail_refresh_token` (text) - Gmail OAuth refresh token
      - `monitored_email` (text) - Email address to monitor (Office 365)
      - `gmail_monitored_label` (text) - Gmail label to monitor
      - `imaging_bucket_id` (uuid, FK to imaging_buckets) - Default target bucket
      - `polling_interval` (integer) - Polling interval in minutes
      - `is_enabled` (boolean) - Enable/disable monitoring
      - `last_check` (timestamptz) - Last poll timestamp
      - `check_all_messages` (boolean) - Ignore last_check and check all
      - `post_process_action` (text) - Success action: mark_read, move, archive, delete, none
      - `processed_folder_path` (text) - Folder for 'move' on success
      - `post_process_action_on_failure` (text) - Failure action
      - `failure_folder_path` (text) - Folder for 'move' on failure
      - `cron_enabled` (boolean) - pg_cron toggle
      - `cron_job_id` (bigint) - pg_cron job ID
      - `cron_schedule` (text) - Cron expression
      - `last_cron_run` (timestamptz)
      - `next_cron_run` (timestamptz)

  2. Modified Tables
    - `imaging_unindexed_queue`
      - Added `source_email_config_id` (uuid, nullable) to track email-sourced items
      - Added `source_type` (text, default 'sftp') to distinguish SFTP vs Email sources

  3. Security
    - Enable RLS on `imaging_email_monitoring_config`
    - Authenticated admins can SELECT, INSERT, UPDATE, DELETE
    - Service role can SELECT and UPDATE (for edge function)

  4. Indexes
    - imaging_unindexed_queue: source_email_config_id, source_type
*/

-- Create imaging_email_monitoring_config table
CREATE TABLE IF NOT EXISTS imaging_email_monitoring_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'office365',
  tenant_id text NOT NULL DEFAULT '',
  client_id text NOT NULL DEFAULT '',
  client_secret text NOT NULL DEFAULT '',
  gmail_client_id text NOT NULL DEFAULT '',
  gmail_client_secret text NOT NULL DEFAULT '',
  gmail_refresh_token text NOT NULL DEFAULT '',
  monitored_email text NOT NULL DEFAULT '',
  gmail_monitored_label text NOT NULL DEFAULT 'INBOX',
  imaging_bucket_id uuid DEFAULT NULL REFERENCES imaging_buckets(id) ON DELETE SET NULL,
  polling_interval integer NOT NULL DEFAULT 5,
  is_enabled boolean NOT NULL DEFAULT false,
  last_check timestamptz DEFAULT NULL,
  check_all_messages boolean NOT NULL DEFAULT false,
  post_process_action text NOT NULL DEFAULT 'mark_read',
  processed_folder_path text NOT NULL DEFAULT 'Processed',
  post_process_action_on_failure text NOT NULL DEFAULT 'none',
  failure_folder_path text NOT NULL DEFAULT 'Failed',
  cron_enabled boolean NOT NULL DEFAULT false,
  cron_job_id bigint DEFAULT NULL,
  cron_schedule text DEFAULT NULL,
  last_cron_run timestamptz DEFAULT NULL,
  next_cron_run timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE imaging_email_monitoring_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read imaging_email_monitoring_config"
  ON imaging_email_monitoring_config FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert imaging_email_monitoring_config"
  ON imaging_email_monitoring_config FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update imaging_email_monitoring_config"
  ON imaging_email_monitoring_config FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete imaging_email_monitoring_config"
  ON imaging_email_monitoring_config FOR DELETE
  TO authenticated
  USING (public.is_admin());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'imaging_email_monitoring_config' AND policyname = 'Service role can read imaging_email_monitoring_config'
  ) THEN
    CREATE POLICY "Service role can read imaging_email_monitoring_config"
      ON imaging_email_monitoring_config FOR SELECT
      TO service_role
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'imaging_email_monitoring_config' AND policyname = 'Service role can update imaging_email_monitoring_config'
  ) THEN
    CREATE POLICY "Service role can update imaging_email_monitoring_config"
      ON imaging_email_monitoring_config FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Add source_type and source_email_config_id to imaging_unindexed_queue
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'imaging_unindexed_queue' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE imaging_unindexed_queue ADD COLUMN source_type text NOT NULL DEFAULT 'sftp';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'imaging_unindexed_queue' AND column_name = 'source_email_config_id'
  ) THEN
    ALTER TABLE imaging_unindexed_queue ADD COLUMN source_email_config_id uuid DEFAULT NULL REFERENCES imaging_email_monitoring_config(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_imaging_unindexed_queue_source_type ON imaging_unindexed_queue(source_type);
CREATE INDEX IF NOT EXISTS idx_imaging_unindexed_queue_email_config ON imaging_unindexed_queue(source_email_config_id);
CREATE INDEX IF NOT EXISTS idx_imaging_email_monitoring_config_bucket ON imaging_email_monitoring_config(imaging_bucket_id);
