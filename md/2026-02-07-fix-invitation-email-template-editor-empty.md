# Fix Invitation Email Template Editor Showing Empty

**Date:** 2026-02-07

## Problem

The "Edit Invite Email" modal on the User Management page opened but displayed no content -- only the header and footer buttons were visible. The template data exists in the database and invitation emails were still sent correctly.

## Root Cause

After migrating to Supabase Auth, admin users now operate under the `authenticated` Postgres role instead of `anon`. The `invitation_email_templates` table only had RLS policies granting access to the `anon` role. Authenticated users received zero rows from the query, so the editor form never rendered.

## Fix

Added RLS policies for the `authenticated` role on the `invitation_email_templates` table:

- **SELECT** policy: allows authenticated users to read templates
- **UPDATE** policy: allows authenticated users to edit templates

No frontend code changes were needed.
