# Fix Multipart Form Upload Authentication Dropdown

**Date:** 2026-01-29

## Problem

The Authentication dropdown in the Multipart Form Upload workflow step was not showing the configured authentication options from the API Settings > Authentication page.

## Root Cause

The table name in the Supabase query was incorrect. The code was querying `api_auth_configs` (plural) but the actual table is named `api_auth_config` (singular).

## Solution

Fixed the table name in `src/components/settings/workflow/StepConfigForm.tsx` line 182:

**Before:**
```typescript
const { data: authData } = await supabase
  .from('api_auth_configs')
  .select('id, name')
  .order('name');
```

**After:**
```typescript
const { data: authData } = await supabase
  .from('api_auth_config')
  .select('id, name')
  .order('name');
```

## Files Changed

- `src/components/settings/workflow/StepConfigForm.tsx` - Fixed table name in query

## Notes

The backend processor (`supabase/functions/json-workflow-processor/steps/multipart.ts`) already correctly handles the `authConfigId` from the step config and performs token authentication when sending the multipart form request.
