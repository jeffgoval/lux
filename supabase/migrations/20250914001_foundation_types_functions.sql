-- =============================================================================
-- MIGRAÇÃO 001: FUNDAÇÃO - EXTENSÕES, TIPOS E FUNÇÕES BASE
-- =============================================================================
-- Data: 2025-09-14
-- Descrição: Configura extensões necessárias, tipos personalizados e funções utilitárias
-- Dependências: Nenhuma
-- Rollback: DROP dos tipos e funções criados

-- =============================================================================
-- 1. EXTENSÕES NECESSÁRIAS
-- =============================================================================

-- Habilitar UUID v4
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 2. TIPOS PERSONALIZADOS (ENUMS)
-- =============================================================================

-- Tipos de plano para organizações
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plano_type') THEN
        CREATE TYPE plano_type AS ENUM ('basico', 'premium', 'enterprise');
    END IF;
END $$;

-- Roles de usuário no sistema
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type') THEN
        CREATE TYPE user_role_type AS ENUM (
            'super_admin', 
            'proprietaria', 
            'gerente', 
            'profissionais', 
            'recepcionistas', 
            'visitante', 
            'cliente'
        );
    END IF;
END $$;

-- Especialidades médicas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'especialidade_medica') THEN
        CREATE TYPE especialidade_medica AS ENUM (
            'dermatologia',
            'cirurgia_plastica',
            'medicina_estetica',
            'fisioterapia_estetica',
            'nutricao',
            'psicologia',
            'enfermagem_estetica',
            'biomedicina_estetica'
        );
    END IF;
END $$;

-- Status de convites
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_convite') THEN
        CREATE TYPE status_convite AS ENUM (
            'pendente',
            'aceito', 
            'recusado',
            'cancelado',
            'expirado'
        );
    END IF;
END $$;

-- Tipos de procedimento
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_procedimento') THEN
        CREATE TYPE tipo_procedimento AS ENUM (
            'botox_toxina',
            'preenchimento', 
            'harmonizacao_facial',
            'laser_ipl',
            'peeling',
            'tratamento_corporal', 
            'skincare_avancado',
            'outro'
        );
    END IF;
END $$;

-- Status do prontuário
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_prontuario') THEN
        CREATE TYPE status_prontuario AS ENUM (
            'ativo',
            'arquivado',
            'transferido'
        );
    END IF;
END $$;

-- =============================================================================
-- 3. FUNÇÕES UTILITÁRIAS
-- =============================================================================

-- Função para validar email
CREATE OR REPLACE FUNCTION public.validate_email(email TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para validar CPF (formato básico)
CREATE OR REPLACE FUNCTION public.validate_cpf(cpf TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
    -- Remove caracteres não numéricos
    cpf := REGEXP_REPLACE(cpf, '[^0-9]', '', 'g');
    
    -- Verifica se tem 11 dígitos
    IF LENGTH(cpf) != 11 THEN
        RETURN FALSE;
    END IF;
    
    -- Verifica se não são todos iguais (000.000.000-00, etc.)
    IF cpf IN ('00000000000', '11111111111', '22222222222', '33333333333', 
               '44444444444', '55555555555', '66666666666', '77777777777',
               '88888888888', '99999999999') THEN
        RETURN FALSE;
    END IF;
    
    -- Para simplificar, aceita qualquer CPF que passe nos testes básicos
    -- Em produção, implementar validação completa com dígito verificador
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para validar CNPJ (formato básico)
CREATE OR REPLACE FUNCTION public.validate_cnpj(cnpj TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
    -- Remove caracteres não numéricos
    cnpj := REGEXP_REPLACE(cnpj, '[^0-9]', '', 'g');
    
    -- Verifica se tem 14 dígitos
    IF LENGTH(cnpj) != 14 THEN
        RETURN FALSE;
    END IF;
    
    -- Verifica se não são todos iguais
    IF cnpj IN ('00000000000000', '11111111111111', '22222222222222', '33333333333333',
                '44444444444444', '55555555555555', '66666666666666', '77777777777777',
                '88888888888888', '99999999999999') THEN
        RETURN FALSE;
    END IF;
    
    -- Para simplificar, aceita qualquer CNPJ que passe nos testes básicos
    -- Em produção, implementar validação completa com dígito verificador
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar token seguro
CREATE OR REPLACE FUNCTION public.generate_secure_token(length INTEGER DEFAULT 32) 
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- =============================================================================
-- 4. COMENTÁRIOS E METADADOS
-- =============================================================================

-- Adicionar comentários aos tipos para documentação
COMMENT ON TYPE plano_type IS 'Tipos de plano disponíveis para organizações';
COMMENT ON TYPE user_role_type IS 'Roles de usuário no sistema multi-tenant';
COMMENT ON TYPE especialidade_medica IS 'Especialidades médicas disponíveis';
COMMENT ON TYPE status_convite IS 'Status possíveis para convites de usuário';
COMMENT ON TYPE tipo_procedimento IS 'Tipos de procedimentos estéticos';
COMMENT ON TYPE status_prontuario IS 'Status possíveis para prontuários médicos';

COMMENT ON FUNCTION public.validate_email(TEXT) IS 'Valida formato básico de email';
COMMENT ON FUNCTION public.validate_cpf(TEXT) IS 'Valida formato básico de CPF';
COMMENT ON FUNCTION public.validate_cnpj(TEXT) IS 'Valida formato básico de CNPJ';
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Trigger para atualizar timestamp automaticamente';
COMMENT ON FUNCTION public.generate_secure_token(INTEGER) IS 'Gera token seguro aleatório';

-- =============================================================================
-- ROLLBACK SCRIPT (comentado - usar apenas se necessário)
-- =============================================================================

/*
-- Para fazer rollback desta migração, execute:

DROP FUNCTION IF EXISTS public.generate_secure_token(INTEGER);
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.validate_cnpj(TEXT);
DROP FUNCTION IF EXISTS public.validate_cpf(TEXT);
DROP FUNCTION IF EXISTS public.validate_email(TEXT);

DROP TYPE IF EXISTS status_prontuario;
DROP TYPE IF EXISTS tipo_procedimento;
DROP TYPE IF EXISTS status_convite;
DROP TYPE IF EXISTS especialidade_medica;
DROP TYPE IF EXISTS user_role_type;
DROP TYPE IF EXISTS plano_type;

-- Nota: Extensões não são removidas por segurança
*/

-- =============================================================================
-- FIM DA MIGRAÇÃO 001
-- =============================================================================