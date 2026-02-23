# RLS Step 5: Logs, Data & Remaining Tables

**Date:** 2026-02-07
**Migration file:** `step5_tighten_rls_logs_data_remaining`

## Summary

Replaced wide-open RLS policies on the final 18 tables covering operational data (logs, submissions, processed data) and remaining configuration tables. Tables are split into three categories based on their access pattern. No frontend code changes were needed.

## Tables Changed (18 total)

### Category A: Config Tables (6 tables)
SELECT: authenticated; all writes: admin only.

| Table | Old Policy | New Policy |
|---|---|---|
| `company_branding` | 1 FOR ALL (public, USING true) | SELECT: authenticated; writes: admin |
| `settings_config` | 1 FOR ALL (public, USING true) | SELECT: authenticated; writes: admin |
| `driver_checkin_settings` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `api_specs` | 4 anon+auth policies (USING true) | SELECT: authenticated; writes: admin |
| `api_spec_endpoints` | 4 anon+auth policies (USING true) | SELECT: authenticated; writes: admin |
| `api_endpoint_fields` | 4 anon+auth policies (USING true) | SELECT: authenticated; writes: admin |

### Category B: Log/Data Tables with UPDATE (6 tables)
SELECT + INSERT: authenticated; UPDATE + DELETE: admin only.

| Table | Old Policy | New Policy |
|---|---|---|
| `extraction_logs` | 1 FOR ALL (public, USING true) | SELECT+INSERT: authenticated; UPDATE+DELETE: admin |
| `extraction_group_data` | 1 FOR ALL (public, USING true) | SELECT+INSERT: authenticated; UPDATE+DELETE: admin |
| `workflow_execution_logs` | 1 FOR ALL (public, USING true) | SELECT+INSERT: authenticated; UPDATE+DELETE: admin |
| `workflow_step_logs` | 1 FOR ALL (anon+auth, USING true) | SELECT+INSERT: authenticated; UPDATE+DELETE: admin |
| `processed_emails` | anon SELECT + auth FOR ALL | SELECT+INSERT: authenticated; UPDATE+DELETE: admin |
| `order_entry_submissions` | 4 public policies (USING true) | SELECT+INSERT: authenticated; UPDATE+DELETE: admin |

### Category C: Log/Data Tables without UPDATE (6 tables)
SELECT + INSERT: authenticated; DELETE: admin only. No UPDATE policy (immutable log records).

| Table | Old Policy | New Policy |
|---|---|---|
| `notification_logs` | 4 anon+auth policies | SELECT+INSERT: authenticated; DELETE: admin |
| `email_polling_logs` | 1 FOR ALL (public, USING true) | SELECT+INSERT: authenticated; DELETE: admin |
| `order_entry_pdfs` | 4 public policies (USING true) | SELECT+INSERT: authenticated; DELETE: admin |
| `driver_checkins` | 4 public policies (USING true) | SELECT+INSERT: authenticated; DELETE: admin |
| `driver_checkin_logs` | 4 public policies (USING true) | SELECT+INSERT: authenticated; DELETE: admin |
| `driver_checkin_documents` | 4 public policies (USING true) | SELECT+INSERT: authenticated; DELETE: admin |

## Policies Removed

- ~48 wide-open policies total (mix of FOR ALL, per-command public, anon+authenticated with USING true)

## Policies Added

- 66 new targeted policies across all 18 tables
- Config tables: 4 policies each (SELECT, INSERT, UPDATE, DELETE)
- Log tables with UPDATE: 4 policies each
- Log tables without UPDATE: 3 policies each (SELECT, INSERT, DELETE)

## Frontend Files Changed

None. All access to these tables already happens within authenticated sessions. Edge functions use the service role key and bypass RLS.

## What To Test

1. **Extraction logs page** -- loads and displays data
2. **Workflow execution logs page** -- loads and displays data
3. **Processed emails page** -- list view, filtering by date/status
4. **Order entry submissions** -- list and detail pages, new submissions
5. **Order entry PDF upload** -- upload still works
6. **Driver check-in page** -- still works for authenticated users
7. **Company branding settings** -- admin can read/write
8. **API specs settings** -- admin can read/write
9. **Email polling logs** -- admin can view
10. **Notification logs** -- admin can view

## Additional Cleanup (applied in same session)

**Migration file:** `additional_cleanup_view_functions_branding`

After Step 5, the "Additional Cleanup" items from the RLS plan were also addressed:

| Item | Status | What was done |
|---|---|---|
| Fix Security Definer View | Done | Recreated `stuck_workflow_steps` with `security_invoker = true` so it respects RLS |
| Fix Function Search Paths | Done | Added `SET search_path = public` to all 9 flagged functions |
| Enable Leaked Password Protection | Manual | Requires toggling in Supabase Dashboard > Auth > Settings |
| Review `company_branding` SELECT | Done | Added anon SELECT policy so login pages can display branding before auth |
| Review token tables | Done (no change) | `password_reset_tokens` and `user_registration_tokens` already fully locked (RLS on, zero policies) |

### Functions updated with search_path

- `update_field_mapping_functions_updated_at` (trigger)
- `create_default_template_sections` (trigger)
- `ensure_single_active_api_key` (trigger)
- `ensure_single_active_model` (trigger)
- `is_admin` (SECURITY DEFINER)
- `get_cron_expression` (SECURITY DEFINER)
- `exec_sql` (SECURITY DEFINER)
- `save_cron_settings` (SECURITY DEFINER)
- `get_cron_settings` (SECURITY DEFINER)

## RLS Plan Completion Status

All 5 steps plus all additional cleanup items are now complete. The only remaining action is enabling "Leaked Password Protection" manually in the Supabase Dashboard.
