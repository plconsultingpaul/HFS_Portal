/*
  # Drop exec_sql() SECURITY DEFINER function

  1. Security Fix
    - Removes the `exec_sql()` function which allowed any anonymous user
      to execute arbitrary SELECT queries against the entire database,
      bypassing all Row Level Security policies
    - The function was SECURITY DEFINER (runs as the function owner/superuser)
      and only had a trivially bypassable `LIKE 'select%'` guard
    - The function is not referenced anywhere in the application code

  2. Risk Removed
    - Full RLS bypass allowing unauthenticated read of all tables
    - Exposure of API keys, passwords, tokens, and all user data
*/

DROP FUNCTION IF EXISTS public.exec_sql(text);
