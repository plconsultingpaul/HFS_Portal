# Array Entry Builder - Conditional Logic Feature

**Date:** 2026-01-28

This document describes the conditional logic feature added to the Array Entry Builder in Extraction Type Setup.

---

## Overview

Array entries can now include optional conditional logic that determines whether a specific entry should be included in the output. When conditions are configured and enabled, the array entry is only added to the constructed array if the conditions evaluate to true.

**Key Behavior:**
- If no conditions are configured: Entry is always included (existing behavior)
- If conditions exist but are disabled: Entry is always included
- If conditions are enabled with rules: Entry is only included when conditions pass

---

## Changes Made

### 1. Database Migration

Added `conditions` JSONB column to `extraction_type_array_entries` table.

**File:** `supabase/migrations/[timestamp]_add_conditions_to_array_entries.sql`

```sql
ALTER TABLE extraction_type_array_entries
ADD COLUMN IF NOT EXISTS conditions jsonb DEFAULT NULL;
```

### 2. Type Definitions

Added new interfaces in `src/types/index.ts`:

```typescript
export interface ArrayEntryConditionRule {
  fieldPath: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' |
            'greaterThan' | 'lessThan' | 'greaterThanOrEqual' |
            'lessThanOrEqual' | 'isEmpty' | 'isNotEmpty';
  value: string;
}

export interface ArrayEntryConditions {
  enabled: boolean;
  logic: 'AND' | 'OR';
  rules: ArrayEntryConditionRule[];
}
```

Updated `ArrayEntryConfig` interface to include optional `conditions` field:

```typescript
export interface ArrayEntryConfig {
  // ... existing fields
  conditions?: ArrayEntryConditions;
}
```

### 3. Service Layer Updates

**File:** `src/services/typeService.ts`

Updated the following operations to include the `conditions` field:
- `fetchExtractionTypes()` - Maps conditions from database
- `updateExtractionTypes()` - Saves conditions on update/insert
- `exportExtractionType()` - Includes conditions in export
- `importExtractionType()` - Imports conditions from export file

### 4. UI Component Updates

**File:** `src/components/settings/ExtractionTypesSettings.tsx`

Added a collapsible "Conditional Logic" section to the Array Entry modal with:
- Toggle switch to enable/disable conditions
- AND/OR logic selector
- Dynamic rule builder with:
  - Field path input (e.g., `details.dangerousGoods`)
  - Operator dropdown
  - Value input (hidden for isEmpty/isNotEmpty operators)
  - Delete rule button
- "Add Condition" button

### 5. Processing Logic Updates

**File:** `src/lib/gemini.ts`

Added helper functions:
- `getNestedValue()` - Retrieves values from nested object paths
- `evaluateArrayEntryConditions()` - Evaluates all conditions for an entry

Updated array entry processing to skip entries when conditions are not met.

---

## Condition Operators

| Operator | Description | Requires Value |
|----------|-------------|----------------|
| `equals` | Value equals comparison (case-insensitive) | Yes |
| `notEquals` | Value does not equal comparison | Yes |
| `contains` | Value contains substring | Yes |
| `notContains` | Value does not contain substring | Yes |
| `greaterThan` | Numeric greater than | Yes |
| `lessThan` | Numeric less than | Yes |
| `greaterThanOrEqual` | Numeric greater or equal | Yes |
| `lessThanOrEqual` | Numeric less or equal | Yes |
| `isEmpty` | Value is empty, null, or undefined | No |
| `isNotEmpty` | Value has a non-empty value | No |

---

## Condition Logic

- **AND**: All rules must evaluate to true for the entry to be included
- **OR**: At least one rule must evaluate to true for the entry to be included

---

## Example Usage

### Example 1: Dangerous Goods Flag

Only include a dangerous goods trace number entry when `details.dangerousGoods` equals "True":

```json
{
  "enabled": true,
  "logic": "AND",
  "rules": [
    {
      "fieldPath": "details.dangerousGoods",
      "operator": "equals",
      "value": "True"
    }
  ]
}
```

### Example 2: Multiple Conditions

Only include the entry when client ID is "029" AND pallets count is greater than 0:

```json
{
  "enabled": true,
  "logic": "AND",
  "rules": [
    {
      "fieldPath": "shipper.clientID",
      "operator": "equals",
      "value": "029"
    },
    {
      "fieldPath": "details.pallets",
      "operator": "greaterThan",
      "value": "0"
    }
  ]
}
```

### Example 3: Either/Or Conditions

Include the entry if EITHER `details.hazmat` equals "Yes" OR `details.dangerousGoods` equals "True":

```json
{
  "enabled": true,
  "logic": "OR",
  "rules": [
    {
      "fieldPath": "details.hazmat",
      "operator": "equals",
      "value": "Yes"
    },
    {
      "fieldPath": "details.dangerousGoods",
      "operator": "equals",
      "value": "True"
    }
  ]
}
```

---

## Field Path Resolution

The condition evaluator checks field values in the following order:
1. First looks in the extracted order data object
2. If not found, looks in the workflow-only data object

Field paths support nested objects using dot notation:
- `shipper.clientID` - Accesses `order.shipper.clientID`
- `details.pallets` - Accesses `order.details.pallets`
- `dangerousGoods` - Accesses `order.dangerousGoods`

---

## Files Modified

1. `supabase/migrations/[timestamp]_add_conditions_to_array_entries.sql` - Database migration
2. `src/types/index.ts` - Type definitions
3. `src/services/typeService.ts` - Service layer CRUD operations
4. `src/components/settings/ExtractionTypesSettings.tsx` - UI component
5. `src/lib/gemini.ts` - Processing logic with condition evaluation

---

## Backward Compatibility

This change is fully backward compatible:
- Existing array entries without conditions continue to work as before
- The `conditions` column defaults to NULL
- NULL or disabled conditions result in the entry always being included
