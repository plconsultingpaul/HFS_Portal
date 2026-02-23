# RLS Step 1: Credentials & Secrets

**Date:** 2026-02-07
**Migration file:** `step1_tighten_rls_credentials_and_secrets`

## Summary

Replaced wide-open RLS policies on 8 tables that store API keys, passwords, and sensitive configuration. Previously, anonymous users (or anyone with the anon key) could read and modify all data in these tables. Now only authenticated admin users can access them.

## Tables Changed

| Table | Old Policy | New Policy |
|---|---|---|
| `gemini_api_keys` | 4 anon policies (USING true) | 4 policies: authenticated + is_admin() |
| `gemini_models` | 4 anon policies (USING true) | 4 policies: authenticated + is_admin() |
| `api_auth_config` | 8 policies (4 anon + 4 authenticated, all USING true) | 4 policies: authenticated + is_admin() |
| `api_settings` | 1 public FOR ALL (USING true) | 4 policies: authenticated + is_admin() |
| `sftp_config` | 4 public policies (USING true) | 4 policies: authenticated + is_admin() |
| `email_monitoring_config` | 4 anon policies (USING true) | 4 policies: authenticated + is_admin() |
| `security_settings` | 1 public FOR ALL (USING true) | 4 policies: authenticated + is_admin() |
| `secondary_api_configs` | 4 public policies (USING true) | 4 policies: authenticated + is_admin() |

## Policies Removed (30 total)

- All `anon` role policies with `USING (true)` on gemini_api_keys, gemini_models, api_auth_config, email_monitoring_config
- All `public` role policies with `USING (true)` on api_settings, sftp_config, security_settings, secondary_api_configs
- All `authenticated` role policies with `USING (true)` on api_auth_config

## Policies Added (32 total)

Each table now has exactly 4 policies:
- **SELECT** -- `TO authenticated USING (public.is_admin())`
- **INSERT** -- `TO authenticated WITH CHECK (public.is_admin())`
- **UPDATE** -- `TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())`
- **DELETE** -- `TO authenticated USING (public.is_admin())`

## What Is Unaffected

- Edge functions (email-monitor, track-trace-proxy, etc.) use the **service role key**, which bypasses RLS entirely. They continue to work without changes.
- Admin users who are logged in and have `is_admin = true` and `is_active = true` see no change in behavior.

## What To Test

1. **Admin login** -- still works
2. **Settings page** -- API, SFTP, Email Monitoring, Gemini config tabs all load and save correctly
3. **API Auth config** -- authentication configurations load and can be edited
4. **Secondary API configs** -- load and can be edited
5. **Edge functions** -- email monitoring, track & trace proxy still work (service role bypasses RLS)
6. **Client portal** -- client users should NOT see any settings pages (enforced by frontend routing, now also enforced by RLS)
