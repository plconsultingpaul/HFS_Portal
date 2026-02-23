# Fix AI Decision Step to Enforce Single Result Selection

**Date:** 2026-02-15

## Problem

The AI Decision step was returning all records from the API response instead of a single matched result. The root cause: the API returns a wrapper object (e.g., `{ href, count, limit, clients: [...] }`) and when `resultArrayPath` is not configured, the code treated the entire wrapper as one "candidate." Since there was only 1 "candidate" (the wrapper), AI was skipped and the whole object -- containing all 20 client records -- became the matched result.

## Changes Made

### File: `supabase/functions/json-workflow-processor-v2/steps/aiDecision.ts`

1. **Fixed candidate extraction (root cause)** - When `resultArrayPath` is not set and the API returns a non-array object, the code now auto-detects the first array property inside the response and uses its contents as the candidate list. For example, a response with `{ count: 287, clients: [...] }` will now correctly extract the `clients` array as 20 individual candidates instead of wrapping the entire object as 1 candidate.

2. **Hardened Gemini prompt** - Rewrote the AI prompt to explicitly require exactly ONE match. Added a rule that if multiple candidates match equally well, the AI must select the first one (lowest index). Changed language from suggestive ("find the single best match") to mandatory ("You MUST select exactly ONE candidate").

3. **Added code-level fallback** - After parsing Gemini's response, added validation that `matchIndex` is a valid integer. If Gemini returns a non-integer or unexpected value, the code now falls back to index 0 (first candidate) and appends a note to the reason explaining the fallback.

4. **Improved log output** - Replaced the nested `aiResult` object in the AI Matching sub-step log with flat, clearly named fields:
   - `selectedIndex` - which candidate was picked (zero-based)
   - `confidence` - the AI's confidence score
   - `selectionReason` - why the AI chose this candidate
   - `selectedRecord` - the full record that was selected
   - `selectedValue` - the extracted value from the selected record
   - `outputVariable` - the variable name where the result is stored
