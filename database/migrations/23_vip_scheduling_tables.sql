-- =====================================================
-- TABELAS ESPECÍFICAS PARA SISTEMA VIP
-- Estruturas adicionais para gestão de clientes premium
-- =====================================================

-- =====================================================
-- TABELA DE HORÁRIOS EXCLUSIVOS VIP
-- =====================================================

CREATE TABLE public.horarios_exclusivos_vip (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  profissional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sala_id UUID REFERENCES public.salas_clinica(id) ON DELETE SET NULL,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  
  -- Dados temporais
  data_hora TIMESTAMPTZ NOT NULL,
  duracao_minutos INTEGER NOT NULL DEFAULT 60,
  
  -- Configurações VIP
  categoria_minima cliente_categoria NOT NULL DEFAULT 'vip',
  nivel_vip_minimo TEXT DEFAULT 'bronze', -- bronze, prata, ouro, platina, diamante
  preco_premium DECIMAL(10,2), -- Preço especial para horário premium
  
  -- Configurações
  ativo BOOLEAN DEFAULT TRUE,
  reservado BOOLEAN DEFAULT FALSE,
  reservado_para UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  reservado_em TIMESTAMPTZ,
  
  -- Descrição
  titulo VARCHAR(200) DEFAULT 'Horário Premium VIP',
  descricao TEXT,
  beneficios TEXT[], -- Array de benefícios inclusos
  
  -- Auditoria
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT horario_vip_duracao_positiva CHECK (duracao_minutos > 0),
  CONSTRAINT horario_vip_preco_valido CHECK (preco_premium IS NULL OR preco_premium >= 0)
);

-- =====================================================
-- TABELA DE NOTIFICAÇÕES PARA GERÊNCIA
-- =====================================================

CREATE TABLE public.notificacoes_gerencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dados da notificação
  tipo VARCHAR(50) NOT NULL, -- 'vip_booking', 'conflict_resolution', 'revenue_alert', etc.
  titulo VARCHAR(200) NOT NULL,
  mensagem TEXT NOT NULL,
  prioridade prioridade_nivel DEFAULT 'normal',
  
  -- Dados do cliente VIP
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome VARCHAR(200),
  categoria cliente_categoria,
  nivel_vip TEXT,
  
  -- Dados do agendamento
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  data_agendamento TIMESTAMPTZ,
  servico VARCHAR(200),
  profissional VARCHAR(200),
  valor_estimado DECIMAL(10,2),
  
  -- Status
  lida BOOLEAN DEFAULT FALSE,
  lida_em TIMESTAMPTZ,
  lida_por UUID REFERENCES auth.users(id),
  acao_tomada TEXT,
  
  -- Metadados
  metadata JSONB DEFAULT '{}'::jsonb,
  observacoes TEXT,
  
  -- Auditoria
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT notificacao_gerencia_valor_valido CHECK (valor_estimado IS NULL OR valor_estimado >= 0)
);

-- =====================================================
-- TABELA DE CONFIGURAÇÕES VIP POR CLÍNICA
-- =====================================================

CREATE TABLE public.configuracoes_vip (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamento
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  
  -- Configurações de priorização
  permite_desalocar_regular BOOLEAN DEFAULT TRUE,
  tempo_antecedencia_minima_horas INTEGER DEFAULT 2,
  notificar_gerencia_vip BOOLEAN DEFAULT TRUE,
  notificar_gerencia_premium BOOLEAN DEFAULT TRUE,
  
  -- Configurações de benefícios
  desconto_reagendamento_regular DECIMAL(5,2) DEFAULT 15.00, -- Percentual
  upgrade_sala_automatico BOOLEAN DEFAULT TRUE,
  profissional_senior_automatico BOOLEAN DEFAULT FALSE,
  
  -- Configurações de lista de espera
  processar_lista_espera_automatica BOOLEAN DEFAULT TRUE,
  intervalo_processamento_minutos INTEGER DEFAULT 30,
  tempo_resposta_limite_horas INTEGER DEFAULT 2,
  
  -- Configurações de comunicação
  template_notificacao_vip TEXT DEFAULT 'Prezado(a) {cliente_nome}, seu agendamento VIP foi confirmado para {data_agendamento}. Aguardamos você!',
  template_realocacao_regular TEXT DEFAULT 'Olá {cliente_nome}, precisamos reagendar seu horário para {nova_data}. Como compensação, você terá {desconto}% de desconto no próximo agendamento.',
  
  -- Configurações de preços
  multiplicador_preco_vip DECIMAL(3,2) DEFAULT 1.00, -- 1.0 = sem alteração, 1.2 = 20% mais caro
  multiplicador_preco_premium DECIMAL(3,2) DEFAULT 1.00,
  
  -- Auditoria
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_por UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT config_vip_unica_por_clinica UNIQUE(clinica_id),
  CONSTRAINT config_vip_antecedencia_valida CHECK (tempo_antecedencia_minima_horas >= 0),
  CONSTRAINT config_vip_desconto_valido CHECK (desconto_reagendamento_regular >= 0 AND desconto_reagendamento_regular <= 100),
  CONSTRAINT config_vip_multiplicadores_validos CHECK (multiplicador_preco_vip >= 0.5 AND multiplicador_preco_premium >= 0.5)
);

