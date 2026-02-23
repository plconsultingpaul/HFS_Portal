# Fix Multipart Form Upload Field Mappings - JSON Property Replacement

**Date:** 2026-01-30

## Problem

The multipart form upload step was not applying field mappings to the form part values. The Field Mappings defined in the UI (e.g., `In_DocName` -> `HFS_{{response.billNumber}}`) were being ignored, and the original placeholder values (e.g., `"AAA"`) remained unchanged.

## Root Cause

The code was using a **placeholder replacement strategy**, looking for `{{fieldName}}` patterns in the template string:
- It searched for `{{In_DocName}}` in the template
- But the template was JSON with actual property keys: `{"In_DocName":"AAA",...}`
- Since `{{In_DocName}}` didn't exist in the template, no replacement occurred

## Solution

Changed the field mapping processing to use **JSON property replacement**:

1. Attempt to parse the template value as JSON
2. If valid JSON:
   - Find properties matching the field name from mappings
   - Update the property value directly with the resolved mapping value
   - Re-stringify the JSON object
3. If not valid JSON:
   - Fall back to the original placeholder replacement strategy for backwards compatibility

## Changes Made

**File:** `supabase/functions/json-workflow-processor/steps/multipart.ts`

### Before
```typescript
const placeholder = `{{${fieldName}}}`;
// Looking for {{In_DocName}} in template - NOT FOUND
processedValue = processedValue.split(placeholder).join(escapedValue);
```

### After
```typescript
// Parse template as JSON
let jsonObject = JSON.parse(processedValue);

// Update property directly by field name
if (fieldName in jsonObject) {
  jsonObject[fieldName] = resolvedValue;
}

// Re-stringify
processedValue = JSON.stringify(jsonObject);
```

## Behavior

Given this configuration:
- **Template Value:** `{"In_DocName":"AAA","detailLineId":"000","Workflow":"AAA"}`
- **Field Mappings:**
  - `In_DocName` (variable) -> `HFS_{{response.billNumber}}`
  - `detailLineId` (variable) -> `{{response.orderId}}`
  - `Workflow` (hardcoded) -> `Complete`

**Result:** `{"In_DocName":"HFS_XT0140646","detailLineId":"208847","Workflow":"Complete"}`

## Consistency

This behavior now matches how Extraction Types handle field mappings - the field name maps directly to the JSON property key, and the value is replaced accordingly.
