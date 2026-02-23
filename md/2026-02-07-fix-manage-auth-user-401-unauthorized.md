# Fix manage-auth-user 401 Unauthorized Error

**Date:** 2026-02-07

## Problem

Admin users received a `401 (Unauthorized)` error when attempting to delete a user (or perform any user management action that calls the `manage-auth-user` edge function). The same issue affected creating users, changing passwords, and resetting passwords.

## Root Cause (Phase 1)

The `useAuth.ts` hook was using raw `fetch()` calls to invoke the `manage-auth-user` Supabase edge function. These calls only included the `Authorization` header with the user's JWT but were missing the required `Apikey` header.

## Fix (Phase 1)

Replaced all four raw `fetch()` calls in `useAuth.ts` with `supabase.functions.invoke()`, which automatically handles sending both the `Authorization` and `Apikey` headers.

### Functions Updated

All in `src/hooks/useAuth.ts`:

1. **`createUser`** - Creates a new user via the edge function
2. **`deleteUser`** - Deletes a user via the edge function
3. **`changeOwnPassword`** - Changes the calling user's own password
4. **`updateUserPassword`** - Admin resets another user's password

## Root Cause (Phase 2)

Even after switching to `supabase.functions.invoke()`, the 401 persisted. The `manage-auth-user` edge function was deployed with `verify_jwt: true` (the default), which caused Supabase's API gateway to reject the JWT token before the request ever reached the function code.

## Fix (Phase 2)

Redeployed the `manage-auth-user` edge function with `verify_jwt: false`. This disables the gateway-level JWT check and allows the request to reach the function code.

**Security is not affected** because the function already implements its own authentication and authorization:

1. **Authentication:** The function extracts the `Authorization` header, creates a Supabase client with the caller's JWT, and calls `auth.getUser()` to verify the token. Unauthenticated requests are rejected with a 401.
2. **Authorization:** For admin actions (create, delete, update_password), the function queries the `users` table to confirm the caller has `is_admin: true`. Non-admin users are rejected with a 403.

## Changes Summary

- `src/hooks/useAuth.ts` - Replaced raw `fetch()` with `supabase.functions.invoke()` in four functions
- `manage-auth-user` edge function - Redeployed with `verify_jwt: false` (no code changes)
