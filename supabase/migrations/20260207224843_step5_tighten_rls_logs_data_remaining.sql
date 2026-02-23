/*
  # Step 5: Tighten RLS on Logs, Data & Remaining Tables

  Replaces wide-open policies on 18 tables covering operational data (logs, submissions,
  processed data) and remaining configuration tables.

  Tables fall into three categories:
    A) Config tables -- SELECT: authenticated; all writes: admin only
    B) Log/data tables with UPDATE -- SELECT+INSERT: authenticated; UPDATE+DELETE: admin
    C) Log/data tables without UPDATE -- SELECT+INSERT: authenticated; DELETE: admin

  ## Tables Modified (18 total)

  ### Category A: Config tables (6 tables)
    - `company_branding` -- SELECT: authenticated; writes: admin
    - `settings_config` -- SELECT: authenticated; writes: admin
    - `driver_checkin_settings` -- SELECT: authenticated; writes: admin
    - `api_specs` -- SELECT: authenticated; writes: admin
    - `api_spec_endpoints` -- SELECT: authenticated; writes: admin
    - `api_endpoint_fields` -- SELECT: authenticated; writes: admin

  ### Category B: Log/data tables with UPDATE (6 tables)
    - `extraction_logs` -- SELECT+INSERT: authenticated; UPDATE+DELETE: admin
    - `extraction_group_data` -- SELECT+INSERT: authenticated; UPDATE+DELETE: admin
    - `workflow_execution_logs` -- SELECT+INSERT: authenticated; UPDATE+DELETE: admin
    - `workflow_step_logs` -- SELECT+INSERT: authenticated; UPDATE+DELETE: admin
    - `processed_emails` -- SELECT+INSERT: authenticated; UPDATE+DELETE: admin
    - `order_entry_submissions` -- SELECT+INSERT: authenticated; UPDATE+DELETE: admin

  ### Category C: Log/data tables without UPDATE (6 tables)
    - `notification_logs` -- SELECT+INSERT: authenticated; DELETE: admin
    - `email_polling_logs` -- SELECT+INSERT: authenticated; DELETE: admin
    - `order_entry_pdfs` -- SELECT+INSERT: authenticated; DELETE: admin
    - `driver_checkins` -- SELECT+INSERT: authenticated; DELETE: admin
    - `driver_checkin_logs` -- SELECT+INSERT: authenticated; DELETE: admin
    - `driver_checkin_documents` -- SELECT+INSERT: authenticated; DELETE: admin

  ## Security Changes
    - Anonymous users lose all access to every table
    - Authenticated users can read all tables and insert into log/data tables
    - Only admins can modify or delete records
    - Edge functions (service role) are unaffected
*/

-- ============================================================
-- CATEGORY A: Config tables (SELECT: auth, all writes: admin)
-- ============================================================

-- company_branding (had FOR ALL public)
DROP POLICY IF EXISTS "Allow public access to company branding" ON company_branding;

CREATE POLICY "Authenticated can select company_branding"
  ON company_branding FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert company_branding"
  ON company_branding FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update company_branding"
  ON company_branding FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete company_branding"
  ON company_branding FOR DELETE TO authenticated USING (public.is_admin());

-- settings_config (had FOR ALL public)
DROP POLICY IF EXISTS "Allow public access to settings config" ON settings_config;

CREATE POLICY "Authenticated can select settings_config"
  ON settings_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert settings_config"
  ON settings_config FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update settings_config"
  ON settings_config FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete settings_config"
  ON settings_config FOR DELETE TO authenticated USING (public.is_admin());

-- driver_checkin_settings
DROP POLICY IF EXISTS "Allow public read access to driver_checkin_settings" ON driver_checkin_settings;
DROP POLICY IF EXISTS "Allow public insert to driver_checkin_settings" ON driver_checkin_settings;
DROP POLICY IF EXISTS "Allow public update to driver_checkin_settings" ON driver_checkin_settings;
DROP POLICY IF EXISTS "Allow public delete from driver_checkin_settings" ON driver_checkin_settings;

CREATE POLICY "Authenticated can select driver_checkin_settings"
  ON driver_checkin_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert driver_checkin_settings"
  ON driver_checkin_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update driver_checkin_settings"
  ON driver_checkin_settings FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete driver_checkin_settings"
  ON driver_checkin_settings FOR DELETE TO authenticated USING (public.is_admin());

-- api_specs
DROP POLICY IF EXISTS "Enable read access for all users" ON api_specs;
DROP POLICY IF EXISTS "Enable insert access for all users" ON api_specs;
DROP POLICY IF EXISTS "Enable update access for all users" ON api_specs;
DROP POLICY IF EXISTS "Enable delete access for all users" ON api_specs;

