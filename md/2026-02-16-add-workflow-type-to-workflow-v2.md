# Add Workflow Type to Workflow V2

**Date:** 2026-02-16

## Summary

Workflow V2 now requires selecting a type (Extract, Transform, or Imaging) when creating a new workflow. The type is displayed as a colored badge on each workflow in the list, and workflows can be filtered by type.

When assigning a V2 workflow in Extraction Types Setup, only "Extract" workflows are shown. When assigning in Transformation Types Setup (including Page Group configs), only "Transform" workflows are shown.

## Changes

### Database

- Added `workflow_type` column to `workflows_v2` table (values: `extraction`, `transformation`, `imaging`; defaults to `extraction`)
- Added CHECK constraint and index on the new column

### TypeScript Types

- Added `WorkflowV2Type` type alias (`'extraction' | 'transformation' | 'imaging'`)
- Added `workflowType` field to `WorkflowV2` interface

### Service Layer (`workflowV2Service.ts`)

- `createWorkflowV2` now accepts a `workflowType` parameter
- `fetchWorkflowsV2` now maps and returns `workflowType`

### Workflow V2 Settings (`WorkflowV2Settings.tsx`)

- Added type dropdown (Extract / Transform / Imaging) next to the name input when creating a workflow
- Each workflow row now shows a colored type badge (blue for Extract, amber for Transform, green for Imaging)
- Added filter tabs (All / Extract / Transform / Imaging) above the workflow list

### Extraction Types Settings (`ExtractionTypesSettings.tsx`)

- V2 workflow dropdown now only shows workflows with type `extraction`

### Transformation Types Settings (`TransformationTypesSettings.tsx`)

- V2 workflow dropdown now only shows workflows with type `transformation`

### Page Group Config Editor (`PageGroupConfigEditor.tsx`)

- V2 workflow dropdown now only shows workflows with type `transformation`
