-- =====================================================
-- SISTEMA DE AGENDAMENTO PREMIUM
-- Schema otimizado para clínicas estéticas de alto padrão
-- =====================================================

-- Enum types para agendamentos
CREATE TYPE agendamento_status AS ENUM (
  'rascunho',
  'pendente',
  'confirmado', 
  'em_andamento',
  'finalizado',
  'cancelado',
  'nao_compareceu',
  'reagendado'
);

CREATE TYPE bloqueio_tipo AS ENUM (
  'almoco',
  'reuniao',
  'procedimento_especial',
  'manutencao',
  'ferias',
  'licenca',
  'emergencia',
  'personalizado'
);

CREATE TYPE lista_espera_status AS ENUM (
  'ativo',
  'notificado',
  'agendado',
  'cancelado',
  'expirado'
);

CREATE TYPE cliente_categoria AS ENUM (
  'regular',
  'vip',
  'premium',
  'corporativo'
);

CREATE TYPE prioridade_nivel AS ENUM (
  'baixa',
  'normal',
  'alta',
  'urgente',
  'vip'
);

-- =====================================================
-- TABELA PRINCIPAL DE AGENDAMENTOS PREMIUM
-- =====================================================

CREATE TABLE public.agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos principais
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  profissional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE RESTRICT,
  sala_id UUID REFERENCES public.salas_clinica(id) ON DELETE SET NULL,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  
  -- Dados temporais
  data_agendamento TIMESTAMPTZ NOT NULL,
  duracao_minutos INTEGER NOT NULL DEFAULT 60,
  data_inicio_real TIMESTAMPTZ,
  data_fim_real TIMESTAMPTZ,
  
  -- Status e controle
  status agendamento_status NOT NULL DEFAULT 'pendente',
  prioridade prioridade_nivel NOT NULL DEFAULT 'normal',
  categoria_cliente cliente_categoria NOT NULL DEFAULT 'regular',
  
  -- Informações financeiras
  valor_servico DECIMAL(10,2) NOT NULL,
  valor_final DECIMAL(10,2) NOT NULL,
  desconto_aplicado DECIMAL(10,2) DEFAULT 0,
  desconto_percentual DECIMAL(5,2) DEFAULT 0,
  taxa_adicional DECIMAL(10,2) DEFAULT 0,
  valor_pago DECIMAL(10,2) DEFAULT 0,
  forma_pagamento TEXT,
  
  -- Dados operacionais
  observacoes TEXT,
  observacoes_internas TEXT,
  protocolo_medico JSONB DEFAULT '{}'::jsonb,
  equipamentos_reservados UUID[] DEFAULT ARRAY[]::UUID[],
  produtos_utilizados JSONB DEFAULT '[]'::jsonb,
  
  -- Confirmação e comunicação
  confirmado_em TIMESTAMPTZ,
  confirmado_por UUID REFERENCES auth.users(id),
  lembrete_enviado_24h BOOLEAN DEFAULT FALSE,
  lembrete_enviado_2h BOOLEAN DEFAULT FALSE,
  confirmacao_presenca BOOLEAN,
  
  -- Reagendamento
  agendamento_original_id UUID REFERENCES public.agendamentos(id),
  motivo_reagendamento TEXT,
  reagendado_por UUID REFERENCES auth.users(id),
  
  -- Avaliação e feedback
  avaliacao_cliente INTEGER CHECK (avaliacao_cliente >= 1 AND avaliacao_cliente <= 5),
  feedback_cliente TEXT,
  avaliacao_profissional INTEGER CHECK (avaliacao_profissional >= 1 AND avaliacao_profissional <= 5),
  observacoes_pos_atendimento TEXT,
  
  -- Metadados
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Auditoria
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_por UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT agendamento_duracao_positiva CHECK (duracao_minutos > 0),
  CONSTRAINT agendamento_valores_validos CHECK (valor_servico >= 0 AND valor_final >= 0),
  CONSTRAINT agendamento_desconto_valido CHECK (desconto_aplicado >= 0 AND desconto_percentual >= 0 AND desconto_percentual <= 100),
  CONSTRAINT agendamento_data_futura CHECK (data_agendamento > criado_em OR status IN ('finalizado', 'cancelado', 'nao_compareceu')),
  CONSTRAINT agendamento_tempos_reais_validos CHECK (
    (data_inicio_real IS NULL AND data_fim_real IS NULL) OR
    (data_inicio_real IS NOT NULL AND data_fim_real IS NOT NULL AND data_fim_real > data_inicio_real)
  )
);

