# 2026-02-07 Migrate Custom Auth to Supabase Auth

## Summary

Migrated the application from a custom authentication system (password hashing via RPC, localStorage sessions) to Supabase's built-in authentication. This eliminates client-side password handling, removes plaintext session storage, and leverages Supabase's secure JWT-based session management.

## What Changed

### Database Migration
- Created Supabase Auth accounts (`auth.users` + `auth.identities`) for all 4 existing users with **matching UUIDs** to preserve all foreign key relationships across 10 tables.
- Made `password_hash` column nullable on `public.users` (no longer used for auth).
- Created `public.is_admin()` helper function for future RLS policy use.
- All users set with temporary password `TempPass123!` (must be changed on first login).

### Authentication Hook (`src/hooks/useAuth.ts`)
- **Removed**: localStorage-based session management (`parseit_session`, `parseit_user`).
- **Removed**: `verify_password` RPC calls for login.
- **Removed**: `hash_password` RPC calls for password operations.
- **Removed**: All `console.log` statements that leaked session data.
- **Added**: `supabase.auth.signInWithPassword()` for login.
- **Added**: `supabase.auth.onAuthStateChange()` for session state tracking.
- **Added**: `supabase.auth.signOut()` for logout.
- **Added**: Username-to-email lookup so users can still log in with their username (backwards compatible).
- **Changed**: `createUser`, `deleteUser`, `updateUserPassword` now route through the `manage-auth-user` Edge Function (server-side, uses service role key).

### Edge Functions

#### New: `manage-auth-user`
- Handles admin operations: create user, delete user, update password.
- Verifies the calling user is authenticated and is an admin before executing.
- Uses `SUPABASE_SERVICE_ROLE_KEY` server-side (never exposed to browser).
- Creates both `auth.users` entry and `public.users` profile atomically (with rollback on failure).

#### New: `setup-password`
- Handles password setup for newly invited users (registration token flow).
- Validates registration token from `user_registration_tokens` table.
- Updates password via Supabase Admin API.
- Marks token as used after successful password update.

#### Updated: `reset-password`
- **Removed**: `hash_password` RPC call and direct `users.password` column update.
- **Added**: `supabase.auth.admin.updateUserById()` to update password through Supabase Auth.

### Login Pages
- **`LoginPage.tsx`**: Label changed from "Username" to "Username or Email". Updated placeholder text and validation message.
- **`ClientLoginPage.tsx`**: Same label and placeholder updates as above.

### Password Setup Page (`PasswordSetupPage.tsx`)
- **Removed**: Direct `supabase.rpc('hash_password')` call.
- **Removed**: Direct `users.password_hash` column update.
- **Added**: Calls `setup-password` Edge Function which handles token validation, password update via Admin API, and token marking.

### User Management (`UserManagementSettings.tsx`)
- Email field changed from optional to **required** when creating new users (Supabase Auth requires email).
- Updated validation to require email before user creation.

### Supabase Client (`src/lib/supabase.ts`)
- **Removed**: `console.log` that exposed the Supabase URL in browser console.
- **Removed**: `console.error` that logged configuration details.
- **Removed**: Redundant `apikey` header from global config (handled automatically by the client).

## Files Modified
- `src/hooks/useAuth.ts` - Complete rewrite
- `src/lib/supabase.ts` - Cleaned up, removed logging
- `src/components/LoginPage.tsx` - Label/placeholder updates
- `src/components/ClientLoginPage.tsx` - Label/placeholder updates
- `src/components/PasswordSetupPage.tsx` - Edge function integration
- `src/components/settings/UserManagementSettings.tsx` - Required email field
- `supabase/functions/reset-password/index.ts` - Admin API integration
- `supabase/functions/manage-auth-user/index.ts` - New
- `supabase/functions/setup-password/index.ts` - New

## Security Improvements
1. Passwords are never hashed or compared client-side.
2. Session tokens are managed by Supabase Auth (JWT with automatic refresh), not localStorage JSON blobs.
3. Service role key is only used server-side in Edge Functions.
4. Admin operations (create/delete/update password) require authenticated admin verification.
5. Console logging of sensitive configuration data removed.

## Important Notes
- All 4 existing users have temporary password `TempPass123!` and should change their passwords.
- Users can log in with either their username or email address.
- The `password_hash` column on `public.users` is no longer used for authentication but has been kept nullable (not dropped) to avoid data loss.