CREATE POLICY "Authenticated can select api_specs"
  ON api_specs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert api_specs"
  ON api_specs FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update api_specs"
  ON api_specs FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete api_specs"
  ON api_specs FOR DELETE TO authenticated USING (public.is_admin());

-- api_spec_endpoints
DROP POLICY IF EXISTS "Enable read access for all users" ON api_spec_endpoints;
DROP POLICY IF EXISTS "Enable insert access for all users" ON api_spec_endpoints;
DROP POLICY IF EXISTS "Enable update access for all users" ON api_spec_endpoints;
DROP POLICY IF EXISTS "Enable delete access for all users" ON api_spec_endpoints;

CREATE POLICY "Authenticated can select api_spec_endpoints"
  ON api_spec_endpoints FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert api_spec_endpoints"
  ON api_spec_endpoints FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update api_spec_endpoints"
  ON api_spec_endpoints FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete api_spec_endpoints"
  ON api_spec_endpoints FOR DELETE TO authenticated USING (public.is_admin());

-- api_endpoint_fields
DROP POLICY IF EXISTS "Enable read access for all users" ON api_endpoint_fields;
DROP POLICY IF EXISTS "Enable insert access for all users" ON api_endpoint_fields;
DROP POLICY IF EXISTS "Enable update access for all users" ON api_endpoint_fields;
DROP POLICY IF EXISTS "Enable delete access for all users" ON api_endpoint_fields;

CREATE POLICY "Authenticated can select api_endpoint_fields"
  ON api_endpoint_fields FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert api_endpoint_fields"
  ON api_endpoint_fields FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update api_endpoint_fields"
  ON api_endpoint_fields FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete api_endpoint_fields"
  ON api_endpoint_fields FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- CATEGORY B: Log/data tables with UPDATE
-- (SELECT+INSERT: authenticated; UPDATE+DELETE: admin)
-- ============================================================

-- extraction_logs (had FOR ALL public)
DROP POLICY IF EXISTS "Allow public access to extraction logs" ON extraction_logs;

CREATE POLICY "Authenticated can select extraction_logs"
  ON extraction_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert extraction_logs"
  ON extraction_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update extraction_logs"
  ON extraction_logs FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete extraction_logs"
  ON extraction_logs FOR DELETE TO authenticated USING (public.is_admin());

-- extraction_group_data (had FOR ALL public)
DROP POLICY IF EXISTS "Allow public access to extraction group data" ON extraction_group_data;

CREATE POLICY "Authenticated can select extraction_group_data"
  ON extraction_group_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert extraction_group_data"
  ON extraction_group_data FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update extraction_group_data"
  ON extraction_group_data FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete extraction_group_data"
  ON extraction_group_data FOR DELETE TO authenticated USING (public.is_admin());

-- workflow_execution_logs (had FOR ALL public)
DROP POLICY IF EXISTS "Allow public access to workflow execution logs" ON workflow_execution_logs;

CREATE POLICY "Authenticated can select workflow_execution_logs"
  ON workflow_execution_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert workflow_execution_logs"
  ON workflow_execution_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update workflow_execution_logs"
  ON workflow_execution_logs FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete workflow_execution_logs"
  ON workflow_execution_logs FOR DELETE TO authenticated USING (public.is_admin());

-- workflow_step_logs (had FOR ALL authenticated+anon)
DROP POLICY IF EXISTS "workflow_step_logs_all_access" ON workflow_step_logs;

CREATE POLICY "Authenticated can select workflow_step_logs"
  ON workflow_step_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert workflow_step_logs"
  ON workflow_step_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update workflow_step_logs"
  ON workflow_step_logs FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete workflow_step_logs"
  ON workflow_step_logs FOR DELETE TO authenticated USING (public.is_admin());

-- processed_emails (had anon SELECT + authenticated FOR ALL)
DROP POLICY IF EXISTS "Allow anon to read processed emails" ON processed_emails;
DROP POLICY IF EXISTS "processed_emails_all_access" ON processed_emails;

CREATE POLICY "Authenticated can select processed_emails"
  ON processed_emails FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert processed_emails"
  ON processed_emails FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update processed_emails"
  ON processed_emails FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete processed_emails"
  ON processed_emails FOR DELETE TO authenticated USING (public.is_admin());

-- order_entry_submissions
DROP POLICY IF EXISTS "Allow public read access to submissions" ON order_entry_submissions;
DROP POLICY IF EXISTS "Allow public insert access to submissions" ON order_entry_submissions;
DROP POLICY IF EXISTS "Allow public update access to submissions" ON order_entry_submissions;
DROP POLICY IF EXISTS "Allow public delete access to submissions" ON order_entry_submissions;

