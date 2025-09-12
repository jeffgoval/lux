-- =====================================================
-- QUICK DATABASE SETUP - SUPABASE DASHBOARD
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUM TYPES
-- =====================================================

CREATE TYPE public.user_role_type AS ENUM (
  'super_admin',
  'proprietaria', 
  'gerente',
  'profissionais',
  'recepcionistas',
  'visitante'
);

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

CREATE TYPE public.tipo_imagem AS ENUM (
  'antes',
  'durante',
  'depois',
  'complicacao',
  'documento'
);

CREATE TYPE public.status_prontuario AS ENUM (
  'ativo',
  'inativo',
  'arquivado',
  'transferido'
);

CREATE TYPE public.tipo_equipamento AS ENUM (
  'ultrassom_microfocado',
  'laser_fracionado',
  'radiofrequencia',
  'luz_intensa_pulsada',
  'criolipolise',
  'microagulhamento',
  'laser_diodo'
);

CREATE TYPE public.status_equipamento AS ENUM (
  'ativo',
  'manutencao',
  'inativo',
  'calibracao'
);

CREATE TYPE public.tipo_manutencao AS ENUM (
  'preventiva',
  'corretiva',
  'calibracao',
  'limpeza'
);

CREATE TYPE public.status_manutencao AS ENUM (
  'agendada',
  'realizada',
  'cancelada',
  'pendente'
);

CREATE TYPE public.tipo_movimentacao AS ENUM (
  'entrada',
  'saida',
  'ajuste',
  'vencimento'
);

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.gerar_numero_prontuario(p_clinica_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  clinic_prefix TEXT;
BEGIN
  -- Get clinic prefix or use default
  SELECT COALESCE(nome, 'CLINIC') INTO clinic_prefix 
  FROM public.clinicas 
  WHERE id = p_clinica_id;
  
  -- Get next number for this clinic
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_prontuario FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.prontuarios 
  WHERE clinica_id = p_clinica_id;
  
  RETURN UPPER(LEFT(clinic_prefix, 3)) || '-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_number::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nome_completo TEXT NOT NULL,
  telefone TEXT,
  data_nascimento DATE,
  genero TEXT CHECK (genero IN ('masculino', 'feminino', 'outro', 'nao_informado')),
  endereco JSONB,
  bio TEXT,
  avatar_url TEXT,
  onboarding_completo BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role_type NOT NULL,
  organizacao_id UUID,
  clinica_id UUID,
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id),
  CONSTRAINT user_roles_unique_context UNIQUE (user_id, organizacao_id, clinica_id)
);

-- Organizations table
CREATE TABLE public.organizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  razao_social TEXT,
  cnpj TEXT UNIQUE,
  tipo_organizacao TEXT,
  endereco JSONB,
  telefone_principal TEXT,
  email_contato TEXT,
  website TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Clinics table
CREATE TABLE public.clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  razao_social TEXT,
  cnpj TEXT UNIQUE,
  organizacao_id UUID REFERENCES public.organizacoes(id),
  endereco JSONB,
  telefone_principal TEXT,
  email_contato TEXT,
  website TEXT,
  especialidades_oferecidas TEXT[],
  horario_funcionamento JSONB,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Medical specialties table
CREATE TABLE public.especialidades_medicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  conselho_regulamentador TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Professionals table
CREATE TABLE public.profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  especialidade_codigo TEXT REFERENCES public.especialidades_medicas(codigo),
  registro_profissional TEXT NOT NULL,
  registro_conselho TEXT,
  data_formacao DATE,
  instituicao_formacao TEXT,
  curriculo_resumido TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT profissionais_unique_user UNIQUE (user_id)
);

-- Medical records table
CREATE TABLE public.prontuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_prontuario TEXT UNIQUE NOT NULL,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id),
  nome_paciente TEXT NOT NULL,
  data_nascimento DATE,
  telefone TEXT,
  email TEXT,
  endereco JSONB,
  queixa_principal TEXT,
  historico_medico TEXT[],
  alergias TEXT[],
  medicamentos_uso TEXT[],
  observacoes_gerais TEXT,
  status status_prontuario NOT NULL DEFAULT 'ativo',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Treatment sessions table
CREATE TABLE public.sessoes_atendimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prontuario_id UUID NOT NULL REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES auth.users(id),
  tipo_sessao TEXT NOT NULL,
  data_sessao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duracao_minutos INTEGER,
  observacoes TEXT,
  plano_tratamento TEXT,
  proxima_sessao DATE,
  status_sessao TEXT DEFAULT 'agendada',
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Medical images table
CREATE TABLE public.imagens_medicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prontuario_id UUID NOT NULL REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  sessao_id UUID REFERENCES public.sessoes_atendimento(id),
  tipo_imagem tipo_imagem NOT NULL,
  descricao TEXT,
  caminho_storage TEXT NOT NULL,
  tamanho_bytes BIGINT,
  hash_arquivo TEXT,
  data_captura TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Equipment manufacturers table
