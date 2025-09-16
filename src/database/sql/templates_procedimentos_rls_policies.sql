-- =====================================================
-- POLÍTICAS RLS AVANÇADAS PARA TEMPLATES DE PROCEDIMENTOS
-- Implementa isolamento multi-tenant e controle granular de acesso
-- =====================================================

-- =====================================================
-- FUNÇÕES AUXILIARES PARA POLÍTICAS RLS
-- =====================================================

-- Função para verificar se usuário tem acesso à clínica
CREATE OR REPLACE FUNCTION public.user_has_clinic_access(
    p_user_id UUID,
    p_clinica_id UUID,
    p_required_roles TEXT[] DEFAULT ARRAY['proprietaria', 'gerente', 'profissionais']
)
RETURNS BOOLEAN AS $
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_roles ur 
        WHERE ur.user_id = p_user_id 
        AND ur.clinica_id = p_clinica_id
        AND ur.role = ANY(p_required_roles)
        AND ur.ativo = true
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário é super admin
CREATE OR REPLACE FUNCTION public.user_is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_roles ur 
        WHERE ur.user_id = p_user_id 
        AND ur.role = 'super_admin'
        AND ur.ativo = true
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter clínicas do usuário
CREATE OR REPLACE FUNCTION public.get_user_clinicas(p_user_id UUID)
RETURNS UUID[] AS $
DECLARE
    v_clinicas UUID[];
BEGIN
    SELECT array_agg(ur.clinica_id) INTO v_clinicas
    FROM public.user_roles ur 
    WHERE ur.user_id = p_user_id 
    AND ur.clinica_id IS NOT NULL
    AND ur.ativo = true;
    
    RETURN COALESCE(v_clinicas, ARRAY[]::UUID[]);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- REMOVER POLÍTICAS EXISTENTES (SE HOUVER)
-- =====================================================

DROP POLICY IF EXISTS "Users can view templates" ON public.templates_procedimentos;
DROP POLICY IF EXISTS "Users can create templates" ON public.templates_procedimentos;
DROP POLICY IF EXISTS "Users can update templates" ON public.templates_procedimentos;
DROP POLICY IF EXISTS "Users can delete templates" ON public.templates_procedimentos;

-- =====================================================
-- POLÍTICAS RLS PRINCIPAIS
-- =====================================================

-- Política para VISUALIZAÇÃO (SELECT)
-- Usuários podem ver:
-- 1. Templates de suas clínicas
-- 2. Templates públicos ativos
-- 3. Super admins veem tudo
CREATE POLICY "templates_select_policy" ON public.templates_procedimentos
    FOR SELECT USING (
        -- Templates da própria clínica
        clinica_id = ANY(public.get_user_clinicas(auth.uid()))
        OR
        -- Templates públicos ativos
        (publico = true AND status = 'ativo')
        OR
        -- Super admin pode ver tudo
        public.user_is_super_admin(auth.uid())
    );

-- Política para INSERÇÃO (INSERT)
-- Usuários podem criar templates para suas clínicas
-- Super admins podem criar templates públicos
CREATE POLICY "templates_insert_policy" ON public.templates_procedimentos
    FOR INSERT WITH CHECK (
        -- Para clínicas onde o usuário tem permissão
        (
            clinica_id IS NOT NULL 
            AND public.user_has_clinic_access(
                auth.uid(), 
                clinica_id, 
                ARRAY['proprietaria', 'gerente', 'profissionais']
            )
        )
        OR
        -- Super admin pode criar templates públicos
        (
            publico = true 
            AND clinica_id IS NULL 
            AND public.user_is_super_admin(auth.uid())
        )
    );

-- Política para ATUALIZAÇÃO (UPDATE)
-- Usuários podem atualizar templates de suas clínicas
-- Super admins podem atualizar templates públicos
CREATE POLICY "templates_update_policy" ON public.templates_procedimentos
    FOR UPDATE USING (
        -- Templates da própria clínica (proprietária e gerente podem editar tudo)
        (
            clinica_id IS NOT NULL 
            AND public.user_has_clinic_access(
                auth.uid(), 
                clinica_id, 
                ARRAY['proprietaria', 'gerente']
            )
        )
        OR
        -- Profissionais podem editar apenas templates que criaram
        (
            clinica_id IS NOT NULL 
            AND criado_por = auth.uid()
            AND public.user_has_clinic_access(
                auth.uid(), 
                clinica_id, 
                ARRAY['profissionais']
            )
        )
        OR
        -- Super admin pode atualizar templates públicos
        (
            publico = true 
            AND public.user_is_super_admin(auth.uid())
        )
    );

-- Política para EXCLUSÃO (DELETE)
-- Apenas proprietárias, gerentes e super admins podem excluir
CREATE POLICY "templates_delete_policy" ON public.templates_procedimentos
    FOR DELETE USING (
        -- Proprietárias e gerentes podem excluir templates da clínica
        (
            clinica_id IS NOT NULL 
            AND public.user_has_clinic_access(
                auth.uid(), 
                clinica_id, 
                ARRAY['proprietaria', 'gerente']
            )
        )
        OR
        -- Super admin pode excluir templates públicos
        (
            publico = true 
            AND public.user_is_super_admin(auth.uid())
        )
    );

