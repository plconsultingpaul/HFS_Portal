/*
  # Fix mutable search_path on SECURITY DEFINER functions

  1. Changes
    - `public.is_admin()` — pin search_path to 'public, auth'
    - `public.lookup_email_by_username(text, text)` — pin search_path to 'public, auth'

  2. Security
    - Prevents search_path manipulation attacks on SECURITY DEFINER functions
    - No behavioral changes; only adds SET search_path clause

  3. Notes
    - Addresses Supabase Advisor warnings "Function Search Path Mutable"
*/

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public, auth
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND is_admin = true
    AND is_active = true
  );
$function$;

CREATE OR REPLACE FUNCTION public.lookup_email_by_username(p_username text, p_role_filter text DEFAULT NULL::text)
 RETURNS TABLE(email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $function$
BEGIN
  IF p_role_filter = 'client' THEN
    RETURN QUERY
      SELECT u.email FROM public.users u
      WHERE LOWER(u.username) = LOWER(p_username)
        AND u.is_active = true
        AND u.role = 'client'
      LIMIT 1;
  ELSIF p_role_filter = 'admin' THEN
    RETURN QUERY
      SELECT u.email FROM public.users u
      WHERE LOWER(u.username) = LOWER(p_username)
        AND u.is_active = true
        AND u.role != 'client'
      LIMIT 1;
  ELSE
    RETURN QUERY
      SELECT u.email FROM public.users u
      WHERE LOWER(u.username) = LOWER(p_username)
        AND u.is_active = true
      LIMIT 1;
  END IF;
END;
$function$;