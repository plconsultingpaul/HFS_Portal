# Workflow v2 Implementation Plan

## Overview

Create a brand new visual workflow engine using React Flow (similar to the Execute Button Flow Designer). This replaces the existing linear step-order workflow with a graph-based, drag-and-drop flow canvas. The original workflow system remains 100% untouched.

---

## Architecture Summary

| Concern | V1 (untouched) | V2 (new) |
|---------|----------------|----------|
| DB tables | `extraction_workflows`, `workflow_steps` | `workflows_v2`, `workflow_v2_nodes`, `workflow_v2_edges` |
| Log tables | `workflow_execution_logs`, `workflow_step_logs` | `workflow_v2_execution_logs`, `workflow_v2_step_logs` |
| UI components | `src/components/settings/workflow/*` | `src/components/settings/workflow-v2/*` |
| Service | `src/services/workflowService.ts` | `src/services/workflowV2Service.ts` |
| Edge functions | `json-workflow-processor`, `transform-workflow-processor` | `json-workflow-processor-v2`, `transform-workflow-processor-v2` |
| Design paradigm | Linear step_order list | React Flow graph (nodes + edges) |
| Invocation lib | `src/lib/workflow.ts` | `src/lib/workflowV2.ts` |

---

## Supported Step Types (same as V1)

| Step Type | Branching | Description |
|-----------|-----------|-------------|
| `api_call` | No | Direct HTTP API call with URL, method, body, headers |
| `api_endpoint` | No | API call using configured API settings (main/secondary/auth_config) |
| `conditional_check` | Yes (success/failure) | Evaluate condition, branch on result |
| `data_transform` | No | Transform data using rules |
| `sftp_upload` | No | Upload files to SFTP server |
| `email_action` | No | Send email with optional attachments |
| `rename_file` | No | Rename output files based on template |
| `multipart_form_upload` | No | Upload files as multipart form data |

---

## Work Steps

### Work Step 1: Database Migration -- Core Tables

**What to build:**
- Create migration with three new tables

**Table: `workflows_v2`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key, `gen_random_uuid()` |
| `name` | text | NOT NULL |
| `description` | text | Nullable |
| `is_active` | boolean | Default `true` |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Default `now()` |

**Table: `workflow_v2_nodes`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key, `gen_random_uuid()` |
| `workflow_id` | uuid | FK to `workflows_v2`, ON DELETE CASCADE |
| `node_type` | text | CHECK `('start', 'workflow')` |
| `position_x` | float | Default `0` |
| `position_y` | float | Default `0` |
| `width` | float | Nullable |
| `height` | float | Nullable |
| `label` | text | Display label |
| `step_type` | text | Nullable, CHECK in (`api_call`, `api_endpoint`, `conditional_check`, `data_transform`, `sftp_upload`, `email_action`, `rename_file`, `multipart_form_upload`) |
| `config_json` | jsonb | Default `'{}'` |
| `escape_single_quotes_in_body` | boolean | Default `false` |
| `user_response_template` | text | Nullable |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Default `now()` |

**Table: `workflow_v2_edges`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key, `gen_random_uuid()` |
| `workflow_id` | uuid | FK to `workflows_v2`, ON DELETE CASCADE |
| `source_node_id` | uuid | FK to `workflow_v2_nodes`, ON DELETE CASCADE |
| `target_node_id` | uuid | FK to `workflow_v2_nodes`, ON DELETE CASCADE |
| `source_handle` | text | Default `'default'` (also `'success'`, `'failure'`) |
| `target_handle` | text | Default `'default'` |
| `label` | text | Nullable |
| `edge_type` | text | Default `'default'` |
| `animated` | boolean | Default `false` |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Default `now()` |

**RLS:** Enable on all three tables. Authenticated users can SELECT. Admin users can INSERT/UPDATE/DELETE.

**Indexes:**
- `workflow_v2_nodes`: index on `workflow_id`, index on `node_type`
- `workflow_v2_edges`: index on `workflow_id`, index on `source_node_id`, index on `target_node_id`

---

### Work Step 2: Database Migration -- Execution Logging Tables

**What to build:**
- Create migration with two new logging tables

