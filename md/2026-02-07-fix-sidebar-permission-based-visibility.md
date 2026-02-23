# Fix Sidebar Permission-Based Visibility

**Date:** 2026-02-07

## Problem

Non-admin users (role: `user`) were seeing all sidebar navigation items (Extract, Transform, Execute, Type Setup, Logs, Settings) regardless of their assigned permissions. For example, a user with only "Extraction Types" permission enabled would still see Transform, Execute, Logs, etc.

## Root Cause

The `filteredNavigationItems` logic in `src/components/Layout.tsx` only checked permissions for `vendor-setup`, `client-setup`, and `checkin-setup`. The core sidebar items (`extract`, `transform`, `execute`, `types`, `logs`, `settings`) had no permission checks and were shown unconditionally to all admin/user roles.

## Changes

**File:** `src/components/Layout.tsx`

Added permission-based filtering for non-admin users (`user.role === 'user' && !user.isAdmin`) in the `filteredNavigationItems` logic:

| Sidebar Item | Required Permission |
|---|---|
| Extract | `extractionTypes` |
| Transform | `transformationTypes` |
| Execute | `executeSetup` |
| Type Setup | `extractionTypes` OR `transformationTypes` |
| Logs | `extractionLogs` |
| Settings | At least one of: `sftp`, `api`, `emailMonitoring`, `emailRules`, `processedEmails`, `extractionLogs`, `userManagement` |

Admin users continue to see all items. The Help item remains visible to everyone.
