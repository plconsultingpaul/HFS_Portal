# Move Gemini API Credentials Server-Side -- Step-by-Step Plan

This breaks Work Item 1 from `2026-02-10-move-api-credentials-server-side.md` into small, independent steps that can each be completed within a single AI session.

**Current state:** No code changes have been made. All files are in their original state. The only existing artifact is the planning document.

---

## Step 1: Create the `gemini-proxy` Edge Function

**Scope:** 1 new file, 1 deploy

Create and deploy `supabase/functions/gemini-proxy/index.ts`.

This function:
- Accepts `{ contents: any[] }` in the request body (same shape as Google Generative AI SDK's `generateContent` input)
- Uses `SUPABASE_SERVICE_ROLE_KEY` to create a Supabase admin client
- Queries `gemini_api_keys` for the active key (same pattern as `extract-order-entry-data/index.ts` lines 69-73)
- Queries `gemini_models` for the active model linked to that key
- Calls Google Generative AI with `npm:@google/generative-ai@0.24.1`
- Returns `{ text: string }` on success, `{ error: string }` on failure
- Includes standard CORS headers and OPTIONS handling

**Reference:** `supabase/functions/extract-order-entry-data/index.ts` lines 65-95 for the DB fetch pattern.

**Verification:** Deploy via `mcp__supabase__deploy_edge_function`. No client-side changes needed yet.

---

## Step 2: Create the `test-gemini-key` Edge Function

**Scope:** 1 new file, 1 deploy

Create and deploy `supabase/functions/test-gemini-key/index.ts`.

This function:
- Accepts `{ apiKeyId: string, mode: "test" | "list_models", modelName?: string }`
- Fetches the actual API key from `gemini_api_keys` by row ID using service role
- In `test` mode: instantiates the SDK and sends a test prompt, returns success/failure
- In `list_models` mode: calls `https://generativelanguage.googleapis.com/v1beta/models?key=...` server-side, returns filtered list of `gemini-*` models
- Standard CORS headers

**Why separate from Step 1:** This is only used by the Settings UI for key management. Keeping it separate limits blast radius.

**Verification:** Deploy and test via curl or the settings page (after Step 8).

---

## Step 3: Create the `src/lib/geminiProxy.ts` client helper

**Scope:** 1 new file

Create `src/lib/geminiProxy.ts` with a single exported function:

```typescript
export async function callGeminiProxy(contents: any[], operationName?: string): Promise<string>
```

- Sends POST to `${VITE_SUPABASE_URL}/functions/v1/gemini-proxy`
- Includes `Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}` header
- Uses `withRetry` from `./retryHelper` for transient failures
- Returns `data.text` from the response
- Throws on errors

**Verification:** `npm run build` should pass (file is unused at this point).

---

## Step 4: Update `src/lib/gemini.ts` to use the proxy

**Scope:** 1 file edit

Changes:
- Remove `import { GoogleGenerativeAI } from '@google/generative-ai'`
- Add `import { callGeminiProxy } from './geminiProxy'`
- Remove `apiKey` from `ExtractionRequest` interface (~line 217)
- Remove `apiKey` from `JsonMultiPageExtractionRequest` interface (~line 232)
- In `extractDataFromPDF`: remove `apiKey` destructuring, remove key validation, replace the `model.generateContent(...)` call with `callGeminiProxy(contents, 'PDF extraction')` -- the `contents` array should match what was previously passed to the SDK
- In `extractJsonFromMultiPagePDF`: same treatment
- Remove `getActiveModelName()` helper if it exists and is only used locally
- Remove `import { geminiConfigService }` if no longer needed

**Verification:** `npm run build` -- will show errors in files that still pass `apiKey` to these functions. That's expected; they get fixed in Steps 7-8.

---

## Step 5: Update `src/lib/geminiDetector.ts` to use the proxy

**Scope:** 1 file edit

Changes:
- Remove `import { GoogleGenerativeAI }`
- Add `import { callGeminiProxy } from './geminiProxy'`
- Remove `apiKey` from `DetectionRequest` interface (~line 75)
- In `detectExtractionType`: remove `apiKey` destructuring and validation, replace `model.generateContent(...)` calls (both text-based and image-based detection paths) with `callGeminiProxy()`
- Remove `getActiveModelName()` if only used locally

**Verification:** `npm run build` -- same expected downstream errors.

---

## Step 6: Update `src/lib/csvExtractor.ts` and `src/lib/functionEvaluator.ts` to use the proxy

**Scope:** 2 file edits

### csvExtractor.ts
- Remove `GoogleGenerativeAI` import, add `callGeminiProxy` import
- Remove `apiKey` from `CsvExtractionRequest` and `CsvMultiPageExtractionRequest` interfaces
- In `extractCsvFromPDF` and `extractCsvFromMultiPagePDF`: remove `apiKey` usage, replace SDK calls with `callGeminiProxy()`

### functionEvaluator.ts
- Remove `GoogleGenerativeAI` import and `supabase` import (if only used for getApiKey)
- Add `callGeminiProxy` import
- Remove `getApiKey()` function (~line 168)
- In `evaluateAddressLookup`: replace `new GoogleGenerativeAI(apiKey)` + `model.generateContent()` with `callGeminiProxy([prompt], 'address lookup')`

**Verification:** `npm run build` -- downstream errors still expected.

---

## Step 7: Update `src/services/geminiConfigService.ts`

**Scope:** 1 file edit

Changes:
- Remove `import { GoogleGenerativeAI }`
- Remove `apiKey` from `ActiveGeminiConfig` interface (keep only `modelName`)
- `getActiveConfiguration()`: stop querying `gemini_api_keys` -- only query `gemini_models` for active model name
- Replace `testApiKey(apiKey, modelName?, useListModels?)` with `testApiKeyById(apiKeyId, modelName?)` -- calls `test-gemini-key` Edge Function
- Replace `fetchAvailableModels(apiKey)` with `fetchAvailableModelsByKeyId(apiKeyId)` -- calls `test-gemini-key` Edge Function with `mode: 'list_models'`
- Remove or update `getExistingModelNames()` if unchanged

**Verification:** `npm run build` -- will show errors in `GeminiConfigSettings.tsx`. Fixed in Step 8.

---

## Step 8: Remove `geminiApiKey` prop chain from all components

**Scope:** ~10 file edits

### Parent pages (remove state + useEffect that fetches key):
- `src/components/ExtractPage.tsx` -- remove `geminiApiKey` state, remove `loadGeminiConfig` useEffect, stop passing to children
- `src/components/TransformPage.tsx` -- same
- `src/components/VendorUploadPage.tsx` -- same
- `src/components/DriverCheckinPage.tsx` -- same

### Child components (remove prop from interface + usage):
- `src/components/extract/SingleFileProcessor.tsx` -- remove `geminiApiKey` from props interface, remove from extraction calls
- `src/components/extract/MultiPageProcessor.tsx` -- same
- `src/components/extract/AutoDetectPdfUploadSection.tsx` -- remove `apiKey` from props interface
- `src/components/transform/MultiPageTransformer.tsx` -- remove `geminiApiKey` from props, conditions, useEffect deps
- `src/components/transform/PageTransformerCard.tsx` -- remove `geminiApiKey` from props and request body sent to `pdf-transformer`

### Settings page:
- `src/components/settings/GeminiConfigSettings.tsx` -- update to use new service method signatures (`testApiKeyById`, `fetchAvailableModelsByKeyId`); remove any direct `apiKey` value display (show masked/indicator instead)

**Verification:** `npm run build` should now pass cleanly.

---

## Step 9: Update existing edge functions to fetch key from DB

**Scope:** 3 file edits, 3 deploys

### pdf-transformer/index.ts
- Make `apiKey` optional in the request interface (or remove it)
- Add Supabase client creation (if not already present)
- Add DB query for active key from `gemini_api_keys` (pattern from `extract-order-entry-data`)
- Add DB query for active model from `gemini_models`
- Replace `new GoogleGenerativeAI(apiKey)` with `new GoogleGenerativeAI(activeKeyData.api_key)`
- Deploy

### pdf-type-detector/index.ts
- Add `import { createClient } from "npm:@supabase/supabase-js@2"`
- Make `apiKey` optional/remove from interface
- Add DB queries for key and model
- Replace hardcoded `'gemini-2.5-pro'` with dynamic model from DB
- Replace `new GoogleGenerativeAI(apiKey)` with DB-fetched key
- Deploy

### pdf-to-csv-extractor/index.ts
- Same pattern as pdf-transformer
- Deploy

**Verification:** Deploy all three, test extraction flow end-to-end.

---

## Step 10: Clean up and build verification

**Scope:** 1 file edit + build

- Check if `@google/generative-ai` is still imported anywhere in `src/` -- if not, it can stay in `package.json` (still used by edge functions via `npm:` specifier, but the client bundle won't include it if no `src/` files import it)
- Run `npm run build` and fix any remaining type errors
- Write the changelog markdown file documenting all changes made

---

## Summary of Step Dependencies

```
Step 1 (gemini-proxy EF)     -- independent, deploy first
Step 2 (test-gemini-key EF)  -- independent, deploy first
Step 3 (geminiProxy.ts)      -- independent, create helper
Step 4 (gemini.ts)           -- depends on Step 3
Step 5 (geminiDetector.ts)   -- depends on Step 3
Step 6 (csv + function)      -- depends on Step 3
Step 7 (configService.ts)    -- depends on Step 2
Step 8 (components)          -- depends on Steps 4, 5, 6, 7
Step 9 (edge functions)      -- independent of Steps 3-8
Step 10 (cleanup + build)    -- depends on all above
```

Steps 1, 2, 3, and 9 can be done in any order or in parallel. Steps 4-6 depend on Step 3. Step 7 depends on Step 2. Step 8 depends on Steps 4-7. Step 10 is last.

**Recommended session groupings:**
- Session A: Steps 1 + 2 + 3 (create new files, deploy edge functions)
- Session B: Steps 4 + 5 + 6 (update client libraries)
- Session C: Steps 7 + 8 (update service + components)
- Session D: Steps 9 + 10 (update edge functions, build, verify)
