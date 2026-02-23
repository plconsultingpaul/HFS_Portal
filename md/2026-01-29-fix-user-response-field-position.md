# Fix User Response Message Field Position in Workflow Steps

**Date:** 2026-01-29

## Summary

Relocated the "User Response Message" field in the workflow step configuration form to appear below the Response Data Mappings section, making it more logically positioned near other output-related settings.

## Problem

The User Response Message field was positioned at the top of the step configuration form, immediately after the Step Name and Step Type fields. This placement was not intuitive as users expected to configure input parameters first before defining output/response messages.

## Solution

Moved the User Response Message field to the bottom of the step configuration form, just before the "Next Step on Success" and "Next Step on Failure" navigation dropdowns. This positions it:

1. **After** all step-type-specific configuration sections (including Response Data Mappings)
2. **Before** the workflow navigation options

## File Changed

- `src/components/settings/workflow/StepConfigForm.tsx`

## Technical Details

- Removed the User Response Template JSX block from its original position (after Step Name/Type grid)
- Inserted the same block before the "Next Step on Success/Failure" grid at the bottom of the form
- No functional changes were made to the field itself - only its visual position in the form was updated
