# 2026-02-16 - Imaging Documents Manual Upload

## Summary

Added an Upload button to the Imaging Documents tab that allows users to manually upload a document by selecting a file, choosing a bucket and document type, and entering a bill number.

## Changes

### New File: `src/components/imaging/ImagingUploadModal.tsx`
- Modal with file picker (drag-and-drop + click), bucket dropdown, document type dropdown, and bill number text input.
- Accepts PDF, TIFF, PNG, and JPG files.
- Only shows active buckets and active document types in the dropdowns.
- Includes loading state, error handling, and validation (file + bucket + document type are required).

### Modified: `src/components/imaging/ImagingDocumentsTab.tsx`
- Added an "Upload" button next to the Refresh button in the toolbar.
- Renders `ImagingUploadModal` when the button is clicked.
- Newly uploaded documents are prepended to the documents list immediately on success.

### Modified: `src/services/imagingService.ts`
- Added `uploadDocument()` function that:
  - Uploads the file to Supabase storage (`pdfs` bucket) under `imaging/manual/{uuid}.{ext}`.
  - Gets the public URL from Supabase storage.
  - Inserts a record into `imaging_documents` with the full public URL as `storage_path`.
  - Auto-generates `detail_line_id` as `MANUAL-{short-uuid}`.

### Modified: `src/components/imaging/ImagingViewerModal.tsx`
- Updated the document URL resolution to check if `storage_path` starts with `http`. If so, uses it directly as the document URL instead of concatenating `bucketUrl + storagePath`. This ensures manually uploaded documents (stored in Supabase storage) are viewable in the viewer without breaking the existing bucket-URL-based resolution for documents uploaded through other workflows.
