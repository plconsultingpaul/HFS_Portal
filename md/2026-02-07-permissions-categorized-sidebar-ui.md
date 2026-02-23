# 2026-02-07 Permissions Categorized Sidebar UI

## Summary
Replaced the flat permissions list with a categorized sidebar layout. The permissions modal now shows a left sidebar with 7 categories and a right panel displaying the permission toggles for the selected category. This applies to both the "Manage Permissions" modal and the "Add User" wizard (Step 2).

## Changes Made

### Types (`src/types/index.ts`)
- Added 14 new permission flags to `UserPermissions` interface:
  - `ordersConfiguration` - Orders configuration in Vendor Setup
  - `clientManagement` - Manage client companies
  - `clientUserManagement` - Manage client users
  - `orderEntry` - Order entry configuration
  - `submissions` - View order submissions
  - `trackTrace` - Track & Trace configuration
  - `driverCheckin` - Configure driver check-in system
  - `driverManagement` - Manage driver information
  - `workflowLogs` - View workflow execution logs
  - `emailPolling` - View email polling logs
  - `sftpPolling` - View SFTP polling logs
  - `checkinLogs` - View check-in logs
  - `notificationTemplates` - Manage notification templates
  - `companyBranding` - Customize company branding

### Auth Hook (`src/hooks/useAuth.ts`)
- Updated `getDefaultPermissions()` with all new flags (admin=true, user=false)
- Updated `migratePermissions()` to derive new flags from existing ones for backward compatibility

### User Management Settings (`src/components/settings/UserManagementSettings.tsx`)
- Replaced flat `permissionOptions` array with `permissionCategories` grouped into 7 categories:
  - **Pages**: Extract Page, Transform Page, Execute Page
  - **Type Setup**: Extraction Types, Transformation Types, Execute Setup, Workflows Setup
  - **Vendor Setup**: Vendor Management, Orders Configuration
  - **Client Setup**: Client Management, User Management, Order Entry, Submissions, Track & Trace
  - **Check-Ins Setup**: Driver Check-In, Driver Management
  - **Logs**: Processing Logs, Workflow Logs, Email Polling, Processed Emails, SFTP Polling, Check-In Logs
  - **Settings**: SFTP Settings, API Settings, Email Monitoring, Email Rules, Notification Templates, User Management, Company Branding
- Both the "Manage Permissions" modal and "Add User Step 2" now use a two-panel sidebar layout
- Each category shows an enabled/total count badge
- Per-category "Select All" and "Clear All" buttons

### Layout (`src/components/Layout.tsx`)
- Updated sidebar visibility logic for `logs`, `settings`, `vendor-setup`, `client-setup`, and `checkin-setup` to use the new granular permission flags

### Settings Page (`src/components/SettingsPage.tsx`)
- Updated Notification Templates tab to use `notificationTemplates` permission
- Updated Company Branding tab to use `companyBranding` permission

### Database Migration
- Migration `add_granular_permission_flags` updates all existing user permissions JSON with the new flags
- Admin users get all new permissions set to true
- Non-admin users inherit new permissions from their existing coarser permissions
