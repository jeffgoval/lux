-- =============================================================================
-- MIGRAÇÃO 004: TABELA ORGANIZACOES
-- =============================================================================
-- Data: 2025-09-14
-- Descrição: Cria a tabela de organizações (grupos de clínicas)
-- Dependências: 001_foundation_types_functions.sql, 003_profiles_table.sql
-- Rollback: DROP da tabela organizacoes

-- =============================================================================
-- TABELA: organizacoes
-- =============================================================================
-- Organizações podem ter múltiplas clínicas (multi-tenant opcional)

CREATE TABLE IF NOT EXISTS public.organizacoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Informações básicas
    nome TEXT NOT NULL,
    cnpj TEXT,
    razao_social TEXT,
    nome_fantasia TEXT,
    
    -- Plano e limitações
    plano plano_type NOT NULL DEFAULT 'basico',
    limite_clinicas INTEGER DEFAULT 1,
    limite_usuarios INTEGER DEFAULT 10,
    recursos_habilitados TEXT[] DEFAULT ARRAY['prontuarios', 'agenda', 'estoque'],
    
    -- Informações de contato
    email TEXT,
    telefone TEXT,
    website TEXT,
    
    -- Endereço (estrutura flexível)
    endereco JSONB,
    
    -- Informações empresariais
    inscricao_estadual TEXT,
    inscricao_municipal TEXT,
    atividade_principal TEXT,
    data_fundacao DATE,
    
    -- Configurações da organização
    configuracoes JSONB DEFAULT '{}'::jsonb,
    
    -- Status e verificação
    ativo BOOLEAN NOT NULL DEFAULT true,
    verificado BOOLEAN NOT NULL DEFAULT false,
    data_verificacao TIMESTAMP WITH TIME ZONE,
    
    -- Auditoria
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    criado_por UUID NOT NULL REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT organizacoes_cnpj_valid CHECK (
        cnpj IS NULL OR public.validate_cnpj(cnpj)
    ),
    CONSTRAINT organizacoes_email_valid CHECK (
        email IS NULL OR public.validate_email(email)
    ),
    CONSTRAINT organizacoes_nome_not_empty CHECK (
        LENGTH(TRIM(nome)) >= 2
    ),
    CONSTRAINT organizacoes_limites_positivos CHECK (
        limite_clinicas > 0 AND limite_usuarios > 0
    ),
    CONSTRAINT organizacoes_website_format CHECK (
        website IS NULL OR website ~ '^https?://'
    ),
    CONSTRAINT organizacoes_data_fundacao_valida CHECK (
        data_fundacao IS NULL OR data_fundacao <= CURRENT_DATE
    )
);

-- =============================================================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_organizacoes_nome 
    ON public.organizacoes USING gin(to_tsvector('portuguese', nome));
    
CREATE INDEX IF NOT EXISTS idx_organizacoes_cnpj 
    ON public.organizacoes(cnpj) 
    WHERE cnpj IS NOT NULL;
    
CREATE INDEX IF NOT EXISTS idx_organizacoes_email 
    ON public.organizacoes(email) 
    WHERE email IS NOT NULL;
    
CREATE INDEX IF NOT EXISTS idx_organizacoes_ativo 
    ON public.organizacoes(ativo);
    
CREATE INDEX IF NOT EXISTS idx_organizacoes_verificado 
    ON public.organizacoes(verificado);
    
CREATE INDEX IF NOT EXISTS idx_organizacoes_plano 
    ON public.organizacoes(plano);
    
CREATE INDEX IF NOT EXISTS idx_organizacoes_criado_por 
    ON public.organizacoes(criado_por);

-- =============================================================================
-- TRIGGER PARA ATUALIZAR TIMESTAMP
-- =============================================================================

CREATE TRIGGER update_organizacoes_updated_at
    BEFORE UPDATE ON public.organizacoes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- RLS (ROW LEVEL SECURITY)
-- =============================================================================

-- Habilitar RLS
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;

-- Política: Membros da organização podem visualizar
CREATE POLICY "Membros podem ver organização" 
    ON public.organizacoes
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.organizacao_id = organizacoes.id
            AND ur.ativo = true
        )
    );

-- Política: Proprietárias e super admins podem modificar
CREATE POLICY "Proprietárias podem modificar organização" 
    ON public.organizacoes
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.organizacao_id = organizacoes.id
            AND ur.role IN ('proprietaria', 'super_admin')
            AND ur.ativo = true
        )
    );

-- Política: Usuários autenticados podem criar organizações
CREATE POLICY "Usuários podem criar organizações" 
    ON public.organizacoes
    FOR INSERT 
    WITH CHECK (auth.uid() = criado_por);

-- Política: Super admins podem ver todas as organizações
CREATE POLICY "Super admins podem ver todas organizações" 
    ON public.organizacoes
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'super_admin'
            AND ur.ativo = true
        )
    );

-- =============================================================================
-- FUNÇÕES UTILITÁRIAS PARA ORGANIZAÇÕES
-- =============================================================================

