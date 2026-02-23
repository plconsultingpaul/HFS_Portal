# Work Item 5: RLS / DB Layer Hardening

## Overview

Work Items 1-4 removed all client-side usage of sensitive credentials. However, the database still allows any authenticated user to SELECT every column from these tables, including secrets. A user with a valid JWT could bypass the UI and query credentials directly via PostgREST.

This work item locks that down so secrets are only accessible via Edge Functions (which use the service role key and bypass RLS).

---

## Current State (Problem)

All three tables have the same permissive SELECT policy:

```sql
CREATE POLICY "Authenticated users can select [table]"
  ON [table] FOR SELECT
  TO authenticated
  USING (true);
```

| Table | Sensitive Columns Exposed | Who Can Read |
|-------|--------------------------|--------------|
| `gemini_api_keys` | `api_key` | All authenticated users |
| `api_settings` | `password`, `google_api_key`, `google_places_api_key` | All authenticated users |
| `api_auth_config` | `password` | All authenticated users |

Edge Functions already use the **service role key** which bypasses RLS entirely, so tightening these policies will not affect server-side operations.

---

## Sub-task A: Lock Down `gemini_api_keys` (Simple)

### Why This is Safe

- No non-admin user needs to read from this table
- The admin settings UI (GeminiConfigSettings) is admin-only
- All extraction/detection calls go through the `gemini-proxy` Edge Function (service role)
- Edge Functions (`email-monitor`, `extract-order-entry-data`, `pdf-transformer`, `pdf-type-detector`, `pdf-to-csv-extractor`, `sftp-poller`, `test-gemini-key`) all use service role

### What to Do

**Migration:**
1. Drop the existing permissive SELECT policy
2. Create a new admin-only SELECT policy: `USING (public.is_admin())`

### Client Code Impact

- `src/services/geminiConfigService.ts` -- `getAllApiKeys()` selects `*` and `getActiveGeminiApiKey()` selects `id, api_key`. Both are only called from the admin settings page (`GeminiConfigSettings.tsx`), so admin-only RLS is fine.
- No other client-side code queries this table.

### Verification

- Admin user: Can still view/manage Gemini API keys in settings
- Non-admin user: Cannot query `gemini_api_keys` via PostgREST (gets empty result)
- Edge Functions: Unaffected (service role bypasses RLS)

---

## Sub-task B: Lock Down `api_settings` (Moderate -- Requires Secure View)

### Why This Needs a View

Non-admin users need **some** columns from this table for the Orders page:
- `path` (base URL, used to construct links)
- `order_display_fields` (which columns to show)
- `custom_order_display_fields` (custom column labels)

But they must NOT see:
- `password` (API Bearer token)
- `google_places_api_key` (used only by `static-map-proxy` Edge Function)
- `google_api_key` (currently still in `fetchApiConfig()` SELECT -- see cleanup note below)

### What to Do

**Migration:**
1. Create a secure view `api_settings_safe` that exposes only non-sensitive columns:
   - `id`, `path`, `order_display_fields`, `custom_order_display_fields`, `updated_at`
2. Drop the existing permissive SELECT policy on `api_settings`
3. Create an admin-only SELECT policy on `api_settings`: `USING (public.is_admin())`
4. Grant SELECT on the view to `authenticated` and `anon` roles (PostgREST requires explicit grants on views)
5. Enable RLS if needed for the view or rely on the underlying table's RLS (views in Supabase/PostgREST use the caller's role by default; since the view is defined with `SECURITY INVOKER`, admin-only access on the base table would block non-admin view access -- so the view must be `SECURITY DEFINER` owned by a privileged role, OR we keep a limited SELECT policy on the base table for the view's columns)

**Recommended approach:** Create the view as `SECURITY DEFINER` so it can read from the restricted base table, but only exposes safe columns:

```sql
CREATE VIEW api_settings_safe WITH (security_invoker = false) AS
SELECT id, path, order_display_fields, custom_order_display_fields, updated_at
FROM api_settings;
```

