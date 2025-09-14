-- =====================================================
-- MIGRAÇÃO SIMPLES - APENAS TABELAS ESSENCIAIS
-- =====================================================

-- Enums básicos
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agendamento_status') THEN
    CREATE TYPE public.agendamento_status AS ENUM (
      'rascunho', 'pendente', 'confirmado', 'em_andamento',
      'finalizado', 'cancelado', 'nao_compareceu', 'reagendado'
    );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cliente_categoria') THEN
    CREATE TYPE public.cliente_categoria AS ENUM (
      'regular', 'vip', 'premium', 'corporativo'
    );
  END IF;
END $$;

-- Tabela de clientes (sem foreign key por enquanto)
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

-- Tabela de serviços (sem foreign key por enquanto)
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

-- Tabela de agendamentos (sem foreign keys por enquanto)
CREATE TABLE IF NOT EXISTS public.agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID,
  profissional_id UUID REFERENCES auth.users(id),
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

-- Índices básicos
CREATE INDEX IF NOT EXISTS idx_agendamentos_clinica_data ON public.agendamentos(clinica_id, data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_profissional_data ON public.agendamentos(profissional_id, data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON public.agendamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON public.agendamentos(status);

-- RLS básico
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (permissivas para teste)
CREATE POLICY "Allow all for clientes" ON public.clientes FOR ALL USING (true);
CREATE POLICY "Allow all for servicos" ON public.servicos FOR ALL USING (true);
CREATE POLICY "Allow all for agendamentos" ON public.agendamentos FOR ALL USING (true);