-- =====================================================
-- TABELA DE BLOQUEIOS DE AGENDA
-- =====================================================

CREATE TABLE public.bloqueios_agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  profissional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sala_id UUID REFERENCES public.salas_clinica(id) ON DELETE CASCADE,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  
  -- Dados temporais
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ NOT NULL,
  
  -- Configuração
  tipo bloqueio_tipo NOT NULL DEFAULT 'personalizado',
  titulo VARCHAR(200) NOT NULL,
  descricao TEXT,
  cor_exibicao VARCHAR(7) DEFAULT '#FF6B6B', -- Hex color
  
  -- Recorrência
  recorrente BOOLEAN DEFAULT FALSE,
  padrao_recorrencia JSONB DEFAULT '{}'::jsonb, -- {type: 'weekly', days: [1,2,3], until: '2024-12-31'}
  
  -- Controle
  ativo BOOLEAN DEFAULT TRUE,
  permite_sobreposicao BOOLEAN DEFAULT FALSE,
  
  -- Auditoria
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT bloqueio_periodo_valido CHECK (data_fim > data_inicio),
  CONSTRAINT bloqueio_tem_recurso CHECK (profissional_id IS NOT NULL OR sala_id IS NOT NULL)
);

-- =====================================================
-- TABELA DE LISTA DE ESPERA INTELIGENTE
-- =====================================================

CREATE TABLE public.lista_espera (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE RESTRICT,
  profissional_preferido UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sala_preferida UUID REFERENCES public.salas_clinica(id) ON DELETE SET NULL,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  
  -- Preferências temporais
  data_preferida DATE,
  horario_inicio_preferido TIME,
  horario_fim_preferido TIME,
  dias_semana_aceitos INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7], -- 1=Segunda, 7=Domingo
  flexibilidade_dias INTEGER DEFAULT 7,
  
  -- Priorização
  prioridade prioridade_nivel NOT NULL DEFAULT 'normal',
  categoria_cliente cliente_categoria NOT NULL DEFAULT 'regular',
  pontuacao_prioridade INTEGER DEFAULT 0, -- Calculado automaticamente
  
  -- Status e controle
  status lista_espera_status NOT NULL DEFAULT 'ativo',
  tentativas_contato INTEGER DEFAULT 0,
  ultima_tentativa_contato TIMESTAMPTZ,
  tempo_resposta_limite INTERVAL DEFAULT '2 hours',
  
  -- Estimativas
  posicao_estimada INTEGER,
  tempo_espera_estimado INTERVAL,
  probabilidade_agendamento DECIMAL(5,2), -- 0-100%
  
  -- Notificações
  notificado_em TIMESTAMPTZ,
  notificacao_aceita_em TIMESTAMPTZ,
  notificacao_rejeitada_em TIMESTAMPTZ,
  agendamento_criado_id UUID REFERENCES public.agendamentos(id),
  
  -- Configurações de contato
  preferencia_contato TEXT[] DEFAULT ARRAY['whatsapp', 'sms', 'email'],
  aceita_horarios_alternativos BOOLEAN DEFAULT TRUE,
  aceita_profissional_alternativo BOOLEAN DEFAULT FALSE,
  
  -- Auditoria
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  expira_em TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Constraints
  CONSTRAINT lista_espera_horarios_validos CHECK (
    (horario_inicio_preferido IS NULL AND horario_fim_preferido IS NULL) OR
    (horario_inicio_preferido IS NOT NULL AND horario_fim_preferido IS NOT NULL AND horario_fim_preferido > horario_inicio_preferido)
  ),
  CONSTRAINT lista_espera_flexibilidade_valida CHECK (flexibilidade_dias >= 0 AND flexibilidade_dias <= 365),
  CONSTRAINT lista_espera_dias_semana_validos CHECK (
    array_length(dias_semana_aceitos, 1) > 0 AND
    NOT EXISTS (SELECT 1 FROM unnest(dias_semana_aceitos) AS dia WHERE dia < 1 OR dia > 7)
  )
);

-- =====================================================
-- TABELA DE HISTÓRICO DE AGENDAMENTOS
-- =====================================================

CREATE TABLE public.agendamentos_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  
  -- Dados da alteração
  acao VARCHAR(50) NOT NULL, -- 'criado', 'atualizado', 'cancelado', 'reagendado', etc.
  dados_anteriores JSONB,
  dados_novos JSONB,
  campo_alterado VARCHAR(100),
  valor_anterior TEXT,
  valor_novo TEXT,
  
  -- Contexto
  motivo TEXT,
  observacoes TEXT,
  
  -- Auditoria
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  ip_origem INET,
  user_agent TEXT
);

