/*
  # Drop verify_password() SECURITY DEFINER function

  1. Security Fix
    - Removes `verify_password()` which allowed any anonymous caller to
      test username/password combinations against the users table with
      no rate limiting, enabling brute-force attacks
    - The function is SECURITY DEFINER (bypasses RLS) and returns user
      details (id, username, is_admin, permissions) on success
    - Not referenced anywhere in the application code; authentication
      is handled by Supabase Auth (signInWithPassword)

  2. Risk Removed
    - Unauthenticated brute-force password attacks
    - User enumeration and privilege discovery on successful guess
*/

DROP FUNCTION IF EXISTS public.verify_password(text, text);
