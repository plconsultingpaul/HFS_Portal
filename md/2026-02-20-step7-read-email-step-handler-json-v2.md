# 2026-02-20 - Step 7: Read Email Step Handler (json-workflow-processor-v2)

## Summary

Created the backend step handler for the `read_email` step type in the JSON Workflow V2 processor edge function.

## File Created

### `supabase/functions/json-workflow-processor-v2/steps/readEmail.ts`

Exports `executeReadEmail(step, contextData, supabaseUrl, supabaseServiceKey, executionLogId?, workflowId?)` with the following logic:

**Field mapping types:**
- **hardcoded** - Sets `contextData[fieldName]` to the literal value, cast by `dataType`
- **function** - Resolves `{{variable}}` templates against `contextData`, then casts by `dataType`
- **ai** - Batches all AI-type mappings into a single Gemini API call with a structured prompt that includes the email subject/body content from `contextData.emailSubject` / `contextData.emailBody`. Parses the JSON response and sets each field.

**Data type casting:**
- `string` - default, returns as-is
- `number` - parses as float
- `integer` - parses as int
- `boolean` - converts `true`/`1`/`yes` to `true`
- `date_only` - formats as `YYYY-MM-DD`
- `datetime` - formats as ISO 8601
- `rin` - strips non-alphanumeric characters, uppercases

**Result storage:**
- All extracted values are written to both `contextData[fieldName]` and `contextData.extractedData[fieldName]`

**Logging:**
- Logs sub-steps via `createV2StepLog` (one for hardcoded/function fields, one for AI extraction)

**Gemini integration:**
- Follows the same pattern as `aiDecision.ts`: fetches active Gemini API key and model from DB via Supabase client, uses `GoogleGenerativeAI` npm import
