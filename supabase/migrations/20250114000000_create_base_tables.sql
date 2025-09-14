-- =====================================================
-- MIGRAÇÃO BASE - CRIAR TABELAS FUNDAMENTAIS
-- Sistema de Gestão de Clínicas Estéticas Premium
-- =====================================================

-- =====================================================
-- 1. CRIAR ENUMS BÁSICOS
-- =====================================================

-- User role types
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type') THEN
    CREATE TYPE public.user_role_type AS ENUM (
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

-- Status de agendamento
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agendamento_status') THEN
    CREATE TYPE public.agendamento_status AS ENUM (
      'rascunho',
      'pendente',
      'confirmado', 
      'em_andamento',
      'finalizado',
      'cancelado',
      'nao_compareceu',
      'reagendado'
    );
  END IF;
END $$;

-- Categorias de cliente
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cliente_categoria') THEN
    CREATE TYPE public.cliente_categoria AS ENUM (
      'regular',
      'vip',
      'premium',
      'corporativo'
    );
  END IF;
END $$;

-- =====================================================
-- 2. CRIAR TABELAS BASE
-- =====================================================

-- Organizações
CREATE TABLE IF NOT EXISTS public.organizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  endereco JSONB DEFAULT '{}'::jsonb,
  telefone_principal TEXT,
  email_contato TEXT,
  plano TEXT NOT NULL DEFAULT 'basico',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Clínicas
CREATE TABLE IF NOT EXISTS public.clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj TEXT,
  endereco JSONB DEFAULT '{}'::jsonb,
  telefone_principal TEXT,
  email_contato TEXT,
  horario_funcionamento JSONB DEFAULT '{}'::jsonb,
  configuracoes JSONB DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- User roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role_type NOT NULL,
  clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE,
  organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- =====================================================
-- 3. HABILITAR RLS
-- =====================================================

ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. POLÍTICAS RLS BÁSICAS
-- =====================================================

-- Políticas para organizações
CREATE POLICY "Users can view accessible organizations" ON public.organizacoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND (organizacao_id = public.organizacoes.id OR role IN ('super_admin'))
      AND ativo = true
    )
  );

-- Políticas para clínicas
CREATE POLICY "Users can view accessible clinics" ON public.clinicas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND (clinica_id = public.clinicas.id OR role IN ('super_admin', 'proprietaria'))
      AND ativo = true
    )
  );

-- Políticas para user roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create initial role" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
