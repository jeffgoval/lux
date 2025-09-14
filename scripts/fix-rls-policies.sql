-- ============================================================================
-- CORREÇÃO DE POLÍTICAS RLS PARA RESOLVER PROBLEMAS DE ONBOARDING
-- ============================================================================
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. VERIFICAR ESTRUTURAS EXISTENTES
-- ============================================================================

-- Verificar se as tabelas existem
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'user_roles', 'clinicas');

-- Verificar políticas RLS existentes
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_roles', 'clinicas');

-- 2. REMOVER POLÍTICAS RESTRITIVAS EXISTENTES (SE NECESSÁRIO)
-- ============================================================================

-- Remover políticas que podem estar bloqueando onboarding
DROP POLICY IF EXISTS "Users can only view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can only update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can only view own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can only manage own roles" ON user_roles;

-- 3. CRIAR POLÍTICAS RLS PERMISSIVAS PARA ONBOARDING
-- ============================================================================

-- PROFILES: Permitir usuários autenticados criarem e editarem seus próprios perfis
CREATE POLICY "auth_users_can_create_own_profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "auth_users_can_read_own_profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "auth_users_can_update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- USER_ROLES: Permitir usuários autenticados criarem e editarem seus próprios roles
CREATE POLICY "auth_users_can_create_own_roles" ON user_roles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "auth_users_can_read_own_roles" ON user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "auth_users_can_update_own_roles" ON user_roles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- CLINICAS: Permitir que proprietárias criem e gerenciem suas clínicas
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

-- 4. ATIVAR RLS NAS TABELAS (SE NÃO ESTIVER ATIVO)
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinicas ENABLE ROW LEVEL SECURITY;

-- 5. VERIFICAR SE O TRIGGER DE CRIAÇÃO AUTOMÁTICA EXISTE
-- ============================================================================

-- Verificar se a função handle_new_user existe
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'handle_new_user';

-- Verificar se o trigger existe
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 6. RECRIAR FUNÇÃO E TRIGGER SE NECESSÁRIO
-- ============================================================================

-- Função para criar perfil e role automaticamente
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

-- Recriar trigger se não existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. VERIFICAÇÕES FINAIS
-- ============================================================================

-- Contar políticas criadas
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_roles', 'clinicas')
GROUP BY tablename
ORDER BY tablename;

-- Mostrar todas as políticas criadas
SELECT 
  tablename,
  policyname,
  cmd as command,
  CASE 
    WHEN cmd = 'INSERT' THEN 'CREATE'
    WHEN cmd = 'SELECT' THEN 'READ'
    WHEN cmd = 'UPDATE' THEN 'UPDATE'
    WHEN cmd = 'DELETE' THEN 'DELETE'
    ELSE cmd
  END as operation
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

-- FINALIZADO: As políticas RLS foram configuradas para permitir:
-- ✅ Usuários autenticados podem criar/ler/editar seus próprios perfis
-- ✅ Usuários autenticados podem criar/ler/editar seus próprios roles  
-- ✅ Proprietárias podem criar/gerenciar suas clínicas
-- ✅ Trigger automático recriado para novos usuários