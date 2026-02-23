/*
  # Additional RLS Cleanup: View, Function Search Paths & Login Branding

  Addresses the remaining items from the RLS tightening plan's "Additional Cleanup" section.

  ## Changes

  1. **Recreate `stuck_workflow_steps` view with `security_invoker = true`**
     - Previously ran as the view owner, bypassing RLS on `workflow_step_logs`
     - Now respects the calling user's RLS policies

  2. **Add `SET search_path = public` to 9 functions missing it**
     - Trigger functions: `update_field_mapping_functions_updated_at`, `create_default_template_sections`,
       `ensure_single_active_api_key`, `ensure_single_active_model`
     - SECURITY DEFINER functions: `is_admin`, `get_cron_expression`, `exec_sql`,
       `save_cron_settings`, `get_cron_settings`
     - Prevents search_path manipulation attacks on SECURITY DEFINER functions

  3. **Add anon SELECT policy on `company_branding`**
     - Login pages (admin and client) display company logo and name before authentication
     - The `useSupabaseData` hook fetches branding on mount, before the user logs in
     - Without anon SELECT, login pages lose all branding
     - Only SELECT is granted to anon -- no write access

  ## Security Notes
  - Item 3 from the plan ("Enable Leaked Password Protection") requires a manual toggle
    in the Supabase Dashboard under Auth > Settings and cannot be done via migration
  - Item 5 (`password_reset_tokens` and `user_registration_tokens`) are already fully locked
    with RLS enabled and zero policies -- only service role can access them
*/

-- ============================================================
-- 1. Recreate stuck_workflow_steps view with security_invoker
-- ============================================================

DROP VIEW IF EXISTS stuck_workflow_steps;

CREATE VIEW stuck_workflow_steps
WITH (security_invoker = true)
AS
SELECT id,
    workflow_execution_log_id,
    step_id,
    status,
    started_at,
    created_at,
    (EXTRACT(epoch FROM (now() - started_at)) / 60::numeric) AS minutes_running
FROM workflow_step_logs wsl
WHERE status = 'running'
  AND started_at < (now() - '00:30:00'::interval);

-- ============================================================
-- 2. Fix function search paths (9 functions)
-- ============================================================

-- 2a. Trigger: update_field_mapping_functions_updated_at
CREATE OR REPLACE FUNCTION public.update_field_mapping_functions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2b. Trigger: create_default_template_sections
CREATE OR REPLACE FUNCTION public.create_default_template_sections()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  INSERT INTO track_trace_template_sections (template_id, section_type, display_order)
  VALUES
    (NEW.id, 'shipment_summary', 1),
    (NEW.id, 'shipment_timeline', 2),
    (NEW.id, 'route_summary', 3),
    (NEW.id, 'trace_numbers', 4),
    (NEW.id, 'barcode_details', 5),
    (NEW.id, 'documents', 6);
  RETURN NEW;
END;
$function$;

-- 2c. Trigger: ensure_single_active_api_key
CREATE OR REPLACE FUNCTION public.ensure_single_active_api_key()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE gemini_api_keys
    SET is_active = false, updated_at = now()
    WHERE id != NEW.id AND is_active = true;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2d. Trigger: ensure_single_active_model
CREATE OR REPLACE FUNCTION public.ensure_single_active_model()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE gemini_models
    SET is_active = false, updated_at = now()
    WHERE id != NEW.id AND is_active = true;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2e. SECURITY DEFINER: is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
SELECT EXISTS (
  SELECT 1 FROM public.users
  WHERE id = auth.uid()
  AND is_admin = true
  AND is_active = true
);
$function$;

-- 2f. SECURITY DEFINER: get_cron_expression
CREATE OR REPLACE FUNCTION public.get_cron_expression(interval_minutes integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF interval_minutes <= 0 THEN
    RETURN '*/5 * * * *';
  ELSIF interval_minutes = 1 THEN
    RETURN '* * * * *';
  ELSIF interval_minutes < 60 THEN
    RETURN '*/' || interval_minutes::text || ' * * * *';
  ELSIF interval_minutes = 60 THEN
    RETURN '0 * * * *';
  ELSIF interval_minutes < 1440 THEN
    RETURN '0 */' || (interval_minutes / 60)::text || ' * * *';
  ELSE
    RETURN '0 0 * * *';
  END IF;
END;
$function$;

-- 2g. SECURITY DEFINER: exec_sql
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  result_json jsonb;
BEGIN
  IF LOWER(LTRIM(query)) NOT LIKE 'select%' THEN
    RAISE EXCEPTION 'Only SELECT statements are allowed';
  END IF;

  EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', query)
  INTO result_json;

  RETURN COALESCE(result_json, '[]'::jsonb);
END;
$function$;

-- 2h. SECURITY DEFINER: save_cron_settings
CREATE OR REPLACE FUNCTION public.save_cron_settings(p_supabase_url text, p_supabase_anon_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_existing record;
BEGIN
  SELECT * INTO v_existing FROM cron_settings LIMIT 1;

  IF v_existing IS NULL THEN
    INSERT INTO cron_settings (supabase_url, supabase_anon_key)
    VALUES (p_supabase_url, p_supabase_anon_key);
  ELSE
    UPDATE cron_settings
    SET supabase_url = p_supabase_url,
        supabase_anon_key = p_supabase_anon_key,
        updated_at = NOW()
    WHERE id = v_existing.id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- 2i. SECURITY DEFINER: get_cron_settings
CREATE OR REPLACE FUNCTION public.get_cron_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_settings record;
BEGIN
  SELECT * INTO v_settings FROM cron_settings LIMIT 1;

  IF v_settings IS NULL THEN
    RETURN jsonb_build_object(
      'configured', false,
      'supabase_url', '',
      'supabase_anon_key_masked', ''
    );
  END IF;

  RETURN jsonb_build_object(
    'configured', true,
    'supabase_url', v_settings.supabase_url,
    'supabase_anon_key_masked',
    CASE
      WHEN v_settings.supabase_anon_key IS NOT NULL AND LENGTH(v_settings.supabase_anon_key) > 20
      THEN SUBSTRING(v_settings.supabase_anon_key, 1, 10) || '...' || SUBSTRING(v_settings.supabase_anon_key, LENGTH(v_settings.supabase_anon_key) - 9)
      ELSE '(not set)'
    END
  );
END;
$function$;

-- ============================================================
-- 3. Add anon SELECT on company_branding for login pages
-- ============================================================

CREATE POLICY "Anon can select company_branding for login pages"
  ON company_branding FOR SELECT TO anon USING (true);
