# Extraction and Transformation Type Export/Import Feature

**Date:** 2026-01-26

## Overview

Added the ability to export and import Extraction Types and Transformation Types between ParseIt instances. This feature enables configuration sharing and backup/restore functionality.

## Changes Made

### 1. Type Service (`src/services/typeService.ts`)

Added new export/import functions:

- `exportExtractionType(extractionType)` - Exports an extraction type with all related data
- `importExtractionType(exportData)` - Imports an extraction type from exported JSON
- `exportTransformationType(transformationType)` - Exports a transformation type with all related data
- `importTransformationType(exportData)` - Imports a transformation type from exported JSON

Added new TypeScript interfaces:
- `ExportedExtractionType` - Structure for exported extraction type JSON
- `ExportedTransformationType` - Structure for exported transformation type JSON

### 2. Extraction Types Settings (`src/components/settings/ExtractionTypesSettings.tsx`)

- Added Export button (teal color) - visible when a saved type is selected
- Added Import button (amber color) - always visible
- Added success/error messages for import operations
- Added hidden file input for JSON file selection

### 3. Transformation Types Settings (`src/components/settings/TransformationTypesSettings.tsx`)

- Added Export button (teal color) - visible when a saved type is selected
- Added Import button (amber color) - always visible
- Added success/error messages for import operations
- Added hidden file input for JSON file selection

## Export File Format

### Extraction Type Export

```json
{
  "exportVersion": "1.0",
  "exportType": "extraction",
  "exportDate": "2026-01-26T14:35:22.000Z",
  "typeName": "BOL",
  "type": {
    // All extraction type fields except id and workflowId
  },
  "relatedData": {
    "arraySplitConfigs": [...],
    "arrayEntryConfigs": [...],
    "functions": [...]
  }
}
```

### Transformation Type Export

```json
{
  "exportVersion": "1.0",
  "exportType": "transformation",
  "exportDate": "2026-01-26T14:35:22.000Z",
  "typeName": "Invoice Renaming",
  "type": {
    // All transformation type fields except id, workflowId, and userId
  },
  "relatedData": {
    "pageGroupConfigs": [...]
  }
}
```

## File Naming Convention

Export files are named using the format:
- `{YYYYMMDD_HHMMSS}_Extract_{TypeName}.json`
- `{YYYYMMDD_HHMMSS}_Transform_{TypeName}.json`

Example: `20260126_143522_Extract_BOL.json`

## Import Behavior

### Name Conflict Handling
- If a type with the same name already exists, the imported type is renamed to `{Name} (Imported)`

### Function Handling (Extraction Types Only)
- During import, the system checks if referenced functions exist by function_name
- If a function exists with the same name, it uses the existing function
- If a function doesn't exist, it auto-creates the function from the export data

### Excluded Fields
The following fields are excluded from export/import as they are instance-specific:
- `id` - New IDs are generated on import
- `workflowId` - Workflows are instance-specific
- `userId` - Users are instance-specific

## UI Behavior

### Export Button
- Appears only when a saved type is selected (not for unsaved/temp types)
- Shows "Exporting..." while processing
- Downloads JSON file directly to browser

### Import Button
- Always visible
- Opens file picker for JSON files
- Shows success message with type name and function count (if applicable)
- Shows error message if import fails
- Messages auto-dismiss after 5 seconds
