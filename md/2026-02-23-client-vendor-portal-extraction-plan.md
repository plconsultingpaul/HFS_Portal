# Client/Vendor Portal Extraction Plan

## Objective

Remove Parse-It extraction, transformation, execute, imaging, and type setup features from the codebase while preserving the Client Portal, Vendor Setup, Driver Check-In, and core Settings functionality. The result is a standalone Client/Vendor Portal application.

---

## What Is Being KEPT

- **Client Setup** (sidebar + all sub-features: client management, client users, order entry config, order entry templates, submissions, track & trace config)
- **Vendor Setup** (sidebar + all sub-features: vendor management, vendor upload)
- **Driver Check-In** (public page + Check-In Setup admin page + driver management + check-in logs)
- **Settings > SFTP** (SFTP connection configuration)
- **Settings > API Settings** (API endpoint config, Gemini config, Google Places config, secondary APIs, API auth config, API specs)
- **Settings > Email Monitoring** (email connection config, email rules, processed emails, email polling logs)
- **Settings > Notification Templates** (notification template editor)
- **Settings > User Management** (user CRUD, permissions, invitation emails, password reset templates)
- **Settings > Company Branding** (branding customization)
- **Settings > License** (license management)
- **Client Portal** (Order Entry, Rate Quote, Address Book, Track & Trace, Invoices, Client Users)
- **Public Pages** (Driver Check-In, Password Setup, Password Reset, Client Login, Help)
- **Logs Page** (Email Polling Logs, SFTP Polling Logs, Processed Emails, Driver Check-In Logs, Purge Logs)

## What Is Being REMOVED

- **Extract** (PDF extraction page, CSV/JSON/XML extraction pipeline)
- **Transform** (PDF transformation/rename page, multi-page transformer)
- **Execute** (Execute buttons page, public execute, flow-based execution, execute button setup)
- **Imaging** (Document imaging page, barcode indexing, imaging email monitoring, imaging SFTP processor)
- **Type Setup** (Extraction types, Transformation types, Workflows v1, Workflows v2, Execute setup)

---

## Step 1: Remove Sidebar Navigation Items

**Files to modify:**
- `src/components/Layout.tsx`
- `src/components/LayoutRouter.tsx`

**Actions:**
1. Remove these sidebar nav items from the `navItems` array:
   - `extract` (id: "extract")
   - `transform` (id: "transform")
   - `execute` (id: "execute")
   - `types` (id: "types")
   - `imaging` (id: "imaging")
2. Remove associated icon imports: `RefreshCw`, `Database`, `Play`, `Camera` (only if not used elsewhere in the same file)
3. Remove license feature checks for `extract`, `transform`, `execute`, `imaging` from the filtering logic
4. Remove permission checks for `extractPage`, `transformPage`, `executePage` from the user role filtering
5. Update the `types` permission check (remove the entire block since types is being removed)
6. Update the `logs` permission filter to remove `extractionLogs` and `workflowLogs` if they are part of it
7. Remove `getPageTitle()` and `getPageDescription()` entries for `/extract`, `/transform`, `/execute`, `/types`, `/imaging`
8. Update the default page redirect: currently redirects non-client users to `/extract` -- change to redirect to an appropriate kept page (e.g., `/client-setup` or `/settings`)

**CAUTION:** Do NOT remove nav items for: `vendor-setup`, `client-setup`, `checkin-setup`, `logs`, `settings`, `help`, or any client portal items.

---

## Step 2: Remove Routes

**Files to modify:**
- `src/AppRouter.tsx`
- `src/App.tsx`

**In `AppRouter.tsx`:**
1. Remove route definitions for:
   - `/extract` -> `ExtractPage`
   - `/transform` -> `TransformPage`
   - `/execute` -> `ExecutePage`
   - `/execute/:slug` -> `PublicExecutePage`
   - `/types` -> `TypeSetupPage`
   - `/imaging` -> `ImagingPage`