**Table: `workflow_v2_execution_logs`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `workflow_id` | uuid | FK to `workflows_v2` |
| `extraction_log_id` | uuid | FK to `extraction_logs`, nullable |
| `status` | text | CHECK `('pending', 'running', 'completed', 'failed')` |
| `current_node_id` | uuid | FK to `workflow_v2_nodes`, nullable |
| `current_node_label` | text | Nullable |
| `error_message` | text | Nullable |
| `context_data` | jsonb | Default `'{}'` |
| `started_at` | timestamptz | Default `now()` |
| `completed_at` | timestamptz | Nullable |
| `updated_at` | timestamptz | Default `now()` |
| `user_id` | text | Nullable |
| `processing_mode` | text | `'extraction'` or `'transformation'` |
| `extraction_type_id` | uuid | Nullable |
| `transformation_type_id` | uuid | Nullable |
| `failure_notification_sent` | boolean | Default `false` |
| `success_notification_sent` | boolean | Default `false` |

**Table: `workflow_v2_step_logs`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `execution_log_id` | uuid | FK to `workflow_v2_execution_logs`, ON DELETE CASCADE |
| `workflow_id` | uuid | FK to `workflows_v2` |
| `node_id` | uuid | FK to `workflow_v2_nodes` |
| `node_label` | text | Nullable |
| `step_type` | text | Nullable |
| `status` | text | CHECK `('running', 'completed', 'failed', 'skipped')` |
| `started_at` | timestamptz | Default `now()` |
| `completed_at` | timestamptz | Nullable |
| `duration_ms` | integer | Nullable |
| `error_message` | text | Nullable |
| `input_data` | jsonb | Default `'{}'` |
| `output_data` | jsonb | Default `'{}'` |
| `config_json` | jsonb | Default `'{}'` |
| `processed_config` | jsonb | Default `'{}'` |
| `created_at` | timestamptz | Default `now()` |

**RLS:** Enable on both tables. Authenticated users can SELECT. Admin users can INSERT/UPDATE/DELETE.

**Indexes:**
- `workflow_v2_execution_logs`: index on `status`, index on `workflow_id`, index on `extraction_log_id`
- `workflow_v2_step_logs`: index on `execution_log_id`, index on `workflow_id`, index on `status`, index on `created_at` DESC

---

### Work Step 3: Database Migration -- V1/V2 Selector Columns

**What to build:**
- Add columns to existing tables so users can choose between V1 and V2 workflows

**Changes to `extraction_types`:**
- Add `workflow_version` (text, default `'v1'`, CHECK `('v1', 'v2')`)
- Add `workflow_v2_id` (uuid, nullable, FK to `workflows_v2`)

**Changes to `transformation_types`:**
- Add `workflow_version` (text, default `'v1'`, CHECK `('v1', 'v2')`)
- Add `workflow_v2_id` (uuid, nullable, FK to `workflows_v2`)

**Changes to `page_group_configs`:**
- Add `workflow_version` (text, default `'v1'`, CHECK `('v1', 'v2')`)
- Add `workflow_v2_id` (uuid, nullable, FK to `workflows_v2`)

**Changes to `execute_button_flow_nodes`:**
- Add `workflow_version` (text, default `'v1'`, CHECK `('v1', 'v2')`)
- Add `workflow_v2_id` (uuid, nullable, FK to `workflows_v2`)

Use `IF NOT EXISTS` pattern for safety. Add indexes on the new FK columns.

---

### Work Step 4: Frontend -- Types and Service

**What to build:**
- Add new TypeScript types to `src/types/index.ts`
- Create new service file `src/services/workflowV2Service.ts`

**New types to add to `src/types/index.ts`:**
```typescript
interface WorkflowV2 {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface WorkflowV2Node {
  id: string;
  workflowId: string;
  nodeType: 'start' | 'workflow';
  positionX: number;
  positionY: number;
  width?: number;
  height?: number;
  label: string;
  stepType?: string;
  configJson: any;
  escapeSingleQuotesInBody?: boolean;
  userResponseTemplate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface WorkflowV2Edge {
  id: string;
  workflowId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: string;
  targetHandle: string;
  label?: string;
  edgeType: string;
  animated: boolean;
  createdAt?: string;
  updatedAt?: string;
}
```

