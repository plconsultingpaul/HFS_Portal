# Fix V2 API Endpoint Selector to Match Original Workflow

**Date:** 2026-02-14

## Summary

Replaced the always-visible scrollable endpoint list in the Workflow V2 API Endpoint config (and AI Decision step) with the same `Select` component used by the original Workflow. The endpoint selector now shows a single-line display field that opens a searchable dropdown on click and auto-collapses after selection.

## What Changed

### `src/components/settings/workflow-v2/V2ApiEndpointConfig.tsx`

- Imported the `Select` component from `../../common/Select`
- Replaced the scrollable endpoint list (with inline search box and "Selected:" indicator) with a single `Select` component that:
  - Displays the selected endpoint in a single-line field (e.g., "cloudEvents - Submit Cloud Events")
  - Opens a searchable dropdown when clicked
  - Automatically collapses after an endpoint is selected
- Removed the unused `endpointSearch` state variable
- Replaced the `filteredEndpoints` memo with `endpointOptions` memo that formats endpoints for the `Select` component
- The AI Decision step inherits this change automatically since it wraps `V2ApiEndpointConfig`

## Why

The previous implementation showed a small always-visible list of all endpoints even after one was selected, which was cluttered and inconsistent with the original Workflow's endpoint selector UX. The new behavior matches the original Workflow exactly.

## No Database Changes

No migrations or schema changes were needed.
