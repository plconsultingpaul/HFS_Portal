# Allow Workflow Type Edit in Workflow V2

**Date:** 2026-02-16

## Problem

When editing a Workflow V2 entry, users could only change the name. The workflow type (Extract, Transform, or Imaging) was locked after creation.

## Changes

### `src/services/workflowV2Service.ts`
- Added `workflowType` to the allowed fields in `updateWorkflowV2`, mapping it to the `workflow_type` database column.

### `src/components/settings/workflow-v2/WorkflowV2Settings.tsx`
- Added `editType` state to track the selected type during editing.
- Renamed `handleRename` to `handleSaveEdit` since it now handles both name and type updates.
- Added a type dropdown (Extract / Transform / Imaging) to the inline edit row, matching the style of the creation dropdown.
- The edit button now captures the current workflow type alongside the name when entering edit mode.
- Only changed fields are sent to the database on save.
