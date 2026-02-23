# Add Filter Expression Builder Button to Query Parameters

**Date:** 2026-02-14

## Summary

Added a new **Filter** button (funnel icon) next to the existing field list button in the Query Parameters section of the Workflow V2 API Endpoint and AI Decision step configurations.

## What Changed

### `src/components/settings/workflow-v2/V2ApiEndpointConfig.tsx`

- Added `Filter` icon import from `lucide-react`
- Added new `allEndpointFields` state that loads ALL non-query fields from the selected API spec endpoint (not just response fields)
- The **Filter** button (orange funnel icon) now renders independently of the List button -- it shows whenever the endpoint has any non-query spec fields, even if no response fields exist
- The **List** button (teal) still only shows when response spec fields are available
- The Filter button's `SpecFieldDropdown` uses `allEndpointFields` as its field source, so it includes response fields, request body fields, and any other entity fields defined in the spec

### Why the Filter button was not showing

The original code wrapped both the List and Filter buttons inside `{responseSpecFields.length > 0 && (...)}`. If the API spec endpoint had query parameters defined but no response fields in the spec, neither button would render. The fix separates the two conditions:

- **List button**: gated by `responseSpecFields.length > 0` (unchanged)
- **Filter button**: gated by `allEndpointFields.length > 0` (new, loads all non-query fields)

## How It Works

- The existing **List** button (teal) inserts a raw field path directly into the parameter value
- The new **Filter** button (orange) opens the same dropdown but in expression builder mode, letting users construct full filter expressions like `fieldPath eq 'value'` or `contains(fieldPath,'value')`
- The `SpecFieldDropdown` component already supported both modes via its `isFilterParam` prop; this change wires up a second trigger button that always activates filter mode
- The AI Decision step inherits this automatically since it wraps `V2ApiEndpointConfig`

## No Database Changes

No migrations or schema changes were needed.
