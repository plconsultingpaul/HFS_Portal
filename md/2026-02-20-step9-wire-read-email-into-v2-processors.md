# 2026-02-20 - Step 9: Wire read_email Into V2 Processor Dispatch Loops

## Summary

Wired the `executeReadEmail` handler (created in Steps 7 and 8) into both V2 processor edge functions so that `read_email` step nodes are actually executed during workflow traversal.

## Files Modified

### `supabase/functions/json-workflow-processor-v2/index.ts`

Three changes:

1. **Import** - Added `import { executeReadEmail } from "./steps/readEmail.ts";` (line 12)

2. **contextData merge** - Added block after contextData initialization (before the extractedData spread) that merges `requestData.contextData` if present. This allows the email-monitor caller to pass email context variables (`emailSubject`, `emailBody`, `emailFrom`, `emailDate`) into the workflow:
   ```
   if (requestData.contextData && typeof requestData.contextData === 'object') {
     contextData = { ...contextData, ...requestData.contextData };
   }
   ```

3. **Dispatch block** - Added `else if (node.step_type === 'read_email')` branch in the node execution switch, calling `executeReadEmail(node, contextData, ...)`. Also added `read_email` to the step log exclusion check (alongside `ai_decision`) since the handler logs its own sub-steps.

### `supabase/functions/transform-workflow-processor-v2/index.ts`

Same three changes:

1. **Import** - Added `import { executeReadEmail } from "./steps/readEmail.ts";` (line 12)

2. **contextData merge** - Added the same `requestData.contextData` merge block after contextData initialization.

3. **Dispatch block** - Added `else if (node.step_type === 'read_email')` branch and excluded `read_email` from the default step log creation.

## Deployments

- `json-workflow-processor-v2` edge function deployed
- `transform-workflow-processor-v2` edge function deployed
