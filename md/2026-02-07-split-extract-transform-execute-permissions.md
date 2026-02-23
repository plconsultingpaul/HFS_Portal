# 2026-02-07 Split Extract, Transform, and Execute Permissions

## Problem

Previously, a single permission flag controlled both sidebar page access and Type Setup tab access:

- `extractionTypes` controlled both the **Extract** sidebar item and the **Extraction Types** tab in Type Setup
- `transformationTypes` controlled both the **Transform** sidebar item and the **Transformation Types** tab in Type Setup
- `executeSetup` controlled the **Execute** sidebar item; `workflowManagement` controlled both the **Execute Setup** and **Workflows** tabs in Type Setup

This made it impossible to grant a user access to the Extract page without also giving them access to manage Extraction Types in Type Setup (and vice versa).

## Solution

Split into 6 independent permission flags:

| Permission | Controls |
|---|---|
| `extractPage` (new) | Extract Page visibility in sidebar |
| `extractionTypes` (narrowed) | Extraction Types tab in Type Setup only |
| `transformPage` (new) | Transform Page visibility in sidebar |
| `transformationTypes` (narrowed) | Transformation Types tab in Type Setup only |
| `executePage` (new) | Execute Page visibility in sidebar |
| `executeSetup` (narrowed) | Execute Setup tab in Type Setup only |
| `workflowManagement` (unchanged) | Workflows tab in Type Setup |

## Files Changed

### `src/types/index.ts`
- Added `extractPage`, `transformPage`, `executePage` boolean flags to `UserPermissions` interface

### `src/hooks/useAuth.ts`
- Updated `getDefaultPermissions()` to include the 3 new flags
- Added `migratePermissions()` function for backwards compatibility when reading old JSON permissions that lack the new fields
- Updated `buildUserFromData()` and `getAllUsers()` to use `migratePermissions()`

### `src/components/Layout.tsx`
- Sidebar filtering now uses `extractPage` for Extract, `transformPage` for Transform, `executePage` for Execute
- Type Setup sidebar visibility checks all 4 Type Setup permissions: `extractionTypes`, `transformationTypes`, `executeSetup`, `workflowManagement`

### `src/components/LayoutRouter.tsx`
- Same sidebar filtering changes as Layout.tsx

### `src/components/TypeSetupPage.tsx`
- Execute Setup tab now gated by `executeSetup` instead of `workflowManagement`

### `src/components/settings/UserManagementSettings.tsx`
- Permission checkboxes updated to show all 6 page/type permissions with clear descriptions
- Reordered so related page/type pairs are adjacent

### Database Migration
- Migrates existing users' JSON permissions to include the new fields
- Copies `extractionTypes` value to `extractPage` for backwards compatibility
- Copies `transformationTypes` value to `transformPage`
- Copies `executeSetup` value to `executePage`
- No existing user loses access they previously had