2. Remove the corresponding component imports (`ExtractPage`, `TransformPage`, `ExecutePage`, `PublicExecutePage`, `TypeSetupPage`, `ImagingPage`)
3. Update the root redirect (`/`) to navigate to a kept page instead of `/extract`
4. Remove unused type imports if any (`ExtractionType`, `TransformationType` etc.)

**In `App.tsx`:**
1. Remove page cases from the `currentPage` switch for: `extract`, `transform`, `types`, `imaging`
2. Remove the corresponding component imports
3. Update the default page (currently may default to `extract`)
4. Remove unused type imports and state variables related to removed features

**CAUTION:** Do NOT remove routes for: `/vendor-setup`, `/client-setup`, `/checkin-setup`, `/settings`, `/logs`, `/help`, `/driver-checkin`, `/checkin`, `/password-setup`, `/reset-password`, `/client/*`, `/order-entry/*`, `/rate-quote`, `/address-book`, `/track-trace`, `/shipment/:orderId`, `/invoices`, `/client-users`.

---

## Step 3: Remove Page Components

**Files to DELETE (57 component files):**

Extract page + sub-components:
- `src/components/ExtractPage.tsx`
- `src/components/extract/PdfUploadSection.tsx`
- `src/components/extract/AutoDetectPdfUploadSection.tsx`
- `src/components/extract/MultiPageProcessor.tsx`
- `src/components/extract/PageProcessorCard.tsx`
- `src/components/extract/PageGroupCard.tsx`
- `src/components/extract/ExtractionControls.tsx`
- `src/components/extract/SingleFileProcessor.tsx`
- `src/components/extract/CsvPreviewModal.tsx`

Transform page + sub-components:
- `src/components/TransformPage.tsx`
- `src/components/transform/MultiPageTransformer.tsx`
- `src/components/transform/PageTransformerCard.tsx`
- `src/components/transform/ManualGroupEditor.tsx`

Execute page + sub-components:
- `src/components/ExecutePage.tsx`
- `src/components/ExecuteModal.tsx`
- `src/components/PublicExecutePage.tsx`
- `src/components/common/FlowExecutionModal.tsx`

Imaging page + sub-components:
- `src/components/ImagingPage.tsx`
- `src/components/imaging/ImagingDocumentsTab.tsx`
- `src/components/imaging/ImagingSettingsTab.tsx`
- `src/components/imaging/ImagingUnindexedTab.tsx`
- `src/components/imaging/ImagingUploadModal.tsx`
- `src/components/imaging/ImagingViewerModal.tsx`
- `src/components/imaging/ImagingEmailMonitoringSection.tsx`

Type Setup page:
- `src/components/TypeSetupPage.tsx`
- `src/components/MappingPage.tsx`

**CAUTION:** Do NOT remove `src/components/DocumentScanner.tsx` -- it is used by `DriverCheckinPage.tsx` (KEPT).

---

## Step 4: Remove Settings Sub-Components for Removed Features

**Files to DELETE:**

Type Setup settings:
- `src/components/settings/ExtractionTypesSettings.tsx`
- `src/components/settings/TransformationTypesSettings.tsx`
- `src/components/settings/PageGroupConfigEditor.tsx`
- `src/components/settings/FieldMappingFunctionsManager.tsx`
- `src/components/settings/FunctionEditorModal.tsx`
- `src/components/settings/FunctionCopyModal.tsx`
- `src/components/settings/FunctionCopySelectionModal.tsx`
- `src/components/settings/ConditionBuilder.tsx`
- `src/components/settings/DateFunctionBuilder.tsx`
- `src/components/settings/ConfigurationImportExport.tsx` (dead code)
- `src/components/settings/ConfigurationValidator.tsx` (dead code)

