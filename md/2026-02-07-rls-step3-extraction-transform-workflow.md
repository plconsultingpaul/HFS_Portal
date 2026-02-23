# RLS Step 3: Extraction, Transform & Workflow Configuration

**Date:** 2026-02-07
**Migration file:** `step3_tighten_rls_extraction_transform_workflow`

## Summary

Replaced wide-open RLS policies on 15 admin configuration tables used by the document processing pipeline. All tables follow the same pattern: authenticated users can read, only admins can write. No frontend code changes were needed.

## Tables Changed (15 total)

| Table | Old Policy | New Policy |
|---|---|---|
| `extraction_types` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `extraction_type_array_entries` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `extraction_type_array_entry_fields` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `extraction_type_array_splits` | 1 public FOR ALL (USING true) | SELECT: authenticated; writes: admin |
| `transformation_types` | 1 public FOR ALL (USING true) | SELECT: authenticated; writes: admin |
| `field_mapping_functions` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `page_group_configs` | 4 anon policies (USING true) | SELECT: authenticated; writes: admin |
| `workflow_steps` | 1 public FOR ALL (USING true) | SELECT: authenticated; writes: admin |
| `extraction_workflows` | 1 public FOR ALL (USING true) | SELECT: authenticated; writes: admin |
| `feature_flags` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `user_extraction_types` | 1 public FOR ALL (USING true) | SELECT: authenticated; writes: admin |
| `user_transformation_types` | 1 public FOR ALL (USING true) | SELECT: authenticated; writes: admin |
| `notification_templates` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `email_processing_rules` | 4 public policies (USING true) | SELECT: authenticated; writes: admin |
| `cron_settings` | 3 anon+auth policies (USING true) | All operations: admin only |

## Policies Removed

- 40 wide-open policies total (mix of public FOR ALL, per-command public, and anon/authenticated with USING true)

## Policies Added

- 60 new targeted policies (4 per table: SELECT, INSERT, UPDATE, DELETE)
- 14 tables: SELECT open to any authenticated user, writes require admin
- 1 table (`cron_settings`): all operations require admin (non-admins never need to see cron config)

## Frontend Files Changed

None. All access to these tables already happens within authenticated sessions. Edge functions use the service role key and bypass RLS.

## What To Test

1. **Extract page** -- upload and process PDFs
2. **Transform page** -- process documents
3. **Settings: extraction types** -- list, create, edit, delete
4. **Settings: transformation types** -- list, create, edit, delete
5. **Settings: field mapping functions** -- list, create, edit, delete
6. **Settings: workflows** -- list, create, edit steps, delete
7. **Settings: email monitoring rules** -- list, create, edit, delete
8. **Settings: feature flags** -- list, toggle flags
9. **Settings: notification templates** -- list, edit, delete
10. **Client portal** -- order entry and track & trace still work (they read extraction_types, etc.)
