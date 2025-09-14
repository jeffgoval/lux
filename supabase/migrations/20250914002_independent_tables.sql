-- =============================================================================
-- MIGRAÇÃO 002: TABELAS INDEPENDENTES
-- =============================================================================
-- Data: 2025-09-14
-- Descrição: Cria tabelas que não dependem de outras (referência)
-- Dependências: 001_foundation_types_functions.sql
-- Rollback: DROP das tabelas criadas

-- =============================================================================
-- TABELA: especialidades_medicas
-- =============================================================================
-- Tabela de referência para especialidades médicas disponíveis

CREATE TABLE IF NOT EXISTS public.especialidades_medicas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT UNIQUE NOT NULL,
    descricao TEXT,
    codigo_conselho TEXT, -- Código do conselho de classe (CRM, COREN, etc.)
    categoria TEXT, -- Categoria da especialidade (médica, enfermagem, etc.)
    requer_certificacao BOOLEAN DEFAULT false,
    ativo BOOLEAN NOT NULL DEFAULT true,
    
    -- Auditoria
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT especialidades_nome_not_empty CHECK (LENGTH(TRIM(nome)) > 0),
    CONSTRAINT especialidades_codigo_format CHECK (
        codigo_conselho IS NULL OR 
        LENGTH(TRIM(codigo_conselho)) >= 2
    )
);

-- =============================================================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_especialidades_medicas_nome 
    ON public.especialidades_medicas(nome);
    
CREATE INDEX IF NOT EXISTS idx_especialidades_medicas_ativo 
    ON public.especialidades_medicas(ativo);
    
CREATE INDEX IF NOT EXISTS idx_especialidades_medicas_categoria 
    ON public.especialidades_medicas(categoria) 
    WHERE categoria IS NOT NULL;
    
CREATE INDEX IF NOT EXISTS idx_especialidades_medicas_codigo 
    ON public.especialidades_medicas(codigo_conselho) 
    WHERE codigo_conselho IS NOT NULL;

-- =============================================================================
-- TRIGGER PARA ATUALIZAR TIMESTAMP
-- =============================================================================

CREATE TRIGGER update_especialidades_medicas_updated_at
    BEFORE UPDATE ON public.especialidades_medicas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- RLS (ROW LEVEL SECURITY)
-- =============================================================================

-- Habilitar RLS
ALTER TABLE public.especialidades_medicas ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ler especialidades ativas
CREATE POLICY "Especialidades públicas para leitura" 
    ON public.especialidades_medicas
    FOR SELECT 
    USING (ativo = true);

-- Política: Apenas super_admin e proprietárias podem modificar
CREATE POLICY "Apenas admins podem modificar especialidades" 
    ON public.especialidades_medicas
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('super_admin', 'proprietaria')
            AND ur.ativo = true
        )
    );

-- =============================================================================
-- DADOS DE SEED BÁSICOS
-- =============================================================================

-- Inserir especialidades médicas básicas
INSERT INTO public.especialidades_medicas (nome, descricao, codigo_conselho, categoria, requer_certificacao) 
VALUES 
    ('Dermatologia', 'Especialidade médica focada em doenças da pele', 'CRM', 'médica', true),
    ('Cirurgia Plástica', 'Cirurgia reconstrutiva e estética', 'CRM', 'médica', true),
    ('Medicina Estética', 'Procedimentos estéticos não-cirúrgicos', 'CRM', 'médica', true),
    ('Fisioterapia Estética', 'Fisioterapia aplicada à estética', 'CREFITO', 'fisioterapia', true),
    ('Nutrição', 'Orientação nutricional para estética e saúde', 'CRN', 'nutrição', true),
    ('Psicologia', 'Acompanhamento psicológico em tratamentos estéticos', 'CRP', 'psicologia', true),
    ('Enfermagem Estética', 'Procedimentos estéticos por enfermeiros', 'COREN', 'enfermagem', true),
    ('Biomedicina Estética', 'Procedimentos estéticos por biomédicos', 'CRBM', 'biomedicina', true)
ON CONFLICT (nome) DO NOTHING;

-- =============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON TABLE public.especialidades_medicas IS 'Tabela de referência para especialidades médicas e estéticas disponíveis no sistema';
COMMENT ON COLUMN public.especialidades_medicas.id IS 'Identificador único da especialidade';
COMMENT ON COLUMN public.especialidades_medicas.nome IS 'Nome da especialidade médica';
COMMENT ON COLUMN public.especialidades_medicas.descricao IS 'Descrição detalhada da especialidade';
COMMENT ON COLUMN public.especialidades_medicas.codigo_conselho IS 'Código do conselho de classe responsável (CRM, COREN, etc.)';
COMMENT ON COLUMN public.especialidades_medicas.categoria IS 'Categoria profissional da especialidade';
COMMENT ON COLUMN public.especialidades_medicas.requer_certificacao IS 'Indica se a especialidade requer certificação específica';
COMMENT ON COLUMN public.especialidades_medicas.ativo IS 'Indica se a especialidade está ativa no sistema';

-- =============================================================================
-- ROLLBACK SCRIPT (comentado - usar apenas se necessário)
-- =============================================================================

/*
-- Para fazer rollback desta migração, execute:

DROP TRIGGER IF EXISTS update_especialidades_medicas_updated_at ON public.especialidades_medicas;
DROP TABLE IF EXISTS public.especialidades_medicas CASCADE;
*/

-- =============================================================================
-- FIM DA MIGRAÇÃO 002
-- =============================================================================