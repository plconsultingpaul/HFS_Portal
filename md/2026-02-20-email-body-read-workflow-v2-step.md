# 2026-02-20 - Email Body Read via Workflow V2 (Read Email Step)

## Overview

Enable the Email Monitor to read data from an email's **body/subject** (not just PDF attachments) by:
1. Adding a "Workflow V2" processing mode to Email Processing Rules
2. Creating a new "Read Email" step type in Workflow V2
3. Passing extracted field values to subsequent workflow steps via `{{fieldName}}` syntax

---

## Step 1 - Database Migration

**Goal:** Add the `read_email` step type to Workflow V2 nodes and `workflow_v2` processing mode to email processing rules.

**Files to modify:** None (new migration file only)

**Changes:**
- Apply a Supabase migration that:
  1. Adds `workflow_v2_id` column (uuid, nullable, FK to `workflows_v2.id`) to `email_processing_rules`
  2. Updates the `processing_mode` CHECK constraint on `email_processing_rules` to allow `'workflow_v2'` (currently only `'extraction'` and `'transformation'`)
  3. Updates the `step_type` CHECK constraint on `workflow_v2_nodes` to include `'read_email'` (currently: `api_call`, `api_endpoint`, `conditional_check`, `data_transform`, `sftp_upload`, `email_action`, `rename_file`, `multipart_form_upload`, `ai_decision`, `imaging`)

**Verification:** Query the DB to confirm the CHECK constraints accept the new values.

---

## Step 2 - TypeScript Types

**Goal:** Update frontend types to reflect the new DB values.

**Files to modify:**
- `src/types/index.ts`

**Changes:**
1. In `EmailProcessingRule` interface (line ~525):
   - Change `processingMode: 'extraction' | 'transformation'` to `processingMode: 'extraction' | 'transformation' | 'workflow_v2'`
   - Add `workflowV2Id?: string` field
2. In `WorkflowV2StepType` type (line ~544):
   - Add `'read_email'` to the union

---

## Step 3 - Email Service (emailService.ts)

**Goal:** Wire `workflow_v2_id` through the email rules fetch/save flow.

**Files to modify:**
- `src/services/emailService.ts`

**Changes:**
1. In `fetchEmailRules` function: add `workflowV2Id: rule.workflow_v2_id` to the mapping from DB rows to the `EmailProcessingRule` interface
2. In `updateEmailRules` function: add `workflow_v2_id: rule.workflowV2Id || null` to the upsert payload

---

## Step 4 - Email Rules Settings UI

**Goal:** Add "Workflow V2" as a third processing mode option in the Email Processing Rules settings, with a dropdown to select which Workflow V2 to invoke.

**Files to modify:**
- `src/components/settings/EmailRulesSettings.tsx`

**Changes:**
1. Import `fetchWorkflowsV2` from workflowV2Service and `WorkflowV2` type
2. Add `workflowsV2` state, fetched on mount via `useEffect`
3. Change the two-button toggle (Extract / Transform) to a three-button toggle (Extract / Transform / Workflow V2)
4. When `workflow_v2` mode is selected, show a dropdown of available Workflow V2s instead of the extraction/transformation type dropdown
5. Bind the selected workflow V2 to `rule.workflowV2Id`
6. Update the info box text to explain the Workflow V2 mode

---

## Step 5 - Workflow V2 Flow Designer & Nodes (Read Email step UI)

**Goal:** Register the `read_email` step type in the Workflow V2 designer so users can add it to their flows.

**Files to modify:**
- `src/components/settings/workflow-v2/WorkflowV2FlowDesigner.tsx`
- `src/components/settings/workflow-v2/WorkflowV2FlowNodes.tsx`
- `src/components/settings/workflow-v2/WorkflowV2StepConfigPanel.tsx`

**Changes in WorkflowV2FlowDesigner.tsx:**
1. Import `BookOpen` from lucide-react
2. Add `read_email` entry to `STEP_TYPE_OPTIONS` array with sky-blue color theme

