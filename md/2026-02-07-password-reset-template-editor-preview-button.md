# 2026-02-07 Password Reset Template Editor - Add Preview Button

## Summary
Added a "Show Preview" / "Hide Preview" toggle to the Password Reset Template Editor modal, matching the existing preview functionality in the Invitation Email Template Editor.

## Changes

### Modified Files
- `src/components/settings/PasswordResetTemplateEditor.tsx`
  - Added `Eye` icon import from lucide-react
  - Added `showPreview` state toggle
  - Added `renderPreview()` helper that substitutes `{{username}}` and `{{reset_link}}` with sample values
  - Replaced the static "Email Body (HTML)" label with a flex row containing the label and a "Show Preview" / "Hide Preview" toggle button
  - When preview is active, the HTML textarea is replaced with a rendered HTML preview pane (matching the InvitationEmailTemplateEditor pattern)

## Affected Pages
Since `PasswordResetTemplateEditor` is a shared component, this change applies to all four template types across both pages:
- **User Management** (Admin): Forgot Username Email, Reset Password Email
- **Client Management**: Forgot Username Email, Reset Password Email
