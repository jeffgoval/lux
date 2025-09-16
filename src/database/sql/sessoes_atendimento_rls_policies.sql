-- RLS Policies para tabela sessoes_atendimento
-- Description: Políticas de segurança multi-tenant para sessões de atendimento
-- Requirements: 6.1, 6.4, 9.1

-- Habilitar RLS na tabela
ALTER TABLE public.sessoes_atendimento ENABLE ROW LEVEL SECURITY;

-- Política para SELECT - Profissionais podem ver sessões da sua clínica
CREATE POLICY "Profissionais podem visualizar sessoes da clinica" ON public.sessoes_atendimento
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM public.prontuarios p
            JOIN public.user_roles ur ON ur.clinica_id = p.clinica_id
            WHERE p.id = sessoes_atendimento.prontuario_id
            AND ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'profissionais', 'medicos')
            AND ur.ativo = true
        )
    );

-- Política para INSERT - Profissionais podem criar sessões para prontuários da sua clínica
CREATE POLICY "Profissionais podem criar sessoes" ON public.sessoes_atendimento
    FOR INSERT
    WITH CHECK (
        -- Verificar se usuário tem permissão na clínica do prontuário
        EXISTS (
            SELECT 1 
            FROM public.prontuarios p
            JOIN public.user_roles ur ON ur.clinica_id = p.clinica_id
            WHERE p.id = sessoes_atendimento.prontuario_id
            AND ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'profissionais', 'medicos')
            AND ur.ativo = true
        )
        AND
        -- Verificar se o profissional da sessão tem permissão na clínica
        EXISTS (
            SELECT 1 
            FROM public.prontuarios p
            JOIN public.user_roles ur ON ur.clinica_id = p.clinica_id
            WHERE p.id = sessoes_atendimento.prontuario_id
            AND ur.user_id = sessoes_atendimento.profissional_id
            AND ur.role IN ('admin', 'profissionais', 'medicos')
            AND ur.ativo = true
        )
        AND
        -- Verificar se template (se especificado) pertence à mesma clínica
        (
            sessoes_atendimento.template_id IS NULL
            OR
            EXISTS (
                SELECT 1 
                FROM public.templates_procedimentos tp
                JOIN public.prontuarios p ON p.clinica_id = tp.clinica_id
                WHERE tp.id = sessoes_atendimento.template_id
                AND p.id = sessoes_atendimento.prontuario_id
                AND tp.ativo = true
            )
        )
    );

-- Política para UPDATE - Profissional responsável ou admin podem editar
CREATE POLICY "Profissional responsavel pode editar sessoes" ON public.sessoes_atendimento
    FOR UPDATE
    USING (
        -- Profissional responsável pela sessão
        profissional_id = auth.uid()
        OR
        -- Admin da clínica
        EXISTS (
            SELECT 1 
            FROM public.prontuarios p
            JOIN public.user_roles ur ON ur.clinica_id = p.clinica_id
            WHERE p.id = sessoes_atendimento.prontuario_id
            AND ur.user_id = auth.uid()
            AND ur.role = 'admin'
            AND ur.ativo = true
        )
    )
    WITH CHECK (
        -- Não permitir mudança de prontuário
        prontuario_id = OLD.prontuario_id
        AND
        -- Verificar se novo profissional tem permissão na clínica
        EXISTS (
            SELECT 1 
            FROM public.prontuarios p
            JOIN public.user_roles ur ON ur.clinica_id = p.clinica_id
            WHERE p.id = sessoes_atendimento.prontuario_id
            AND ur.user_id = sessoes_atendimento.profissional_id
            AND ur.role IN ('admin', 'profissionais', 'medicos')
            AND ur.ativo = true
        )
    );

-- Política para DELETE - Apenas admins podem deletar (soft delete via status)
CREATE POLICY "Admins podem cancelar sessoes" ON public.sessoes_atendimento
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM public.prontuarios p
            JOIN public.user_roles ur ON ur.clinica_id = p.clinica_id
            WHERE p.id = sessoes_atendimento.prontuario_id
            AND ur.user_id = auth.uid()
            AND ur.role = 'admin'
            AND ur.ativo = true
        )
        AND status NOT IN ('cancelada')  -- Não pode cancelar sessão já cancelada
    )
    WITH CHECK (
        status = 'cancelada'  -- Só pode mudar para cancelada
    );

-- Política especial para super admins
CREATE POLICY "Super admins acesso total sessoes" ON public.sessoes_atendimento
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'super_admin'
            AND ur.ativo = true
        )
    );

