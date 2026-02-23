# 2026-02-16 - Add Configuration Change Tracking Logs

## Summary
Added a change tracking system that logs who and when made changes to Extraction Types, Transformation Types, Execute Setup, and Workflow v2 configurations. Each page now has a "Logs" button that opens a modal showing the change history (latest first).

## Database Changes

### New Table: `config_change_logs`
- `id` (uuid, primary key)
- `config_type` (text) - one of: `extraction`, `transformation`, `execute`, `workflow_v2`
- `item_name` (text) - name of the specific item that was changed
- `changed_by` (uuid) - references auth.users
- `changed_by_username` (text) - stored for display without joins
- `created_at` (timestamptz) - when the change occurred

### RLS Policies
- Authenticated users can read all logs
- Authenticated users can insert their own logs (checked via `auth.uid()`)

### Indexes
- Composite index on `(config_type, created_at DESC)` for fast filtered queries

## Frontend Changes

### New Component
- `src/components/common/ConfigChangeLogsModal.tsx` - Shared modal component and `logConfigChange` helper function

### Modified Files
- `src/components/TypeSetupPage.tsx` - Passes `currentUser` to all 4 settings components
- `src/components/settings/ExtractionTypesSettings.tsx` - Added Logs button + log on save
- `src/components/settings/TransformationTypesSettings.tsx` - Added Logs button + log on save
- `src/components/settings/ExecuteSetupSettings.tsx` - Added Logs button + log on save (logs on create/update of buttons, categories, groups, fields)
- `src/components/settings/workflow-v2/WorkflowV2Settings.tsx` - Added Logs button + log on create/edit

## How It Works
- When a user saves changes, a log entry is automatically inserted with the user's ID, username, and the name of the item being changed
- Each page has a gray "Logs" button that opens a modal showing the 100 most recent changes for that config type
- Logs display the username, item name, and timestamp sorted newest first
