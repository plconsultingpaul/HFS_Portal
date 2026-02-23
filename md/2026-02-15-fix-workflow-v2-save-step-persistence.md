# Fix Workflow V2 Save Step Persistence

## Problem
Clicking "Save Step" in the Workflow V2 step config panel only updated local React state. The configuration was not persisted to the database until the user clicked the top-level "Save" toolbar button. If the user closed and reopened a step without clicking the top Save, all changes were lost.

## Changes

### `src/services/workflowV2Service.ts`
- Added `saveWorkflowV2SingleNode` function that directly updates a single node's label, step type, config JSON, escape quotes flag, and user response template in the `workflow_v2_nodes` table.

### `src/components/settings/workflow-v2/WorkflowV2StepConfigPanel.tsx`
- Added `onSaveNode` optional prop to the component interface.
- Updated `handleApply` to call `onSaveNode` for existing (non-temp) nodes, persisting the step config to the database immediately when "Save Step" is clicked.

### `src/components/settings/workflow-v2/WorkflowV2FlowDesigner.tsx`
- Added `handleSaveNode` callback that calls `saveWorkflowV2SingleNode`.
- Passed `onSaveNode={handleSaveNode}` to `WorkflowV2StepConfigPanel`.