**Changes in WorkflowV2FlowNodes.tsx:**
1. Import `BookOpen` from lucide-react
2. Add `read_email` case to `getStepIcon()` -> returns `<BookOpen />`
3. Add `read_email` case to `getStepLabel()` -> returns `'Read Email'`
4. Add `read_email` case to `getStepColor()` -> returns sky color classes

**Changes in WorkflowV2StepConfigPanel.tsx:**
1. Import the new `V2ReadEmailConfig` component (built in Step 6)
2. Add `{ value: 'read_email', label: 'Read Email' }` to `STEP_TYPES` array
3. Add `case 'read_email':` in the `renderStepConfig` switch that renders `<V2ReadEmailConfig />`

---

## Step 6 - V2ReadEmailConfig Component

**Goal:** Create the configuration UI for the Read Email step, with a field mappings table.

**Files to create:**
- `src/components/settings/workflow-v2/V2ReadEmailConfig.tsx`

**Specification:**
- Props: `config`, `updateConfig`, `setConfig` (same pattern as `V2AiDecisionConfig` and `V2ImagingConfig`)
- Config data stored as `config.emailFieldMappings` (array of objects)
- Each field mapping row has:
  - **Field Name** (text input) - the variable name, accessible as `{{fieldName}}` in later steps
  - **Type** dropdown: `hardcoded`, `ai`, `function`
  - **Value / Instruction** (text input):
    - For `hardcoded`: the literal value
    - For `ai`: instruction for Gemini (e.g., "Extract the PO number")
    - For `function`: a template expression (e.g., `{{emailFrom}}`)
  - **Location** dropdown: `subject`, `body` (only visible/relevant when Type is `ai`)
  - **Data Type** dropdown: `string`, `number`, `integer`, `datetime`, `date_only`, `boolean`, `rin`
- Add/Remove row buttons
- Follow the table layout pattern used in V2AiDecisionConfig

---

## Step 7 - Read Email Step Handler (json-workflow-processor-v2)

**Goal:** Implement the backend logic that processes the Read Email step during workflow execution.

**Files to create:**
- `supabase/functions/json-workflow-processor-v2/steps/readEmail.ts`

**Specification:**
- Export `executeReadEmail(step, contextData, supabaseUrl, supabaseServiceKey, executionLogId?, workflowId?)`
- Read `config.emailFieldMappings` from `step.config_json`
- For each field mapping:
  - **hardcoded**: Set `contextData[fieldName]` to the literal value, cast by dataType
  - **function**: Resolve `{{variable}}` templates against contextData, set result
  - **ai**: Collect all AI mappings, batch into a single Gemini API call with a structured prompt. The prompt should include the email content from the appropriate location (`contextData.emailSubject` or `contextData.emailBody`). Parse the JSON response and set each field.
- Cast values based on `dataType` (number, integer, boolean, date_only, rin, etc.)
- Write results into both `contextData[fieldName]` and `contextData.extractedData[fieldName]`
- Log sub-steps via `createV2StepLog`
- Use the Gemini proxy pattern from `aiDecision.ts` (fetch gemini config from DB, use `GoogleGenerativeAI` npm import)

---

## Step 8 - Read Email Step Handler (transform-workflow-processor-v2)

**Goal:** Duplicate the step handler for the transform processor (edge functions cannot share code across directories).

**Files to create:**
- `supabase/functions/transform-workflow-processor-v2/steps/readEmail.ts`

**Specification:**
- Same logic as Step 7, but adapted for the transform processor's patterns
- The transform processor does not have `functionEvaluator.ts`, so for `function` type mappings, use simple `{{variable}}` template resolution (regex replace against contextData) instead of `evaluateFunction`

---

## Step 9 - Wire Read Email into Processor Index Files + Context Data Merge

**Goal:** Register the `read_email` step type in the main dispatch loops, and ensure incoming `contextData` from the email-monitor is merged.

**Files to modify:**
- `supabase/functions/json-workflow-processor-v2/index.ts`
- `supabase/functions/transform-workflow-processor-v2/index.ts`