Execute Setup settings:
- `src/components/settings/ExecuteSetupSettings.tsx`
- `src/components/settings/ExecuteButtonStepsSection.tsx`
- `src/components/settings/flow/FlowDesigner.tsx`
- `src/components/settings/flow/FlowNodes.tsx`

Workflow settings (v1):
- `src/components/settings/workflow/WorkflowSettings.tsx`
- `src/components/settings/workflow/WorkflowList.tsx`
- `src/components/settings/workflow/WorkflowDetail.tsx`
- `src/components/settings/workflow/StepConfigForm.tsx`
- `src/components/settings/workflow/ApiEndpointConfigSection.tsx`
- `src/components/settings/workflow/SpecFieldDropdown.tsx`
- `src/components/settings/workflow/VariableDropdown.tsx`
- `src/components/settings/workflow/StepCopyModal.tsx`
- `src/components/settings/workflow/WorkflowCopyModal.tsx`
- `src/components/settings/workflow/WorkflowCreateModal.tsx`
- `src/components/settings/workflow/WorkflowDeleteModal.tsx`
- `src/components/settings/workflow/WorkflowSelectionModal.tsx`

Workflow settings (v2):
- `src/components/settings/workflow-v2/WorkflowV2Settings.tsx`
- `src/components/settings/workflow-v2/WorkflowV2FlowDesigner.tsx`
- `src/components/settings/workflow-v2/WorkflowV2FlowNodes.tsx`
- `src/components/settings/workflow-v2/WorkflowV2StepConfigPanel.tsx`
- `src/components/settings/workflow-v2/V2AiDecisionConfig.tsx`
- `src/components/settings/workflow-v2/V2ApiEndpointConfig.tsx`
- `src/components/settings/workflow-v2/V2ImagingConfig.tsx`
- `src/components/settings/workflow-v2/V2ReadEmailConfig.tsx`

Logs settings for removed features:
- `src/components/settings/ExtractionLogsSettings.tsx`
- `src/components/settings/WorkflowExecutionLogsSettings.tsx`

**CAUTION:** Do NOT remove these settings components (they serve KEPT features):
- `GeminiConfigSettings.tsx` (used by ApiSettings -- KEPT)
- `JsonSchemaManager.tsx` (used by OrderEntryConfigSettings -- KEPT)
- `LayoutDesigner.tsx` (used by OrderEntryConfigSettings -- KEPT)
- `FormPreviewModal.tsx` (used by OrderEntryConfigSettings -- KEPT)
- `SecondaryApiSettings.tsx` (used by ApiSettings -- KEPT)
- `SecondaryApiForm.tsx` (used by SecondaryApiSettings -- KEPT)

---

## Step 5: Refactor LogsPage

**File to modify:** `src/components/LogsPage.tsx`

1. Remove imports: `ExtractionLogsSettings`, `WorkflowExecutionLogsSettings`
2. Remove tab definitions for "Extraction Logs" and "Workflow Execution Logs"
3. Remove the corresponding switch cases in tab content rendering
4. Remove now-unused props: `extractionLogs`, `extractionTypes`, `transformationTypes`, `workflowExecutionLogs`, `workflows`, `workflowSteps`, `onRefreshLogs`, `onRefreshLogsWithFilters`, `onRefreshWorkflowLogs`
5. Keep tabs: Email Polling Logs, SFTP Polling Logs, Processed Emails, Driver Check-In Logs, Purge Logs
6. Update the default active tab if it was previously set to an extraction/workflow tab

---

## Step 6: Remove Services

**Files to DELETE:**
- `src/services/fieldMappingFunctionService.ts` (Extract/Type Setup only)
- `src/services/geminiConfigService.ts` -- **WAIT, check first** -- this is imported by `Layout.tsx` and `LayoutRouter.tsx` for active model display. If you want to keep the Gemini model indicator in the header, KEEP this service. If not, remove it and clean up the header references.
- `src/services/imagingService.ts` (Imaging only)
- `src/services/typeService.ts` (Type Setup only -- manages extraction_types and transformation_types)
- `src/services/workflowService.ts` (Workflow v1 only)
- `src/services/workflowV2Service.ts` (Workflow v2 only)

