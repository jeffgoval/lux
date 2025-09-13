-- 05 - Guardas de DDL (configurar proteção contra resets acidentais)

-- Função que bloqueia DDL perigoso em produção quando app.allow_migration != 'on'
CREATE OR REPLACE FUNCTION public.forbid_ddl_in_production()
RETURNS event_trigger AS $$
DECLARE
  env text := current_setting('app.env', true);
  appname text := current_setting('application_name', true);
BEGIN
  -- Permite execuções do Supabase/Supavisor e do superusuário postgres
  IF coalesce(appname, '') = 'Supavisor' OR current_user = 'postgres' OR session_user = 'postgres' THEN
    RETURN;
  END IF;

  IF coalesce(env, 'production') = 'production' THEN
    -- Bloqueia operações destrutivas comuns quando não for sessão de migração do Supabase
    RAISE EXCEPTION 'DDL bloqueado em produção: operação não permitida fora do pipeline de migração';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Event trigger (não intercepta CREATE, apenas DDL destrutivo mais comum)
DROP EVENT TRIGGER IF EXISTS trg_block_ddl;
CREATE EVENT TRIGGER trg_block_ddl
  ON ddl_command_start
  WHEN TAG IN ('DROP TABLE', 'ALTER TABLE', 'DROP FUNCTION', 'DROP TYPE')
EXECUTE PROCEDURE public.forbid_ddl_in_production();

-- Removido: não usamos ALTER DATABASE. O gatilho permite execuções do Supabase automaticamente.
