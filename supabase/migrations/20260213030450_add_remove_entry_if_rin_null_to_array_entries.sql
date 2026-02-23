/*
  # Add "Remove Entry If RIN Null" option to array entries

  1. Modified Tables
    - `extraction_type_array_entries`
      - `remove_entry_if_rin_null` (boolean, default false) - When true, if any field marked with
        remove_if_null (RIN) has a null/empty value, the entire array entry is excluded from output
        rather than just omitting that individual field.

  2. Important Notes
    - Existing behavior (default false): RIN fields that are null are simply omitted from the entry object
    - New behavior (when true): If ANY RIN-flagged field is null, the ENTIRE entry is dropped from the array
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'extraction_type_array_entries' AND column_name = 'remove_entry_if_rin_null'
  ) THEN
    ALTER TABLE extraction_type_array_entries ADD COLUMN remove_entry_if_rin_null boolean DEFAULT false;
  END IF;
END $$;
