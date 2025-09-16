-- =====================================================
-- SISTEMA FINANCEIRO - FUNÇÕES AUTOMÁTICAS
-- =====================================================
-- Implementa cálculo automático de receitas, comissões
-- e controle de gastos por categoria
-- =====================================================

-- =====================================================
-- FUNÇÃO: calcular_comissao_profissional
-- =====================================================
-- Calcula a comissão de um profissional para um procedimento
CREATE OR REPLACE FUNCTION calcular_comissao_profissional(
    p_profissional_id UUID,
    p_clinica_id UUID,
    p_servico_id UUID,
    p_valor_procedimento DECIMAL
)
RETURNS TABLE(
    percentual DECIMAL,
    valor_comissao DECIMAL,
    configuracao_id UUID
) AS $$
DECLARE
    v_config RECORD;
BEGIN
    -- Buscar configuração específica do serviço primeiro
    SELECT 
        cp.id,
        cp.percentual_comissao,
        cp.valor_fixo_comissao,
        cp.valor_minimo_procedimento
    INTO v_config
    FROM comissoes_profissionais cp
    WHERE cp.profissional_id = p_profissional_id
    AND cp.clinica_id = p_clinica_id
    AND cp.servico_id = p_servico_id
    AND cp.ativo = true
    AND (cp.data_fim IS NULL OR cp.data_fim >= CURRENT_DATE)
    AND cp.data_inicio <= CURRENT_DATE
    ORDER BY cp.criado_em DESC
    LIMIT 1;
    
    -- Se não encontrou configuração específica, buscar configuração geral
    IF NOT FOUND THEN
        SELECT 
            cp.id,
            cp.percentual_comissao,
            cp.valor_fixo_comissao,
            cp.valor_minimo_procedimento
        INTO v_config
        FROM comissoes_profissionais cp
        WHERE cp.profissional_id = p_profissional_id
        AND cp.clinica_id = p_clinica_id
        AND cp.servico_id IS NULL
        AND cp.ativo = true
        AND (cp.data_fim IS NULL OR cp.data_fim >= CURRENT_DATE)
        AND cp.data_inicio <= CURRENT_DATE
        ORDER BY cp.criado_em DESC
        LIMIT 1;
    END IF;
    
    -- Se não encontrou configuração, retorna 0
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0::DECIMAL, 0::DECIMAL, NULL::UUID;
        RETURN;
    END IF;
    
    -- Verificar valor mínimo
    IF v_config.valor_minimo_procedimento IS NOT NULL 
       AND p_valor_procedimento < v_config.valor_minimo_procedimento THEN
        RETURN QUERY SELECT 0::DECIMAL, 0::DECIMAL, v_config.id;
        RETURN;
    END IF;
    
    -- Calcular comissão
    IF v_config.valor_fixo_comissao IS NOT NULL THEN
        -- Comissão fixa
        RETURN QUERY SELECT 
            0::DECIMAL, 
            v_config.valor_fixo_comissao, 
            v_config.id;
    ELSE
        -- Comissão percentual
        RETURN QUERY SELECT 
            v_config.percentual_comissao,
            ROUND((p_valor_procedimento * v_config.percentual_comissao / 100), 2),
            v_config.id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: registrar_receita_sessao
