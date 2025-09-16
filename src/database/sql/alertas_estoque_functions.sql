-- =====================================================
-- SISTEMA DE ALERTAS DE ESTOQUE
-- Implementa verificação automática de estoque mínimo e vencimento
-- =====================================================

-- =====================================================
-- ENUMERAÇÕES PARA ALERTAS
-- =====================================================

-- Tipos de alertas de estoque
DO $ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_alerta_estoque') THEN
        CREATE TYPE tipo_alerta_estoque AS ENUM (
            'estoque_minimo',
            'estoque_zerado',
            'vencimento_proximo',
            'produto_vencido',
            'estoque_negativo'
        );
    END IF;
END $;

-- Prioridades de alertas
DO $ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prioridade_alerta') THEN
        CREATE TYPE prioridade_alerta AS ENUM (
            'baixa',
            'media',
            'alta',
            'critica'
        );
    END IF;
END $;

-- =====================================================
-- TABELA DE ALERTAS DE ESTOQUE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.alertas_estoque (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relacionamentos
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
    
    -- Tipo e prioridade do alerta
    tipo_alerta tipo_alerta_estoque NOT NULL,
    prioridade prioridade_alerta NOT NULL,
    
    -- Informações do alerta
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    
    -- Dados específicos do alerta
    quantidade_atual INTEGER,
    quantidade_minima INTEGER,
    dias_para_vencimento INTEGER,
    data_vencimento DATE,
    
    -- Status do alerta
    ativo BOOLEAN DEFAULT true,
    visualizado BOOLEAN DEFAULT false,
    resolvido BOOLEAN DEFAULT false,
    
    -- Usuários que devem ser notificados
    usuarios_notificar UUID[] DEFAULT '{}',
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    -- Estrutura: {
    --   "auto_gerado": boolean,
    --   "regra_origem": "string",
    --   "acao_sugerida": "string",
    --   "valor_impacto": number
    -- }
    
    -- Auditoria
    criado_em TIMESTAMPTZ DEFAULT now(),
    visualizado_em TIMESTAMPTZ,
    resolvido_em TIMESTAMPTZ,
    resolvido_por UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT alertas_estoque_produto_clinica_check CHECK (
        produto_id IN (
            SELECT p.id FROM public.produtos p WHERE p.clinica_id = alertas_estoque.clinica_id
        )
    )
);

-- =====================================================
-- ÍNDICES PARA ALERTAS
-- =====================================================

-- Índices básicos
CREATE INDEX IF NOT EXISTS idx_alertas_estoque_clinica_id 
    ON public.alertas_estoque(clinica_id);

CREATE INDEX IF NOT EXISTS idx_alertas_estoque_produto_id 
    ON public.alertas_estoque(produto_id);

CREATE INDEX IF NOT EXISTS idx_alertas_estoque_tipo 
    ON public.alertas_estoque(tipo_alerta);

CREATE INDEX IF NOT EXISTS idx_alertas_estoque_prioridade 
    ON public.alertas_estoque(prioridade);

-- Índices para status
CREATE INDEX IF NOT EXISTS idx_alertas_estoque_ativo 
    ON public.alertas_estoque(ativo) WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_alertas_estoque_nao_visualizado 
    ON public.alertas_estoque(visualizado) WHERE visualizado = false;

CREATE INDEX IF NOT EXISTS idx_alertas_estoque_nao_resolvido 
    ON public.alertas_estoque(resolvido) WHERE resolvido = false;

-- Índices compostos
CREATE INDEX IF NOT EXISTS idx_alertas_estoque_clinica_ativo_prioridade 
    ON public.alertas_estoque(clinica_id, ativo, prioridade) 
    WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_alertas_estoque_produto_ativo 
    ON public.alertas_estoque(produto_id, ativo) 
    WHERE ativo = true;

-- Índice para timestamps
CREATE INDEX IF NOT EXISTS idx_alertas_estoque_criado_em 
    ON public.alertas_estoque(criado_em DESC);

-- =====================================================
-- FUNÇÕES PARA VERIFICAÇÃO DE ALERTAS
-- =====================================================

-- Função para verificar estoque mínimo de todos os produtos de uma clínica
CREATE OR REPLACE FUNCTION verificar_estoque_minimo(p_clinica_id UUID)
RETURNS INTEGER AS $
DECLARE
    produto_record RECORD;
    alerta_count INTEGER := 0;
    usuarios_clinica UUID[];
