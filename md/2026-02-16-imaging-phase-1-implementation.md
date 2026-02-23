# 2026-02-16 Imaging Phase 1 Implementation

## Summary

Implemented the full Imaging feature (Phase 1) including database tables, frontend UI, workflow v2 step integration, and edge function proxy.

## Database Migrations

### `create_imaging_system_tables`
- **`imaging_buckets`** - Storage bucket configurations with name, URL, description, and active status
- **`imaging_document_types`** - Document type definitions (e.g., BOL, POD, Invoice) with name, description, and active status
- **`imaging_documents`** - Document records linking a bucket + document type + detail line ID, with bill number, storage path, original filename, file size, and uploaded_by tracking
- Composite index on `(bucket_id, document_type_id, detail_line_id)` for fast lookups
- RLS enabled on all tables: admin-only write, authenticated read

### `add_imaging_step_type_to_workflow_v2_nodes`
- Added `'imaging'` to the `workflow_v2_nodes` step_type CHECK constraint

## TypeScript Types Added (`src/types/index.ts`)
- `ImagingBucket` - id, name, url, description, isActive, timestamps
- `ImagingDocumentType` - id, name, description, isActive, timestamps
- `ImagingDocument` - id, bucketId, documentTypeId, detailLineId, billNumber, storagePath, originalFilename, fileSize, uploadedBy, timestamps, plus joined fields (bucketName, documentTypeName, bucketUrl)
- Added `'imaging'` to `WorkflowV2StepType` union

## Service Layer (`src/services/imagingService.ts`)
- Full CRUD for buckets: fetchBuckets, createBucket, updateBucket, deleteBucket
- Full CRUD for document types: fetchDocumentTypes, createDocumentType, updateDocumentType, deleteDocumentType
- Document operations: fetchDocuments (with bucket/type/search filters), deleteDocument
- Uses Supabase join queries for document listing

## Frontend Components

### `src/components/ImagingPage.tsx`
- Tabbed layout (Documents + Settings) matching TypeSetupPage pattern
- Passes isAdmin prop for permission-gated actions

### `src/components/imaging/ImagingSettingsTab.tsx`
- Two-section CRUD for Buckets (name, URL, description) and Document Types (name, description)
- Toggle active/inactive, inline editing, delete confirmation
- Admin-gated create/edit/delete buttons

### `src/components/imaging/ImagingDocumentsTab.tsx`
- Table listing all documents with columns: Detail Line ID, Bill Number, Document Type, Bucket, Filename, Size, Uploaded date
- Filter dropdowns for bucket and document type
- Search bar with 300ms debounce
- View button opens PDF viewer modal
- Admin-gated delete

### `src/components/imaging/ImagingViewerModal.tsx`
- Portal-based modal rendering PDF via iframe from bucket URL + storage path
- Download link and open-in-new-tab button
- Error fallback state

## Workflow V2 Integration

### Frontend
- **WorkflowV2FlowNodes.tsx** - Added Camera icon, "Imaging" label, emerald color theme for imaging nodes
- **WorkflowV2StepConfigPanel.tsx** - Added imaging to STEP_TYPES dropdown, renders V2ImagingConfig panel
- **V2ImagingConfig.tsx** - Config UI with mode selector (PUT/GET), bucket dropdown, document type dropdown, detail line ID input (supports {{variable}} templates), bill number input (PUT only), storage path input (PUT only)

### Backend (Edge Functions)
- **`supabase/functions/imaging-proxy/index.ts`** - Edge function handling PUT (creates imaging_documents record, returns documentUrl) and GET (looks up document, returns documentUrl). Validates bucket/document type existence.
- **`supabase/functions/json-workflow-processor-v2/steps/imaging.ts`** - Step executor that resolves {{variable}} templates, calls imaging-proxy, stores results (imagingDocumentUrl, imagingDocumentId, imagingStoragePath) in contextData
- **`supabase/functions/transform-workflow-processor-v2/steps/imaging.ts`** - Same executor for transform processor
- Both processor `index.ts` files updated with import and `else if (node.step_type === 'imaging')` branch

## App Routing Changes
- `src/App.tsx` - Passes `isAdmin={user.isAdmin}` to ImagingPage
- `src/AppRouter.tsx` - Passes `isAdmin={user?.isAdmin}` to ImagingPage

## Edge Functions Deployed
- `imaging-proxy`
- `json-workflow-processor-v2` (updated)
- `transform-workflow-processor-v2` (updated)
