# Disable Save Buttons for Non-Admin Users

## Summary

Disabled Save, Add, Delete, Import, and Copy buttons across all settings and configuration pages for non-admin users. This prevents confusion where non-admin users could attempt to make changes that would silently fail due to RLS restrictions on the backend.

## Changes

### Parent Pages (prop passing)

- **TypeSetupPage.tsx** - Now passes `isAdmin={currentUser.isAdmin}` to all four child settings components: ExtractionTypesSettings, TransformationTypesSettings, ExecuteSetupSettings, and WorkflowSettings.
- **SettingsPage.tsx** - Now passes `isAdmin={currentUser.isAdmin}` to SftpSettings, ApiSettings, EmailMonitoringSettings, CompanyBrandingSettings, and NotificationTemplatesSettings.

### Configuration Pages (TypeSetupPage children)

- **ExtractionTypesSettings.tsx** - Save Changes, Add Type, Import buttons disabled; Copy Type and Delete buttons hidden for non-admins.
- **TransformationTypesSettings.tsx** - Save All, Add Type, Import buttons disabled; Copy Type and Delete buttons hidden for non-admins.
- **WorkflowSettings.tsx** - Save All, Add Workflow buttons disabled; Copy Workflow button hidden for non-admins.
- **ExecuteSetupSettings.tsx** - Add Category, New Button, Add Group buttons disabled; Edit/Delete button and category edit/delete actions hidden for non-admins.

### Settings Pages (SettingsPage children)

- **SftpSettings.tsx** - Save, Add Config, Save All (polling) buttons disabled for non-admins.
- **ApiSettings.tsx** - Save button disabled for non-admins.
- **EmailMonitoringSettings.tsx** - Save button disabled for non-admins.
- **CompanyBrandingSettings.tsx** - Save button disabled for non-admins.
- **NotificationTemplatesSettings.tsx** - New Template button disabled; Edit, Duplicate, Delete actions hidden for non-admins.

## UI Behavior

- Disabled buttons show a `not-allowed` cursor and appear grayed out.
- Disabled buttons display an "Admin access required" tooltip on hover.
- Delete and edit buttons that would have no effect are hidden entirely for non-admins for a cleaner UI.
- Read-only actions (Export, Preview, Mapping view) remain accessible to all users.
