# 2026-02-13 Add Route Step Type to Flow Designer

## Summary

Added a new **Route** step type to the Flow Designer that enables multi-path conditional routing (3+ paths) based on a single field value. Unlike the existing Decision step (binary yes/no), Route allows any number of outgoing paths.

## Use Case

A Form Group step has a dropdown field (e.g., "Service Type") with options like LTL, TL, and Intermodal. The Route step evaluates the selected value and sends the workflow down the matching path.

## Changes

### Database

- **Migration**: `add_route_step_type_to_flow_nodes`
  - Added `'route'` to the `step_type` CHECK constraint on `execute_button_flow_nodes`

### Frontend

- **FlowNodes.tsx** (`src/components/settings/flow/FlowNodes.tsx`)
  - Added `Signpost` icon for Route nodes
  - Added `'route'` case to icon, label, and color functions (teal color scheme)
  - Added dynamic handle rendering: Route nodes display N output handles spaced evenly across the bottom, each color-coded and labeled with the route name from config
  - Handle IDs follow the pattern `route_0`, `route_1`, `route_2`, etc.

- **FlowDesigner.tsx** (`src/components/settings/flow/FlowDesigner.tsx`)
  - Added Route to the `workflowStepTypes` array (appears in the Add Node panel)
  - Added Route color to MiniMap node coloring

- **StepConfigForm.tsx** (`src/components/settings/workflow/StepConfigForm.tsx`)
  - Added `route` to the step type dropdown options
  - Added state variables: `routeFieldPath`, `routes` array, `routeDefaultIndex`
  - Added config loading from existing `config_json`
  - Added config saving for route step type
  - Added Route configuration UI with:
    - Field to evaluate (with variable picker)
    - Dynamic route cards (minimum 2), each with label, operator, and expected value
    - Default route radio selector (fallback if no routes match)
    - Add/remove route buttons
    - Operators: Equals, Not Equals, Contains, Not Contains, Greater Than, Less Than

### Backend (Edge Function)

- **execute-button-processor** (`supabase/functions/execute-button-processor/index.ts`)
  - Added `case 'route'` to the workflow step switch statement
  - Evaluates each route's condition in order using the existing `evaluateSingleCondition` function
  - First matching route is followed via its edge (`route_0`, `route_1`, etc.)
  - Falls back to the designated default route if no match
  - Ends flow if no match and no default

## Config JSON Structure

```json
{
  "routeFieldPath": "{{execute.serviceType}}",
  "routes": [
    { "label": "LTL", "operator": "equals", "expectedValue": "LTL" },
    { "label": "TL", "operator": "equals", "expectedValue": "TL" },
    { "label": "Intermodal", "operator": "equals", "expectedValue": "Intermodal" }
  ],
  "routeDefaultIndex": 0
}
```

## Edge Handle Convention

- Route nodes use handle IDs: `route_0`, `route_1`, `route_2`, ...
- These are stored in `execute_button_flow_edges.source_handle` (unrestricted text field, no schema change needed)
