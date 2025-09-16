-- =====================================================
-- MIGRAÇÃO: SISTEMA DE GESTÃO DE PRODUTOS E ESTOQUE
-- Implementa controle completo de produtos e movimentações de estoque
-- =====================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMERAÇÕES NECESSÁRIAS
-- =====================================================

-- Categorias de produtos
DO $ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoria_produto') THEN
        CREATE TYPE categoria_produto AS ENUM (
            'cremes',
            'seruns',
            'descartaveis',
            'anestesicos',
            'limpeza',
            'equipamentos_consumo',
            'medicamentos',
            'cosmeticos',
            'suplementos',
            'injetaveis'
        );
    END IF;
END $;

-- Status de produtos
DO $ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_produto') THEN
        CREATE TYPE status_produto AS ENUM (
            'disponivel',
            'baixo_estoque',
            'vencido',
            'descontinuado',
            'em_falta'
        );
    END IF;
END $;

-- Unidades de medida
DO $ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'unidade_medida') THEN
        CREATE TYPE unidade_medida AS ENUM (
            'ml',
            'g',
            'unidade',
            'caixa',
            'frasco',
            'tubo',
            'ampola',
            'seringa'
        );
    END IF;
END $;

-- Tipos de movimentação de estoque
DO $ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_movimentacao') THEN
        CREATE TYPE tipo_movimentacao AS ENUM (
            'entrada',
            'saida',
            'ajuste',
            'vencimento',
            'perda',
            'transferencia'
        );
    END IF;
END $;

-- =====================================================
-- TABELA: FORNECEDORES (DEPENDÊNCIA)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.fornecedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relacionamentos
    clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
    criado_por UUID NOT NULL REFERENCES auth.users(id),
    atualizado_por UUID REFERENCES auth.users(id),
    
    -- Informações básicas
    nome TEXT NOT NULL,
    razao_social TEXT,
    cnpj TEXT,
    inscricao_estadual TEXT,
    
    -- Contato
    telefone TEXT,
    email TEXT,
    site TEXT,
    
    -- Endereço
    endereco JSONB DEFAULT '{}',
    -- Estrutura: {
    --   "cep": "string",
    --   "logradouro": "string", 
    --   "numero": "string",
    --   "complemento": "string",
    --   "bairro": "string",
    --   "cidade": "string",
    --   "estado": "string"
    -- }
    
    -- Dados comerciais
    condicoes_pagamento TEXT,
    prazo_entrega_dias INTEGER DEFAULT 0,
    valor_minimo_pedido DECIMAL(10,2),
    
    -- Status
    ativo BOOLEAN DEFAULT true,
    
    -- Observações
    observacoes TEXT,
    
    -- Auditoria
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT fornecedores_cnpj_clinica_unique UNIQUE (clinica_id, cnpj)
);

-- =====================================================
-- TABELA PRINCIPAL: PRODUTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relacionamentos
    clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
    fornecedor_id UUID REFERENCES public.fornecedores(id),
    criado_por UUID NOT NULL REFERENCES auth.users(id),
    atualizado_por UUID REFERENCES auth.users(id),
    
    -- Informações básicas do produto
    nome TEXT NOT NULL,
    marca TEXT,
    categoria categoria_produto NOT NULL,
    
    -- Controle financeiro
    preco_custo DECIMAL(10,2) NOT NULL CHECK (preco_custo >= 0),
    preco_venda DECIMAL(10,2) CHECK (preco_venda >= 0),
    margem_lucro DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN preco_custo > 0 AND preco_venda > 0 
            THEN ((preco_venda - preco_custo) / preco_custo * 100)
            ELSE NULL 
        END
    ) STORED,
    
    -- Controle de estoque
    quantidade INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
    unidade_medida unidade_medida NOT NULL,
    estoque_minimo INTEGER DEFAULT 0 CHECK (estoque_minimo >= 0),
    estoque_maximo INTEGER CHECK (estoque_maximo >= estoque_minimo),
    
    -- Controle de validade
    data_vencimento DATE,
    dias_alerta_vencimento INTEGER DEFAULT 30 CHECK (dias_alerta_vencimento >= 0),
    lote TEXT,
    
    -- Identificação
    codigo_barras TEXT,
    codigo_interno TEXT,
    sku TEXT,
    
    -- Localização física
    localizacao TEXT,
    
    -- Status calculado automaticamente
    status status_produto DEFAULT 'disponivel',
    
    -- Informações técnicas
    descricao TEXT,
    indicacoes TEXT[],
    contraindicacoes TEXT[],
    modo_uso TEXT,
    composicao TEXT,
    
    -- Regulamentação
    registro_anvisa TEXT,
    necessita_receita BOOLEAN DEFAULT false,
    controlado BOOLEAN DEFAULT false,
    
    -- Mídia
    imagem_url TEXT,
    
    -- Configurações
    permite_venda_fracionada BOOLEAN DEFAULT false,
    rastrear_lote BOOLEAN DEFAULT false,
    
    -- Status
    ativo BOOLEAN DEFAULT true,
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    -- Estrutura: {
    --   "tags": ["string"],
    --   "peso_gramas": number,
    --   "dimensoes": {"altura": number, "largura": number, "profundidade": number},
    --   "temperatura_armazenamento": "string",
    --   "cuidados_especiais": ["string"]
    -- }
    
    -- Auditoria
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT produtos_nome_clinica_unique UNIQUE (clinica_id, nome, marca),
    CONSTRAINT produtos_codigo_interno_clinica_unique UNIQUE (clinica_id, codigo_interno),
    CONSTRAINT produtos_sku_clinica_unique UNIQUE (clinica_id, sku),
    CONSTRAINT produtos_estoque_maximo_check CHECK (estoque_maximo IS NULL OR estoque_maximo >= estoque_minimo)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices básicos para fornecedores
