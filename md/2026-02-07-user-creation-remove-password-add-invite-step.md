# User Creation: Remove Password Requirement & Add Registration Email Step

**Date:** 2026-02-07

## Summary

Removed the password field from user creation and added a 3rd step that prompts the admin to send a registration email. The registration email contains a link for the user to set up their own password.

## Changes

### 1. Edge Function: `manage-auth-user`
- Password is no longer required when creating a user
- If no password is provided, a random UUID is used as a placeholder (the user cannot log in with it)
- The user must complete password setup via the registration email link

### 2. Auth Hook: `useAuth.ts`
- `createUser` function signature updated: `password` parameter changed from `string` to `string | undefined`
- When password is undefined, it is omitted from the edge function request body

### 3. User Management UI: `UserManagementSettings.tsx`
- **Step 1 (User Details):** Password field removed. Only username, email, and role are required.
- **Step 2 (Permissions):** Unchanged. Button label updated from "Save Permissions" to "Next: Send Invite".
- **Step 3 (Invite) [NEW]:** After permissions are saved, the admin is asked whether to send a registration email.
  - **Yes, Send Email:** Sends the registration email to the user's email address, then closes the modal.
  - **No, Skip:** Closes the modal without sending an email. The admin can send the invite later from the user list.
- Removed unused password-related state (`showPassword`) and imports (`Eye`, `EyeOff`)
- Added `CheckCircle` icon import for the step 3 success state

## Files Modified
- `supabase/functions/manage-auth-user/index.ts`
- `src/hooks/useAuth.ts`
- `src/components/settings/UserManagementSettings.tsx`
