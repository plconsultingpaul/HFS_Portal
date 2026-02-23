/*
  # Create track_trace_route_summary_fields table

  This migration formally records the creation of the `track_trace_route_summary_fields` table,
  which was previously created outside of tracked migrations.

  1. New Tables
    - `track_trace_route_summary_fields`
      - `id` (uuid, primary key, auto-generated)
      - `group_id` (uuid, foreign key to track_trace_route_summary_groups, cascade delete)
      - `label` (text, not null) - display label for the field
      - `api_field` (text, not null) - the API field path this maps to
      - `display_order` (integer, default 0) - ordering within the group
      - `grid_column` (integer, default 1) - grid layout column position
      - `grid_row` (integer, default 1) - grid layout row position
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Indexes
    - Primary key on `id`
    - Index on `group_id` for foreign key lookups
    - Composite index on `(group_id, display_order)` for ordered queries within a group

  3. Security
    - Enable RLS on `track_trace_route_summary_fields`
    - Authenticated users can read all fields (SELECT)
    - Only admin users can insert, update, and delete fields
*/

CREATE TABLE IF NOT EXISTS track_trace_route_summary_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES track_trace_route_summary_groups(id) ON DELETE CASCADE,
  label text NOT NULL,
  api_field text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  grid_column integer NOT NULL DEFAULT 1,
  grid_row integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE track_trace_route_summary_fields ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_track_trace_route_summary_fields_group_id
  ON track_trace_route_summary_fields (group_id);

CREATE INDEX IF NOT EXISTS idx_track_trace_route_summary_fields_display_order
  ON track_trace_route_summary_fields (group_id, display_order);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'track_trace_route_summary_fields'::regclass
    AND polname = 'Authenticated can select track_trace_route_summary_fields'
  ) THEN
    CREATE POLICY "Authenticated can select track_trace_route_summary_fields"
      ON track_trace_route_summary_fields FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'track_trace_route_summary_fields'::regclass
    AND polname = 'Admins can insert track_trace_route_summary_fields'
  ) THEN
    CREATE POLICY "Admins can insert track_trace_route_summary_fields"
      ON track_trace_route_summary_fields FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'track_trace_route_summary_fields'::regclass
    AND polname = 'Admins can update track_trace_route_summary_fields'
  ) THEN
    CREATE POLICY "Admins can update track_trace_route_summary_fields"
      ON track_trace_route_summary_fields FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'track_trace_route_summary_fields'::regclass
    AND polname = 'Admins can delete track_trace_route_summary_fields'
  ) THEN
    CREATE POLICY "Admins can delete track_trace_route_summary_fields"
      ON track_trace_route_summary_fields FOR DELETE
      TO authenticated
      USING (public.is_admin());
  END IF;
END $$;
