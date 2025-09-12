-- =====================================================
-- COMPLETE DATABASE SCHEMA FOR CLINIC SAAS
-- Resolves all authentication and onboarding issues
-- =====================================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS public.clinica_profissionais CASCADE;
DROP TABLE IF EXISTS public.templates_procedimentos CASCADE;
DROP TABLE IF EXISTS public.profissionais CASCADE;
DROP TABLE IF EXISTS public.clinicas CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.especialidades_medicas CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS public.tipo_procedimento CASCADE;
DROP TYPE IF EXISTS public.user_role_type CASCADE;

-- =====================================================
-- 1. CREATE ENUMS AND TYPES
-- =====================================================

-- User role types
CREATE TYPE public.user_role_type AS ENUM (
  'super_admin',
  'proprietaria', 
  'gerente',
  'profissionais',
  'recepcionistas',
  'visitante',
  'cliente'
);

-- Procedure types
CREATE TYPE public.tipo_procedimento AS ENUM (
  'consulta',
  'botox_toxina',
  'preenchimento',
  'harmonizacao_facial',
  'laser_ipl',
  'peeling',
  'tratamento_corporal',
  'skincare_avancado',
  'limpeza_pele',
  'outros'
);

-- =====================================================
-- 2. CREATE CORE TABLES
-- =====================================================

-- User profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nome_completo TEXT NOT NULL,
  telefone TEXT,
  avatar_url TEXT,
  data_nascimento DATE,
  cpf TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role_type NOT NULL,
  clinica_id UUID, -- Will be set after clinic creation
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id),
  
  -- Constraints
  UNIQUE(user_id, role, clinica_id)
);

-- Clinics table
CREATE TABLE public.clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  razao_social TEXT,
  
  -- Address as JSONB for flexibility
  endereco JSONB DEFAULT '{}'::jsonb,
  
  -- Contact information
  telefone_principal TEXT,
  telefone_secundario TEXT,
  email_contato TEXT,
  website TEXT,
  
  -- Business hours as JSONB
  horario_funcionamento JSONB DEFAULT '{}'::jsonb,
  
  -- Settings
  configuracoes JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Medical specialties table
CREATE TABLE public.especialidades_medicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  codigo_cbo TEXT, -- Brazilian occupation code
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Professionals table
CREATE TABLE public.profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Professional information
  registro_profissional TEXT NOT NULL,
  tipo_registro TEXT, -- CRM, CRO, etc.
  especialidades UUID[] DEFAULT ARRAY[]::UUID[], -- References especialidades_medicas
  
  -- Professional details
  biografia TEXT,
  experiencia_anos INTEGER,
  formacao TEXT,
  certificacoes TEXT[],
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT profissionais_unique_user UNIQUE (user_id),
  CONSTRAINT profissionais_unique_registro UNIQUE (registro_profissional)
);

-- Clinic-Professional relationship table (ESSENTIAL for linking)
CREATE TABLE public.clinica_profissionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role in clinic
  cargo TEXT NOT NULL DEFAULT 'Profissional',
  especialidades UUID[] DEFAULT ARRAY[]::UUID[],
  
  -- Work schedule
  horario_trabalho JSONB DEFAULT '{}'::jsonb,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  
  -- Permissions
  pode_criar_prontuarios BOOLEAN DEFAULT false,
  pode_editar_prontuarios BOOLEAN DEFAULT false,
  pode_visualizar_financeiro BOOLEAN DEFAULT false,
  pode_gerenciar_agenda BOOLEAN DEFAULT false,
  pode_gerenciar_estoque BOOLEAN DEFAULT false,
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(clinica_id, user_id)
);

-- Procedure templates table
CREATE TABLE public.templates_procedimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE,
  
  -- Template information
  tipo_procedimento tipo_procedimento NOT NULL,
  nome_template TEXT NOT NULL,
  descricao TEXT,
  
  -- Template configuration
  campos_obrigatorios JSONB DEFAULT '{}'::jsonb,
  campos_opcionais JSONB DEFAULT '{}'::jsonb,
  
  -- Default values
  duracao_padrao_minutos INTEGER DEFAULT 60,
  valor_base DECIMAL(10,2),
  
  -- Instructions
  instrucoes_pre TEXT,
  instrucoes_pos TEXT,
  contraindicacoes TEXT,
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 3. ADD FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Add foreign key from user_roles to clinicas (after clinicas table exists)
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_clinica_fkey 
FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE SET NULL;

-- =====================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Profiles indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_ativo ON public.profiles(ativo);