**Files to REFACTOR:**
- `src/services/logService.ts` -- Remove these functions:
  - `fetchExtractionLogs()`
  - `refreshLogsWithFilters()`
  - `logExtraction()`
  - `fetchWorkflowExecutionLogs()`
  - `fetchWorkflowExecutionLogById()`
  - `fetchWorkflowStepLogs()`
  - `fetchWorkflowStepLogsByExecutionId()`
  - Keep: `fetchEmailPollingLogs()`, `fetchSftpPollingLogs()`, `fetchProcessedEmails()` and any driver check-in log functions

- `src/services/submissionService.ts` -- This is used by Order Entry (KEPT). It imports:
  - `executeWorkflow` from `../lib/workflow` (REMOVE dependency)
  - `applyFieldMappingPostProcessing` from `../lib/fieldMappingProcessor` (REMOVE dependency)
  - These need to be decoupled. Review how Order Entry submissions use these functions and either inline the minimal needed logic or remove the workflow execution from the submission flow.

**Files to KEEP (do NOT delete):**
- `src/services/apiSpecService.ts` (API Settings)
- `src/services/configService.ts` (General Settings)
- `src/services/emailService.ts` (Email Monitoring)
- `src/services/addressBookService.ts` (Client Portal)
- `src/services/orderEntryService.ts` (Client Portal)
- `src/services/licenseService.ts` (License management)

Update `src/services/index.ts` to remove exports for deleted services.

---

## Step 7: Remove Lib Files

**Files to DELETE:**
- `src/lib/gemini.ts` (direct Gemini AI calls for extraction)
- `src/lib/geminiProxy.ts` (Gemini proxy for extraction)
- `src/lib/geminiDetector.ts` (AI document type detection)
- `src/lib/csvExtractor.ts` (CSV data extraction)
- `src/lib/csvGenerator.ts` (CSV output generation)
- `src/lib/pdfTextExtractor.ts` (PDF text extraction)
- `src/lib/pdfUtils.ts` (PDF utilities for extraction)
- `src/lib/functionEvaluator.ts` (field mapping function evaluator)
- `src/lib/aiSmartDetection.ts` (AI smart detection)
- `src/lib/simpleEdgeDetection.ts` (edge detection for scanning)
- `src/lib/workflowV2.ts` (Workflow v2 execution engine)

**Files to REFACTOR (shared dependencies):**
- `src/lib/workflow.ts` -- Primarily Execute/REMOVE, but imported by `submissionService.ts`. Once `submissionService.ts` is decoupled (Step 6), this can be fully deleted.
- `src/lib/fieldMappingProcessor.ts` -- Same situation as above.
- `src/lib/jsonPayloadMapper.ts` -- Used by Order Entry submissions (KEEP). Remove any functions only used by the Extract pipeline.

**Files to KEEP:**
- `src/lib/sftp.ts`
- `src/lib/retryHelper.ts`
- `src/lib/apiClient.ts`
- `src/lib/supabase.ts`
- `src/lib/utils.ts`

---

## Step 8: Remove Hooks

**Files to DELETE:**
- `src/hooks/useWorkflowManagement.ts` (Execute feature only)

**Files to REFACTOR:**
- `src/hooks/useSupabaseData.ts` -- Remove data loading for:
  - Extraction types
  - Transformation types
  - Workflows (v1 and v2)
  - Extraction logs
  - Workflow execution logs
  - Any other state/fetching related to removed features
  - Keep: Email configs, SFTP configs, user data, and all client/vendor/driver-related data

**Files to KEEP:**
- `src/hooks/useAuth.ts`
- `src/hooks/useDarkMode.ts`
- `src/hooks/useKeyboardShortcut.ts`
- `src/hooks/useLicense.ts`
- `src/hooks/useOrderEntryForm.ts`
- `src/hooks/useToast.ts`
- `src/hooks/useUnsavedChanges.ts`