-- =====================================================
-- TABELA DE HISTÓRICO DE AÇÕES VIP
-- =====================================================

CREATE TABLE public.historico_acoes_vip (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dados da ação
  acao VARCHAR(100) NOT NULL, -- 'realocacao', 'upgrade_sala', 'desconto_aplicado', etc.
  descricao TEXT NOT NULL,
  
  -- Relacionamentos
  cliente_vip_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  cliente_afetado_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  profissional_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Dados da ação
  valor_anterior TEXT,
  valor_novo TEXT,
  beneficio_aplicado TEXT,
  compensacao_oferecida TEXT,
  
  -- Impacto financeiro
  impacto_receita DECIMAL(10,2) DEFAULT 0, -- Positivo = ganho, Negativo = perda
  custo_operacional DECIMAL(10,2) DEFAULT 0,
  
  -- Status
  aprovado BOOLEAN DEFAULT TRUE,
  aprovado_por UUID REFERENCES auth.users(id),
  motivo_reprovacao TEXT,
  
  -- Metadados
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Auditoria
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por UUID NOT NULL REFERENCES auth.users(id)
);

-- =====================================================
-- TABELA DE MÉTRICAS VIP
-- =====================================================

CREATE TABLE public.metricas_vip (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Período
  data_referencia DATE NOT NULL,
  periodo_tipo VARCHAR(20) NOT NULL, -- 'dia', 'semana', 'mes'
  
  -- Relacionamento
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  
  -- Métricas de agendamentos VIP
  total_agendamentos_vip INTEGER DEFAULT 0,
  total_agendamentos_premium INTEGER DEFAULT 0,
  total_realocacoes INTEGER DEFAULT 0,
  total_upgrades_sala INTEGER DEFAULT 0,
  
  -- Métricas financeiras
  receita_vip DECIMAL(12,2) DEFAULT 0,
  receita_premium DECIMAL(12,2) DEFAULT 0,
  custo_beneficios DECIMAL(10,2) DEFAULT 0,
  economia_realocacoes DECIMAL(10,2) DEFAULT 0,
  
  -- Métricas de satisfação
  nps_vip INTEGER, -- Net Promoter Score VIP
  satisfacao_media_vip DECIMAL(3,2),
  reclamacoes_vip INTEGER DEFAULT 0,
  elogios_vip INTEGER DEFAULT 0,
  
  -- Métricas operacionais
  tempo_medio_atendimento_vip INTERVAL,
  taxa_comparecimento_vip DECIMAL(5,2),
  taxa_reagendamento_vip DECIMAL(5,2),
  
  -- Métricas de lista de espera
  conversao_lista_espera_vip DECIMAL(5,2),
  tempo_medio_espera_vip INTERVAL,
  
  -- Metadados
  calculado_em TIMESTAMPTZ DEFAULT NOW(),
  dados_brutos JSONB DEFAULT '{}'::jsonb,
  
  -- Constraints
  UNIQUE(data_referencia, periodo_tipo, clinica_id)
);

-- =====================================================
-- TABELA DE PREFERÊNCIAS VIP DETALHADAS
-- =====================================================

CREATE TABLE public.preferencias_vip_detalhadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamento
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  
  -- Preferências de agendamento
  profissionais_preferidos UUID[] DEFAULT ARRAY[]::UUID[],
  profissionais_evitados UUID[] DEFAULT ARRAY[]::UUID[],
  salas_preferidas UUID[] DEFAULT ARRAY[]::UUID[],
  horarios_preferidos JSONB DEFAULT '[]'::jsonb, -- [{dia_semana: 1, hora_inicio: "09:00", hora_fim: "12:00", prioridade: 10}]
  
  -- Preferências de serviço
  servicos_interesse UUID[] DEFAULT ARRAY[]::UUID[],
  servicos_evitados UUID[] DEFAULT ARRAY[]::UUID[],
  intervalos_minimos JSONB DEFAULT '{}'::jsonb, -- {servico_id: dias_minimos}
  
  -- Preferências de ambiente
  temperatura_preferida INTEGER, -- Celsius
  musica_preferida VARCHAR(100),
  aroma_preferido VARCHAR(100),
  bebida_preferida VARCHAR(100),
  iluminacao_preferida VARCHAR(50), -- 'baixa', 'media', 'alta'
  
  -- Preferências de comunicação
  canal_preferido VARCHAR(20) DEFAULT 'whatsapp', -- 'whatsapp', 'sms', 'email', 'telefone'
  horario_contato_inicio TIME DEFAULT '09:00',
  horario_contato_fim TIME DEFAULT '18:00',
  dias_contato INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- 1=Segunda, 7=Domingo
  
  -- Configurações especiais
  necessidades_especiais TEXT[],
  restricoes_alimentares TEXT[],
  mobilidade_reduzida BOOLEAN DEFAULT FALSE,
  acompanhante_permitido BOOLEAN DEFAULT TRUE,
  
  -- Observações
  observacoes_especiais TEXT,
  instrucoes_equipe TEXT,
  
  -- Auditoria
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_por UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT preferencias_vip_cliente_unico UNIQUE(cliente_id),
  CONSTRAINT preferencias_vip_temperatura_valida CHECK (temperatura_preferida IS NULL OR (temperatura_preferida >= 16 AND temperatura_preferida <= 28)),
  CONSTRAINT preferencias_vip_horario_contato_valido CHECK (horario_contato_fim > horario_contato_inicio)
);

