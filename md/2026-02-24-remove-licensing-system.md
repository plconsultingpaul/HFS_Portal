# 2026-02-24 Remove Licensing System

## Summary

Removed the entire licensing system from the application. All sidebar tabs (Vendor Setup, Client Setup, Check-In Setup) are now visible to admin users without requiring a license file. The License tab has been removed from Settings.

## Files Modified

- **src/components/Layout.tsx** - Removed `useLicense` import and `hasFeature()` checks that hid Client Setup, Vendor Setup, and Check-In Setup sidebar items based on license status.
- **src/components/LayoutRouter.tsx** - Same as Layout.tsx: removed `useLicense` import and `hasFeature()` sidebar filter conditions.
- **src/components/SettingsPage.tsx** - Removed `LicenseSettings` import, the `license` tab from the tab type and tab array, and the `case 'license'` rendering block. Removed unused `Shield` icon import.
- **src/App.tsx** - Removed `LicenseProvider` import and unwrapped the `<LicenseProvider>` wrapper from the component tree.
- **src/AppRouter.tsx** - Removed `LicenseProvider` import and unwrapped it from the router component tree.
- **src/types/index.ts** - Removed the `ParseItLicense` interface.

## Files Deleted

- `src/components/settings/LicenseSettings.tsx` - License upload and display UI component.
- `src/hooks/useLicense.ts` - License context hook providing `hasFeature()`, `uploadLicense()`, etc.
- `src/contexts/LicenseContext.tsx` - License context provider wrapping the app.
- `src/services/licenseService.ts` - Service for fetching and validating licenses against Supabase.
- `supabase/functions/validate-license/` - Edge function for server-side license decryption and validation.

## Database

No changes. The `parse_it_license` table remains in place (data safety).

## Behavior Change

- Admin users now see all sidebar tabs (Vendor Setup, Client Setup, Check-In Setup) without needing an uploaded license.
- Sidebar visibility is now controlled solely by user role and permissions.
- The License tab no longer appears in Settings for any user.
