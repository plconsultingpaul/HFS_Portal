# Fix Multipart Form Upload Output Data on Failure

**Date:** 2026-01-29

## Problem

When a Multipart Form Upload workflow step failed (received non-2xx response), the "Output Data" section in the workflow logs was empty. This made it difficult to debug failed uploads since users couldn't see what request was actually sent to the API.

## Root Cause

In `multipart.ts`, when the API returned an error response, the code immediately threw an error without building or returning any output data:

```typescript
if (!response.ok) {
  const errorText = await response.text();
  throw new Error(`Multipart form upload failed with status ${response.status}: ${errorText}`);
}
```

In `index.ts`, the error handling always passed `null` for the output data parameter when logging failed steps:

```typescript
await createStepLog(..., stepInputData, null, contextData);
```

## Solution

### 1. Modified `multipart.ts` to build output data before throwing error

When the API returns an error, the code now:
- Builds the output data object containing request details (URL, filename, form parts, headers)
- Includes the error response (status code and error text)
- Attaches this output data to the error object before throwing

### 2. Modified `index.ts` to extract output data from errors

The error handling now checks if the caught error has an `outputData` property and passes it to the step log instead of `null`.

## Files Changed

1. `supabase/functions/json-workflow-processor/steps/multipart.ts`
   - Added output data construction in error handling block
   - Attached output data to error object via `(error as any).outputData`

2. `supabase/functions/json-workflow-processor/index.ts`
   - Added extraction of `outputData` from caught errors
   - Pass extracted output data to `createStepLog` instead of `null`

## Result

Failed Multipart Form Upload steps now display:
- **Request**: URL, filename, form parts with their values, file size, headers
- **Response**: HTTP status code and error message from the API

This allows users to see exactly what was sent to the API when debugging failed uploads.
