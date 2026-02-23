# Fix Array Builder RIN Removing Entire Array Instead of Single Field

**Date:** 2026-02-16

## Problem

In the Extract - Array Builder, when RIN (Remove If Null) was checked on an Entry Field, if that field's value was null, the entire array was being removed from the output -- even though "Remove Entire Entry if RIN Field is Null" was NOT checked. The expected behavior was to only remove that specific field from the array entry, not the whole array.

## Root Cause

Two bugs in `src/lib/gemini.ts`:

### Bug 1: Redundant Step 6b (removed)

**Step 6b** (formerly lines 1171-1219) re-processed arrays that were already correctly handled by **Step 6a**. It contained an overwrite bug where multiple entries targeting the same array field would overwrite each other's config in a `removeIfNullFieldsByArray` map. The last entry's `removeEntryIfRinNull` value would apply to ALL entries for that array.

After Step 6a correctly removed RIN fields (making them `undefined` on items), Step 6b's `dropEntry=true` path treated `undefined` as null and dropped every entry -- emptying the array and causing it to be deleted.

**Fix:** Removed Step 6b entirely. It was completely redundant since Step 6a already handles all RIN logic correctly for both repeating and static entries. The email-monitor's `data-processor.ts` never had a Step 6b equivalent and worked correctly.

### Bug 2: Data Type Conversion Before RIN Check (reordered)

The RIN null check ran AFTER data type conversion. For number/integer fields, `null` was converted to `''` then to `0`. For boolean fields, `null` was converted to `''` then to `"False"`. Since `0` and `"False"` don't match the RIN null conditions (`null`, `''`, `undefined`, `'null'`), RIN could never trigger for these data types.

**Fix:** Moved the RIN null check to run BEFORE data type conversion in both repeating entry processing and static entry processing. Now the check sees the raw value before it gets converted, so RIN works correctly for all data types.

## Files Changed

- `src/lib/gemini.ts`
  - Removed Step 6b block (redundant post-processing of RIN fields)
  - Moved RIN null check before data type conversion in repeating entry processing
  - Moved RIN null check before data type conversion in static entry processing (both hardcoded and extracted/mapped branches)