**New service `src/services/workflowV2Service.ts`:**
- `fetchWorkflowsV2()` -- list all v2 workflows
- `createWorkflowV2(name, description)` -- create new workflow
- `updateWorkflowV2(id, data)` -- update workflow name/description/active
- `deleteWorkflowV2(id)` -- delete workflow (cascade deletes nodes/edges)
- `fetchWorkflowV2Nodes(workflowId)` -- get all nodes for a workflow
- `fetchWorkflowV2Edges(workflowId)` -- get all edges for a workflow
- `saveWorkflowV2Nodes(workflowId, nodes)` -- batch upsert nodes
- `saveWorkflowV2Edges(workflowId, edges)` -- batch upsert edges
- `deleteWorkflowV2Node(nodeId)` -- delete single node
- `deleteWorkflowV2Edge(edgeId)` -- delete single edge

---

### Work Step 5: Frontend -- Flow Node Components

**What to build:**
- Create `src/components/settings/workflow-v2/WorkflowV2FlowNodes.tsx`

**Node types to render:**

1. **StartNode** -- Green circle/pill with "Start" label. Single bottom output handle. This is the entry point of every workflow.

2. **WorkflowStepNode** -- Renders based on `step_type`:
   - `api_call` -- Green, Globe icon
   - `api_endpoint` -- Green, Globe icon
   - `conditional_check` -- Orange, GitBranch icon, dual handles (success at 30%, failure at 70%)
   - `data_transform` -- Blue, RefreshCw icon
   - `sftp_upload` -- Teal, Upload icon
   - `email_action` -- Rose, Mail icon
   - `rename_file` -- Slate, FileEdit icon
   - `multipart_form_upload` -- Amber, Upload icon

**Handle patterns:**
- Non-branching steps: single target handle (top), single source handle (bottom)
- Branching steps (conditional_check): single target (top), two source handles at bottom (green "Yes" at 30%, red "No" at 70%)
- Start node: no target handle, single source handle (bottom)

**Visual design:** Match the existing Execute Flow node styling from `FlowNodes.tsx` -- colored headers, icons, dark mode support, selected state borders.

---

### Work Step 6: Frontend -- Flow Designer Component

**What to build:**
- Create `src/components/settings/workflow-v2/WorkflowV2FlowDesigner.tsx`

**Features:**
- React Flow canvas with `useNodesState`, `useEdgesState`, `Controls`, `MiniMap`, `Background`
- Toolbar/panel to add new step nodes (one button per step type)
- Click node to select it and open config panel
- Connect nodes by dragging from source handle to target handle
- Delete nodes/edges with delete key or button
- Save button persists all nodes and edges to DB via `workflowV2Service`
- Auto-create a "Start" node when a new workflow is created

**Props:**
- `workflowId: string` -- the selected workflow
- `workflowName: string` -- displayed in header
- `onBack: () => void` -- return to workflow list

**Data loading:**
- On mount, fetch nodes and edges from DB
- Convert DB records to React Flow `Node[]` and `Edge[]` format
- On save, convert React Flow state back to DB format and persist

**Node-to-DB mapping:**
- React Flow `Node.id` = DB `workflow_v2_nodes.id`
- React Flow `Node.position` = DB `position_x`, `position_y`
- React Flow `Node.data` = DB `label`, `step_type`, `config_json`, etc.
- React Flow `Edge` fields map directly to `workflow_v2_edges` columns

---

### Work Step 7: Frontend -- Step Config Panel

**What to build:**
- Create `src/components/settings/workflow-v2/WorkflowV2StepConfigPanel.tsx`

**Features:**
- Side panel (or modal) that opens when a workflow step node is selected
- Shows config fields appropriate to the selected step_type
- Fields match the original `StepConfigForm` functionality but as new code
- Save updates the node's `config_json` in the React Flow state

**Config fields per step type:**

**api_call:**
- Method (GET/POST/PUT/PATCH)
- URL (text input with variable insertion)
- Request Body (textarea with variable insertion)
- Headers (JSON editor)
- Response Data Mappings (array of responsePath + updatePath)
- Escape Single Quotes toggle

**api_endpoint:**
- API Source Type (main/secondary/auth_config dropdown)
- Secondary API / Auth Config selector
- HTTP Method
- API Path (with path variable config)
- Query Parameters
- Request Body Template or Field Mappings
- Array Processing Mode
- Response Data Mappings
- Stop On Error toggle

