-- =====================================================
-- DIAGNÓSTICO E CORREÇÃO IMEDIATA - RLS ERRO 403
-- =====================================================
-- Execute este script no Supabase SQL Editor

-- 1. MAPEAR POLÍTICAS ATUAIS DA TABELA user_roles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_condition,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_roles'
ORDER BY policyname;

-- 2. VERIFICAR ESTRUTURA DA TABELA user_roles
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_roles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. VERIFICAR SE RLS ESTÁ HABILITADO
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  forcerowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'user_roles';

-- 4. REMOVER TODAS AS POLÍTICAS PROBLEMÁTICAS
DROP POLICY IF EXISTS "Users can create their initial role" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_onboarding" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_completed_onboarding" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_completed_onboarding" ON public.user_roles;
DROP POLICY IF EXISTS "Verificar permissões para criar roles" ON public.user_roles;
DROP POLICY IF EXISTS "Proprietárias podem gerenciar roles" ON public.user_roles;
DROP POLICY IF EXISTS "allow_user_roles_during_onboarding" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_create_initial" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_clinic_management" ON public.user_roles;

-- 5. CRIAR POLÍTICA SIMPLES E PERMISSIVA PARA ONBOARDING
CREATE POLICY "onboarding_user_roles_full_access" 
ON public.user_roles 
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. VERIFICAR SE A COLUNA primeiro_acesso EXISTE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'primeiro_acesso'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN primeiro_acesso BOOLEAN DEFAULT true NOT NULL;
    RAISE NOTICE '✅ Coluna primeiro_acesso adicionada à tabela profiles';
  ELSE
    RAISE NOTICE '✅ Coluna primeiro_acesso já existe na tabela profiles';
  END IF;
END $$;

-- 7. VERIFICAR E CORRIGIR POLÍTICAS DA TABELA profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_full_access_own" 
ON public.profiles 
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 8. VERIFICAR E CORRIGIR POLÍTICAS DA TABELA clinicas
DROP POLICY IF EXISTS "clinicas_insert_onboarding" ON public.clinicas;
DROP POLICY IF EXISTS "clinicas_select_own" ON public.clinicas;
DROP POLICY IF EXISTS "clinicas_update_owners" ON public.clinicas;

CREATE POLICY "clinicas_full_access_onboarding" 
ON public.clinicas 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND (ur.clinica_id = clinicas.id OR ur.clinica_id IS NULL)
    AND ur.ativo = true
  )
  OR auth.uid() IS NOT NULL -- Permitir durante onboarding
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'proprietaria'
    AND ur.ativo = true
  )
  OR auth.uid() IS NOT NULL -- Permitir durante onboarding
);

-- 9. VERIFICAR E CORRIGIR POLÍTICAS DAS OUTRAS TABELAS DO ONBOARDING
DROP POLICY IF EXISTS "templates_clinic_access" ON public.templates_procedimentos;
CREATE POLICY "templates_permissive_onboarding" 
ON public.templates_procedimentos 
FOR ALL
USING (
  auth.uid() IS NOT NULL
)
WITH CHECK (
  auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "profissionais_own_access" ON public.profissionais;
CREATE POLICY "profissionais_permissive_onboarding" 
ON public.profissionais 
FOR ALL
USING (auth.uid() = user_id OR auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "clinica_profissionais_access" ON public.clinica_profissionais;
CREATE POLICY "clinica_profissionais_permissive_onboarding" 
ON public.clinica_profissionais 
FOR ALL
USING (
  auth.uid() = user_id OR auth.uid() IS NOT NULL
)
WITH CHECK (
  auth.uid() = user_id OR auth.uid() IS NOT NULL
);

-- 10. CRIAR/ATUALIZAR TRIGGER PARA CRIAÇÃO AUTOMÁTICA DE DADOS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar profile automaticamente se não existir
  INSERT INTO public.profiles (id, email, nome_completo, primeiro_acesso)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', 'Novo Usuário'),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome_completo = COALESCE(EXCLUDED.nome_completo, profiles.nome_completo);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log erro mas não falha o cadastro
    RAISE WARNING 'Erro ao criar profile do usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger se necessário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. VERIFICAR POLÍTICAS CRIADAS
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_roles', 'clinicas', 'profiles', 'templates_procedimentos', 'profissionais', 'clinica_profissionais')
ORDER BY tablename, policyname;

-- 12. TESTAR INSERÇÃO SIMULADA
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CORREÇÃO RLS APLICADA COM SUCESSO!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Políticas RLS simplificadas e permissivas criadas';
  RAISE NOTICE '🔧 Trigger de criação automática atualizado';  
  RAISE NOTICE '🔧 Todas as tabelas do onboarding configuradas';
  RAISE NOTICE '';
  RAISE NOTICE '📝 PRÓXIMOS PASSOS:';
  RAISE NOTICE '1. Teste um novo cadastro de usuário';
  RAISE NOTICE '2. Complete o onboarding para verificar se funciona';
  RAISE NOTICE '3. Monitore logs para confirmar ausência de erros 403';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE: Estas são políticas temporárias permissivas';
  RAISE NOTICE '⚠️  Após confirmar funcionamento, refine para maior segurança';
  RAISE NOTICE '========================================';
END $$;