-- =====================================================
-- TABELA DE MÉTRICAS DE AGENDAMENTO
-- =====================================================

CREATE TABLE public.agendamentos_metricas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Período da métrica
  data_referencia DATE NOT NULL,
  periodo_tipo VARCHAR(20) NOT NULL, -- 'dia', 'semana', 'mes'
  
  -- Relacionamentos
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  profissional_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  servico_id UUID REFERENCES public.servicos(id) ON DELETE CASCADE,
  
  -- Métricas operacionais
  total_agendamentos INTEGER DEFAULT 0,
  agendamentos_confirmados INTEGER DEFAULT 0,
  agendamentos_cancelados INTEGER DEFAULT 0,
  agendamentos_nao_compareceu INTEGER DEFAULT 0,
  agendamentos_reagendados INTEGER DEFAULT 0,
  
  -- Métricas temporais
  tempo_medio_atendimento INTERVAL,
  taxa_ocupacao DECIMAL(5,2), -- Percentual
  horarios_disponiveis INTEGER DEFAULT 0,
  horarios_ocupados INTEGER DEFAULT 0,
  
  -- Métricas financeiras
  receita_total DECIMAL(12,2) DEFAULT 0,
  receita_media_agendamento DECIMAL(10,2) DEFAULT 0,
  desconto_total_concedido DECIMAL(10,2) DEFAULT 0,
  
  -- Métricas de qualidade
  avaliacao_media DECIMAL(3,2),
  total_avaliacoes INTEGER DEFAULT 0,
  nps_score INTEGER, -- Net Promoter Score
  
  -- Métricas de lista de espera
  clientes_lista_espera INTEGER DEFAULT 0,
  tempo_medio_espera INTERVAL,
  taxa_conversao_lista_espera DECIMAL(5,2),
  
  -- Metadados
  calculado_em TIMESTAMPTZ DEFAULT NOW(),
  dados_brutos JSONB DEFAULT '{}'::jsonb,
  
  -- Constraints
  UNIQUE(data_referencia, periodo_tipo, clinica_id, profissional_id, servico_id)
);

-- =====================================================
-- ÍNDICES OTIMIZADOS PARA PERFORMANCE
-- =====================================================

-- Índices principais para agendamentos
CREATE INDEX idx_agendamentos_data_status ON public.agendamentos(data_agendamento, status) WHERE status IN ('pendente', 'confirmado', 'em_andamento');
CREATE INDEX idx_agendamentos_profissional_data ON public.agendamentos(profissional_id, data_agendamento);
CREATE INDEX idx_agendamentos_cliente_data ON public.agendamentos(cliente_id, data_agendamento DESC);
CREATE INDEX idx_agendamentos_clinica_data ON public.agendamentos(clinica_id, data_agendamento);
CREATE INDEX idx_agendamentos_sala_periodo ON public.agendamentos(sala_id, data_agendamento) WHERE sala_id IS NOT NULL;
CREATE INDEX idx_agendamentos_status_ativo ON public.agendamentos(status) WHERE status IN ('pendente', 'confirmado', 'em_andamento');
CREATE INDEX idx_agendamentos_categoria_cliente ON public.agendamentos(categoria_cliente, prioridade);
CREATE INDEX idx_agendamentos_servico ON public.agendamentos(servico_id, status);
CREATE INDEX idx_agendamentos_confirmacao ON public.agendamentos(confirmado_em) WHERE confirmado_em IS NOT NULL;
CREATE INDEX idx_agendamentos_lembretes ON public.agendamentos(data_agendamento, lembrete_enviado_24h, lembrete_enviado_2h) WHERE status = 'confirmado';

-- Índices para bloqueios
CREATE INDEX idx_bloqueios_profissional_periodo ON public.bloqueios_agenda(profissional_id, data_inicio, data_fim) WHERE ativo = TRUE;
CREATE INDEX idx_bloqueios_sala_periodo ON public.bloqueios_agenda(sala_id, data_inicio, data_fim) WHERE ativo = TRUE AND sala_id IS NOT NULL;
CREATE INDEX idx_bloqueios_clinica_ativo ON public.bloqueios_agenda(clinica_id, ativo);
CREATE INDEX idx_bloqueios_recorrente ON public.bloqueios_agenda(recorrente, padrao_recorrencia) WHERE recorrente = TRUE;

