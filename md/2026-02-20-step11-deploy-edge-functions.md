# 2026-02-20 - Step 11: Deploy Edge Functions

## Summary

Deployed all three edge functions modified during the Read Email / Workflow V2 feature implementation to Supabase.

## Edge Functions Deployed

1. **email-monitor** - Updated with `getEmailBody` support for both Office365 and Gmail providers, `workflow_v2` processing mode handling, and relaxed email filters to include emails without attachments.

2. **json-workflow-processor-v2** - Updated with the `read_email` step handler and `contextData` merge logic so email fields (subject, body, from, date) are available to workflow steps.

3. **transform-workflow-processor-v2** - Updated with the same `read_email` step handler and `contextData` merge logic for the transform processing path.

## Deployment Method

All three functions deployed via `mcp__supabase__deploy_edge_function` with `verify_jwt: false` (these functions are invoked server-to-server with service role keys).
