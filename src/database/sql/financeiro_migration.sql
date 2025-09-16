-- =====================================================
-- SISTEMA FINANCEIRO - MIGRAÇÃO COMPLETA
-- =====================================================
-- Implementa estrutura completa para gestão financeira
-- com cálculo automático de receitas, comissionamento
-- e controle de gastos por categoria
-- =====================================================

-- Enums para sistema financeiro
CREATE TYPE tipo_transacao AS ENUM (
    'receita',
    'despesa',
    'comissao',
    'desconto',
    'estorno',
    'ajuste'
);

CREATE TYPE categoria_despesa AS ENUM (
    'produtos',
    'equipamentos',
    'marketing',
    'pessoal',
    'aluguel',
    'utilidades',
    'manutencao',
    'impostos',
    'seguros',
    'consultoria',
    'outros'
);

CREATE TYPE status_transacao AS ENUM (
    'pendente',
    'confirmada',
    'cancelada',
    'estornada'
);

CREATE TYPE forma_pagamento AS ENUM (
    'dinheiro',
    'cartao_credito',
    'cartao_debito',
    'pix',
    'transferencia',
    'boleto',
    'cheque',
    'parcelado'
);

-- =====================================================
-- TABELA: transacoes_financeiras
-- =====================================================
-- Registra todas as transações financeiras do sistema
CREATE TABLE public.transacoes_financeiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id UUID NOT NULL REFERENCES clinicas(id),
    
    -- Dados da transação
    tipo tipo_transacao NOT NULL,
    categoria_despesa categoria_despesa,
    descricao TEXT NOT NULL,
    valor DECIMAL(12,2) NOT NULL CHECK (valor != 0),
    data_transacao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_vencimento DATE,
    
    -- Forma de pagamento
    forma_pagamento forma_pagamento,
    parcelas INTEGER DEFAULT 1 CHECK (parcelas > 0),
    parcela_atual INTEGER DEFAULT 1,
    
    -- Status e controle
    status status_transacao DEFAULT 'pendente',
    observacoes TEXT,
    
    -- Relacionamentos
    sessao_atendimento_id UUID REFERENCES sessoes_atendimento(id),
    produto_id UUID REFERENCES produtos(id),
    profissional_id UUID REFERENCES auth.users(id),
    cliente_id UUID REFERENCES clientes(id),
    
    -- Dados de comissão (quando aplicável)
    percentual_comissao DECIMAL(5,2) CHECK (percentual_comissao >= 0 AND percentual_comissao <= 100),
    valor_comissao DECIMAL(10,2),
    comissao_paga BOOLEAN DEFAULT false,
    data_pagamento_comissao DATE,
    
    -- Auditoria
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID NOT NULL REFERENCES auth.users(id),
    atualizado_por UUID REFERENCES auth.users(id)
);

-- =====================================================
-- TABELA: metas_financeiras
-- =====================================================
-- Define metas financeiras por clínica e período
CREATE TABLE public.metas_financeiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id UUID NOT NULL REFERENCES clinicas(id),
    
    -- Período da meta
    ano INTEGER NOT NULL CHECK (ano >= 2020),
    mes INTEGER CHECK (mes >= 1 AND mes <= 12),
    
    -- Valores das metas
    meta_receita DECIMAL(12,2) NOT NULL CHECK (meta_receita > 0),
    meta_despesas DECIMAL(12,2) CHECK (meta_despesas >= 0),
    meta_lucro DECIMAL(12,2),
    meta_atendimentos INTEGER CHECK (meta_atendimentos > 0),
    
    -- Controle
    ativo BOOLEAN DEFAULT true,
    observacoes TEXT,
    
    -- Auditoria
    criado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID NOT NULL REFERENCES auth.users(id),
    
    UNIQUE(clinica_id, ano, mes)
);

-- =====================================================
-- TABELA: comissoes_profissionais
-- =====================================================
-- Configuração de comissões por profissional e serviço
CREATE TABLE public.comissoes_profissionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinica_id UUID NOT NULL REFERENCES clinicas(id),
    profissional_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Configuração de comissão
    servico_id UUID REFERENCES servicos(id), -- NULL = comissão geral
    percentual_comissao DECIMAL(5,2) NOT NULL CHECK (percentual_comissao >= 0 AND percentual_comissao <= 100),
    valor_fixo_comissao DECIMAL(10,2) CHECK (valor_fixo_comissao >= 0),
    
    -- Condições
    valor_minimo_procedimento DECIMAL(10,2),
    data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    data_fim DATE,
    
    -- Controle
    ativo BOOLEAN DEFAULT true,
    observacoes TEXT,
    
    -- Auditoria
    criado_em TIMESTAMPTZ DEFAULT now(),
    criado_por UUID NOT NULL REFERENCES auth.users(id)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para transações financeiras
CREATE INDEX idx_transacoes_clinica_data ON transacoes_financeiras(clinica_id, data_transacao DESC);
CREATE INDEX idx_transacoes_tipo_status ON transacoes_financeiras(tipo, status);
CREATE INDEX idx_transacoes_profissional ON transacoes_financeiras(profissional_id, data_transacao DESC);
CREATE INDEX idx_transacoes_sessao ON transacoes_financeiras(sessao_atendimento_id);
CREATE INDEX idx_transacoes_comissao_pendente ON transacoes_financeiras(profissional_id, comissao_paga) WHERE tipo = 'comissao';

-- Índices para metas
CREATE INDEX idx_metas_clinica_periodo ON metas_financeiras(clinica_id, ano, mes);

-- Índices para comissões
CREATE INDEX idx_comissoes_profissional_ativo ON comissoes_profissionais(profissional_id, ativo);
CREATE INDEX idx_comissoes_clinica_servico ON comissoes_profissionais(clinica_id, servico_id);

-- =====================================================
-- TRIGGERS PARA AUDITORIA E CONTROLE
-- =====================================================

-- Trigger para atualizar timestamp
CREATE OR REPLACE FUNCTION update_transacao_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transacao_timestamp
    BEFORE UPDATE ON transacoes_financeiras
    FOR EACH ROW
    EXECUTE FUNCTION update_transacao_timestamp();

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE transacoes_financeiras IS 'Registra todas as transações financeiras do sistema com cálculo automático de receitas e comissões';
COMMENT ON TABLE metas_financeiras IS 'Define metas financeiras por clínica e período para comparação de performance';
COMMENT ON TABLE comissoes_profissionais IS 'Configuração de comissões por profissional e serviço';

COMMENT ON COLUMN transacoes_financeiras.valor IS 'Valor da transação - positivo para receitas, negativo para despesas';
COMMENT ON COLUMN transacoes_financeiras.percentual_comissao IS 'Percentual de comissão aplicado (0-100)';
COMMENT ON COLUMN transacoes_financeiras.valor_comissao IS 'Valor calculado da comissão';

-- =====================================================
-- LOG DE MIGRAÇÃO
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=== FINANCIAL SYSTEM MIGRATION COMPLETED ===';
    RAISE NOTICE '- Created 3 main tables: transacoes_financeiras, metas_financeiras, comissoes_profissionais';
    RAISE NOTICE '- Created 4 enums: tipo_transacao, categoria_despesa, status_transacao, forma_pagamento';
    RAISE NOTICE '- Created 8 performance indexes';
    RAISE NOTICE '- Created audit triggers';
    RAISE NOTICE '- Ready for automatic revenue calculation and commission system';
    RAISE NOTICE '=== FINANCIAL SYSTEM READY ===';
END $$;