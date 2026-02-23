# 2026-02-20 - Step 10: Email Monitor Workflow V2 Processing Mode

## Summary

Updated the email-monitor edge function to support the `workflow_v2` processing mode. When an email matches a rule with this mode, the monitor fetches the email body and calls the Workflow V2 processor directly, bypassing PDF attachment logic entirely.

## Files Modified

### `supabase/functions/email-monitor/lib/services/email-base.ts`

- Added `getEmailBody(emailId: string): Promise<string>` to the `EmailProvider` interface

### `supabase/functions/email-monitor/lib/services/office365.ts`

- Implemented `getEmailBody`: fetches `messages/{emailId}?$select=body` via Microsoft Graph API, strips HTML tags from `body.content`, returns plain text
- Relaxed `fetchUnreadEmails` filter from `hasAttachments eq true and isRead eq false` to `isRead eq false` so emails without attachments are also fetched (needed for workflow_v2 body-only processing)

### `supabase/functions/email-monitor/lib/services/gmail.ts`

- Implemented `getEmailBody`: fetches `messages/{emailId}?format=full`, extracts `text/plain` from MIME parts, falls back to `text/html` with tag stripping
- Relaxed `fetchUnreadEmails` query from `has:attachment is:unread` to `is:unread` for the same reason as Office365

### `supabase/functions/email-monitor/index.ts`

1. **ProcessingRule interface** - Added `processing_mode` and `workflow_v2_id` fields

2. **Rules query** - Added `processing_mode` and `workflow_v2_id` to the Supabase `.select(...)` string

3. **processEmail restructure** - Moved rule matching (`findMatchingRule`) BEFORE the PDF attachment check. When the matched rule has `processing_mode === 'workflow_v2'`:
   - Fetches email body via `provider.getEmailBody(emailId)`
   - POSTs to `json-workflow-processor-v2` with payload containing `workflowId`, `senderEmail`, and `contextData` (emailSubject, emailBody, emailFrom, emailDate)
   - Handles success/failure response
   - Applies post-processing action (mark read, move to folder, etc.)
   - Returns result immediately (skips PDF attachment logic)
   - For non-workflow_v2 rules: continues with existing PDF attachment detection and processing as before

## Deployment

- `email-monitor` edge function deployed via `mcp__supabase__deploy_edge_function`
