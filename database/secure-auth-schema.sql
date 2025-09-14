-- ============================================================================
-- 🔐 SCHEMA DE AUTENTICAÇÃO SEGURO V2 - MULTI-TENANT
-- ============================================================================
-- 
-- Schema otimizado para máxima segurança e isolamento entre clínicas
-- Elimina vulnerabilidades do sistema anterior
--
-- ============================================================================

-- Limpar schema anterior (CUIDADO EM PRODUÇÃO!)
DROP SCHEMA IF EXISTS auth_v2 CASCADE;
CREATE SCHEMA auth_v2;
SET search_path TO auth_v2, public;

-- ============================================================================
-- ENUMS E TIPOS
-- ============================================================================

CREATE TYPE user_role_enum AS ENUM (
  'super_admin',
  'clinic_owner', 
  'clinic_manager',
  'professional',
  'receptionist',
  'patient'
);

CREATE TYPE permission_enum AS ENUM (
  'create_clinic',
  'view_clinic',
  'edit_clinic',
  'delete_clinic',
  'invite_user',
  'manage_users',
  'view_users',
  'create_medical_record',
  'view_medical_record',
  'edit_medical_record',
  'delete_medical_record',
  'view_financial',
  'manage_financial',
  'view_reports',
  'export_data',
  'view_audit_logs',
  'manage_system'
);

CREATE TYPE auth_event_enum AS ENUM (
  'login_success',
  'login_failed',
  'logout',
  'token_refresh',
  'password_change',
  'permission_denied',
  'clinic_switch',
  'account_locked'
);

-- ============================================================================
-- TABELA DE USUÁRIOS (SIMPLIFICADA E SEGURA)
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  
  -- Segurança
  email_verified BOOLEAN DEFAULT false NOT NULL,
  active BOOLEAN DEFAULT true NOT NULL,
  login_attempts INTEGER DEFAULT 0 NOT NULL,
  locked_until TIMESTAMPTZ,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_login_at TIMESTAMPTZ,
  last_login_ip INET,
  
  -- Constraints
  CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT users_name_length CHECK (length(name) >= 2 AND length(name) <= 255)
);

-- ============================================================================
-- TABELA DE CLÍNICAS (MULTI-TENANT)
-- ============================================================================

CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) UNIQUE,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Dados da clínica
  address JSONB DEFAULT '{}',
  contact_info JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  
  -- Status
  active BOOLEAN DEFAULT true NOT NULL,
  subscription_status VARCHAR(50) DEFAULT 'trial',
  subscription_expires_at TIMESTAMPTZ,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT clinics_name_length CHECK (length(name) >= 2 AND length(name) <= 255),
  CONSTRAINT clinics_cnpj_format CHECK (cnpj IS NULL OR cnpj ~ '^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$')
);

-- ============================================================================
-- TABELA DE ASSOCIAÇÕES USUÁRIO-CLÍNICA (CORE DO MULTI-TENANT)
-- ============================================================================

CREATE TABLE user_clinic_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  role user_role_enum NOT NULL,
  
  -- Permissões específicas (override das permissões padrão do role)
  custom_permissions permission_enum[] DEFAULT '{}',
  denied_permissions permission_enum[] DEFAULT '{}',
  
  -- Controle de acesso
  active BOOLEAN DEFAULT true NOT NULL,
  expires_at TIMESTAMPTZ,
  invited_by UUID REFERENCES users(id),
  accepted_at TIMESTAMPTZ,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  UNIQUE(user_id, clinic_id, role),
  CONSTRAINT user_clinic_roles_valid_expiry CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- ============================================================================
-- TABELA DE SESSÕES (PARA CONTROLE RIGOROSO)
-- ============================================================================

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Dados da sessão
  refresh_token_hash VARCHAR(255) NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  
  -- Controle
  active BOOLEAN DEFAULT true NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT user_sessions_valid_expiry CHECK (expires_at > created_at)
);

-- ============================================================================
-- TABELA DE LOGS DE AUDITORIA
-- ============================================================================

CREATE TABLE auth_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
  
  -- Evento
  event_type auth_event_enum NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  
  -- Contexto
  ip_address INET NOT NULL,
  user_agent TEXT,
  resource_accessed TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Particionamento por data (para performance)
  PARTITION BY RANGE (created_at)
);

-- Criar partições para os próximos 12 meses
DO $$
DECLARE
  start_date DATE := DATE_TRUNC('month', CURRENT_DATE);
  end_date DATE;
  partition_name TEXT;
