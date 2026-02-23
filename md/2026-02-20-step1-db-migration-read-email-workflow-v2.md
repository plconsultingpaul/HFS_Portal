# 2026-02-20 - Step 1: DB Migration for Read Email Step & Workflow V2 Processing Mode

## What Changed

A database migration was applied to support the new "Read Email" step in Workflow V2 and the "Workflow V2" processing mode in Email Processing Rules.

## Changes

### `email_processing_rules` table
- **Added column** `workflow_v2_id` (uuid, nullable) - Foreign key to `workflows_v2.id`. Links a processing rule to a Workflow V2 when the rule's processing mode is set to `workflow_v2`.
- **Updated CHECK constraint** `email_processing_rules_processing_mode_check` - Now allows `'extraction'`, `'transformation'`, and `'workflow_v2'` (previously only `'extraction'` and `'transformation'`).

### `workflow_v2_nodes` table
- **Updated CHECK constraint** `workflow_v2_nodes_step_type_check` - Added `'read_email'` to the allowed step types (joins existing: `api_call`, `api_endpoint`, `conditional_check`, `data_transform`, `sftp_upload`, `email_action`, `rename_file`, `multipart_form_upload`, `ai_decision`, `imaging`).

## Migration File
`supabase/migrations/XXXXXXXX_add_read_email_step_and_workflow_v2_processing_mode.sql`
