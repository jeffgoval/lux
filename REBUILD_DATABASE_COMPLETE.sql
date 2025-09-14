-- 🏗️ RECONSTRUÇÃO COMPLETA DO BANCO DE DADOS
-- Execute este SQL no novo projeto Supabase após criá-lo
-- Data: 2025-01-13

-- =====================================================
-- 1. EXTENSÕES E TIPOS BÁSICOS
-- =====================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tipos personalizados
DO $$
BEGIN
    -- Tipo para planos
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plano_type') THEN
        CREATE TYPE plano_type AS ENUM ('basico', 'premium', 'enterprise');
    END IF;
    
    -- Tipo para roles de usuário
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type') THEN
        CREATE TYPE user_role_type AS ENUM ('super_admin', 'proprietaria', 'gerente', 'profissionais', 'recepcionistas', 'visitante', 'cliente');
    END IF;
    
    -- Tipo para especialidades médicas
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'especialidade_medica') THEN
        CREATE TYPE especialidade_medica AS ENUM (
            'dermatologia', 'cirurgia_plastica', 'medicina_estetica',
            'fisioterapia_estetica', 'nutricao', 'psicologia',
            'enfermagem_estetica', 'biomedicina_estetica'
        );
    END IF;
END $$;

-- =====================================================
-- 2. TABELA PROFILES (Básica para Auth)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nome_completo TEXT NOT NULL,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  primeiro_acesso BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. TABELA USER_ROLES (Permissões)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role_type NOT NULL DEFAULT 'proprietaria',
  clinica_id UUID, -- Será referenciada após criar tabela clinicas
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id)
);

-- =====================================================
-- 4. TABELA ORGANIZAÇÕES (Opcional, para multi-clínicas)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.organizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  plano plano_type NOT NULL DEFAULT 'basico',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 5. TABELA CLÍNICAS (Principal)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  cnpj TEXT,
  endereco JSONB DEFAULT '{}'::jsonb,
  telefone_principal TEXT,
  email_contato TEXT,
  horario_funcionamento JSONB DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 6. TABELA PROFISSIONAIS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  registro_profissional TEXT,
  especialidades TEXT[], -- Array de especialidades
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 7. TABELA CLÍNICA_PROFISSIONAIS (Relacionamento)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.clinica_profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cargo TEXT NOT NULL DEFAULT 'Profissional',
  especialidades TEXT[],
  pode_criar_prontuarios BOOLEAN DEFAULT false,
  pode_editar_prontuarios BOOLEAN DEFAULT false,
  pode_visualizar_financeiro BOOLEAN DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinica_id, user_id)
);

-- =====================================================
-- 8. TABELA ESPECIALIDADES_MÉDICAS (Referência)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.especialidades_medicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT UNIQUE NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 9. TABELA TEMPLATES_PROCEDIMENTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.templates_procedimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE,
  tipo_procedimento TEXT,
  nome_template TEXT NOT NULL,
  descricao TEXT,
  duracao_padrao_minutos INTEGER DEFAULT 60,
  valor_base DECIMAL(10,2),
  campos_obrigatorios JSONB DEFAULT '{}'::jsonb,
  campos_opcionais JSONB DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 10. ADICIONAR FOREIGN KEYS FALTANTES
-- =====================================================

-- Adicionar FK de user_roles para clinicas
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_clinica_fk 
FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE SET NULL;

-- =====================================================
-- 11. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_ativo ON public.profiles(ativo);