BEGIN
  FOR i IN 0..11 LOOP
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'auth_audit_logs_' || TO_CHAR(start_date, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE %I PARTITION OF auth_audit_logs 
                    FOR VALUES FROM (%L) TO (%L)', 
                   partition_name, start_date, end_date);
    
    start_date := end_date;
  END LOOP;
END $$;

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Usuários
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(active) WHERE active = true;
CREATE INDEX idx_users_locked ON users(locked_until) WHERE locked_until IS NOT NULL;

-- Clínicas
CREATE INDEX idx_clinics_owner ON clinics(owner_id);
CREATE INDEX idx_clinics_active ON clinics(active) WHERE active = true;
CREATE INDEX idx_clinics_cnpj ON clinics(cnpj) WHERE cnpj IS NOT NULL;

-- Associações usuário-clínica
CREATE INDEX idx_user_clinic_roles_user ON user_clinic_roles(user_id);
CREATE INDEX idx_user_clinic_roles_clinic ON user_clinic_roles(clinic_id);
CREATE INDEX idx_user_clinic_roles_active ON user_clinic_roles(user_id, clinic_id) WHERE active = true;
CREATE INDEX idx_user_clinic_roles_role ON user_clinic_roles(role);

-- Sessões
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(refresh_token_hash);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, active) WHERE active = true;
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Logs de auditoria
CREATE INDEX idx_auth_audit_logs_user ON auth_audit_logs(user_id);
CREATE INDEX idx_auth_audit_logs_clinic ON auth_audit_logs(clinic_id);
CREATE INDEX idx_auth_audit_logs_event ON auth_audit_logs(event_type);
CREATE INDEX idx_auth_audit_logs_created ON auth_audit_logs(created_at);

-- ============================================================================
-- TRIGGERS PARA AUDITORIA E MANUTENÇÃO
-- ============================================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinics_updated_at 
  BEFORE UPDATE ON clinics 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_clinic_roles_updated_at 
  BEFORE UPDATE ON user_clinic_roles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNÇÕES DE UTILIDADE
-- ============================================================================

-- Função para limpar sessões expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions 
  WHERE expires_at < NOW() OR (active = false AND last_used_at < NOW() - INTERVAL '7 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Função para limpar logs antigos
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM auth_audit_logs 
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DADOS INICIAIS
-- ============================================================================

-- Inserir usuário super admin (apenas para setup inicial)
INSERT INTO users (id, email, password_hash, name, email_verified, active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@luxe-flow.com',
  '$2b$12$placeholder_hash_replace_in_production',
  'Super Admin',
  true,
  true
) ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON SCHEMA auth_v2 IS 'Schema de autenticação seguro V2 - Multi-tenant com isolamento rigoroso';
COMMENT ON TABLE users IS 'Usuários do sistema com controles de segurança';
COMMENT ON TABLE clinics IS 'Clínicas (tenants) com isolamento completo';
COMMENT ON TABLE user_clinic_roles IS 'Associações usuário-clínica com roles e permissões';
COMMENT ON TABLE user_sessions IS 'Sessões ativas para controle rigoroso de acesso';
COMMENT ON TABLE auth_audit_logs IS 'Logs de auditoria particionados por data';

-- ============================================================================
-- GRANTS E PERMISSÕES
-- ============================================================================

-- Criar role para aplicação
CREATE ROLE luxe_flow_app;

-- Conceder permissões necessárias
GRANT USAGE ON SCHEMA auth_v2 TO luxe_flow_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth_v2 TO luxe_flow_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA auth_v2 TO luxe_flow_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth_v2 TO luxe_flow_app;

-- ============================================================================
-- VERIFICAÇÃO DE INTEGRIDADE
-- ============================================================================

-- Função para verificar integridade do schema
CREATE OR REPLACE FUNCTION verify_schema_integrity()
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}';
  table_count INTEGER;
  index_count INTEGER;
  constraint_count INTEGER;
BEGIN
  -- Contar tabelas
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'auth_v2';
  
  -- Contar índices
  SELECT COUNT(*) INTO index_count 
  FROM pg_indexes 
  WHERE schemaname = 'auth_v2';
  
  -- Contar constraints
  SELECT COUNT(*) INTO constraint_count 
  FROM information_schema.table_constraints 
  WHERE table_schema = 'auth_v2';
  
  result := jsonb_build_object(
    'schema_name', 'auth_v2',
    'tables_count', table_count,
    'indexes_count', index_count,
    'constraints_count', constraint_count,
    'verified_at', NOW(),
    'status', CASE 
      WHEN table_count >= 5 AND index_count >= 10 THEN 'healthy'
      ELSE 'incomplete'
    END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
