# Add User Response Message to Workflow V2

**Date:** 2026-02-16

## Summary

Brought Workflow V2 step execution to parity with Workflow V1 by enabling User Response Messages on all V2 steps. V2 workflows now resolve user response templates during execution and display step results in the extraction UI, matching V1 behavior.

## Changes

### 1. Database Migration
- Added `user_response` (text, nullable) column to `workflow_v2_step_logs` table to store the resolved user response message per step.

### 2. Edge Functions - json-workflow-processor-v2
- Added `resolveUserResponseTemplate()` function to `utils.ts` that replaces `{path.to.value}` tokens with actual values from context data.
- Updated `createV2StepLog()` to accept an optional `contextData` parameter, resolve the node's `user_response_template`, and write the result to the new `user_response` column.
- Updated all `createV2StepLog()` calls in `index.ts` to pass `contextData`.

### 3. Edge Functions - transform-workflow-processor-v2
- Same changes as above applied to the transform processor's `utils.ts` and `index.ts`.

### 4. Frontend - logService.ts
- Changed V2 step log mapping from hard-coded `userResponse: null` to reading `log.user_response` from the database, enabling the extraction UI to display V2 user response messages.

### 5. Frontend - WorkflowV2StepConfigPanel
- Replaced the plain textarea for User Response Template with an input field plus a VariableDropdown button (matching V1's UX).
- The dropdown populates variables from `responseDataMappings` on the current step and all other nodes in the workflow.
- Updated label to "User Response Message" with "(Optional)" suffix and added help text with placeholder example.

## Files Modified

- `supabase/functions/json-workflow-processor-v2/utils.ts`
- `supabase/functions/json-workflow-processor-v2/index.ts`
- `supabase/functions/transform-workflow-processor-v2/utils.ts`
- `supabase/functions/transform-workflow-processor-v2/index.ts`
- `src/services/logService.ts`
- `src/components/settings/workflow-v2/WorkflowV2StepConfigPanel.tsx`