---

## Step 9: Clean Up Types

**File to modify:** `src/types/index.ts`

Remove types only used by removed features:
- `ExtractionType` and related sub-types
- `TransformationType` and related sub-types
- `FieldMapping`, `ArrayEntryConfig`, `ArrayEntryField`, `ArraySplitConfig`
- `FieldMappingFunction`, `ConditionalFunctionLogic`, `DateFunctionLogic`, `AddressLookupFunctionLogic`
- `ExtractionLog`, `WorkflowExecutionLog`
- `WorkflowStep`, `WorkflowStepType`
- `ImagingBucket`, `ImagingDocumentType`, `ImagingDocument`, `ImagingBarcodePattern`, `ImagingUnindexedItem`, `ImagingEmailMonitoringConfig`

**CAUTION:** Before removing any type, search the codebase for all usages to confirm it is not imported by any KEPT file. Some types like `FieldMapping` may be referenced in `submissionService.ts` -- clean up those references first (Step 6).

Keep types used by kept features:
- `OrderEntryConfig`, `OrderEntryJsonSchema`, `OrderEntryFieldGroup`, `OrderEntryField`, etc.
- `User`, `UserRegistrationToken`, `SecuritySettings`
- `SftpConfig`, `SettingsConfig`, `ApiConfig`
- `EmailMonitoringConfig`, `EmailProcessingRule`, `EmailPollingLog`, `ProcessedEmail`
- `CompanyBranding`, `ParseItLicense`
- All Track & Trace types, Driver Check-In types, Client/Vendor types

---

## Step 10: Remove Help Page Sections

**Files to DELETE (10 help sections):**
- `src/components/help/sections/ExtractionProcessSection.tsx`
- `src/components/help/sections/ExtractionTypesSection.tsx`
- `src/components/help/sections/TransformationTypesSection.tsx`
- `src/components/help/sections/FieldMappingsSection.tsx`
- `src/components/help/sections/AdvancedPdfProcessingSection.tsx`
- `src/components/help/sections/ConditionalUploadSection.tsx`
- `src/components/help/sections/CompleteExampleSection.tsx`
- `src/components/help/sections/ConfigurationGuideSection.tsx`
- `src/components/help/sections/AdvancedUseCasesSection.tsx`
- `src/components/help/sections/UploadModesSection.tsx`

**Files to REFACTOR (6 help sections -- remove extraction/transform/workflow references):**
- `src/components/help/sections/SettingsOverviewSection.tsx` -- Remove "Extraction Types" card
- `src/components/help/sections/EmailMonitoringSection.tsx` -- Remove/genericize extraction type processing references
- `src/components/help/sections/BestPracticesSection.tsx` -- Remove extraction instructions, template design, pattern detection, workflow design subsections
- `src/components/help/sections/TroubleshootingSection.tsx` -- Remove "AI Extraction Fails" and "Advanced Processing Issues" subsections
- `src/components/help/sections/WorkflowsSection.tsx` -- Remove entirely (workflows are being removed) or refactor heavily
- `src/components/help/sections/EmailActionsSection.tsx` -- Remove workflow/extraction references

**Files to UPDATE (help containers):**
- `src/components/help/HelpPage.tsx` -- Remove imports and JSX for deleted sections
- `src/components/help/HelpModal.tsx` -- Remove imports and JSX for deleted sections
- `src/components/HelpPage.tsx` -- This is a monolithic 1195-line duplicate. Remove all inline extraction/transform/execute/imaging content. Consider replacing it entirely with an import of the component-based `help/HelpPage.tsx`.