-- =====================================================
-- Registra automaticamente a receita de uma sessão de atendimento
CREATE OR REPLACE FUNCTION registrar_receita_sessao(
    p_sessao_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_sessao RECORD;
    v_comissao RECORD;
    v_transacao_id UUID;
    v_comissao_id UUID;
BEGIN
    -- Buscar dados da sessão
    SELECT 
        sa.id,
        sa.clinica_id,
        sa.profissional_id,
        sa.cliente_id,
        sa.servico_id,
        sa.valor_procedimento,
        sa.valor_produtos,
        sa.valor_desconto,
        sa.valor_total,
        sa.data_atendimento,
        sa.criado_por
    INTO v_sessao
    FROM sessoes_atendimento sa
    WHERE sa.id = p_sessao_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sessão de atendimento não encontrada: %', p_sessao_id;
    END IF;
    
    -- Verificar se já existe transação para esta sessão
    IF EXISTS (
        SELECT 1 FROM transacoes_financeiras 
        WHERE sessao_atendimento_id = p_sessao_id 
        AND tipo = 'receita'
    ) THEN
        RAISE EXCEPTION 'Receita já registrada para esta sessão: %', p_sessao_id;
    END IF;
    
    -- Registrar receita principal
    INSERT INTO transacoes_financeiras (
        clinica_id,
        tipo,
        descricao,
        valor,
        data_transacao,
        status,
        sessao_atendimento_id,
        profissional_id,
        cliente_id,
        criado_por
    ) VALUES (
        v_sessao.clinica_id,
        'receita',
        'Receita de procedimento - Sessão ' || v_sessao.id,
        v_sessao.valor_total,
        v_sessao.data_atendimento::DATE,
        'confirmada',
        v_sessao.id,
        v_sessao.profissional_id,
        v_sessao.cliente_id,
        v_sessao.criado_por
    ) RETURNING id INTO v_transacao_id;
    
    -- Calcular e registrar comissão se aplicável
    IF v_sessao.valor_procedimento > 0 THEN
        SELECT * INTO v_comissao
        FROM calcular_comissao_profissional(
            v_sessao.profissional_id,
            v_sessao.clinica_id,
            v_sessao.servico_id,
            v_sessao.valor_procedimento
        );
        
        IF v_comissao.valor_comissao > 0 THEN
            INSERT INTO transacoes_financeiras (
                clinica_id,
                tipo,
                descricao,
                valor,
                data_transacao,
                status,
                sessao_atendimento_id,
                profissional_id,
                cliente_id,
                percentual_comissao,
                valor_comissao,
                comissao_paga,
                criado_por
            ) VALUES (
                v_sessao.clinica_id,
                'comissao',
                'Comissão de procedimento - Sessão ' || v_sessao.id,
                v_comissao.valor_comissao,
                v_sessao.data_atendimento::DATE,
                'pendente',
                v_sessao.id,
                v_sessao.profissional_id,
                v_sessao.cliente_id,
                v_comissao.percentual,
                v_comissao.valor_comissao,
                false,
                v_sessao.criado_por
            ) RETURNING id INTO v_comissao_id;
        END IF;
    END IF;
    
    RETURN v_transacao_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: registrar_gasto_produto
-- =====================================================
-- Registra automaticamente o gasto quando um produto é utilizado
CREATE OR REPLACE FUNCTION registrar_gasto_produto(
    p_produto_id UUID,
    p_quantidade INTEGER,
    p_sessao_id UUID DEFAULT NULL,
    p_motivo TEXT DEFAULT 'Uso em procedimento'
)
RETURNS UUID AS $$
DECLARE
    v_produto RECORD;
    v_sessao RECORD;
    v_valor_total DECIMAL;
    v_transacao_id UUID;
BEGIN
    -- Buscar dados do produto
    SELECT 
        p.id,
        p.clinica_id,
        p.nome,
        p.preco_custo,
        p.categoria
    INTO v_produto
    FROM produtos p
    WHERE p.id = p_produto_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto não encontrado: %', p_produto_id;
    END IF;
    
    -- Calcular valor total
    v_valor_total := v_produto.preco_custo * p_quantidade;
    
    -- Buscar dados da sessão se fornecida
    IF p_sessao_id IS NOT NULL THEN
        SELECT 
            sa.profissional_id,
            sa.cliente_id,
            sa.data_atendimento,
            sa.criado_por
        INTO v_sessao
        FROM sessoes_atendimento sa
        WHERE sa.id = p_sessao_id;
    END IF;
    
    -- Registrar despesa
    INSERT INTO transacoes_financeiras (
        clinica_id,
        tipo,
        categoria_despesa,
        descricao,
        valor,
        data_transacao,
        status,
        sessao_atendimento_id,
        produto_id,
        profissional_id,
        cliente_id,
        observacoes,
        criado_por
    ) VALUES (
        v_produto.clinica_id,
        'despesa',
        'produtos',
        format('Uso de %s (%s unidades) - %s', v_produto.nome, p_quantidade, p_motivo),
        -v_valor_total, -- Negativo para despesa
        COALESCE(v_sessao.data_atendimento::DATE, CURRENT_DATE),
        'confirmada',
        p_sessao_id,
        p_produto_id,
        v_sessao.profissional_id,
        v_sessao.cliente_id,
        format('Quantidade: %s, Valor unitário: %s', p_quantidade, v_produto.preco_custo),
        COALESCE(v_sessao.criado_por, auth.uid())
    ) RETURNING id INTO v_transacao_id;
    
    RETURN v_transacao_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: obter_resumo_financeiro
-- =====================================================
-- Obtém resumo financeiro por período
CREATE OR REPLACE FUNCTION obter_resumo_financeiro(
    p_clinica_id UUID,
    p_data_inicio DATE,
    p_data_fim DATE
)
RETURNS TABLE(
    total_receitas DECIMAL,
    total_despesas DECIMAL,
    total_comissoes DECIMAL,
    lucro_bruto DECIMAL,
    lucro_liquido DECIMAL,
    total_atendimentos BIGINT,
    ticket_medio DECIMAL,
    comissoes_pagas DECIMAL,
    comissoes_pendentes DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH financeiro_resumo AS (
        SELECT 
            SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) as receitas,
            SUM(CASE WHEN tipo = 'despesa' THEN ABS(valor) ELSE 0 END) as despesas,
            SUM(CASE WHEN tipo = 'comissao' THEN valor ELSE 0 END) as comissoes,
            COUNT(CASE WHEN tipo = 'receita' THEN 1 END) as atendimentos,
            SUM(CASE WHEN tipo = 'comissao' AND comissao_paga = true THEN valor ELSE 0 END) as comissoes_pagas_val,
            SUM(CASE WHEN tipo = 'comissao' AND comissao_paga = false THEN valor ELSE 0 END) as comissoes_pendentes_val
        FROM transacoes_financeiras
        WHERE clinica_id = p_clinica_id
        AND data_transacao BETWEEN p_data_inicio AND p_data_fim
        AND status = 'confirmada'
    )
    SELECT 
        fr.receitas,
        fr.despesas,
        fr.comissoes,
        fr.receitas - fr.despesas as lucro_bruto,
        fr.receitas - fr.despesas - fr.comissoes as lucro_liquido,
        fr.atendimentos,
        CASE 
            WHEN fr.atendimentos > 0 THEN fr.receitas / fr.atendimentos 
            ELSE 0 
        END as ticket_medio,
        fr.comissoes_pagas_val,
        fr.comissoes_pendentes_val
    FROM financeiro_resumo fr;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: comparar_com_metas
-- =====================================================
-- Compara performance atual com metas definidas
CREATE OR REPLACE FUNCTION comparar_com_metas(
    p_clinica_id UUID,
    p_ano INTEGER,
    p_mes INTEGER
)
RETURNS TABLE(
    meta_receita DECIMAL,
    receita_atual DECIMAL,
    percentual_receita DECIMAL,
    meta_despesas DECIMAL,
    despesas_atual DECIMAL,
    percentual_despesas DECIMAL,
    meta_lucro DECIMAL,
    lucro_atual DECIMAL,
    percentual_lucro DECIMAL,
    meta_atendimentos INTEGER,
    atendimentos_atual BIGINT,
    percentual_atendimentos DECIMAL
) AS $$
DECLARE
    v_data_inicio DATE;
    v_data_fim DATE;
    v_resumo RECORD;
    v_meta RECORD;
BEGIN
    -- Calcular período
    v_data_inicio := make_date(p_ano, p_mes, 1);
    v_data_fim := (v_data_inicio + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    
    -- Buscar meta
    SELECT 
        mf.meta_receita,
        mf.meta_despesas,
        mf.meta_lucro,
        mf.meta_atendimentos
    INTO v_meta
    FROM metas_financeiras mf
    WHERE mf.clinica_id = p_clinica_id
    AND mf.ano = p_ano
    AND mf.mes = p_mes
    AND mf.ativo = true;
    
    -- Buscar resumo atual
    SELECT * INTO v_resumo
    FROM obter_resumo_financeiro(p_clinica_id, v_data_inicio, v_data_fim);
    
    -- Retornar comparação
    RETURN QUERY SELECT 
        COALESCE(v_meta.meta_receita, 0::DECIMAL),
        COALESCE(v_resumo.total_receitas, 0::DECIMAL),
        CASE 
            WHEN v_meta.meta_receita > 0 THEN 
                ROUND((v_resumo.total_receitas / v_meta.meta_receita * 100), 2)
            ELSE 0::DECIMAL 
        END,
        COALESCE(v_meta.meta_despesas, 0::DECIMAL),
        COALESCE(v_resumo.total_despesas, 0::DECIMAL),
        CASE 
            WHEN v_meta.meta_despesas > 0 THEN 
                ROUND((v_resumo.total_despesas / v_meta.meta_despesas * 100), 2)
            ELSE 0::DECIMAL 
        END,
        COALESCE(v_meta.meta_lucro, 0::DECIMAL),
        COALESCE(v_resumo.lucro_liquido, 0::DECIMAL),
        CASE 
            WHEN v_meta.meta_lucro > 0 THEN 
                ROUND((v_resumo.lucro_liquido / v_meta.meta_lucro * 100), 2)
            ELSE 0::DECIMAL 
        END,
        COALESCE(v_meta.meta_atendimentos, 0),
        COALESCE(v_resumo.total_atendimentos, 0),
        CASE 
            WHEN v_meta.meta_atendimentos > 0 THEN 
                ROUND((v_resumo.total_atendimentos::DECIMAL / v_meta.meta_atendimentos * 100), 2)
            ELSE 0::DECIMAL 
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION calcular_comissao_profissional IS 'Calcula comissão de profissional baseada na configuração específica ou geral';
COMMENT ON FUNCTION registrar_receita_sessao IS 'Registra automaticamente receita e comissão de uma sessão de atendimento';
COMMENT ON FUNCTION registrar_gasto_produto IS 'Registra automaticamente gasto quando produto é utilizado';
COMMENT ON FUNCTION obter_resumo_financeiro IS 'Obtém resumo financeiro completo por período';
COMMENT ON FUNCTION comparar_com_metas IS 'Compara performance atual com metas definidas';

-- =====================================================
-- LOG DE CRIAÇÃO
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=== FINANCIAL FUNCTIONS CREATED ===';
    RAISE NOTICE '- calcular_comissao_profissional: Automatic commission calculation';
    RAISE NOTICE '- registrar_receita_sessao: Automatic revenue and commission registration';
    RAISE NOTICE '- registrar_gasto_produto: Automatic product expense registration';
    RAISE NOTICE '- obter_resumo_financeiro: Complete financial summary by period';
    RAISE NOTICE '- comparar_com_metas: Performance comparison with defined goals';
    RAISE NOTICE '=== FINANCIAL AUTOMATION READY ===';
END $$;