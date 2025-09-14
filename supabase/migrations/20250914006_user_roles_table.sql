-- =============================================================================
-- MIGRAÇÃO 006: TABELA USER_ROLES
-- =============================================================================
-- Data: 2025-09-14
-- Descrição: Cria a tabela de roles de usuários (multi-tenant permissions)
-- Dependências: 001_foundation_types_functions.sql, 003_profiles_table.sql, 
--               004_organizacoes_table.sql, 005_clinicas_table.sql
-- Rollback: DROP da tabela user_roles

-- =============================================================================
-- TABELA: user_roles
-- =============================================================================
-- Roles contextuais dos usuários por organização/clínica (multi-tenant)

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Referências principais
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE,
    
    -- Role e permissões
    role user_role_type NOT NULL,
    
    -- Status e datas
    ativo BOOLEAN NOT NULL DEFAULT true,
    data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    data_fim DATE,
    
    -- Informações adicionais
    observacoes TEXT,
    
    -- Auditoria
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    criado_por UUID NOT NULL REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT user_roles_date_logic CHECK (
        data_fim IS NULL OR data_fim > data_inicio
    ),
    CONSTRAINT user_roles_context_required CHECK (
        organizacao_id IS NOT NULL OR clinica_id IS NOT NULL
    ),
    CONSTRAINT user_roles_unique_active UNIQUE(
        user_id, organizacao_id, clinica_id, role
    ) DEFERRABLE INITIALLY DEFERRED
);

-- =============================================================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
    ON public.user_roles(user_id);
    
CREATE INDEX IF NOT EXISTS idx_user_roles_organizacao_id 
    ON public.user_roles(organizacao_id) 
    WHERE organizacao_id IS NOT NULL;
    
CREATE INDEX IF NOT EXISTS idx_user_roles_clinica_id 
    ON public.user_roles(clinica_id) 
    WHERE clinica_id IS NOT NULL;
    
CREATE INDEX IF NOT EXISTS idx_user_roles_role 
    ON public.user_roles(role);
    
CREATE INDEX IF NOT EXISTS idx_user_roles_ativo 
    ON public.user_roles(ativo);
    
CREATE INDEX IF NOT EXISTS idx_user_roles_data_fim 
    ON public.user_roles(data_fim) 
    WHERE data_fim IS NOT NULL;
    
CREATE INDEX IF NOT EXISTS idx_user_roles_composite 
    ON public.user_roles(user_id, organizacao_id, clinica_id, ativo);
    
CREATE INDEX IF NOT EXISTS idx_user_roles_criado_por 
    ON public.user_roles(criado_por);

-- =============================================================================
-- FUNÇÃO PARA VALIDAR CONTEXT E CONSISTÊNCIA
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_user_role_context()
RETURNS TRIGGER AS $$
BEGIN
    -- Se tem clinica_id, verificar se a clínica pertence à organização (se especificada)
    IF NEW.clinica_id IS NOT NULL AND NEW.organizacao_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.clinicas c
            WHERE c.id = NEW.clinica_id
            AND c.organizacao_id = NEW.organizacao_id
        ) THEN
            RAISE EXCEPTION 'Clinic does not belong to the specified organization';
        END IF;
    END IF;
    
    -- Se tem apenas clinica_id, pegar a organizacao_id automaticamente
    IF NEW.clinica_id IS NOT NULL AND NEW.organizacao_id IS NULL THEN
        SELECT organizacao_id INTO NEW.organizacao_id
        FROM public.clinicas
        WHERE id = NEW.clinica_id;
    END IF;
    
    -- Verificar se o usuário existe no profiles
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = NEW.user_id AND p.ativo = true
    ) THEN
        RAISE EXCEPTION 'User profile not found or inactive';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar contexto
CREATE TRIGGER validate_user_role_context_trigger
    BEFORE INSERT OR UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_user_role_context();

