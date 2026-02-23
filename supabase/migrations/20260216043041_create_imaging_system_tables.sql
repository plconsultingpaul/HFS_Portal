/*
  # Create Imaging System Tables

  1. New Tables
    - `imaging_buckets`
      - `id` (uuid, primary key)
      - `name` (text, unique, not null) - Display name for the bucket
      - `url` (text, not null) - Base URL for accessing documents in this bucket
      - `description` (text) - Optional description
      - `is_active` (boolean, default true) - Whether bucket is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `imaging_document_types`
      - `id` (uuid, primary key)
      - `name` (text, unique, not null) - Document type name (e.g., BOL, POD, Invoice)
      - `description` (text) - Optional description
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `imaging_documents`
      - `id` (uuid, primary key)
      - `bucket_id` (uuid, FK to imaging_buckets) - Which bucket stores this document
      - `document_type_id` (uuid, FK to imaging_document_types) - Document type
      - `detail_line_id` (text, not null) - Unique identifier for the line item
      - `bill_number` (text) - Associated bill number
      - `storage_path` (text, not null) - Path/key within the bucket
      - `original_filename` (text) - Original filename of the uploaded PDF
      - `file_size` (bigint) - File size in bytes
      - `uploaded_by` (uuid) - User who uploaded the document
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all three tables
    - Authenticated users can SELECT all tables
    - Admin users can INSERT, UPDATE, DELETE

  3. Indexes
    - imaging_documents: bucket_id, document_type_id, detail_line_id, bill_number
    - Composite index on (bucket_id, document_type_id, detail_line_id) for lookups

  4. Important Notes
    - The detail_line_id + document_type_id + bucket_id combination is the primary
      lookup key for retrieving documents
    - bill_number is stored for search/filtering purposes
    - storage_path stores the full path within the bucket for retrieval
*/

-- imaging_buckets
CREATE TABLE IF NOT EXISTS imaging_buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  url text NOT NULL,
  description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE imaging_buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read imaging_buckets"
  ON imaging_buckets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert imaging_buckets"
  ON imaging_buckets FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update imaging_buckets"
  ON imaging_buckets FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete imaging_buckets"
  ON imaging_buckets FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- imaging_document_types
CREATE TABLE IF NOT EXISTS imaging_document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE imaging_document_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read imaging_document_types"
  ON imaging_document_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert imaging_document_types"
  ON imaging_document_types FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update imaging_document_types"
  ON imaging_document_types FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete imaging_document_types"
  ON imaging_document_types FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- imaging_documents
CREATE TABLE IF NOT EXISTS imaging_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id uuid NOT NULL REFERENCES imaging_buckets(id),
  document_type_id uuid NOT NULL REFERENCES imaging_document_types(id),
  detail_line_id text NOT NULL,
  bill_number text DEFAULT '',
  storage_path text NOT NULL,
  original_filename text DEFAULT '',
  file_size bigint DEFAULT 0,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE imaging_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read imaging_documents"
  ON imaging_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert imaging_documents"
  ON imaging_documents FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update imaging_documents"
  ON imaging_documents FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete imaging_documents"
  ON imaging_documents FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_imaging_documents_bucket_id ON imaging_documents(bucket_id);
CREATE INDEX IF NOT EXISTS idx_imaging_documents_document_type_id ON imaging_documents(document_type_id);
CREATE INDEX IF NOT EXISTS idx_imaging_documents_detail_line_id ON imaging_documents(detail_line_id);
CREATE INDEX IF NOT EXISTS idx_imaging_documents_bill_number ON imaging_documents(bill_number);
CREATE INDEX IF NOT EXISTS idx_imaging_documents_lookup ON imaging_documents(bucket_id, document_type_id, detail_line_id);
