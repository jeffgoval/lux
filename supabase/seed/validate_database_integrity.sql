-- =====================================================
-- VALIDAÇÃO DE INTEGRIDADE RELACIONAL
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- Este script:
-- 1. Valida integridade referencial (foreign keys órfãs)
-- 2. Verifica consistência de dados
-- 3. Identifica possíveis problemas de performance
-- 4. Gera relatório de integridade do banco

-- Log de início
DO $$ 
BEGIN 
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'INICIANDO VALIDAÇÃO DE INTEGRIDADE RELACIONAL';
  RAISE NOTICE 'Timestamp: %', now();
  RAISE NOTICE '=================================================';
END $$;

-- =====================================================
-- 1. FUNÇÕES DE APOIO PARA VALIDAÇÃO
-- =====================================================

-- Função para contar registros órfãos
CREATE OR REPLACE FUNCTION public.check_orphaned_records(
  child_table TEXT,
  child_column TEXT,
  parent_table TEXT,
  parent_column TEXT DEFAULT 'id'
)
RETURNS TABLE (
  orphaned_count BIGINT,
  total_count BIGINT,
  orphaned_percentage NUMERIC
) AS $$
DECLARE
  query_text TEXT;
  orphaned_count BIGINT;
  total_count BIGINT;
BEGIN
  -- Contar registros órfãos
  query_text := format('
    SELECT COUNT(*) 
    FROM %I c 
    WHERE c.%I IS NOT NULL 
      AND NOT EXISTS (
        SELECT 1 FROM %I p WHERE p.%I = c.%I
      )', child_table, child_column, parent_table, parent_column, child_column);
  
  EXECUTE query_text INTO orphaned_count;
  
  -- Contar total de registros
  query_text := format('SELECT COUNT(*) FROM %I WHERE %I IS NOT NULL', child_table, child_column);
  EXECUTE query_text INTO total_count;
  
  RETURN QUERY SELECT 
    orphaned_count,
    total_count,
    CASE 
      WHEN total_count > 0 THEN ROUND((orphaned_count * 100.0 / total_count), 2)
      ELSE 0
    END;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar dados duplicados
CREATE OR REPLACE FUNCTION public.check_duplicates(
  table_name TEXT,
  column_names TEXT[]
)
RETURNS TABLE (
  duplicate_count BIGINT,
  total_groups BIGINT
) AS $$
DECLARE
  query_text TEXT;
  column_list TEXT;
BEGIN
  column_list := array_to_string(column_names, ', ');
  
  query_text := format('
    SELECT 
      COUNT(*) as duplicate_count,
      COUNT(DISTINCT (%s)) as total_groups
    FROM (
      SELECT %s, COUNT(*) as cnt
      FROM %I 
      WHERE %s IS NOT NULL
      GROUP BY %s
      HAVING COUNT(*) > 1
    ) duplicates', column_list, column_list, table_name, column_list, column_list);
  
  RETURN QUERY EXECUTE query_text;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. VALIDAÇÃO DE CHAVES ESTRANGEIRAS
-- =====================================================

DO $$
DECLARE
  rec RECORD;
  orphaned_count BIGINT;
  total_count BIGINT;
  orphaned_pct NUMERIC;
BEGIN
  RAISE NOTICE 'Verificando integridade de chaves estrangeiras...';
  RAISE NOTICE '==================================================';
  
  -- 1. user_roles -> auth.users (user_id)
  SELECT * INTO orphaned_count, total_count, orphaned_pct 
  FROM public.check_orphaned_records('user_roles', 'user_id', 'profiles', 'user_id');
  RAISE NOTICE 'user_roles.user_id: % órfãos de % total (% %%)', orphaned_count, total_count, orphaned_pct;
  
  -- 2. user_roles -> organizacoes (organizacao_id)  
  SELECT * INTO orphaned_count, total_count, orphaned_pct 
  FROM public.check_orphaned_records('user_roles', 'organizacao_id', 'organizacoes', 'id');
  RAISE NOTICE 'user_roles.organizacao_id: % órfãos de % total (% %%)', orphaned_count, total_count, orphaned_pct;
  
  -- 3. user_roles -> clinicas (clinica_id)
  SELECT * INTO orphaned_count, total_count, orphaned_pct 
  FROM public.check_orphaned_records('user_roles', 'clinica_id', 'clinicas', 'id');
  RAISE NOTICE 'user_roles.clinica_id: % órfãos de % total (% %%)', orphaned_count, total_count, orphaned_pct;
  
  -- 4. clinicas -> organizacoes (organizacao_id)
  SELECT * INTO orphaned_count, total_count, orphaned_pct 
  FROM public.check_orphaned_records('clinicas', 'organizacao_id', 'organizacoes', 'id');
  RAISE NOTICE 'clinicas.organizacao_id: % órfãos de % total (% %%)', orphaned_count, total_count, orphaned_pct;
  
  -- 5. prontuarios -> clinicas (clinica_id)
  SELECT * INTO orphaned_count, total_count, orphaned_pct 
  FROM public.check_orphaned_records('prontuarios', 'clinica_id', 'clinicas', 'id');
  RAISE NOTICE 'prontuarios.clinica_id: % órfãos de % total (% %%)', orphaned_count, total_count, orphaned_pct;
  
  -- 6. prontuarios -> profissionais (profissional_id)
  SELECT * INTO orphaned_count, total_count, orphaned_pct 
  FROM public.check_orphaned_records('prontuarios', 'profissional_id', 'profissionais', 'user_id');
  RAISE NOTICE 'prontuarios.profissional_id: % órfãos de % total (% %%)', orphaned_count, total_count, orphaned_pct;
  
  -- 7. sessoes_atendimento -> prontuarios (prontuario_id)
  SELECT * INTO orphaned_count, total_count, orphaned_pct 
  FROM public.check_orphaned_records('sessoes_atendimento', 'prontuario_id', 'prontuarios', 'id');
  RAISE NOTICE 'sessoes_atendimento.prontuario_id: % órfãos de % total (% %%)', orphaned_count, total_count, orphaned_pct;
  
  -- 8. imagens_medicas -> prontuarios (prontuario_id)
  SELECT * INTO orphaned_count, total_count, orphaned_pct 
  FROM public.check_orphaned_records('imagens_medicas', 'prontuario_id', 'prontuarios', 'id');
  RAISE NOTICE 'imagens_medicas.prontuario_id: % órfãos de % total (% %%)', orphaned_count, total_count, orphaned_pct;
  
  -- 9. equipamentos -> clinicas (clinica_id)
  SELECT * INTO orphaned_count, total_count, orphaned_pct 
  FROM public.check_orphaned_records('equipamentos', 'clinica_id', 'clinicas', 'id');
  RAISE NOTICE 'equipamentos.clinica_id: % órfãos de % total (% %%)', orphaned_count, total_count, orphaned_pct;
  
  -- 10. equipamentos -> fabricantes_equipamento (fabricante_id)
  SELECT * INTO orphaned_count, total_count, orphaned_pct 
  FROM public.check_orphaned_records('equipamentos', 'fabricante_id', 'fabricantes_equipamento', 'id');
  RAISE NOTICE 'equipamentos.fabricante_id: % órfãos de % total (% %%)', orphaned_count, total_count, orphaned_pct;
  
END $$;

-- =====================================================
-- 3. VALIDAÇÃO DE DADOS DUPLICADOS
-- =====================================================

DO $$
DECLARE
  dup_count BIGINT;
  total_groups BIGINT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Verificando dados duplicados...';
  RAISE NOTICE '================================';
  
  -- 1. Perfis duplicados por CPF
  SELECT * INTO dup_count, total_groups FROM public.check_duplicates('profiles', ARRAY['cpf']);
  IF dup_count > 0 THEN
    RAISE NOTICE '⚠️  CPFs duplicados: % grupos com duplicatas', dup_count;
  ELSE
    RAISE NOTICE '✅ CPFs únicos: nenhuma duplicata encontrada';
  END IF;
  
  -- 2. Clínicas duplicadas por CNPJ
  SELECT * INTO dup_count, total_groups FROM public.check_duplicates('clinicas', ARRAY['cnpj']);
  IF dup_count > 0 THEN
    RAISE NOTICE '⚠️  CNPJs de clínicas duplicados: % grupos', dup_count;
  ELSE
    RAISE NOTICE '✅ CNPJs de clínicas únicos: nenhuma duplicata';
  END IF;
  
  -- 3. Organizações duplicadas por CNPJ
  SELECT * INTO dup_count, total_groups FROM public.check_duplicates('organizacoes', ARRAY['cnpj']);
  IF dup_count > 0 THEN
    RAISE NOTICE '⚠️  CNPJs de organizações duplicados: % grupos', dup_count;
  ELSE
    RAISE NOTICE '✅ CNPJs de organizações únicos: nenhuma duplicata';
  END IF;
  
  -- 4. Equipamentos duplicados por número de série
  SELECT * INTO dup_count, total_groups FROM public.check_duplicates('equipamentos', ARRAY['numero_serie']);
  IF dup_count > 0 THEN
    RAISE NOTICE '⚠️  Números de série duplicados: % grupos', dup_count;
  ELSE
    RAISE NOTICE '✅ Números de série únicos: nenhuma duplicata';
  END IF;
  
END $$;

-- =====================================================
-- 4. VALIDAÇÃO DE CONSISTÊNCIA DE DADOS
-- =====================================================

DO $$
DECLARE
  inconsistency_count INTEGER := 0;
  count_result INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Verificando consistência de dados...';
  RAISE NOTICE '===================================';
  
  -- 1. Usuários com roles mas sem perfil
  SELECT COUNT(*) INTO count_result
  FROM public.user_roles ur
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = ur.user_id
  );
  
  IF count_result > 0 THEN
    RAISE NOTICE '⚠️  Usuários com roles mas sem perfil: %', count_result;
    inconsistency_count := inconsistency_count + 1;
  ELSE
    RAISE NOTICE '✅ Todos usuários com roles possuem perfil';
  END IF;
  
  -- 2. Profissionais sem dados básicos
  SELECT COUNT(*) INTO count_result
  FROM public.profissionais
  WHERE especialidade_principal IS NULL 
     OR numero_registro_profissional IS NULL;
  
  IF count_result > 0 THEN
    RAISE NOTICE '⚠️  Profissionais com dados básicos incompletos: %', count_result;
    inconsistency_count := inconsistency_count + 1;
  ELSE
    RAISE NOTICE '✅ Todos profissionais possuem dados básicos completos';
  END IF;
  
  -- 3. Clínicas sem organização
  SELECT COUNT(*) INTO count_result
  FROM public.clinicas
  WHERE organizacao_id IS NULL;
  
  IF count_result > 0 THEN
    RAISE NOTICE '⚠️  Clínicas sem organização: %', count_result;
    inconsistency_count := inconsistency_count + 1;
  ELSE
    RAISE NOTICE '✅ Todas clínicas possuem organização';
  END IF;
  
  -- 4. Prontuários sem profissional responsável
  SELECT COUNT(*) INTO count_result
  FROM public.prontuarios
  WHERE profissional_id IS NULL;
  
  IF count_result > 0 THEN
    RAISE NOTICE '⚠️  Prontuários sem profissional responsável: %', count_result;
    inconsistency_count := inconsistency_count + 1;
  ELSE
    RAISE NOTICE '✅ Todos prontuários possuem profissional responsável';
  END IF;
  
  -- 5. Equipamentos com status inválido
  SELECT COUNT(*) INTO count_result
  FROM public.equipamentos
  WHERE status_atual NOT IN ('funcionando', 'manutencao', 'inativo', 'descarte');
  
  IF count_result > 0 THEN
    RAISE NOTICE '⚠️  Equipamentos com status inválido: %', count_result;
    inconsistency_count := inconsistency_count + 1;
  ELSE
    RAISE NOTICE '✅ Todos equipamentos possuem status válido';
  END IF;
  
  -- Resumo de inconsistências
  RAISE NOTICE '';
  IF inconsistency_count = 0 THEN
    RAISE NOTICE '🎉 Nenhuma inconsistência encontrada!';
  ELSE
    RAISE NOTICE '⚠️  Total de inconsistências encontradas: %', inconsistency_count;
  END IF;
  
END $$;

-- =====================================================
-- 5. VALIDAÇÃO DE PERFORMANCE (ÍNDICES)
-- =====================================================

DO $$
DECLARE
  rec RECORD;
  missing_indexes INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Verificando otimizações de performance...';
  RAISE NOTICE '=======================================';
  
  -- Verificar tabelas grandes sem índices adequados
  FOR rec IN 
    SELECT 
      schemaname,
      tablename,
      n_tup_ins + n_tup_upd + n_tup_del as modifications,
      n_live_tup as live_tuples
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
      AND n_live_tup > 100  -- Tabelas com mais de 100 registros
    ORDER BY n_live_tup DESC
  LOOP
    -- Verificar se tem índices além da primary key
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = rec.schemaname 
        AND tablename = rec.tablename 
        AND indexname != rec.tablename || '_pkey'
    ) THEN
      RAISE NOTICE '⚠️  Tabela % (% registros) pode precisar de índices adicionais', 
        rec.tablename, rec.live_tuples;
      missing_indexes := missing_indexes + 1;
    END IF;
  END LOOP;
  
  IF missing_indexes = 0 THEN
    RAISE NOTICE '✅ Índices adequados encontrados em todas as tabelas relevantes';
  ELSE
    RAISE NOTICE 'Tabelas que podem se beneficiar de índices: %', missing_indexes;
  END IF;
  