-- =============================================================================
-- RLS (ROW LEVEL SECURITY)
-- =============================================================================

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver seus próprios roles
CREATE POLICY "Usuários podem ver próprios roles" 
    ON public.user_roles
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Política: Proprietárias e gerentes podem ver roles da sua organização/clínica
CREATE POLICY "Gerentes podem ver roles do contexto" 
    ON public.user_roles
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles manager_role
            WHERE manager_role.user_id = auth.uid()
            AND (
                manager_role.organizacao_id = user_roles.organizacao_id OR
                manager_role.clinica_id = user_roles.clinica_id
            )
            AND manager_role.role IN ('proprietaria', 'gerente', 'super_admin')
            AND manager_role.ativo = true
        )
    );

-- Política: Super admins podem ver todos os roles
CREATE POLICY "Super admins podem ver todos roles" 
    ON public.user_roles
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'super_admin'
            AND ur.ativo = true
        )
    );

-- Política: Proprietárias podem criar/modificar roles na sua organização
CREATE POLICY "Proprietárias podem gerenciar roles" 
    ON public.user_roles
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles manager_role
            WHERE manager_role.user_id = auth.uid()
            AND (
                manager_role.organizacao_id = user_roles.organizacao_id OR
                manager_role.clinica_id = user_roles.clinica_id
            )
            AND manager_role.role IN ('proprietaria', 'super_admin')
            AND manager_role.ativo = true
        )
    );

-- Política: Para inserção, verificar permissões do criador
CREATE POLICY "Verificar permissões para criar roles" 
    ON public.user_roles
    FOR INSERT 
    WITH CHECK (
        -- Super admin pode criar qualquer role
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'super_admin'
            AND ur.ativo = true
        ) OR
        -- Proprietária pode criar roles na sua organização/clínica
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND (
                ur.organizacao_id = user_roles.organizacao_id OR
                ur.clinica_id = user_roles.clinica_id
            )
            AND ur.role = 'proprietaria'
            AND ur.ativo = true
        ) OR
        -- Usuário criando role para si mesmo (primeira vez)
        (auth.uid() = user_id AND criado_por = auth.uid())
    );

-- =============================================================================
-- FUNÇÕES UTILITÁRIAS PARA USER_ROLES
-- =============================================================================

