# Add Default Value (Fallback) to Address Lookup Functions

**Date:** 2026-02-13

## Summary

Added a "Default Value (Fallback)" option to the Address Lookup function type. When the AI-powered address lookup cannot determine a value (empty response, no input data, or API error), the configured default value is now returned instead of an empty string.

## Changes

### 1. Type Definition (`src/types/index.ts`)
- Added optional `defaultValue?: string` property to `AddressLookupFunctionLogic` interface.

### 2. Function Editor UI (`src/components/settings/FunctionEditorModal.tsx`)
- Added a "Default Value (Fallback)" text input below the Country Context dropdown in the Address Lookup section.
- The field loads existing `defaultValue` from saved function data on edit.
- Helper text explains: "If the AI cannot determine a value, this fallback will be used instead."

### 3. Client-Side Evaluator (`src/lib/functionEvaluator.ts`)
- `evaluateAddressLookup()` now falls back to `logic.defaultValue` when:
  - No address parts are found from input fields
  - Gemini returns an empty/blank response
  - An error occurs during the API call

### 4. Server-Side Shared Evaluator (`supabase/functions/shared/functionEvaluator.ts`)
- Updated `AddressLookupFunctionLogic` interface to include `defaultValue?: string`.
- `evaluateAddressLookupAsync()` now falls back to `logic.defaultValue` in the same three scenarios as the client-side evaluator.

## No Database Migration Required

The `defaultValue` is stored inside the existing `function_logic` JSONB column on the `field_mapping_functions` table, so no schema change is needed.
