-- ============================================================================
-- 🛡️ POLÍTICAS RLS RIGOROSAS - SISTEMA MULTI-TENANT SEGURO
-- ============================================================================
--
-- Políticas de Row Level Security que garantem isolamento completo entre
-- clínicas e controle granular de acesso
--
-- ============================================================================

SET search_path TO auth_v2, public;

-- ============================================================================
-- FUNÇÕES AUXILIARES PARA RLS
-- ============================================================================

-- Função para obter o ID do usuário atual (do JWT)
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
  -- Em produção, isso virá do JWT decodificado
  -- Por enquanto, usar uma função que pode ser sobrescrita
  RETURN COALESCE(
    current_setting('app.current_user_id', true)::UUID,
    NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário tem acesso a uma clínica
CREATE OR REPLACE FUNCTION user_has_clinic_access(user_uuid UUID, clinic_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_clinic_roles ucr
    WHERE ucr.user_id = user_uuid 
      AND ucr.clinic_id = clinic_uuid
      AND ucr.active = true
      AND (ucr.expires_at IS NULL OR ucr.expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Função para verificar se usuário tem role específica
CREATE OR REPLACE FUNCTION user_has_role(user_uuid UUID, required_role user_role_enum)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_clinic_roles ucr
    WHERE ucr.user_id = user_uuid 
      AND ucr.role = required_role
      AND ucr.active = true
      AND (ucr.expires_at IS NULL OR ucr.expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Função para verificar se usuário tem permissão específica
CREATE OR REPLACE FUNCTION user_has_permission(
  user_uuid UUID, 
  clinic_uuid UUID, 
  required_permission permission_enum
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role user_role_enum;
  custom_perms permission_enum[];
  denied_perms permission_enum[];
  default_perms permission_enum[];
BEGIN
  -- Buscar role e permissões customizadas do usuário na clínica
  SELECT ucr.role, ucr.custom_permissions, ucr.denied_permissions
  INTO user_role, custom_perms, denied_perms
  FROM user_clinic_roles ucr
  WHERE ucr.user_id = user_uuid 
    AND ucr.clinic_id = clinic_uuid
    AND ucr.active = true
    AND (ucr.expires_at IS NULL OR ucr.expires_at > NOW());
  
  -- Se não encontrou associação, negar acesso
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Se permissão está explicitamente negada, negar acesso
  IF required_permission = ANY(denied_perms) THEN
    RETURN false;
  END IF;
  
  -- Se permissão está nas customizadas, permitir
  IF required_permission = ANY(custom_perms) THEN
    RETURN true;
  END IF;
  
  -- Verificar permissões padrão do role
  default_perms := get_default_permissions_for_role(user_role);
  RETURN required_permission = ANY(default_perms);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Função para obter permissões padrão de um role
CREATE OR REPLACE FUNCTION get_default_permissions_for_role(role_name user_role_enum)
RETURNS permission_enum[] AS $$
BEGIN
  RETURN CASE role_name
    WHEN 'super_admin' THEN ARRAY[
      'create_clinic', 'view_clinic', 'edit_clinic', 'delete_clinic',
      'invite_user', 'manage_users', 'view_users',
      'create_medical_record', 'view_medical_record', 'edit_medical_record', 'delete_medical_record',
      'view_financial', 'manage_financial',
      'view_reports', 'export_data',
      'view_audit_logs', 'manage_system'
    ]::permission_enum[]
    
    WHEN 'clinic_owner' THEN ARRAY[
      'create_clinic', 'view_clinic', 'edit_clinic',
      'invite_user', 'manage_users', 'view_users',
      'create_medical_record', 'view_medical_record', 'edit_medical_record', 'delete_medical_record',
      'view_financial', 'manage_financial',
      'view_reports', 'export_data',
      'view_audit_logs'
    ]::permission_enum[]
    
    WHEN 'clinic_manager' THEN ARRAY[
      'view_clinic', 'edit_clinic',
      'invite_user', 'view_users',
      'create_medical_record', 'view_medical_record', 'edit_medical_record',
      'view_financial', 'manage_financial',
      'view_reports'
    ]::permission_enum[]
    
    WHEN 'professional' THEN ARRAY[
      'view_clinic',
      'create_medical_record', 'view_medical_record', 'edit_medical_record',
      'view_reports'
    ]::permission_enum[]
    
    WHEN 'receptionist' THEN ARRAY[
      'view_clinic',
      'view_medical_record',
      'view_users'
    ]::permission_enum[]
    
    WHEN 'patient' THEN ARRAY[
      'view_medical_record'
    ]::permission_enum[]
    
    ELSE ARRAY[]::permission_enum[]
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_clinic_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLÍTICAS PARA TABELA USERS
-- ============================================================================

-- Usuários podem ver apenas seus próprios dados
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (id = current_user_id());

-- Usuários podem atualizar apenas seus próprios dados (exceto campos sensíveis)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = current_user_id())
  WITH CHECK (
    id = current_user_id() AND
    -- Não permitir alteração de campos críticos via RLS
    email = OLD.email AND
    email_verified = OLD.email_verified AND
    login_attempts = OLD.login_attempts AND
    locked_until = OLD.locked_until
  );

-- Super admins podem ver todos os usuários
CREATE POLICY "users_select_super_admin" ON users
  FOR SELECT USING (
    user_has_role(current_user_id(), 'super_admin')
  );

-- Administradores de clínica podem ver usuários de suas clínicas
CREATE POLICY "users_select_clinic_admin" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_clinic_roles ucr1
      JOIN user_clinic_roles ucr2 ON ucr1.clinic_id = ucr2.clinic_id
      WHERE ucr1.user_id = current_user_id()
        AND ucr1.role IN ('clinic_owner', 'clinic_manager')
        AND ucr1.active = true
        AND ucr2.user_id = users.id
        AND ucr2.active = true
    )
  );

-- ============================================================================
-- POLÍTICAS PARA TABELA CLINICS
-- ============================================================================

-- Usuários podem ver apenas clínicas às quais têm acesso
CREATE POLICY "clinics_select_accessible" ON clinics
  FOR SELECT USING (
    user_has_clinic_access(current_user_id(), id) OR
    user_has_role(current_user_id(), 'super_admin')
  );

-- Apenas proprietários podem criar clínicas
CREATE POLICY "clinics_insert_owner" ON clinics
  FOR INSERT WITH CHECK (
    owner_id = current_user_id()
  );

-- Proprietários e gerentes podem atualizar suas clínicas
CREATE POLICY "clinics_update_authorized" ON clinics
  FOR UPDATE USING (
    user_has_permission(current_user_id(), id, 'edit_clinic')
  ) WITH CHECK (
    user_has_permission(current_user_id(), id, 'edit_clinic') AND
    -- Não permitir mudança de proprietário via RLS
    owner_id = OLD.owner_id
  );

-- Apenas super admins podem deletar clínicas
CREATE POLICY "clinics_delete_super_admin" ON clinics
  FOR DELETE USING (
    user_has_role(current_user_id(), 'super_admin')
  );

-- ============================================================================
-- POLÍTICAS PARA TABELA USER_CLINIC_ROLES
-- ============================================================================

-- Usuários podem ver suas próprias associações
CREATE POLICY "user_clinic_roles_select_own" ON user_clinic_roles
  FOR SELECT USING (
    user_id = current_user_id()
  );

-- Administradores podem ver associações de suas clínicas
CREATE POLICY "user_clinic_roles_select_clinic_admin" ON user_clinic_roles
  FOR SELECT USING (
    user_has_permission(current_user_id(), clinic_id, 'view_users')
  );

-- Apenas proprietários e gerentes podem criar associações
CREATE POLICY "user_clinic_roles_insert_authorized" ON user_clinic_roles
  FOR INSERT WITH CHECK (
    user_has_permission(current_user_id(), clinic_id, 'invite_user') AND
    -- Não permitir auto-promoção para roles superiores
    CASE 
      WHEN role = 'super_admin' THEN user_has_role(current_user_id(), 'super_admin')
      WHEN role = 'clinic_owner' THEN user_has_role(current_user_id(), 'super_admin')
      ELSE true
    END
  );

-- Administradores podem atualizar associações (com restrições)
CREATE POLICY "user_clinic_roles_update_authorized" ON user_clinic_roles
  FOR UPDATE USING (
    user_has_permission(current_user_id(), clinic_id, 'manage_users')
  ) WITH CHECK (
    user_has_permission(current_user_id(), clinic_id, 'manage_users') AND
    -- Não permitir mudança de usuário ou clínica
    user_id = OLD.user_id AND
    clinic_id = OLD.clinic_id AND
    -- Restrições de role
    CASE 
      WHEN role = 'super_admin' THEN user_has_role(current_user_id(), 'super_admin')
      WHEN role = 'clinic_owner' THEN user_has_role(current_user_id(), 'super_admin')
      ELSE true
    END
  );

-- Administradores podem deletar associações (exceto proprietários)
CREATE POLICY "user_clinic_roles_delete_authorized" ON user_clinic_roles
  FOR DELETE USING (
    user_has_permission(current_user_id(), clinic_id, 'manage_users') AND
    role != 'clinic_owner' -- Proprietários não podem ser removidos via RLS
  );

-- ============================================================================
-- POLÍTICAS PARA TABELA USER_SESSIONS
-- ============================================================================

-- Usuários podem ver apenas suas próprias sessões
CREATE POLICY "user_sessions_select_own" ON user_sessions
  FOR SELECT USING (
    user_id = current_user_id()
  );

-- Usuários podem criar suas próprias sessões
CREATE POLICY "user_sessions_insert_own" ON user_sessions
  FOR INSERT WITH CHECK (
    user_id = current_user_id()
  );

-- Usuários podem atualizar suas próprias sessões
CREATE POLICY "user_sessions_update_own" ON user_sessions
  FOR UPDATE USING (
    user_id = current_user_id()
  ) WITH CHECK (
    user_id = current_user_id() AND
    user_id = OLD.user_id -- Não permitir mudança de usuário
  );

-- Usuários podem deletar suas próprias sessões
CREATE POLICY "user_sessions_delete_own" ON user_sessions
  FOR DELETE USING (
    user_id = current_user_id()
  );

-- Super admins podem ver todas as sessões
CREATE POLICY "user_sessions_select_super_admin" ON user_sessions
  FOR SELECT USING (
    user_has_role(current_user_id(), 'super_admin')
  );

-- ============================================================================
-- POLÍTICAS PARA TABELA AUTH_AUDIT_LOGS
-- ============================================================================

-- Usuários podem ver apenas seus próprios logs
CREATE POLICY "auth_audit_logs_select_own" ON auth_audit_logs
  FOR SELECT USING (
    user_id = current_user_id()
  );

-- Administradores podem ver logs de suas clínicas
CREATE POLICY "auth_audit_logs_select_clinic_admin" ON auth_audit_logs
  FOR SELECT USING (
    clinic_id IS NOT NULL AND
    user_has_permission(current_user_id(), clinic_id, 'view_audit_logs')
  );

-- Super admins podem ver todos os logs
CREATE POLICY "auth_audit_logs_select_super_admin" ON auth_audit_logs
  FOR SELECT USING (
    user_has_role(current_user_id(), 'super_admin')
  );

-- Sistema pode inserir logs (via função específica)
CREATE POLICY "auth_audit_logs_insert_system" ON auth_audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- FUNÇÕES PARA BYPASS CONTROLADO DE RLS
-- ============================================================================

-- Função para autenticação (bypass RLS para verificar credenciais)
CREATE OR REPLACE FUNCTION authenticate_user(user_email TEXT, password_hash TEXT)
RETURNS TABLE(
  user_id UUID,
  user_name TEXT,
  user_active BOOLEAN,
  login_attempts INTEGER,
  locked_until TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = auth_v2, public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.name, u.active, u.login_attempts, u.locked_until
  FROM users u
  WHERE u.email = user_email AND u.password_hash = authenticate_user.password_hash;
END;
$$ LANGUAGE plpgsql;

-- Função para criar usuário (bypass RLS para registro)
CREATE OR REPLACE FUNCTION create_user(
  user_email TEXT,
  password_hash TEXT,
  user_name TEXT
)
RETURNS UUID
SECURITY DEFINER
SET search_path = auth_v2, public
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  INSERT INTO users (email, password_hash, name)
  VALUES (user_email, password_hash, user_name)
  RETURNING id INTO new_user_id;
  
  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICAÇÃO DE POLÍTICAS
-- ============================================================================

-- Função para verificar se todas as políticas estão ativas
CREATE OR REPLACE FUNCTION verify_rls_policies()
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}';
  policy_count INTEGER;
  table_count INTEGER;
BEGIN
  -- Contar tabelas com RLS habilitado
  SELECT COUNT(*) INTO table_count
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'auth_v2' 
    AND c.relrowsecurity = true;
  
  -- Contar políticas ativas
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'auth_v2';
  
  result := jsonb_build_object(
    'tables_with_rls', table_count,
    'active_policies', policy_count,
    'verified_at', NOW(),
    'status', CASE 
      WHEN table_count >= 5 AND policy_count >= 15 THEN 'secure'
      ELSE 'incomplete'
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
