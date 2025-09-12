-- =====================================================
-- FOUNDATION LAYER: ENUMs, Extensions and Utility Functions
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- Enable necessary PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUM TYPES DEFINITION
-- =====================================================

-- User role types for the system
DO $$ BEGIN
  CREATE TYPE public.user_role_type AS ENUM (
    'super_admin',
    'proprietaria', 
    'gerente',
    'profissionais',
    'recepcionistas',
    'visitante'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Organization plan types
DO $$ BEGIN
  CREATE TYPE public.plano_type AS ENUM (
    'basico', 
    'premium', 
    'enterprise'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Invitation status types
DO $$ BEGIN
  CREATE TYPE public.status_convite AS ENUM (
    'pendente', 
    'aceito', 
    'expirado', 
    'cancelado'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Medical procedure types
DO $$ BEGIN
  CREATE TYPE public.tipo_procedimento AS ENUM (
    'botox_toxina',
    'preenchimento',
    'harmonizacao_facial', 
    'laser_ipl',
    'peeling',
    'tratamento_corporal',
    'skincare_avancado',
    'consulta',
    'avaliacao',
    'outro'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Medical access levels
DO $$ BEGIN
  CREATE TYPE public.nivel_acesso_medico AS ENUM (
    'medico_responsavel',
    'medico_assistente',
    'enfermeiro',
    'esteticista',
    'administrador'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Medical record status
DO $$ BEGIN
  CREATE TYPE public.status_prontuario AS ENUM (
    'ativo',
    'inativo',
    'arquivado',
    'transferido'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Consent types
DO $$ BEGIN
  CREATE TYPE public.tipo_consentimento AS ENUM (
    'termo_responsabilidade',
    'autorizacao_imagem',
    'consentimento_procedimento',
    'termo_privacidade'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Medical image types
DO $$ BEGIN
  CREATE TYPE public.tipo_imagem AS ENUM (
    'antes',
    'durante',
    'depois',
    'complicacao',
    'documento'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- System access types
DO $$ BEGIN
  CREATE TYPE public.tipo_acesso AS ENUM (
    'visualizacao',
    'edicao',
    'criacao',
    'exclusao',
    'download'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Medical specialties
DO $$ BEGIN
  CREATE TYPE public.especialidade_medica AS ENUM (
    'medico_dermatologista',
    'medico_cirurgiao_plastico', 
    'biomedico_esteta',
    'enfermeiro_esteta',
    'fisioterapeuta_dermato_funcional',
    'nutricionista',
    'esteticista_cosmetologo',
    'tricologista',
    'dentista_harmonizacao',
    'farmaceutico_esteta',
    'terapeuta_capilar',
    'massoterapeuta',
    'maquiador_profissional'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Product categories
DO $$ BEGIN
  CREATE TYPE public.categoria_produto AS ENUM (
    'toxina_botulinica',
    'preenchedores_dermicos',
    'bioestimuladores_colageno',
    'peelings_quimicos',
    'cosmeceuticos',
    'produtos_limpeza',
    'filtros_solares',
    'mascaras_faciais',
    'terapia_capilar',
    'intradermoterapia',
    'anestesicos_topicos'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Equipment types
DO $$ BEGIN
  CREATE TYPE public.tipo_equipamento AS ENUM (
    'ultrassom_microfocado',
    'laser_fracionado',
    'radiofrequencia',
    'luz_intensa_pulsada',
    'criolipolise',
    'microagulhamento',
    'exossomos',
    'pdrn',
    'eletroterapia',
    'peeling_cristal',
    'ultrassom_estetico'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Product status
DO $$ BEGIN
  CREATE TYPE public.status_produto AS ENUM (
    'disponivel',
    'baixo_estoque',
    'vencido',
    'descontinuado'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Equipment status
DO $$ BEGIN
  CREATE TYPE public.status_equipamento AS ENUM (
    'ativo',
    'manutencao',
    'inativo',
    'calibracao'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Stock movement types
DO $$ BEGIN
  CREATE TYPE public.tipo_movimentacao AS ENUM (
    'entrada',
    'saida',
    'ajuste',
    'vencimento'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Maintenance types
DO $$ BEGIN
  CREATE TYPE public.tipo_manutencao AS ENUM (
    'preventiva',
    'corretiva',
    'calibracao',
    'limpeza'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Maintenance status
DO $$ BEGIN
  CREATE TYPE public.status_manutencao AS ENUM (
    'agendada',
    'realizada',
    'cancelada',
    'pendente'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Service provider types
DO $$ BEGIN
  CREATE TYPE public.tipo_prestador AS ENUM (
    'secretaria',
    'limpeza',
    'seguranca',
    'ti',
    'contabilidade',
    'juridico',
    'marketing',
    'outro'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- BASIC UTILITY FUNCTIONS
-- =====================================================

-- Function to update timestamp automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to generate secure tokens
CREATE OR REPLACE FUNCTION public.generate_secure_token(length INTEGER DEFAULT 32)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(length), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to hash sensitive data
CREATE OR REPLACE FUNCTION public.hash_sensitive_data(data TEXT, salt TEXT DEFAULT NULL)
RETURNS TEXT AS $$
BEGIN
  IF salt IS NULL THEN
    salt := gen_random_uuid()::TEXT;
  END IF;
  RETURN crypt(data, gen_salt('bf', 8));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VALIDATION FUNCTIONS
-- =====================================================

-- Function to validate email format
CREATE OR REPLACE FUNCTION public.validate_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;