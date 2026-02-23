# 2026-02-16 - Imaging Email Monitoring for Barcode Indexing

## Summary

Added email polling capability to the Imaging system, allowing PDFs received via email to be scanned for barcodes and indexed into imaging buckets -- the same way SFTP polling already works. A completely separate set of credentials is used for imaging email monitoring, independent from the existing email monitoring and its "Separate Monitoring Credentials" section.

## Database Changes

### New Table: `imaging_email_monitoring_config`
Singleton configuration table for imaging-specific email monitoring credentials and settings.

- `provider` (text) - office365 or gmail
- Office 365 credentials: `tenant_id`, `client_id`, `client_secret`
- Gmail credentials: `gmail_client_id`, `gmail_client_secret`, `gmail_refresh_token`
- `monitored_email` / `gmail_monitored_label` - target mailbox
- `imaging_bucket_id` (FK to `imaging_buckets`) - default target bucket for scanned PDFs
- `polling_interval` - how often to poll (minutes)
- `is_enabled` - master toggle
- `last_check` - timestamp of last successful poll
- `check_all_messages` - ignore last_check and process all unread emails
- `post_process_action` / `processed_folder_path` - what to do with emails after successful processing
- `post_process_action_on_failure` / `failure_folder_path` - what to do on failure
- Cron scheduling fields: `cron_enabled`, `cron_job_id`, `cron_schedule`, `last_cron_run`, `next_cron_run`

RLS: Admin-only for all CRUD operations. Service role can SELECT and UPDATE for edge function use.

### Modified Table: `imaging_unindexed_queue`
- Added `source_type` (text, default 'sftp') - distinguishes whether the PDF came from SFTP or Email
- Added `source_email_config_id` (uuid, FK to `imaging_email_monitoring_config`) - tracks email config source

## Edge Functions

### New: `imaging-email-monitor`
- Loads config from `imaging_email_monitoring_config`
- Authenticates with Office 365 or Gmail using the imaging-specific credentials
- Fetches unread emails with PDF attachments
- For each PDF: calls `imaging-sftp-processor` to scan barcodes via Gemini Vision
- Applies post-processing actions (mark read, move, archive, delete)
- Logs results to `email_polling_logs`
- Updates `last_check` timestamp

### Updated: `imaging-sftp-processor`
- Now accepts optional `emailConfigId` and `sourceType` parameters
- Passes `source_email_config_id` and `source_type` to `imaging_unindexed_queue` inserts
- Backwards compatible - existing SFTP calls continue to work unchanged

## Frontend Changes

### New Component: `ImagingEmailMonitoringSection`
Located in `src/components/imaging/ImagingEmailMonitoringSection.tsx`

Collapsible section in the Imaging Settings tab with:
- Provider selector (Office 365 / Gmail)
- Credential fields (tenant/client/secret for O365, or client/secret/refresh for Gmail)
- Monitored email address / Gmail label
- Target imaging bucket dropdown
- Polling interval
- Enable/Disable toggle
- Check All Messages toggle
- After Processing actions (Success and Failure) with folder path inputs
- Test Connection, Run Now, and Save buttons

### Updated: `ImagingSettingsTab`
- Added `ImagingEmailMonitoringSection` at the bottom of the settings tab

### Updated: `ImagingUnindexedTab`
- Each unindexed item now shows a source badge (SFTP or Email) with corresponding icon
- Empty state message updated to mention both SFTP and Email sources

### Updated Types: `src/types/index.ts`
- `ImagingUnindexedItem` now includes `sourceEmailConfigId` and `sourceType` fields
- New `ImagingEmailMonitoringConfig` interface

### Updated Service: `src/services/imagingService.ts`
- Added `fetchImagingEmailConfig()` and `updateImagingEmailConfig()` functions
- Updated `mapUnindexedItem()` to include new source fields

## How It Works

1. Configure imaging email credentials in Imaging > Settings > Imaging Email Monitoring
2. Select the target imaging bucket where indexed documents will be stored
3. Enable monitoring and optionally run manually with "Run Now"
4. The edge function polls the email inbox for unread emails with PDF attachments
5. Each PDF is sent to the `imaging-sftp-processor` which uses Gemini Vision to detect barcodes
6. Barcodes are matched against the configured barcode patterns (e.g., "BOL-12345", "Invoice-67890")
7. Matched documents are indexed into `imaging_documents` with the parsed documentType and detailLineId
8. Unmatched documents go into the Unindexed Queue where users can manually index them
9. After processing, the email is handled according to the configured post-processing action