**Help sections to KEEP (with minor terminology updates):**
- `GettingStartedSection.tsx` -- Update intro to describe Client/Vendor Portal
- `ApiConfigurationSection.tsx`
- `UserManagementSection.tsx` -- Remove extraction/workflow permission references
- `ToolsSection.tsx` -- Remove extraction-related tool docs
- `SupportSection.tsx` -- Remove extraction terminology

---

## Step 11: Remove Edge Functions

**Edge function directories to DELETE (14 functions):**
- `supabase/functions/csv-workflow-processor/`
- `supabase/functions/email-monitor/`
- `supabase/functions/execute-button-processor/`
- `supabase/functions/imaging-email-monitor/`
- `supabase/functions/imaging-proxy/`
- `supabase/functions/imaging-sftp-processor/`
- `supabase/functions/json-workflow-processor/`
- `supabase/functions/json-workflow-processor-v2/`
- `supabase/functions/pdf-to-csv-extractor/`
- `supabase/functions/pdf-transformer/`
- `supabase/functions/pdf-type-detector/`
- `supabase/functions/sftp-poller/`
- `supabase/functions/sftp-upload/`
- `supabase/functions/transform-workflow-processor/`
- `supabase/functions/transform-workflow-processor-v2/`

Also delete the shared function evaluator (only used by removed processors):
- `supabase/functions/shared/functionEvaluator.ts`

**Edge functions to KEEP (22 functions):**
- `api-proxy` -- Generic API proxy (Settings)
- `extract-order-entry-data` -- Order Entry PDF extraction (Client Portal)
- `forgot-password` -- Authentication
- `forgot-username` -- Authentication
- `gemini-proxy` -- Gemini AI proxy (Order Entry)
- `login-with-username` -- Authentication
- `manage-auth-user` -- User Management
- `purge-logs` -- Log maintenance
- `reset-password` -- Authentication
- `send-document-email` -- Driver Check-In email
- `send-registration-email` -- User invitations
- `setup-password` -- Authentication
- `static-map-proxy` -- Driver Check-In maps
- `test-api-auth` -- Settings (API)
- `test-email-connection` -- Settings (Email)
- `test-email-send` -- Settings (Email)
- `test-gemini-key` -- Settings (API)
- `test-google-places` -- Settings (API)
- `test-office365` -- Settings (Email)
- `track-trace-proxy` -- Client Portal (Track & Trace)
- `validate-license` -- License management

**NOTE on `purge-logs`:** This function purges logs for ALL features including removed ones. After removal, the extraction/workflow log tables will be empty so the purge calls for those tables are harmless. No refactoring needed.

---

## Step 12: Clean Up Contexts

**File to review:** `src/contexts/LicenseContext.tsx`

- The license context may reference feature flags for `extract`, `transform`, `execute`, `imaging`. These can be left in place (they will simply never be checked) or cleaned up for clarity.
- The `ParseItLicense` type in `types/index.ts` contains fields for all features -- same applies.

---

## Step 13: Remove Unused npm Packages

After all code removals, check if these packages are still needed:

**Likely removable (used primarily by Extract/Transform/Imaging):**
- `pdfjs-dist` -- Check if still used by Order Entry PDF upload or DocumentScanner
- `react-pdf` -- Check if still used by any KEPT component
- `pdf-lib` -- Check if still used by any KEPT component
- `jscanify` -- Check if still used by DocumentScanner (KEPT)
- `opencv.js` -- Check if still used by DocumentScanner (KEPT)
- `reactflow` -- Used by FlowDesigner and WorkflowV2FlowDesigner (both REMOVED). Check if any KEPT component uses it
- `ogl` -- Check usage

**Packages definitely KEPT:**
- `@supabase/supabase-js`, `react`, `react-dom`, `react-router-dom`
- `lucide-react`, `tailwindcss`, `framer-motion`
- `@dnd-kit/*` -- Check if used by KEPT features (order entry drag-drop?)
- `@google/generative-ai` -- Check if used by KEPT features or only by removed extraction pipeline
- `js-yaml`, `uuid`, `utif2`
- All devDependencies (build tools)

