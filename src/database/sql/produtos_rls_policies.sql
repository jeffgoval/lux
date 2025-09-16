-- =====================================================
-- POLÍTICAS RLS PARA SISTEMA DE PRODUTOS E ESTOQUE
-- Implementa isolamento multi-tenant rigoroso
-- =====================================================

-- =====================================================
-- POLÍTICAS RLS PARA FORNECEDORES
-- =====================================================

-- Habilitar RLS para fornecedores
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

-- Política para visualização de fornecedores
CREATE POLICY "Users can view clinic suppliers" ON public.fornecedores
    FOR SELECT USING (
        clinica_id IN (
            SELECT ur.clinica_id 
            FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.clinica_id IS NOT NULL
        )
        OR
        -- Super admin pode ver tudo
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'super_admin'
        )
    );

-- Política para inserção de fornecedores
CREATE POLICY "Users can create clinic suppliers" ON public.fornecedores
    FOR INSERT WITH CHECK (
        clinica_id IN (
            SELECT ur.clinica_id 
            FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.clinica_id IS NOT NULL
            AND ur.role IN ('proprietaria', 'gerente')
        )
    );

-- Política para atualização de fornecedores
CREATE POLICY "Users can update clinic suppliers" ON public.fornecedores
    FOR UPDATE USING (
        clinica_id IN (
            SELECT ur.clinica_id 
            FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.clinica_id IS NOT NULL
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

-- Política para exclusão de fornecedores
CREATE POLICY "Users can delete clinic suppliers" ON public.fornecedores
    FOR DELETE USING (
        clinica_id IN (
            SELECT ur.clinica_id 
            FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.clinica_id IS NOT NULL
            AND ur.role IN ('proprietaria', 'gerente')
        )
        OR
        -- Super admin pode excluir tudo
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'super_admin'
        )
    );

-- =====================================================
-- POLÍTICAS RLS PARA PRODUTOS
-- =====================================================

-- Habilitar RLS para produtos
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Política para visualização de produtos
-- Todos os usuários da clínica podem ver produtos
CREATE POLICY "Users can view clinic products" ON public.produtos
    FOR SELECT USING (
        clinica_id IN (
            SELECT ur.clinica_id 
            FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.clinica_id IS NOT NULL
        )
        OR
        -- Super admin pode ver tudo
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'super_admin'
        )
    );

-- Política para inserção de produtos
-- Proprietárias, gerentes e profissionais podem criar produtos
CREATE POLICY "Users can create clinic products" ON public.produtos
    FOR INSERT WITH CHECK (
        clinica_id IN (
            SELECT ur.clinica_id 
            FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.clinica_id IS NOT NULL
            AND ur.role IN ('proprietaria', 'gerente', 'profissionais')
        )
    );

-- Política para atualização de produtos
-- Proprietárias, gerentes e profissionais podem atualizar produtos
CREATE POLICY "Users can update clinic products" ON public.produtos
    FOR UPDATE USING (
        clinica_id IN (
            SELECT ur.clinica_id 
            FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.clinica_id IS NOT NULL
            AND ur.role IN ('proprietaria', 'gerente', 'profissionais')
        )
        OR
        -- Super admin pode atualizar tudo
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'super_admin'
        )
    );

-- Política para exclusão de produtos
-- Apenas proprietárias e gerentes podem excluir produtos
CREATE POLICY "Users can delete clinic products" ON public.produtos
    FOR DELETE USING (
        clinica_id IN (
            SELECT ur.clinica_id 
            FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.clinica_id IS NOT NULL
            AND ur.role IN ('proprietaria', 'gerente')
        )
        OR
        -- Super admin pode excluir tudo
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'super_admin'
        )
    );

-- =====================================================
-- FUNÇÕES DE SEGURANÇA PARA VALIDAÇÃO
-- =====================================================

-- Função para verificar se usuário pode acessar produto
CREATE OR REPLACE FUNCTION user_can_access_produto(p_produto_id UUID)
RETURNS BOOLEAN AS $
DECLARE
    produto_clinica_id UUID;
BEGIN
    -- Obter clinica_id do produto
    SELECT clinica_id INTO produto_clinica_id
    FROM public.produtos 
    WHERE id = p_produto_id;
    
    -- Verificar se usuário tem acesso à clínica
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.clinica_id = produto_clinica_id
    ) OR EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'super_admin'
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário pode gerenciar estoque
CREATE OR REPLACE FUNCTION user_can_manage_estoque(p_clinica_id UUID)
RETURNS BOOLEAN AS $
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.clinica_id = p_clinica_id
        AND ur.role IN ('proprietaria', 'gerente', 'profissionais')
    ) OR EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'super_admin'
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário pode ver dados financeiros
CREATE OR REPLACE FUNCTION user_can_view_financial_data(p_clinica_id UUID)
RETURNS BOOLEAN AS $
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.clinica_id = p_clinica_id
        AND ur.role IN ('proprietaria', 'gerente')
    ) OR EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'super_admin'
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS SEGURAS PARA CONSULTAS COMUNS
-- =====================================================

-- View para produtos com informações básicas (sem dados financeiros sensíveis)
CREATE OR REPLACE VIEW public.produtos_basicos AS
SELECT 
    p.id,
    p.clinica_id,
    p.nome,
    p.marca,
    p.categoria,
    p.quantidade,
    p.unidade_medida,
    p.estoque_minimo,
    p.data_vencimento,
    p.lote,
    p.localizacao,
    p.status,
    p.descricao,
    p.indicacoes,
    p.contraindicacoes,
    p.modo_uso,
    p.ativo,
    p.criado_em,
    p.atualizado_em,
    f.nome as fornecedor_nome
