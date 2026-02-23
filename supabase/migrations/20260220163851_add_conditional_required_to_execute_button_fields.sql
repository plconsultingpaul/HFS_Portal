/*
  # Add Conditional Required to Execute Button Fields

  1. Modified Tables
    - `execute_button_fields`
      - `conditional_required_field_id` (uuid, nullable, FK to execute_button_fields) - the field whose value determines if this field becomes required
      - `conditional_required_operator` (text, nullable) - comparison operator: 'not_null', 'null', 'starts_with', 'contains'
      - `conditional_required_value` (text, nullable) - comparison value used by 'starts_with' and 'contains' operators

  2. Important Notes
    - These columns are nullable; when all three are null, the field uses the existing `is_required` logic
    - A self-referencing foreign key is used so that deleting the referenced field clears the condition (SET NULL)
    - An index is added on the FK column for query performance
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'execute_button_fields' AND column_name = 'conditional_required_field_id'
  ) THEN
    ALTER TABLE execute_button_fields
      ADD COLUMN conditional_required_field_id uuid REFERENCES execute_button_fields(id) ON DELETE SET NULL DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'execute_button_fields' AND column_name = 'conditional_required_operator'
  ) THEN
    ALTER TABLE execute_button_fields
      ADD COLUMN conditional_required_operator text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'execute_button_fields' AND column_name = 'conditional_required_value'
  ) THEN
    ALTER TABLE execute_button_fields
      ADD COLUMN conditional_required_value text DEFAULT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_execute_button_fields_conditional_required_field_id
  ON execute_button_fields(conditional_required_field_id)
  WHERE conditional_required_field_id IS NOT NULL;