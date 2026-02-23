# RLS Tightening Plan

## Background

The app uses Supabase Auth with a custom `public.users` table. Every `users.id` matches the corresponding `auth.users.id`, so `auth.uid()` can be used in all RLS policies. There is also a `public.is_admin()` helper function (SECURITY DEFINER) that checks if the current user is an active admin.

Currently, nearly every table has RLS "enabled" but with `USING (true)` / `WITH CHECK (true)` policies, which is the same as having no RLS at all. The anon key is exposed in the frontend bundle, so anyone who extracts it could read or modify data directly via the Supabase REST API.

## Approach

- Each step is a single migration that replaces the open policies on a group of related tables.
- After each step, test the app thoroughly before moving to the next.
- All write operations (INSERT, UPDATE, DELETE) will require `authenticated` role + admin check.
- Read (SELECT) will require `authenticated` at minimum, with some tables also requiring admin.
- Client-role users only need access to a small subset of tables (track & trace, order entry, address book).
- Edge functions use the service role key, so they bypass RLS entirely -- no edge function changes needed.

## Helper Functions Available

```sql
-- Already exists: checks if current user is an active admin
public.is_admin() RETURNS boolean

-- auth.uid() returns the current Supabase Auth user's UUID
```

---

## Step 1 -- Credentials & Secrets (Highest Priority)

These tables contain API keys, passwords, and sensitive configuration. Restrict to authenticated admins only.

| Table | Current Policy | New Policy |
|---|---|---|
| `gemini_api_keys` | anon full access | authenticated + is_admin() |
| `gemini_models` | anon full access | authenticated + is_admin() |
| `api_auth_config` | anon full access | authenticated + is_admin() |
| `api_settings` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `sftp_config` | public full access | authenticated + is_admin() |
| `email_monitoring_config` | anon full access | authenticated + is_admin() |
| `security_settings` | public full access | authenticated + is_admin() |
| `secondary_api_configs` | public full access | authenticated + is_admin() |

**What to test after this step:**
- Admin login still works
- Settings page loads (API, SFTP, Email Monitoring, Gemini config tabs)
- Saving settings still works
- Edge functions that read these configs still work (they use service role, so should be unaffected)
- Client users should NOT be able to see settings

---

## Step 2 -- Users, Auth & Tokens

These tables control who can log in and manage accounts. Restrict tightly.

| Table | Current Policy | New Policy |
|---|---|---|
| `users` | public full access | SELECT: authenticated (own row OR is_admin); INSERT/UPDATE/DELETE: authenticated + is_admin() |
| `password_reset_tokens` | public full access | SELECT/UPDATE: service role only (no public policy); INSERT: service role only |
| `password_reset_templates` | authenticated full access | authenticated + is_admin() |
| `user_registration_tokens` | public full access | SELECT/UPDATE: service role only; INSERT: service role only |
| `invitation_email_templates` | anon/authenticated full access | authenticated + is_admin() |
| `clients` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |

**What to test after this step:**
- Admin login and client login both work
- User management page: list, create, edit, delete users
- Password reset flow (edge function uses service role)
- Invitation email sending
- Client users can read their own profile but not others
- Client management in admin panel

---

## Step 3 -- Extraction, Transform & Workflow Configuration

Admin-only configuration tables for the core document processing pipeline.

| Table | Current Policy | New Policy |
|---|---|---|
| `extraction_types` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `extraction_type_array_entries` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `extraction_type_array_entry_fields` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `extraction_type_array_splits` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `transformation_types` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `field_mapping_functions` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `page_group_configs` | anon full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `workflow_steps` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `extraction_workflows` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `feature_flags` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `user_extraction_types` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `user_transformation_types` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `notification_templates` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `email_processing_rules` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `cron_settings` | anon/authenticated full access | authenticated + is_admin() |

**What to test after this step:**
- Extract page: upload and process PDFs
- Transform page: process documents
- Settings: extraction types, transformation types, field mapping functions
- Workflow configuration and editing
- Email monitoring rules
- Feature flags page
- Notification templates

---

## Step 4 -- Execute Buttons, Order Entry & Track/Trace Configuration

These are the feature-specific configuration tables. Some need client user read access.

