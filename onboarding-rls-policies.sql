-- =====================================================
-- POLÍTICAS RLS PARA ONBOARDING
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. Garantir estrutura da tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS primeiro_acesso BOOLEAN DEFAULT true NOT NULL;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_primeiro_acesso ON public.profiles(user_id, primeiro_acesso);
CREATE INDEX IF NOT EXISTS idx_profiles_active_users ON public.profiles(user_id) WHERE primeiro_acesso = false;

-- 2. Políticas RLS para PROFILES
-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Política para SELECT - usuários podem ver seu próprio perfil sempre
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Política para INSERT - usuários podem criar seu próprio perfil
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE - usuários podem atualizar seu próprio perfil
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 3. Políticas RLS para USER_ROLES
-- Remover políticas antigas de user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update own roles" ON public.user_roles;

-- Política SELECT para roles - apenas usuários que completaram onboarding
CREATE POLICY "user_roles_select_completed_onboarding" ON public.user_roles
  FOR SELECT USING (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.primeiro_acesso = false
    )
  );

-- Política INSERT para roles - permitir durante onboarding
CREATE POLICY "user_roles_insert_onboarding" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política UPDATE para roles - apenas usuários que completaram onboarding
CREATE POLICY "user_roles_update_completed_onboarding" ON public.user_roles
  FOR UPDATE USING (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.primeiro_acesso = false
    )
  );

-- 4. Políticas RLS para CLINICAS
-- Remover políticas antigas
DROP POLICY IF EXISTS "clinicas_select_owner" ON public.clinicas;
DROP POLICY IF EXISTS "clinicas_insert_owner" ON public.clinicas;
DROP POLICY IF EXISTS "clinicas_update_owner" ON public.clinicas;

-- SELECT clínicas - apenas usuários que completaram onboarding
CREATE POLICY "clinicas_select_completed_onboarding" ON public.clinicas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.clinica_id = clinicas.id
      AND ur.ativo = true
      AND p.primeiro_acesso = false
    )
  );

-- INSERT clínicas - permitir durante onboarding
CREATE POLICY "clinicas_insert_onboarding" ON public.clinicas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE clínicas - apenas usuários que completaram onboarding
CREATE POLICY "clinicas_update_completed_onboarding" ON public.clinicas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.clinica_id = clinicas.id
      AND ur.role IN ('proprietaria', 'gerente')
      AND ur.ativo = true
      AND p.primeiro_acesso = false
    )
  );

-- 5. Função utilitária para verificar onboarding
CREATE OR REPLACE FUNCTION public.user_completed_onboarding(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid 
    AND primeiro_acesso = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION public.user_completed_onboarding TO authenticated;

-- 6. Verificar se as políticas foram criadas corretamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_roles', 'clinicas')
ORDER BY tablename, policyname;