-- ============================================================================
-- CORREÇÃO COMPLETA DE POLÍTICAS RLS E TRIGGERS
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================================

-- 1. REMOVER POLÍTICAS RESTRITIVAS EXISTENTES
-- ============================================================================

DROP POLICY IF EXISTS "Users can only view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can only update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can only view own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can only manage own roles" ON user_roles;

-- Remover outras políticas antigas que podem estar bloqueando
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON profiles;

-- 2. CRIAR POLÍTICAS PERMISSIVAS PARA PROFILES
-- ============================================================================

-- Permitir usuários autenticados criarem seus próprios perfis
CREATE POLICY "auth_users_can_create_own_profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Permitir usuários autenticados lerem seus próprios perfis
CREATE POLICY "auth_users_can_read_own_profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Permitir usuários autenticados atualizarem seus próprios perfis
CREATE POLICY "auth_users_can_update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. CRIAR POLÍTICAS PERMISSIVAS PARA USER_ROLES
-- ============================================================================

-- Permitir usuários autenticados criarem seus próprios roles
CREATE POLICY "auth_users_can_create_own_roles" ON user_roles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Permitir usuários autenticados lerem seus próprios roles
CREATE POLICY "auth_users_can_read_own_roles" ON user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Permitir usuários autenticados atualizarem seus próprios roles
CREATE POLICY "auth_users_can_update_own_roles" ON user_roles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. ATIVAR RLS NAS TABELAS
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinicas ENABLE ROW LEVEL SECURITY;

-- 5. CRIAR/ATUALIZAR FUNÇÃO E TRIGGER DE CRIAÇÃO AUTOMÁTICA
-- ============================================================================

-- Função para criar perfil e role automaticamente quando um usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar perfil básico
  INSERT INTO public.profiles (id, email, nome_completo, primeiro_acesso)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1)),
    true
  );

  -- Criar role de proprietária
  INSERT INTO public.user_roles (user_id, role, ativo, criado_por)
  VALUES (
    NEW.id,
    'proprietaria',
    true,
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger para garantir que funcione
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. POLÍTICAS ADICIONAIS PARA CLÍNICAS (OPCIONAL)
-- ============================================================================

-- Permitir que proprietárias criem suas próprias clínicas
CREATE POLICY "proprietarias_can_create_clinicas" ON clinicas
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'proprietaria' 
      AND ativo = true
    )
  );

-- Permitir leitura das próprias clínicas
CREATE POLICY "proprietarias_can_read_own_clinicas" ON clinicas
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND clinica_id = clinicas.id 
      AND ativo = true
    )
  );

-- Permitir atualização das próprias clínicas
CREATE POLICY "proprietarias_can_update_own_clinicas" ON clinicas
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND clinica_id = clinicas.id 
      AND role = 'proprietaria'
      AND ativo = true
    )
  );

-- 7. VERIFICAÇÕES FINAIS
-- ============================================================================

-- Mostrar políticas criadas
SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'INSERT' THEN 'CREATE'
    WHEN cmd = 'SELECT' THEN 'READ'
    WHEN cmd = 'UPDATE' THEN 'UPDATE'
    WHEN cmd = 'DELETE' THEN 'DELETE'
    ELSE cmd
  END as action
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_roles', 'clinicas')
ORDER BY tablename, cmd;

-- Verificar se RLS está ativo
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_roles', 'clinicas');

-- Verificar se o trigger existe
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- ============================================================================
-- FIM DO SCRIPT - EXECUTE TODO O CONTEÚDO ACIMA
-- ============================================================================