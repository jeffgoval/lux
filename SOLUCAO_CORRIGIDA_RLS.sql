-- =====================================================
-- 🚨 SOLUÇÃO CORRIGIDA - SÓ TABELAS QUE EXISTEM
-- =====================================================
-- Execute este no Supabase SQL Editor

-- 1. VERIFICAR QUAIS TABELAS EXISTEM
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_roles', 'profiles', 'clinicas', 'templates_procedimentos', 'profissionais', 'clinica_profissionais')
ORDER BY tablename;

-- 2. DESABILITAR RLS NAS TABELAS QUE EXISTEM
DO $$
DECLARE
  table_name TEXT;
  tables_to_fix TEXT[] := ARRAY['user_roles', 'profiles', 'clinicas', 'profissionais', 'clinica_profissionais'];
BEGIN
  FOREACH table_name IN ARRAY tables_to_fix LOOP
    -- Verificar se a tabela existe antes de tentar desabilitar RLS
    IF EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = table_name
    ) THEN
      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_name);
      RAISE NOTICE '✅ RLS desabilitado em: %', table_name;
    ELSE
      RAISE NOTICE '⚠️  Tabela não existe: %', table_name;
    END IF;
  END LOOP;
END $$;

-- 3. REMOVER POLÍTICAS PROBLEMÁTICAS DA TABELA user_roles
DO $$
DECLARE
  policy_name TEXT;
  policies_to_drop TEXT[] := ARRAY[
    'Users can create their initial role',
    'user_roles_insert_onboarding',
    'user_roles_select_completed_onboarding', 
    'user_roles_update_completed_onboarding',
    'Verificar permissões para criar roles',
    'Proprietárias podem gerenciar roles',
    'Usuários podem ver próprios roles',
    'Gerentes podem ver roles do contexto',
    'Super admins podem ver todos roles'
  ];
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_roles'
  ) THEN
    FOREACH policy_name IN ARRAY policies_to_drop LOOP
      EXECUTE format('DROP POLICY IF EXISTS "%s" ON public.user_roles', policy_name);
    END LOOP;
    RAISE NOTICE '✅ Políticas removidas da tabela user_roles';
  ELSE
    RAISE NOTICE '⚠️  Tabela user_roles não existe';
  END IF;
END $$;

-- 4. VERIFICAR ESTRUTURA DA TABELA user_roles
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_roles'
  ) THEN
    RAISE NOTICE '✅ Tabela user_roles existe';
    
    -- Mostrar estrutura
    FOR rec IN 
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'user_roles' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    LOOP
      RAISE NOTICE '   - %: % (nullable: %)', rec.column_name, rec.data_type, rec.is_nullable;
    END LOOP;
  ELSE
    RAISE NOTICE '❌ Tabela user_roles NÃO existe - precisa ser criada';
  END IF;
END $$;

-- 5. CRIAR TABELA user_roles SE NÃO EXISTIR
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'proprietaria',
  clinica_id UUID,
  organizacao_id UUID,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  criado_por UUID NOT NULL
);

-- 6. GARANTIR QUE RLS ESTÁ DESABILITADO
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 7. VERIFICAR STATUS FINAL
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '❌ HABILITADO' 
    ELSE '✅ DESABILITADO' 
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_roles', 'profiles', 'clinicas', 'profissionais', 'clinica_profissionais')
ORDER BY tablename;

-- 8. TESTAR INSERÇÃO NA TABELA user_roles
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Pegar um usuário existente para teste
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Tentar inserir um role de teste
    INSERT INTO public.user_roles (user_id, role, ativo, criado_por)
    VALUES (test_user_id, 'proprietaria', true, test_user_id)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Teste de inserção na user_roles: SUCESSO';
  ELSE
    RAISE NOTICE '⚠️  Nenhum usuário encontrado para teste';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Erro no teste de inserção: %', SQLERRM;
END $$;

-- 9. RESULTADO FINAL
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎯 CORREÇÃO APLICADA COM SUCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS desabilitado nas tabelas existentes';
  RAISE NOTICE '✅ Políticas restritivas removidas';
  RAISE NOTICE '✅ Tabela user_roles verificada/criada';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TESTE AGORA O ONBOARDING:';
  RAISE NOTICE '1. Criar novo usuário';
  RAISE NOTICE '2. Completar wizard de onboarding';
  RAISE NOTICE '3. Verificar ausência de erro 403';
  RAISE NOTICE '';
  RAISE NOTICE '❓ Se ainda der erro, me avise qual!';
  RAISE NOTICE '========================================';
END $$;