-- Função para verificar permissão de acesso a sessão específica
CREATE OR REPLACE FUNCTION public.pode_acessar_sessao(p_sessao_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_id UUID := auth.uid();
    sessao_clinica_id UUID;
BEGIN
    -- Verificar se usuário está autenticado
    IF user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Obter clínica da sessão via prontuário
    SELECT p.clinica_id INTO sessao_clinica_id
    FROM public.sessoes_atendimento s
    JOIN public.prontuarios p ON p.id = s.prontuario_id
    WHERE s.id = p_sessao_id;
    
    -- Se sessão não existe, negar acesso
    IF sessao_clinica_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se usuário tem permissão na clínica
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = user_id
        AND ur.clinica_id = sessao_clinica_id
        AND ur.role IN ('admin', 'profissionais', 'medicos', 'super_admin')
        AND ur.ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário pode criar sessão para prontuário
CREATE OR REPLACE FUNCTION public.pode_criar_sessao_prontuario(p_prontuario_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_id UUID := auth.uid();
    prontuario_clinica_id UUID;
BEGIN
    -- Verificar se usuário está autenticado
    IF user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Obter clínica do prontuário
    SELECT clinica_id INTO prontuario_clinica_id
    FROM public.prontuarios
    WHERE id = p_prontuario_id;
    
    -- Se prontuário não existe, negar acesso
    IF prontuario_clinica_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se usuário tem permissão na clínica
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = user_id
        AND ur.clinica_id = prontuario_clinica_id
        AND ur.role IN ('admin', 'profissionais', 'medicos')
        AND ur.ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter sessões por período e clínica
CREATE OR REPLACE FUNCTION public.obter_sessoes_periodo(
    p_clinica_id UUID,
    p_data_inicio DATE,
    p_data_fim DATE,
    p_profissional_id UUID DEFAULT NULL,
    p_tipo_procedimento tipo_procedimento DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    prontuario_id UUID,
    cliente_nome TEXT,
    profissional_nome TEXT,
    tipo_procedimento tipo_procedimento,
    data_atendimento TIMESTAMPTZ,
    status status_sessao,
    valor_total DECIMAL,
    duracao_real_minutos INTEGER
) AS $$
BEGIN
    -- Verificar se usuário tem permissão na clínica
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.clinica_id = p_clinica_id
        AND ur.role IN ('admin', 'profissionais', 'medicos', 'super_admin')
        AND ur.ativo = true
    ) THEN
        RAISE EXCEPTION 'Acesso negado à clínica especificada';
    END IF;
    
    RETURN QUERY
    SELECT 
        s.id,
        s.prontuario_id,
        c.nome_completo as cliente_nome,
        pr.nome_completo as profissional_nome,
        s.tipo_procedimento,
        s.data_atendimento,
        s.status,
        s.valor_total,
        s.duracao_real_minutos
    FROM public.sessoes_atendimento s
    JOIN public.prontuarios p ON p.id = s.prontuario_id
    JOIN public.clientes c ON c.id = p.cliente_id
    JOIN public.profiles pr ON pr.id = s.profissional_id
    WHERE p.clinica_id = p_clinica_id
    AND s.data_atendimento::DATE BETWEEN p_data_inicio AND p_data_fim
    AND (p_profissional_id IS NULL OR s.profissional_id = p_profissional_id)
    AND (p_tipo_procedimento IS NULL OR s.tipo_procedimento = p_tipo_procedimento)
    ORDER BY s.data_atendimento DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON POLICY "Profissionais podem visualizar sessoes da clinica" ON public.sessoes_atendimento IS 'Permite visualização de sessões apenas para profissionais da mesma clínica';
COMMENT ON POLICY "Profissionais podem criar sessoes" ON public.sessoes_atendimento IS 'Permite criação de sessões com validação de permissões e relacionamentos';
COMMENT ON POLICY "Profissional responsavel pode editar sessoes" ON public.sessoes_atendimento IS 'Permite edição apenas pelo profissional responsável ou admin da clínica';
COMMENT ON FUNCTION public.pode_acessar_sessao(UUID) IS 'Verifica se usuário atual pode acessar sessão específica';
COMMENT ON FUNCTION public.pode_criar_sessao_prontuario(UUID) IS 'Verifica se usuário atual pode criar sessão para prontuário específico';
COMMENT ON FUNCTION public.obter_sessoes_periodo(UUID, DATE, DATE, UUID, tipo_procedimento) IS 'Obtém sessões de atendimento por período com filtros opcionais';