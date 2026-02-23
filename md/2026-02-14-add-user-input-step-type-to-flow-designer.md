# 2026-02-14 - Add User Input Step Type to Flow Designer

## Summary

Added a new **User Input** step type to the Execute Button Flow Designer. This single step type supports two input modes: **Barcode Scanner** and **Number Pad**. It pauses the flow, collects a value from the user, stores it in context data, and passes it to the next step.

## What Changed

### Database Migration
- Added `user_input` to the `execute_button_flow_nodes` step_type CHECK constraint.

### Flow Designer (FlowDesigner.tsx)
- Added `User Input` to the workflow step types panel with a `TextCursorInput` icon (sky color).
- Added sky-blue color (`#0ea5e9`) to the MiniMap for `user_input` nodes.

### Flow Nodes (FlowNodes.tsx)
- Added `TextCursorInput` icon for `user_input` step type.
- Added `User Input` label.
- Added sky-blue color scheme (`bg-sky-100`, `text-sky-600`, `border-sky-300`).
- `user_input` is a linear step (single output handle, not branching or terminal).

### Step Config Form (StepConfigForm.tsx)
- Added `User Input` to the step type dropdown.
- Added configuration fields:
  - **Input Type** selector: `Barcode Scanner` or `Number Pad`.
  - **Prompt Label**: The text shown above the input UI.
  - **Variable Name**: Where the collected value is stored (`execute.input.<variableName>`).
- Config is saved as `{ inputType, inputLabel, variableName }`.

### Flow Execution Modal (FlowExecutionModal.tsx)
- Added `BarcodeScannerUI` component:
  - Opens device camera using `navigator.mediaDevices.getUserMedia`.
  - Uses the browser's native `BarcodeDetector` API to detect barcodes/QR codes.
  - Falls back to manual text entry if BarcodeDetector is unavailable or camera access is denied.
  - Supports re-scanning and manual override.
- Added `NumberPadUI` component:
  - Renders a phone-style 3x4 keypad (0-9, +, backspace).
  - Displays entered value in a mono-spaced display field.
- Added `UserInputUI` wrapper that renders the correct sub-component based on `inputType`.
- Handles `requiresInput` response from backend (similar to `requiresConfirmation`).
- Added `handleUserInputSubmit` function to resume flow execution after input is collected.

### Execute Button Processor (Edge Function)
- Added `userInputResponse` to destructured request data.
- Added `user_input` case in step execution switch:
  - Returns `requiresInput: true` with `inputData` (inputType, inputLabel, variableName).
  - Includes `pendingContextData` with `inputNodeId` for flow resumption.
- Added user input response handler:
  - Stores submitted value at `contextData.execute.input.<variableName>`.
  - Finds the next edge from the input node and resumes execution.

## How It Works

1. User adds a **User Input** step in the Flow Designer.
2. Configures input type (Barcode Scanner or Number Pad), label, and variable name.
3. At runtime, when the flow reaches this step, it pauses and sends input config to the frontend.
4. Frontend renders the appropriate UI (camera scanner or number pad).
5. User provides input (scans barcode or enters number).
6. Value is sent back to the backend, stored at `execute.input.<variableName>`.
7. Flow resumes from the next connected step.
8. Subsequent steps reference the value as `{{input.<variableName>}}`.

## Files Modified

- `supabase/migrations/` - New migration for `user_input` step type
- `src/components/settings/flow/FlowNodes.tsx` - Node rendering
- `src/components/settings/flow/FlowDesigner.tsx` - Step type list and MiniMap
- `src/components/settings/workflow/StepConfigForm.tsx` - Configuration UI
- `src/components/common/FlowExecutionModal.tsx` - Runtime UI (scanner + number pad)
- `supabase/functions/execute-button-processor/index.ts` - Backend execution logic
