# Fix V2 Workflow AI Decision Step - Extracted Data Variable Resolution

**Date:** 2026-02-15

## Problem

When running a V2 workflow from an Extraction, the AI Decision step's source fields were not resolving template variables like `{{shipper.name}}`. The output showed the raw template strings instead of the actual extracted values (e.g., "XPRESS TRUCKING MAUI").

## Root Cause

Extracted data uses flat dot-notation keys (e.g., `"shipper.name": "XPRESS TRUCKING MAUI"`). These are single literal keys with dots in the name, not nested objects.

The `getValueByPath` utility function splits the path on dots and attempts nested object traversal (`contextData.shipper.name`), but `contextData["shipper"]` does not exist as a nested object -- the value lives at `contextData["shipper.name"]` as a flat literal key. The function returned null and the template variables passed through unresolved.

## Fix

Added a flat literal key check to `getValueByPath` in both V2 workflow processor utils. Before splitting on dots and doing nested traversal, the function now checks if the full path string exists as a direct property on the object. If it does, that value is returned immediately. Only if the literal key lookup fails does it fall through to the existing dot-split nested traversal.

## Files Changed

- `supabase/functions/json-workflow-processor-v2/utils.ts` - Added literal key fallback in `getValueByPath`
- `supabase/functions/transform-workflow-processor-v2/utils.ts` - Same change

## Edge Functions Redeployed

- `json-workflow-processor-v2`
- `transform-workflow-processor-v2`
