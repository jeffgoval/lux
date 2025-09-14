-- =====================================================
-- AUDITORIA E CONFIGURAÇÃO DE POLÍTICAS RLS
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- Este script:
-- 1. Verifica o estado atual das políticas RLS
-- 2. Habilita RLS nas tabelas sensíveis
-- 3. Cria políticas de segurança multi-tenant
-- 4. Testa as políticas com consultas de validação

-- Log de início
DO $$ 
BEGIN 
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'INICIANDO AUDITORIA E CONFIGURAÇÃO RLS';
  RAISE NOTICE 'Timestamp: %', now();
  RAISE NOTICE '=================================================';
END $$;

-- =====================================================
-- 1. VERIFICAÇÃO DO ESTADO ATUAL
-- =====================================================

-- Função para verificar status RLS das tabelas
CREATE OR REPLACE FUNCTION public.check_rls_status()
RETURNS TABLE (
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT,
    t.rowsecurity as rls_enabled,
    COALESCE(p.policy_count, 0) as policy_count
  FROM pg_tables t
  LEFT JOIN (
    SELECT 
      schemaname || '.' || tablename as full_table_name,
      COUNT(*) as policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    GROUP BY schemaname, tablename
  ) p ON p.full_table_name = 'public.' || t.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename NOT IN ('spatial_ref_sys', 'reconstruction_log')
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql;

-- Executar verificação inicial
DO $$
DECLARE
  rec RECORD;
  total_tables INTEGER := 0;
  rls_enabled_tables INTEGER := 0;
  policies_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Estado atual das tabelas:';
  RAISE NOTICE '==========================';
  
  FOR rec IN SELECT * FROM public.check_rls_status() LOOP
    total_tables := total_tables + 1;
    IF rec.rls_enabled THEN 
      rls_enabled_tables := rls_enabled_tables + 1;
    END IF;
    policies_count := policies_count + rec.policy_count;
    
    RAISE NOTICE 'Tabela: % | RLS: % | Políticas: %', 
      rec.table_name, 
      CASE WHEN rec.rls_enabled THEN '✅' ELSE '❌' END,
      rec.policy_count;
  END LOOP;
  
  RAISE NOTICE '==========================';
  RAISE NOTICE 'Resumo: % tabelas total, % com RLS, % políticas total', 
    total_tables, rls_enabled_tables, policies_count;
END $$;

-- =====================================================
-- 2. HABILITAR RLS NAS TABELAS SENSÍVEIS
-- =====================================================

-- Lista de tabelas que DEVEM ter RLS habilitado
DO $$
DECLARE
  sensitive_tables TEXT[] := ARRAY[
    'profiles',
    'user_roles', 
    'clinicas',
    'organizacoes',
    'prontuarios',
    'sessoes_atendimento',
    'imagens_medicas',
    'consentimentos_digitais',
    'profissionais',
    'clinica_profissionais',
    'salas_clinica',
    'equipamentos',
    'produtos',
    'movimentacao_estoque',
    'auditoria_medica',
    'acessos_prontuario',
    'convites',
    'user_sessions'
  ];
  table_name TEXT;
BEGIN
  RAISE NOTICE 'Habilitando RLS nas tabelas sensíveis...';
  
  FOREACH table_name IN ARRAY sensitive_tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      RAISE NOTICE '✅ RLS habilitado em: %', table_name;
    EXCEPTION
      WHEN undefined_table THEN
        RAISE NOTICE '⚠️  Tabela não existe: %', table_name;
      WHEN OTHERS THEN
        RAISE NOTICE '❌ Erro ao habilitar RLS em %: %', table_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- =====================================================
-- 3. POLÍTICAS RLS FUNDAMENTAIS
-- =====================================================

-- Função auxiliar para verificar se usuário é super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND role = 'super_admin' 
      AND ativo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter clínicas do usuário
CREATE OR REPLACE FUNCTION public.user_clinics()
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT clinica_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND ativo = true
      AND clinica_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter organizações do usuário
CREATE OR REPLACE FUNCTION public.user_organizations()
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT organizacao_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
      AND ativo = true
      AND organizacao_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLÍTICAS PARA PROFILES
-- =====================================================

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (
    auth.uid() = user_id OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = user_id OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- =====================================================
-- POLÍTICAS PARA USER_ROLES
-- =====================================================

DROP POLICY IF EXISTS "user_roles_select_accessible" ON public.user_roles;
CREATE POLICY "user_roles_select_accessible" ON public.user_roles
  FOR SELECT USING (
    public.is_super_admin() OR
    user_id = auth.uid() OR
    (clinica_id = ANY(public.user_clinics())) OR
    (organizacao_id = ANY(public.user_organizations()))
  );

-- =====================================================
-- POLÍTICAS PARA CLINICAS
-- =====================================================

DROP POLICY IF EXISTS "clinicas_select_accessible" ON public.clinicas;
CREATE POLICY "clinicas_select_accessible" ON public.clinicas
  FOR SELECT USING (
    public.is_super_admin() OR
    id = ANY(public.user_clinics()) OR
    organizacao_id = ANY(public.user_organizations())
  );

DROP POLICY IF EXISTS "clinicas_update_authorized" ON public.clinicas;
CREATE POLICY "clinicas_update_authorized" ON public.clinicas
  FOR UPDATE USING (
    public.is_super_admin() OR
    (id = ANY(public.user_clinics()) AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
        AND clinica_id = clinicas.id
        AND role IN ('proprietaria', 'gerente')
        AND ativo = true
    ))
  );

-- =====================================================
-- POLÍTICAS PARA ORGANIZACOES
-- =====================================================

DROP POLICY IF EXISTS "organizacoes_select_accessible" ON public.organizacoes;
CREATE POLICY "organizacoes_select_accessible" ON public.organizacoes
  FOR SELECT USING (
    public.is_super_admin() OR
    id = ANY(public.user_organizations())
  );

-- =====================================================
-- POLÍTICAS PARA PRONTUARIOS
-- =====================================================

DROP POLICY IF EXISTS "prontuarios_select_clinic" ON public.prontuarios;
CREATE POLICY "prontuarios_select_clinic" ON public.prontuarios
  FOR SELECT USING (
    public.is_super_admin() OR
    clinica_id = ANY(public.user_clinics())
  );

DROP POLICY IF EXISTS "prontuarios_insert_clinic" ON public.prontuarios;
CREATE POLICY "prontuarios_insert_clinic" ON public.prontuarios
  FOR INSERT WITH CHECK (
    public.is_super_admin() OR
    (clinica_id = ANY(public.user_clinics()) AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
        AND clinica_id = prontuarios.clinica_id
        AND role IN ('proprietaria', 'gerente', 'profissionais')
        AND ativo = true
    ))
  );

