# 2026-02-20 - Step 4: Email Rules Settings UI - Workflow V2 Processing Mode

## What Changed

Added "Workflow V2" as a third processing mode option in the Email Processing Rules settings UI, allowing users to select a Workflow V2 pipeline to process incoming emails.

## Changes

### `src/components/settings/EmailRulesSettings.tsx`

- **Imports**: Added `useEffect` from React, `WorkflowV2` type, and `fetchWorkflowsV2` from `workflowV2Service`
- **State**: Added `workflowsV2` state array, populated on mount via `useEffect`
- **Processing mode toggle**: Extended the 2-button toggle (Extract / Transform) to a 3-button toggle (Extract / Transform / Workflow V2)
- **Type dropdown**: When "Workflow V2" mode is selected, the extraction/transformation type dropdown is replaced with a Workflow V2 selector dropdown bound to `rule.workflowV2Id`
- **Rule subtitle**: Updated to show "Workflow V2 Mode" when that mode is active
- **Info box**: Updated bullet points to describe the Workflow V2 mode and clarify that it processes the email body directly rather than requiring PDF attachments