-- Índices para lista de espera
CREATE INDEX idx_lista_espera_ativo ON public.lista_espera(status, prioridade, pontuacao_prioridade DESC) WHERE status = 'ativo';
CREATE INDEX idx_lista_espera_servico ON public.lista_espera(servico_id, status);
CREATE INDEX idx_lista_espera_profissional ON public.lista_espera(profissional_preferido, status) WHERE profissional_preferido IS NOT NULL;
CREATE INDEX idx_lista_espera_cliente ON public.lista_espera(cliente_id, status);
CREATE INDEX idx_lista_espera_notificacao ON public.lista_espera(notificado_em, status) WHERE status = 'notificado';
CREATE INDEX idx_lista_espera_expiracao ON public.lista_espera(expira_em) WHERE status = 'ativo';

-- Índices para histórico
CREATE INDEX idx_agendamentos_historico_agendamento ON public.agendamentos_historico(agendamento_id, criado_em DESC);
CREATE INDEX idx_agendamentos_historico_acao ON public.agendamentos_historico(acao, criado_em DESC);
CREATE INDEX idx_agendamentos_historico_usuario ON public.agendamentos_historico(criado_por, criado_em DESC);

-- Índices para métricas
CREATE INDEX idx_agendamentos_metricas_periodo ON public.agendamentos_metricas(data_referencia, periodo_tipo);
CREATE INDEX idx_agendamentos_metricas_clinica ON public.agendamentos_metricas(clinica_id, data_referencia DESC);
CREATE INDEX idx_agendamentos_metricas_profissional ON public.agendamentos_metricas(profissional_id, data_referencia DESC) WHERE profissional_id IS NOT NULL;

-- =====================================================
-- TRIGGERS PARA AUTOMAÇÃO
-- =====================================================

-- Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION update_agendamento_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  NEW.atualizado_por = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_agendamentos_updated_at
  BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_agendamento_timestamp();

CREATE TRIGGER trigger_bloqueios_updated_at
  BEFORE UPDATE ON public.bloqueios_agenda
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_lista_espera_updated_at
  BEFORE UPDATE ON public.lista_espera
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para histórico automático
CREATE OR REPLACE FUNCTION log_agendamento_historico()
RETURNS TRIGGER AS $$
DECLARE
  acao_realizada VARCHAR(50);
  dados_anteriores JSONB;
  dados_novos JSONB;
BEGIN
  -- Determinar ação
  IF TG_OP = 'INSERT' THEN
    acao_realizada := 'criado';
    dados_novos := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    acao_realizada := 'atualizado';
    dados_anteriores := to_jsonb(OLD);
    dados_novos := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    acao_realizada := 'excluido';
    dados_anteriores := to_jsonb(OLD);
  END IF;

  -- Inserir no histórico
  INSERT INTO public.agendamentos_historico (
    agendamento_id,
    acao,
    dados_anteriores,
    dados_novos,
    criado_por,
    ip_origem
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    acao_realizada,
    dados_anteriores,
    dados_novos,
    auth.uid(),
    inet_client_addr()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_agendamentos_historico
  AFTER INSERT OR UPDATE OR DELETE ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION log_agendamento_historico();

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE public.agendamentos IS 'Tabela principal de agendamentos premium com recursos avançados para clínicas estéticas';
COMMENT ON TABLE public.bloqueios_agenda IS 'Bloqueios de agenda para profissionais e salas com suporte a recorrência';
COMMENT ON TABLE public.lista_espera IS 'Sistema inteligente de lista de espera com priorização automática';
COMMENT ON TABLE public.agendamentos_historico IS 'Histórico completo de alterações em agendamentos para auditoria';
COMMENT ON TABLE public.agendamentos_metricas IS 'Métricas pré-calculadas para dashboards e relatórios de performance';

COMMENT ON COLUMN public.agendamentos.categoria_cliente IS 'Categoria do cliente para priorização e tratamento diferenciado';
COMMENT ON COLUMN public.agendamentos.protocolo_medico IS 'Dados específicos do protocolo médico em formato JSON';
COMMENT ON COLUMN public.agendamentos.equipamentos_reservados IS 'Array de IDs dos equipamentos reservados para o procedimento';
COMMENT ON COLUMN public.agendamentos.metadata IS 'Metadados flexíveis para extensibilidade futura';

COMMENT ON COLUMN public.lista_espera.pontuacao_prioridade IS 'Pontuação calculada automaticamente baseada em múltiplos critérios';
COMMENT ON COLUMN public.lista_espera.probabilidade_agendamento IS 'Probabilidade estimada de conseguir agendamento baseada em histórico';