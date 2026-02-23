/*
  # Step 3: Tighten RLS on Extraction, Transform & Workflow Configuration Tables

  Replaces wide-open policies on 15 admin configuration tables for the
  document processing pipeline. All tables get the same pattern:
    - SELECT: any authenticated user
    - INSERT/UPDATE/DELETE: authenticated + is_admin()

  ## Tables Modified (15 total)
    - `extraction_types` (4 public policies removed)
    - `extraction_type_array_entries` (4 public policies removed)
    - `extraction_type_array_entry_fields` (4 public policies removed)
    - `extraction_type_array_splits` (1 public FOR ALL removed)
    - `transformation_types` (1 public FOR ALL removed)
    - `field_mapping_functions` (4 public policies removed)
    - `page_group_configs` (4 anon policies removed)
    - `workflow_steps` (1 public FOR ALL removed)
    - `extraction_workflows` (1 public FOR ALL removed)
    - `feature_flags` (4 public policies removed)
    - `user_extraction_types` (1 public FOR ALL removed)
    - `user_transformation_types` (1 public FOR ALL removed)
    - `notification_templates` (4 public policies removed)
    - `email_processing_rules` (4 public policies removed)
    - `cron_settings` (3 anon+authenticated policies removed)

  ## Security Changes
    - Every table: SELECT requires authenticated role
    - Every table: INSERT/UPDATE/DELETE requires authenticated + is_admin()
    - Anonymous users lose all access to these configuration tables
    - Edge functions (service role) are unaffected

  ## Important Notes
    1. No frontend code changes needed -- all access to these tables
       already happens within authenticated sessions
    2. Client users can still read config (needed for order entry,
       track & trace) but cannot modify it
    3. Edge functions bypass RLS via service role key
*/

-- ============================================================
-- extraction_types
-- ============================================================
DROP POLICY IF EXISTS "Allow public read access to extraction types" ON extraction_types;
DROP POLICY IF EXISTS "Allow public insert access to extraction types" ON extraction_types;
DROP POLICY IF EXISTS "Allow public update access to extraction types" ON extraction_types;
DROP POLICY IF EXISTS "Allow public delete access to extraction types" ON extraction_types;

CREATE POLICY "Authenticated can select extraction_types"
  ON extraction_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert extraction_types"
  ON extraction_types FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update extraction_types"
  ON extraction_types FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete extraction_types"
  ON extraction_types FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- extraction_type_array_entries
-- ============================================================
DROP POLICY IF EXISTS "Allow public read access to array entries" ON extraction_type_array_entries;
DROP POLICY IF EXISTS "Allow public insert to array entries" ON extraction_type_array_entries;
DROP POLICY IF EXISTS "Allow public update to array entries" ON extraction_type_array_entries;
DROP POLICY IF EXISTS "Allow public delete from array entries" ON extraction_type_array_entries;

CREATE POLICY "Authenticated can select extraction_type_array_entries"
  ON extraction_type_array_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert extraction_type_array_entries"
  ON extraction_type_array_entries FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update extraction_type_array_entries"
  ON extraction_type_array_entries FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete extraction_type_array_entries"
  ON extraction_type_array_entries FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- extraction_type_array_entry_fields
-- ============================================================
DROP POLICY IF EXISTS "Allow public read access to array entry fields" ON extraction_type_array_entry_fields;
DROP POLICY IF EXISTS "Allow public insert to array entry fields" ON extraction_type_array_entry_fields;
DROP POLICY IF EXISTS "Allow public update to array entry fields" ON extraction_type_array_entry_fields;
DROP POLICY IF EXISTS "Allow public delete from array entry fields" ON extraction_type_array_entry_fields;

CREATE POLICY "Authenticated can select extraction_type_array_entry_fields"
  ON extraction_type_array_entry_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert extraction_type_array_entry_fields"
  ON extraction_type_array_entry_fields FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update extraction_type_array_entry_fields"
  ON extraction_type_array_entry_fields FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete extraction_type_array_entry_fields"
  ON extraction_type_array_entry_fields FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- extraction_type_array_splits
-- ============================================================
DROP POLICY IF EXISTS "Allow public access to extraction type array splits" ON extraction_type_array_splits;

CREATE POLICY "Authenticated can select extraction_type_array_splits"
  ON extraction_type_array_splits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert extraction_type_array_splits"
  ON extraction_type_array_splits FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update extraction_type_array_splits"
  ON extraction_type_array_splits FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete extraction_type_array_splits"
  ON extraction_type_array_splits FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- transformation_types
-- ============================================================
DROP POLICY IF EXISTS "Allow public access to transformation types" ON transformation_types;

CREATE POLICY "Authenticated can select transformation_types"
  ON transformation_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert transformation_types"
  ON transformation_types FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update transformation_types"
  ON transformation_types FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete transformation_types"
  ON transformation_types FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- field_mapping_functions
-- ============================================================
DROP POLICY IF EXISTS "Allow public read access to field mapping functions" ON field_mapping_functions;
DROP POLICY IF EXISTS "Allow public insert access to field mapping functions" ON field_mapping_functions;
DROP POLICY IF EXISTS "Allow public update access to field mapping functions" ON field_mapping_functions;
DROP POLICY IF EXISTS "Allow public delete access to field mapping functions" ON field_mapping_functions;

