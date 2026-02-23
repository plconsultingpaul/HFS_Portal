# Fix Workflow V2 Multipart Form Upload Parity with V1

**Date:** 2026-02-18

## Problem

The Multipart Form Upload step configuration form in Workflow V2 was missing several critical fields and features compared to Workflow V1. While the edge function processing code (`multipart.ts`) was already identical between V1 and V2, the V2 UI form was a significantly simplified version that lacked the fields needed to fully configure multipart uploads.

## What Changed

**File modified:** `src/components/settings/workflow-v2/WorkflowV2StepConfigPanel.tsx`

### Fields Added (matching V1 field order)

1. **Info Banner** - Emerald-colored description of the Multipart Form Upload step type
2. **Secondary API selector** - Dropdown to choose which secondary API to use (shown when API Source = "Secondary API")
3. **Authentication Config selector** - Dropdown to choose auth config (shown when API Source = "Auth Config Only")
4. **Authentication (Optional) override** - Dropdown to override authentication when using Main or Secondary API source
5. **Content-Type field per form part** - Input field for setting the Content-Type of each text-type form part (e.g., `application/json`)
6. **"Map JSON" button** - Auto-generates field mappings from JSON content in a form part value
7. **Field Mappings sub-section per form part** - Full field mapping editor with:
   - Field name
   - Type (Hardcoded / Variable)
   - Value (with Variable Dropdown for inserting workflow variables)
   - Data Type (String / Integer / Number / Boolean)
   - Color-coded rows (green for hardcoded, blue for variable)
8. **JSON parse error display** - Shows validation errors when JSON in form parts is malformed
9. **File Source label** - Shows "PDF from workflow context" for file-type parts

### Field Order Updated (now matches V1)

- API Source
- Secondary API (conditional)
- Authentication Config (conditional)
- Authentication Override (conditional)
- API URL (with helper text)
- Upload Filename Template (with helper text and placeholder)
- Form Parts (with full grid layout matching V1)
- Response Data Mappings (with "to" separator and descriptive placeholders)

### Data Dependencies Added

- Fetches `secondary_api_configs` from the database on component mount
- Fetches `api_auth_config` from the database on component mount
- Uses the `Select` component (same as V1) for API Source, Secondary API, and Auth Config dropdowns

### Value field changed from input to textarea

- Text-type form part values now use a multi-line `textarea` with monospace font (matching V1), instead of a single-line `input`

## Edge Functions

No changes were needed to the edge functions. The `multipart.ts` step handler was already identical between `json-workflow-processor` and `json-workflow-processor-v2`.

## Database

No schema changes were needed. The `config_json` column already stores the full configuration object, and the V2 form now writes the same field names (`secondaryApiId`, `authConfigId`, `formParts[].contentType`, `formParts[].fieldMappings`) that V1 writes and the edge function expects.
