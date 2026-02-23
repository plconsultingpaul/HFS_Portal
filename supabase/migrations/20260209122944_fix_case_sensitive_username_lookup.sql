/*
  # Fix case-sensitive username lookup

  ## Problem
  The `lookup_email_by_username` function uses exact case-sensitive matching
  (`WHERE u.username = p_username`), which means a user stored as "Gary" cannot
  log in by typing "gary". PostgreSQL text comparison is case-sensitive by default.

  ## Fix
  Replace `u.username = p_username` with `LOWER(u.username) = LOWER(p_username)`
  in all three branches of the function so username lookup is case-insensitive.

  ## Impact
  - Users can now log in regardless of how they capitalize their username
  - No changes to stored data
  - No frontend changes required
*/

CREATE OR REPLACE FUNCTION public.lookup_email_by_username(p_username text, p_role_filter text DEFAULT NULL)
RETURNS TABLE(email text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;