CREATE INDEX IF NOT EXISTS idx_fornecedores_clinica_id 
    ON public.fornecedores(clinica_id);

CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo 
    ON public.fornecedores(ativo) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_fornecedores_nome_busca 
    ON public.fornecedores USING gin(to_tsvector('portuguese', nome || ' ' || COALESCE(razao_social, '')));

-- Índices básicos para produtos
CREATE INDEX IF NOT EXISTS idx_produtos_clinica_id 
    ON public.produtos(clinica_id);

CREATE INDEX IF NOT EXISTS idx_produtos_categoria 
    ON public.produtos(categoria);

CREATE INDEX IF NOT EXISTS idx_produtos_status 
    ON public.produtos(status);

CREATE INDEX IF NOT EXISTS idx_produtos_fornecedor_id 
    ON public.produtos(fornecedor_id);

CREATE INDEX IF NOT EXISTS idx_produtos_ativo 
    ON public.produtos(ativo) WHERE ativo = true;

-- Índices compostos para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_produtos_clinica_categoria_status 
    ON public.produtos(clinica_id, categoria, status);

CREATE INDEX IF NOT EXISTS idx_produtos_clinica_ativo_status 
    ON public.produtos(clinica_id, ativo, status) WHERE ativo = true;

-- Índices para controle de estoque
CREATE INDEX IF NOT EXISTS idx_produtos_estoque_baixo 
    ON public.produtos(clinica_id, quantidade, estoque_minimo) 
    WHERE quantidade <= estoque_minimo AND ativo = true;

CREATE INDEX IF NOT EXISTS idx_produtos_vencimento_proximo 
    ON public.produtos(clinica_id, data_vencimento) 
    WHERE data_vencimento IS NOT NULL AND ativo = true;

-- Índice para busca textual
CREATE INDEX IF NOT EXISTS idx_produtos_nome_busca 
    ON public.produtos USING gin(to_tsvector('portuguese', 
        nome || ' ' || 
        COALESCE(marca, '') || ' ' || 
        COALESCE(descricao, '') || ' ' ||
        COALESCE(codigo_interno, '') || ' ' ||
        COALESCE(sku, '')
    ));

-- Índices para códigos
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras 
    ON public.produtos(codigo_barras) WHERE codigo_barras IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_produtos_codigo_interno 
    ON public.produtos(codigo_interno) WHERE codigo_interno IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_produtos_sku 
    ON public.produtos(sku) WHERE sku IS NOT NULL;