CREATE POLICY "Authenticated can select order_entry_submissions"
  ON order_entry_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert order_entry_submissions"
  ON order_entry_submissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update order_entry_submissions"
  ON order_entry_submissions FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete order_entry_submissions"
  ON order_entry_submissions FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- CATEGORY C: Log/data tables without UPDATE
-- (SELECT+INSERT: authenticated; DELETE: admin)
-- ============================================================

-- notification_logs (had anon SELECT+INSERT + authenticated SELECT+INSERT)
DROP POLICY IF EXISTS "Allow anon select on notification_logs" ON notification_logs;
DROP POLICY IF EXISTS "Allow anon insert on notification_logs" ON notification_logs;
DROP POLICY IF EXISTS "Authenticated users can view notification logs" ON notification_logs;
DROP POLICY IF EXISTS "Service role can insert notification logs" ON notification_logs;

CREATE POLICY "Authenticated can select notification_logs"
  ON notification_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert notification_logs"
  ON notification_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can delete notification_logs"
  ON notification_logs FOR DELETE TO authenticated USING (public.is_admin());

-- email_polling_logs (had FOR ALL public)
DROP POLICY IF EXISTS "Allow public access to email polling logs" ON email_polling_logs;

CREATE POLICY "Authenticated can select email_polling_logs"
  ON email_polling_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert email_polling_logs"
  ON email_polling_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can delete email_polling_logs"
  ON email_polling_logs FOR DELETE TO authenticated USING (public.is_admin());

-- order_entry_pdfs
DROP POLICY IF EXISTS "Allow public read access to pdfs" ON order_entry_pdfs;
DROP POLICY IF EXISTS "Allow public insert access to pdfs" ON order_entry_pdfs;
DROP POLICY IF EXISTS "Allow public update access to pdfs" ON order_entry_pdfs;
DROP POLICY IF EXISTS "Allow public delete access to pdfs" ON order_entry_pdfs;

CREATE POLICY "Authenticated can select order_entry_pdfs"
  ON order_entry_pdfs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert order_entry_pdfs"
  ON order_entry_pdfs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can delete order_entry_pdfs"
  ON order_entry_pdfs FOR DELETE TO authenticated USING (public.is_admin());

-- driver_checkins
DROP POLICY IF EXISTS "Allow public read access to driver_checkins" ON driver_checkins;
DROP POLICY IF EXISTS "Allow public insert to driver_checkins" ON driver_checkins;
DROP POLICY IF EXISTS "Allow public update to driver_checkins" ON driver_checkins;
DROP POLICY IF EXISTS "Allow public delete from driver_checkins" ON driver_checkins;

CREATE POLICY "Authenticated can select driver_checkins"
  ON driver_checkins FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert driver_checkins"
  ON driver_checkins FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can delete driver_checkins"
  ON driver_checkins FOR DELETE TO authenticated USING (public.is_admin());

-- driver_checkin_logs
DROP POLICY IF EXISTS "Allow public read access to driver_checkin_logs" ON driver_checkin_logs;
DROP POLICY IF EXISTS "Allow public insert to driver_checkin_logs" ON driver_checkin_logs;
DROP POLICY IF EXISTS "Allow public update to driver_checkin_logs" ON driver_checkin_logs;
DROP POLICY IF EXISTS "Allow public delete from driver_checkin_logs" ON driver_checkin_logs;

CREATE POLICY "Authenticated can select driver_checkin_logs"
  ON driver_checkin_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert driver_checkin_logs"
  ON driver_checkin_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can delete driver_checkin_logs"
  ON driver_checkin_logs FOR DELETE TO authenticated USING (public.is_admin());

-- driver_checkin_documents
DROP POLICY IF EXISTS "Allow public read access to driver_checkin_documents" ON driver_checkin_documents;
DROP POLICY IF EXISTS "Allow public insert to driver_checkin_documents" ON driver_checkin_documents;
DROP POLICY IF EXISTS "Allow public update to driver_checkin_documents" ON driver_checkin_documents;
DROP POLICY IF EXISTS "Allow public delete from driver_checkin_documents" ON driver_checkin_documents;

CREATE POLICY "Authenticated can select driver_checkin_documents"
  ON driver_checkin_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert driver_checkin_documents"
  ON driver_checkin_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can delete driver_checkin_documents"
  ON driver_checkin_documents FOR DELETE TO authenticated USING (public.is_admin());
