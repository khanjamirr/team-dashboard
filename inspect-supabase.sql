-- READ ONLY: run in the Supabase SQL Editor and export the results.
-- This inspects the existing implementation; it does not fix or change permissions.
-- No user records, passcodes, session tokens, or workbook data are selected.

SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname LIKE 'td\_%' ESCAPE '\'
  AND p.prokind = 'f'
ORDER BY p.proname, arguments;

SELECT
  table_schema, table_name, column_name, data_type,
  udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name LIKE 'td\_%' ESCAPE '\'
ORDER BY table_name, ordinal_position;