**conditional_check:**
- Field Path (with variable dropdown)
- Operator (equals, not_equals, contains, not_contains, greater_than, less_than, exists, not_exists, is_null, is_not_null)
- Expected Value
- Additional Conditions (array)
- Logical Operator (AND/OR)

**data_transform:**
- Transformations array (field_name + transformation rule)

**sftp_upload:**
- Upload Type (csv/json/xml/pdf)
- Filename config
- SFTP Path Override
- Page selection strategy

**email_action:**
- To, Subject, Body (all with variable insertion)
- Include Attachment toggle
- Attachment Source
- PDF page strategy
- CC User toggle
- Notification template option

**rename_file:**
- Filename Template (with variable insertion)
- Format toggles (PDF/CSV/JSON/XML)
- Fallback Filename
- Append Timestamp toggle

**multipart_form_upload:**
- URL (with variable insertion)
- API Source Type
- Form Parts (array: name, type text/file, value, contentType, fieldMappings)
- Filename Template
- Response Data Mappings

---

### Work Step 8: Frontend -- Main Settings Container and Type Setup Tab

**What to build:**
- Create `src/components/settings/workflow-v2/WorkflowV2Settings.tsx`
- Modify `src/components/TypeSetupPage.tsx` to add the new tab

**WorkflowV2Settings.tsx layout:**
- **Left panel (300px):**
  - Header: "Workflow v2" with "New Workflow" button
  - Scrollable list of workflows (name, active status)
  - Click to select, inline rename, delete button
  - Active/inactive toggle per workflow

- **Right panel (remaining space):**
  - When no workflow selected: empty state with instructions
  - When workflow selected: `WorkflowV2FlowDesigner` component
  - When a node is selected in the designer: `WorkflowV2StepConfigPanel` overlays or appears alongside

**TypeSetupPage.tsx changes:**
- Add new tab: "Workflow v2" with icon (e.g., `GitMerge` from lucide-react)
- Gated by `workflowManagement` permission (same as original Workflows)
- Renders `WorkflowV2Settings` component

---

### Work Step 9: Frontend -- V1/V2 Selector in Extraction and Transformation Types

**What to build:**
- Modify `src/components/settings/ExtractionTypesSettings.tsx`
- Modify `src/components/settings/TransformationTypesSettings.tsx`
- Modify `src/components/settings/PageGroupConfigEditor.tsx`

**Changes to ExtractionTypesSettings.tsx:**
- Below the existing workflow dropdown, add a "Workflow Version" selector (V1 / V2 radio or toggle)
- Default to V1 (preserving existing behavior)
- When V1 selected: show existing workflow dropdown (extraction_workflows)
- When V2 selected: show new dropdown listing `workflows_v2` (fetched via `workflowV2Service`)
- Save the `workflow_version` and `workflow_v2_id` fields

**Changes to TransformationTypesSettings.tsx:**
- Same pattern as extraction types
- V1/V2 selector alongside workflow dropdown
- Save `workflow_version` and `workflow_v2_id`

**Changes to PageGroupConfigEditor.tsx:**
- Each page group can independently select V1 or V2
- Same toggle/dropdown pattern

**Data model updates in types:**
- Add `workflowVersion?: 'v1' | 'v2'` and `workflowV2Id?: string` to:
  - `ExtractionType` interface
  - `TransformationType` interface
  - `PageGroupConfig` interface

---

### Work Step 10: Frontend -- V1/V2 Selector in Execute Setup (Flow Designer)

**What to build:**
- Modify execute flow node config to support V2 workflow selection
- The execute button flow nodes of type `workflow` that have step configs already support workflows via a workflow step -- this step adds awareness of V2

**Changes:**
- In `ExecuteSetupSettings.tsx` or the flow node config, when a workflow step references a workflow, add a version selector
- The `execute_button_flow_nodes` table already gets `workflow_version` and `workflow_v2_id` columns from Work Step 3
- When version is V2, the dropdown shows `workflows_v2` list
- When version is V1, the dropdown shows original `extraction_workflows` list

---

### Work Step 11: Frontend -- Workflow Invocation Routing