CREATE TABLE public.fabricantes_equipamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  razao_social TEXT,
  cnpj TEXT,
  contato_principal TEXT,
  telefone TEXT,
  email TEXT,
  website TEXT,
  suporte_tecnico TEXT,
  garantia_meses INTEGER DEFAULT 12,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Equipment table
CREATE TABLE public.equipamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  modelo TEXT,
  numero_serie TEXT UNIQUE,
  tipo tipo_equipamento NOT NULL,
  fabricante_id UUID REFERENCES public.fabricantes_equipamento(id),
  clinica_id UUID REFERENCES public.clinicas(id),
  data_compra DATE,
  valor_compra DECIMAL(12,2),
  valor_atual DECIMAL(12,2),
  voltagem TEXT,
  potencia TEXT,
  status status_equipamento NOT NULL DEFAULT 'ativo',
  horas_uso INTEGER NOT NULL DEFAULT 0,
  proxima_manutencao DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Equipment maintenance table
CREATE TABLE public.manutencoes_equipamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  tipo tipo_manutencao NOT NULL,
  data_agendada DATE NOT NULL,
  data_realizada DATE,
  descricao TEXT NOT NULL,
  custo DECIMAL(10,2),
  status status_manutencao NOT NULL DEFAULT 'agendada',
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id)
);

-- Suppliers table
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  razao_social TEXT,
  cnpj TEXT UNIQUE,
  endereco JSONB,
  telefone_principal TEXT,
  email_contato TEXT,
  website TEXT,
  especialidades TEXT[],
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Products table
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT,
  subcategoria TEXT,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  codigo_barras TEXT UNIQUE,
  preco_custo DECIMAL(10,2),
  preco_venda DECIMAL(10,2),
  estoque_minimo INTEGER DEFAULT 0,
  estoque_atual INTEGER DEFAULT 0,
  unidade_medida TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Stock movements table
CREATE TABLE public.movimentacao_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  clinica_id UUID REFERENCES public.clinicas(id),
  tipo_movimentacao tipo_movimentacao NOT NULL,
  quantidade INTEGER NOT NULL,
  valor_unitario DECIMAL(10,2),
  motivo TEXT,
  observacoes TEXT,
  data_movimentacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usuario_id UUID REFERENCES auth.users(id)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_clinicas_organizacao ON public.clinicas(organizacao_id);
CREATE INDEX idx_prontuarios_clinica ON public.prontuarios(clinica_id);
CREATE INDEX idx_sessoes_prontuario ON public.sessoes_atendimento(prontuario_id);
CREATE INDEX idx_imagens_prontuario ON public.imagens_medicas(prontuario_id);
CREATE INDEX idx_equipamentos_clinica ON public.equipamentos(clinica_id);
CREATE INDEX idx_produtos_fornecedor ON public.produtos(fornecedor_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizacoes_updated_at
  BEFORE UPDATE ON public.organizacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clinicas_updated_at
  BEFORE UPDATE ON public.clinicas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imagens_medicas ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert sample specialties
INSERT INTO public.especialidades_medicas (codigo, nome, descricao, conselho_regulamentador) VALUES
('medico_dermatologista', 'Médico Dermatologista', 'Especialista em dermatologia estética', 'CFM'),
('medico_cirurgiao_plastico', 'Médico Cirurgião Plástico', 'Especialista em cirurgia plástica', 'CFM'),
('enfermeiro_estetica', 'Enfermeiro Estético', 'Enfermeiro especializado em estética', 'COREN'),
('esteticista', 'Esteticista', 'Profissional de estética', 'Diversos');

-- Insert sample manufacturers
INSERT INTO public.fabricantes_equipamento (nome, contato_principal, telefone, email, garantia_meses) VALUES
('Alma Lasers', 'Suporte Alma', '(11) 3456-7890', 'suporte@alma.com', 24),
('InMode', 'Suporte InMode', '(11) 3456-7892', 'suporte@inmode.com', 18),
('Ibramed', 'Suporte Ibramed', '(11) 2345-6789', 'suporte@ibramed.com.br', 12);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database setup completed successfully!';
  RAISE NOTICE 'Tables created: %', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public');
  RAISE NOTICE 'ENUMs created: %', (SELECT COUNT(*) FROM pg_type WHERE typtype = 'e' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'));
END $$;