**Changes in json-workflow-processor-v2/index.ts:**
1. Add `import { executeReadEmail } from "./steps/readEmail.ts"` at the top
2. After `contextData` is initialized (~line 311), add a merge block:
   ```typescript
   if (requestData.contextData && typeof requestData.contextData === 'object') {
     contextData = { ...contextData, ...requestData.contextData };
   }
   ```
   This ensures `emailSubject`, `emailBody`, `emailFrom`, `emailDate` from the email-monitor are available.
3. Add `else if (node.step_type === 'read_email')` dispatch block in the node execution loop

**Changes in transform-workflow-processor-v2/index.ts:**
1. Same import
2. Same contextData merge (after ~line 222)
3. Same dispatch block

---

## Step 10 - Email Monitor: Workflow V2 Processing Mode

**Goal:** Update the email-monitor edge function to support the `workflow_v2` processing mode. When matched, it fetches the email body and calls the Workflow V2 processor instead of going through the PDF extraction flow.

**Files to modify:**
- `supabase/functions/email-monitor/index.ts`
- `supabase/functions/email-monitor/lib/services/email-base.ts`
- `supabase/functions/email-monitor/lib/services/office365.ts`
- `supabase/functions/email-monitor/lib/services/gmail.ts`

**Changes in email-base.ts:**
1. Add `getEmailBody(emailId: string): Promise<string>` to the `EmailProvider` interface

**Changes in office365.ts:**
1. Implement `getEmailBody`: GET `messages/${emailId}?$select=body` via Graph API, strip HTML tags from `body.content`, return plain text

**Changes in gmail.ts:**
1. Implement `getEmailBody`: GET `messages/${emailId}?format=full`, extract `text/plain` from MIME parts (fall back to `text/html` with tag stripping)

**Changes in email-monitor/index.ts:**
1. Add `processing_mode` and `workflow_v2_id` to the `ProcessingRule` interface
2. Add those fields to the Supabase rules query `.select(...)` string
3. Restructure `processEmail` flow:
   - Move rule matching (`findMatchingRule`) BEFORE the PDF attachment check
   - If the matched rule's `processing_mode === 'workflow_v2'`:
     - Fetch the email body via `provider.getEmailBody(emailId)`
     - POST to `json-workflow-processor-v2` with payload:
       ```json
       {
         "workflowId": "<rule.workflow_v2_id>",
         "userId": null,
         "pdfFilename": null,
         "extractedData": {},
         "triggerSource": "email_monitoring",
         "senderEmail": "<fromEmail>",
         "contextData": {
           "emailSubject": "<subject>",
           "emailBody": "<body text>",
           "emailFrom": "<fromEmail>",
           "emailDate": "<receivedDate>",
           "extractedData": {}
         }
       }
       ```
     - Handle success/failure response
     - Apply post-processing action (mark read, move to folder, etc.)
     - Return result (skip PDF attachment logic entirely)
   - For non-workflow_v2 rules: continue with existing PDF attachment detection and processing

---

## Step 11 - Deploy Edge Functions

**Goal:** Deploy all modified edge functions to Supabase.

**Edge functions to deploy (using `mcp__supabase__deploy_edge_function`):**
1. `email-monitor`
2. `json-workflow-processor-v2`
3. `transform-workflow-processor-v2`

---

## Step 12 - Build Verification

**Goal:** Run `npm run build` to verify no TypeScript compilation errors exist.

---

## Data Flow Summary

```
Email arrives
  → Email Monitor fetches email details (subject, from, date)
  → Email Monitor matches a rule
  → Rule has processing_mode = 'workflow_v2'
  → Email Monitor fetches email body via provider.getEmailBody()
  → Email Monitor calls json-workflow-processor-v2 with contextData containing:
      emailSubject, emailBody, emailFrom, emailDate
  → Processor merges contextData into its internal context
  → Processor reaches a "Read Email" step node
  → readEmail handler processes field mappings:
      - hardcoded → literal value
      - function → template resolution against contextData
      - ai → Gemini call with email subject/body content
  → Results stored in contextData as {{fieldName}} variables
  → Subsequent workflow steps can use {{fieldName}} syntax
```
