# Work Item 4: Google Places/Maps Key for Static Maps

**Date:** 2026-02-11
**Reference:** `md/2026-02-10-move-api-credentials-server-side.md` -- Work Item 4

## Problem

The Google Places API key was embedded directly in `<img src>` URLs for Google Static Maps in two components (`FlowExecutionModal.tsx` and `FlowDesigner.tsx`). Anyone inspecting the rendered HTML or network traffic could see the API key in plaintext.

Additionally, `fetchApiConfig()` returned the raw `googlePlacesApiKey` value to the browser, and the `GooglePlacesSettings` component pre-populated its input field with the saved key.

## Changes Made

### 1. New Edge Function: `static-map-proxy`

**File:** `supabase/functions/static-map-proxy/index.ts`

- Accepts query parameters: `center`, `zoom`, `size`, `maptype`, `markers`
- Fetches the Google Places API key from `api_settings` table server-side using the service role key
- Proxies the request to Google Static Maps API
- Returns the map image bytes directly to the client
- Deployed with `verify_jwt: false` since `<img src>` tags cannot send auth headers and the response is a non-sensitive map image
- Includes 24-hour cache header for performance

### 2. Updated `FlowExecutionModal.tsx`

- Removed `googleMapsApiKey` state variable
- Removed `fetchApiConfig` import and the `useEffect` that fetched the API key
- Changed `<img src>` from direct Google Static Maps URL (with embedded key) to the `static-map-proxy` edge function URL
- Removed the `googleMapsApiKey` condition from map rendering (replaced with `onError` handler that hides the map link if the proxy fails)

### 3. Updated `FlowDesigner.tsx`

- Same changes as `FlowExecutionModal.tsx` (identical pattern)
- Removed `fetchApiConfig` import (no longer used in this file)

### 4. Updated `configService.ts`

- Removed `google_places_api_key` from the `fetchApiConfig()` SELECT query -- the key is no longer returned to the client
- Removed `googlePlacesApiKey` from the default return object
- Changed `updateApiConfig()` to conditionally include `google_places_api_key` only when a value is provided (write-only pattern -- prevents accidental clearing)

### 5. Updated `types/index.ts`

- Changed `googlePlacesApiKey` from required (`string`) to optional (`string?`) in the `ApiConfig` interface

### 6. Updated `GooglePlacesSettings.tsx`

- Input field now starts empty instead of pre-populating with the saved key
- Added help text: "For security, saved keys are not displayed. Enter a new key to update."
- Save button is disabled when the input is empty (prevents clearing the saved key)
- After a successful save, the input field is cleared
- Test button still works the same way -- admin enters a key, tests it, then saves it

## Security Improvement

- The Google Places API key is no longer embedded in any client-side HTML or JavaScript
- The key is no longer returned by `fetchApiConfig()` to the browser
- Map images are served through the server-side proxy, keeping the key exclusively on the server
- The admin settings page uses a write-only pattern consistent with Work Item 3's approach for `api_auth_config`
