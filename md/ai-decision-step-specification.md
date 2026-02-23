# AI Decision Step - Complete Implementation Specification

This document is a comprehensive specification for implementing an "AI Decision" step type within a graph-based workflow engine. The AI Decision step is a composite step that: (1) resolves source fields from workflow context, (2) fetches candidate records from an external API, and (3) uses Google Gemini AI to select the single best-matching candidate. The matched record's specified field is stored back into the workflow context so downstream steps can reference it.

---

## Table of Contents

1. [Concept Overview](#1-concept-overview)
2. [Database Schema](#2-database-schema)
3. [Configuration Object (config_json)](#3-configuration-object-config_json)
4. [Backend Execution Logic](#4-backend-execution-logic)
5. [AI Prompt Construction](#5-ai-prompt-construction)
6. [Frontend Configuration UI](#6-frontend-configuration-ui)
7. [Flow Designer Integration](#7-flow-designer-integration)
8. [Execution Logging](#8-execution-logging)
9. [Real-World Example](#9-real-world-example)
10. [Edge Cases and Error Handling](#10-edge-cases-and-error-handling)

---

## 1. Concept Overview

The AI Decision step solves a common workflow problem: you have extracted data (e.g., a company name and address from a PDF) and need to find the matching record in an external system (e.g., a TMS, ERP, or CRM). The step automates this lookup-and-match process using three atomic sub-steps:

**Sub-step 1: Source Field Resolution**
- Takes user-configured source fields (label + template value pairs)
- Resolves `{{variableName}}` template placeholders against the workflow context data
- Produces a clean key-value record representing "what we're trying to match"

**Sub-step 2: API Candidate Fetch**
- Makes an HTTP request to a configured API endpoint (supports path variables, query parameters, OData filters)
- Extracts an array of candidate records from the response (supports configurable array path or auto-detection)
- If zero candidates are returned, the step can either fail or continue with a null result

**Sub-step 3: AI Matching**
- If only one candidate exists and `skipAiIfSingleResult` is enabled (default), skips AI and uses that candidate directly
- Otherwise, sends the source record and all candidates to Google Gemini with a structured prompt
- Gemini returns `{ matchIndex, confidence, reason }` identifying the single best match
- The matched record's specified field (e.g., `clientId`) is stored in the workflow context under a user-defined variable name
- Additional fields from the matched record can be mapped into the extracted data via response data mappings

The output variable is then available to all subsequent workflow steps via `{{variableName}}` template syntax.

---

## 2. Database Schema

The AI Decision step is stored as a node in the workflow graph. All configuration lives inside a JSONB `config_json` column -- there are no dedicated columns for this step type.

### Node Table Structure

The workflow node table needs these columns at minimum:

| Column | Type | Description |
|---|---|---|
| `id` | UUID, PK | Unique node identifier |
| `workflow_id` | UUID, FK | Reference to the parent workflow |
| `node_type` | TEXT | Either `'start'` or `'workflow'` |
| `step_type` | TEXT | `'ai_decision'` for this step type |
| `label` | TEXT | User-visible label (e.g., "Match Consignee") |
| `config_json` | JSONB | All step configuration (see Section 3) |
| `position_x` | FLOAT | X position in flow designer canvas |
| `position_y` | FLOAT | Y position in flow designer canvas |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

The `step_type` column should have a CHECK constraint that includes `'ai_decision'` as a valid value:

```sql
ALTER TABLE workflow_nodes
  ADD CONSTRAINT workflow_nodes_step_type_check
  CHECK (step_type IS NULL OR step_type IN (
    'api_call', 'api_endpoint', 'conditional_check', 'data_transform',
    'sftp_upload', 'email_action', 'rename_file', 'multipart_form_upload',
    'ai_decision'
  ));
```

### Step Log Table Structure

Each execution of the AI Decision step creates three granular sub-step log entries (not one parent log). The step log table needs:

| Column | Type | Description |
|---|---|---|
| `id` | UUID, PK | Unique log entry identifier |
| `execution_log_id` | UUID, FK | Reference to parent workflow execution |
| `workflow_id` | UUID, FK | Reference to the workflow |
| `node_id` | UUID | The node this log entry belongs to |
| `node_label` | TEXT | Human-readable label (includes sub-step suffix) |
| `step_type` | TEXT | Always `'ai_decision'` for these entries |
| `status` | TEXT | `'completed'`, `'failed'`, or `'skipped'` |
| `started_at` | TIMESTAMPTZ | Sub-step start time |
| `completed_at` | TIMESTAMPTZ | Sub-step end time |
| `duration_ms` | INTEGER | Execution duration in milliseconds |
| `error_message` | TEXT | Error message if status is `'failed'` |
| `input_data` | JSONB | Input context for this sub-step |
| `output_data` | JSONB | Output/result data from this sub-step |

---

## 3. Configuration Object (config_json)

The entire AI Decision configuration is stored as a single JSON object. Here is the complete schema:

```typescript
interface AiDecisionConfig {
  // --- Source Record Configuration ---
  sourceFields: Array<{
    label: string;   // Display label (e.g., "Consignee Name")
    value: string;   // Template value (e.g., "{{consignee.name}}")
  }>;

  // --- API Lookup Configuration ---
  apiSourceType: 'main' | 'secondary';  // Which API config to use (default: 'main')
  secondaryApiId?: string;              // UUID of secondary API config (when apiSourceType is 'secondary')
  apiPath: string;                      // API path appended to base URL (e.g., "/masterData/clients")
  httpMethod: string;                   // HTTP method (default: 'GET')
  queryParameterConfig: Record<string, {
    enabled: boolean;
    value: string;   // Supports {{variable}} templates
  }>;
  pathVariableConfig?: Record<string, {
    enabled: boolean;
    value: string;   // Supports {{variable}} templates
  }>;
  resultArrayPath: string;  // Dot-path to candidate array in response (e.g., "clients", "data.results")
                            // Leave empty if the response itself is an array or to auto-detect

  // --- AI Matching Configuration ---
  aiInstruction: string;       // Custom instructions for Gemini (e.g., "Match on name and address similarity")
  returnFieldPath: string;     // Dot-path within matched record to extract (e.g., "clientId")
  outputVariableName: string;  // Context variable name to store result (e.g., "matchedClientId")
  skipAiIfSingleResult: boolean;  // Skip AI when only 1 candidate (default: true)
  failOnNoMatch: boolean;         // Throw error if no match found (default: false)

  // --- Response Data Mappings (extract additional fields from matched record) ---
  responseDataMappings?: Array<{
    responsePath: string;  // Dot-path within matched candidate (e.g., "clientId")
    updatePath: string;    // Where to store in extracted data (e.g., "orders[0].consignee.clientId")
  }>;
}
```

### Example Configuration

```json
{
  "sourceFields": [
    { "label": "Consignee Name", "value": "{{consignee.name}}" },
    { "label": "Consignee Address", "value": "{{consignee.address1}}" },
    { "label": "Consignee City", "value": "{{consignee.city}}" },
    { "label": "Consignee State", "value": "{{consignee.province}}" },
    { "label": "Consignee Zip", "value": "{{consignee.postalCode}}" }
  ],
  "apiSourceType": "secondary",
  "secondaryApiId": "abc-123-uuid",
  "apiPath": "/masterData/clients",
  "httpMethod": "GET",
  "queryParameterConfig": {
    "$filter": {
      "enabled": true,
      "value": "postalCode eq '{{consignee.postalCode}}'"
    },
    "$select": {
      "enabled": true,
      "value": "name,address1,city,province,postalCode,clientId"
    }
  },
  "resultArrayPath": "clients",
  "aiInstruction": "Match the source record to the closest candidate based on company name and address similarity. Ignore minor spelling differences and abbreviations (e.g., St vs Street, Corp vs Corporation).",
  "returnFieldPath": "clientId",
  "outputVariableName": "matchedClientId",
  "skipAiIfSingleResult": true,
  "failOnNoMatch": false,
  "responseDataMappings": [
    {
      "responsePath": "clientId",
      "updatePath": "orders[0].consignee.clientId"
    }
  ]
}
```

---

## 4. Backend Execution Logic

Below is the complete execution algorithm. The function receives the node configuration, the mutable workflow context data, and infrastructure references.

### Function Signature

```typescript
async function executeAiDecision(
  step: WorkflowNode,
  contextData: Record<string, any>,
  supabaseUrl: string,
  supabaseServiceKey: string,
  executionLogId?: string | null,
  workflowId?: string
): Promise<{ stepOutput: any; responseData: any }>
```

### Sub-step 1: Source Field Resolution

```
1. Read config.sourceFields (array of { label, value } pairs)
2. For each field:
   a. Parse the value for {{variableName}} template placeholders
   b. For each placeholder, resolve the value from contextData using dot-path traversal
      - Support nested paths like "consignee.name" or "orders[0].city"
      - Strip "extractedData." prefix automatically if present
   c. Replace the placeholder with the resolved value
   d. Store the result in resolvedSourceFields[field.label] = resolvedValue
3. Log a sub-step entry: "Source Field Resolution" with status 'completed'
   - Input: { sourceFields }
   - Output: { resolvedSourceFields }
```

### Sub-step 2: API Candidate Fetch

```
1. Determine the API source:
   - If apiSourceType is 'main': fetch base URL and auth token from the primary API settings table
   - If apiSourceType is 'secondary': fetch base URL and auth token from secondary API configs table by secondaryApiId
2. Build the request URL:
   a. Start with the apiPath
   b. Replace path variables: {varName} or ${varName} syntax with resolved values from contextData
   c. Build query parameters from queryParameterConfig:
      - For each enabled parameter, resolve {{variable}} templates
      - For OData $filter parameters, escape single quotes (double them: ' -> '')
      - For OData parameters ($filter, $select, $orderby, $top, etc.), use space encoding but don't double-encode
      - For regular parameters, use standard URL encoding
   d. Construct full URL: baseUrl + resolvedPath + ? + queryString
3. Make the HTTP request:
   - Method: httpMethod (default: 'GET')
   - Headers: Content-Type: application/json, Authorization: Bearer {authToken}
4. Extract candidates from the response:
   a. If resultArrayPath is set and non-empty: extract the array at that dot-path
   b. Else if the response itself is an array: use it directly
   c. Else: auto-detect the first array property in the response object
   d. If none of the above yields an array: wrap the entire response as [response]
5. Log a sub-step entry: "API Lookup" with status 'completed'
   - Input: { url, method, apiSourceType, resultArrayPath }
   - Output: { responseStatus, candidateCount, candidates (if <= 20, else truncated) }
6. If zero candidates:
   - If failOnNoMatch: throw an error
   - Else: return { matchedValue: null, aiSkipped: true, reason: 'No candidates' }
```

### Sub-step 3: AI Matching

```
1. If exactly 1 candidate AND skipAiIfSingleResult is true:
   a. Use the single candidate directly (no AI call)
   b. Extract the value at returnFieldPath from the matched record
   c. Store the result (see "Storing Results" below)
   d. Log sub-step: "AI Matching" with aiSkipped: true
   e. Return early

2. Fetch the AI configuration:
   a. Query the active Gemini API key from the database
   b. Query the active Gemini model name (default: "gemini-2.5-pro")

3. Construct the AI prompt (see Section 5 for the exact prompt template)

4. Call the Gemini API:
   a. Send the prompt as a text content part
   b. Parse the response text as JSON
   c. Strip markdown code block delimiters (```json ... ```) if present
   d. Validate the result has { matchIndex: number, confidence: number, reason: string }
   e. If matchIndex is not a valid integer, fall back to index 0

5. Handle the AI result:
   a. If matchIndex is -1 or >= candidates.length (no match):
      - If failOnNoMatch: throw an error
      - Else: store null and return
   b. Otherwise:
      - Get the matched record: candidates[matchIndex]
      - Extract the return value: getValueByPath(matchedRecord, returnFieldPath)
      - Store the result (see below)

6. Store results:
   a. Store in contextData: contextData[outputVariableName] = matchedValue
   b. Store in extractedData: contextData.extractedData[outputVariableName] = matchedValue
   c. Process responseDataMappings: for each mapping, extract the value from the matched record
      at mapping.responsePath and write it into contextData.extractedData at mapping.updatePath

7. Log sub-step: "AI Matching" with the full result details
```

### Return Value

The function returns an object with two properties:

```typescript
{
  stepOutput: {
    url: string;                  // The API URL that was called
    method: string;               // HTTP method used
    candidateCount: number;       // Number of candidates retrieved
    selectedIndex?: number;       // Index of the matched candidate
    confidence?: number;          // AI confidence score (0-100)
    selectionReason?: string;     // AI's explanation for the match
    selectedRecord?: any;         // The full matched candidate record
    selectedValue?: any;          // The extracted return field value
    outputVariable?: string;      // The variable name where result was stored
    model?: string;               // Gemini model name used
    aiSkipped?: boolean;          // True if AI was skipped
    reason?: string;              // Reason AI was skipped (if applicable)
  };
  responseData: any;  // The raw API response (used as lastApiResponse by the orchestrator)
}
```

### Orchestrator Integration

In the main workflow orchestrator's step execution loop, the AI Decision step is handled specially:

```typescript
} else if (node.step_type === 'ai_decision') {
  const result = await executeAiDecision(
    node, contextData, supabaseUrl, supabaseServiceKey,
    executionLogId, workflowId
  );
  lastApiResponse = result.responseData;
  stepOutputData = result.stepOutput;
}
```

The orchestrator should NOT create a parent-level step log for `ai_decision` because the step internally creates three granular sub-step logs (Source Field Resolution, API Lookup, AI Matching).

---

## 5. AI Prompt Construction

The exact prompt sent to Gemini AI is critical for consistent matching behavior. Here is the template:

```
You are a data matching assistant. You MUST return exactly ONE match from the candidate list.

SOURCE RECORD (the record we want to match):
{resolvedSourceFields as formatted JSON}

CANDIDATE RECORDS ({candidateCount} total):
{candidates array as formatted JSON}

{if aiInstruction is not empty:}
MATCHING INSTRUCTIONS:
{aiInstruction}

RULES:
- You MUST select exactly ONE candidate. Never return multiple matches.
- If multiple candidates match equally well, select the FIRST one (lowest index).
- Return ONLY a valid JSON object with exactly these fields:
   - "matchIndex": the zero-based index of the single best matching candidate (integer)
   - "confidence": a number from 0 to 100 indicating match confidence
   - "reason": a brief explanation of why this candidate was chosen

If no candidate is a reasonable match, return:
   {"matchIndex": -1, "confidence": 0, "reason": "No suitable match found"}

Return ONLY the JSON object, no markdown formatting, no code blocks, no extra text.
```

### Response Parsing

1. Trim the response text
2. If it starts with triple backticks, strip the code block delimiters: remove leading ` ```json\n ` or ` ``` ` and trailing ` ``` `
3. Parse the cleaned text as JSON
4. Validate `matchIndex` is a valid integer -- if not, force it to 0 with an annotation
5. Expected response structure:

```json
{
  "matchIndex": 0,
  "confidence": 95,
  "reason": "Exact match on name 'GOODFELLOW BROS HI' and postal code '96784'. Address also matches."
}
```

---

## 6. Frontend Configuration UI

The configuration panel has three collapsible sections:

### Section 1: Source Record (Extracted Data)

Purpose: Define which extracted fields represent the record you want to match against.

- A dynamic list where users add/remove field rows
- Each row has two inputs:
  - **Label** (text input): Display name (e.g., "Consignee Name")
  - **Value** (text input, monospace font): Template value (e.g., `{{consignee.name}}`)
- "Add source field" button at the bottom

### Section 2: API Lookup (Candidate Fetch)

Purpose: Configure the API call that fetches multiple candidate records.

- Reuses the existing API Endpoint configuration component (if your system has one) with array/mapping sections hidden
- Includes:
  - API source selector (main vs secondary)
  - API path input
  - HTTP method selector
  - Query parameter builder (key, value, enabled toggle)
  - Path variable configuration
- Additional field below the API config:
  - **Result Array Path** (text input, monospace font): Dot-path to the array of candidates in the API response
  - Helper text: "Leave empty if the response itself is the array."

### Section 3: AI Matching Configuration

Purpose: Control how the AI performs matching and where results are stored.

Fields:
- **Matching Instructions** (textarea, 4 rows): Free-text instructions for Gemini about how to match
  - Placeholder: "Match the source record to the closest candidate based on company name and address similarity."
- **Return Field Path** (text input, monospace): Which field to extract from the matched record (e.g., `clientId`)
- **Output Variable Name** (text input, monospace): Variable name for downstream steps (e.g., `matchedClientId`)
  - Helper text: "Referenced in later steps as {{matchedClientId}}"
- **Response Data Mappings** (dynamic list):
  - Each row has two inputs:
    - Response Path: field path in matched candidate (e.g., `clientId`)
    - Update Path: where to store in extracted JSON (e.g., `orders[0].consignee.clientId`)
  - Add/remove mapping buttons
- **Skip AI if only one candidate** (checkbox, default: checked)
- **Fail step if AI cannot confidently match** (checkbox, default: unchecked)

### Visual Design

- Use a distinct color theme (cyan/teal) to visually differentiate from other step types
- Include an info banner at the top explaining what the step does:
  > "Fetches candidates from an API endpoint, then uses Gemini AI to match the best result against your source record fields. Returns the specified field from the matched record."

---

## 7. Flow Designer Integration

In a visual flow designer (e.g., React Flow):

- **Node type**: Standard single-output workflow node (no branching like conditional steps)
- **Icon**: A brain/circuit icon (e.g., `BrainCircuit` from lucide-react)
- **Color theme**: Cyan (e.g., bg-cyan-100, text-cyan-600, border-cyan-300)
- **Label**: "AI Decision" in the add-step dropdown
- **Handles**: One input handle (top), one output handle (bottom) -- both "default" type
- **MiniMap color**: #06b6d4 (cyan-500)

---

## 8. Execution Logging

The AI Decision step creates **three separate sub-step log entries** per execution, not one. This provides granular observability into each phase:

### Log 1: Source Field Resolution

```json
{
  "node_label": "Match Consignee - Source Field Resolution",
  "step_type": "ai_decision",
  "status": "completed",
  "input_data": {
    "sourceFields": [
      { "label": "Consignee Name", "value": "{{consignee.name}}" }
    ]
  },
  "output_data": {
    "resolvedSourceFields": {
      "Consignee Name": "GOODFELLOW BROS HI",
      "Consignee Address": "550 NOPU ST",
      "Consignee Zip": "96784"
    }
  }
}
```

### Log 2: API Lookup

```json
{
  "node_label": "Match Consignee - API Lookup",
  "step_type": "ai_decision",
  "status": "completed",
  "input_data": {
    "url": "https://api.example.com/masterData/clients?$filter=postalCode+eq+'96784'",
    "method": "GET",
    "apiSourceType": "secondary",
    "resultArrayPath": "clients"
  },
  "output_data": {
    "responseStatus": 200,
    "candidateCount": 20,
    "candidates": [ ... ]
  }
}
```

### Log 3: AI Matching

```json
{
  "node_label": "Match Consignee - AI Matching",
  "step_type": "ai_decision",
  "status": "completed",
  "input_data": {
    "candidateCount": 20,
    "resolvedSourceFields": { ... },
    "aiInstruction": "Match on name and address...",
    "model": "gemini-2.5-pro"
  },
  "output_data": {
    "selectedIndex": 0,
    "confidence": 100,
    "selectionReason": "Exact match on name and postal code.",
    "selectedRecord": { "clientId": "0000010921", "name": "GOODFELLOW BROS HI", ... },
    "selectedValue": "0000010921",
    "outputVariable": "matchedClientId"
  }
}
```

---

## 9. Real-World Example

### Scenario

A logistics company extracts shipping orders from PDF documents. The extracted data contains a consignee (destination) name and address, but the TMS (Transportation Management System) requires an internal `clientId` for the consignee. The AI Decision step automates the lookup.

### Workflow Flow

```
[Start] -> [AI Decision: Match Consignee] -> [API Call: Create Order]
```

### AI Decision Configuration

- **Source Fields**: Map the consignee name, address, city, state, and zip from the extracted order data
- **API Lookup**: Call the TMS Master Data API with an OData filter on postal code to get candidates with similar locations
- **AI Matching**: Gemini compares the extracted consignee info against all candidates and selects the best match based on name and address similarity
- **Output**: The matched `clientId` (e.g., "0000010921") is stored as `{{matchedClientId}}`
- **Response Data Mappings**: The clientId is also written directly into the extracted order JSON at `orders[0].consignee.clientId`

### Downstream Usage

The next step (API Call: Create Order) sends the entire extracted data (now enriched with the matched clientId) to the TMS order creation endpoint. The `{{matchedClientId}}` variable can also be used in URL templates, query parameters, or conditional logic in subsequent steps.

---

## 10. Edge Cases and Error Handling

### Zero Candidates
- When the API returns zero candidates (empty array or no array found in response)
- If `failOnNoMatch` is true: throw an error and fail the workflow
- If `failOnNoMatch` is false: return `matchedValue: null`, set `aiSkipped: true` with reason, and continue the workflow

### Single Candidate Optimization
- When exactly one candidate is returned AND `skipAiIfSingleResult` is true (default)
- Skip the Gemini API call entirely to save time and cost
- Use the single candidate directly as the match
- This is logged with `aiSkipped: true` in the sub-step log

### AI Returns Invalid matchIndex
- If Gemini returns a non-integer matchIndex (e.g., a string or float): force it to 0 (first candidate) and append a note to the reason
- If matchIndex is -1 (no match) or >= candidates.length (out of bounds): treat as "no match"

### AI Response Parsing Failure
- If Gemini returns markdown-wrapped JSON (e.g., ` ```json {...} ``` `): strip the code block markers before parsing
- If the response still cannot be parsed as JSON: throw an error with the raw response text for debugging

### No Gemini API Key
- If no active Gemini API key is found in the database: throw a descriptive error asking the user to configure one in Settings

### API Lookup Failure
- If the candidate fetch API returns a non-2xx status: log the failure as a sub-step, attach the error response, and throw
- The error includes the URL and response status for debugging

### Variable Resolution Failures
- If a `{{variableName}}` in source fields or query parameters cannot be resolved (path not found in contextData): leave the original placeholder string in place
- This allows the API to potentially handle it or fail with a clear error showing the unresolved template

### Storing Results in Extracted Data
- The matched value is stored in TWO places:
  1. `contextData[outputVariableName]` -- for direct template reference in later steps
  2. `contextData.extractedData[outputVariableName]` -- for inclusion when `{{extractedData}}` is used as a whole object
- Response data mappings write into `contextData.extractedData` at the specified paths, supporting deep dot-path and array bracket notation (e.g., `orders[0].consignee.clientId`)
