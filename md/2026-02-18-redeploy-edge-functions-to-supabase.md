# Redeploy Edge Functions to Supabase

**Date:** 2026-02-18

## Summary

Redeployed three edge functions from the local codebase (matching GitHub) to Supabase to ensure the hosted versions are up to date.

## Functions Deployed

### 1. email-monitor
- **JWT verification:** disabled (matches existing setting -- invoked by cron/webhooks)
- **Files:** `index.ts`, `config.ts`, `deno.json`, `lib/` directory (data-processor, functionEvaluator, pdf, prompt-builder, utils, services/*)

### 2. json-workflow-processor
- **JWT verification:** disabled (matches existing setting)
- **Files:** `index.ts`, `functionEvaluator.ts`, `utils.ts`, `deno.json`, `steps/` directory (api, email, emailProviders, logic, multipart, notifications, upload)

### 3. json-workflow-processor-v2
- **JWT verification:** enabled (matches existing setting)
- **Files:** `index.ts`, `functionEvaluator.ts`, `utils.ts`, `steps/` directory (aiDecision, api, apiEndpoint, email, emailProviders, imaging, logic, multipart, notifications, rename, upload)

## What Changed

No code modifications were made. This was a targeted redeployment of the existing local code to Supabase to sync the hosted edge functions with the GitHub source of truth.
