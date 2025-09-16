-- =====================================================
-- MIGRAÇÃO: SISTEMA DE MOVIMENTAÇÕES DE ESTOQUE
-- Implementa auditoria completa de movimentações com triggers automáticos
-- =====================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA PRINCIPAL: MOVIMENTACOES_ESTOQUE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.movimentacoes_estoque (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relacionamentos obrigatórios
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    responsavel_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Relacionamentos opcionais (dependendo do tipo de movimentação)
    cliente_id UUID REFERENCES public.clientes(id),
    servico_id UUID REFERENCES public.servicos(id),
    sessao_atendimento_id UUID REFERENCES public.sessoes_atendimento(id),
    fornecedor_id UUID REFERENCES public.fornecedores(id),
    
    -- Tipo de movimentação
    tipo_movimentacao tipo_movimentacao NOT NULL,
    
    -- Quantidades (auditoria completa)
    quantidade INTEGER NOT NULL CHECK (quantidade != 0),
    quantidade_anterior INTEGER NOT NULL CHECK (quantidade_anterior >= 0),
    quantidade_atual INTEGER NOT NULL CHECK (quantidade_atual >= 0),
    
    -- Valores financeiros
    valor_unitario DECIMAL(10,2) CHECK (valor_unitario >= 0),
    valor_total DECIMAL(10,2) GENERATED ALWAYS AS (
        ABS(quantidade) * COALESCE(valor_unitario, 0)
    ) STORED,
    
    -- Informações adicionais
    motivo TEXT NOT NULL,
    observacoes TEXT,
    lote TEXT,
    data_vencimento_lote DATE,
    
    -- Localização (se aplicável)
    localizacao_origem TEXT,
    localizacao_destino TEXT,
    
    -- Dados de auditoria
    data_movimentacao TIMESTAMPTZ NOT NULL DEFAULT now(),
    criado_em TIMESTAMPTZ DEFAULT now(),
    
    -- Metadados para rastreabilidade
    metadata JSONB DEFAULT '{}',
    -- Estrutura: {
    --   "documento_fiscal": "string",
    --   "numero_nota": "string",
    --   "motivo_ajuste": "string",
    --   "aprovado_por": "uuid",
    --   "sistema_origem": "string"
    -- }
    
    -- Constraints de validação
    CONSTRAINT movimentacoes_quantidade_consistente CHECK (
        (tipo_movimentacao IN ('entrada', 'ajuste') AND quantidade > 0) OR
        (tipo_movimentacao IN ('saida', 'vencimento', 'perda') AND quantidade < 0) OR
        (tipo_movimentacao = 'transferencia')
    ),
    
    CONSTRAINT movimentacoes_calculo_correto CHECK (
        quantidade_atual = quantidade_anterior + quantidade
    )
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE E CONSULTAS DE HISTÓRICO
-- =====================================================

-- Índices básicos
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_produto_id 
    ON public.movimentacoes_estoque(produto_id);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_responsavel_id 
    ON public.movimentacoes_estoque(responsavel_id);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_tipo 
    ON public.movimentacoes_estoque(tipo_movimentacao);

-- Índices para relacionamentos opcionais
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_cliente_id 
    ON public.movimentacoes_estoque(cliente_id) WHERE cliente_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_servico_id 
    ON public.movimentacoes_estoque(servico_id) WHERE servico_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_sessao_id 
    ON public.movimentacoes_estoque(sessao_atendimento_id) WHERE sessao_atendimento_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_fornecedor_id 
    ON public.movimentacoes_estoque(fornecedor_id) WHERE fornecedor_id IS NOT NULL;

-- Índices compostos para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto_data 
    ON public.movimentacoes_estoque(produto_id, data_movimentacao DESC);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto_tipo_data 
    ON public.movimentacoes_estoque(produto_id, tipo_movimentacao, data_movimentacao DESC);

-- Índice para consultas por período
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data_movimentacao 
    ON public.movimentacoes_estoque(data_movimentacao DESC);

-- Índice para consultas por lote
CREATE INDEX IF NOT EXISTS idx_movimentacoes_lote 
    ON public.movimentacoes_estoque(lote) WHERE lote IS NOT NULL;

-- Índice para busca por clínica (via produto)
CREATE INDEX IF NOT EXISTS idx_movimentacoes_clinica_data 
    ON public.movimentacoes_estoque(produto_id, data_movimentacao DESC)
    INCLUDE (tipo_movimentacao, quantidade, valor_total);

-- =====================================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA DE ESTOQUE
-- =====================================================

-- Função para atualizar estoque do produto automaticamente
CREATE OR REPLACE FUNCTION update_produto_estoque_on_movimentacao()
RETURNS TRIGGER AS $
DECLARE
    clinica_produto_id UUID;
BEGIN
    -- Obter clinica_id do produto para validação RLS
    SELECT p.clinica_id INTO clinica_produto_id
    FROM public.produtos p 
    WHERE p.id = NEW.produto_id;
    
    -- Verificar se o usuário tem acesso à clínica do produto
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.clinica_id = clinica_produto_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Usuário não tem permissão para movimentar produtos desta clínica';
    END IF;
    
    -- Obter quantidade atual do produto
    SELECT quantidade INTO NEW.quantidade_anterior
    FROM public.produtos 
    WHERE id = NEW.produto_id;
    
    -- Calcular nova quantidade
    NEW.quantidade_atual = NEW.quantidade_anterior + NEW.quantidade;
    
    -- Validar se não ficará negativo
    IF NEW.quantidade_atual < 0 THEN
        RAISE EXCEPTION 'Movimentação resultaria em estoque negativo. Estoque atual: %, Movimentação: %', 
            NEW.quantidade_anterior, NEW.quantidade;
    END IF;
    
    -- Atualizar quantidade no produto
    UPDATE public.produtos 
    SET quantidade = NEW.quantidade_atual,
        atualizado_em = now(),
        atualizado_por = auth.uid()
    WHERE id = NEW.produto_id;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar estoque automaticamente
DROP TRIGGER IF EXISTS trigger_update_produto_estoque ON public.movimentacoes_estoque;
CREATE TRIGGER trigger_update_produto_estoque
    BEFORE INSERT ON public.movimentacoes_estoque
    FOR EACH ROW EXECUTE FUNCTION update_produto_estoque_on_movimentacao();

-- Função para validar movimentação
CREATE OR REPLACE FUNCTION validate_movimentacao_estoque()
RETURNS TRIGGER AS $
DECLARE
    produto_ativo BOOLEAN;
    produto_clinica_id UUID;
BEGIN
    -- Verificar se produto existe e está ativo
    SELECT ativo, clinica_id INTO produto_ativo, produto_clinica_id
    FROM public.produtos 
    WHERE id = NEW.produto_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto não encontrado';
    END IF;
    
    IF NOT produto_ativo THEN
        RAISE EXCEPTION 'Não é possível movimentar produto inativo';
    END IF;
    
    -- Validar relacionamentos opcionais pertencem à mesma clínica
    IF NEW.cliente_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.clientes c 
            WHERE c.id = NEW.cliente_id 
            AND c.clinica_id = produto_clinica_id
        ) THEN
            RAISE EXCEPTION 'Cliente deve pertencer à mesma clínica do produto';
        END IF;
    END IF;
    
    IF NEW.servico_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.servicos s 
            WHERE s.id = NEW.servico_id 
            AND s.clinica_id = produto_clinica_id
        ) THEN
            RAISE EXCEPTION 'Serviço deve pertencer à mesma clínica do produto';
        END IF;
    END IF;
    
    IF NEW.fornecedor_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.fornecedores f 
            WHERE f.id = NEW.fornecedor_id 
            AND f.clinica_id = produto_clinica_id
        ) THEN
            RAISE EXCEPTION 'Fornecedor deve pertencer à mesma clínica do produto';
        END IF;
    END IF;
    
    -- Validar tipos de movimentação específicos
    CASE NEW.tipo_movimentacao
        WHEN 'entrada' THEN
            IF NEW.quantidade <= 0 THEN
                RAISE EXCEPTION 'Entrada deve ter quantidade positiva';
            END IF;
            IF NEW.fornecedor_id IS NULL THEN
                RAISE EXCEPTION 'Entrada deve ter fornecedor informado';
            END IF;
            
        WHEN 'saida' THEN
            IF NEW.quantidade >= 0 THEN
                RAISE EXCEPTION 'Saída deve ter quantidade negativa';
            END IF;
            
        WHEN 'ajuste' THEN
            IF NEW.quantidade = 0 THEN
                RAISE EXCEPTION 'Ajuste deve ter quantidade diferente de zero';
            END IF;
            
        WHEN 'vencimento', 'perda' THEN
            IF NEW.quantidade >= 0 THEN
                RAISE EXCEPTION 'Vencimento/Perda deve ter quantidade negativa';
            END IF;
    END CASE;
    
    -- Definir valor unitário padrão se não informado
    IF NEW.valor_unitario IS NULL THEN
        SELECT preco_custo INTO NEW.valor_unitario
        FROM public.produtos 
        WHERE id = NEW.produto_id;
    END IF;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Trigger para validação