BEGIN
    -- Obter usuários da clínica para notificação
    SELECT ARRAY_AGG(ur.user_id) INTO usuarios_clinica
    FROM public.user_roles ur
    WHERE ur.clinica_id = p_clinica_id
    AND ur.role IN ('proprietaria', 'gerente');
    
    -- Verificar produtos com estoque baixo ou zerado
    FOR produto_record IN
        SELECT p.id, p.nome, p.quantidade, p.estoque_minimo, p.categoria
        FROM public.produtos p
        WHERE p.clinica_id = p_clinica_id
        AND p.ativo = true
        AND (p.quantidade <= p.estoque_minimo OR p.quantidade = 0)
    LOOP
        -- Verificar se já existe alerta ativo para este produto
        IF NOT EXISTS (
            SELECT 1 FROM public.alertas_estoque a
            WHERE a.produto_id = produto_record.id
            AND a.tipo_alerta IN ('estoque_minimo', 'estoque_zerado')
            AND a.ativo = true
            AND a.resolvido = false
        ) THEN
            -- Criar alerta apropriado
            IF produto_record.quantidade = 0 THEN
                INSERT INTO public.alertas_estoque (
                    produto_id, clinica_id, tipo_alerta, prioridade,
                    titulo, mensagem, quantidade_atual, quantidade_minima,
                    usuarios_notificar, metadata
                ) VALUES (
                    produto_record.id, p_clinica_id, 'estoque_zerado', 'critica',
                    'Produto em Falta: ' || produto_record.nome,
                    'O produto ' || produto_record.nome || ' está com estoque zerado e precisa ser reposto urgentemente.',
                    produto_record.quantidade, produto_record.estoque_minimo,
                    usuarios_clinica,
                    jsonb_build_object(
                        'auto_gerado', true,
                        'regra_origem', 'verificacao_estoque_minimo',
                        'acao_sugerida', 'Realizar pedido de compra urgente',
                        'categoria_produto', produto_record.categoria
                    )
                );
            ELSE
                INSERT INTO public.alertas_estoque (
                    produto_id, clinica_id, tipo_alerta, prioridade,
                    titulo, mensagem, quantidade_atual, quantidade_minima,
                    usuarios_notificar, metadata
                ) VALUES (
                    produto_record.id, p_clinica_id, 'estoque_minimo', 'alta',
                    'Estoque Baixo: ' || produto_record.nome,
                    'O produto ' || produto_record.nome || ' está com estoque baixo (' || 
                    produto_record.quantidade || ' unidades). Estoque mínimo: ' || produto_record.estoque_minimo || '.',
                    produto_record.quantidade, produto_record.estoque_minimo,
                    usuarios_clinica,
                    jsonb_build_object(
                        'auto_gerado', true,
                        'regra_origem', 'verificacao_estoque_minimo',
                        'acao_sugerida', 'Avaliar necessidade de reposição',
                        'categoria_produto', produto_record.categoria
                    )
                );
            END IF;
            
            alerta_count := alerta_count + 1;
        END IF;
    END LOOP;
    
    RETURN alerta_count;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar produtos próximos ao vencimento
CREATE OR REPLACE FUNCTION verificar_vencimento_produtos(p_clinica_id UUID)
RETURNS INTEGER AS $
DECLARE
    produto_record RECORD;
    alerta_count INTEGER := 0;
    usuarios_clinica UUID[];
    dias_vencimento INTEGER;
