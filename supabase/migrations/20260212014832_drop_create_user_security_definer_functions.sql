/*
  # Drop create_user() SECURITY DEFINER functions

  1. Security Fix
    - Removes two overloads of `create_user()` which allowed any anonymous
      caller to create user accounts (including admin accounts) with zero
      authorization checks
    - Both overloads are SECURITY DEFINER (run as the function owner),
      bypassing all RLS on the `users` table
    - Neither overload is referenced anywhere in the application code;
      user creation is handled by the `manage-auth-user` edge function

  2. Risk Removed
    - Unauthenticated admin account creation
    - Arbitrary user account creation for privilege escalation
*/

DROP FUNCTION IF EXISTS public.create_user(text, text, boolean);
DROP FUNCTION IF EXISTS public.create_user(text, text, boolean, text);