-- User roles indexes
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_clinica_id ON public.user_roles(clinica_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_user_roles_ativo ON public.user_roles(ativo);

-- Clinicas indexes
CREATE INDEX idx_clinicas_ativo ON public.clinicas(ativo);
CREATE INDEX idx_clinicas_criado_por ON public.clinicas(criado_por);
CREATE INDEX idx_clinicas_nome ON public.clinicas(nome);

-- Profissionais indexes
CREATE INDEX idx_profissionais_user_id ON public.profissionais(user_id);
CREATE INDEX idx_profissionais_registro ON public.profissionais(registro_profissional);
CREATE INDEX idx_profissionais_ativo ON public.profissionais(ativo);

-- Clinica profissionais indexes
CREATE INDEX idx_clinica_profissionais_clinica ON public.clinica_profissionais(clinica_id);
CREATE INDEX idx_clinica_profissionais_user ON public.clinica_profissionais(user_id);
CREATE INDEX idx_clinica_profissionais_ativo ON public.clinica_profissionais(ativo);

-- Templates indexes
CREATE INDEX idx_templates_clinica ON public.templates_procedimentos(clinica_id);
CREATE INDEX idx_templates_tipo ON public.templates_procedimentos(tipo_procedimento);
CREATE INDEX idx_templates_ativo ON public.templates_procedimentos(ativo);

-- Especialidades indexes
CREATE INDEX idx_especialidades_nome ON public.especialidades_medicas(nome);
CREATE INDEX idx_especialidades_ativo ON public.especialidades_medicas(ativo);

-- =====================================================
-- 5. CREATE TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =====================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$ language 'plpgsql';

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clinicas_updated_at
  BEFORE UPDATE ON public.clinicas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profissionais_updated_at
  BEFORE UPDATE ON public.profissionais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clinica_profissionais_updated_at
  BEFORE UPDATE ON public.clinica_profissionais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_templates_procedimentos_updated_at
  BEFORE UPDATE ON public.templates_procedimentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. INSERT INITIAL DATA
-- =====================================================

-- Insert basic medical specialties
INSERT INTO public.especialidades_medicas (nome, descricao, codigo_cbo) VALUES
('Dermatologia', 'Especialidade médica que se ocupa do diagnóstico, tratamento e prevenção de doenças e afecções relacionadas à pele', '2251-42'),
('Cirurgia Plástica', 'Especialidade médica que se dedica à correção de defeitos congênitos ou adquiridos', '2251-43'),
('Medicina Estética', 'Área médica focada em procedimentos estéticos não cirúrgicos', '2251-44'),
('Fisioterapia Dermatofuncional', 'Especialidade da fisioterapia voltada para tratamentos estéticos', '2236-40'),
('Biomedicina Estética', 'Área da biomedicina focada em procedimentos estéticos', '2211-05'),
('Enfermagem Estética', 'Especialidade da enfermagem voltada para procedimentos estéticos', '2235-65');

-- =====================================================
-- 7. ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinica_profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.especialidades_medicas ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.profiles IS 'User profile information';
COMMENT ON TABLE public.user_roles IS 'User roles and permissions within clinics';
COMMENT ON TABLE public.clinicas IS 'Clinic information and settings';
COMMENT ON TABLE public.profissionais IS 'Professional credentials and information';
COMMENT ON TABLE public.clinica_profissionais IS 'Relationship between professionals and clinics';
COMMENT ON TABLE public.templates_procedimentos IS 'Procedure templates for clinics';
COMMENT ON TABLE public.especialidades_medicas IS 'Medical specialties reference data';

-- =====================================================
-- 9. VERIFICATION QUERIES
-- =====================================================

-- Verify all tables were created
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'profiles', 'user_roles', 'clinicas', 'profissionais', 
    'clinica_profissionais', 'templates_procedimentos', 'especialidades_medicas'
  )
ORDER BY tablename;

-- Verify indexes were created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'user_roles', 'clinicas', 'profissionais', 
    'clinica_profissionais', 'templates_procedimentos', 'especialidades_medicas'
  )
ORDER BY tablename, indexname;

-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'profiles', 'user_roles', 'clinicas', 'profissionais', 
    'clinica_profissionais', 'templates_procedimentos', 'especialidades_medicas'
  )
ORDER BY tablename;

-- Success message
DO $
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'DATABASE SCHEMA CREATION COMPLETED SUCCESSFULLY';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'All tables, indexes, triggers, and initial data created';
  RAISE NOTICE 'RLS enabled on all tables';
  RAISE NOTICE 'Ready for RLS policies configuration';
  RAISE NOTICE '=================================================';
END $;