-- =====================================================
-- ÍNDICES OTIMIZADOS
-- =====================================================

-- Índices para horários exclusivos VIP
CREATE INDEX idx_horarios_vip_data_categoria ON public.horarios_exclusivos_vip(data_hora, categoria_minima) WHERE ativo = TRUE;
CREATE INDEX idx_horarios_vip_profissional ON public.horarios_exclusivos_vip(profissional_id, data_hora) WHERE ativo = TRUE;
CREATE INDEX idx_horarios_vip_reservado ON public.horarios_exclusivos_vip(reservado, reservado_para) WHERE ativo = TRUE;

-- Índices para notificações gerência
CREATE INDEX idx_notificacoes_gerencia_nao_lidas ON public.notificacoes_gerencia(criado_em DESC) WHERE lida = FALSE;
CREATE INDEX idx_notificacoes_gerencia_tipo ON public.notificacoes_gerencia(tipo, prioridade, criado_em DESC);
CREATE INDEX idx_notificacoes_gerencia_cliente ON public.notificacoes_gerencia(cliente_id, criado_em DESC);

-- Índices para configurações VIP
CREATE INDEX idx_configuracoes_vip_clinica ON public.configuracoes_vip(clinica_id);

-- Índices para histórico ações VIP
CREATE INDEX idx_historico_vip_cliente ON public.historico_acoes_vip(cliente_vip_id, criado_em DESC);
CREATE INDEX idx_historico_vip_acao ON public.historico_acoes_vip(acao, criado_em DESC);
CREATE INDEX idx_historico_vip_agendamento ON public.historico_acoes_vip(agendamento_id) WHERE agendamento_id IS NOT NULL;

-- Índices para métricas VIP
CREATE INDEX idx_metricas_vip_periodo ON public.metricas_vip(data_referencia, periodo_tipo);
CREATE INDEX idx_metricas_vip_clinica ON public.metricas_vip(clinica_id, data_referencia DESC);

-- Índices para preferências VIP
CREATE INDEX idx_preferencias_vip_profissionais ON public.preferencias_vip_detalhadas USING GIN(profissionais_preferidos);
CREATE INDEX idx_preferencias_vip_servicos ON public.preferencias_vip_detalhadas USING GIN(servicos_interesse);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para atualizar timestamp nas configurações VIP
CREATE TRIGGER trigger_configuracoes_vip_updated_at
  BEFORE UPDATE ON public.configuracoes_vip
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar timestamp nas preferências VIP
CREATE TRIGGER trigger_preferencias_vip_updated_at
  BEFORE UPDATE ON public.preferencias_vip_detalhadas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar timestamp nos horários VIP
CREATE TRIGGER trigger_horarios_vip_updated_at
  BEFORE UPDATE ON public.horarios_exclusivos_vip
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- INSERIR CONFIGURAÇÕES PADRÃO
-- =====================================================

-- Inserir configurações VIP padrão para clínicas existentes
INSERT INTO public.configuracoes_vip (
  clinica_id,
  criado_por
)
SELECT 
  c.id,
  (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1)
FROM public.clinicas c
WHERE NOT EXISTS (
  SELECT 1 FROM public.configuracoes_vip cv WHERE cv.clinica_id = c.id
);

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE public.horarios_exclusivos_vip IS 'Horários exclusivos reservados para clientes VIP e Premium';
COMMENT ON TABLE public.notificacoes_gerencia IS 'Notificações especiais para gerência sobre atividades VIP';
COMMENT ON TABLE public.configuracoes_vip IS 'Configurações personalizáveis do sistema VIP por clínica';
COMMENT ON TABLE public.historico_acoes_vip IS 'Histórico de todas as ações especiais realizadas para clientes VIP';
COMMENT ON TABLE public.metricas_vip IS 'Métricas específicas de performance do programa VIP';
COMMENT ON TABLE public.preferencias_vip_detalhadas IS 'Preferências detalhadas e personalizadas de clientes VIP';

COMMENT ON COLUMN public.horarios_exclusivos_vip.categoria_minima IS 'Categoria mínima de cliente para acessar este horário';
COMMENT ON COLUMN public.horarios_exclusivos_vip.preco_premium IS 'Preço especial para horários premium (NULL = preço normal)';
COMMENT ON COLUMN public.configuracoes_vip.multiplicador_preco_vip IS 'Multiplicador de preço para clientes VIP (1.0 = sem alteração)';
COMMENT ON COLUMN public.historico_acoes_vip.impacto_receita IS 'Impacto financeiro da ação (positivo = ganho, negativo = perda)';
COMMENT ON COLUMN public.preferencias_vip_detalhadas.horarios_preferidos IS 'Array JSON com horários preferidos detalhados';