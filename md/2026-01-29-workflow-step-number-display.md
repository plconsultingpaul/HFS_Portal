# Workflow Step Number Display Update

**Date:** 2026-01-29

## Summary

Updated the workflow progress step indicators to always display step numbers instead of status icons. The step status is now indicated solely through color.

## Changes Made

### Files Modified

1. **src/components/extract/PageGroupCard.tsx**
   - Simplified `getStepStatusIcon` function to always return the step number
   - Previously returned different icons based on status (checkmark, X, spinner, etc.)

2. **src/components/extract/PageProcessorCard.tsx**
   - Same change as above - simplified `getStepStatusIcon` to always return step number

### Visual Changes

**Before:**
- Completed steps: Green circle with checkmark icon
- Failed steps: Red circle with X icon
- Running steps: Blue circle with spinner icon
- Skipped steps: Gray circle with slash icon
- Pending steps: Gray circle with step number

**After:**
- Completed steps: Green circle with step number
- Failed steps: Red circle with step number
- Running steps: Blue circle with step number
- Skipped steps: Gray circle with step number
- Pending steps: Gray circle with step number

### Files Already Correct (No Changes Needed)

- `src/components/extract/SingleFileProcessor.tsx` - Already used `{index + 1}`
- `src/components/transform/PageTransformerCard.tsx` - Already used `{step.stepOrder}`

## Color Legend

| Status    | Circle Color |
|-----------|--------------|
| Completed | Green        |
| Running   | Blue (pulsing) |
| Failed    | Red          |
| Skipped   | Gray         |
| Pending   | Light Gray   |