-- Função para verificar se usuário pode acessar organização
CREATE OR REPLACE FUNCTION public.user_can_access_organization(
    user_id UUID, 
    org_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = user_id
        AND ur.organizacao_id = org_id
        AND ur.ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter estatísticas da organização
CREATE OR REPLACE FUNCTION public.get_organization_stats(org_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    total_clinicas INTEGER;
    total_usuarios INTEGER;
    total_profissionais INTEGER;
BEGIN
    -- Verificar se o usuário pode acessar esta organização
    IF NOT public.user_can_access_organization(auth.uid(), org_id) THEN
        RETURN NULL;
    END IF;
    
    -- Contar clínicas
    SELECT COUNT(*) INTO total_clinicas
    FROM public.clinicas c
    WHERE c.organizacao_id = org_id AND c.ativo = true;
    
    -- Contar usuários
    SELECT COUNT(DISTINCT ur.user_id) INTO total_usuarios
    FROM public.user_roles ur
    WHERE ur.organizacao_id = org_id AND ur.ativo = true;
    
    -- Contar profissionais
    SELECT COUNT(DISTINCT ur.user_id) INTO total_profissionais
    FROM public.user_roles ur
    WHERE ur.organizacao_id = org_id 
    AND ur.role IN ('profissionais')
    AND ur.ativo = true;
    
    SELECT json_build_object(
        'total_clinicas', total_clinicas,
        'total_usuarios', total_usuarios,
        'total_profissionais', total_profissionais
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar limites da organização
CREATE OR REPLACE FUNCTION public.check_organization_limits(org_id UUID)
RETURNS JSON AS $$
DECLARE
    org_record public.organizacoes;
    current_clinicas INTEGER;
    current_usuarios INTEGER;
    result JSON;
BEGIN
    -- Buscar dados da organização
    SELECT * INTO org_record
    FROM public.organizacoes
    WHERE id = org_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Organization not found');
    END IF;
    
    -- Contar recursos atuais
    SELECT COUNT(*) INTO current_clinicas
    FROM public.clinicas c
    WHERE c.organizacao_id = org_id AND c.ativo = true;
    
    SELECT COUNT(DISTINCT ur.user_id) INTO current_usuarios
    FROM public.user_roles ur
    WHERE ur.organizacao_id = org_id AND ur.ativo = true;
    
    SELECT json_build_object(
        'clinicas', json_build_object(
            'current', current_clinicas,
            'limit', org_record.limite_clinicas,
            'available', org_record.limite_clinicas - current_clinicas
        ),
        'usuarios', json_build_object(
            'current', current_usuarios,
            'limit', org_record.limite_usuarios,
            'available', org_record.limite_usuarios - current_usuarios
        ),
        'plano', org_record.plano,
        'recursos_habilitados', org_record.recursos_habilitados
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON TABLE public.organizacoes IS 'Organizações que podem ter múltiplas clínicas (multi-tenant)';
COMMENT ON COLUMN public.organizacoes.id IS 'Identificador único da organização';
COMMENT ON COLUMN public.organizacoes.nome IS 'Nome da organização';
COMMENT ON COLUMN public.organizacoes.cnpj IS 'CNPJ da organização';
COMMENT ON COLUMN public.organizacoes.razao_social IS 'Razão social da empresa';
COMMENT ON COLUMN public.organizacoes.nome_fantasia IS 'Nome fantasia da empresa';
COMMENT ON COLUMN public.organizacoes.plano IS 'Plano contratado (básico, premium, enterprise)';
COMMENT ON COLUMN public.organizacoes.limite_clinicas IS 'Número máximo de clínicas permitidas';
COMMENT ON COLUMN public.organizacoes.limite_usuarios IS 'Número máximo de usuários permitidos';
COMMENT ON COLUMN public.organizacoes.recursos_habilitados IS 'Lista de recursos habilitados no plano';
COMMENT ON COLUMN public.organizacoes.endereco IS 'Endereço da organização em formato JSON';
COMMENT ON COLUMN public.organizacoes.ativo IS 'Indica se a organização está ativa';
COMMENT ON COLUMN public.organizacoes.verificado IS 'Indica se a organização foi verificada';

COMMENT ON FUNCTION public.user_can_access_organization(UUID, UUID) IS 'Verifica se usuário tem acesso à organização';
COMMENT ON FUNCTION public.get_organization_stats(UUID) IS 'Retorna estatísticas da organização';
COMMENT ON FUNCTION public.check_organization_limits(UUID) IS 'Verifica limites de uso da organização';

-- =============================================================================
-- ROLLBACK SCRIPT (comentado - usar apenas se necessário)
-- =============================================================================

/*
-- Para fazer rollback desta migração, execute:

DROP FUNCTION IF EXISTS public.check_organization_limits(UUID);
DROP FUNCTION IF EXISTS public.get_organization_stats(UUID);
DROP FUNCTION IF EXISTS public.user_can_access_organization(UUID, UUID);
DROP TRIGGER IF EXISTS update_organizacoes_updated_at ON public.organizacoes;
DROP TABLE IF EXISTS public.organizacoes CASCADE;
*/

-- =============================================================================
-- FIM DA MIGRAÇÃO 004
-- =============================================================================