-- RLS Policies para tabela prontuarios
-- Description: Políticas de segurança multi-tenant para prontuários médicos
-- Requirements: 6.1, 6.2, 9.1

-- Habilitar RLS na tabela
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;

-- Política para SELECT - Profissionais podem ver prontuários da sua clínica
CREATE POLICY "Profissionais podem visualizar prontuarios da clinica" ON public.prontuarios
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.clinica_id = prontuarios.clinica_id
            AND ur.role IN ('admin', 'profissionais', 'medicos')
            AND ur.ativo = true
        )
    );

-- Política para INSERT - Apenas profissionais autorizados podem criar prontuários
CREATE POLICY "Profissionais podem criar prontuarios" ON public.prontuarios
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.clinica_id = prontuarios.clinica_id
            AND ur.role IN ('admin', 'profissionais', 'medicos')
            AND ur.ativo = true
        )
        AND
        -- Verificar se o médico responsável tem permissão na clínica
        EXISTS (
            SELECT 1 FROM public.user_roles ur2
            WHERE ur2.user_id = prontuarios.medico_responsavel_id
            AND ur2.clinica_id = prontuarios.clinica_id
            AND ur2.role IN ('admin', 'profissionais', 'medicos')
            AND ur2.ativo = true
        )
        AND
        -- Verificar se o cliente pertence à clínica
        EXISTS (
            SELECT 1 FROM public.clientes c
            WHERE c.id = prontuarios.cliente_id
            AND c.clinica_id = prontuarios.clinica_id
        )
    );

-- Política para UPDATE - Apenas médicos responsáveis ou admins podem editar
CREATE POLICY "Medicos responsaveis podem editar prontuarios" ON public.prontuarios
    FOR UPDATE
    USING (
        -- Médico responsável pelo prontuário
        medico_responsavel_id = auth.uid()
        OR
        -- Admin da clínica
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.clinica_id = prontuarios.clinica_id
            AND ur.role = 'admin'
            AND ur.ativo = true
        )
    )
    WITH CHECK (
        -- Não permitir mudança de clínica ou cliente
        clinica_id = OLD.clinica_id
        AND cliente_id = OLD.cliente_id
        AND
        -- Verificar se o novo médico responsável tem permissão
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = medico_responsavel_id
            AND ur.clinica_id = clinica_id
            AND ur.role IN ('admin', 'profissionais', 'medicos')
            AND ur.ativo = true
        )
    );

-- Política para DELETE - Apenas admins podem arquivar (soft delete via status)
CREATE POLICY "Admins podem arquivar prontuarios" ON public.prontuarios
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.clinica_id = prontuarios.clinica_id
            AND ur.role = 'admin'
            AND ur.ativo = true
        )
        AND status = 'ativo'  -- Só pode arquivar prontuários ativos
    )
    WITH CHECK (
        status IN ('arquivado', 'transferido')  -- Só pode mudar para estes status
    );

-- Política especial para super admins (acesso total para manutenção)
CREATE POLICY "Super admins acesso total" ON public.prontuarios
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'super_admin'
            AND ur.ativo = true
        )
    );

-- Função para verificar permissão de acesso a prontuário específico
CREATE OR REPLACE FUNCTION public.pode_acessar_prontuario(p_prontuario_id UUID)
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
        AND ur.role IN ('admin', 'profissionais', 'medicos', 'super_admin')
        AND ur.ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário pode criar prontuário para cliente
CREATE OR REPLACE FUNCTION public.pode_criar_prontuario_cliente(p_cliente_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_id UUID := auth.uid();
    cliente_clinica_id UUID;
BEGIN
    -- Verificar se usuário está autenticado
    IF user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Obter clínica do cliente
    SELECT clinica_id INTO cliente_clinica_id
    FROM public.clientes
    WHERE id = p_cliente_id;
    
    -- Se cliente não existe, negar acesso
    IF cliente_clinica_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se usuário tem permissão na clínica
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = user_id
        AND ur.clinica_id = cliente_clinica_id
        AND ur.role IN ('admin', 'profissionais', 'medicos')
        AND ur.ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON POLICY "Profissionais podem visualizar prontuarios da clinica" ON public.prontuarios IS 'Permite visualização de prontuários apenas para profissionais da mesma clínica';
COMMENT ON POLICY "Profissionais podem criar prontuarios" ON public.prontuarios IS 'Permite criação de prontuários com validação de permissões e relacionamentos';
COMMENT ON POLICY "Medicos responsaveis podem editar prontuarios" ON public.prontuarios IS 'Permite edição apenas pelo médico responsável ou admin da clínica';
COMMENT ON FUNCTION public.pode_acessar_prontuario(UUID) IS 'Verifica se usuário atual pode acessar prontuário específico';
COMMENT ON FUNCTION public.pode_criar_prontuario_cliente(UUID) IS 'Verifica se usuário atual pode criar prontuário para cliente específico';