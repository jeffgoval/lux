-- =====================================================
-- MIGRAÇÃO PARA CRIAR TABELAS FALTANTES
-- Sistema de Gestão de Clínicas Estéticas Premium
-- =====================================================

-- =====================================================
-- 1. CRIAR ENUMS FALTANTES
-- =====================================================

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

-- Tipos de bloqueio
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bloqueio_tipo') THEN
    CREATE TYPE public.bloqueio_tipo AS ENUM (
      'almoco',
      'reuniao',
      'procedimento_especial',
      'manutencao',
      'ferias',
      'licenca',
      'emergencia',
      'personalizado'
    );
  END IF;
END $$;

-- Status da lista de espera
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lista_espera_status') THEN
    CREATE TYPE public.lista_espera_status AS ENUM (
      'ativo',
      'notificado',
      'agendado',
      'cancelado',
      'expirado'
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

-- Níveis de prioridade
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prioridade_nivel') THEN
    CREATE TYPE public.prioridade_nivel AS ENUM (
      'baixa',
      'normal',
      'alta',
      'urgente',
      'vip'
    );
  END IF;
END $$;

-- =====================================================
-- 2. CRIAR TABELAS FALTANTES
-- =====================================================

-- Organizações (se não existir)
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

-- Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID,
  nome_completo TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  data_nascimento DATE,
  cpf TEXT,
  endereco JSONB DEFAULT '{}'::jsonb,
  categoria cliente_categoria NOT NULL DEFAULT 'regular',
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Serviços
CREATE TABLE IF NOT EXISTS public.servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID,
  nome TEXT NOT NULL,
  nome_tecnico TEXT,
  codigo_interno TEXT,
  categoria TEXT NOT NULL,
  subcategoria TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  descricao_comercial TEXT,
  descricao_tecnica TEXT,
  duracao_padrao INTEGER NOT NULL DEFAULT 60,
  preco_base DECIMAL(10,2) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Agendamentos
CREATE TABLE IF NOT EXISTS public.agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID,
  profissional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  servico_id UUID,
  clinica_id UUID,
  data_agendamento TIMESTAMPTZ NOT NULL,
  duracao_minutos INTEGER NOT NULL DEFAULT 60,
  status agendamento_status NOT NULL DEFAULT 'pendente',
  valor_servico DECIMAL(10,2) NOT NULL,
  valor_final DECIMAL(10,2) NOT NULL,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Bloqueios de agenda
CREATE TABLE IF NOT EXISTS public.bloqueios_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  profissional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo bloqueio_tipo NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Lista de espera
CREATE TABLE IF NOT EXISTS public.lista_espera (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  profissional_preferido_id UUID REFERENCES auth.users(id),
  data_preferencia_inicio DATE,
  data_preferencia_fim DATE,
  duracao_minutos INTEGER NOT NULL,
  categoria_cliente cliente_categoria NOT NULL DEFAULT 'regular',
  prioridade INTEGER DEFAULT 0,
  status lista_espera_status NOT NULL DEFAULT 'ativo',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Disponibilidade profissional
CREATE TABLE IF NOT EXISTS public.disponibilidade_profissional (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para agendamentos
CREATE INDEX IF NOT EXISTS idx_agendamentos_clinica_data ON public.agendamentos(clinica_id, data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_profissional_data ON public.agendamentos(profissional_id, data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON public.agendamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON public.agendamentos(status);

-- Índices para lista de espera
CREATE INDEX IF NOT EXISTS idx_lista_espera_clinica_status ON public.lista_espera(clinica_id, status);
CREATE INDEX IF NOT EXISTS idx_lista_espera_servico ON public.lista_espera(servico_id);
CREATE INDEX IF NOT EXISTS idx_lista_espera_prioridade ON public.lista_espera(prioridade DESC);

-- =====================================================
-- 4. HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloqueios_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista_espera ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disponibilidade_profissional ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. POLÍTICAS RLS BÁSICAS
-- =====================================================

-- Políticas para organizações
DROP POLICY IF EXISTS "Users can view accessible organizations" ON public.organizacoes;
CREATE POLICY "Users can view accessible organizations" ON public.organizacoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND (organizacao_id = public.organizacoes.id OR role IN ('super_admin'))
      AND ativo = true
    )
  );

-- Políticas para clientes
DROP POLICY IF EXISTS "Users can view clinic clients" ON public.clientes;
CREATE POLICY "Users can view clinic clients" ON public.clientes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.clientes.clinica_id
      AND ativo = true
    )
  );

CREATE POLICY "Users can manage clinic clients" ON public.clientes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.clientes.clinica_id
      AND role IN ('proprietaria', 'gerente', 'profissionais', 'recepcionistas')
      AND ativo = true
    )
  );

-- Políticas para serviços
CREATE POLICY "Users can view clinic services" ON public.servicos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.servicos.clinica_id
      AND ativo = true
    )
  );

CREATE POLICY "Users can manage clinic services" ON public.servicos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.servicos.clinica_id
      AND role IN ('proprietaria', 'gerente', 'profissionais')
      AND ativo = true
    )
  );

-- Políticas para agendamentos
CREATE POLICY "Users can view clinic appointments" ON public.agendamentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.agendamentos.clinica_id
      AND ativo = true
    )
  );

CREATE POLICY "Users can manage clinic appointments" ON public.agendamentos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.agendamentos.clinica_id
      AND role IN ('proprietaria', 'gerente', 'profissionais', 'recepcionistas')
      AND ativo = true
    )
  );

-- Políticas para bloqueios de agenda
CREATE POLICY "Users can view clinic agenda blocks" ON public.bloqueios_agenda
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.bloqueios_agenda.clinica_id
      AND ativo = true
    )
  );

CREATE POLICY "Users can manage clinic agenda blocks" ON public.bloqueios_agenda
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.bloqueios_agenda.clinica_id
      AND role IN ('proprietaria', 'gerente', 'profissionais')
      AND ativo = true
    )
  );

-- Políticas para lista de espera
CREATE POLICY "Users can view clinic waitlist" ON public.lista_espera
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.lista_espera.clinica_id
      AND ativo = true
    )
  );

CREATE POLICY "Users can manage clinic waitlist" ON public.lista_espera
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.lista_espera.clinica_id
      AND role IN ('proprietaria', 'gerente', 'profissionais', 'recepcionistas')
      AND ativo = true
    )
  );

-- Políticas para disponibilidade profissional
CREATE POLICY "Users can view professional availability" ON public.disponibilidade_profissional
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.disponibilidade_profissional.clinica_id
      AND ativo = true
    )
  );

CREATE POLICY "Users can manage professional availability" ON public.disponibilidade_profissional
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.disponibilidade_profissional.clinica_id
      AND role IN ('proprietaria', 'gerente', 'profissionais')
      AND ativo = true
    )
  );
