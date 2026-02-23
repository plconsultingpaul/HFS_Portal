# Fix GeminiConfigSettings broken method calls after server-side credentials migration

## Problem

After the Gemini credentials were moved server-side (Steps 1-7, 9 of `2026-02-10-move-gemini-credentials-server-side-steps.md`), the `GeminiConfigSettings.tsx` component was still calling old service methods that no longer existed:

- `geminiConfigService.testApiKey(apiKey, undefined, true)` -- method removed in Step 7
- `geminiConfigService.fetchAvailableModels(apiKey)` -- method removed in Step 7

This caused runtime errors on the Gemini API Configuration settings page.

## Changes

### 1. `supabase/functions/test-gemini-key/index.ts`

- Updated the edge function to accept either `apiKeyId` (row ID for DB lookup) **or** `apiKey` (raw key passed directly)
- This supports two use cases: testing a key that is already saved (by ID), and testing a new key before saving (by raw value)
- Redeployed the edge function

### 2. `src/services/geminiConfigService.ts`

- Added `testApiKey(rawApiKey, modelName?)` -- sends the raw API key to the edge function for pre-save testing
- Added `fetchAvailableModels(rawApiKey)` -- sends the raw API key to the edge function to list models before the key is saved
- Both route through the `test-gemini-key` edge function so the raw key is never sent directly to Google from the browser

### 3. `src/components/settings/GeminiConfigSettings.tsx`

Four call sites fixed:

| Location | Old call | New call |
|---|---|---|
| AddKeyModal `handleTest` (pre-save test) | `testApiKey(apiKey, undefined, true)` | `testApiKey(apiKey)` |
| AddKeyModal `handleSubmit` (post-save fetch) | `fetchAvailableModels(apiKey)` | `fetchAvailableModelsByKeyId(newKey.id)` |
| FetchModelsModal `fetchModels` | `fetchAvailableModels(apiKey.api_key)` | `fetchAvailableModelsByKeyId(apiKey.id)` |
| Main component `handleTestApiKey` | `testApiKey(key.api_key, modelToTest)` | `testApiKeyById(key.id, modelToTest)` |

## Summary

- Pre-save operations (AddKeyModal test/fetch) send the raw key to our edge function (not directly to Google)
- Post-save operations use the row ID so the raw key never leaves the server
- Build passes cleanly
