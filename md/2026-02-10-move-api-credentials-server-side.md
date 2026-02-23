# Phase 1: Move API Credentials Server-Side

## Problem Statement

Third-party API credentials are fetched to the browser in plaintext and used in direct client-side API calls. Anyone inspecting network traffic or the JS console can see these credentials.

**4 credential types currently exposed:**

| Credential | DB Table | How Exposed |
|---|---|---|
| Gemini API key | `gemini_api_keys` | Fetched to browser, used directly via Google AI SDK for extraction/detection |
| API settings password | `api_settings` | Fetched to browser, used as Bearer token in direct `fetch()` calls |
| API auth configs | `api_auth_config` | Fetched to browser in settings UI (username/password/endpoints) |
| Google Places key | `api_settings` | Fetched to browser, embedded in Google Static Maps `<img>` URLs |

---

## What Already Works Securely (No Changes Needed)

- **TrackTracePage** -- uses `track-trace-proxy` Edge Function, fetches credentials server-side
- **execute-button-processor** -- fetches Google Places key server-side for Places API calls
- **email-monitor** and **extract-order-entry-data** -- fetch Gemini key server-side from DB

---

## Work Item 1: Create a Gemini Proxy Edge Function

### Why

The Extract page (SingleFileProcessor, MultiPageProcessor), AutoDetect, and Transform auto-detection all call Google Generative AI directly from the browser with the raw API key.

### What to Build

A single new `gemini-proxy` Edge Function that:
- Accepts PDF data (base64), prompt, extraction type config, and processing mode
- Fetches the active Gemini API key from `gemini_api_keys` server-side (same pattern as `extract-order-entry-data` and `email-monitor`)
- Fetches the active model name from `gemini_models` server-side
- Calls Google Generative AI server-side
- Returns the extracted/detected data to the client

### Client-Side Files to Modify

- `src/lib/gemini.ts` -- `extractDataFromPDF()` (~line 217) and `extractJsonFromMultiPagePDF()` (~line 1337): replace direct SDK usage with `fetch()` to the new Edge Function
- `src/lib/geminiDetector.ts` -- `detectExtractionType()` (~line 101): replace direct SDK call with Edge Function call
- `src/lib/csvExtractor.ts` -- replace direct SDK usage with Edge Function call
- `src/lib/functionEvaluator.ts` -- `evaluateAddressLookup()` (~line 182): replace direct SDK call with Edge Function call
- `src/services/geminiConfigService.ts` -- `getActiveConfiguration()` no longer needs to return the raw `api_key` to the client; only `modelName` needed for display
- Remove `@google/generative-ai` imports from all client-side files

### Edge Functions to Modify (Already Exist, Currently Accept Client Key)

- `supabase/functions/pdf-transformer/index.ts` -- stop accepting `apiKey` from request body, fetch from DB server-side instead (like `extract-order-entry-data` already does)
- `supabase/functions/pdf-type-detector/index.ts` -- same change
- `supabase/functions/pdf-to-csv-extractor/index.ts` -- same change

### Components Affected (Will Call Lib Functions Which Now Go Through Edge Functions)

- `SingleFileProcessor.tsx` -- no longer needs `geminiApiKey` prop for extraction
- `MultiPageProcessor.tsx` -- no longer needs `geminiApiKey` prop
- `AutoDetectPdfUploadSection.tsx` -- no longer needs `apiKey` param
- `MultiPageTransformer.tsx` -- no longer passes `apiKey` in body to `pdf-transformer`
- `ExtractPage.tsx`, `TransformPage.tsx`, `VendorUploadPage.tsx`, `DriverCheckinPage.tsx`, `Layout.tsx`, `LayoutRouter.tsx` -- stop fetching and passing the Gemini API key

### Risk Note

The Gemini proxy involves the heaviest refactoring since extraction is the core feature and touches many components. The `gemini.ts` functions process large PDFs with complex prompts -- the Edge Function needs to handle the same request/response contract. Edge Functions have a default timeout and body size limit, so large multi-page PDFs will need to be validated against those limits.

---

## Work Item 2: Create an API Proxy Edge Function for `api_settings` Calls

### Why

`apiClient.ts`, `OrdersPage.tsx`, and `OrdersPreview.tsx` use `api_settings.password` as a Bearer token in direct browser-to-external-API calls.

### What to Build

A new `api-proxy` Edge Function that:
- Accepts the target path, HTTP method, and request body
- Fetches `api_settings.path` and `api_settings.password` from the DB server-side
- Makes the external API call server-side
- Returns the response to the client

### Files to Modify

- `src/lib/apiClient.ts` -- `sendToApi()`: replace direct `fetch()` with call to the new `api-proxy` Edge Function
- `src/components/OrdersPage.tsx` (~line 100): replace direct `fetch()` with Edge Function call
- `src/components/orders/OrdersPreview.tsx` (~line 53): replace direct `fetch()` with Edge Function call
- `src/services/configService.ts` -- `fetchApiConfig()`: stop returning `password` to the client

---

## Work Item 3: Secure `api_auth_config` Credentials in Settings UI

### Why

`configService.ts` fetches full credentials (username, password) to the browser for the settings management UI.

### What to Change

- `src/services/configService.ts` (~lines 499-558): Change `select('*')` to exclude `password` field in list/read queries. Only return `id`, `name`, `login_endpoint`, `ping_endpoint`, `token_field_name`, `is_active`, `username` (username is needed for display)
- For saving/creating configs, password can still be sent TO the server (write-only is fine)
- `src/services/configService.ts` `testApiAuthConnection()` (~line 776): Move this into an Edge Function. Currently it POSTs username/password directly from the browser to the external login endpoint. Create a `test-api-auth` Edge Function that does this server-side.
- `src/components/settings/ApiAuthSettings.tsx`: Update to handle masked password display (show "saved" indicator instead of plaintext)
- `src/lib/authenticationManager.ts`: Can potentially be removed entirely since it is unused in production and the Edge Functions handle token management themselves

---

## Work Item 4: Google Places/Maps Key for Static Maps

### Why

`FlowExecutionModal.tsx` and `FlowDesigner.tsx` embed the key in `<img src>` URLs for Google Static Maps.

### What to Change

- Create a small `static-map-proxy` Edge Function that proxies the Google Static Maps request and returns the image
- The client would use `<img src="{supabaseUrl}/functions/v1/static-map-proxy?center=...">` instead of the direct Google URL
- `src/components/common/FlowExecutionModal.tsx` (~line 957): Change `<img>` src to use the proxy
- `src/components/settings/flow/FlowDesigner.tsx` (~line 1233): Same change

---

## Work Item 5: RLS / DB Layer Hardening

### Why

Once credentials are no longer needed client-side, tighten database access so even if someone bypasses the UI, they cannot read secrets.

### What to Change

- Modify RLS policies on `gemini_api_keys` to prevent the `api_key` column from being readable by authenticated users (or restrict to admin-only for management purposes)
- Modify RLS policies on `api_settings` to exclude `password` and `google_places_api_key` from SELECT for non-admin roles
- Modify RLS policies on `api_auth_config` to exclude `password` from SELECT

---

## Execution Order

1. **Work Item 1** (Gemini proxy) -- largest scope, highest value
2. **Work Item 2** (API proxy) -- moderate scope, mirrors existing `track-trace-proxy` pattern
3. **Work Item 3** (Auth config masking) -- smaller scope, mostly UI changes plus one Edge Function
4. **Work Item 4** (Static maps proxy) -- smallest scope, two components
5. **Work Item 5** (RLS hardening) -- final lockdown after all client-side usage is removed