-- Índices para user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_clinica_id ON public.user_roles(clinica_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_ativo ON public.user_roles(ativo);

-- Índices para clinicas
CREATE INDEX IF NOT EXISTS idx_clinicas_ativo ON public.clinicas(ativo);
CREATE INDEX IF NOT EXISTS idx_clinicas_cnpj ON public.clinicas(cnpj);
CREATE INDEX IF NOT EXISTS idx_clinicas_organizacao_id ON public.clinicas(organizacao_id);

-- Índices para profissionais
CREATE INDEX IF NOT EXISTS idx_profissionais_user_id ON public.profissionais(user_id);
CREATE INDEX IF NOT EXISTS idx_profissionais_ativo ON public.profissionais(ativo);

-- Índices para clinica_profissionais
CREATE INDEX IF NOT EXISTS idx_clinica_profissionais_clinica ON public.clinica_profissionais(clinica_id);
CREATE INDEX IF NOT EXISTS idx_clinica_profissionais_user ON public.clinica_profissionais(user_id);

-- =====================================================
-- 12. HABILITAR RLS (Row Level Security)
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinica_profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.especialidades_medicas ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 13. POLÍTICAS RLS BÁSICAS (Permissivas para onboarding)
-- =====================================================

-- Profiles: usuário pode ver/editar próprio perfil
CREATE POLICY profiles_self ON public.profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- User_roles: usuário pode ver próprios roles
CREATE POLICY user_roles_self ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Clinicas: proprietária pode criar/ver própria clínica
CREATE POLICY clinicas_owner ON public.clinicas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
        AND ur.clinica_id = public.clinicas.id 
        AND ur.role = 'proprietaria'
        AND ur.ativo = true
    )
  ) WITH CHECK (auth.uid() = criado_por);

-- Profissionais: próprio usuário pode gerenciar
CREATE POLICY profissionais_self ON public.profissionais
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Clinica_profissionais: próprio usuário pode ver/editar
CREATE POLICY clinica_profissionais_self ON public.clinica_profissionais
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Templates_procedimentos: acesso por vínculo à clínica
CREATE POLICY templates_clinic_access ON public.templates_procedimentos
  FOR ALL USING (
    clinica_id IS NULL OR EXISTS (
      SELECT 1 FROM public.clinica_profissionais cp 
      WHERE cp.user_id = auth.uid() 
        AND cp.clinica_id = public.templates_procedimentos.clinica_id 
        AND cp.ativo = true
    )
  );

-- Especialidades: leitura pública
CREATE POLICY especialidades_read ON public.especialidades_medicas 
  FOR SELECT USING (ativo = true);

-- =====================================================
-- 14. TRIGGER PARA ATUALIZAR updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger nas tabelas que têm updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizacoes_updated_at BEFORE UPDATE ON public.organizacoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinicas_updated_at BEFORE UPDATE ON public.clinicas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profissionais_updated_at BEFORE UPDATE ON public.profissionais
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates_procedimentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 15. FUNÇÃO PARA HANDLE_NEW_USER (Trigger de cadastro)
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Criar perfil automaticamente
  INSERT INTO public.profiles (id, email, nome_completo)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome_completo', 'Usuário'));

  -- Criar role inicial de proprietária
  INSERT INTO public.user_roles (user_id, role, criado_por)
  VALUES (NEW.id, 'proprietaria', NEW.id);

  RETURN NEW;
END;
$$;

-- Trigger para executar a função em novos usuários
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 16. INSERIR DADOS BÁSICOS (Especialidades)
-- =====================================================

INSERT INTO public.especialidades_medicas (nome, descricao) VALUES
  ('Dermatologia', 'Especialidade médica focada em doenças e tratamentos da pele'),
  ('Cirurgia Plástica', 'Procedimentos cirúrgicos estéticos e reparadores'),
  ('Medicina Estética', 'Tratamentos não-invasivos para rejuvenescimento'),
  ('Fisioterapia Estética', 'Fisioterapia aplicada a tratamentos estéticos'),
  ('Nutrição', 'Orientação nutricional para saúde e estética'),
  ('Psicologia', 'Acompanhamento psicológico em tratamentos estéticos'),
  ('Enfermagem Estética', 'Procedimentos de enfermagem especializados'),
  ('Biomedicina Estética', 'Aplicação da biomedicina em procedimentos estéticos')
ON CONFLICT (nome) DO NOTHING;

-- =====================================================
-- SCRIPT CONCLUÍDO
-- =====================================================

SELECT 'Database rebuild completed successfully!' as status;
SELECT COUNT(*) as especialidades_inseridas FROM public.especialidades_medicas;
SELECT 'Ready for onboarding!' as next_step;