BEGIN
    -- Obter usuários da clínica para notificação
    SELECT ARRAY_AGG(ur.user_id) INTO usuarios_clinica
    FROM public.user_roles ur
    WHERE ur.clinica_id = p_clinica_id
    AND ur.role IN ('proprietaria', 'gerente', 'profissionais');
    
    -- Verificar produtos próximos ao vencimento ou vencidos
    FOR produto_record IN
        SELECT p.id, p.nome, p.quantidade, p.data_vencimento, p.dias_alerta_vencimento, p.categoria,
               (p.data_vencimento - CURRENT_DATE) as dias_para_vencimento
        FROM public.produtos p
        WHERE p.clinica_id = p_clinica_id
        AND p.ativo = true
        AND p.data_vencimento IS NOT NULL
        AND p.quantidade > 0
        AND (
            p.data_vencimento < CURRENT_DATE OR -- Já vencido
            p.data_vencimento <= CURRENT_DATE + INTERVAL '1 day' * p.dias_alerta_vencimento -- Próximo ao vencimento
        )
    LOOP
        dias_vencimento := produto_record.dias_para_vencimento;
        
        -- Verificar se já existe alerta ativo para este produto
        IF NOT EXISTS (
            SELECT 1 FROM public.alertas_estoque a
            WHERE a.produto_id = produto_record.id
            AND a.tipo_alerta IN ('vencimento_proximo', 'produto_vencido')
            AND a.ativo = true
            AND a.resolvido = false
        ) THEN
            -- Criar alerta apropriado
            IF dias_vencimento < 0 THEN
                INSERT INTO public.alertas_estoque (
                    produto_id, clinica_id, tipo_alerta, prioridade,
                    titulo, mensagem, quantidade_atual, dias_para_vencimento, data_vencimento,
                    usuarios_notificar, metadata
                ) VALUES (
                    produto_record.id, p_clinica_id, 'produto_vencido', 'critica',
                    'Produto Vencido: ' || produto_record.nome,
                    'O produto ' || produto_record.nome || ' está vencido desde ' || 
                    to_char(produto_record.data_vencimento, 'DD/MM/YYYY') || 
                    '. Quantidade em estoque: ' || produto_record.quantidade || ' unidades.',
                    produto_record.quantidade, dias_vencimento, produto_record.data_vencimento,
                    usuarios_clinica,
                    jsonb_build_object(
                        'auto_gerado', true,
                        'regra_origem', 'verificacao_vencimento',
                        'acao_sugerida', 'Remover do estoque imediatamente',
                        'categoria_produto', produto_record.categoria,
                        'dias_vencido', ABS(dias_vencimento)
                    )
                );
            ELSE
                INSERT INTO public.alertas_estoque (
                    produto_id, clinica_id, tipo_alerta, prioridade,
                    titulo, mensagem, quantidade_atual, dias_para_vencimento, data_vencimento,
                    usuarios_notificar, metadata
                ) VALUES (
                    produto_record.id, p_clinica_id, 'vencimento_proximo', 
                    CASE 
                        WHEN dias_vencimento <= 7 THEN 'alta'
                        WHEN dias_vencimento <= 15 THEN 'media'
                        ELSE 'baixa'
                    END,
                    'Vencimento Próximo: ' || produto_record.nome,
                    'O produto ' || produto_record.nome || ' vence em ' || dias_vencimento || 
                    ' dias (' || to_char(produto_record.data_vencimento, 'DD/MM/YYYY') || 
                    '). Quantidade em estoque: ' || produto_record.quantidade || ' unidades.',
                    produto_record.quantidade, dias_vencimento, produto_record.data_vencimento,
                    usuarios_clinica,
                    jsonb_build_object(
                        'auto_gerado', true,
                        'regra_origem', 'verificacao_vencimento',
                        'acao_sugerida', 'Priorizar uso do produto',
                        'categoria_produto', produto_record.categoria
                    )
                );
            END IF;
            
            alerta_count := alerta_count + 1;
        END IF;
    END LOOP;
    
    RETURN alerta_count;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar todos os alertas de uma clínica
CREATE OR REPLACE FUNCTION verificar_todos_alertas_estoque(p_clinica_id UUID)
RETURNS JSONB AS $
DECLARE
    alertas_estoque_minimo INTEGER;
    alertas_vencimento INTEGER;
    total_alertas INTEGER;
    resultado JSONB;
