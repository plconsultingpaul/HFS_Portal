# Remove `geminiApiKey` Prop Chain -- Step-by-Step Plan

This completes Step 8 from `2026-02-10-move-gemini-credentials-server-side-steps.md`. The server-side proxy is fully operational; these steps remove the now-unused client-side key passing.

**Current state:** All lib files (`gemini.ts`, `geminiDetector.ts`, `csvExtractor.ts`, `functionEvaluator.ts`) already use `callGeminiProxy()` and no longer accept `apiKey` parameters. The prop chain still exists but the values are never consumed.

---

## Step 1: Remove `geminiApiKey` from child components

**Scope:** 5 file edits

### Extract children
- `src/components/extract/SingleFileProcessor.tsx` -- remove `geminiApiKey` from props interface and all references inside the component (extraction calls, useEffect deps, conditions)
- `src/components/extract/MultiPageProcessor.tsx` -- same treatment
- `src/components/extract/AutoDetectPdfUploadSection.tsx` -- remove `apiKey` from props interface and all references

### Transform children
- `src/components/transform/MultiPageTransformer.tsx` -- remove `geminiApiKey` from props interface, conditions, useEffect deps, and any request bodies
- `src/components/transform/PageTransformerCard.tsx` -- remove `geminiApiKey` from props interface and from the request body sent to `pdf-transformer` edge function

**Verification:** `npm run build` will show errors in parent pages that still pass the prop. That is expected; fixed in Step 2.

---

## Step 2: Remove `geminiApiKey` from parent pages

**Scope:** 4 file edits

- `src/components/ExtractPage.tsx` -- remove `geminiApiKey` state variable, remove the `loadGeminiConfig` useEffect (or just the key-fetching portion), stop passing `geminiApiKey` to child components
- `src/components/TransformPage.tsx` -- same
- `src/components/VendorUploadPage.tsx` -- same
- `src/components/DriverCheckinPage.tsx` -- same

**Note:** If the `loadGeminiConfig` useEffect also loads other config data, only remove the `geminiApiKey` parts. If it exclusively loads the API key, remove the entire useEffect.

**Verification:** `npm run build` will show errors in shared types/hooks that still define `geminiApiKey`. That is expected; fixed in Step 3.

---

## Step 3: Remove `geminiApiKey` from shared types, config service, and hooks

**Scope:** 3 file edits

- `src/types/index.ts` -- remove `geminiApiKey` field from any interfaces that contain it (e.g., config or state interfaces)
- `src/services/configService.ts` -- remove `geminiApiKey` from return types, default values, and any fetch logic that retrieves the key for client-side use
- `src/hooks/useSupabaseData.ts` -- remove `geminiApiKey` from state interfaces, initial state, and any config-loading logic that populates it

**Verification:** `npm run build` should now pass cleanly.

---

## Step 4: Build verification and final cleanup

**Scope:** build + review

- Run `npm run build` and fix any remaining type errors or unused imports
- Search `src/` for any lingering references to `geminiApiKey` or `gemini_api_key` that should have been removed
- Confirm `@google/generative-ai` is not imported anywhere in `src/` (it should already be clean)
- Update `md/2026-02-11-move-gemini-credentials-server-side-complete.md` if needed to reflect final state

---

## Summary of Step Dependencies

```
Step 1 (child components)   -- independent, start here
Step 2 (parent pages)       -- depends on Step 1
Step 3 (types/config/hooks) -- depends on Step 2
Step 4 (build + cleanup)    -- depends on Step 3
```

Steps must be done in order 1 -> 2 -> 3 -> 4.
