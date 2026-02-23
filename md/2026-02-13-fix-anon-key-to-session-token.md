# Fix Anon Key Usage - Replace with Session Token

All files below hardcode `VITE_SUPABASE_ANON_KEY` in Authorization headers instead of using the existing `getAuthHeaders()` helper from `src/lib/supabase.ts`, which correctly retrieves the logged-in user's session token.

The fix for every file is the same: import `getAuthHeaders` and replace the hardcoded anon key with `await getAuthHeaders()`.

---

## Step 1 - Core Libraries

These are shared utility files used across many components.

| File | Edge Functions Called |
|---|---|
| `src/lib/apiClient.ts` | `api-proxy` |
| `src/lib/sftp.ts` | `sftp-upload` |
| `src/lib/workflow.ts` | `json-workflow-processor`, `csv-workflow-processor`, `transform-workflow-processor` |

---

## Step 2 - Service Files

Backend service abstractions that call edge functions for testing/validation.

| File | Edge Functions Called |
|---|---|
| `src/services/configService.ts` | `test-api-auth` |
| `src/services/geminiConfigService.ts` | `test-gemini-key` (4 separate calls) |

---

## Step 3 - Extraction Components

PDF extraction pipeline components.

| File | Edge Functions Called |
|---|---|
| `src/components/extract/MultiPageProcessor.tsx` | `pdf-type-detector`, `pdf-to-csv-extractor`, REST API calls to `workflow_execution_logs` |
| `src/components/extract/SingleFileProcessor.tsx` | `pdf-type-detector`, `pdf-to-csv-extractor` |
| `src/components/extract/AutoDetectPdfUploadSection.tsx` | `pdf-type-detector` |

---

## Step 4 - Transform Components

PDF transformation pipeline components.

| File | Edge Functions Called |
|---|---|
| `src/components/transform/PageTransformerCard.tsx` | `pdf-transformer` |
| `src/components/transform/MultiPageTransformer.tsx` | `transform-workflow-processor` |

---

## Step 5 - Settings Components (API, Gemini, Google Places)

Settings pages that test external service connections.

| File | Edge Functions Called |
|---|---|
| `src/components/settings/ApiSettings.tsx` | `api-proxy` |
| `src/components/settings/GooglePlacesSettings.tsx` | `test-google-places` |
| `src/components/settings/PurgeLogsSettings.tsx` | `purge-logs` |

---

## Step 6 - Settings Components (Email, Vendors, Execute)

Settings pages for email monitoring, vendor rules, and execute flow.

| File | Edge Functions Called |
|---|---|
| `src/components/settings/EmailMonitoringSettings.tsx` | `test-email-connection`, `test-office365`, `email-monitor`, `test-email-send` |
| `src/components/settings/VendorManagementSettings.tsx` | REST API calls to `vendor_extraction_rules` |
| `src/components/settings/flow/FlowDesigner.tsx` | `execute-button-processor` |

---

## Step 7 - Orders Components

Order display pages that proxy API calls.

| File | Edge Functions Called |
|---|---|
| `src/components/orders/OrdersPreview.tsx` | `api-proxy` |
| `src/components/OrdersPage.tsx` | `api-proxy` |

---

## Not In Scope (Acceptable Anon Key Usage)

These are public/pre-auth endpoints where users are not yet logged in. Anon key is correct here.

- `src/components/auth/ForgotCredentialsModal.tsx` - forgot-username, forgot-password
- `src/components/PasswordResetPage.tsx` - reset-password
- `src/components/PasswordSetupPage.tsx` - setup-password
- `src/components/LoginPage.tsx` - login-with-username
- `src/components/ClientLoginPage.tsx` - login-with-username
