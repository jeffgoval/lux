-- =====================================================
-- MASTER SEED SCRIPT - DADOS DE REFERÊNCIA
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- Este script executa todos os seeds de dados de referência na ordem correta
-- Execute este arquivo para popular o banco com dados essenciais

-- Log de início
DO $$ 
BEGIN 
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'INICIANDO SEED DE DADOS DE REFERÊNCIA';
  RAISE NOTICE 'Timestamp: %', now();
  RAISE NOTICE '=================================================';
END $$;

-- 1. Especialidades Médicas (Tabela fundamental)
\i supabase/seed/reference-data/01_especialidades_medicas.sql

-- 2. Categorias de Procedimento (Tabela fundamental)
\i supabase/seed/reference-data/02_categorias_procedimento.sql

-- 3. Fabricantes de Equipamento (Para cadastro de equipamentos)
\i supabase/seed/reference-data/03_fabricantes_equipamento.sql

-- Verificação final
DO $$ 
DECLARE
  especialidades_count INTEGER;
  categorias_count INTEGER;
  fabricantes_count INTEGER;
BEGIN 
  SELECT COUNT(*) INTO especialidades_count FROM public.especialidades_medicas WHERE ativo = true;
  SELECT COUNT(*) INTO categorias_count FROM public.categorias_procedimento WHERE ativo = true;
  SELECT COUNT(*) INTO fabricantes_count FROM public.fabricantes_equipamento WHERE ativo = true;
  
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'SEED DE DADOS DE REFERÊNCIA CONCLUÍDO';
  RAISE NOTICE 'Especialidades médicas: % registros', especialidades_count;
  RAISE NOTICE 'Categorias de procedimento: % registros', categorias_count;
  RAISE NOTICE 'Fabricantes de equipamento: % registros', fabricantes_count;
  RAISE NOTICE 'Total de registros inseridos: %', (especialidades_count + categorias_count + fabricantes_count);
  RAISE NOTICE 'Timestamp: %', now();
  RAISE NOTICE '=================================================';
END $$;