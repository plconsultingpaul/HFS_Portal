# Fix Work Item 3: Secure api_auth_config Credentials

**Parent document:** `2026-02-10-move-api-credentials-server-side.md` -- Work Item 3

## Problem Summary

The `api_auth_config` table stores credentials (username, password) for third-party API authentication. Currently:

1. All `configService.ts` fetch functions use `.select('*')`, returning passwords to the browser
2. The "Test" button in `ApiAuthSettings.tsx` sends username/password directly from the browser to external API endpoints
3. `authenticationManager.ts` stores credentials in browser memory and makes login/ping calls directly from the browser
4. The password field is loaded into React state as plaintext when a config is selected

---

## Step 1: Exclude Password from All Read Queries in configService.ts

### What to Change

Modify **four** fetch functions in `src/services/configService.ts` to use an explicit column list instead of `.select('*')`:

- `fetchApiAuthConfig()` (line 493): Change `.select('*')` to `.select('id, name, login_endpoint, ping_endpoint, token_field_name, username, is_active, created_at, updated_at')`
- `fetchAllApiAuthConfigs()` (line 527): Same change
- `fetchApiAuthConfigById()` (line 554): Same change
- `fetchApiAuthConfigByName()` (line 586): Same change

Remove the `password` field mapping from each function's return object. Set `password: ''` in the mapped return values so the existing TypeScript interface does not break.

### Why Password Still Works for Writes

The `saveApiAuthConfig()`, `createApiAuthConfig()`, and `updateApiAuthConfig()` functions send password TO the server (insert/update). This is fine -- the password goes into the DB but is never read back to the client. After a save, the response `.select()` will also need to be changed to exclude password from the returned data.

### Files

| File | Lines | Change |
|---|---|---|
| `src/services/configService.ts` | 493-525 | `fetchApiAuthConfig` -- explicit select, remove password from return |
| `src/services/configService.ts` | 527-552 | `fetchAllApiAuthConfigs` -- same |
| `src/services/configService.ts` | 554-584 | `fetchApiAuthConfigById` -- same |
| `src/services/configService.ts` | 586-616 | `fetchApiAuthConfigByName` -- same |
| `src/services/configService.ts` | 618-674 | `saveApiAuthConfig` -- change `.select()` after insert/update to exclude password |
| `src/services/configService.ts` | 676-714 | `createApiAuthConfig` -- same |
| `src/services/configService.ts` | 716-754 | `updateApiAuthConfig` -- same |

---

## Step 2: Update ApiAuthSettings.tsx for Write-Only Password

### What to Change

Since passwords will no longer come back from read queries:

- When selecting an existing config (line 78-92), set `password: ''` in formData. Display a placeholder like "Password saved" or leave the field empty with placeholder text "Enter new password to change".
- On save, only include the `password` field in the update payload if the user has actually typed a new value (i.e., `password !== ''`). This prevents overwriting the saved password with an empty string.
- Remove the `AuthManager.initialize()` calls (lines 56-66 and 125-133) since `authenticationManager.ts` will be removed in Step 5.
- Remove the `AuthManager.removeConfig()` call (line 154).
- Remove the "Usage Example" code block (lines 500-515) that references `AuthManager`.

### Files

| File | Lines | Change |
|---|---|---|
| `src/components/settings/ApiAuthSettings.tsx` | 11 | Remove `AuthManager` import |
| `src/components/settings/ApiAuthSettings.tsx` | 56-66 | Remove `AuthManager.initialize()` in `loadConfigs` |
| `src/components/settings/ApiAuthSettings.tsx` | 78-92 | Set `password: ''` when selecting a config |
| `src/components/settings/ApiAuthSettings.tsx` | 102-143 | Conditional password in save payload; remove `AuthManager.initialize()` |
| `src/components/settings/ApiAuthSettings.tsx` | 145-175 | Remove `AuthManager.removeConfig()` |
| `src/components/settings/ApiAuthSettings.tsx` | 486-496 | Update password input placeholder to indicate write-only behavior |
| `src/components/settings/ApiAuthSettings.tsx` | 500-515 | Remove AuthManager usage example block |

---

## Step 3: Create `test-api-auth` Edge Function

### Why

