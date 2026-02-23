# Fix User Response Message Variable Prefix

## Date: 2026-01-29

## Problem

When using Response Data Mappings in workflow steps, the variables were not resolving correctly in the User Response Message field. The message would display the literal variable path (e.g., `Found Client ID: orders.0.consignee.clientId`) instead of the actual extracted value.

## Root Cause

In `StepConfigForm.tsx`, the `getAvailableVariables()` function was adding a `response.` prefix to response data mapping variables:

```javascript
name: `response.${mapping.updatePath}`
// Resulted in: response.orders.0.consignee.clientId
```

However, in the workflow processor (`api.ts`), when processing response data mappings, values are stored directly in `contextData` WITHOUT the `response.` prefix:

```javascript
// Data is stored at: contextData.orders.0.consignee.clientId
```

This mismatch meant the `resolveUserResponseTemplate` function could not find the value when looking up `response.orders.0.consignee.clientId` in contextData.

## Solution

Removed the `response.` prefix from the variable name in the `getAvailableVariables()` function so that the variable path matches where the data is actually stored in contextData.

## File Changed

- `src/components/settings/workflow/StepConfigForm.tsx`

## Change Details

```diff
- name: `response.${mapping.updatePath}`,
+ name: mapping.updatePath,
```

Line 453 in the `getAvailableVariables()` function.