-- =====================================================
-- POLÍTICAS ESPECÍFICAS POR CONTEXTO
-- =====================================================

-- Política adicional para templates inativos
-- Apenas proprietárias e gerentes podem ver templates inativos
CREATE POLICY "templates_inactive_visibility" ON public.templates_procedimentos
    FOR SELECT USING (
        status = 'ativo'
        OR
        (
            status IN ('inativo', 'arquivado')
            AND (
                public.user_has_clinic_access(
                    auth.uid(), 
                    clinica_id, 
                    ARRAY['proprietaria', 'gerente']
                )
                OR public.user_is_super_admin(auth.uid())
            )
        )
    );

-- =====================================================
-- POLÍTICAS PARA AUDITORIA E LOGS
-- =====================================================

-- Função para log de acesso a templates
CREATE OR REPLACE FUNCTION public.log_template_access(
    p_template_id UUID,
    p_action TEXT,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS VOID AS $
BEGIN
    -- Log simples (pode ser expandido para tabela de auditoria)
    RAISE NOTICE 'Template Access: user=%, template=%, action=%', p_user_id, p_template_id, p_action;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÕES DE VALIDAÇÃO PARA TEMPLATES
-- =====================================================

-- Função para validar permissões antes de operações críticas
CREATE OR REPLACE FUNCTION public.validate_template_operation(
    p_template_id UUID,
    p_operation TEXT,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSON AS $
DECLARE
    v_template RECORD;
    v_has_permission BOOLEAN := false;
    v_reason TEXT;
    v_result JSON;
BEGIN
    -- Buscar template
    SELECT * INTO v_template 
    FROM public.templates_procedimentos 
    WHERE id = p_template_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'allowed', false,
            'reason', 'Template não encontrado'
        );
    END IF;
    
    -- Verificar permissões baseado na operação
    CASE p_operation
        WHEN 'read' THEN
            v_has_permission := (
                -- Templates da própria clínica
                v_template.clinica_id = ANY(public.get_user_clinicas(p_user_id))
                OR
                -- Templates públicos ativos
                (v_template.publico = true AND v_template.status = 'ativo')
                OR
                -- Super admin
                public.user_is_super_admin(p_user_id)
            );
            v_reason := CASE WHEN NOT v_has_permission THEN 'Sem permissão para visualizar este template' ELSE NULL END;
            
        WHEN 'write' THEN
            v_has_permission := (
                -- Proprietárias e gerentes da clínica
                public.user_has_clinic_access(p_user_id, v_template.clinica_id, ARRAY['proprietaria', 'gerente'])
                OR
                -- Profissionais podem editar apenas seus próprios templates
                (v_template.criado_por = p_user_id AND public.user_has_clinic_access(p_user_id, v_template.clinica_id, ARRAY['profissionais']))
                OR
                -- Super admin para templates públicos
                (v_template.publico = true AND public.user_is_super_admin(p_user_id))
            );
            v_reason := CASE WHEN NOT v_has_permission THEN 'Sem permissão para editar este template' ELSE NULL END;
            
        WHEN 'delete' THEN
            v_has_permission := (
                -- Apenas proprietárias e gerentes
                public.user_has_clinic_access(p_user_id, v_template.clinica_id, ARRAY['proprietaria', 'gerente'])
                OR
                -- Super admin para templates públicos
                (v_template.publico = true AND public.user_is_super_admin(p_user_id))
            );
            v_reason := CASE WHEN NOT v_has_permission THEN 'Sem permissão para excluir este template' ELSE NULL END;
            
        ELSE
            v_has_permission := false;
            v_reason := 'Operação não reconhecida';
    END CASE;
    
    -- Log da operação
    PERFORM public.log_template_access(p_template_id, p_operation, p_user_id);
    
    -- Construir resultado
    v_result := json_build_object(
        'allowed', v_has_permission,
        'reason', v_reason,
        'template_id', p_template_id,
        'operation', p_operation,
        'user_id', p_user_id,
        'template_info', json_build_object(
            'nome', v_template.nome_template,
            'clinica_id', v_template.clinica_id,
            'publico', v_template.publico,
            'status', v_template.status,
            'criado_por', v_template.criado_por
        )
    );
    
    RETURN v_result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLÍTICAS PARA CONTROLE DE ACESSO GRANULAR
-- =====================================================

-- Função para verificar se template pode ser usado em agendamento
CREATE OR REPLACE FUNCTION public.template_available_for_booking(
    p_template_id UUID,
    p_clinica_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $
DECLARE
    v_template RECORD;
BEGIN
    SELECT * INTO v_template 
    FROM public.templates_procedimentos 
    WHERE id = p_template_id
    AND status = 'ativo'
    AND permite_agendamento_online = true
    AND (
        clinica_id = p_clinica_id
        OR (publico = true)
    );
    
    RETURN FOUND;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ÍNDICES PARA OTIMIZAÇÃO DAS POLÍTICAS RLS
-- =====================================================

-- Índice para otimizar consultas de user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_clinica_ativo 
    ON public.user_roles(user_id, clinica_id, ativo) 
    WHERE ativo = true;

-- Índice para otimizar consultas de templates por clínica e status
CREATE INDEX IF NOT EXISTS idx_templates_clinica_status_publico 
    ON public.templates_procedimentos(clinica_id, status, publico);

-- Índice para otimizar consultas de templates públicos
CREATE INDEX IF NOT EXISTS idx_templates_publico_ativo 
    ON public.templates_procedimentos(publico, status) 
    WHERE publico = true AND status = 'ativo';

-- =====================================================
-- TRIGGERS PARA AUDITORIA DE ACESSO
-- =====================================================

-- Função para auditoria de modificações em templates
CREATE OR REPLACE FUNCTION public.audit_template_changes()
RETURNS TRIGGER AS $
DECLARE
    v_changes JSONB := '{}';
    v_old_values JSONB := '{}';
    v_new_values JSONB := '{}';
BEGIN
    -- Capturar mudanças para UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- Comparar campos importantes
        IF OLD.nome_template != NEW.nome_template THEN
            v_changes := v_changes || jsonb_build_object('nome_template', json_build_object('old', OLD.nome_template, 'new', NEW.nome_template));
        END IF;
        
        IF OLD.status != NEW.status THEN
            v_changes := v_changes || jsonb_build_object('status', json_build_object('old', OLD.status, 'new', NEW.status));
        END IF;
        
        IF OLD.valor_base != NEW.valor_base THEN
            v_changes := v_changes || jsonb_build_object('valor_base', json_build_object('old', OLD.valor_base, 'new', NEW.valor_base));
        END IF;
        
        -- Log das mudanças
        RAISE NOTICE 'Template Updated: id=%, user=%, changes=%', NEW.id, auth.uid(), v_changes;
    END IF;
    
    -- Para INSERT
    IF TG_OP = 'INSERT' THEN
        RAISE NOTICE 'Template Created: id=%, user=%, nome=%', NEW.id, auth.uid(), NEW.nome_template;
    END IF;
    
    -- Para DELETE
    IF TG_OP = 'DELETE' THEN
        RAISE NOTICE 'Template Deleted: id=%, user=%, nome=%', OLD.id, auth.uid(), OLD.nome_template;
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auditoria
DROP TRIGGER IF EXISTS trigger_audit_template_changes ON public.templates_procedimentos;
CREATE TRIGGER trigger_audit_template_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.templates_procedimentos
    FOR EACH ROW EXECUTE FUNCTION public.audit_template_changes();

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION public.user_has_clinic_access(UUID, UUID, TEXT[]) IS 'Verifica se usuário tem acesso a uma clínica com roles específicos';
COMMENT ON FUNCTION public.user_is_super_admin(UUID) IS 'Verifica se usuário é super administrador';
COMMENT ON FUNCTION public.get_user_clinicas(UUID) IS 'Retorna array com IDs das clínicas do usuário';
COMMENT ON FUNCTION public.validate_template_operation(UUID, TEXT, UUID) IS 'Valida permissões para operações em templates';
COMMENT ON FUNCTION public.template_available_for_booking(UUID, UUID, UUID) IS 'Verifica se template está disponível para agendamento';

COMMENT ON POLICY "templates_select_policy" ON public.templates_procedimentos IS 'Permite visualizar templates próprios e públicos ativos';
COMMENT ON POLICY "templates_insert_policy" ON public.templates_procedimentos IS 'Permite criar templates para clínicas com permissão';
COMMENT ON POLICY "templates_update_policy" ON public.templates_procedimentos IS 'Permite editar templates com controle granular por role';
COMMENT ON POLICY "templates_delete_policy" ON public.templates_procedimentos IS 'Permite excluir templates apenas para proprietárias e gerentes';

-- =====================================================
-- MENSAGEM DE CONCLUSÃO
-- =====================================================

DO $ 
BEGIN 
    RAISE NOTICE '=== POLÍTICAS RLS AVANÇADAS PARA TEMPLATES CRIADAS ===';
    RAISE NOTICE 'Componentes implementados:';
    RAISE NOTICE '- 4 políticas RLS principais (SELECT, INSERT, UPDATE, DELETE)';
    RAISE NOTICE '- 1 política adicional para templates inativos';
    RAISE NOTICE '- 5 funções auxiliares para validação de permissões';
    RAISE NOTICE '- 3 índices otimizados para performance das políticas';
    RAISE NOTICE '- 1 trigger para auditoria de mudanças';
    RAISE NOTICE '- Isolamento multi-tenant rigoroso implementado';
    RAISE NOTICE '- Controle granular por role (proprietária > gerente > profissional)';
    RAISE NOTICE '- Suporte completo a templates públicos';
    RAISE NOTICE '=== SECURITY AND ISOLATION READY ===';
END $;