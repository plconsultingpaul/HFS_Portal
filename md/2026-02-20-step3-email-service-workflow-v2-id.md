# 2026-02-20 - Step 3: Email Service - Wire workflow_v2_id Through Fetch/Save

## What Changed

Updated the email service to read and write the `workflow_v2_id` column when fetching and saving email processing rules.

## Changes

### `src/services/emailService.ts`

- **`fetchEmailRules` function (line ~159)**
  - Added `workflowV2Id: rule.workflow_v2_id` to the DB-to-interface mapping so the frontend receives the linked Workflow V2 ID

- **`updateEmailRules` function (line ~191)**
  - Added `workflow_v2_id: rule.workflowV2Id || null` to the insert payload so the Workflow V2 ID is persisted back to the database (defaults to `null` when not set)
