# 2026-02-14 - Add AI Decision Step Type to Workflow V2

## Summary

Added a new **AI Decision** step type to Workflow V2. This step combines an API lookup with Gemini AI matching to intelligently select the best record from multiple candidates when exact matching is not possible.

## Problem

When extracted data (e.g., Shipper Name, Address, City, Postal Code) needs to be matched against an external API, exact matches often fail due to spelling variations, abbreviations, or formatting differences. Using a "contains" filter returns multiple results, requiring manual selection.

## Solution

The AI Decision step automates this by:

1. **Source Record** - Gathers configured fields from extracted data (e.g., Name, Address, City, Postal Code)
2. **API Lookup** - Calls a configured API endpoint to fetch multiple candidate records (e.g., all customers matching a postal code)
3. **AI Matching** - Sends both source record and candidates to Gemini AI with custom matching instructions
4. **Result Extraction** - Returns a specific field from the matched record (e.g., `clientId`) and stores it as a workflow variable for downstream steps

## Changes

### Database

- **Migration**: Updated `workflow_v2_nodes.step_type` CHECK constraint to include `ai_decision`

### Frontend

- **types/index.ts**: Added `ai_decision` to `WorkflowV2StepType` union
- **WorkflowV2FlowNodes.tsx**: Added icon (BrainCircuit), label, and color (cyan) for AI Decision nodes
- **WorkflowV2FlowDesigner.tsx**: Added AI Decision to the "Add Step" menu and minimap colors
- **WorkflowV2StepConfigPanel.tsx**: Added AI Decision to the step type dropdown and routed to config component
- **V2AiDecisionConfig.tsx** (new): Configuration UI with three collapsible sections:
  - Source Record: Map extracted fields with labels and variable references
  - API Lookup: Full API endpoint configuration (reuses V2ApiEndpointConfig) plus result array path
  - AI Matching: Custom instructions, return field path, output variable name, and behavior toggles

### Edge Functions

- **json-workflow-processor-v2/steps/aiDecision.ts** (new): Step handler that executes the API call, extracts candidates, calls Gemini for matching, and stores the result
- **transform-workflow-processor-v2/steps/aiDecision.ts** (new): Identical handler for the transform processor
- Both processor `index.ts` files updated to import and route `ai_decision` step type

## Configuration Options

| Setting | Description |
|---------|-------------|
| Source Fields | Label + variable value pairs from extracted data |
| API Source | Main, Secondary, or Auth Config API |
| HTTP Method | GET, POST, PUT, PATCH, DELETE |
| API Path / Endpoint | Configured via API Spec or manual entry |
| Query Parameters | With variable substitution support |
| Result Array Path | Dot-path to the array of candidates in API response |
| Matching Instructions | Custom text instructions for Gemini |
| Return Field Path | Dot-path to extract from the matched record |
| Output Variable Name | Variable name for downstream step references |
| Skip AI if Single Result | Auto-select when only one candidate (default: on) |
| Fail on No Match | Whether to fail the workflow if no match is found |

## Behavior Notes

- If the API returns zero candidates, the step either fails or sets the output to null (based on config)
- If exactly one candidate is returned and "Skip AI if single result" is enabled, that record is used directly without calling Gemini
- Response Data Mappings from the API Endpoint config are also supported, applied to the matched record
- The matched value is stored in both `contextData` and `contextData.extractedData` for maximum compatibility with downstream steps
