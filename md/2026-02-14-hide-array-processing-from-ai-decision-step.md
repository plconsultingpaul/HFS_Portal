# Hide Array Processing and Response Data Mappings from AI Decision Step

**Date:** 2026-02-14

## Problem

The AI Decision step in Workflow V2 was showing Array Processing, Stop on Error, and Response Data Mappings sections inherited from the shared `V2ApiEndpointConfig` component. These options are irrelevant to the AI Decision step, which performs a single API lookup to fetch candidates, then uses AI to pick the best match. There is no array looping or response data mapping needed.

## Changes

### `V2ApiEndpointConfig.tsx`
- Added `hideArrayAndMappingSections` boolean prop (defaults to `false`)
- When `true`, the following sections are hidden:
  - Array Processing (loop/batch/conditional modes)
  - Stop workflow on error checkbox
  - Response Data Mappings

### `V2AiDecisionConfig.tsx`
- Passes `hideArrayAndMappingSections` to `V2ApiEndpointConfig` so the AI Decision step only shows the API connection, endpoint selection, query parameters, request body, and URL preview -- the parts that are actually relevant.
