-- =============================================================================
-- MIGRAÇÃO 005: TABELA CLINICAS
-- =============================================================================
-- Data: 2025-09-14
-- Descrição: Cria a tabela de clínicas (core do sistema multi-tenant)
-- Dependências: 001_foundation_types_functions.sql, 003_profiles_table.sql, 004_organizacoes_table.sql
-- Rollback: DROP da tabela clinicas

-- =============================================================================
-- TABELA: clinicas
-- =============================================================================
-- Clínicas são a unidade principal de organização do sistema

CREATE TABLE IF NOT EXISTS public.clinicas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    
    -- Informações básicas
    nome TEXT NOT NULL,
    cnpj TEXT,
    
    -- Endereço detalhado
    endereco_rua TEXT,
    endereco_numero TEXT,
    endereco_complemento TEXT,
    endereco_bairro TEXT,
    endereco_cidade TEXT,
    endereco_estado TEXT,
    endereco_cep TEXT,
    endereco_pais TEXT DEFAULT 'Brasil',
    
    -- Informações de contato
    telefone TEXT,
    email TEXT,
    website TEXT,
    whatsapp TEXT,
    
    -- Informações operacionais
    especialidades TEXT[],
    horario_funcionamento JSONB,
    capacidade_atendimento INTEGER,
    numero_salas INTEGER,
    
    -- Registros e licenças
    registro_anvisa TEXT,
    alvara_funcionamento TEXT,
    licenca_sanitaria TEXT,
    responsavel_tecnico_nome TEXT,
    responsavel_tecnico_registro TEXT,
    
    -- Configurações da clínica
    configuracoes JSONB DEFAULT '{}'::jsonb,
    
    -- Convênios e pagamentos
    aceita_convenios BOOLEAN DEFAULT false,
    convenios_aceitos TEXT[],
    
    -- Status e verificação
    ativo BOOLEAN NOT NULL DEFAULT true,
    verificado BOOLEAN NOT NULL DEFAULT false,
    data_verificacao TIMESTAMP WITH TIME ZONE,
    
    -- Auditoria
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    criado_por UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT clinicas_cnpj_valid CHECK (
        cnpj IS NULL OR public.validate_cnpj(cnpj)
    ),
    CONSTRAINT clinicas_email_valid CHECK (
        email IS NULL OR public.validate_email(email)
    ),
    CONSTRAINT clinicas_nome_not_empty CHECK (
        LENGTH(TRIM(nome)) >= 2
    ),
    CONSTRAINT clinicas_cep_format CHECK (
        endereco_cep IS NULL OR endereco_cep ~ '^\d{5}-?\d{3}$'
    ),
    CONSTRAINT clinicas_capacidade_positiva CHECK (
        capacidade_atendimento IS NULL OR capacidade_atendimento > 0
    ),
    CONSTRAINT clinicas_salas_positiva CHECK (
        numero_salas IS NULL OR numero_salas > 0
    ),
    CONSTRAINT clinicas_website_format CHECK (
        website IS NULL OR website ~ '^https?://'
    ),
    CONSTRAINT clinicas_telefone_format CHECK (
        telefone IS NULL OR telefone ~ '^\+?[1-9]\d{1,14}$'
    ),
    CONSTRAINT clinicas_whatsapp_format CHECK (
        whatsapp IS NULL OR whatsapp ~ '^\+?[1-9]\d{1,14}$'
    )
);

-- =============================================================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_clinicas_nome 
    ON public.clinicas USING gin(to_tsvector('portuguese', nome));
    
CREATE INDEX IF NOT EXISTS idx_clinicas_cnpj 
    ON public.clinicas(cnpj) 
    WHERE cnpj IS NOT NULL;
    
CREATE INDEX IF NOT EXISTS idx_clinicas_email 
    ON public.clinicas(email) 
    WHERE email IS NOT NULL;
    
CREATE INDEX IF NOT EXISTS idx_clinicas_ativo 
    ON public.clinicas(ativo);
    
CREATE INDEX IF NOT EXISTS idx_clinicas_verificado 
    ON public.clinicas(verificado);
    
CREATE INDEX IF NOT EXISTS idx_clinicas_organizacao_id 
    ON public.clinicas(organizacao_id) 
    WHERE organizacao_id IS NOT NULL;
    
CREATE INDEX IF NOT EXISTS idx_clinicas_cidade_estado 
    ON public.clinicas(endereco_cidade, endereco_estado)
    WHERE endereco_cidade IS NOT NULL AND endereco_estado IS NOT NULL;
    
CREATE INDEX IF NOT EXISTS idx_clinicas_especialidades 
    ON public.clinicas USING gin(especialidades);
    
