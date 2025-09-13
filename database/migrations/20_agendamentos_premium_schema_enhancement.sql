-- =====================================================
-- ENHANCEMENT: Sistema de Agendamento Premium
-- Melhorias para integração com pagamentos e métricas
-- =====================================================

-- Enum adicional para status de pagamento
CREATE TYPE pagamento_status AS ENUM (
  'pendente',
  'processando',
  'aprovado',
  'recusado',
  'estornado',
  'cancelado',
  'expirado'
);

-- Enum para métodos de pagamento
CREATE TYPE metodo_pagamento AS ENUM (
  'dinheiro',
  'cartao_credito',
  'cartao_debito',
  'pix',
  'transferencia',
  'boleto',
  'credito_cliente',
  'cortesia'
);

-- Adicionar campos de pagamento à tabela agendamentos
ALTER TABLE public.agendamentos 
ADD COLUMN IF NOT EXISTS pagamento_status pagamento_status DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS metodo_pagamento metodo_pagamento,
ADD COLUMN IF NOT EXISTS transacao_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS comprovante_url TEXT,
ADD COLUMN IF NOT EXISTS pagamento_processado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS desconto_motivo TEXT,
ADD COLUMN IF NOT EXISTS promocao_aplicada VARCHAR(100),
ADD COLUMN IF NOT EXISTS creditos_utilizados DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cashback_gerado DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS comissao_profissional DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS margem_lucro DECIMAL(10,2);

-- Adicionar constraints para os novos campos
ALTER TABLE public.agendamentos 
ADD CONSTRAINT agendamento_creditos_validos CHECK (creditos_utilizados >= 0),
ADD CONSTRAINT agendamento_cashback_valido CHECK (cashback_gerado >= 0),
ADD CONSTRAINT agendamento_comissao_valida CHECK (comissao_profissional >= 0),
ADD CONSTRAINT agendamento_transacao_unica UNIQUE (transacao_id) DEFERRABLE;

-- Tabela para controle de créditos do cliente
CREATE TABLE IF NOT EXISTS public.cliente_creditos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  
  -- Saldo e movimentação
  saldo_atual DECIMAL(10,2) NOT NULL DEFAULT 0,
  credito_adicionado DECIMAL(10,2) DEFAULT 0,
  credito_utilizado DECIMAL(10,2) DEFAULT 0,
  
  -- Origem do crédito
  origem VARCHAR(50) NOT NULL, -- 'cashback', 'promocao', 'cortesia', 'estorno'
  agendamento_origem_id UUID REFERENCES public.agendamentos(id),
  descricao TEXT,
  
  -- Validade
  data_expiracao DATE,
  ativo BOOLEAN DEFAULT TRUE,
  
  -- Auditoria
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT credito_valores_validos CHECK (
    credito_adicionado >= 0 AND 
    credito_utilizado >= 0 AND 
    saldo_atual >= 0
  )
);

-- Tabela para histórico de transações financeiras
CREATE TABLE IF NOT EXISTS public.transacoes_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID NOT NULL REFERENCES public.agendamentos(id) ON DELETE RESTRICT,
  
  -- Dados da transação
  tipo VARCHAR(30) NOT NULL, -- 'pagamento', 'estorno', 'desconto', 'taxa'
  valor DECIMAL(10,2) NOT NULL,
  metodo metodo_pagamento NOT NULL,
  status pagamento_status NOT NULL DEFAULT 'pendente',
  
  -- Identificadores externos
  transacao_externa_id VARCHAR(100),
  gateway_pagamento VARCHAR(50),
  nsu VARCHAR(50),
  codigo_autorizacao VARCHAR(50),
  
  -- Dados do cartão (tokenizados)
  cartao_token VARCHAR(100),
  cartao_bandeira VARCHAR(30),
  cartao_final VARCHAR(4),
  
  -- Parcelamento
  parcelas INTEGER DEFAULT 1,
  valor_parcela DECIMAL(10,2),
  
  -- Taxas e tarifas
  taxa_gateway DECIMAL(10,2) DEFAULT 0,
  taxa_parcelamento DECIMAL(10,2) DEFAULT 0,
  valor_liquido DECIMAL(10,2),
  
  -- Dados adicionais
  comprovante_url TEXT,
  observacoes TEXT,
  dados_gateway JSONB DEFAULT '{}'::jsonb,
  
  -- Auditoria
  processado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT transacao_valor_positivo CHECK (valor > 0),
  CONSTRAINT transacao_parcelas_validas CHECK (parcelas >= 1 AND parcelas <= 12),
  CONSTRAINT transacao_valor_parcela_valido CHECK (
    (parcelas = 1 AND valor_parcela IS NULL) OR 
    (parcelas > 1 AND valor_parcela > 0)
  )
);

