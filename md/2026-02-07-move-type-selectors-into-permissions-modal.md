# Move Extract/Transform/Execute Type Selectors into Manage Permissions Modal

## Date: 2026-02-07

## Summary

Consolidated the extraction type, transformation type, and execute category selection into the Manage Permissions modal, removing the need for separate buttons and modals on each user card row.

## Changes

### `src/components/settings/UserManagementSettings.tsx`

1. **Removed standalone buttons from user cards**: The "Extract", "Transform", and "Execute" buttons that appeared on each user card row have been removed. These previously opened separate modals to select types/categories.

2. **Added inline type selectors inside the Manage Permissions modal**: When a page permission (Extract Page, Transform Page, or Execute Page) is toggled ON in the Pages category, an inline type/category checklist now appears directly below that permission row. Each section includes:
   - All/None quick-select buttons
   - A scrollable list of available types/categories with checkboxes
   - A count showing how many are selected

3. **Updated `handleManagePermissions`**: When the permissions modal opens, it now also loads the user's currently assigned extraction types, transformation types, and execute categories so they are pre-populated.

4. **Updated `handleUpdatePermissions`**: The "Update Permissions" button now saves both the page-level permission toggles AND the type-level selections in a single action.

5. **Removed three standalone modals**: The separate "Manage Extraction Types", "Manage Transformation Types", and "Manage Execute Categories" modals have been removed along with their associated state variables and handler functions.

6. **Cleanup**: Removed unused state variables (`showExtractionTypesModal`, `userForExtractionTypes`, `isUpdatingExtractionTypes`, `showTransformationTypesModal`, `userForTransformationTypes`, `isUpdatingTransformationTypes`, `showExecuteCategoriesModal`, `userForExecuteCategories`, `isUpdatingExecuteCategories`) and their associated handler functions.
