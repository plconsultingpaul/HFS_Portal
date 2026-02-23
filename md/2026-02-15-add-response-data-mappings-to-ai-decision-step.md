# Add Response Data Mappings to AI Decision Step

**Date:** 2026-02-15

## Summary

Added Response Data Mappings support to the AI Decision step in Workflow V2, matching the existing capability in the API Endpoint step. This allows users to extract multiple values from the AI-matched candidate record and write them to specific nested paths in the extracted JSON data.

## Problem

The AI Decision step only supported extracting a single value via Return Field Path + Output Variable Name. This stored the result at a flat top-level key (e.g., `matchedClientId`), but could not write to nested paths like `orders[0].consignee.clientId` the way the API Endpoint step's Response Data Mappings could.

## Changes

### Frontend

**`src/components/settings/workflow-v2/V2AiDecisionConfig.tsx`**
- Added a "Response Data Mappings" section in the AI Matching Configuration panel
- Each mapping row has two fields:
  - **Field path in matched candidate record** (e.g., `clientId`) - the value to extract from the matched record
  - **Where to store in extracted JSON** (e.g., `orders[0].consignee.clientId`) - the nested path to write the value to
- Users can add/remove multiple mapping rows
- Existing Return Field Path and Output Variable Name fields remain unchanged for simpler use cases

### Backend (Edge Functions)

**`supabase/functions/json-workflow-processor-v2/steps/aiDecision.ts`**
- Added `responseDataMappings` processing to the single-result shortcut path (when only one candidate is returned and AI is skipped)
- Previously, `responseDataMappings` only ran in the multi-candidate AI match path

**`supabase/functions/transform-workflow-processor-v2/steps/aiDecision.ts`**
- Same fix as above for the transform workflow processor

### No Database Migration Required

The `config_json` column already stores arbitrary JSON, so `responseDataMappings` is persisted as part of the node configuration without schema changes.
