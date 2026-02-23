# Fix Workflow Skipped Step Status Display

**Date:** 2026-01-29

## Problem

In the Extract page's Workflow Progress section, skipped workflow steps were incorrectly displaying as green (completed) instead of gray (skipped). This occurred when:

1. A workflow step was skipped due to conditional logic (e.g., step 300 skipped because a conditional check determined it wasn't needed)
2. The overall workflow had failed at a later step (e.g., step 500 failed)

The Workflow Logs correctly showed that step 300 was not executed, but the visual progress indicator showed it as completed.

## Root Cause

The `getStepStatus` function in both `PageGroupCard.tsx` and `PageProcessorCard.tsx` had flawed fallback logic:

1. If a step had no log entry AND workflow status was `'completed'`, it correctly returned `'skipped'`
2. However, if the workflow status was `'failed'` (because a later step failed), the code would fall through to step order comparison logic
3. This fallback logic assumed: "if the current step order is past this step, mark it as completed"
4. This was wrong for skipped steps - they should remain gray regardless of overall workflow status

## Solution

Moved the "no step log = skipped" check to execute immediately after checking for an existing step log, before any fallback logic based on workflow status:

```typescript
// Before: Only checked inside if (status === 'completed')
// After: Check right after stepLog lookup, before any fallback logic

if (workflowStepLogs.length > 0) {
  return 'skipped';
}
```

If step logs have been loaded but there's no log for a specific step, that step was skipped - regardless of whether the overall workflow completed successfully or failed.

## Files Changed

- `src/components/extract/PageGroupCard.tsx` - Updated `getStepStatus` function
- `src/components/extract/PageProcessorCard.tsx` - Updated `getStepStatus` function

## Testing

To verify the fix:
1. Run a workflow where a conditional check causes a step to be skipped
2. Let a later step fail
3. Confirm the skipped step shows gray (not green) in the Workflow Progress display