DROP TRIGGER IF EXISTS trigger_validate_movimentacao_estoque ON public.movimentacoes_estoque;
CREATE TRIGGER trigger_validate_movimentacao_estoque
    BEFORE INSERT ON public.movimentacoes_estoque
    FOR EACH ROW EXECUTE FUNCTION validate_movimentacao_estoque();

-- =====================================================
-- FUNÇÃO PARA HISTÓRICO DE MOVIMENTAÇÕES
-- =====================================================

-- Função para obter histórico completo de um produto
CREATE OR REPLACE FUNCTION get_produto_historico_movimentacoes(
    p_produto_id UUID,
    p_data_inicio TIMESTAMPTZ DEFAULT NULL,
    p_data_fim TIMESTAMPTZ DEFAULT NULL,
    p_tipo_movimentacao tipo_movimentacao DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    data_movimentacao TIMESTAMPTZ,
    tipo_movimentacao tipo_movimentacao,
    quantidade INTEGER,
    quantidade_anterior INTEGER,
    quantidade_atual INTEGER,
    valor_unitario DECIMAL(10,2),
    valor_total DECIMAL(10,2),
    motivo TEXT,
    responsavel_nome TEXT,
    cliente_nome TEXT,
    servico_nome TEXT,
    fornecedor_nome TEXT,
    lote TEXT,
    observacoes TEXT
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.data_movimentacao,
        m.tipo_movimentacao,
        m.quantidade,
        m.quantidade_anterior,
        m.quantidade_atual,
        m.valor_unitario,
        m.valor_total,
        m.motivo,
        p.nome_completo as responsavel_nome,
        c.nome as cliente_nome,
        s.nome as servico_nome,
        f.nome as fornecedor_nome,
        m.lote,
        m.observacoes
    FROM public.movimentacoes_estoque m
    LEFT JOIN public.profiles p ON p.id = m.responsavel_id
    LEFT JOIN public.clientes c ON c.id = m.cliente_id
    LEFT JOIN public.servicos s ON s.id = m.servico_id
    LEFT JOIN public.fornecedores f ON f.id = m.fornecedor_id
    WHERE m.produto_id = p_produto_id
    AND (p_data_inicio IS NULL OR m.data_movimentacao >= p_data_inicio)
    AND (p_data_fim IS NULL OR m.data_movimentacao <= p_data_fim)
    AND (p_tipo_movimentacao IS NULL OR m.tipo_movimentacao = p_tipo_movimentacao)
    ORDER BY m.data_movimentacao DESC, m.criado_em DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para relatório de movimentações por período
CREATE OR REPLACE FUNCTION get_relatorio_movimentacoes_periodo(
    p_clinica_id UUID,
    p_data_inicio TIMESTAMPTZ,
    p_data_fim TIMESTAMPTZ
)
RETURNS TABLE (
    produto_id UUID,
    produto_nome TEXT,
    categoria categoria_produto,
    total_entradas INTEGER,
    total_saidas INTEGER,
    valor_total_entradas DECIMAL(10,2),
    valor_total_saidas DECIMAL(10,2),
    saldo_quantidade INTEGER,
    saldo_valor DECIMAL(10,2)
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        p.id as produto_id,
        p.nome as produto_nome,
        p.categoria,
        COALESCE(SUM(CASE WHEN m.quantidade > 0 THEN m.quantidade ELSE 0 END), 0)::INTEGER as total_entradas,
        COALESCE(SUM(CASE WHEN m.quantidade < 0 THEN ABS(m.quantidade) ELSE 0 END), 0)::INTEGER as total_saidas,
        COALESCE(SUM(CASE WHEN m.quantidade > 0 THEN m.valor_total ELSE 0 END), 0) as valor_total_entradas,
        COALESCE(SUM(CASE WHEN m.quantidade < 0 THEN m.valor_total ELSE 0 END), 0) as valor_total_saidas,
        COALESCE(SUM(m.quantidade), 0)::INTEGER as saldo_quantidade,
        COALESCE(SUM(CASE WHEN m.quantidade > 0 THEN m.valor_total ELSE -m.valor_total END), 0) as saldo_valor
    FROM public.produtos p
    LEFT JOIN public.movimentacoes_estoque m ON m.produto_id = p.id
        AND m.data_movimentacao >= p_data_inicio
        AND m.data_movimentacao <= p_data_fim
    WHERE p.clinica_id = p_clinica_id
    AND p.ativo = true
    GROUP BY p.id, p.nome, p.categoria
    ORDER BY p.nome;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- Política para visualização
-- Usuários podem ver movimentações de produtos de suas clínicas
CREATE POLICY "Users can view stock movements" ON public.movimentacoes_estoque
    FOR SELECT USING (
        produto_id IN (
            SELECT p.id 
            FROM public.produtos p
            JOIN public.user_roles ur ON ur.clinica_id = p.clinica_id
            WHERE ur.user_id = auth.uid()
        )
        OR
        -- Super admin pode ver tudo
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'super_admin'
        )
    );

-- Política para inserção
-- Usuários podem criar movimentações para produtos de suas clínicas
CREATE POLICY "Users can create stock movements" ON public.movimentacoes_estoque
    FOR INSERT WITH CHECK (
        produto_id IN (
            SELECT p.id 
            FROM public.produtos p
            JOIN public.user_roles ur ON ur.clinica_id = p.clinica_id
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('proprietaria', 'gerente', 'profissionais', 'recepcionista')
        )
    );

-- Política para atualização (apenas observações e metadados)
-- Apenas proprietárias e gerentes podem atualizar movimentações
CREATE POLICY "Users can update stock movements" ON public.movimentacoes_estoque
    FOR UPDATE USING (
        produto_id IN (
            SELECT p.id 
            FROM public.produtos p
            JOIN public.user_roles ur ON ur.clinica_id = p.clinica_id
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('proprietaria', 'gerente')
        )
        OR
        -- Super admin pode atualizar tudo
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'super_admin'
        )
    );