-- Tabela para promoções e descontos
CREATE TABLE IF NOT EXISTS public.promocoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  
  -- Dados da promoção
  codigo VARCHAR(50) NOT NULL,
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  
  -- Tipo de desconto
  tipo_desconto VARCHAR(20) NOT NULL, -- 'percentual', 'valor_fixo', 'cashback'
  valor_desconto DECIMAL(10,2) NOT NULL,
  desconto_maximo DECIMAL(10,2),
  
  -- Condições de aplicação
  valor_minimo_compra DECIMAL(10,2) DEFAULT 0,
  servicos_aplicaveis UUID[] DEFAULT ARRAY[]::UUID[],
  clientes_aplicaveis UUID[] DEFAULT ARRAY[]::UUID[],
  primeira_compra_apenas BOOLEAN DEFAULT FALSE,
  
  -- Limites de uso
  limite_uso_total INTEGER,
  limite_uso_por_cliente INTEGER DEFAULT 1,
  usos_realizados INTEGER DEFAULT 0,
  
  -- Vigência
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  
  -- Auditoria
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT promocao_codigo_unico UNIQUE (clinica_id, codigo),
  CONSTRAINT promocao_periodo_valido CHECK (data_fim >= data_inicio),
  CONSTRAINT promocao_desconto_valido CHECK (
    (tipo_desconto = 'percentual' AND valor_desconto > 0 AND valor_desconto <= 100) OR
    (tipo_desconto IN ('valor_fixo', 'cashback') AND valor_desconto > 0)
  )
);

-- =====================================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE
-- =====================================================

-- Índices para pagamentos
CREATE INDEX IF NOT EXISTS idx_agendamentos_pagamento_status ON public.agendamentos(pagamento_status) WHERE pagamento_status != 'aprovado';
CREATE INDEX IF NOT EXISTS idx_agendamentos_transacao ON public.agendamentos(transacao_id) WHERE transacao_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agendamentos_metodo_pagamento ON public.agendamentos(metodo_pagamento, pagamento_processado_em);

-- Índices para créditos
CREATE INDEX IF NOT EXISTS idx_cliente_creditos_saldo ON public.cliente_creditos(cliente_id, saldo_atual) WHERE ativo = TRUE AND saldo_atual > 0;
CREATE INDEX IF NOT EXISTS idx_cliente_creditos_expiracao ON public.cliente_creditos(data_expiracao) WHERE ativo = TRUE AND data_expiracao IS NOT NULL;

