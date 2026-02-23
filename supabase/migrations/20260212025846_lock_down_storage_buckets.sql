/*
  # Lock Down Storage Buckets

  Addresses critical security vulnerability: both `pdfs` and `order-entry-pdfs`
  buckets were fully open to unauthenticated users with no file size or MIME
  type restrictions.

  ## Changes

  1. **pdfs bucket**
     - Keeps `public = true` (company logos must be readable on login pages)
     - Drops public INSERT, UPDATE, DELETE policies
     - Adds authenticated-only policies for INSERT, UPDATE, DELETE
     - Keeps public SELECT (logos need unauthenticated read)
     - Adds 50 MB file-size limit
     - Restricts MIME types to: pdf, png, jpeg, svg+xml, webp, tiff, json, csv

  2. **order-entry-pdfs bucket**
     - Sets `public = false` (only authenticated access)
     - Drops ALL public role policies (SELECT, INSERT, UPDATE, DELETE)
     - Adds authenticated-only policies for SELECT, INSERT, UPDATE, DELETE
     - Adds 50 MB file-size limit
     - Restricts MIME types to: pdf, png, jpeg

  ## Security
     - Anonymous users can no longer upload, modify, or delete files in either bucket
     - Anonymous users can no longer read order-entry PDF files
     - File uploads are size-capped and type-restricted to prevent abuse
*/

-- ============================================================
-- 1. pdfs bucket: keep public reads, lock down writes
-- ============================================================

DROP POLICY IF EXISTS "Allow public inserts to pdfs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to pdfs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to pdfs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from pdfs bucket" ON storage.objects;

CREATE POLICY "Authenticated users can upload to pdfs bucket"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pdfs');

CREATE POLICY "Authenticated users can update in pdfs bucket"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'pdfs')
  WITH CHECK (bucket_id = 'pdfs');

CREATE POLICY "Authenticated users can delete from pdfs bucket"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'pdfs');

UPDATE storage.buckets
SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/svg+xml',
    'image/webp',
    'image/tiff',
    'application/json',
    'text/csv'
  ]
WHERE id = 'pdfs';

-- ============================================================
-- 2. order-entry-pdfs bucket: fully private
-- ============================================================

DROP POLICY IF EXISTS "Allow public reads from order-entry-pdfs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public inserts to order-entry-pdfs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to order-entry-pdfs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from order-entry-pdfs bucket" ON storage.objects;

UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg'
  ]
WHERE id = 'order-entry-pdfs';

CREATE POLICY "Authenticated users can read from order-entry-pdfs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'order-entry-pdfs');

CREATE POLICY "Authenticated users can upload to order-entry-pdfs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'order-entry-pdfs');

CREATE POLICY "Authenticated users can update in order-entry-pdfs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'order-entry-pdfs')
  WITH CHECK (bucket_id = 'order-entry-pdfs');

CREATE POLICY "Authenticated users can delete from order-entry-pdfs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'order-entry-pdfs');
