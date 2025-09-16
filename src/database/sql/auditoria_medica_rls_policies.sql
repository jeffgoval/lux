-- RLS Policies para sistema de auditoria médica
-- Description: Políticas de segurança para logs de auditoria, assinaturas e versões
-- Requirements: 6.2, 6.5, 9.1

-- Habilitar RLS nas tabelas de auditoria
ALTER TABLE public.auditoria_medica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assinaturas_digitais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.versoes_documentos ENABLE ROW LEVEL SECURITY;

-- ========================================
-- POLÍTICAS PARA AUDITORIA_MEDICA
-- ========================================

-- Política para SELECT - Apenas admins e auditores podem ver logs
CREATE POLICY "Admins podem visualizar auditoria" ON public.auditoria_medica
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.clinica_id = auditoria_medica.clinica_id
            AND ur.role IN ('admin', 'super_admin')
            AND ur.ativo = true
        )
        OR
        -- Usuário pode ver seus próprios logs
        usuario_id = auth.uid()
    );

-- Política para INSERT - Sistema pode inserir logs automaticamente
CREATE POLICY "Sistema pode inserir logs auditoria" ON public.auditoria_medica
    FOR INSERT
    WITH CHECK (
        -- Verificar se usuário tem permissão na clínica
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.clinica_id = auditoria_medica.clinica_id
            AND ur.ativo = true
        )
        AND usuario_id = auth.uid()  -- Só pode inserir logs próprios
    );

-- Política especial para super admins
CREATE POLICY "Super admins acesso total auditoria" ON public.auditoria_medica
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'super_admin'
            AND ur.ativo = true
        )
    );

-- ========================================
-- POLÍTICAS PARA ASSINATURAS_DIGITAIS
-- ========================================

-- Política para SELECT - Profissionais podem ver assinaturas da sua clínica
CREATE POLICY "Profissionais podem visualizar assinaturas da clinica" ON public.assinaturas_digitais
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.clinica_id = assinaturas_digitais.clinica_id
            AND ur.role IN ('admin', 'profissionais', 'medicos')
            AND ur.ativo = true
        )
    );

-- Política para INSERT - Profissionais podem criar assinaturas
CREATE POLICY "Profissionais podem criar assinaturas" ON public.assinaturas_digitais
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.clinica_id = assinaturas_digitais.clinica_id
            AND ur.role IN ('admin', 'profissionais', 'medicos')
            AND ur.ativo = true
        )
        AND signatario_id = auth.uid()  -- Só pode assinar em próprio nome
    );

-- Política para UPDATE - Apenas o signatário pode atualizar status
CREATE POLICY "Signatario pode atualizar assinatura" ON public.assinaturas_digitais
    FOR UPDATE
    USING (
        signatario_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.clinica_id = assinaturas_digitais.clinica_id
            AND ur.role = 'admin'
            AND ur.ativo = true
        )
    )
    WITH CHECK (
        -- Não permitir mudança de dados críticos
        signatario_id = OLD.signatario_id
        AND clinica_id = OLD.clinica_id
        AND tipo_entidade = OLD.tipo_entidade
        AND entidade_id = OLD.entidade_id
    );

-- Política especial para super admins
CREATE POLICY "Super admins acesso total assinaturas" ON public.assinaturas_digitais
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'super_admin'
            AND ur.ativo = true
        )
    );

-- ========================================
-- POLÍTICAS PARA VERSOES_DOCUMENTOS
-- ========================================

-- Política para SELECT - Profissionais podem ver versões da sua clínica
CREATE POLICY "Profissionais podem visualizar versoes da clinica" ON public.versoes_documentos
    FOR SELECT
    USING (
        -- Verificar permissão baseada no tipo de entidade
        CASE tipo_entidade
            WHEN 'prontuario' THEN
                EXISTS (
                    SELECT 1 
                    FROM public.prontuarios p
                    JOIN public.user_roles ur ON ur.clinica_id = p.clinica_id
                    WHERE p.id = versoes_documentos.entidade_id
                    AND ur.user_id = auth.uid()
                    AND ur.role IN ('admin', 'profissionais', 'medicos')
                    AND ur.ativo = true
                )
            WHEN 'sessao_atendimento' THEN
                EXISTS (
                    SELECT 1 
                    FROM public.sessoes_atendimento s
                    JOIN public.prontuarios p ON p.id = s.prontuario_id
                    JOIN public.user_roles ur ON ur.clinica_id = p.clinica_id
                    WHERE s.id = versoes_documentos.entidade_id
                    AND ur.user_id = auth.uid()
                    AND ur.role IN ('admin', 'profissionais', 'medicos')
                    AND ur.ativo = true
                )
            ELSE false
        END
    );