-- Índices para transações
CREATE INDEX IF NOT EXISTS idx_transacoes_agendamento ON public.transacoes_financeiras(agendamento_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_transacoes_status ON public.transacoes_financeiras(status, processado_em);
CREATE INDEX IF NOT EXISTS idx_transacoes_gateway ON public.transacoes_financeiras(gateway_pagamento, transacao_externa_id);

-- Índices para promoções
CREATE INDEX IF NOT EXISTS idx_promocoes_codigo ON public.promocoes(clinica_id, codigo) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_promocoes_vigencia ON public.promocoes(data_inicio, data_fim) WHERE ativo = TRUE;

-- =====================================================
-- FUNCTIONS PARA CÁLCULOS FINANCEIROS
-- =====================================================

-- Função para calcular valor final com descontos
CREATE OR REPLACE FUNCTION calcular_valor_final_agendamento(
  p_valor_servico DECIMAL(10,2),
  p_desconto_percentual DECIMAL(5,2) DEFAULT 0,
  p_desconto_fixo DECIMAL(10,2) DEFAULT 0,
  p_creditos_utilizados DECIMAL(10,2) DEFAULT 0
) RETURNS DECIMAL(10,2) AS $
DECLARE
  valor_com_desconto DECIMAL(10,2);
  valor_final DECIMAL(10,2);
BEGIN
  -- Aplicar desconto percentual
  valor_com_desconto := p_valor_servico * (1 - COALESCE(p_desconto_percentual, 0) / 100);
  
  -- Aplicar desconto fixo
  valor_com_desconto := valor_com_desconto - COALESCE(p_desconto_fixo, 0);
  
  -- Aplicar créditos
  valor_final := valor_com_desconto - COALESCE(p_creditos_utilizados, 0);
  
  -- Garantir que o valor não seja negativo
  RETURN GREATEST(valor_final, 0);
END;
$ LANGUAGE plpgsql IMMUTABLE;

-- Função para calcular comissão do profissional
CREATE OR REPLACE FUNCTION calcular_comissao_profissional(
  p_profissional_id UUID,
  p_servico_id UUID,
  p_valor_final DECIMAL(10,2)
) RETURNS DECIMAL(10,2) AS $
DECLARE
  percentual_comissao DECIMAL(5,2) := 30; -- Default 30%
  comissao DECIMAL(10,2);
BEGIN
  -- Buscar percentual específico do profissional/serviço
  -- (Esta lógica pode ser expandida conforme necessário)
  
  comissao := p_valor_final * (percentual_comissao / 100);
  
  RETURN comissao;
END;
$ LANGUAGE plpgsql STABLE;

-- Função para calcular margem de lucro
CREATE OR REPLACE FUNCTION calcular_margem_lucro(
  p_valor_final DECIMAL(10,2),
  p_comissao_profissional DECIMAL(10,2),
  p_custos_adicionais DECIMAL(10,2) DEFAULT 0
) RETURNS DECIMAL(10,2) AS $
BEGIN
  RETURN p_valor_final - COALESCE(p_comissao_profissional, 0) - COALESCE(p_custos_adicionais, 0);
END;
$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- TRIGGERS PARA CÁLCULOS AUTOMÁTICOS
-- =====================================================

-- Trigger para calcular valores automaticamente
CREATE OR REPLACE FUNCTION trigger_calcular_valores_agendamento()
RETURNS TRIGGER AS $
BEGIN
  -- Calcular valor final
  NEW.valor_final := calcular_valor_final_agendamento(
    NEW.valor_servico,
    NEW.desconto_percentual,
    NEW.desconto_aplicado,
    NEW.creditos_utilizados
  );
  
  -- Calcular comissão do profissional
  NEW.comissao_profissional := calcular_comissao_profissional(
    NEW.profissional_id,
    NEW.servico_id,
    NEW.valor_final
  );
  
  -- Calcular margem de lucro
  NEW.margem_lucro := calcular_margem_lucro(
    NEW.valor_final,
    NEW.comissao_profissional,
    0 -- custos adicionais podem ser implementados futuramente
  );
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Aplicar trigger
DROP TRIGGER IF EXISTS trigger_calcular_valores ON public.agendamentos;
CREATE TRIGGER trigger_calcular_valores
  BEFORE INSERT OR UPDATE OF valor_servico, desconto_percentual, desconto_aplicado, creditos_utilizados
  ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calcular_valores_agendamento();

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE public.cliente_creditos IS 'Controle de créditos e cashback dos clientes';
COMMENT ON TABLE public.transacoes_financeiras IS 'Histórico completo de transações financeiras por agendamento';
COMMENT ON TABLE public.promocoes IS 'Sistema de promoções e descontos configuráveis';

COMMENT ON COLUMN public.agendamentos.pagamento_status IS 'Status do pagamento do agendamento';
COMMENT ON COLUMN public.agendamentos.transacao_id IS 'ID da transação no gateway de pagamento';
COMMENT ON COLUMN public.agendamentos.creditos_utilizados IS 'Valor em créditos utilizados pelo cliente';
COMMENT ON COLUMN public.agendamentos.comissao_profissional IS 'Comissão calculada para o profissional';
COMMENT ON COLUMN public.agendamentos.margem_lucro IS 'Margem de lucro líquida do agendamento';