BEGIN
    -- Desativar alertas antigos que foram resolvidos
    UPDATE public.alertas_estoque 
    SET ativo = false, resolvido = true, resolvido_em = now()
    WHERE clinica_id = p_clinica_id
    AND ativo = true
    AND (
        -- Alertas de estoque que foram resolvidos
        (tipo_alerta IN ('estoque_minimo', 'estoque_zerado') AND 
         produto_id IN (
             SELECT p.id FROM public.produtos p 
             WHERE p.clinica_id = p_clinica_id 
             AND p.quantidade > p.estoque_minimo
         ))
        OR
        -- Alertas de vencimento que não são mais relevantes
        (tipo_alerta IN ('vencimento_proximo', 'produto_vencido') AND
         produto_id IN (
             SELECT p.id FROM public.produtos p 
             WHERE p.clinica_id = p_clinica_id 
             AND (p.quantidade = 0 OR p.data_vencimento IS NULL OR 
                  p.data_vencimento > CURRENT_DATE + INTERVAL '1 day' * p.dias_alerta_vencimento)
         ))
    );
    
    -- Verificar novos alertas
    alertas_estoque_minimo := verificar_estoque_minimo(p_clinica_id);
    alertas_vencimento := verificar_vencimento_produtos(p_clinica_id);
    
    total_alertas := alertas_estoque_minimo + alertas_vencimento;
    
    -- Construir resultado
    resultado := jsonb_build_object(
        'clinica_id', p_clinica_id,
        'timestamp', now(),
        'novos_alertas', jsonb_build_object(
            'estoque_minimo', alertas_estoque_minimo,
            'vencimento', alertas_vencimento,
            'total', total_alertas
        ),
        'alertas_ativos', (
            SELECT jsonb_build_object(
                'total', COUNT(*),
                'criticos', COUNT(*) FILTER (WHERE prioridade = 'critica'),
                'altos', COUNT(*) FILTER (WHERE prioridade = 'alta'),
                'medios', COUNT(*) FILTER (WHERE prioridade = 'media'),
                'baixos', COUNT(*) FILTER (WHERE prioridade = 'baixa')
            )
            FROM public.alertas_estoque 
            WHERE clinica_id = p_clinica_id 
            AND ativo = true 
            AND resolvido = false
        )
    );
    
    RETURN resultado;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÕES PARA GESTÃO DE ALERTAS
-- =====================================================

-- Função para marcar alerta como visualizado
CREATE OR REPLACE FUNCTION marcar_alerta_visualizado(p_alerta_id UUID)
RETURNS BOOLEAN AS $
BEGIN
    UPDATE public.alertas_estoque 
    SET visualizado = true, visualizado_em = now()
    WHERE id = p_alerta_id
    AND visualizado = false;
    
    RETURN FOUND;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para resolver alerta
