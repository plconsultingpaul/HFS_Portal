# 2026-02-20 - Step 2: TypeScript Types for Read Email & Workflow V2 Processing Mode

## What Changed

Updated the frontend TypeScript types to match the database changes from Step 1.

## Changes

### `src/types/index.ts`

- **`EmailProcessingRule` interface**
  - `processingMode` union expanded from `'extraction' | 'transformation'` to `'extraction' | 'transformation' | 'workflow_v2'`
  - Added optional `workflowV2Id?: string` field to store the linked Workflow V2 ID

- **`WorkflowV2StepType` type**
  - Added `'read_email'` to the union type (joins existing: `api_call`, `api_endpoint`, `conditional_check`, `data_transform`, `sftp_upload`, `email_action`, `rename_file`, `multipart_form_upload`, `ai_decision`, `imaging`)
