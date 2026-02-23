# Restore API Password/Token Field to Configuration Tab

## Summary

The API Password/Token field was missing from the Configuration tab in API Settings. The `password` column exists in the `api_settings` database table but had been dropped from the TypeScript type and the service layer during a prior refactor, causing the field to disappear from the UI.

## Changes Made

### `src/types/index.ts`
- Added optional `password?: string` field to the `ApiConfig` interface.

### `src/services/configService.ts`
- Updated `fetchApiConfig` SELECT query to include the `password` column.
- Added `password` to the returned object in `fetchApiConfig` (both the found-row and default-return paths).
- Added `password` to the `configData` object in `updateApiConfig` so it is persisted on save.

### `src/components/settings/ApiSettings.tsx`
- Added the **API Password/Token** input field (type `password`) to the second column of the API Endpoint grid in the Configuration tab, matching the layout from the previous version.
- Field shows helper text: "Optional: Used as Authorization header".

## No Database Changes Required

The `password` column already exists in the `api_settings` table. No migration was needed.