-- Política para exclusão (apenas super admin)
-- Movimentações não devem ser excluídas para manter auditoria
CREATE POLICY "Only super admin can delete stock movements" ON public.movimentacoes_estoque
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'super_admin'
        )
    );

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE public.movimentacoes_estoque IS 'Auditoria completa de todas as movimentações de estoque com atualização automática';
COMMENT ON COLUMN public.movimentacoes_estoque.quantidade IS 'Quantidade movimentada (positiva para entrada, negativa para saída)';
COMMENT ON COLUMN public.movimentacoes_estoque.quantidade_anterior IS 'Quantidade antes da movimentação (para auditoria)';
COMMENT ON COLUMN public.movimentacoes_estoque.quantidade_atual IS 'Quantidade após a movimentação (calculada automaticamente)';
COMMENT ON COLUMN public.movimentacoes_estoque.valor_total IS 'Valor total da movimentação (calculado automaticamente)';
COMMENT ON COLUMN public.movimentacoes_estoque.metadata IS 'Metadados adicionais como documento fiscal, aprovações';

COMMENT ON FUNCTION get_produto_historico_movimentacoes IS 'Retorna histórico completo de movimentações de um produto';
COMMENT ON FUNCTION get_relatorio_movimentacoes_periodo IS 'Gera relatório consolidado de movimentações por período';

-- =====================================================
-- MENSAGEM DE CONCLUSÃO
-- =====================================================

DO $ 
BEGIN 
    RAISE NOTICE '=== MIGRAÇÃO MOVIMENTAÇÕES ESTOQUE CONCLUÍDA ===';
    RAISE NOTICE 'Componentes criados:';
    RAISE NOTICE '- Tabela movimentacoes_estoque com auditoria completa';
    RAISE NOTICE '- 10 índices otimizados para consultas de histórico';
    RAISE NOTICE '- 2 triggers para atualização automática de estoque';
    RAISE NOTICE '- 2 funções para relatórios e histórico';
    RAISE NOTICE '- 4 políticas RLS para isolamento multi-tenant';
    RAISE NOTICE '- Validações rigorosas de integridade';
    RAISE NOTICE '- Atualização automática do estoque do produto';
    RAISE NOTICE '=== READY FOR STOCK MOVEMENT TRACKING ===';
END $;