CREATE INDEX IF NOT EXISTS idx_clinicas_criado_por 
    ON public.clinicas(criado_por)
    WHERE criado_por IS NOT NULL;

-- =============================================================================
-- TRIGGER PARA ATUALIZAR TIMESTAMP
-- =============================================================================

CREATE TRIGGER update_clinicas_updated_at
    BEFORE UPDATE ON public.clinicas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- FUNÇÃO PARA VALIDAR LIMITES DE ORGANIZAÇÃO
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_clinic_creation()
RETURNS TRIGGER AS $$
DECLARE
    org_record public.organizacoes;
    current_clinicas INTEGER;
BEGIN
    -- Se a clínica não pertence a uma organização, permitir
    IF NEW.organizacao_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Buscar dados da organização
    SELECT * INTO org_record
    FROM public.organizacoes
    WHERE id = NEW.organizacao_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Organization not found';
    END IF;
    
    -- Contar clínicas ativas da organização
    SELECT COUNT(*) INTO current_clinicas
    FROM public.clinicas c
    WHERE c.organizacao_id = NEW.organizacao_id 
    AND c.ativo = true
    AND c.id != COALESCE(NEW.id, gen_random_uuid()); -- Excluir a própria clínica em updates
    
    -- Verificar limite
    IF current_clinicas >= org_record.limite_clinicas THEN
        RAISE EXCEPTION 'Organization clinic limit exceeded. Current: %, Limit: %', 
            current_clinicas, org_record.limite_clinicas;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar limites antes de inserir/atualizar
CREATE TRIGGER validate_clinic_limits
    BEFORE INSERT OR UPDATE ON public.clinicas
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_clinic_creation();

-- =============================================================================
-- RLS (ROW LEVEL SECURITY)
-- =============================================================================

-- Habilitar RLS
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver clínicas onde têm role ativo
CREATE POLICY "Usuários podem ver clínicas com acesso" 
    ON public.clinicas
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND (ur.clinica_id = clinicas.id OR ur.organizacao_id = clinicas.organizacao_id)
            AND ur.ativo = true
        )
    );

-- Política: Proprietárias e gerentes podem modificar clínicas
CREATE POLICY "Proprietárias podem modificar clínicas" 
    ON public.clinicas
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND (ur.clinica_id = clinicas.id OR ur.organizacao_id = clinicas.organizacao_id)
            AND ur.role IN ('proprietaria', 'gerente', 'super_admin')
            AND ur.ativo = true
        )
    );

-- Política: Usuários com role apropriado podem criar clínicas
CREATE POLICY "Usuários podem criar clínicas" 
    ON public.clinicas
    FOR INSERT 
    WITH CHECK (
        -- Se tem organização, deve ter role apropriado na organização
        (organizacao_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.organizacao_id = organizacao_id
            AND ur.role IN ('proprietaria', 'super_admin')
            AND ur.ativo = true
        )) OR
        -- Se não tem organização, qualquer usuário pode criar (clínica independente)
        (organizacao_id IS NULL AND auth.uid() = criado_por)
    );

-- Política: Super admins podem ver todas as clínicas
CREATE POLICY "Super admins podem ver todas clínicas" 
    ON public.clinicas
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
-- FUNÇÕES UTILITÁRIAS PARA CLÍNICAS
-- =============================================================================

