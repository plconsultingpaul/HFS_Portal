# RLS Step 2: Users, Auth & Tokens

**Date:** 2026-02-07
**Migration file:** `step2_tighten_rls_users_auth_tokens`

## Summary

Replaced wide-open RLS policies on 6 tables related to user accounts, authentication tokens, and email templates. Created 4 new SECURITY DEFINER RPC functions to safely handle pre-authentication operations that previously relied on direct table access.

## Tables Changed

| Table | Old Policy | New Policy |
|---|---|---|
| `users` | 4 public policies (USING true) | SELECT: own row or admin; INSERT/UPDATE/DELETE: admin only |
| `password_reset_tokens` | 3 public policies (USING true) | No public policies (service role only) |
| `password_reset_templates` | 3 mixed policies (USING true) | All operations: admin only |
| `user_registration_tokens` | 4 public policies (USING true) | No public policies (service role + RPC only) |
| `invitation_email_templates` | 6 anon/auth policies (USING true) | All operations: admin only |
| `clients` | 1 public FOR ALL (USING true) | SELECT: any authenticated user; writes: admin only |

## New RPC Functions (SECURITY DEFINER)

| Function | Purpose | Called From |
|---|---|---|
| `lookup_email_by_username(p_username, p_role_filter)` | Converts username to email for login (pre-auth) | `useAuth.ts` login flow |
| `update_own_last_login()` | Updates last_login for calling user only | `useAuth.ts` after login |
| `validate_registration_token(p_token)` | Validates invite token and returns user_id | `orderEntryService.ts` / PasswordSetupPage |
| `mark_registration_token_used(p_token)` | Marks token as used after password setup | `orderEntryService.ts` / PasswordSetupPage |

## Frontend Files Changed

| File | Change |
|---|---|
| `src/hooks/useAuth.ts` | Username lookup now uses `lookup_email_by_username` RPC instead of direct `users` table query; last_login update now uses `update_own_last_login` RPC |
| `src/services/orderEntryService.ts` | `validateToken()` now uses `validate_registration_token` RPC; `markTokenAsUsed()` now uses `mark_registration_token_used` RPC |

## What Is Unaffected

- Edge functions (manage-auth-user, send-registration-email, forgot-password, reset-password, setup-password) use the service role key and bypass RLS entirely
- Admin users see no change in behavior for user management, invitation emails, or password reset templates
- Client users can still read their own profile after login

## What To Test

1. **Admin login** (both email and username) -- still works
2. **Client login** (both email and username) -- still works
3. **User management** -- list, create, edit, delete users all work
4. **Password setup flow** -- invite link, token validation, password creation
5. **Password reset flow** -- request reset, receive email, set new password
6. **Invitation email template editor** -- loads and saves correctly
7. **Password reset template editor** -- loads and saves correctly
8. **Client management** -- list, create, edit clients
9. **Client users** -- cannot see other users' data
