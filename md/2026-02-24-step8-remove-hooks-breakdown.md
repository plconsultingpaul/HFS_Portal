# Step 8: Remove Hooks — Breakdown

This breaks the original Step 8 into 3 sub-steps. Each sub-step is self-contained and can be completed independently in order.

---

## Step 8A: Refactor `useSupabaseData` Hook

**Goal:** Remove extraction types, transformation types, workflows, and workflow steps from the central data hook. Child components that still need these values will fetch them locally in Step 8B.

**File to modify:** `src/hooks/useSupabaseData.ts`

Remove the following:

1. **Imports** — Remove `ExtractionType`, `TransformationType`, `ExtractionWorkflow`, `WorkflowStep` from the type import on line 2.

2. **State declarations** — Remove these 4 `useState` calls:
   - `extractionTypes` (line 23)
   - `transformationTypes` (line 24)
   - `workflows` (line 60)
   - `workflowSteps` (line 61)

3. **Fetching inside `loadData()`** — Remove:
   - The `Promise.all` that calls `fetchExtractionTypesLocal()` and `fetchTransformationTypesLocal()` (lines 80-85)
   - The `Promise.all` that calls `fetchWorkflowsLocal()` and `fetchWorkflowStepsLocal()` (lines 98-103)

4. **Local fetch functions** — Delete entirely:
   - `fetchExtractionTypesLocal()` (lines 148-170)
   - `fetchTransformationTypesLocal()` (lines 172-194)
   - `fetchWorkflowsLocal()` (lines 196-214)
   - `fetchWorkflowStepsLocal()` (lines 216-238)

5. **Return object** — Remove these 4 properties:
   - `extractionTypes` (line 325)
   - `transformationTypes` (line 326)
   - `workflows` (line 334)
   - `workflowSteps` (line 335)

**Then update all consumers that destructure these removed values:**

| File | What to remove from destructuring |
|------|-----------------------------------|
| `src/App.tsx` (line 62) | Remove `extractionTypes`, `transformationTypes`, `workflows`, `workflowSteps` from the `useSupabaseData()` destructuring |
| `src/AppRouter.tsx` (line 60) | Remove `extractionTypes`, `transformationTypes`, `workflows`, `workflowSteps` from the `useSupabaseData()` destructuring |

**Then remove prop-passing from App.tsx and AppRouter.tsx to child components:**

| Parent file | Child component | Props to stop passing |
|-------------|-----------------|----------------------|
| `src/App.tsx` | `<VendorSetupPage>` | `extractionTypes`, `transformationTypes` |
| `src/App.tsx` | `<CheckInSetupPage>` | `workflows` |
| `src/App.tsx` | `<ClientSetupPage>` (both usages) | `extractionTypes`, `transformationTypes` |
| `src/App.tsx` | `<SettingsPage>` | `extractionTypes`, `workflows`, `workflowSteps` |
| `src/App.tsx` | `<SettingsPage>` | `getUserExtractionTypes`, `updateUserExtractionTypes`, `getUserTransformationTypes`, `updateUserTransformationTypes` |
| `src/AppRouter.tsx` | `<VendorSetupPage>` | `extractionTypes`, `transformationTypes` |
| `src/AppRouter.tsx` | `<CheckInSetupPage>` | `workflows` |
| `src/AppRouter.tsx` | `<ClientSetupPage>` (both usages) | `extractionTypes`, `transformationTypes` |
| `src/AppRouter.tsx` | `<SettingsPage>` | `extractionTypes`, `workflows`, `workflowSteps`, `getUserExtractionTypes`, `updateUserExtractionTypes`, `getUserTransformationTypes`, `updateUserTransformationTypes` |

**Do NOT run build yet** — child components still declare these props in their interfaces, so there will be type errors until Step 8B is done.

---

## Step 8B: Update Page Components and Their Settings Children

**Goal:** Remove extraction/transformation/workflow props from page components and their child settings components. Where a child component needs these values for its own UI (e.g. dropdown selectors), add a local fetch inside that component.

### Part 1: Page components (remove props from interface, destructuring, and child prop-passing)

**`src/components/VendorSetupPage.tsx`**
- Remove `ExtractionType`, `TransformationType` from type import (line 3)
- Remove `extractionTypes` and `transformationTypes` from `VendorSetupPageProps` interface (lines 13-14)
- Remove from function destructuring (lines 28-29)
- Remove `extractionTypes={extractionTypes}` and `transformationTypes={transformationTypes}` from `<VendorManagementSettings>` JSX (lines 88-89)

**`src/components/ClientSetupPage.tsx`**
- Remove `ExtractionType`, `TransformationType` from type import (line 3)
- Remove `extractionTypes` and `transformationTypes` from `ClientSetupPageProps` interface (lines 12-13)
- Remove from function destructuring (lines 25-26)
- These props were unused in the component body, so no further changes needed

**`src/components/CheckInSetupPage.tsx`**
- Remove `import type { Workflow } from '../types'` (line 3)
- Remove the `CheckInSetupPageProps` interface entirely (lines 7-9)
- Change function signature from `CheckInSetupPage({ workflows }: CheckInSetupPageProps)` to `CheckInSetupPage()`
- Remove `workflows={workflows}` from `<DriverCheckinSettings>` JSX (line 24)

