# Work Item 2: Create an API Proxy Edge Function for `api_settings` Calls

## Goal

Stop exposing `api_settings.password` to the browser. All external TMS API calls currently made from the client with a Bearer token must go through a server-side edge function that fetches the credential from the database.

---

## Step 1: Create the `api-proxy` Edge Function

**What:** Build a new `api-proxy` edge function that mirrors the existing `track-trace-proxy` pattern.

**The edge function must:**
- Accept: target path (relative or full URL), HTTP method, request body (optional), query params (optional), custom headers (optional)
- Fetch `api_settings.path` and `api_settings.password` from the database server-side using `SUPABASE_SERVICE_ROLE_KEY`
- Construct the full external API URL
- Attach `Authorization: Bearer {password}` header server-side
- Forward the request to the external API
- Return the response (status + body) back to the client
- Handle CORS headers
- Handle errors gracefully

**Reference pattern:** `supabase/functions/track-trace-proxy/index.ts` (lines 69-76, 102-104)

**Files created:**
- `supabase/functions/api-proxy/index.ts`

---

## Step 2: Migrate `sendToApi()` in `apiClient.ts`

**What:** Replace the direct external `fetch()` in `sendToApi()` with a call to the new `api-proxy` edge function.

**Current behavior (lines 20-22):**
- Receives full `apiConfig` object including `password`
- Builds `Authorization: Bearer {password}` header in the browser
- Makes direct `fetch()` to the external TMS API

**New behavior:**
- Call the `api-proxy` edge function instead
- Pass the target path, method, and body
- No longer needs `apiConfig.password`

**File:** `src/lib/apiClient.ts`

**Downstream callers automatically fixed (no changes needed in these files):**
- `src/components/extract/SingleFileProcessor.tsx` (line 330)
- `src/components/extract/MultiPageProcessor.tsx` (lines 434, 850, 1171)

---

## Step 3: Migrate Orders Fetching in `OrdersPage.tsx` and `OrdersPreview.tsx`

**What:** Both files make direct `fetch()` GET calls to the external TMS orders API with the Bearer token. Migrate these to use the `api-proxy` edge function.

**OrdersPage.tsx (line 100-102):**
- `fetchOrders()` builds URL like `{apiConfig.path}/orders?...`
- Attaches `Authorization: Bearer {apiConfig.password}`
- Direct GET to external API

**OrdersPreview.tsx (line 53-55):**
- `handleTestOrdersDisplay()` builds URL like `{apiConfig.path}/orders?...`
- Same Bearer token pattern
- Direct GET to external API

**New behavior for both:**
- Call the `api-proxy` edge function with path `/orders`, method `GET`, and query params
- No longer need `apiConfig.password`

**Files:**
- `src/components/OrdersPage.tsx`
- `src/components/orders/OrdersPreview.tsx`

---

## Step 4: Migrate API Test Connection in `ApiSettings.tsx`

**What:** The "Test Connection" button in API Settings makes a direct browser fetch to the external API's `/WHOAMI` endpoint using the password.

**Current behavior (line 84-86):**
- `handleTestTruckMateApi()` builds URL `{apiConfig.path}/WHOAMI`
- Attaches `Authorization: Bearer {localConfig.password}`
- Direct GET from browser

**New behavior:**
- Call the `api-proxy` edge function with path `/WHOAMI` and method `GET`
- No longer needs password client-side for testing

**File:** `src/components/settings/ApiSettings.tsx`

---

## Step 5: Update `StepConfigForm.tsx` Header Templates

**What:** The workflow step configuration form auto-populates Authorization header templates using the raw password value from `apiConfig.password`.

**Current behavior (lines 233, 366):**
- Template default: `"Authorization": apiConfig?.password ? \`Bearer ${apiConfig.password}\` : "Bearer YOUR_TOKEN_HERE"`
- Password embedded in visible form field

**New behavior:**
- Show a placeholder like `"Authorization": "Bearer {{API_TOKEN}}"` indicating the token is injected server-side
- Or simply remove the auto-populated password since workflow processors already fetch credentials server-side

**File:** `src/components/settings/workflow/StepConfigForm.tsx`

---

## Step 6: Stop Returning `password` from `fetchApiConfig()` in `configService.ts`

**What:** Remove the `password` field from the `ApiConfig` object returned to the browser. This is the final lockdown step -- once all callers have been migrated to the proxy, no client code needs the password.

**Current behavior (lines 36-38):**
- `fetchApiConfig()` returns `{ path, password, googleApiKey, googlePlacesApiKey, ... }`
- Password available to every component that calls this function

**New behavior:**
- Remove `password` from the returned object
- Keep `path` for display purposes only (e.g., showing the configured API URL in settings)
- Update the `ApiConfig` type to remove the `password` field

**Files:**
- `src/services/configService.ts` -- `fetchApiConfig()` function
- `src/types/index.ts` -- `ApiConfig` type definition (if it exists here)

**Downstream cleanup (remove unused password references):**
- `src/components/settings/ApiConnectionTester.tsx` -- may need review if it receives password as a prop from ApiSettings
- Any component that destructures `apiConfig.password` will get a TypeScript error, which is the desired outcome to catch all usages

---

## Step 7: Verify Build and Test

**What:** Run `npm run build` to confirm zero TypeScript errors related to the removed `password` field. Any remaining references will surface as compile errors, confirming all client-side credential exposure has been eliminated.

---

## Execution Notes

- Steps 1-5 can be done incrementally without breaking anything (the proxy works alongside existing direct calls)
- Step 6 is the breaking change -- it removes the password from the client entirely, so Steps 2-5 must be complete first
- Step 7 is the verification step
- The `ApiConnectionTester.tsx` component is used for generic API testing in settings (not just TMS). It receives auth credentials as props from the parent. Once ApiSettings no longer has the password, the test flow will route through the proxy automatically.
