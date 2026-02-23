# Move Admin Toggle Into Permissions Modal

**Date:** 2026-02-07

## Summary

Relocated the "Make Admin" / "Remove Admin" functionality from the user card row into the Permissions modal, consolidating all user access configuration into a single place.

## Changes

### Removed
- **Make Admin / Remove Admin button** from the user card action row in the user list table.

### Added
- **Admin toggle switch** in the top-right corner of the "Manage Permissions" modal header.
  - Styled as an amber-colored toggle switch with an "Admin" label.
  - When toggled ON, all permission checkboxes across every category are automatically checked.
  - When toggled OFF, permissions are left as-is (no automatic unchecking).
  - The toggle is disabled and visually muted when viewing the current logged-in admin or the default `admin` account (prevents accidental self-demotion).

### Modified
- **handleUpdatePermissions** now saves the admin status (`isAdmin` and `role`) alongside permissions in a single save action. Previously, admin status and permissions were saved via separate buttons.

## Files Changed

- `src/components/settings/UserManagementSettings.tsx`
