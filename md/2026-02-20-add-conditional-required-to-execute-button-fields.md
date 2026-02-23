# 2026-02-20 - Add Conditional Required to Execute Button Fields

## Summary

Added the ability to make Execute Button fields conditionally required based on the value of another field in the same group.

Previously, a field could only be marked as "Required" (always) or not required. Now there is a third option: **Conditionally Required**, where a field becomes required only when a specified sibling field meets a given condition.

## Example Use Case

- **Container Number** is an optional field.
- **Container Owner** and **Container Type** are configured as conditionally required: "Required when Container Number is Not Empty."
- If a user fills in Container Number, Container Owner and Container Type become required and must be filled before submission.
- If Container Number is left blank, Container Owner and Container Type remain optional.

## Database Changes

**Migration:** `add_conditional_required_to_execute_button_fields`

Added three nullable columns to `execute_button_fields`:

| Column | Type | Description |
|--------|------|-------------|
| `conditional_required_field_id` | uuid (FK, self-referencing, ON DELETE SET NULL) | The field whose value is checked |
| `conditional_required_operator` | text | One of: `not_null`, `null`, `starts_with`, `contains` |
| `conditional_required_value` | text | Comparison value (used by `starts_with` and `contains`) |

An index was added on `conditional_required_field_id` for performance.

## UI Changes (Execute Setup - Field Modal)

Below the existing "Required" checkbox, a new **Conditionally Required** section appears when "Required" is toggled off:

1. A checkbox to enable/disable conditional required
2. A dropdown to select the dependency field (from same group)
3. A dropdown for the condition operator:
   - **Is Not Empty** (`not_null`)
   - **Is Empty** (`null`)
   - **Starts With** (`starts_with`)
   - **Contains** (`contains`)
4. A text input for the comparison value (only shown for `starts_with` and `contains`)

When "Required" is toggled on, the conditional required section is hidden and its values are cleared (unconditionally required takes precedence).

## Runtime Validation Changes

Both `FlowExecutionModal.tsx` and `ExecuteModal.tsx` were updated to evaluate conditional required rules during form validation:

- If a field has `isRequired: true`, it is always required (no change).
- If a field has a `conditionalRequiredFieldId` configured, the referenced field's current value is evaluated against the operator at validation time.
- If the condition is met, the field is treated as required and validation enforces it.
- The required asterisk (*) dynamically appears/disappears based on the condition being met.

## Files Modified

- `supabase/migrations/..._add_conditional_required_to_execute_button_fields.sql` - DB migration
- `src/components/common/FlowExecutionModal.tsx` - Interface, validation logic, dynamic required asterisk
- `src/components/settings/ExecuteSetupSettings.tsx` - Interface, load/save mapping, field modal UI
- `src/components/ExecuteModal.tsx` - Interface, field mapping, validation logic, dynamic required asterisk
- `src/components/ExecutePage.tsx` - Field mapping from DB
- `src/components/PublicExecutePage.tsx` - Field mapping from DB
- `src/components/settings/flow/FlowDesigner.tsx` - Interface, field mapping from DB