| Table | Current Policy | New Policy |
|---|---|---|
| `execute_buttons` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `execute_button_fields` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `execute_button_groups` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `execute_button_steps` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `execute_button_categories` | anon/authenticated full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `execute_button_category_assignments` | anon/authenticated full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `execute_button_flow_nodes` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `execute_button_flow_edges` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `execute_button_global_settings` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `user_execute_category_access` | anon/authenticated full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `order_entry_config` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `order_entry_fields` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `order_entry_field_groups` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `order_entry_field_layout` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `order_entry_templates` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `order_entry_template_fields` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `order_entry_template_field_groups` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `order_entry_template_field_layout` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `order_entry_json_schemas` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `track_trace_configs` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `track_trace_fields` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `track_trace_templates` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `track_trace_template_fields` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `track_trace_template_default_fields` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `track_trace_template_sections` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `track_trace_filter_presets` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `track_trace_document_configs` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `track_trace_document_filters` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `track_trace_barcode_configs` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `track_trace_barcode_fields` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `track_trace_barcode_image_configs` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `track_trace_timeline_statuses` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `track_trace_timeline_child_statuses` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `track_trace_route_summary_groups` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `track_trace_route_summary_fields` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `track_trace_shipment_summary_config` | anon/authenticated full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `track_trace_shipment_summary_fields` | anon/authenticated full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `track_trace_shipment_summary_groups` | anon/authenticated full access | SELECT: authenticated; WRITE: authenticated + is_admin() |

**What to test after this step:**
- Execute page: buttons load, modals open, flows execute
- Order entry: form loads, submission works, PDF upload
- Track & trace: search works, shipment details, documents
- Client portal: track & trace, order entry still functional
- Admin: all configuration pages for execute, order entry, track & trace

---

## Step 5 -- Logs, Data & Remaining Tables

Operational data tables (logs, submissions, processed data). These are the lowest risk since they contain output data rather than configuration or credentials.

| Table | Current Policy | New Policy |
|---|---|---|
| `extraction_logs` | public full access | SELECT: authenticated; INSERT: authenticated; UPDATE/DELETE: authenticated + is_admin() |
| `extraction_group_data` | public full access | SELECT: authenticated; INSERT: authenticated; UPDATE/DELETE: authenticated + is_admin() |
| `workflow_execution_logs` | public full access | SELECT: authenticated; INSERT: authenticated; UPDATE/DELETE: authenticated + is_admin() |
| `workflow_step_logs` | anon/authenticated full access | SELECT: authenticated; INSERT: authenticated; UPDATE/DELETE: authenticated + is_admin() |
| `notification_logs` | anon/authenticated full access | SELECT: authenticated; INSERT: authenticated; DELETE: authenticated + is_admin() |
| `processed_emails` | authenticated full access | SELECT: authenticated; INSERT: authenticated; UPDATE/DELETE: authenticated + is_admin() |
| `email_polling_logs` | public full access | SELECT: authenticated; INSERT: authenticated; DELETE: authenticated + is_admin() |
| `order_entry_submissions` | public full access | SELECT: authenticated; INSERT: authenticated; UPDATE/DELETE: authenticated + is_admin() |
| `order_entry_pdfs` | public full access | SELECT: authenticated; INSERT: authenticated; DELETE: authenticated + is_admin() |
| `company_branding` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `settings_config` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `driver_checkin_settings` | public full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `driver_checkins` | public full access | SELECT: authenticated; INSERT: authenticated; DELETE: authenticated + is_admin() |
| `driver_checkin_logs` | public full access | SELECT: authenticated; INSERT: authenticated; DELETE: authenticated + is_admin() |
| `driver_checkin_documents` | public full access | SELECT: authenticated; INSERT: authenticated; DELETE: authenticated + is_admin() |
| `api_specs` | anon/authenticated full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `api_spec_endpoints` | anon/authenticated full access | SELECT: authenticated; WRITE: authenticated + is_admin() |
| `api_endpoint_fields` | anon/authenticated full access | SELECT: authenticated; WRITE: authenticated + is_admin() |

**What to test after this step:**
- Extraction logs page loads and displays data
- Workflow execution logs page
- Processed emails page
- Order entry submissions list and detail pages
- Driver check-in page still works
- Company branding settings
- API specs settings

---

## Additional Cleanup (After All Steps)

Once all 5 steps are complete:

1. **Fix the Security Definer View** -- Recreate `stuck_workflow_steps` without SECURITY DEFINER
2. **Fix Function Search Paths** -- Add `SET search_path = public` to the 9 flagged functions
3. **Enable Leaked Password Protection** -- Toggle in Supabase Dashboard under Auth settings
4. **Review `company_branding` SELECT** -- Login pages need branding data before auth. May need an anon SELECT policy on this one table specifically, or fetch branding via an edge function instead.
5. **Review `password_reset_tokens` and `user_registration_tokens`** -- These are used by edge functions (service role), so removing all public/anon policies should be safe, but verify the password setup and reset flows work end-to-end.

## Notes

- Edge functions use the **service role key**, which bypasses RLS entirely. No edge function changes are needed.
- The `is_admin()` function is already `SECURITY DEFINER` and `STABLE`, so it can be used efficiently in policies.
- Client users who need to read config tables (e.g., track & trace templates, order entry config) are covered by the `SELECT: authenticated` policy -- they just cannot write.
- If any non-admin user needs write access to specific tables in the future, per-table policies can be refined without re-doing the whole plan.
