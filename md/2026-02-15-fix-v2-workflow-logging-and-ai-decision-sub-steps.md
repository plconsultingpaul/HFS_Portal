# Fix V2 Workflow Logging and AI Decision Sub-Step Logging

## Problem
1. Extractions using V2 workflows were not showing in the Workflow Execution Logs page. The V2 processors were already writing logs, but to separate V2-specific tables (`workflow_v2_execution_logs` and `workflow_v2_step_logs`). The frontend only read from the V1 tables.
2. The AI Decision step logged as a single entry with no visibility into its 3 internal phases.

## Changes

### Frontend - Log Service (`src/services/logService.ts`)
- `fetchWorkflowExecutionLogs` now fetches from both `workflow_execution_logs` (V1) and `workflow_v2_execution_logs` (V2) in parallel, maps V2 columns (`current_node_id`/`current_node_label`) to the V1 structure, and merges results sorted by start time.
- `fetchWorkflowExecutionLogById` now falls back to the V2 table if the ID is not found in V1.
- `fetchWorkflowStepLogsByExecutionId` now falls back to the `workflow_v2_step_logs` table (using `execution_log_id` instead of `workflow_execution_log_id`, and `node_id`/`node_label` instead of `step_id`/`step_name`) if no V1 step logs are found.

### Frontend - Workflow Execution Logs UI (`src/components/settings/WorkflowExecutionLogsSettings.tsx`)
- Added a `useEffect` that fetches V2 workflow names from `workflows_v2` so the "Workflow" column correctly displays V2 workflow names instead of "Unknown Workflow".

### Edge Functions - AI Decision Step (both `json-workflow-processor-v2` and `transform-workflow-processor-v2`)
- Updated `executeAiDecision` to accept `executionLogId` and `workflowId` parameters.
- The step now logs 3 separate sub-step entries to `workflow_v2_step_logs`:
  1. **Source Field Resolution** - Input: raw template fields, Output: resolved values from extracted data.
  2. **API Lookup** - Input: URL, method, API source config, Output: HTTP status, candidate count, candidate records.
  3. **AI Matching** - Input: candidate count, resolved source fields, AI instructions, model name, Output: AI match result (index, confidence, reason), matched record, matched value.
- Updated the main processor `index.ts` for both JSON-v2 and transform-v2 to pass `executionLogId` and `workflowId` to `executeAiDecision`.

### Deployed Edge Functions
- `json-workflow-processor-v2`
- `transform-workflow-processor-v2`