-- Função para criar role inicial de proprietária
CREATE OR REPLACE FUNCTION public.create_owner_role(
    user_id UUID,
    organizacao_id UUID DEFAULT NULL,
    clinica_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    role_id UUID;
BEGIN
    -- Validar que pelo menos um contexto foi fornecido
    IF organizacao_id IS NULL AND clinica_id IS NULL THEN
        RAISE EXCEPTION 'Either organization_id or clinic_id must be provided';
    END IF;
    
    -- Criar role de proprietária
    INSERT INTO public.user_roles (
        user_id, 
        organizacao_id, 
        clinica_id, 
        role, 
        criado_por
    ) VALUES (
        user_id,
        organizacao_id,
        clinica_id,
        'proprietaria',
        user_id
    ) RETURNING id INTO role_id;
    
    RETURN role_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter roles ativos do usuário
CREATE OR REPLACE FUNCTION public.get_user_active_roles(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Verificar se pode acessar (próprio usuário ou admin)
    IF auth.uid() != target_user_id AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin', 'proprietaria', 'gerente')
        AND ur.ativo = true
    ) THEN
        RETURN NULL;
    END IF;
    
    SELECT json_agg(
        json_build_object(
            'id', ur.id,
            'role', ur.role,
            'organizacao', CASE 
                WHEN o.id IS NOT NULL THEN json_build_object(
                    'id', o.id,
                    'nome', o.nome
                )
                ELSE NULL
            END,
            'clinica', CASE 
                WHEN c.id IS NOT NULL THEN json_build_object(
                    'id', c.id,
                    'nome', c.nome
                )
                ELSE NULL
            END,
            'data_inicio', ur.data_inicio,
            'data_fim', ur.data_fim,
            'ativo', ur.ativo
        )
    ) INTO result
    FROM public.user_roles ur
    LEFT JOIN public.organizacoes o ON o.id = ur.organizacao_id
    LEFT JOIN public.clinicas c ON c.id = ur.clinica_id
    WHERE ur.user_id = target_user_id
    AND ur.ativo = true
    AND (ur.data_fim IS NULL OR ur.data_fim > CURRENT_DATE)
    ORDER BY ur.criado_em;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário tem role específico
CREATE OR REPLACE FUNCTION public.user_has_role(
    target_user_id UUID,
    required_role user_role_type,
    context_org_id UUID DEFAULT NULL,
    context_clinic_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = target_user_id
        AND ur.role = required_role
        AND ur.ativo = true
        AND (ur.data_fim IS NULL OR ur.data_fim > CURRENT_DATE)
        AND (
            context_org_id IS NULL OR ur.organizacao_id = context_org_id
        )
        AND (
            context_clinic_id IS NULL OR ur.clinica_id = context_clinic_id
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para listar usuários por contexto
CREATE OR REPLACE FUNCTION public.get_context_users(
    context_org_id UUID DEFAULT NULL,
    context_clinic_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Verificar permissões
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND (
            ur.organizacao_id = context_org_id OR
            ur.clinica_id = context_clinic_id OR
            ur.role = 'super_admin'
        )
        AND ur.role IN ('proprietaria', 'gerente', 'super_admin')
        AND ur.ativo = true
    ) THEN
        RETURN NULL;
    END IF;
    
    SELECT json_agg(
        json_build_object(
            'user_id', p.id,
            'nome_completo', p.nome_completo,
            'email', p.email,
            'avatar_url', p.avatar_url,
            'roles', json_agg(
                json_build_object(
                    'role', ur.role,
                    'ativo', ur.ativo,
                    'data_inicio', ur.data_inicio,
                    'data_fim', ur.data_fim
                )
            )
        )
    ) INTO result
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE (
        context_org_id IS NULL OR ur.organizacao_id = context_org_id
    )
    AND (
        context_clinic_id IS NULL OR ur.clinica_id = context_clinic_id
    )
    AND p.ativo = true
    GROUP BY p.id, p.nome_completo, p.email, p.avatar_url
    ORDER BY p.nome_completo;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON TABLE public.user_roles IS 'Roles contextuais dos usuários por organização/clínica';
COMMENT ON COLUMN public.user_roles.id IS 'Identificador único do role';
COMMENT ON COLUMN public.user_roles.user_id IS 'ID do usuário (referência ao auth.users)';
COMMENT ON COLUMN public.user_roles.organizacao_id IS 'ID da organização (contexto)';
COMMENT ON COLUMN public.user_roles.clinica_id IS 'ID da clínica (contexto)';
COMMENT ON COLUMN public.user_roles.role IS 'Role do usuário no contexto';
COMMENT ON COLUMN public.user_roles.ativo IS 'Indica se o role está ativo';
COMMENT ON COLUMN public.user_roles.data_inicio IS 'Data de início do role';
COMMENT ON COLUMN public.user_roles.data_fim IS 'Data de fim do role (NULL = indefinido)';

COMMENT ON FUNCTION public.validate_user_role_context() IS 'Valida consistência do contexto do role';
COMMENT ON FUNCTION public.create_owner_role(UUID, UUID, UUID) IS 'Cria role inicial de proprietária';
COMMENT ON FUNCTION public.get_user_active_roles(UUID) IS 'Retorna roles ativos do usuário';
COMMENT ON FUNCTION public.user_has_role(UUID, user_role_type, UUID, UUID) IS 'Verifica se usuário tem role específico';
COMMENT ON FUNCTION public.get_context_users(UUID, UUID) IS 'Lista usuários por contexto organizacional';

-- =============================================================================
-- ROLLBACK SCRIPT (comentado - usar apenas se necessário)
-- =============================================================================

/*
-- Para fazer rollback desta migração, execute:

DROP FUNCTION IF EXISTS public.get_context_users(UUID, UUID);
DROP FUNCTION IF EXISTS public.user_has_role(UUID, user_role_type, UUID, UUID);
DROP FUNCTION IF EXISTS public.get_user_active_roles(UUID);
DROP FUNCTION IF EXISTS public.create_owner_role(UUID, UUID, UUID);
DROP TRIGGER IF EXISTS validate_user_role_context_trigger ON public.user_roles;
DROP FUNCTION IF EXISTS public.validate_user_role_context();
DROP TABLE IF EXISTS public.user_roles CASCADE;
*/

-- =============================================================================
-- FIM DA MIGRAÇÃO 006
-- =============================================================================