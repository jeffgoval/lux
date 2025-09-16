-- =====================================================
-- SISTEMA FINANCEIRO - POLÍTICAS RLS
-- =====================================================
-- Implementa Row Level Security para isolamento multi-tenant
-- e controle granular de acesso aos dados financeiros
-- =====================================================

-- Habilitar RLS nas tabelas financeiras
ALTER TABLE transacoes_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE comissoes_profissionais ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FUNÇÕES AUXILIARES PARA VERIFICAÇÃO DE PERMISSÕES
-- =====================================================

-- Função para verificar se usuário pode acessar dados financeiros
CREATE OR REPLACE FUNCTION user_can_access_financial_data(p_clinica_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_has_access BOOLEAN := false;
BEGIN
    -- Verificar se usuário tem acesso à clínica
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = v_user_id 
        AND ur.clinica_id = p_clinica_id
    ) THEN
        RETURN false;
    END IF;
    
    -- Verificar permissões específicas para dados financeiros
    SELECT EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = v_user_id
        AND ur.clinica_id = p_clinica_id
        AND ur.role IN ('proprietaria', 'gerente', 'financeiro')
    ) INTO v_has_access;
    
    RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário pode gerenciar dados financeiros
CREATE OR REPLACE FUNCTION user_can_manage_financial_data(p_clinica_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = v_user_id
        AND ur.clinica_id = p_clinica_id
        AND ur.role IN ('proprietaria', 'gerente')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário pode ver suas próprias comissões
CREATE OR REPLACE FUNCTION user_can_view_own_commissions(p_profissional_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid() = p_profissional_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLÍTICAS RLS - TRANSAÇÕES FINANCEIRAS
-- =====================================================

-- Política de SELECT - Visualização de transações
CREATE POLICY "Users can view clinic financial transactions" ON transacoes_financeiras
    FOR SELECT
    USING (
        user_can_access_financial_data(clinica_id)
        OR 
        (tipo = 'comissao' AND user_can_view_own_commissions(profissional_id))
    );

-- Política de INSERT - Criação de transações
CREATE POLICY "Users can create clinic financial transactions" ON transacoes_financeiras
    FOR INSERT
    WITH CHECK (
        user_can_manage_financial_data(clinica_id)
        OR
        -- Profissionais podem registrar suas próprias receitas
        (tipo = 'receita' AND EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.clinica_id = transacoes_financeiras.clinica_id
            AND ur.role = 'profissionais'
        ))
    );

-- Política de UPDATE - Atualização de transações
CREATE POLICY "Users can update clinic financial transactions" ON transacoes_financeiras
    FOR UPDATE
    USING (
        user_can_manage_financial_data(clinica_id)
    )
    WITH CHECK (
        user_can_manage_financial_data(clinica_id)
    );

-- Política de DELETE - Exclusão de transações (apenas proprietárias)
CREATE POLICY "Owners can delete financial transactions" ON transacoes_financeiras
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.clinica_id = transacoes_financeiras.clinica_id
            AND ur.role = 'proprietaria'
        )
    );

-- =====================================================
-- POLÍTICAS RLS - METAS FINANCEIRAS
-- =====================================================

-- Política de SELECT - Visualização de metas
CREATE POLICY "Users can view clinic financial goals" ON metas_financeiras
    FOR SELECT
    USING (user_can_access_financial_data(clinica_id));

-- Política de INSERT - Criação de metas
CREATE POLICY "Managers can create financial goals" ON metas_financeiras
    FOR INSERT
    WITH CHECK (user_can_manage_financial_data(clinica_id));

-- Política de UPDATE - Atualização de metas
CREATE POLICY "Managers can update financial goals" ON metas_financeiras
    FOR UPDATE
    USING (user_can_manage_financial_data(clinica_id))
    WITH CHECK (user_can_manage_financial_data(clinica_id));

-- Política de DELETE - Exclusão de metas
CREATE POLICY "Owners can delete financial goals" ON metas_financeiras
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.clinica_id = metas_financeiras.clinica_id
            AND ur.role = 'proprietaria'
        )
    );

-- =====================================================
-- POLÍTICAS RLS - COMISSÕES PROFISSIONAIS
-- =====================================================

-- Política de SELECT - Visualização de configurações de comissão
CREATE POLICY "Users can view commission configurations" ON comissoes_profissionais
    FOR SELECT
    USING (
        user_can_manage_financial_data(clinica_id)
        OR
        user_can_view_own_commissions(profissional_id)
    );

-- Política de INSERT - Criação de configurações de comissão
CREATE POLICY "Managers can create commission configurations" ON comissoes_profissionais
    FOR INSERT
    WITH CHECK (user_can_manage_financial_data(clinica_id));

-- Política de UPDATE - Atualização de configurações de comissão
CREATE POLICY "Managers can update commission configurations" ON comissoes_profissionais
    FOR UPDATE
    USING (user_can_manage_financial_data(clinica_id))
    WITH CHECK (user_can_manage_financial_data(clinica_id));

-- Política de DELETE - Exclusão de configurações de comissão
CREATE POLICY "Managers can delete commission configurations" ON comissoes_profissionais
    FOR DELETE
    USING (user_can_manage_financial_data(clinica_id));

-- =====================================================
-- VIEWS SEGURAS PARA CONSULTAS COMUNS
-- =====================================================