-- Política para INSERT - Profissionais podem criar versões
CREATE POLICY "Profissionais podem criar versoes" ON public.versoes_documentos
    FOR INSERT
    WITH CHECK (
        -- Verificar permissão baseada no tipo de entidade
        CASE tipo_entidade
            WHEN 'prontuario' THEN
                EXISTS (
                    SELECT 1 
                    FROM public.prontuarios p
                    JOIN public.user_roles ur ON ur.clinica_id = p.clinica_id
                    WHERE p.id = versoes_documentos.entidade_id
                    AND ur.user_id = auth.uid()
                    AND ur.role IN ('admin', 'profissionais', 'medicos')
                    AND ur.ativo = true
                )
            WHEN 'sessao_atendimento' THEN
                EXISTS (
                    SELECT 1 
                    FROM public.sessoes_atendimento s
                    JOIN public.prontuarios p ON p.id = s.prontuario_id
                    JOIN public.user_roles ur ON ur.clinica_id = p.clinica_id
                    WHERE s.id = versoes_documentos.entidade_id
                    AND ur.user_id = auth.uid()
                    AND ur.role IN ('admin', 'profissionais', 'medicos')
                    AND ur.ativo = true
                )
            ELSE false
        END
        AND criado_por = auth.uid()  -- Só pode criar versões em próprio nome
    );

-- Política especial para super admins
CREATE POLICY "Super admins acesso total versoes" ON public.versoes_documentos
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'super_admin'
            AND ur.ativo = true
        )
    );

-- ========================================
-- FUNÇÕES DE CONSULTA SEGURA
-- ========================================

-- Função para obter histórico de auditoria de uma entidade
CREATE OR REPLACE FUNCTION public.obter_historico_auditoria(
    p_tipo_entidade tipo_entidade_auditoria,
    p_entidade_id UUID,
    p_limite INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    tipo_operacao tipo_operacao_auditoria,
    usuario_nome TEXT,
    timestamp_operacao TIMESTAMPTZ,
    campos_alterados TEXT[],
    motivo_alteracao TEXT
) AS $$
DECLARE
    clinica_id_var UUID;
BEGIN
    -- Determinar clínica baseada no tipo de entidade
    CASE p_tipo_entidade
        WHEN 'prontuario' THEN
            SELECT p.clinica_id INTO clinica_id_var
            FROM public.prontuarios p
            WHERE p.id = p_entidade_id;
        WHEN 'sessao_atendimento' THEN
            SELECT pr.clinica_id INTO clinica_id_var
            FROM public.sessoes_atendimento s
            JOIN public.prontuarios pr ON pr.id = s.prontuario_id
            WHERE s.id = p_entidade_id;
    END CASE;
    
    -- Verificar se usuário tem permissão
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.clinica_id = clinica_id_var
        AND ur.role IN ('admin', 'profissionais', 'medicos', 'super_admin')
        AND ur.ativo = true
    ) THEN
        RAISE EXCEPTION 'Acesso negado ao histórico de auditoria';
    END IF;
    
    RETURN QUERY
    SELECT 
        a.id,
        a.tipo_operacao,
        pr.nome_completo as usuario_nome,
        a.timestamp_operacao,
        a.campos_alterados,
        a.motivo_alteracao
    FROM public.auditoria_medica a
    JOIN public.profiles pr ON pr.id = a.usuario_id
    WHERE a.tipo_entidade = p_tipo_entidade
    AND a.entidade_id = p_entidade_id
    ORDER BY a.timestamp_operacao DESC
    LIMIT p_limite;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter assinaturas de um documento
