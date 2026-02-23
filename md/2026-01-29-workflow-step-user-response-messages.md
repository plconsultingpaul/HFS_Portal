# Workflow Step User Response Messages

**Date:** 2026-01-29

## Overview

Added the ability for administrators to configure custom user-facing messages for each workflow step. These messages are displayed in the Extract page's Workflow Progress section, providing users with meaningful feedback about what each step accomplished.

## Database Changes

### Migration: `add_user_response_to_workflow_steps`

1. **`workflow_steps` table**
   - Added `user_response_template` (text, nullable) - Template message with variable placeholders that admins can configure

2. **`workflow_step_logs` table**
   - Added `user_response` (text, nullable) - The resolved/processed message after variable substitution

## Code Changes

### Backend (Edge Function)

**File:** `supabase/functions/json-workflow-processor/utils.ts`

- Added `resolveUserResponseTemplate()` function to substitute `{variableName}` placeholders with actual values from context data
- Updated `createStepLog()` function to accept `contextData` parameter and include resolved `user_response` in step logs

**File:** `supabase/functions/json-workflow-processor/index.ts`

- Updated all `createStepLog()` calls to pass `contextData` for variable resolution

### Frontend

**File:** `src/components/settings/workflow/StepConfigForm.tsx`

- Added `userResponseTemplate` state variable
- Added "User Response Message" input field with variable dropdown support
- Field appears for all step types and supports `{variableName}` syntax

**File:** `src/services/workflowService.ts`

- Updated `fetchWorkflowSteps()` to include `userResponseTemplate` in mapping
- Updated `updateWorkflowSteps()` to save `user_response_template` on insert and update

**File:** `src/services/logService.ts`

- Added `userResponse` to `WorkflowStepLog` interface
- Updated mapping functions to include `user_response`

**File:** `src/types/index.ts`

- Added `userResponseTemplate?: string` to `WorkflowStep` interface

**File:** `src/components/extract/PageProcessorCard.tsx`

- Updated Workflow Progress section to display user response messages
- Changed from horizontal step indicators to a 2-3 column grid layout
- Each step shows the resolved user response (or step name if no response configured)
- Color-coded text based on step status (green for completed, red for failed, gray for skipped)

## Usage

### Configuring User Response Messages

1. Navigate to Settings > Workflows
2. Edit or create a workflow step
3. In the "User Response Message" field, enter a template like:
   ```
   Found Client ID: {orders.0.consignee.clientId}
   ```
4. Use the `{ }` button to insert available variables from extraction or previous workflow steps

### Variable Syntax

- Use `{variableName}` to reference extracted data fields
- Use `{response.fieldName}` to reference API response mappings from previous steps
- Nested paths are supported: `{orders.0.consignee.clientId}`

### Display Behavior

- If a user response template is configured and resolved successfully, it displays in the Workflow Progress section
- If no template is configured, the step name is displayed instead
- Variables that cannot be resolved remain as `{variableName}` in the output

## Example

| Step | Template | Resolved Output |
|------|----------|-----------------|
| API Call | `Finding Client - Found: {orders.0.consignee.clientId}` | `Finding Client - Found: ACME-001` |
| SFTP Upload | `Uploaded file: {filename}` | `Uploaded file: invoice_12345.pdf` |
| Email | (blank) | `Email Action` (step name shown) |