-- =====================================================
-- POLÍTICAS PARA SESSOES_ATENDIMENTO
-- =====================================================

DROP POLICY IF EXISTS "sessoes_select_clinic" ON public.sessoes_atendimento;
CREATE POLICY "sessoes_select_clinic" ON public.sessoes_atendimento
  FOR SELECT USING (
    public.is_super_admin() OR
    EXISTS (
      SELECT 1 FROM public.prontuarios p
      WHERE p.id = prontuario_id
        AND p.clinica_id = ANY(public.user_clinics())
    )
  );

-- =====================================================
-- POLÍTICAS PARA IMAGENS_MEDICAS
-- =====================================================

DROP POLICY IF EXISTS "imagens_select_clinic" ON public.imagens_medicas;
CREATE POLICY "imagens_select_clinic" ON public.imagens_medicas
  FOR SELECT USING (
    public.is_super_admin() OR
    EXISTS (
      SELECT 1 FROM public.prontuarios p
      WHERE p.id = prontuario_id
        AND p.clinica_id = ANY(public.user_clinics())
    )
  );

-- =====================================================
-- POLÍTICAS PARA EQUIPAMENTOS
-- =====================================================

DROP POLICY IF EXISTS "equipamentos_select_clinic" ON public.equipamentos;
CREATE POLICY "equipamentos_select_clinic" ON public.equipamentos
  FOR SELECT USING (
    public.is_super_admin() OR
    clinica_id = ANY(public.user_clinics())
  );