CREATE OR REPLACE FUNCTION public.obter_assinaturas_documento(
    p_tipo_entidade tipo_entidade_auditoria,
    p_entidade_id UUID
)
RETURNS TABLE (
    id UUID,
    signatario_nome TEXT,
    status status_assinatura,
    data_assinatura TIMESTAMPTZ,
    observacoes TEXT
) AS $$
DECLARE
    clinica_id_var UUID;
BEGIN
    -- Determinar clínica baseada no tipo de entidade
    CASE p_tipo_entidade
        WHEN 'prontuario' THEN
            SELECT p.clinica_id INTO clinica_id_var
            FROM public.prontuarios p
            WHERE p.id = p_entidade_id;
        WHEN 'sessao_atendimento' THEN
            SELECT pr.clinica_id INTO clinica_id_var
            FROM public.sessoes_atendimento s
            JOIN public.prontuarios pr ON pr.id = s.prontuario_id
            WHERE s.id = p_entidade_id;
    END CASE;
    
    -- Verificar se usuário tem permissão
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.clinica_id = clinica_id_var
        AND ur.role IN ('admin', 'profissionais', 'medicos', 'super_admin')
        AND ur.ativo = true
    ) THEN
        RAISE EXCEPTION 'Acesso negado às assinaturas do documento';
    END IF;
    
    RETURN QUERY
    SELECT 
        a.id,
        pr.nome_completo as signatario_nome,
        a.status,
        a.data_assinatura,
        a.observacoes
    FROM public.assinaturas_digitais a
    JOIN public.profiles pr ON pr.id = a.signatario_id
    WHERE a.tipo_entidade = p_tipo_entidade
    AND a.entidade_id = p_entidade_id
    ORDER BY a.data_assinatura DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter versões de um documento
CREATE OR REPLACE FUNCTION public.obter_versoes_documento(
    p_tipo_entidade tipo_entidade_auditoria,
    p_entidade_id UUID
)
RETURNS TABLE (
    id UUID,
    numero_versao INTEGER,
    criado_por_nome TEXT,
    criado_em TIMESTAMPTZ,
    motivo_versao TEXT
) AS $$
DECLARE
    clinica_id_var UUID;
BEGIN
    -- Determinar clínica baseada no tipo de entidade
    CASE p_tipo_entidade
        WHEN 'prontuario' THEN
            SELECT p.clinica_id INTO clinica_id_var
            FROM public.prontuarios p
            WHERE p.id = p_entidade_id;
        WHEN 'sessao_atendimento' THEN
            SELECT pr.clinica_id INTO clinica_id_var
            FROM public.sessoes_atendimento s
            JOIN public.prontuarios pr ON pr.id = s.prontuario_id
            WHERE s.id = p_entidade_id;
    END CASE;
    
    -- Verificar se usuário tem permissão
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.clinica_id = clinica_id_var
        AND ur.role IN ('admin', 'profissionais', 'medicos', 'super_admin')
        AND ur.ativo = true
    ) THEN
        RAISE EXCEPTION 'Acesso negado às versões do documento';
    END IF;
    
    RETURN QUERY
    SELECT 
        v.id,
        v.numero_versao,
        pr.nome_completo as criado_por_nome,
        v.criado_em,
        v.motivo_versao
    FROM public.versoes_documentos v
    JOIN public.profiles pr ON pr.id = v.criado_por
    WHERE v.tipo_entidade = p_tipo_entidade
    AND v.entidade_id = p_entidade_id
    ORDER BY v.numero_versao DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON POLICY "Admins podem visualizar auditoria" ON public.auditoria_medica IS 'Permite visualização de logs apenas para admins e próprio usuário';
COMMENT ON POLICY "Sistema pode inserir logs auditoria" ON public.auditoria_medica IS 'Permite inserção automática de logs pelo sistema';
COMMENT ON FUNCTION public.obter_historico_auditoria(tipo_entidade_auditoria, UUID, INTEGER) IS 'Obtém histórico de auditoria de uma entidade específica';
COMMENT ON FUNCTION public.obter_assinaturas_documento(tipo_entidade_auditoria, UUID) IS 'Obtém assinaturas digitais de um documento';
COMMENT ON FUNCTION public.obter_versoes_documento(tipo_entidade_auditoria, UUID) IS 'Obtém versões de um documento médico';