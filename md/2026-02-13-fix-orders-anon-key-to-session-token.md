# Fix Orders Pages Using Anon Key Instead of Session Token

**Date:** 2026-02-13

## Problem

Two files were using the Supabase anon key directly as the `Authorization: Bearer` token when calling the `api-proxy` edge function. Since `api-proxy` verifies the caller's identity via `getUser()`, these calls would fail with a 401 Unauthorized because the anon key is not a valid user JWT.

## Files Changed

### 1. `src/components/OrdersPage.tsx`
- Removed hardcoded `VITE_SUPABASE_ANON_KEY` usage in the `fetchOrders` function
- Replaced with `getAuthHeaders()` from `src/lib/supabase.ts`, which uses the logged-in user's `session.access_token`

### 2. `src/components/orders/OrdersPreview.tsx`
- Removed hardcoded `VITE_SUPABASE_ANON_KEY` usage in the `handleTestOrdersDisplay` function
- Replaced with `getAuthHeaders()` from `src/lib/supabase.ts`, which uses the logged-in user's `session.access_token`

## Notes

- The `getAuthHeaders()` utility already existed and is used by 25+ other files in the codebase
- It correctly retrieves the session's `access_token` for the `Authorization` header and sets the `apikey` header to the anon key (standard Supabase pattern)
- Unauthenticated pages (forgot password, password reset, password setup) correctly use the anon key and were not changed
