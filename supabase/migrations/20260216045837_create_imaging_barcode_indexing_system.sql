/*
  # Create Imaging Barcode Indexing System

  1. New Tables
    - `imaging_barcode_patterns`
      - `id` (uuid, primary key)
      - `name` (text, not null) - Display name for this pattern config
      - `pattern_template` (text, not null) - Template like "{documentType}-{detailLineId}"
      - `separator` (text, default '-') - Character splitting the barcode parts
      - `fixed_document_type` (text) - If set, use this document type name instead of parsing from barcode
      - `bucket_id` (uuid, FK to imaging_buckets) - Target bucket for matched documents
      - `priority` (integer, default 0) - Evaluation order (lower = first)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `imaging_unindexed_queue`
      - `id` (uuid, primary key)
      - `bucket_id` (uuid, FK to imaging_buckets) - Target bucket
      - `storage_path` (text, not null) - Path in Supabase storage
      - `original_filename` (text) - Original PDF filename
      - `file_size` (bigint) - File size in bytes
      - `detected_barcodes` (jsonb) - Array of barcode values found on the PDF
      - `source_sftp_config_id` (uuid, FK to sftp_polling_configs) - Which SFTP poller brought it in
      - `status` (text) - pending, indexed, discarded
      - `detail_line_id` (text) - Set when manually indexed
      - `document_type_id` (uuid, FK to imaging_document_types) - Set when manually indexed
      - `bill_number` (text) - Set when manually indexed
      - `indexed_by` (uuid) - User who manually indexed
      - `indexed_at` (timestamptz) - When manually indexed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Modified Tables
    - `sftp_polling_configs`
      - Added `processing_mode` (text, default 'extraction') with CHECK for extraction, transformation, imaging
      - Added `imaging_bucket_id` (uuid, FK to imaging_buckets)

  3. Security
    - Enable RLS on both new tables
    - Authenticated users can SELECT
    - Admin users can INSERT, UPDATE, DELETE
    - Service role can insert/update for edge function processing

  4. Indexes
    - imaging_barcode_patterns: bucket_id, priority
    - imaging_unindexed_queue: bucket_id, status, source_sftp_config_id
*/

-- imaging_barcode_patterns
CREATE TABLE IF NOT EXISTS imaging_barcode_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  pattern_template text NOT NULL DEFAULT '{documentType}-{detailLineId}',
  separator text NOT NULL DEFAULT '-',
  fixed_document_type text DEFAULT NULL,
  bucket_id uuid NOT NULL REFERENCES imaging_buckets(id),
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE imaging_barcode_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read imaging_barcode_patterns"
  ON imaging_barcode_patterns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert imaging_barcode_patterns"
  ON imaging_barcode_patterns FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update imaging_barcode_patterns"
  ON imaging_barcode_patterns FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete imaging_barcode_patterns"
  ON imaging_barcode_patterns FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_imaging_barcode_patterns_bucket_id ON imaging_barcode_patterns(bucket_id);
CREATE INDEX IF NOT EXISTS idx_imaging_barcode_patterns_priority ON imaging_barcode_patterns(priority);

-- imaging_unindexed_queue
CREATE TABLE IF NOT EXISTS imaging_unindexed_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id uuid NOT NULL REFERENCES imaging_buckets(id),
  storage_path text NOT NULL,
  original_filename text DEFAULT '',
  file_size bigint DEFAULT 0,
  detected_barcodes jsonb DEFAULT '[]'::jsonb,
  source_sftp_config_id uuid DEFAULT NULL REFERENCES sftp_polling_configs(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  detail_line_id text DEFAULT NULL,
  document_type_id uuid DEFAULT NULL REFERENCES imaging_document_types(id),
  bill_number text DEFAULT NULL,
  indexed_by uuid DEFAULT NULL,
  indexed_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT imaging_unindexed_queue_status_check CHECK (status IN ('pending', 'indexed', 'discarded'))
);

ALTER TABLE imaging_unindexed_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read imaging_unindexed_queue"
  ON imaging_unindexed_queue FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update imaging_unindexed_queue"
  ON imaging_unindexed_queue FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can insert imaging_unindexed_queue"
  ON imaging_unindexed_queue FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete imaging_unindexed_queue"
  ON imaging_unindexed_queue FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_imaging_unindexed_queue_bucket_id ON imaging_unindexed_queue(bucket_id);
CREATE INDEX IF NOT EXISTS idx_imaging_unindexed_queue_status ON imaging_unindexed_queue(status);
CREATE INDEX IF NOT EXISTS idx_imaging_unindexed_queue_sftp_config ON imaging_unindexed_queue(source_sftp_config_id);

-- Add processing_mode and imaging_bucket_id to sftp_polling_configs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sftp_polling_configs' AND column_name = 'processing_mode'
  ) THEN
    ALTER TABLE sftp_polling_configs ADD COLUMN processing_mode text NOT NULL DEFAULT 'extraction';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sftp_polling_configs' AND column_name = 'imaging_bucket_id'
  ) THEN
    ALTER TABLE sftp_polling_configs ADD COLUMN imaging_bucket_id uuid DEFAULT NULL REFERENCES imaging_buckets(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE sftp_polling_configs
  DROP CONSTRAINT IF EXISTS sftp_polling_configs_processing_mode_check;

ALTER TABLE sftp_polling_configs
  ADD CONSTRAINT sftp_polling_configs_processing_mode_check
  CHECK (processing_mode IN ('extraction', 'transformation', 'imaging'));

CREATE INDEX IF NOT EXISTS idx_sftp_polling_configs_imaging_bucket ON sftp_polling_configs(imaging_bucket_id);

-- Service role policies for edge function processing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'imaging_documents' AND policyname = 'Service role can insert imaging_documents'
  ) THEN
    CREATE POLICY "Service role can insert imaging_documents"
      ON imaging_documents FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'imaging_unindexed_queue' AND policyname = 'Service role can insert imaging_unindexed_queue'
  ) THEN
    CREATE POLICY "Service role can insert imaging_unindexed_queue"
      ON imaging_unindexed_queue FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'imaging_unindexed_queue' AND policyname = 'Service role can update imaging_unindexed_queue'
  ) THEN
    CREATE POLICY "Service role can update imaging_unindexed_queue"
      ON imaging_unindexed_queue FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
