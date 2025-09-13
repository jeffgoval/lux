-- 06 - Guard lock (sem ALTER DATABASE)
-- A função forbid_ddl_in_production já bloqueia DDL destrutivo em produção para sessões
-- que não são do Supabase/Supavisor nem superusuário. Nada a fazer aqui.
DO $$ BEGIN PERFORM 1; END $$;
