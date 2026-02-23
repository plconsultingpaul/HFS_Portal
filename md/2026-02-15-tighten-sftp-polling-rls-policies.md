# Tighten SFTP Polling RLS Policies

**Date:** February 15, 2026

## Summary

Addressed two moderate-severity RLS warnings by restricting write access on `sftp_polling_configs` to admin users only and removing unrestricted public access from `sftp_polling_logs`.

## Changes

### `sftp_polling_configs`

| Operation | Before | After |
|-----------|--------|-------|
| SELECT | Any authenticated user | Any authenticated user (unchanged) |
| INSERT | Any authenticated user | Admin only (`is_admin()`) |
| UPDATE | Any authenticated user | Admin only (`is_admin()`) |
| DELETE | Any authenticated user | Admin only (`is_admin()`) |

### `sftp_polling_logs`

| Operation | Before | After |
|-----------|--------|-------|
| ALL | Public (including anonymous) | Removed |
| SELECT | (covered by ALL) | Authenticated users only |
| INSERT | (covered by ALL) | Authenticated users only |
| UPDATE | (covered by ALL) | Not permitted |
| DELETE | (covered by ALL) | Not permitted |

## Rationale

- **`sftp_polling_configs`** is a system configuration table. Allowing any authenticated user to create, modify, or delete SFTP polling configurations is a security risk. Only administrators should manage these.
- **`sftp_polling_logs`** had a blanket `ALL` policy on the `public` role, meaning even unauthenticated (anonymous) users could read, insert, update, and delete log records. This was replaced with scoped read and insert policies for authenticated users only.
