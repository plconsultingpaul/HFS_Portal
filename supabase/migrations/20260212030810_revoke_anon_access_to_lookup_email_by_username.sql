/*
  # Revoke anonymous access to lookup_email_by_username

  ## Problem
  The `lookup_email_by_username` function is callable by anonymous users,
  allowing user enumeration (discovering email addresses for any username).

  ## Fix
  - Revoke EXECUTE from `anon` and `public` roles
  - Only the `service_role` (used by the new `login-with-username` edge function)
    and `authenticated` users retain access
  - The client-side login flow now calls the `login-with-username` edge function
    instead of this RPC directly, so the email never leaves the server

  ## Security
  - Prevents anonymous user enumeration via username-to-email lookup
*/

REVOKE EXECUTE ON FUNCTION public.lookup_email_by_username(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.lookup_email_by_username(text, text) FROM public;
