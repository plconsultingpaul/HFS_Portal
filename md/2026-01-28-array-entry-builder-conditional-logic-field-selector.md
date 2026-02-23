# Array Entry Builder - Conditional Logic Field Selector

**Date:** 2026-01-28

## Summary

Added a `{ }` button to the Conditional Logic section in the Array Entry Builder that allows users to select field names from the current Extraction Type's field mappings instead of typing them manually.

## Changes Made

### File: `src/components/settings/ExtractionTypesSettings.tsx`

1. **Added state for dropdown visibility tracking**
   - Added `conditionFieldSelectorOpen` state to track which rule index has its field selector dropdown open

2. **Added field selector button and dropdown**
   - Added a `{ }` button next to each condition's field path input
   - Button shows amber-colored curly braces to indicate it's a field selector
   - Clicking the button toggles a dropdown menu

3. **Dropdown functionality**
   - Displays all field mappings from the current Extraction Type that have a fieldName defined
   - Shows the field name in monospace font with its data type (if available) on the right
   - Clicking a field name populates the field path input with that value
   - Shows "No field mappings defined" message if no field mappings exist

## UI Behavior

- The `{ }` button appears next to each condition rule's field path input
- Clicking the button opens a dropdown positioned below the input
- The dropdown lists all available field mapping names from the Extraction Type
- Selecting a field name inserts it into the input and closes the dropdown
- Clicking the button again (when open) closes the dropdown

## Fix: Dropdown Z-Index Issue (2026-01-28)

The dropdown was initially hidden behind the modal form due to stacking context issues. Fixed by:
- Using `createPortal` to render the dropdown directly to `document.body`
- Adding `data-condition-field-btn` attribute to the button for positioning reference
- Using `fixed` positioning with calculated top/left based on button's bounding rect
- Setting inline z-index to 99999 to ensure visibility above all modal layers