`testApiAuthConnection()` in `configService.ts` (line 770) currently POSTs username/password directly from the browser to the external login endpoint. This should be moved server-side.

### What to Build

A new `test-api-auth` Edge Function that:

- Accepts `configId` (to test a saved config) OR inline credentials (`loginEndpoint`, `pingEndpoint`, `username`, `password`, `tokenFieldName`) for testing unsaved new configs
- If `configId` is provided, fetches the full credentials from `api_auth_config` server-side (including password)
- If inline credentials are provided (for new unsaved configs), uses those directly
- POSTs to the login endpoint server-side
- If a ping endpoint is configured, validates the token against it
- Returns `{ success: boolean, message: string }` (does NOT return the token to the client)

### Client-Side Changes

- Replace the body of `testApiAuthConnection()` in `configService.ts` (lines 770-833) with a `fetch()` call to the new edge function
- Update its signature: accept either a `configId` string OR the inline credential fields
- `ApiAuthSettings.tsx` `handleTest()` (line 177): For saved configs, pass `configId`. For new unsaved configs, pass the form fields.

### Files

| File | Lines | Change |
|---|---|---|
| `supabase/functions/test-api-auth/index.ts` | New | Edge function for server-side auth testing |
| `src/services/configService.ts` | 770-833 | Replace `testApiAuthConnection` body with edge function call |
| `src/components/settings/ApiAuthSettings.tsx` | 177-199 | Update `handleTest` to pass `configId` for saved configs |

---

## Step 4: Update configService.ts Save Functions to Support Optional Password

### Why

After Step 1 removes password from reads and Step 2 makes password write-only in the UI, the save/update functions need to handle the case where a user edits non-password fields without re-entering the password.

### What to Change

- `updateApiAuthConfig()` (line 716): If `password` is empty string, omit the `password` key from the update payload entirely so the existing DB value is preserved
- `saveApiAuthConfig()` (line 618): Same conditional logic
- `createApiAuthConfig()` (line 676): Password is required for new configs (no change needed, but add validation)

### Files

| File | Lines | Change |
|---|---|---|
| `src/services/configService.ts` | 618-674 | Conditionally include password in `saveApiAuthConfig` |
| `src/services/configService.ts` | 716-754 | Conditionally include password in `updateApiAuthConfig` |
| `src/services/configService.ts` | 676-714 | Add validation that password is required in `createApiAuthConfig` |

---

## Step 5: Remove authenticationManager.ts

### Why

`authenticationManager.ts` is a client-side credential store that holds username/password in browser memory and makes direct login/ping calls from the browser. After Steps 1-4:

- Passwords no longer come to the client
- Test connections happen server-side via the edge function
- The workflow processors and track-trace-proxy already handle auth token management server-side

The only consumer is `ApiAuthSettings.tsx`, which will have its references removed in Step 2.

### What to Change

- Delete `src/lib/authenticationManager.ts`
- Verify no remaining imports reference this file (currently only `ApiAuthSettings.tsx`, handled in Step 2)

### Files

| File | Change |
|---|---|
| `src/lib/authenticationManager.ts` | Delete entirely |

---

## Step 6: Update Other Frontend Components That Fetch api_auth_config

### Why

Several other components also query `api_auth_config` with `.select('*')` for dropdown/selection purposes. These should also use explicit field lists to avoid inadvertently fetching passwords.

### Files to Check

| File | Line | Current Usage | Change |
|---|---|---|---|
| `src/components/settings/workflow/StepConfigForm.tsx` | 182 | `.from('api_auth_config')` -- used for dropdown of auth configs in workflow steps | Change to `.select('id, name')` if using `*` |
| `src/components/settings/RouteSummaryConfigModal.tsx` | 161 | `.from('api_auth_config')` -- used for auth config dropdown | Same |
| `src/components/settings/TrackTraceTemplatesSettings.tsx` | 1243, 4854 | `.from('api_auth_config')` -- used for auth config selection | Same |

These components only need `id` and `name` for their dropdown lists. They should never receive `password`, `username`, or endpoint fields.

---

## Execution Order

Steps 1 and 2 should be done together (read queries + UI update), then Step 3 (edge function), then Step 4 (save logic), then Step 5 (cleanup), then Step 6 (remaining components). Steps 3 and 4 could be done in parallel since they are independent.
