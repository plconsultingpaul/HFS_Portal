# Fix Mutable Search Path on Security Definer Functions

**Date:** 2026-02-15

## Summary

Pinned the `search_path` on two `SECURITY DEFINER` functions to prevent potential search-path manipulation attacks.

## Changes

### `public.is_admin()`
- Added `SET search_path = public, auth` to the function definition
- No logic changes

### `public.lookup_email_by_username(text, text)`
- Added `SET search_path = public, auth` to the function definition
- No logic changes

## Why

Functions declared as `SECURITY DEFINER` run with the privileges of the function owner. Without a fixed `search_path`, a caller could manipulate their session's `search_path` to redirect internal table references to rogue schemas, potentially bypassing security checks.

## Migration

`fix_mutable_search_path_on_security_definer_functions`
