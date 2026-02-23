# Multipart Form Field Mappings - Diagnostic Logging

## Date: 2026-01-29

## Issue
Field Mappings configured in the Multipart Form Upload step are not being applied to the Form Parts value. The Output Data shows placeholder values ("AAA", "000") instead of the resolved variable values.

## Changes Made
Added comprehensive diagnostic logging to `supabase/functions/json-workflow-processor/steps/multipart.ts` to trace exactly what happens during field mapping processing.

## Logging Added

### For Each Form Part:
- Part name and type
- Whether `fieldMappings` property exists
- Count of field mappings
- Full part object JSON

### For Field Mappings Processing Block:
- Confirmation when entering/exiting the field mappings processing block
- Number of mappings to process
- Full field mappings array JSON

### For Each Individual Mapping:
- Mapping index (e.g., "1/4")
- Full mapping object JSON
- Field name, placeholder, mapping type, mapping value, data type
- Whether placeholder exists in the template
- For hardcoded values: the resolved value
- For variable values:
  - Available contextData keys
  - contextData.response keys and content (if exists)
  - Each variable found in the mapping value
  - Result of getValueByPath lookup
  - Value after each variable replacement
- Resolved value before/after datatype conversion
- Escaped value for JSON
- Template before and after replacement
- Length change detection (to verify replacement occurred)
- Warning if placeholder was NOT found in template

## Purpose
This logging will help identify:
1. If `fieldMappings` is being passed correctly from the config
2. If the placeholder format (e.g., `{{In_DocName}}`) exists in the template value
3. If variable values are being found in contextData
4. Where exactly the replacement process is failing

## Files Modified
- `supabase/functions/json-workflow-processor/steps/multipart.ts`