**What to build:**
- Create `src/lib/workflowV2.ts` with a new `executeWorkflowV2()` function
- Modify `src/lib/workflow.ts` to add routing logic
- Modify transform callers in `PageTransformerCard.tsx` and `MultiPageTransformer.tsx`

**New `src/lib/workflowV2.ts`:**
- `executeWorkflowV2(request)` -- calls `json-workflow-processor-v2` edge function
- Same request shape as V1 but targets the V2 endpoint
- Returns same response shape (workflowExecutionLogId, etc.)

**Routing logic in `src/lib/workflow.ts`:**
- Add a `workflowVersion` field to `WorkflowExecutionRequest`
- If `workflowVersion === 'v2'`, call `executeWorkflowV2()` instead
- If `workflowVersion === 'v1'` or undefined, call existing logic (unchanged)

**Routing logic in transform callers:**
- Check `transformationType.workflowVersion` (or `pageGroupConfig.workflowVersion`)
- If V2, call `transform-workflow-processor-v2` endpoint
- If V1, call existing `transform-workflow-processor` (unchanged)

---

### Work Step 12: Edge Function -- json-workflow-processor-v2

**What to build:**
- New edge function at `supabase/functions/json-workflow-processor-v2/index.ts`

**Architecture:**
- Graph-based execution engine (not linear step_order)
- Reads `workflow_v2_nodes` and `workflow_v2_edges` from DB
- Finds the "start" node, follows outgoing edges
- Executes each node based on `step_type`
- For `conditional_check`: evaluates condition, follows `success` or `failure` edge
- For non-branching steps: follows the single outgoing edge
- Stops when no outgoing edges remain (terminal state)

**Request body (same shape as V1):**
```json
{
  "extractedData": "...",
  "workflowId": "uuid-of-v2-workflow",
  "userId": "...",
  "extractionTypeId": "...",
  "pdfFilename": "...",
  "pdfPages": 1,
  "pdfBase64": "...",
  "originalPdfFilename": "...",
  "formatType": "JSON",
  "sessionId": "...",
  "groupOrder": 0
}
```

**Execution loop pseudocode:**
```
1. Create workflow_v2_execution_logs record (status: running)
2. Load all nodes + edges for workflowId
3. Find the start node
4. currentNodeId = follow the start node's outgoing edge to first step
5. While currentNodeId exists:
   a. Get the node record
   b. Create workflow_v2_step_logs record (status: running)
   c. Execute step based on node.step_type
   d. Update step log (status: completed or failed)
   e. If step failed and no failure edge, stop workflow
   f. Determine next edge:
      - conditional_check: follow success or failure handle
      - non-branching: follow default outgoing edge
   g. currentNodeId = target of next edge (or null if none)
6. Update execution log (status: completed or failed)
7. Send notifications if configured
```

**Step implementations:**
- Copy the logic patterns from `json-workflow-processor/steps/*` but as fresh code
- `steps/api.ts` -- executeApiCall, executeApiEndpoint
- `steps/logic.ts` -- executeConditionalCheck, executeDataTransform, executeRename
- `steps/email.ts` -- executeEmailAction
- `steps/upload.ts` -- executeSftpUpload
- `steps/multipart.ts` -- executeMultipartFormUpload
- `steps/notifications.ts` -- notification helpers
- `utils.ts` -- replaceVariables, getValueByPath, setValueByPath

**Context data structure (same as V1):**
```json
{
  "extractedData": {},
  "response": {},
  "sessionId": "...",
  "pdfFilename": "...",
  "userId": "...",
  "originalPdfFilename": "...",
  "condition_<nodeId>_result": true/false
}
```

---

### Work Step 13: Edge Function -- transform-workflow-processor-v2

**What to build:**
- New edge function at `supabase/functions/transform-workflow-processor-v2/index.ts`

**Same graph-based engine as Step 12 but for transformation context:**
- Reads from `workflow_v2_nodes` and `workflow_v2_edges`
- Uses transformation-specific context (field mappings, page groups, filename templates)
- Handles `extractedDataStoragePath` for large payloads (fetches from Supabase storage)
- Writes to same `workflow_v2_execution_logs` and `workflow_v2_step_logs`