-- Função para obter informações completas da clínica
CREATE OR REPLACE FUNCTION public.get_clinic_full_info(clinic_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    clinic_record public.clinicas;
    org_record public.organizacoes;
    total_profissionais INTEGER;
    total_usuarios INTEGER;
BEGIN
    -- Verificar acesso
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND (ur.clinica_id = clinic_id OR ur.organizacao_id = (
            SELECT organizacao_id FROM public.clinicas WHERE id = clinic_id
        ))
        AND ur.ativo = true
    ) THEN
        RETURN NULL;
    END IF;
    
    -- Buscar dados da clínica
    SELECT * INTO clinic_record
    FROM public.clinicas
    WHERE id = clinic_id;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Buscar dados da organização se existir
    org_record := NULL;
    IF clinic_record.organizacao_id IS NOT NULL THEN
        SELECT * INTO org_record
        FROM public.organizacoes
        WHERE id = clinic_record.organizacao_id;
    END IF;
    
    -- Contar profissionais e usuários
    SELECT COUNT(DISTINCT ur.user_id) INTO total_profissionais
    FROM public.user_roles ur
    WHERE ur.clinica_id = clinic_id 
    AND ur.role IN ('profissionais')
    AND ur.ativo = true;
    
    SELECT COUNT(DISTINCT ur.user_id) INTO total_usuarios
    FROM public.user_roles ur
    WHERE ur.clinica_id = clinic_id
    AND ur.ativo = true;
    
    -- Montar resultado
    SELECT json_build_object(
        'id', clinic_record.id,
        'nome', clinic_record.nome,
        'cnpj', clinic_record.cnpj,
        'endereco', json_build_object(
            'rua', clinic_record.endereco_rua,
            'numero', clinic_record.endereco_numero,
            'complemento', clinic_record.endereco_complemento,
            'bairro', clinic_record.endereco_bairro,
            'cidade', clinic_record.endereco_cidade,
            'estado', clinic_record.endereco_estado,
            'cep', clinic_record.endereco_cep,
            'pais', clinic_record.endereco_pais
        ),
        'contato', json_build_object(
            'telefone', clinic_record.telefone,
            'email', clinic_record.email,
            'website', clinic_record.website,
            'whatsapp', clinic_record.whatsapp
        ),
        'operacional', json_build_object(
            'especialidades', clinic_record.especialidades,
            'horario_funcionamento', clinic_record.horario_funcionamento,
            'capacidade_atendimento', clinic_record.capacidade_atendimento,
            'numero_salas', clinic_record.numero_salas
        ),
        'organizacao', CASE 
            WHEN org_record IS NOT NULL THEN json_build_object(
                'id', org_record.id,
                'nome', org_record.nome,
                'plano', org_record.plano
            )
            ELSE NULL
        END,
        'estatisticas', json_build_object(
            'total_profissionais', total_profissionais,
            'total_usuarios', total_usuarios
        ),
        'status', json_build_object(
            'ativo', clinic_record.ativo,
            'verificado', clinic_record.verificado,
            'data_verificacao', clinic_record.data_verificacao
        ),
        'criado_em', clinic_record.criado_em,
        'atualizado_em', clinic_record.atualizado_em
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para listar clínicas do usuário
CREATE OR REPLACE FUNCTION public.get_user_clinics()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', c.id,
            'nome', c.nome,
            'endereco_cidade', c.endereco_cidade,
            'endereco_estado', c.endereco_estado,
            'ativo', c.ativo,
            'verificado', c.verificado,
            'role', ur.role,
            'organizacao_nome', o.nome
        )
    ) INTO result
    FROM public.clinicas c
    JOIN public.user_roles ur ON (ur.clinica_id = c.id OR ur.organizacao_id = c.organizacao_id)
    LEFT JOIN public.organizacoes o ON o.id = c.organizacao_id
    WHERE ur.user_id = auth.uid()
    AND ur.ativo = true
    AND c.ativo = true
    ORDER BY c.nome;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON TABLE public.clinicas IS 'Clínicas - unidade principal de organização do sistema';
COMMENT ON COLUMN public.clinicas.id IS 'Identificador único da clínica';
COMMENT ON COLUMN public.clinicas.organizacao_id IS 'ID da organização (NULL para clínicas independentes)';
COMMENT ON COLUMN public.clinicas.nome IS 'Nome da clínica';
COMMENT ON COLUMN public.clinicas.cnpj IS 'CNPJ da clínica';
COMMENT ON COLUMN public.clinicas.endereco_rua IS 'Rua do endereço';
COMMENT ON COLUMN public.clinicas.endereco_cidade IS 'Cidade da clínica';
COMMENT ON COLUMN public.clinicas.endereco_estado IS 'Estado da clínica';
COMMENT ON COLUMN public.clinicas.especialidades IS 'Lista de especialidades oferecidas';
COMMENT ON COLUMN public.clinicas.horario_funcionamento IS 'Horários de funcionamento em JSON';
COMMENT ON COLUMN public.clinicas.ativo IS 'Indica se a clínica está ativa';

COMMENT ON FUNCTION public.validate_clinic_creation() IS 'Valida limites de clínicas por organização';
COMMENT ON FUNCTION public.get_clinic_full_info(UUID) IS 'Retorna informações completas da clínica';
COMMENT ON FUNCTION public.get_user_clinics() IS 'Lista clínicas do usuário atual';

-- =============================================================================
-- ROLLBACK SCRIPT (comentado - usar apenas se necessário)
-- =============================================================================

/*
-- Para fazer rollback desta migração, execute:

DROP FUNCTION IF EXISTS public.get_user_clinics();
DROP FUNCTION IF EXISTS public.get_clinic_full_info(UUID);
DROP TRIGGER IF EXISTS validate_clinic_limits ON public.clinicas;
DROP FUNCTION IF EXISTS public.validate_clinic_creation();
DROP TRIGGER IF EXISTS update_clinicas_updated_at ON public.clinicas;
DROP TABLE IF EXISTS public.clinicas CASCADE;
*/

-- =============================================================================
-- FIM DA MIGRAÇÃO 005
-- =============================================================================