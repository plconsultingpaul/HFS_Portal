# 2026-02-16 Imaging SFTP Barcode Indexing System

## Summary

Added the ability for SFTP Polling to download PDFs, scan them for barcodes using Gemini Vision AI, and automatically index them into Imaging Buckets based on configurable barcode patterns. PDFs that don't match any configured pattern are placed into an Unindexed Queue for manual review and indexing.

## Database Changes

### New Tables

- **`imaging_barcode_patterns`** - Configurable barcode pattern templates that define how barcodes map to document types and detail line IDs
  - `name` - Human-readable pattern name
  - `pattern_template` - Template like `{documentType}-{detailLineId}` with placeholder tokens
  - `separator` - Character that separates tokens in the barcode (e.g., `-`)
  - `fixed_document_type` - Optional fixed document type override (when template has no `{documentType}` token)
  - `bucket_id` - Which imaging bucket this pattern applies to
  - `priority` - Order of evaluation (lower = first match wins)
  - `is_active` - Toggle patterns on/off

- **`imaging_unindexed_queue`** - Holds PDFs that could not be automatically indexed
  - `bucket_id` - Target imaging bucket
  - `storage_path` - Path to uploaded PDF in Supabase storage
  - `original_filename` - Source filename from SFTP
  - `file_size` - File size in bytes
  - `detected_barcodes` - JSONB array of all barcodes Gemini detected
  - `source_sftp_config_id` - Which SFTP config retrieved this file
  - `status` - `pending`, `indexed`, or `discarded`
  - `detail_line_id`, `document_type_id`, `bill_number` - Set when manually indexed
  - `indexed_by`, `indexed_at` - Audit fields

### Modified Tables

- **`sftp_polling_configs`** - Added two columns:
  - `processing_mode` - `extraction`, `transformation`, or `imaging` (defaults to `extraction`)
  - `imaging_bucket_id` - Foreign key to `imaging_buckets` (used when mode is `imaging`)

### RLS Policies

- All new tables have RLS enabled
- Authenticated users can SELECT
- Only admins can INSERT/UPDATE/DELETE barcode patterns
- Service role can INSERT/UPDATE unindexed queue items (for edge function use)
- Admins can UPDATE/DELETE unindexed queue items (for manual indexing)

## Edge Functions

### New: `imaging-sftp-processor`

Core processing function called by the SFTP poller when in imaging mode:

1. Receives PDF as base64 along with bucket ID and SFTP config ID
2. Sends PDF to Gemini Vision AI with a prompt to detect all barcodes
3. Fetches active barcode patterns for the target bucket, ordered by priority
4. Attempts to match each detected barcode against each pattern template
5. On first match: creates an `imaging_documents` record with the resolved detail line ID, document type, and bill number
6. On no match: inserts into `imaging_unindexed_queue` with all detected barcodes for manual review

### Modified: `sftp-poller`

- Added imaging mode branch: when `processing_mode === 'imaging'`, calls the `imaging-sftp-processor` edge function instead of the extraction/transformation processors
- Passes the PDF as base64, original filename, file size, bucket ID, and SFTP config ID

## Frontend Changes

### Modified: `ImagingSettingsTab.tsx`

- Added a new "Barcode Patterns" configuration section below Document Types
- Supports full CRUD for barcode patterns: create, edit, toggle active/inactive, delete
- Info panel explains template syntax and how pattern matching works
- Each pattern shows its template, separator, fixed document type, target bucket, priority, and active status

### New: `ImagingUnindexedTab.tsx`

- New tab on the Imaging page showing the unindexed queue
- Filters by bucket and status (pending/indexed/discarded)
- Each item shows filename, detected barcodes, file size, date, and status
- "View" button opens the PDF in the existing ImagingViewerModal
- "Index" button opens an inline form to manually set detail line ID, document type, and bill number
- Auto-prefills fields from the first detected barcode when possible
- "Discard" button removes items from the queue
- On successful indexing, creates an `imaging_documents` record and marks the queue item as indexed

### Modified: `ImagingPage.tsx`

- Added "Unindexed Queue" tab between Documents and Settings tabs

### Modified: `SftpPollingSettings.tsx`

- Added "Processing Mode" dropdown with three options: Extraction, Transformation, Imaging
- Added "Target Imaging Bucket" selector (only visible in imaging mode)
- Extraction type and workflow fields are hidden when in imaging mode
- Updated info panel to describe imaging mode

### Modified: `useSupabaseData.ts`

- Save function now persists `processing_mode` and `imaging_bucket_id` fields for SFTP polling configs

## Type Changes

### `src/types/index.ts`

- Added `SftpPollingConfig` interface (was previously missing despite being imported)
- Added `configId` to `SftpPollingLog`
- Added `ImagingBarcodePattern` interface
- Added `ImagingUnindexedItem` interface

### `src/services/imagingService.ts`

- Added mapper functions for new types
- Added CRUD functions for barcode patterns
- Added queue functions: fetch, index, discard

## Edge Functions Deployed

- `imaging-sftp-processor` (new)
- `sftp-poller` (updated)
