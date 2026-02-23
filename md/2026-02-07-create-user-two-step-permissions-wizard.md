# Create User - Two-Step Permissions Wizard

**Date:** 2026-02-07

## Summary

Changed the "Add User" flow from a single-step form to a two-step wizard that requires setting permissions immediately after creating a user.

## Changes

### File Modified
- `src/components/settings/UserManagementSettings.tsx`

### What Changed

**Step 1 - User Details (existing form, unchanged fields):**
- Username, Email, Role, Password, Admin checkbox
- Button now reads "Next: Set Permissions" instead of "Create User"
- On successful user creation, transitions to Step 2 instead of closing the modal

**Step 2 - Permissions Selection (new):**
- Displays all 11 permission options with toggle cards
- Includes "Select All" and "Deselect All" buttons
- Shows a live count of selected permissions
- Validates that at least one permission is selected before allowing save
- The save button is disabled when zero permissions are selected
- Admin users default to all permissions pre-selected; non-admin users default to none

**Step Indicator:**
- A visual step indicator at the top of the modal shows progress (Step 1 / Step 2) with a green checkmark on completed steps

### Behavior
- If the user is created as an admin, all permissions are pre-checked on Step 2
- If the user is created as a regular user or vendor, no permissions are pre-checked
- The user cannot complete creation without selecting at least one permission
- On Step 2, there is no cancel/back button -- the user has already been created, so only "Save Permissions" is available
