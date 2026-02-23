# 2026-02-15 Replace Feature Flags with License System

## Summary

Replaced the existing Feature Management toggle system (admin-only feature flags stored in `feature_flags` table) with a License-based feature gating system. Admins can now upload encrypted `.license` files that control which sidebar navigation items are visible. Added an Imaging placeholder page wired to the license system.

## What Changed

### Database

- **New table: `parse_it_license`** - Stores the validated license payload with columns for each feature boolean (`extractions`, `transformations`, `execute_flows`, `client_portal`, `vendor_portal`, `driver_check_in`, `imaging`), plus `customer_name`, `issued_at`, `expiry_date`, `raw_payload`, and `uploaded_at`. RLS enabled with admin-only insert and authenticated select.

### Edge Functions

- **New: `validate-license`** - Server-side edge function that decrypts AES-256-GCM encrypted license files using PBKDF2 key derivation. Reads `PARSE_IT_LICENSE_KEY` from environment. Returns the decrypted payload or an error.

### New Files

| File | Purpose |
|------|---------|
| `src/services/licenseService.ts` | Service for fetching active license and validating/storing uploaded license files |
| `src/hooks/useLicense.ts` | React hook with `LicenseContext`, `useLicenseProvider()`, `useLicense()`, and `hasFeature()` helper |
| `src/contexts/LicenseContext.tsx` | React context provider wrapping the license hook |
| `src/components/ImagingPage.tsx` | Placeholder page showing "Feature Coming Soon" for the Imaging module |
| `src/components/settings/LicenseSettings.tsx` | License management UI - file upload, feature grid display, license details |
| `supabase/functions/validate-license/index.ts` | Edge function for license file decryption |

### Modified Files

| File | Changes |
|------|---------|
| `src/types/index.ts` | Replaced `FeatureFlag` and `FeatureFlags` interfaces with `ParseItLicense` interface |
| `src/components/SettingsPage.tsx` | Removed Feature Management tab, added License tab (admin-only) |
| `src/components/Layout.tsx` | Added Imaging nav item, added license gating for 7 sidebar items using `hasFeature()` |
| `src/components/LayoutRouter.tsx` | Same changes as Layout.tsx - Imaging nav item + license gating for sidebar |
| `src/App.tsx` | Added `LicenseProvider` wrapper, `ImagingPage` rendering, removed feature flag props |
| `src/AppRouter.tsx` | Added `LicenseProvider` wrapper, `/imaging` route, removed feature flag props |
| `src/hooks/useSupabaseData.ts` | Removed `featureFlags` state, `fetchFeatureFlags` call, `handleUpdateFeatureFlags` function, and related return values |
| `src/services/index.ts` | Removed `featureFlagService` re-export |

### Deleted Files

| File | Reason |
|------|--------|
| `src/services/featureFlagService.ts` | Replaced by `licenseService.ts` |
| `src/components/settings/FeatureManagementSettings.tsx` | Replaced by `LicenseSettings.tsx` |

### Sidebar Files Updated

All three sidebar files were reviewed:
1. **`Layout.tsx`** - Updated with license gating + Imaging nav item
2. **`LayoutRouter.tsx`** - Updated with license gating + Imaging nav item
3. **`ClientLayout.tsx`** - No changes needed (client portal items are not license-gated)

### License Feature Key Mapping

| License Key | Sidebar Item |
|-------------|-------------|
| `extractions` | Extract |
| `transformations` | Transform |
| `executeFlows` | Execute |
| `clientPortal` | Client Setup |
| `vendorPortal` | Vendor Setup |
| `driverCheckIn` | Check-In Setup |
| `imaging` | Imaging |

### Notes

- The expiry date is informational only and does not block application usage
- License gating checks are applied before role/permission checks in the sidebar filter
- If no license is uploaded, all features are hidden (no license = no features visible)
- The Imaging page is a placeholder showing "Feature Coming Soon"