**Request body:**
```json
{
  "extractedData": null,
  "extractedDataStoragePath": "path/in/storage",
  "workflowId": "uuid-of-v2-workflow",
  "userId": "...",
  "transformationTypeId": "...",
  "pdfFilename": "...",
  "extractionTypeFilename": "...",
  "pageGroupFilenameTemplate": "...",
  "pdfPages": 1,
  "pdfStoragePath": "path/in/storage",
  "originalPdfFilename": "...",
  "pdfBase64": "...",
  "formatType": "JSON"
}
```

**Step implementations:**
- Share the same patterns as Step 12 but include transform-specific steps:
  - `steps/apiEndpoint.ts` -- dedicated api_endpoint handling with transform context
  - `steps/rename.ts` -- file renaming with transformation filename templates
  - All other steps same as json processor

---

### Work Step 14: Deploy Edge Functions and Build Verification

**What to build:**
- Deploy `json-workflow-processor-v2` edge function
- Deploy `transform-workflow-processor-v2` edge function
- Run `npm run build` to verify no TypeScript errors
- Test the full flow end-to-end

**Deployment checklist:**
- [ ] `json-workflow-processor-v2` deploys successfully
- [ ] `transform-workflow-processor-v2` deploys successfully
- [ ] Frontend builds with no errors
- [ ] New "Workflow v2" tab appears in Type Setup
- [ ] Can create a new V2 workflow
- [ ] Can add nodes and connect them on the canvas
- [ ] Can configure each step type
- [ ] V1/V2 selector appears in Extraction Types
- [ ] V1/V2 selector appears in Transformation Types
- [ ] Selecting V2 and a workflow correctly routes to the V2 edge function

---

## Files Created (new)

```
src/components/settings/workflow-v2/
  WorkflowV2Settings.tsx
  WorkflowV2FlowDesigner.tsx
  WorkflowV2FlowNodes.tsx
  WorkflowV2StepConfigPanel.tsx

src/services/workflowV2Service.ts
src/lib/workflowV2.ts

supabase/functions/json-workflow-processor-v2/
  index.ts
  utils.ts
  steps/api.ts
  steps/logic.ts
  steps/email.ts
  steps/upload.ts
  steps/multipart.ts
  steps/notifications.ts

supabase/functions/transform-workflow-processor-v2/
  index.ts
  utils.ts
  steps/api.ts
  steps/apiEndpoint.ts
  steps/logic.ts
  steps/email.ts
  steps/upload.ts
  steps/multipart.ts
  steps/rename.ts
```

## Files Modified (minimal changes)

```
src/types/index.ts                              -- Add V2 type interfaces
src/components/TypeSetupPage.tsx                 -- Add Workflow v2 tab
src/components/settings/ExtractionTypesSettings.tsx  -- Add V1/V2 selector
src/components/settings/TransformationTypesSettings.tsx -- Add V1/V2 selector
src/components/settings/PageGroupConfigEditor.tsx     -- Add V1/V2 selector
src/components/settings/ExecuteSetupSettings.tsx      -- Add V1/V2 selector
src/lib/workflow.ts                             -- Add routing to V2
src/components/transform/PageTransformerCard.tsx -- Add V2 routing
src/components/transform/MultiPageTransformer.tsx -- Add V2 routing
```

## Work Step Summary

| Step | Description | Scope |
|------|-------------|-------|
| 1 | DB migration: core tables (workflows_v2, nodes, edges) | Database |
| 2 | DB migration: execution logging tables | Database |
| 3 | DB migration: V1/V2 selector columns on existing tables | Database |
| 4 | Frontend: TypeScript types + workflowV2Service | Service layer |
| 5 | Frontend: Flow node components (WorkflowV2FlowNodes) | UI component |
| 6 | Frontend: Flow designer canvas (WorkflowV2FlowDesigner) | UI component |
| 7 | Frontend: Step config panel (WorkflowV2StepConfigPanel) | UI component |
| 8 | Frontend: Main settings container + Type Setup tab | UI component |
| 9 | Frontend: V1/V2 selector in Extraction/Transformation types | UI modification |
| 10 | Frontend: V1/V2 selector in Execute Setup | UI modification |
| 11 | Frontend: Workflow invocation routing (workflowV2.ts) | Integration |
| 12 | Edge function: json-workflow-processor-v2 | Backend |
| 13 | Edge function: transform-workflow-processor-v2 | Backend |
| 14 | Deploy edge functions + build verification | Deployment |
