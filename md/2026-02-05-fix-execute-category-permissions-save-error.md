# Fix Execute Category Permissions Save Error

## Date: 2026-02-05

## Issue
When attempting to save execute category permissions for a user in the User Management settings, the operation failed with the error "Failed to update execute category permissions. Please try again." No console errors appeared, indicating the function was never being called.

## Root Cause
The app uses `AppRouter.tsx` as its entry point. The `useAuth()` destructuring in `AppRouter.tsx` did not include `getUserExecuteCategories` or `updateUserExecuteCategories`, and these functions were not passed as props to the `SettingsPage` component. This meant the prop was `undefined`, causing a `TypeError` when the button handler tried to call it.

## Solution
Added the two missing functions (`getUserExecuteCategories` and `updateUserExecuteCategories`) to:
1. The `useAuth()` destructuring in `AppRouter.tsx`
2. The `SettingsPage` component props in `AppRouter.tsx`

## Files Changed
- `src/AppRouter.tsx` - Added `getUserExecuteCategories` and `updateUserExecuteCategories` to `useAuth()` destructuring and passed them as props to `SettingsPage`