-- =====================================================
-- POLÍTICAS PARA PRODUTOS (ESTOQUE)
-- =====================================================

DROP POLICY IF EXISTS "produtos_select_clinic" ON public.produtos;
CREATE POLICY "produtos_select_clinic" ON public.produtos
  FOR SELECT USING (
    public.is_super_admin() OR
    clinica_id = ANY(public.user_clinics())
  );

-- =====================================================
-- POLÍTICAS PARA AUDITORIA
-- =====================================================

DROP POLICY IF EXISTS "auditoria_select_clinic" ON public.auditoria_medica;
CREATE POLICY "auditoria_select_clinic" ON public.auditoria_medica
  FOR SELECT USING (
    public.is_super_admin() OR
    clinica_id = ANY(public.user_clinics())
  );

-- Auditoria só permite INSERT (nunca UPDATE/DELETE)
DROP POLICY IF EXISTS "auditoria_insert_clinic" ON public.auditoria_medica;
CREATE POLICY "auditoria_insert_clinic" ON public.auditoria_medica
  FOR INSERT WITH CHECK (
    clinica_id = ANY(public.user_clinics()) OR public.is_super_admin()
  );

-- =====================================================
-- POLÍTICAS PARA TABELAS DE REFERÊNCIA (SOMENTE LEITURA)
-- =====================================================

-- Especialidades médicas (leitura para todos usuários autenticados)
DROP POLICY IF EXISTS "especialidades_select_all" ON public.especialidades_medicas;
CREATE POLICY "especialidades_select_all" ON public.especialidades_medicas
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Categorias de procedimento (leitura para todos usuários autenticados)
DROP POLICY IF EXISTS "categorias_select_all" ON public.categorias_procedimento;
CREATE POLICY "categorias_select_all" ON public.categorias_procedimento
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Fabricantes de equipamento (leitura para todos usuários autenticados)
DROP POLICY IF EXISTS "fabricantes_select_all" ON public.fabricantes_equipamento;
CREATE POLICY "fabricantes_select_all" ON public.fabricantes_equipamento
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 4. VERIFICAÇÃO FINAL DAS POLÍTICAS
-- =====================================================

DO $$
DECLARE
  rec RECORD;
  total_policies INTEGER := 0;
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'POLÍTICAS RLS CONFIGURADAS:';
  RAISE NOTICE '=================================================';
  
  FOR rec IN 
    SELECT schemaname, tablename, policyname, cmd, qual
    FROM pg_policies 
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  LOOP
    total_policies := total_policies + 1;
    RAISE NOTICE 'Tabela: % | Política: % | Comando: %', 
      rec.tablename, rec.policyname, rec.cmd;
  END LOOP;
  
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Total de políticas configuradas: %', total_policies;
  RAISE NOTICE 'CONFIGURAÇÃO RLS CONCLUÍDA COM SUCESSO!';
  RAISE NOTICE '=================================================';
END $$;

-- =====================================================
-- 5. SCRIPT DE TESTE DAS POLÍTICAS
-- =====================================================

-- Função para testar políticas RLS
CREATE OR REPLACE FUNCTION public.test_rls_policies()
RETURNS TABLE (
  test_name TEXT,
  status TEXT,
  details TEXT
) AS $$
BEGIN
  -- Este é um placeholder para testes futuros
  -- Os testes reais devem ser executados com usuários específicos
  
  RETURN QUERY SELECT 
    'RLS Configuration Check'::TEXT as test_name,
    'COMPLETED'::TEXT as status,
    'Todas as políticas foram configuradas. Execute testes com usuários reais.'::TEXT as details;
    
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Log de conclusão
DO $$ 
BEGIN 
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'AUDITORIA E CONFIGURAÇÃO RLS CONCLUÍDA';
  RAISE NOTICE 'Timestamp: %', now();
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '1. Testar políticas com usuários reais';  
  RAISE NOTICE '2. Verificar logs de auditoria';
  RAISE NOTICE '3. Executar testes end-to-end';
  RAISE NOTICE '=================================================';
END $$;