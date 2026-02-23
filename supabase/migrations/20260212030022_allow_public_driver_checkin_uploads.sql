/*
  # Allow public uploads for driver check-in

  The driver check-in page is a public route used by unauthenticated drivers.
  This migration adds a narrowly scoped INSERT policy that only allows
  anonymous uploads to the `driver-checkin/` folder within the `pdfs` bucket.

  All other upload paths in the bucket still require authentication.

  1. Security
     - New INSERT policy scoped to `driver-checkin/` folder only
     - Uses `storage.foldername()` to verify path prefix
     - Does not grant read, update, or delete access
*/

CREATE POLICY "Public can upload to driver-checkin folder in pdfs bucket"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (
    bucket_id = 'pdfs'
    AND (storage.foldername(name))[1] = 'driver-checkin'
  );