Run `npm run build` after removals to identify any remaining dead imports.

---

## Step 14: Clean Up Miscellaneous Files

**Files to review/remove:**
- `src/components/Layout.tsx.backup` -- Remove (dead backup file)
- `src/config/API Sample.json` -- Review if still needed
- `src/config/TRUCKMATE_API.JSON` -- Review if still needed
- `src/components/settings/APISpecs copy.tsx` -- Remove (dead copy file)
- `portable_migrate_to_supabase_auth.sql` -- Review if still needed

**MD documentation files to review:**
- Many files in `/md/` reference extraction, transformation, workflow features. These are historical documentation and can be kept for reference or removed as a batch cleanup.

---

## Step 15: Build Verification

1. Run `npm run build` to verify no broken imports or type errors
2. Fix any compilation errors from dangling references to removed files
3. Test all kept features:
   - Admin login
   - Client login
   - Sidebar navigation (verify removed items are gone)
   - Client Setup page
   - Vendor Setup page
   - Check-In Setup page
   - Driver Check-In public page
   - Settings page (all kept tabs: SFTP, API, Email, Notifications, Users, Branding, License)
   - Logs page (all kept tabs: Email Polling, SFTP Polling, Processed Emails, Check-In, Purge)
   - Client Portal pages (Order Entry, Rate Quote, Address Book, Track & Trace, Invoices, Client Users)
   - Help page (verify removed sections are gone)

---

## Execution Order Summary

| Step | Action | Risk Level | Description |
|------|--------|------------|-------------|
| 1 | Sidebar nav | Low | Remove nav items and permission checks |
| 2 | Routes | Low | Remove route definitions and redirects |
| 3 | Page components | Low | Delete page-level component files |
| 4 | Settings sub-components | Low | Delete settings components for removed features |
| 5 | Refactor LogsPage | Medium | Remove extraction/workflow log tabs, clean up props |
| 6 | Services | Medium | Delete removed-feature services, refactor shared services |
| 7 | Lib files | Medium | Delete extraction/workflow libs, decouple shared deps |
| 8 | Hooks | Medium | Delete workflow hook, refactor useSupabaseData |
| 9 | Types | Medium | Remove unused type definitions |
| 10 | Help pages | Low | Delete/refactor help sections |
| 11 | Edge functions | Low | Delete edge function directories |
| 12 | Contexts | Low | Clean up license context |
| 13 | npm packages | Low | Remove unused dependencies |
| 14 | Miscellaneous | Low | Clean up dead files |
| 15 | Build verification | Critical | Verify everything compiles and works |

**Recommended approach:** Execute steps 1-4 first (low risk, high visibility), then steps 5-9 (medium risk, requires careful dependency tracing), then steps 10-14 (cleanup), and finally step 15 (verification). After each step, run `npm run build` to catch errors early.

---

## Critical Safety Notes

1. **NEVER remove anything imported by a KEPT component without first removing or updating that import**
2. **DocumentScanner.tsx is KEPT** -- it is used by DriverCheckinPage, not by the Extract feature
3. **GeminiConfigSettings.tsx is KEPT** -- it is used by the Settings > API Settings tab
4. **SecondaryApiSettings.tsx and SecondaryApiForm.tsx are KEPT** -- used by Settings > API Settings
5. **submissionService.ts must be refactored** before deleting `workflow.ts` and `fieldMappingProcessor.ts`
6. **useSupabaseData.ts must be refactored** to remove data loading for deleted features while preserving all data loading for kept features
7. **Always search for imports before deleting any file** to catch any missed dependencies
8. **The email-monitor edge function is being REMOVED** -- it processes emails through the extraction pipeline. The Settings > Email Monitoring configuration UI is KEPT (for configuring connections and rules), but the actual extraction processing engine is removed. If email-triggered processing is needed for the portal, this will need to be re-evaluated.