END $$;

-- =====================================================
-- 6. RELATÓRIO CONSOLIDADO DE INTEGRIDADE
-- =====================================================

-- Função para gerar relatório completo
CREATE OR REPLACE FUNCTION public.generate_integrity_report()
RETURNS TABLE (
  check_category TEXT,
  check_name TEXT,
  status TEXT,
  details TEXT,
  priority TEXT
) AS $$
BEGIN
  -- Este relatório seria implementado com checks específicos
  -- Por enquanto, retorna um placeholder
  
  RETURN QUERY SELECT 
    'Database Integrity'::TEXT as check_category,
    'Overall Health'::TEXT as check_name,
    'COMPLETED'::TEXT as status,
    'Validação de integridade executada com sucesso'::TEXT as details,
    'HIGH'::TEXT as priority;
    
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. TRIGGERS PARA MANTER CONSISTÊNCIA
-- =====================================================

-- Trigger para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de timestamp em tabelas principais (se não existir)
DO $$
DECLARE
  table_names TEXT[] := ARRAY[
    'profiles', 'organizacoes', 'clinicas', 'profissionais', 
    'equipamentos', 'produtos', 'prontuarios'
  ];
  table_name TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Verificando triggers de timestamp...';
  RAISE NOTICE '===================================';
  
  FOREACH table_name IN ARRAY table_names LOOP
    -- Verificar se o trigger já existe
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      WHERE c.relname = table_name 
        AND t.tgname = 'update_' || table_name || '_updated_at'
    ) THEN
      BEGIN
        EXECUTE format('
          CREATE TRIGGER update_%1$s_updated_at
          BEFORE UPDATE ON public.%1$s
          FOR EACH ROW
          EXECUTE FUNCTION public.update_updated_at_column()
        ', table_name);
        RAISE NOTICE '✅ Trigger de timestamp criado para: %', table_name;
      EXCEPTION
        WHEN duplicate_object THEN
          RAISE NOTICE '✅ Trigger já existe para: %', table_name;
        WHEN OTHERS THEN
          RAISE NOTICE '⚠️  Erro ao criar trigger para %: %', table_name, SQLERRM;
      END;
    ELSE
      RAISE NOTICE '✅ Trigger já configurado para: %', table_name;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- LIMPEZA DE FUNÇÕES TEMPORÁRIAS
-- =====================================================

-- Manter apenas funções úteis para monitoramento contínuo
-- DROP FUNCTION IF EXISTS public.check_orphaned_records(TEXT, TEXT, TEXT, TEXT);
-- DROP FUNCTION IF EXISTS public.check_duplicates(TEXT, TEXT[]);

-- Log de conclusão
DO $$ 
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'VALIDAÇÃO DE INTEGRIDADE RELACIONAL CONCLUÍDA';
  RAISE NOTICE 'Timestamp: %', now();
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '1. Revisar avisos de inconsistência reportados';  
  RAISE NOTICE '2. Considerar criação de índices adicionais';
  RAISE NOTICE '3. Executar testes de performance';
  RAISE NOTICE '4. Monitorar logs de trigger automaticamente';
  RAISE NOTICE '=================================================';
END $$;