-- View para resumo financeiro básico (sem detalhes sensíveis)
CREATE OR REPLACE VIEW public.resumo_financeiro_basico AS
SELECT 
    tf.clinica_id,
    DATE_TRUNC('month', tf.data_transacao) as mes_ano,
    SUM(CASE WHEN tf.tipo = 'receita' THEN tf.valor ELSE 0 END) as total_receitas,
    SUM(CASE WHEN tf.tipo = 'despesa' THEN ABS(tf.valor) ELSE 0 END) as total_despesas,
    COUNT(CASE WHEN tf.tipo = 'receita' THEN 1 END) as total_atendimentos,
    CASE 
        WHEN COUNT(CASE WHEN tf.tipo = 'receita' THEN 1 END) > 0 
        THEN SUM(CASE WHEN tf.tipo = 'receita' THEN tf.valor ELSE 0 END) / COUNT(CASE WHEN tf.tipo = 'receita' THEN 1 END)
        ELSE 0 
    END as ticket_medio
FROM transacoes_financeiras tf
WHERE tf.status = 'confirmada'
GROUP BY tf.clinica_id, DATE_TRUNC('month', tf.data_transacao);

-- View para comissões pendentes por profissional
CREATE OR REPLACE VIEW public.comissoes_pendentes AS
SELECT 
    tf.clinica_id,
    tf.profissional_id,
    p.nome_completo as profissional_nome,
    COUNT(*) as total_comissoes_pendentes,
    SUM(tf.valor_comissao) as valor_total_pendente,
    MIN(tf.data_transacao) as data_mais_antiga,
    MAX(tf.data_transacao) as data_mais_recente
FROM transacoes_financeiras tf
JOIN profiles p ON p.id = tf.profissional_id
WHERE tf.tipo = 'comissao'
AND tf.comissao_paga = false
AND tf.status = 'confirmada'
GROUP BY tf.clinica_id, tf.profissional_id, p.nome_completo;

-- View para despesas por categoria
CREATE OR REPLACE VIEW public.despesas_por_categoria AS
SELECT 
    tf.clinica_id,
    tf.categoria_despesa,
    DATE_TRUNC('month', tf.data_transacao) as mes_ano,
    COUNT(*) as total_transacoes,
    SUM(ABS(tf.valor)) as valor_total,
    AVG(ABS(tf.valor)) as valor_medio
FROM transacoes_financeiras tf
WHERE tf.tipo = 'despesa'
AND tf.status = 'confirmada'
AND tf.categoria_despesa IS NOT NULL
GROUP BY tf.clinica_id, tf.categoria_despesa, DATE_TRUNC('month', tf.data_transacao);

-- =====================================================
-- GRANTS PARA VIEWS
-- =====================================================

GRANT SELECT ON public.resumo_financeiro_basico TO authenticated;
GRANT SELECT ON public.comissoes_pendentes TO authenticated;
GRANT SELECT ON public.despesas_por_categoria TO authenticated;

-- =====================================================
-- TRIGGERS PARA AUTOMAÇÃO FINANCEIRA
-- =====================================================

-- Trigger para registrar receita automaticamente quando sessão é criada
CREATE OR REPLACE FUNCTION trigger_registrar_receita_sessao()
RETURNS TRIGGER AS $$
BEGIN
    -- Só registra se tem valor total definido
    IF NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
        PERFORM registrar_receita_sessao(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_receita_sessao
    AFTER INSERT ON sessoes_atendimento
    FOR EACH ROW
    EXECUTE FUNCTION trigger_registrar_receita_sessao();

-- Trigger para registrar gasto de produto automaticamente
CREATE OR REPLACE FUNCTION trigger_registrar_gasto_movimentacao()
RETURNS TRIGGER AS $$
BEGIN
    -- Só registra gasto para saídas de estoque
    IF NEW.tipo_movimentacao = 'saida' AND NEW.sessao_atendimento_id IS NOT NULL THEN
        PERFORM registrar_gasto_produto(
            NEW.produto_id,
            NEW.quantidade,
            NEW.sessao_atendimento_id,
            'Uso em procedimento'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_gasto_produto
    AFTER INSERT ON movimentacoes_estoque
    FOR EACH ROW
    EXECUTE FUNCTION trigger_registrar_gasto_movimentacao();

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON POLICY "Users can view clinic financial transactions" ON transacoes_financeiras IS 'Permite visualização de transações financeiras para usuários autorizados e próprias comissões para profissionais';
COMMENT ON POLICY "Users can create clinic financial transactions" ON transacoes_financeiras IS 'Permite criação de transações por gerentes e receitas por profissionais';

COMMENT ON VIEW public.resumo_financeiro_basico IS 'Resumo financeiro mensal básico sem detalhes sensíveis';
COMMENT ON VIEW public.comissoes_pendentes IS 'Lista de comissões pendentes por profissional';
COMMENT ON VIEW public.despesas_por_categoria IS 'Despesas agrupadas por categoria e mês';

COMMENT ON FUNCTION user_can_access_financial_data IS 'Verifica se usuário pode acessar dados financeiros da clínica';
COMMENT ON FUNCTION user_can_manage_financial_data IS 'Verifica se usuário pode gerenciar dados financeiros da clínica';
COMMENT ON FUNCTION user_can_view_own_commissions IS 'Verifica se usuário pode ver suas próprias comissões';

-- =====================================================
-- LOG DE CRIAÇÃO
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=== FINANCIAL RLS POLICIES CREATED ===';
    RAISE NOTICE '- 3 auxiliary functions for permission checking';
    RAISE NOTICE '- 12 RLS policies for multi-tenant isolation';
    RAISE NOTICE '- 3 secure views for common queries';
    RAISE NOTICE '- 2 automatic triggers for revenue and expense registration';
    RAISE NOTICE '- Granular access control by user role';
    RAISE NOTICE '- Professional commission visibility';
    RAISE NOTICE '=== FINANCIAL SECURITY READY ===';
END $$;