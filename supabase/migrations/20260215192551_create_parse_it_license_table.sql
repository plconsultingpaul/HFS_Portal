/*
  # Create Parse-It License Table

  1. New Tables
    - `parse_it_license`
      - `id` (uuid, primary key)
      - `customer_name` (text, not null) - Licensed company name
      - `issued_at` (timestamptz, not null) - When license was generated
      - `expiry_date` (date, nullable) - License expiry date (informational only)
      - `extractions` (boolean, default false) - Extract module access
      - `transformations` (boolean, default false) - Transform module access
      - `execute_flows` (boolean, default false) - Execute flows access
      - `client_portal` (boolean, default false) - Client Setup access
      - `vendor_portal` (boolean, default false) - Vendor Setup access
      - `driver_check_in` (boolean, default false) - Check-In Setup access
      - `imaging` (boolean, default false) - Imaging module access
      - `raw_payload` (jsonb, not null) - Full decrypted license payload
      - `uploaded_at` (timestamptz, default now()) - When license was uploaded

  2. Security
    - Enable RLS on `parse_it_license` table
    - Authenticated users can read license data
    - Only admin users can insert new licenses

  3. Notes
    - Only the most recent row (by uploaded_at) is the active license
    - Expiry date is informational only and does not block feature access
*/

CREATE TABLE IF NOT EXISTS parse_it_license (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  issued_at timestamptz NOT NULL,
  expiry_date date,
  extractions boolean NOT NULL DEFAULT false,
  transformations boolean NOT NULL DEFAULT false,
  execute_flows boolean NOT NULL DEFAULT false,
  client_portal boolean NOT NULL DEFAULT false,
  vendor_portal boolean NOT NULL DEFAULT false,
  driver_check_in boolean NOT NULL DEFAULT false,
  imaging boolean NOT NULL DEFAULT false,
  raw_payload jsonb NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE parse_it_license ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read license data"
  ON parse_it_license
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert license data"
  ON parse_it_license
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (
        SELECT (auth.jwt() -> 'user_metadata' ->> 'legacy_user_id')::uuid
      )
      AND users.is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_parse_it_license_uploaded_at
  ON parse_it_license (uploaded_at DESC);