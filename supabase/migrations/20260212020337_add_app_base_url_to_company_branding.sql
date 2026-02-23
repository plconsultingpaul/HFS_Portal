/*
  # Add app_base_url to company_branding

  1. Changes
    - Add `app_base_url` column to `company_branding` table
    - Used by edge functions to build secure links (password setup, password reset)
      instead of trusting the attacker-controlled Origin header

  2. Security
    - Provides a trusted, admin-configured base URL for outbound email links
    - Prevents open-redirect / phishing via spoofed Origin headers
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_branding' AND column_name = 'app_base_url'
  ) THEN
    ALTER TABLE company_branding ADD COLUMN app_base_url text DEFAULT '';
  END IF;
END $$;
