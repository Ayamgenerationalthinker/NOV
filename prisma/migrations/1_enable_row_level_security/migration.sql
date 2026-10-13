-- Supabase publishes every table in the public schema through its auto-generated Data API.
-- Without row level security, anyone holding the project's public (anon) key could read or
-- change them, including owner password hashes and customer orders.
--
-- Row level security with no policies blocks that API completely. The app is unaffected: it
-- connects as the table owner, which bypasses row level security. On other Postgres hosts
-- (Neon, local) this is harmless.
--
-- Tables added by later migrations need the same statement.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = current_schema()
  LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', current_schema(), t.tablename);
  END LOOP;
END $$;
