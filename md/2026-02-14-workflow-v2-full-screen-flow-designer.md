# Workflow V2 Full-Screen Flow Designer

## Summary

Updated the Workflow V2 flow designer to open full screen, matching the Execute Setup flow designer behavior and zoom level.

## Changes

### `src/components/settings/workflow-v2/WorkflowV2FlowDesigner.tsx`

- Changed outer container from inline `h-[calc(100vh-280px)]` to `fixed inset-0 z-50` full-screen overlay
- Changed loading state to also use `fixed inset-0 z-50` full-screen overlay
- Wrapped component export with `ReactFlowProvider` for consistent behavior
- Added `defaultViewport={{ x: 0, y: 0, zoom: 0.75 }}` to match Execute Setup's 75% zoom
- Added `fitViewOptions={{ maxZoom: 0.75 }}` to cap fitView zoom at 75%
- Added `snapToGrid` with `snapGrid={[15, 15]}` to match Execute Setup
- Added `deleteKeyCode={['Backspace', 'Delete']}` to match Execute Setup
- Changed background dot `gap` from 16 to 20 to match Execute Setup
- Added `defaultZoom` prop (defaults to 75) for consistency

### `src/components/settings/workflow-v2/WorkflowV2Settings.tsx`

- Added `createPortal` import from `react-dom`
- Wrapped `WorkflowV2FlowDesigner` render in `createPortal(..., document.body)` so it breaks out of the settings page layout and overlays the full viewport
