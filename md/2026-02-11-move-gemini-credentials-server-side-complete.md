# Move Gemini API Credentials Server-Side -- Changelog

All steps from `2026-02-10-move-gemini-credentials-server-side-steps.md` are now complete. The Gemini API key is no longer sent from the browser to any edge function or used client-side.

---

## Steps 1-3: New server-side infrastructure

### New edge functions
- **`gemini-proxy`** -- General-purpose proxy that accepts `{ contents }`, fetches the active API key and model from the database, calls Google Generative AI, and returns `{ text }`.
- **`test-gemini-key`** -- Settings-only function for testing keys and listing available models by key row ID (never exposes the raw key to the browser).

### New client helper
- **`src/lib/geminiProxy.ts`** -- `callGeminiProxy(contents, operationName)` sends requests through the edge function proxy with retry logic.

---

## Steps 4-6: Client libraries migrated to proxy

### `src/lib/gemini.ts`
- Removed `GoogleGenerativeAI` import and direct SDK usage.
- Removed `apiKey` from `ExtractionRequest` and `JsonMultiPageExtractionRequest` interfaces.
- `extractDataFromPDF` and `extractJsonFromMultiPagePDF` now call `callGeminiProxy()`.

### `src/lib/geminiDetector.ts`
- Removed `GoogleGenerativeAI` import and direct SDK usage.
- Removed `apiKey` from `DetectionRequest` interface.
- `detectExtractionType` now calls `callGeminiProxy()` for both text-based and image-based detection.

### `src/lib/csvExtractor.ts`
- Removed `GoogleGenerativeAI` import and direct SDK usage.
- Removed `apiKey` from `CsvExtractionRequest` and `CsvMultiPageExtractionRequest` interfaces.
- `extractCsvFromPDF` and `extractCsvFromMultiPagePDF` now call `callGeminiProxy()`.

### `src/lib/functionEvaluator.ts`
- Removed `GoogleGenerativeAI` import, `supabase` import, and `getApiKey()` helper.
- `evaluateAddressLookup` now calls `callGeminiProxy()`.

### `src/lib/aiSmartDetection.ts`
- Removed `GoogleGenerativeAI` import and `geminiConfigService` import.
- Removed `apiKey` requirement from `SmartDetectionRequest` and `SmartDetectionImageRequest` interfaces.
- `detectPatternWithAI` and `detectPatternWithAIImage` now call `callGeminiProxy()`.
- Removed unused `getActiveModelName()` helper and `PageTextPreviewRequest.apiKey` field.

---

## Step 7: Service layer updated

### `src/services/geminiConfigService.ts`
- Removed `GoogleGenerativeAI` import.
- Removed `apiKey` from `ActiveGeminiConfig` interface.
- `getActiveConfiguration()` no longer queries `gemini_api_keys` (only fetches the active model name).
- `testApiKey` replaced with `testApiKeyById(apiKeyId)` -- calls `test-gemini-key` edge function.
- `fetchAvailableModels` replaced with `fetchAvailableModelsByKeyId(apiKeyId)` -- calls `test-gemini-key` edge function.

---

## Step 8: Component prop chain removed

### Parent pages (removed `geminiApiKey` state and loading):
- `ExtractPage.tsx`
- `TransformPage.tsx`
- `VendorUploadPage.tsx`
- `DriverCheckinPage.tsx`

### Child components (removed `geminiApiKey` / `apiKey` prop):
- `SingleFileProcessor.tsx`
- `MultiPageProcessor.tsx`
- `AutoDetectPdfUploadSection.tsx`
- `MultiPageTransformer.tsx`
- `PageTransformerCard.tsx`

### Settings page:
- `GeminiConfigSettings.tsx` -- updated to use `testApiKeyById` and `fetchAvailableModelsByKeyId`; no longer displays raw API key values.

---

## Step 9: Edge functions fetch key from database

### `pdf-transformer/index.ts`
- Made `apiKey` optional in request interface (backwards-compatible).
- Fetches active API key value from `gemini_api_keys` table using service role.
- Fetches active model name from `gemini_models` table.
- Uses database-fetched key for `GoogleGenerativeAI` initialization instead of client-provided key.
- Fixed deprecated imports (`esm.sh` to `npm:`, `serve` to `Deno.serve`).
- Updated CORS headers to include `X-Client-Info` and `Apikey`.

### `pdf-type-detector/index.ts`
- Added Supabase client (`npm:@supabase/supabase-js@2`).
- Made `apiKey` optional in request interface.
- Fetches active API key and model from database.
- Replaced hardcoded `'gemini-2.5-pro'` model with database-configured model.

### `pdf-to-csv-extractor/index.ts`
- Fixed bare specifier imports to use `npm:` prefix.
- Made `apiKey` optional in request interface.
- Fetches active API key value from database for initialization.
- Removed `apiKey` from required field validation.

---

## Step 10: Cleanup and verification

- Confirmed `@google/generative-ai` is no longer imported anywhere in `src/`.
- The package remains in `package.json` (edge functions reference it via `npm:` specifiers independently).
- Client bundle size reduced by ~32KB (SDK no longer bundled).
- `npm run build` passes cleanly with zero errors.

---

## Security improvement

The Gemini API key is now exclusively server-side. It is:
- Stored in the `gemini_api_keys` database table
- Fetched only by edge functions using the service role key
- Never sent to or from the browser
- Never included in client-side JavaScript bundles