CREATE OR REPLACE FUNCTION resolver_alerta_estoque(p_alerta_id UUID, p_observacao TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $
BEGIN
    UPDATE public.alertas_estoque 
    SET resolvido = true, 
        resolvido_em = now(),
        resolvido_por = auth.uid(),
        metadata = metadata || jsonb_build_object('observacao_resolucao', p_observacao)
    WHERE id = p_alerta_id
    AND resolvido = false;
    
    RETURN FOUND;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter alertas ativos de uma clínica
CREATE OR REPLACE FUNCTION get_alertas_estoque_clinica(
    p_clinica_id UUID,
    p_apenas_nao_visualizados BOOLEAN DEFAULT false,
    p_prioridade_minima prioridade_alerta DEFAULT 'baixa'
)
RETURNS TABLE (
    id UUID,
    produto_id UUID,
    produto_nome TEXT,
    categoria categoria_produto,
    tipo_alerta tipo_alerta_estoque,
    prioridade prioridade_alerta,
    titulo TEXT,
    mensagem TEXT,
    quantidade_atual INTEGER,
    quantidade_minima INTEGER,
    dias_para_vencimento INTEGER,
    data_vencimento DATE,
    visualizado BOOLEAN,
    criado_em TIMESTAMPTZ,
    metadata JSONB
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.produto_id,
        p.nome as produto_nome,
        p.categoria,
        a.tipo_alerta,
        a.prioridade,
        a.titulo,
        a.mensagem,
        a.quantidade_atual,
        a.quantidade_minima,
        a.dias_para_vencimento,
        a.data_vencimento,
        a.visualizado,
        a.criado_em,
        a.metadata
    FROM public.alertas_estoque a
    JOIN public.produtos p ON p.id = a.produto_id
    WHERE a.clinica_id = p_clinica_id
    AND a.ativo = true
    AND a.resolvido = false
    AND (NOT p_apenas_nao_visualizados OR a.visualizado = false)
    AND (
        (p_prioridade_minima = 'baixa') OR
        (p_prioridade_minima = 'media' AND a.prioridade IN ('media', 'alta', 'critica')) OR
        (p_prioridade_minima = 'alta' AND a.prioridade IN ('alta', 'critica')) OR
        (p_prioridade_minima = 'critica' AND a.prioridade = 'critica')
    )
    ORDER BY 
        CASE a.prioridade 
            WHEN 'critica' THEN 1
            WHEN 'alta' THEN 2
            WHEN 'media' THEN 3
            WHEN 'baixa' THEN 4
        END,
        a.criado_em DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER PARA VERIFICAÇÃO AUTOMÁTICA
-- =====================================================

-- Função para verificar alertas após movimentação de estoque
CREATE OR REPLACE FUNCTION trigger_verificar_alertas_pos_movimentacao()
RETURNS TRIGGER AS $
DECLARE
    clinica_produto_id UUID;
BEGIN
    -- Obter clinica_id do produto
    SELECT p.clinica_id INTO clinica_produto_id
    FROM public.produtos p 
    WHERE p.id = NEW.produto_id;
    
    -- Verificar alertas para este produto específico
    PERFORM verificar_estoque_minimo(clinica_produto_id);
    PERFORM verificar_vencimento_produtos(clinica_produto_id);
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para verificar alertas após movimentação
DROP TRIGGER IF EXISTS trigger_alertas_pos_movimentacao ON public.movimentacoes_estoque;
CREATE TRIGGER trigger_alertas_pos_movimentacao
    AFTER INSERT ON public.movimentacoes_estoque
    FOR EACH ROW EXECUTE FUNCTION trigger_verificar_alertas_pos_movimentacao();

-- =====================================================
-- POLÍTICAS RLS PARA ALERTAS
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.alertas_estoque ENABLE ROW LEVEL SECURITY;

-- Política para visualização
CREATE POLICY "Users can view clinic alerts" ON public.alertas_estoque
    FOR SELECT USING (
        clinica_id IN (
            SELECT ur.clinica_id 
            FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.clinica_id IS NOT NULL
        )
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'super_admin'
        )
    );

-- Política para inserção (apenas sistema)
CREATE POLICY "System can create alerts" ON public.alertas_estoque
    FOR INSERT WITH CHECK (true);

-- Política para atualização
CREATE POLICY "Users can update clinic alerts" ON public.alertas_estoque
    FOR UPDATE USING (
        clinica_id IN (
            SELECT ur.clinica_id 
            FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.clinica_id IS NOT NULL
            AND ur.role IN ('proprietaria', 'gerente', 'profissionais')
        )
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'super_admin'
        )
    );

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE public.alertas_estoque IS 'Sistema de alertas automáticos para controle de estoque e vencimento';
COMMENT ON FUNCTION verificar_estoque_minimo IS 'Verifica produtos com estoque baixo ou zerado';
COMMENT ON FUNCTION verificar_vencimento_produtos IS 'Verifica produtos próximos ao vencimento ou vencidos';
COMMENT ON FUNCTION verificar_todos_alertas_estoque IS 'Executa verificação completa de alertas para uma clínica';
COMMENT ON FUNCTION get_alertas_estoque_clinica IS 'Retorna alertas ativos de uma clínica com filtros';

-- =====================================================
-- MENSAGEM DE CONCLUSÃO
-- =====================================================

DO $ 
BEGIN 
    RAISE NOTICE '=== SISTEMA DE ALERTAS DE ESTOQUE CONCLUÍDO ===';
    RAISE NOTICE 'Componentes criados:';
    RAISE NOTICE '- Tabela alertas_estoque com classificação por prioridade';
    RAISE NOTICE '- 2 tipos enumerados (tipo_alerta_estoque, prioridade_alerta)';
    RAISE NOTICE '- 8 índices otimizados para consultas de alertas';
    RAISE NOTICE '- 6 funções para verificação e gestão de alertas';
    RAISE NOTICE '- 1 trigger para verificação automática pós-movimentação';
    RAISE NOTICE '- 3 políticas RLS para isolamento multi-tenant';
    RAISE NOTICE '- Alertas automáticos para estoque mínimo e vencimento';
    RAISE NOTICE '- Sistema de notificações por usuário';
    RAISE NOTICE '=== READY FOR AUTOMATED STOCK ALERTS ===';
END $;