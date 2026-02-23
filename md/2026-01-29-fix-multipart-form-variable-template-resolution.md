# Fix Multipart Form Upload Variable Template Resolution

**Date:** 2026-01-29

## Problem

In the Multipart Form Upload workflow step, field mappings with "Variable" type were not resolving correctly when the value contained a prefix or template format like `HFS_{{response.billNumber}}`.

The previous code assumed variable values were in the simple format `{{path}}` and used a regex that only stripped `{{` from the start and `}}` from the end:

```typescript
const variableName = mappingValue.replace(/^\{\{|\}\}$/g, '');
resolvedValue = getValueByPath(contextData, variableName);
```

For a value like `HFS_{{response.billNumber}}`:
- The value doesn't start with `{{`, so nothing was removed from the start
- The `}}` at the end was removed
- Result: `HFS_{{response.billNumber` - an invalid path that returned undefined

This caused variable field mappings to fail silently, leaving placeholder values like "AAA" or "000" unchanged in the output.

## Solution

Changed the variable resolution logic to find and resolve ALL `{{...}}` placeholders within the value, regardless of surrounding text:

```typescript
} else if (mappingType === 'variable') {
  resolvedValue = mappingValue;
  const varRegex = /\{\{([^}]+)\}\}/g;
  let varMatch;
  while ((varMatch = varRegex.exec(mappingValue)) !== null) {
    const varPath = varMatch[1];
    const varValue = getValueByPath(contextData, varPath);
    console.log(`Variable lookup: path="${varPath}", value=`, varValue);
    if (varValue !== undefined && varValue !== null) {
      resolvedValue = resolvedValue.replace(varMatch[0], String(varValue));
    }
  }
}
```

This approach:
1. Treats the variable value as a template
2. Finds all `{{...}}` placeholders within it
3. Resolves each placeholder by looking up the path in contextData
4. Replaces each placeholder with its resolved value

## Examples

| Field Mapping Value | Before (broken) | After (fixed) |
|---------------------|-----------------|---------------|
| `HFS_{{response.billNumber}}` | `HFS_{{response.billNumber` (invalid) | `HFS_12345` |
| `{{response.orderId}}` | `response.orderId` (worked) | `67890` (still works) |

## Files Changed

- `supabase/functions/json-workflow-processor/steps/multipart.ts`
  - Updated variable type field mapping resolution to handle template-style values
  - Added logging for variable lookups to aid debugging