CREATE POLICY "Authenticated can select field_mapping_functions"
  ON field_mapping_functions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert field_mapping_functions"
  ON field_mapping_functions FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update field_mapping_functions"
  ON field_mapping_functions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete field_mapping_functions"
  ON field_mapping_functions FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- page_group_configs
-- ============================================================
DROP POLICY IF EXISTS "Allow anon to view page group configs" ON page_group_configs;
DROP POLICY IF EXISTS "Allow anon to insert page group configs" ON page_group_configs;
DROP POLICY IF EXISTS "Allow anon to update page group configs" ON page_group_configs;
DROP POLICY IF EXISTS "Allow anon to delete page group configs" ON page_group_configs;

CREATE POLICY "Authenticated can select page_group_configs"
  ON page_group_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert page_group_configs"
  ON page_group_configs FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update page_group_configs"
  ON page_group_configs FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete page_group_configs"
  ON page_group_configs FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- workflow_steps
-- ============================================================
DROP POLICY IF EXISTS "Allow public access to workflow steps" ON workflow_steps;

CREATE POLICY "Authenticated can select workflow_steps"
  ON workflow_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert workflow_steps"
  ON workflow_steps FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update workflow_steps"
  ON workflow_steps FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete workflow_steps"
  ON workflow_steps FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- extraction_workflows
-- ============================================================
DROP POLICY IF EXISTS "Allow public access to extraction workflows" ON extraction_workflows;

CREATE POLICY "Authenticated can select extraction_workflows"
  ON extraction_workflows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert extraction_workflows"
  ON extraction_workflows FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update extraction_workflows"
  ON extraction_workflows FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete extraction_workflows"
  ON extraction_workflows FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- feature_flags
-- ============================================================
DROP POLICY IF EXISTS "Allow public read access to feature flags" ON feature_flags;
DROP POLICY IF EXISTS "Allow public insert access to feature flags" ON feature_flags;
DROP POLICY IF EXISTS "Allow public update access to feature flags" ON feature_flags;
DROP POLICY IF EXISTS "Allow public delete access to feature flags" ON feature_flags;

CREATE POLICY "Authenticated can select feature_flags"
  ON feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert feature_flags"
  ON feature_flags FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update feature_flags"
  ON feature_flags FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete feature_flags"
  ON feature_flags FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- user_extraction_types
-- ============================================================
DROP POLICY IF EXISTS "Allow public access to user extraction types" ON user_extraction_types;

CREATE POLICY "Authenticated can select user_extraction_types"
  ON user_extraction_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert user_extraction_types"
  ON user_extraction_types FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update user_extraction_types"
  ON user_extraction_types FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete user_extraction_types"
  ON user_extraction_types FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- user_transformation_types
-- ============================================================
DROP POLICY IF EXISTS "Enable all access for user_transformation_types" ON user_transformation_types;

CREATE POLICY "Authenticated can select user_transformation_types"
  ON user_transformation_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert user_transformation_types"
  ON user_transformation_types FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update user_transformation_types"
  ON user_transformation_types FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete user_transformation_types"
  ON user_transformation_types FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- notification_templates
-- ============================================================
DROP POLICY IF EXISTS "Allow public read access to notification_templates" ON notification_templates;
DROP POLICY IF EXISTS "Allow public insert access to notification_templates" ON notification_templates;
DROP POLICY IF EXISTS "Allow public update access to notification_templates" ON notification_templates;
DROP POLICY IF EXISTS "Allow public delete access to notification_templates" ON notification_templates;

CREATE POLICY "Authenticated can select notification_templates"
  ON notification_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert notification_templates"
  ON notification_templates FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update notification_templates"
  ON notification_templates FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete notification_templates"
  ON notification_templates FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- email_processing_rules
-- ============================================================
DROP POLICY IF EXISTS "Allow public read access to email processing rules" ON email_processing_rules;
DROP POLICY IF EXISTS "Allow public insert access to email processing rules" ON email_processing_rules;
DROP POLICY IF EXISTS "Allow public update access to email processing rules" ON email_processing_rules;
DROP POLICY IF EXISTS "Allow public delete access to email processing rules" ON email_processing_rules;

CREATE POLICY "Authenticated can select email_processing_rules"
  ON email_processing_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert email_processing_rules"
  ON email_processing_rules FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update email_processing_rules"
  ON email_processing_rules FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete email_processing_rules"
  ON email_processing_rules FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- cron_settings
-- ============================================================
DROP POLICY IF EXISTS "Allow read access to cron_settings" ON cron_settings;
DROP POLICY IF EXISTS "Allow insert access to cron_settings" ON cron_settings;
DROP POLICY IF EXISTS "Allow update access to cron_settings" ON cron_settings;

CREATE POLICY "Authenticated admins can select cron_settings"
  ON cron_settings FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can insert cron_settings"
  ON cron_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update cron_settings"
  ON cron_settings FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete cron_settings"
  ON cron_settings FOR DELETE TO authenticated USING (public.is_admin());
