# Fix V2 Workflow API Call Parity with V1

**Date:** 2026-02-15

## Problem

The Workflow V2 `api_call` step was failing with a 400 error ("Request body is expected to be a valid JSON array") when using `{{extractedData}}` in the request body, even though the identical configuration worked in Workflow V1.

## Root Cause

Two issues were found in `supabase/functions/json-workflow-processor-v2/index.ts`:

### 1. Return Value Mismatch (Primary Bug)

The V2 orchestrator was destructuring the return value of `executeApiCall` as `{ responseData, stepOutput }`, but the function returns the raw response data directly (not a wrapper object). This caused both `lastApiResponse` and `stepOutputData` to be `undefined`.

**Before (broken):**
```typescript
const result = await executeApiCall(node, contextData);
lastApiResponse = result.responseData;   // undefined
stepOutputData = result.stepOutput;      // undefined
```

**After (matches V1):**
```typescript
stepOutputData = await executeApiCall(node, contextData);
lastApiResponse = stepOutputData;
```

### 2. Missing Context Variables

The V2 context construction was missing several variables that V1 provides. Any workflow templates referencing these variables would fail to resolve in V2.

**Added variables:**
- `senderEmail` - from `requestData.senderEmail` or `requestData.submitterEmail`
- `submitterEmail` - from `requestData.submitterEmail`
- `extractionTypeName` - from `typeDetails.name`
- `timestamp` - PST-formatted timestamp string
- `workflowOnlyFields` - parsed from `requestData.workflowOnlyData` and spread into context

### 3. Diagnostic Logging Added

Added detailed debug logging to `executeApiCall` in the V2 processor to diagnose the `{{extractedData}}` resolution path. Logs capture:
- Type, truthiness, and preview of `contextData.extractedData`
- Type and preview of `contextData.originalExtractedData`
- Whether the data is an array or object
- The stringified data length and preview after replacement
- Whether `{{extractedData}}` still remains unresolved in the final body
- Final request body length and preview

## Files Changed

- `supabase/functions/json-workflow-processor-v2/index.ts`
- `supabase/functions/json-workflow-processor-v2/steps/api.ts`