**Client Code Changes:**
- `src/services/configService.ts` -- `fetchApiConfig()`: Change `.from('api_settings')` to `.from('api_settings_safe')`
- Remove `google_api_key` from the SELECT list (it is no longer used client-side after Work Items 1-4; the `fetchApiConfig` return type may need the field removed)
- Admin settings page (`ApiSettings.tsx`) should continue querying `api_settings` directly (admin-only RLS allows this)

### Cleanup Note

`fetchApiConfig()` currently selects `google_api_key` which appears to be a leftover from before Work Items 1-4. Verify this column is not used anywhere in client-side code and remove it from the SELECT.

### Verification

- Non-admin user: Can still load Orders page (reads from `api_settings_safe` view)
- Non-admin user: Cannot query `api_settings` directly (gets empty result)
- Admin user: Can still manage full API settings
- Edge Functions (`api-proxy`, `track-trace-proxy`, `static-map-proxy`, workflow processors): Unaffected (service role)

---

## Sub-task C: Lock Down `api_auth_config` (Simple)

### Why This is Safe

- The client code already excludes `password` from SELECTs via `API_AUTH_CONFIG_SAFE_FIELDS`
- The settings UI (`ApiAuthSettings.tsx`) is admin-only
- All functions that need the password (`track-trace-proxy`, `test-api-auth`, workflow processors, `send-document-email`) use the service role

### Decision Point: Admin-Only vs. Secure View

Check whether any non-admin user or non-admin page queries `api_auth_config`. The functions in `configService.ts` (`fetchApiAuthConfig`, `fetchAllApiAuthConfigs`, `fetchApiAuthConfigById`, `fetchApiAuthConfigByName`) are called from:
- `ApiAuthSettings.tsx` -- admin settings page
- Possibly workflow step configuration UIs -- also admin-only

**If no non-admin code reads from this table** (most likely):
- Simply change SELECT to admin-only, same as Sub-task A

**If non-admin code does read safe fields:**
- Create an `api_auth_config_safe` view (same pattern as Sub-task B)

### What to Do (Assuming Admin-Only)

**Migration:**
1. Drop the existing permissive SELECT policy
2. Create an admin-only SELECT policy: `USING (public.is_admin())`

### Verification

- Admin user: Can still manage API auth configurations in settings
- Non-admin user: Cannot query `api_auth_config` (gets empty result)
- Edge Functions: Unaffected (service role)

---

## Sub-task D: Verification Pass (Quick)

### What to Do

After deploying sub-tasks A, B, and C:

1. **As a non-admin user**, attempt to query each table directly via the Supabase client or PostgREST URL:
   - `GET /rest/v1/gemini_api_keys?select=api_key` -- should return empty or 403
   - `GET /rest/v1/api_settings?select=password` -- should return empty or 403
   - `GET /rest/v1/api_auth_config?select=password` -- should return empty or 403
   - `GET /rest/v1/api_settings_safe` -- should return safe columns only

2. **As an admin user**, verify all settings pages still work:
   - Gemini config settings -- can view/add/edit/delete keys
   - API settings -- can view/edit all fields including password
   - API auth config settings -- can view/edit all configs

3. **Test core workflows** to verify Edge Functions are unaffected:
   - Run an extraction (uses `gemini-proxy`)
   - View Orders page (uses `api-proxy`)
   - Test Track & Trace (uses `track-trace-proxy`)
   - Test a flow with Google Maps (uses `static-map-proxy`)

---

## Execution Order

1. **Sub-task A** -- `gemini_api_keys` lockdown (standalone, no client code changes)
2. **Sub-task C** -- `api_auth_config` lockdown (standalone, no client code changes if admin-only)
3. **Sub-task B** -- `api_settings` lockdown (requires view + client code update to `configService.ts`)
4. **Sub-task D** -- Full verification pass

Sub-tasks A and C can be done together in one migration. Sub-task B is separate because it involves a client code change.

---

## Files Modified Summary

| Sub-task | Migration | Client Code |
|----------|-----------|-------------|
| A | 1 migration (drop + create policy) | None |
| B | 1 migration (create view, drop + create policy, grants) | `src/services/configService.ts` (change table to view) |
| C | 1 migration (drop + create policy) | None (confirm admin-only usage first) |
| D | None | None (manual testing) |