**`src/components/SettingsPage.tsx`**
- Remove `ExtractionType` from type import (line 3); remove `TransformationType` import (line 4)
- Remove from `SettingsPageProps` interface: `extractionTypes`, `transformationTypes`, `workflows`, `workflowSteps`, `getUserExtractionTypes`, `updateUserExtractionTypes`, `getUserTransformationTypes`, `updateUserTransformationTypes`
- Remove from function destructuring
- Remove `extractionTypes`, `transformationTypes`, `workflows` from `<SftpSettings>` JSX (lines 108-110)
- Remove `extractionTypes`, `transformationTypes` from `<EmailMonitoringSettings>` JSX (lines 132-133)
- Remove `extractionTypes`, `getUserExtractionTypes`, `updateUserExtractionTypes`, `transformationTypes`, `getUserTransformationTypes`, `updateUserTransformationTypes` from `<UserManagementSettings>` JSX (lines 147-152)

### Part 2: Settings child components (update interfaces and add local fetching where needed)

**`src/components/settings/VendorManagementSettings.tsx`**
- Remove `extractionTypes` and `transformationTypes` from interface (lines 9-10)
- Remove from function destructuring (lines 20-21)
- Add `import { supabase } from '../../lib/supabase'` if not already imported
- Add local state: `const [extractionTypes, setExtractionTypes] = useState<ExtractionType[]>([])`
- Add local state: `const [transformationTypes, setTransformationTypes] = useState<TransformationType[]>([])`
- Add a `loadTypes()` function that fetches from `extraction_types` and `transformation_types` tables (just `id` and `name` columns)
- Call `loadTypes()` in the existing `useEffect`
- The rest of the component (helper functions, dropdowns) works unchanged since local state uses the same variable names

**`src/components/settings/DriverCheckinSettings.tsx`**
- Remove `import type { Workflow } from '../../types'` and `import Select from '../common/Select'`
- Remove the `DriverCheckinSettingsProps` interface (lines 7-9)
- Change function signature to `DriverCheckinSettings()` with no props
- Remove `fallbackWorkflowId` state (line 13)
- Remove `activeWorkflows` and `selectedWorkflow` computed values (lines 152-153)
- In `handleSave()`: remove the `fallbackWorkflowId` validation guard (lines 107-110) and remove `fallback_workflow_id` from the update data (line 117)
- Remove the yellow "Configuration Required" warning block (lines 222-230)
- Remove the entire "Fallback Workflow" selector section including the Select and info box (lines 248-281)
- Change save button `disabled` from `saving || !fallbackWorkflowId` to just `saving` (line 286)
- Change QR code section condition from `isEnabled && fallbackWorkflowId` to just `isEnabled` (line 304)
- In "How it Works" list: remove steps 6 and 7 about AI auto-detection and fallback workflow (lines 331-336), replace with a single step: "Documents are uploaded and stored for review in the check-in logs"

**`src/components/settings/SftpSettings.tsx`**
- Remove `TransformationType` from type import (line 4) — keep `ExtractionType` and `ExtractionWorkflow`
- Remove `extractionTypes`, `transformationTypes`, `workflows` from `SftpSettingsProps` interface (lines 9-11)
- Remove from function destructuring (lines 20-22)
- Add local state: `extractionTypes`, `workflows`
- Add a `loadTypesAndWorkflows()` function that fetches from `extraction_types` (id, name) and `extraction_workflows` (*)
- Call `loadTypesAndWorkflows()` in the existing `useEffect`

**`src/components/settings/EmailMonitoringSettings.tsx`**
- Remove `ExtractionType`, `TransformationType` from type import (line 3)
- Remove `extractionTypes` and `transformationTypes` from interface (lines 10-11)
- Remove from function destructuring (lines 22-23)
- Remove `extractionTypes={extractionTypes}` and `transformationTypes={transformationTypes}` from `<EmailRulesSettings>` JSX (lines 1543-1544)

**`src/components/settings/EmailRulesSettings.tsx`**
- Remove `ExtractionType`, `TransformationType` from type import
- Remove `extractionTypes` and `transformationTypes` from interface
- Remove from function destructuring
- Add local state and a `loadTypes()` function (same pattern as VendorManagementSettings)

**`src/components/settings/UserManagementSettings.tsx`**
- Remove `ExtractionType`, `TransformationType` from type import
- Remove `extractionTypes`, `getUserExtractionTypes`, `updateUserExtractionTypes`, `transformationTypes`, `getUserTransformationTypes`, `updateUserTransformationTypes` from interface (lines 73-78)
- Remove from function destructuring
- Add local state and a `loadTypes()` function
- Also need to add local implementations of `getUserExtractionTypes`, `updateUserExtractionTypes`, `getUserTransformationTypes`, `updateUserTransformationTypes` using direct Supabase queries (these were previously passed from `useAuth`)

**Run `npm run build`** after completing this step to verify.

---

## Step 8C: Remove `useWorkflowManagement` Hook (if it exists)

**File to DELETE:** `src/hooks/useWorkflowManagement.ts`

This file may have already been deleted in a prior step. Verify:
- If the file exists, delete it
- Search for any imports of `useWorkflowManagement` across the codebase and remove them

**Files to KEEP (no changes needed):**
- `src/hooks/useAuth.ts`
- `src/hooks/useDarkMode.ts`
- `src/hooks/useKeyboardShortcut.ts`
- `src/hooks/useLicense.ts`
- `src/hooks/useOrderEntryForm.ts`
- `src/hooks/useToast.ts`
- `src/hooks/useUnsavedChanges.ts`

**Run `npm run build`** to confirm clean build.
