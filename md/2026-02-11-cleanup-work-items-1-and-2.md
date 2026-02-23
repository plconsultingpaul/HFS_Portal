# Cleanup: Work Items 1 & 2 Remaining Tasks

## Work Item 1: Remove Vestigial `apiKey` from Edge Function Request Interfaces

The three edge functions below no longer use the client-supplied `apiKey` (they fetch from DB server-side), but the field still exists in their request interfaces as dead code.

### Step 1: `supabase/functions/pdf-transformer/index.ts`
- Remove `apiKey?: string` from the `TransformationRequest` interface (~line 138)
- Remove the `apiKey` destructuring from the request body parsing (~line 378)

### Step 2: `supabase/functions/pdf-type-detector/index.ts`
- Remove `apiKey?: string` from the `DetectionRequest` interface (~line 21)
- Remove any `apiKey` destructuring from request body parsing

### Step 3: `supabase/functions/pdf-to-csv-extractor/index.ts`
- Remove `apiKey?: string` from the `ExtractionRequest` interface (~line 147)
- Remove any `apiKey` destructuring from request body parsing

### Step 4: Verify no client code sends `apiKey` in request bodies to these functions
- Search `src/` for any `fetch` calls to `pdf-transformer`, `pdf-type-detector`, or `pdf-to-csv-extractor` that still include `apiKey` in the body payload
- Remove any found references

### Step 5: Redeploy the three edge functions

---

## Work Item 2: Stop Exposing `password` in `fetchApiConfig()`

The `api-proxy` edge function handles all external API calls server-side, but `configService.ts` still fetches and returns the raw `password` to the browser.

### Step 1: `src/services/configService.ts` -- `fetchApiConfig()` (~line 7)
- Replace `.select('*')` with an explicit column list excluding `password`: `.select('id, path, google_api_key, google_places_api_key, order_display_fields, custom_order_display_fields, updated_at')`
- Remove `password: config.password || ''` from the return object (~line 23)
- Remove `password: ''` from the default/fallback return (~line 48)

### Step 2: Update the `ApiConfig` type or interface
- Find where the `ApiConfig` return type is defined (likely in `src/types/index.ts` or inline in `configService.ts`)
- Remove the `password` field from it

### Step 3: Remove any client-side references to `apiConfig.password`
- Search `src/` for usages of `apiConfig.password` or destructured `password` from API config
- Remove or update any found references (these should already be unused since all API calls go through the proxy)

### Step 4: Build verification
- Run `npm run build` to confirm no type errors from the removed field