FROM public.produtos p
LEFT JOIN public.fornecedores f ON f.id = p.fornecedor_id
WHERE p.ativo = true;

-- View para produtos com dados financeiros (apenas para usuários autorizados)
CREATE OR REPLACE VIEW public.produtos_financeiros AS
SELECT 
    p.*,
    f.nome as fornecedor_nome,
    f.condicoes_pagamento as fornecedor_condicoes
FROM public.produtos p
LEFT JOIN public.fornecedores f ON f.id = p.fornecedor_id
WHERE user_can_view_financial_data(p.clinica_id);

-- View para alertas de estoque por clínica
CREATE OR REPLACE VIEW public.alertas_estoque_resumo AS
SELECT 
    a.clinica_id,
    COUNT(*) as total_alertas,
    COUNT(*) FILTER (WHERE a.prioridade = 'critica') as alertas_criticos,
    COUNT(*) FILTER (WHERE a.prioridade = 'alta') as alertas_altos,
    COUNT(*) FILTER (WHERE a.tipo_alerta = 'estoque_zerado') as produtos_em_falta,
    COUNT(*) FILTER (WHERE a.tipo_alerta = 'estoque_minimo') as produtos_estoque_baixo,
    COUNT(*) FILTER (WHERE a.tipo_alerta = 'produto_vencido') as produtos_vencidos,
    COUNT(*) FILTER (WHERE a.tipo_alerta = 'vencimento_proximo') as produtos_vencimento_proximo,
    COUNT(*) FILTER (WHERE a.visualizado = false) as alertas_nao_visualizados
FROM public.alertas_estoque a
WHERE a.ativo = true 
AND a.resolvido = false
GROUP BY a.clinica_id;

-- =====================================================
-- GRANTS E PERMISSÕES
-- =====================================================

-- Conceder acesso às views para usuários autenticados
GRANT SELECT ON public.produtos_basicos TO authenticated;
GRANT SELECT ON public.produtos_financeiros TO authenticated;
GRANT SELECT ON public.alertas_estoque_resumo TO authenticated;

-- Conceder execução das funções de segurança
GRANT EXECUTE ON FUNCTION user_can_access_produto TO authenticated;
GRANT EXECUTE ON FUNCTION user_can_manage_estoque TO authenticated;
GRANT EXECUTE ON FUNCTION user_can_view_financial_data TO authenticated;

-- Conceder execução das funções de alertas
GRANT EXECUTE ON FUNCTION verificar_estoque_minimo TO authenticated;
GRANT EXECUTE ON FUNCTION verificar_vencimento_produtos TO authenticated;
GRANT EXECUTE ON FUNCTION verificar_todos_alertas_estoque TO authenticated;
GRANT EXECUTE ON FUNCTION marcar_alerta_visualizado TO authenticated;
GRANT EXECUTE ON FUNCTION resolver_alerta_estoque TO authenticated;
GRANT EXECUTE ON FUNCTION get_alertas_estoque_clinica TO authenticated;

-- Conceder execução das funções de relatórios
GRANT EXECUTE ON FUNCTION get_produto_historico_movimentacoes TO authenticated;
GRANT EXECUTE ON FUNCTION get_relatorio_movimentacoes_periodo TO authenticated;

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON POLICY "Users can view clinic products" ON public.produtos IS 'Permite visualização de produtos apenas da própria clínica';
COMMENT ON POLICY "Users can create clinic products" ON public.produtos IS 'Permite criação de produtos por proprietárias, gerentes e profissionais';
COMMENT ON POLICY "Users can update clinic products" ON public.produtos IS 'Permite atualização de produtos por proprietárias, gerentes e profissionais';
COMMENT ON POLICY "Users can delete clinic products" ON public.produtos IS 'Permite exclusão de produtos apenas por proprietárias e gerentes';

COMMENT ON VIEW public.produtos_basicos IS 'View segura com informações básicas de produtos (sem dados financeiros)';
COMMENT ON VIEW public.produtos_financeiros IS 'View com dados financeiros (apenas para usuários autorizados)';
COMMENT ON VIEW public.alertas_estoque_resumo IS 'Resumo de alertas de estoque por clínica';

COMMENT ON FUNCTION user_can_access_produto IS 'Verifica se usuário pode acessar um produto específico';
COMMENT ON FUNCTION user_can_manage_estoque IS 'Verifica se usuário pode gerenciar estoque de uma clínica';
COMMENT ON FUNCTION user_can_view_financial_data IS 'Verifica se usuário pode ver dados financeiros de uma clínica';

-- =====================================================
-- MENSAGEM DE CONCLUSÃO
-- =====================================================

DO $ 
BEGIN 
    RAISE NOTICE '=== POLÍTICAS RLS PRODUTOS CONCLUÍDAS ===';
    RAISE NOTICE 'Componentes criados:';
    RAISE NOTICE '- 8 políticas RLS para isolamento multi-tenant';
    RAISE NOTICE '- 3 funções de segurança para validação';
    RAISE NOTICE '- 3 views seguras para consultas comuns';
    RAISE NOTICE '- Grants apropriados para usuários autenticados';
    RAISE NOTICE '- Separação de dados básicos e financeiros';
    RAISE NOTICE '- Controle granular por role de usuário';
    RAISE NOTICE '=== SECURITY POLICIES READY ===';
END $;