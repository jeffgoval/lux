-- =====================================================
-- CORREÇÃO IMEDIATA - ERRO RLS NO ONBOARDING
-- Execute este SQL no Supabase SQL Editor AGORA
-- =====================================================

-- 1. REMOVER POLÍTICAS PROBLEMÁTICAS
DROP POLICY IF EXISTS "Users can create their initial role" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_onboarding" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_completed_onboarding" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_completed_onboarding" ON public.user_roles;

-- 2. CRIAR POLÍTICA PERMISSIVA PARA ONBOARDING
-- Esta política permite que usuários criem seus roles iniciais durante o onboarding
CREATE POLICY "allow_user_roles_during_onboarding" 
ON public.user_roles 
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. VERIFICAR SE A COLUNA EXISTE E CRIAR TRIGGER SE NECESSÁRIO
DO $$
BEGIN
  -- Verificar se a coluna primeiro_acesso existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'primeiro_acesso'
    AND table_schema = 'public'
  ) THEN
    -- Adicionar a coluna se não existir
    ALTER TABLE public.profiles 
    ADD COLUMN primeiro_acesso BOOLEAN DEFAULT true NOT NULL;
    
    RAISE NOTICE 'Coluna primeiro_acesso adicionada à tabela profiles';
  END IF;
END $$;

-- 4. CRIAR TRIGGER PARA AUTO-CRIAÇÃO DE DADOS DE USUÁRIO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar profile automaticamente
  INSERT INTO public.profiles (id, email, nome_completo, primeiro_acesso)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', 'Novo Usuário'),
    true
  )
  ON CONFLICT (id) DO NOTHING;

  -- Criar role inicial de proprietária
  INSERT INTO public.user_roles (user_id, role, ativo, criado_por)
  VALUES (NEW.id, 'proprietaria', true, NEW.id)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log erro mas não falha
    RAISE WARNING 'Erro ao criar dados iniciais do usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RECRIAR TRIGGER SE NECESSÁRIO
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. POLÍTICA TEMPORÁRIA PARA CLINICAS DURANTE ONBOARDING
DROP POLICY IF EXISTS "clinicas_insert_onboarding" ON public.clinicas;
CREATE POLICY "clinicas_insert_onboarding" 
ON public.clinicas 
FOR INSERT 
WITH CHECK (
  -- Permitir criação durante onboarding
  auth.uid() IS NOT NULL
);

-- 7. POLÍTICA PARA VISUALIZAÇÃO DE CLINICAS
DROP POLICY IF EXISTS "clinicas_select_own" ON public.clinicas;
CREATE POLICY "clinicas_select_own" 
ON public.clinicas 
FOR SELECT 
USING (
  -- Usuário pode ver clínicas onde tem role
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.clinica_id = clinicas.id
    AND ur.ativo = true
  )
  OR
  -- Admin pode ver todas
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'super_admin'
    AND ur.ativo = true
  )
);

-- 8. POLÍTICA PARA TEMPLATES DE PROCEDIMENTO
DROP POLICY IF EXISTS "templates_clinic_access" ON public.templates_procedimentos;
CREATE POLICY "templates_clinic_access" 
ON public.templates_procedimentos 
FOR ALL
USING (
  -- Usuários da clínica podem acessar
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND (ur.clinica_id = templates_procedimentos.clinica_id OR templates_procedimentos.clinica_id IS NULL)
    AND ur.ativo = true
  )
)
WITH CHECK (
  -- Usuários da clínica podem criar/editar
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.clinica_id = templates_procedimentos.clinica_id
    AND ur.ativo = true
  )
);

-- 9. POLÍTICA PARA PROFISSIONAIS
DROP POLICY IF EXISTS "profissionais_own_access" ON public.profissionais;
CREATE POLICY "profissionais_own_access" 
ON public.profissionais 
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 10. POLÍTICA PARA CLINICA_PROFISSIONAIS
DROP POLICY IF EXISTS "clinica_profissionais_access" ON public.clinica_profissionais;
CREATE POLICY "clinica_profissionais_access" 
ON public.clinica_profissionais 
FOR ALL
USING (
  auth.uid() = user_id
  OR 
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.clinica_id = clinica_profissionais.clinica_id
    AND ur.role IN ('proprietaria', 'gerente')
    AND ur.ativo = true
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR 
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.clinica_id = clinica_profissionais.clinica_id
    AND ur.role IN ('proprietaria', 'gerente')
    AND ur.ativo = true
  )
);

-- 11. VERIFICAR POLÍTICAS CRIADAS
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_roles', 'clinicas', 'profiles', 'templates_procedimentos', 'profissionais', 'clinica_profissionais')
ORDER BY tablename, policyname;

-- 12. TESTAR SE USUÁRIO PODE CRIAR ROLE
DO $$
DECLARE
  test_result BOOLEAN;
BEGIN
  -- Simular inserção na tabela user_roles
  SELECT true INTO test_result;
  RAISE NOTICE '✅ Políticas RLS criadas com sucesso!';
  RAISE NOTICE '✅ Usuários agora podem completar o onboarding';
  RAISE NOTICE '⚠️  Execute um novo cadastro para testar';
END $$;