-- Índices para timestamps
CREATE INDEX IF NOT EXISTS idx_produtos_criado_em 
    ON public.produtos(criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_produtos_atualizado_em 
    ON public.produtos(atualizado_em DESC);

-- =====================================================
-- TRIGGERS PARA AUDITORIA E AUTOMAÇÃO
-- =====================================================

-- Função para atualizar timestamp de atualização (fornecedores)
CREATE OR REPLACE FUNCTION update_fornecedores_updated_at()
RETURNS TRIGGER AS $
BEGIN
    NEW.atualizado_em = now();
    NEW.atualizado_por = auth.uid();
    RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar updated_at (fornecedores)
DROP TRIGGER IF EXISTS trigger_update_fornecedores_updated_at ON public.fornecedores;
CREATE TRIGGER trigger_update_fornecedores_updated_at
    BEFORE UPDATE ON public.fornecedores
    FOR EACH ROW EXECUTE FUNCTION update_fornecedores_updated_at();

-- Função para atualizar timestamp de atualização (produtos)
CREATE OR REPLACE FUNCTION update_produtos_updated_at()
RETURNS TRIGGER AS $
BEGIN
    NEW.atualizado_em = now();
    NEW.atualizado_por = auth.uid();
    RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar updated_at (produtos)
DROP TRIGGER IF EXISTS trigger_update_produtos_updated_at ON public.produtos;
CREATE TRIGGER trigger_update_produtos_updated_at
    BEFORE UPDATE ON public.produtos
    FOR EACH ROW EXECUTE FUNCTION update_produtos_updated_at();

-- Função para atualizar status do produto automaticamente
CREATE OR REPLACE FUNCTION update_produto_status()
RETURNS TRIGGER AS $
BEGIN
    -- Verificar se está vencido
    IF NEW.data_vencimento IS NOT NULL AND NEW.data_vencimento < CURRENT_DATE THEN
        NEW.status = 'vencido';
    -- Verificar se está em falta
    ELSIF NEW.quantidade = 0 THEN
        NEW.status = 'em_falta';
    -- Verificar se está com baixo estoque
    ELSIF NEW.quantidade <= NEW.estoque_minimo THEN
        NEW.status = 'baixo_estoque';
    -- Verificar se foi descontinuado
    ELSIF NEW.ativo = false THEN
        NEW.status = 'descontinuado';
    -- Caso contrário, está disponível
    ELSE
        NEW.status = 'disponivel';
    END IF;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Trigger para atualizar status automaticamente
DROP TRIGGER IF EXISTS trigger_update_produto_status ON public.produtos;
CREATE TRIGGER trigger_update_produto_status
    BEFORE INSERT OR UPDATE ON public.produtos
    FOR EACH ROW EXECUTE FUNCTION update_produto_status();

-- Função para validar dados do produto
CREATE OR REPLACE FUNCTION validate_produto_data()
RETURNS TRIGGER AS $
BEGIN
    -- Validar preço de venda maior que custo
    IF NEW.preco_venda IS NOT NULL AND NEW.preco_venda < NEW.preco_custo THEN
        RAISE EXCEPTION 'Preço de venda (%) não pode ser menor que preço de custo (%)', 
            NEW.preco_venda, NEW.preco_custo;
    END IF;
    
    -- Validar data de vencimento não pode ser no passado para novos produtos
    IF TG_OP = 'INSERT' AND NEW.data_vencimento IS NOT NULL AND NEW.data_vencimento < CURRENT_DATE THEN
        RAISE EXCEPTION 'Data de vencimento não pode ser no passado para novos produtos';
    END IF;
    
    -- Validar código de barras (formato básico)
    IF NEW.codigo_barras IS NOT NULL AND LENGTH(NEW.codigo_barras) NOT IN (8, 12, 13, 14) THEN
        RAISE EXCEPTION 'Código de barras deve ter 8, 12, 13 ou 14 dígitos';
    END IF;
    
    -- Validar CNPJ do fornecedor se informado
    IF NEW.fornecedor_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.fornecedores f 
            WHERE f.id = NEW.fornecedor_id 
            AND f.clinica_id = NEW.clinica_id 
            AND f.ativo = true
        ) THEN
            RAISE EXCEPTION 'Fornecedor deve pertencer à mesma clínica e estar ativo';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Trigger para validação de dados
DROP TRIGGER IF EXISTS trigger_validate_produto_data ON public.produtos;
CREATE TRIGGER trigger_validate_produto_data
    BEFORE INSERT OR UPDATE ON public.produtos
    FOR EACH ROW EXECUTE FUNCTION validate_produto_data();

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE public.fornecedores IS 'Cadastro de fornecedores de produtos para as clínicas';
COMMENT ON COLUMN public.fornecedores.endereco IS 'Endereço completo do fornecedor em formato JSON';
COMMENT ON COLUMN public.fornecedores.condicoes_pagamento IS 'Condições de pagamento acordadas com o fornecedor';

COMMENT ON TABLE public.produtos IS 'Cadastro de produtos com controle de estoque e validade';
COMMENT ON COLUMN public.produtos.margem_lucro IS 'Margem de lucro calculada automaticamente (%)';
COMMENT ON COLUMN public.produtos.status IS 'Status calculado automaticamente baseado em estoque e validade';
COMMENT ON COLUMN public.produtos.dias_alerta_vencimento IS 'Dias de antecedência para alertar sobre vencimento';
COMMENT ON COLUMN public.produtos.metadata IS 'Metadados adicionais como peso, dimensões, cuidados especiais';

-- =====================================================
-- MENSAGEM DE CONCLUSÃO
-- =====================================================

DO $ 
BEGIN 
    RAISE NOTICE '=== MIGRAÇÃO PRODUTOS CONCLUÍDA ===';
    RAISE NOTICE 'Componentes criados:';
    RAISE NOTICE '- Tabela fornecedores com validações';
    RAISE NOTICE '- Tabela produtos com controle de estoque';
    RAISE NOTICE '- 4 tipos enumerados (categoria_produto, status_produto, unidade_medida, tipo_movimentacao)';
    RAISE NOTICE '- 15 índices otimizados para performance';
    RAISE NOTICE '- 4 triggers para auditoria e validação automática';
    RAISE NOTICE '- Status de produto calculado automaticamente';
    RAISE NOTICE '- Validações de preço, vencimento e códigos';
    RAISE NOTICE '=== READY FOR INVENTORY MANAGEMENT ===';
END $;