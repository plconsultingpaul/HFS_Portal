# Multipart Form Nested JSON Property - Debug Logging

**Date:** 2026-01-30

## Issue

When using Field Mappings in a Multipart Form Upload workflow step, nested JSON properties inside arrays are not being updated correctly. Instead of updating the nested property, a new top-level property is being added.

**Example:**
- JSON Template: `{"In_DocName":"AAA","ARDOCS_Truckmate_Child":[{"FBNumber":"AAA"}]}`
- Field Mapping: `FBNumber` -> `{{billNumber}}`
- Expected Result: `{"In_DocName":"value","ARDOCS_Truckmate_Child":[{"FBNumber":"XT0140652"}]}`
- Actual Result: `{"In_DocName":"value","ARDOCS_Truckmate_Child":[{"FBNumber":"AAA"}],"FBNumber":"XT0140652"}`

## Root Cause (Suspected)

The current code only checks if the field exists at the root level using `fieldName in jsonObject`. It does not traverse nested structures or arrays to find and update properties.

## Changes Made

Added detailed debug logging to `supabase/functions/json-workflow-processor/steps/multipart.ts` to confirm the diagnosis:

1. Logs whether the field name contains a dot (for potential dot notation support)
2. Logs whether the field exists at root level
3. Logs the JSON structure keys
4. If field name contains a dot, attempts to traverse the path and logs each step
5. Shows where the fix would need to be applied

## Logging Added

```typescript
console.log(`🔍 NESTED PATH DEBUG - fieldName: "${fieldName}"`);
console.log(`🔍 NESTED PATH DEBUG - fieldName contains dot: ${fieldName.includes('.')}`);
console.log(`🔍 NESTED PATH DEBUG - fieldName exists at root: ${fieldName in jsonObject}`);
console.log(`🔍 NESTED PATH DEBUG - JSON structure keys: ${JSON.stringify(Object.keys(jsonObject))}`);
```

## Expected Fix

After confirming the diagnosis with logs, the fix will be to:

1. Support dot notation paths in field names (e.g., `ARDOCS_Truckmate_Child.0.FBNumber`)
2. Traverse the path to find and update nested properties
3. Handle array indices in the path (e.g., `.0.` for first array element)

## User Action Required

To target nested properties, use dot notation in the Field name:
- Instead of: `FBNumber`
- Use: `ARDOCS_Truckmate_Child.0.FBNumber`
