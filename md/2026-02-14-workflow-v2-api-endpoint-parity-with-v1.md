# Workflow V2 API Endpoint Step - Full Parity with V1

**Date:** 2026-02-14

## Problem

The Workflow V2 API Endpoint step configuration was missing several fields and features that existed in the original V1 Workflow API Endpoint step. The V2 version only had basic source/method/path/request body fields, while V1 had a comprehensive set of configuration options used in production.

## What Changed

### New File Created

- `src/components/settings/workflow-v2/V2ApiEndpointConfig.tsx` - Standalone component containing the full API Endpoint step configuration, ported from V1's `ApiEndpointConfigSection.tsx` and adapted for the V2 side-panel layout.

### Files Modified

- `src/components/settings/workflow-v2/WorkflowV2StepConfigPanel.tsx` - Replaced the inline API Endpoint config rendering with the new `V2ApiEndpointConfig` component. Removed redundant state, effects, and data-loading logic that the new component now handles internally. Added `allNodes` prop for variable resolution.

- `src/components/settings/workflow-v2/WorkflowV2FlowDesigner.tsx` - Now passes the `allNodes` array to the step config panel so the API Endpoint config can build variable lists from other workflow nodes.

## Features Added to V2 API Endpoint Config

These features already existed in V1 and were missing from V2:

1. **Query Parameter Configuration** - Loads query parameters from the selected API spec endpoint, with enable/disable toggles, value inputs, variable insertion, and OData filter expression builder via SpecFieldDropdown.

2. **Path Variable Configuration** - Auto-detects `{variable}` patterns in the endpoint path and shows input fields for each, with VariableDropdown integration.

3. **Request Body Template with Field Mapping** - JSON template textarea with "Map JSON" button that auto-generates field mappings from the template structure. Each mapping supports hardcoded/variable types, data type selection, and variable insertion.

4. **Array Processing Modes** - Full support for loop, batch, single array, and conditional hardcode modes, including source group selection, stop-on-error toggle, wrap-in-array toggle, and conditional array mappings with per-condition field mappings.

5. **VariableDropdown Integration** - Available throughout the config for inserting `{{variable}}` references from other workflow nodes' response data mappings.

6. **SpecFieldDropdown Integration** - For query parameter values and response data mapping paths, with OData $filter expression builder support.

7. **URL Preview** - Shows the full constructed URL including base URL, path, and query parameters.

8. **Response Data Mappings with Spec Fields** - Enhanced response data mappings that integrate SpecFieldDropdown for browsing API response fields.

## Features Preserved from V2

- Auth Config as an API source type (not in V1)
- DELETE HTTP method option (not in V1)

## No Database Changes Required

All config fields are stored in the existing `config_json` JSONB column on `workflow_v2_nodes`, which is flexible enough to hold all these fields. The execution-side edge functions already handle all of these config fields.
