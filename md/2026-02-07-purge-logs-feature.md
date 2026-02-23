# 2026-02-07 Purge Logs Feature

## Summary
Added a Purge tab to the Logs page that allows admin users to permanently delete old log entries. Users can select which log types to purge and how many days of data to retain.

## Changes

### 1. New File: `src/components/settings/PurgeLogsSettings.tsx`
- New component rendering the Purge Logs UI
- Checkbox list of all 6 log types with Check All / Uncheck All toggle
- Retention period selector (7, 14, 30, 60, 90, 180, 365 days)
- Displays the calculated cutoff date
- Safety confirmation step requiring the user to type "PURGE" before executing
- Shows per-table deletion results after completion
- Includes an irreversibility warning banner

### 2. New File: `supabase/functions/purge-logs/index.ts`
- Supabase Edge Function that performs the actual log deletion server-side using the service role key
- Accepts `logTypes` (array of table names) and `retentionDays` (number)
- Validates input against a whitelist of allowed table names
- Handles child table cleanup (workflow_step_logs and driver_checkin_documents) before deleting parent rows
- Returns per-table counts of deleted records

### 3. Modified: `src/components/LogsPage.tsx`
- Added `isAdmin` prop to the component interface
- Added `'purge'` to the `LogsTab` union type
- Purge tab (with Trash2 icon) is conditionally appended to the tab list only when `isAdmin` is true
- Added `case 'purge'` to the renderTabContent switch to render PurgeLogsSettings

### 4. Modified: `src/App.tsx`
- Added `isAdmin={user?.isAdmin}` prop to the LogsPage component

### 5. Modified: `src/AppRouter.tsx`
- Added `isAdmin={user?.isAdmin}` prop to the LogsPage component

## Log Types Supported
| Log Type | Table | Date Column | Child Table |
|----------|-------|-------------|-------------|
| Processing Logs | `extraction_logs` | `created_at` | - |
| Workflow Logs | `workflow_execution_logs` | `created_at` | `workflow_step_logs` |
| Email Polling | `email_polling_logs` | `created_at` | - |
| Processed Emails | `processed_emails` | `processed_at` | - |
| SFTP Polling | `sftp_polling_logs` | `created_at` | - |
| Check-In Logs | `driver_checkin_logs` | `created_at` | `driver_checkin_documents` |

## Access Control
- The Purge tab is only visible to admin users (`isAdmin` flag)
- Non-admin users see no change to the Logs page
