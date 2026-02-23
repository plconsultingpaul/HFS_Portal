# Add Vendor Setup, Client Setup, and Check-In Setup Permissions

**Date:** 2026-02-07

## Summary

Added three new independent permission flags for Vendor Setup, Client Setup, and Check-In Setup sidebar items. Previously these pages did not have their own permission controls -- Vendor Setup and Client Setup were tied to the `userManagement` permission, and Check-In Setup was hardcoded to admin-only access.

## Changes

### New Permission Flags

| Permission | Controls | Previous Behavior |
|---|---|---|
| `vendorSetup` | Vendor Setup sidebar visibility | Was tied to `userManagement` |
| `clientSetup` | Client Setup sidebar visibility | Was tied to `userManagement` |
| `checkinSetup` | Check-In Setup sidebar visibility | Was hardcoded to `isAdmin` only |

### Files Modified

1. **`src/types/index.ts`** -- Added `vendorSetup`, `clientSetup`, `checkinSetup` booleans to `UserPermissions` interface
2. **`src/hooks/useAuth.ts`** -- Updated `getDefaultPermissions` (admins get `true`, users get `false`), added migration logic for existing permission objects missing the new fields
3. **`src/components/Layout.tsx`** -- Sidebar filtering now uses `user.permissions.vendorSetup`, `.clientSetup`, `.checkinSetup` instead of `.userManagement` / `.isAdmin`
4. **`src/components/LayoutRouter.tsx`** -- Same sidebar filtering changes as Layout.tsx
5. **`src/components/settings/UserManagementSettings.tsx`** -- Added three new checkboxes to the permission options list with appropriate icons and descriptions

### Database Migration

- Existing users with `userManagement: true` get `vendorSetup: true` and `clientSetup: true` (preserves current access)
- Existing admin users get `checkinSetup: true`; non-admin users get `checkinSetup: false`
- No existing user loses access due to this change
