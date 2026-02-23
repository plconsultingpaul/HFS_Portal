# Fix Multipart Form Nested JSON Property Update

**Date:** 2026-01-30

## Problem

In the Multipart Form Upload workflow step, field mappings with dot notation paths (e.g., `ARDOCS_Truckmate_Child.0.FBNumber`) were not updating nested properties within JSON arrays. Instead, the value was being added as a new root-level property.

**Example:**
- Field name: `ARDOCS_Truckmate_Child.0.FBNumber`
- Expected: `{"ARDOCS_Truckmate_Child":[{"FBNumber":"XT0140655"}]}`
- Actual (before fix): `{"ARDOCS_Truckmate_Child":[{"FBNumber":"AAA"}],"FBNumber":"XT0140655"}`

The nested `FBNumber` inside the array remained unchanged while a new root-level `FBNumber` property was incorrectly added.

## Solution

Modified the field mapping logic in `multipart.ts` to:

1. Detect when a field name contains a dot (indicating a nested path)
2. Traverse the JSON structure following the path parts
3. Handle both object keys and array indices (numeric path parts)
4. Update the property at the correct nested location
5. Skip the root-level update when a nested update was successful

## File Changed

- `supabase/functions/json-workflow-processor/steps/multipart.ts`

## Code Change Summary

Replaced the debug-only nested path logging with actual update logic:

```typescript
if (fieldName.includes('.')) {
  // Traverse the path
  const pathParts = fieldName.split('.');
  let current = jsonObject;
  let parentRef = null;
  let lastKey = '';

  for (let j = 0; j < pathParts.length; j++) {
    const part = pathParts[j];

    if (j === pathParts.length - 1) {
      parentRef = current;
      lastKey = part;
    } else {
      // Handle array indices (numeric) or object keys
      const index = parseInt(part);
      if (!isNaN(index) && Array.isArray(current)) {
        current = current[index];
      } else {
        current = current[part];
      }
    }
  }

  if (parentRef && lastKey) {
    parentRef[lastKey] = resolvedValue;  // Actual update
    nestedUpdatePerformed = true;
  }
}

// Only update at root if nested update wasn't performed
if (!nestedUpdatePerformed) {
  jsonObject[fieldName] = resolvedValue;
}
```

## Usage

To update a nested property in the properties JSON, use dot notation in the field name:

- `ARDOCS_Truckmate_Child.0.FBNumber` - Updates `FBNumber` in the first element of the `ARDOCS_Truckmate_Child` array
- `parent.child.grandchild` - Updates a deeply nested object property
- `items.2.name` - Updates the `name` property in the third element of the `items` array
