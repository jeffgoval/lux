-- =====================================================
-- USER MANAGEMENT TABLES
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- =====================================================
-- PROFILES TABLE
-- =====================================================

-- User profiles table extending auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic information
  email TEXT UNIQUE NOT NULL,
  nome_completo TEXT NOT NULL,
  telefone TEXT,
  data_nascimento DATE,
  genero TEXT CHECK (genero IN ('masculino', 'feminino', 'outro', 'nao_informado')),
  
  -- Address information
  endereco JSONB,
  
  -- Profile information
  bio TEXT,
  avatar_url TEXT,
  
  -- Onboarding status
  onboarding_completo BOOLEAN NOT NULL DEFAULT false,
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- USER ROLES TABLE
-- =====================================================

-- User roles and permissions
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role information
  role user_role_type NOT NULL,
  
  -- Context (organization or clinic)
  organizacao_id UUID,
  clinica_id UUID,
  
  -- Status and dates
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT user_roles_unique_context UNIQUE (user_id, organizacao_id, clinica_id),
  CONSTRAINT user_roles_valid_dates CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

-- =====================================================
-- MEDICAL SPECIALTIES TABLE
-- =====================================================

-- Medical specialties reference table
CREATE TABLE public.especialidades_medicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  conselho_regulamentador TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- PROFESSIONALS TABLE
-- =====================================================

-- Medical professionals information
CREATE TABLE public.profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Professional information
  especialidade_codigo TEXT REFERENCES public.especialidades_medicas(codigo),
  registro_profissional TEXT NOT NULL,
  registro_conselho TEXT,
  
  -- Education and experience
  data_formacao DATE,
  instituicao_formacao TEXT,
  curriculo_resumido TEXT,
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT profissionais_unique_user UNIQUE (user_id),
  CONSTRAINT profissionais_unique_registro UNIQUE (registro_profissional)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Indexes for profiles table
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_ativo ON public.profiles(ativo);
CREATE INDEX idx_profiles_onboarding ON public.profiles(onboarding_completo);

-- Indexes for user_roles table
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_user_roles_organizacao ON public.user_roles(organizacao_id) WHERE organizacao_id IS NOT NULL;
CREATE INDEX idx_user_roles_clinica ON public.user_roles(clinica_id) WHERE clinica_id IS NOT NULL;
CREATE INDEX idx_user_roles_ativo ON public.user_roles(ativo);

-- Indexes for especialidades_medicas table
CREATE INDEX idx_especialidades_codigo ON public.especialidades_medicas(codigo);
CREATE INDEX idx_especialidades_ativo ON public.especialidades_medicas(ativo);

-- Indexes for profissionais table
CREATE INDEX idx_profissionais_user_id ON public.profissionais(user_id);
CREATE INDEX idx_profissionais_especialidade ON public.profissionais(especialidade_codigo);
CREATE INDEX idx_profissionais_registro ON public.profissionais(registro_profissional);
CREATE INDEX idx_profissionais_ativo ON public.profissionais(ativo);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Triggers for updating timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_especialidades_updated_at
  BEFORE UPDATE ON public.especialidades_medicas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profissionais_updated_at
  BEFORE UPDATE ON public.profissionais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.especialidades_medicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Policies for especialidades_medicas (public read)
CREATE POLICY "Everyone can view active specialties" ON public.especialidades_medicas
  FOR SELECT USING (ativo = true);

-- Policies for profissionais
CREATE POLICY "Users can view own professional info" ON public.profissionais
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own professional info" ON public.profissionais
  FOR UPDATE USING (auth.uid() = user_id);