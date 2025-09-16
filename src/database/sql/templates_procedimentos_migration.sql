-- =====================================================
-- MIGRAÇÃO: SISTEMA DE TEMPLATES DE PROCEDIMENTOS
-- Implementa templates padronizados para procedimentos estéticos
-- =====================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMERAÇÕES NECESSÁRIAS
-- =====================================================

-- Tipos de procedimentos estéticos
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_procedimento') THEN
        CREATE TYPE tipo_procedimento AS ENUM (
            'botox_toxina',
            'preenchimento',
            'harmonizacao_facial',
            'laser_ipl',
            'peeling',
            'tratamento_corporal',
            'skincare_avancado',
            'microagulhamento',
            'radiofrequencia',
            'criolipólise',
            'outro'
        );
    END IF;
END $$;

-- Status de templates
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_template') THEN
        CREATE TYPE status_template AS ENUM (
            'ativo',
            'inativo',
            'arquivado'
        );
    END IF;
END $$;

-- =====================================================
-- TABELA PRINCIPAL: TEMPLATES_PROCEDIMENTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.templates_procedimentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relacionamentos
    clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE,
    criado_por UUID NOT NULL REFERENCES auth.users(id),
    atualizado_por UUID REFERENCES auth.users(id),
    
    -- Informações básicas do template
    tipo_procedimento tipo_procedimento NOT NULL,
    nome_template TEXT NOT NULL,
    descricao TEXT,
    
    -- Configurações de tempo e valor
    duracao_padrao_minutos INTEGER DEFAULT 60 CHECK (duracao_padrao_minutos > 0),
    valor_base DECIMAL(10,2) CHECK (valor_base >= 0),
    
    -- Campos flexíveis para customização
    campos_obrigatorios JSONB DEFAULT '{}',
    -- Estrutura: {
    --   "anamnese": {"required": true, "type": "text", "label": "Anamnese"},
    --   "alergias": {"required": true, "type": "array", "label": "Alergias"},
    --   "medicamentos": {"required": false, "type": "text", "label": "Medicamentos"}
    -- }
    
    campos_opcionais JSONB DEFAULT '{}',
    -- Estrutura similar aos campos obrigatórios
    
    -- Instruções e orientações
    instrucoes_pre_procedimento TEXT,
    instrucoes_pos_procedimento TEXT,
    contraindicacoes TEXT[],
    materiais_necessarios TEXT[],
    
    -- Configurações de agendamento
    permite_agendamento_online BOOLEAN DEFAULT true,
    requer_avaliacao_previa BOOLEAN DEFAULT false,
    intervalo_minimo_dias INTEGER DEFAULT 0 CHECK (intervalo_minimo_dias >= 0),
    
    -- Status e visibilidade
    status status_template DEFAULT 'ativo',
    publico BOOLEAN DEFAULT false, -- Se true, outras clínicas podem usar
    
    -- Versionamento
    versao INTEGER DEFAULT 1 CHECK (versao > 0),
    template_pai_id UUID REFERENCES public.templates_procedimentos(id), -- Para versionamento
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    -- Estrutura: {
    --   "tags": ["string"],
    --   "categoria": "string",
    --   "nivel_complexidade": "baixo|medio|alto",
    --   "tempo_recuperacao_dias": number
    -- }
    
    -- Auditoria
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT nome_template_clinica_unique UNIQUE (clinica_id, nome_template, versao),
    CONSTRAINT template_publico_sem_clinica CHECK (
        (publico = true AND clinica_id IS NULL) OR 
        (publico = false AND clinica_id IS NOT NULL)
    )
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices básicos
CREATE INDEX IF NOT EXISTS idx_templates_procedimentos_clinica_id 
    ON public.templates_procedimentos(clinica_id);

CREATE INDEX IF NOT EXISTS idx_templates_procedimentos_tipo 
    ON public.templates_procedimentos(tipo_procedimento);

CREATE INDEX IF NOT EXISTS idx_templates_procedimentos_status 
    ON public.templates_procedimentos(status) WHERE status = 'ativo';

CREATE INDEX IF NOT EXISTS idx_templates_procedimentos_publico 
    ON public.templates_procedimentos(publico) WHERE publico = true;

CREATE INDEX IF NOT EXISTS idx_templates_procedimentos_criado_por 
    ON public.templates_procedimentos(criado_por);

-- Índices compostos para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_templates_procedimentos_clinica_tipo_status 
    ON public.templates_procedimentos(clinica_id, tipo_procedimento, status);

CREATE INDEX IF NOT EXISTS idx_templates_procedimentos_publico_tipo 
    ON public.templates_procedimentos(publico, tipo_procedimento) 
    WHERE publico = true AND status = 'ativo';

-- Índice para busca textual
CREATE INDEX IF NOT EXISTS idx_templates_procedimentos_nome_busca 
    ON public.templates_procedimentos USING gin(to_tsvector('portuguese', nome_template || ' ' || COALESCE(descricao, '')));

-- Índice para versionamento
CREATE INDEX IF NOT EXISTS idx_templates_procedimentos_pai_versao 
    ON public.templates_procedimentos(template_pai_id, versao);

-- Índices para timestamps
CREATE INDEX IF NOT EXISTS idx_templates_procedimentos_criado_em 
    ON public.templates_procedimentos(criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_templates_procedimentos_atualizado_em 
    ON public.templates_procedimentos(atualizado_em DESC);

-- =====================================================
-- TRIGGERS PARA AUDITORIA E AUTOMAÇÃO
-- =====================================================

-- Função para atualizar timestamp de atualização
CREATE OR REPLACE FUNCTION update_templates_procedimentos_updated_at()
RETURNS TRIGGER AS $
BEGIN
    NEW.atualizado_em = now();
    NEW.atualizado_por = auth.uid();
    RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_templates_procedimentos_updated_at ON public.templates_procedimentos;
CREATE TRIGGER trigger_update_templates_procedimentos_updated_at
    BEFORE UPDATE ON public.templates_procedimentos
    FOR EACH ROW EXECUTE FUNCTION update_templates_procedimentos_updated_at();

-- Função para validar campos obrigatórios/opcionais
CREATE OR REPLACE FUNCTION validate_template_campos()
RETURNS TRIGGER AS $
DECLARE
    campo_key TEXT;
    campo_config JSONB;
BEGIN
    -- Validar estrutura dos campos obrigatórios
    FOR campo_key IN SELECT jsonb_object_keys(NEW.campos_obrigatorios)
    LOOP
        campo_config := NEW.campos_obrigatorios->campo_key;
        
        -- Verificar se tem as chaves necessárias
        IF NOT (campo_config ? 'type' AND campo_config ? 'label') THEN
            RAISE EXCEPTION 'Campo obrigatório "%" deve ter "type" e "label"', campo_key;
        END IF;
        
        -- Validar tipos permitidos
        IF NOT (campo_config->>'type' IN ('text', 'number', 'boolean', 'array', 'date', 'select')) THEN
            RAISE EXCEPTION 'Tipo "%" não é válido para campo "%"', campo_config->>'type', campo_key;
        END IF;
    END LOOP;
    
    -- Validar estrutura dos campos opcionais (mesma lógica)
    FOR campo_key IN SELECT jsonb_object_keys(NEW.campos_opcionais)
    LOOP
        campo_config := NEW.campos_opcionais->campo_key;
        
        IF NOT (campo_config ? 'type' AND campo_config ? 'label') THEN
            RAISE EXCEPTION 'Campo opcional "%" deve ter "type" e "label"', campo_key;
        END IF;
        
        IF NOT (campo_config->>'type' IN ('text', 'number', 'boolean', 'array', 'date', 'select')) THEN
            RAISE EXCEPTION 'Tipo "%" não é válido para campo "%"', campo_config->>'type', campo_key;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Trigger para validação de campos
DROP TRIGGER IF EXISTS trigger_validate_template_campos ON public.templates_procedimentos;
CREATE TRIGGER trigger_validate_template_campos
    BEFORE INSERT OR UPDATE ON public.templates_procedimentos
    FOR EACH ROW EXECUTE FUNCTION validate_template_campos();

-- =====================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.templates_procedimentos ENABLE ROW LEVEL SECURITY;

-- Política para visualização
-- Usuários podem ver templates de suas clínicas + templates públicos
CREATE POLICY "Users can view templates" ON public.templates_procedimentos
    FOR SELECT USING (
        -- Templates da própria clínica
        clinica_id IN (
            SELECT ur.clinica_id 
            FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.clinica_id IS NOT NULL
        )
        OR
        -- Templates públicos ativos
        (publico = true AND status = 'ativo')
        OR
        -- Super admin pode ver tudo
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'super_admin'
        )
    );

-- Política para inserção
-- Usuários podem criar templates para suas clínicas
CREATE POLICY "Users can create templates" ON public.templates_procedimentos
    FOR INSERT WITH CHECK (
        -- Deve ser para uma clínica onde o usuário tem permissão
        clinica_id IN (
            SELECT ur.clinica_id 
            FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.clinica_id IS NOT NULL
            AND ur.role IN ('proprietaria', 'gerente', 'profissionais')
        )
        OR
        -- Super admin pode criar templates públicos
        (publico = true AND clinica_id IS NULL AND EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'super_admin'
        ))
    );

-- Política para atualização
-- Usuários podem atualizar templates de suas clínicas
CREATE POLICY "Users can update templates" ON public.templates_procedimentos
    FOR UPDATE USING (
        -- Templates da própria clínica
        clinica_id IN (
            SELECT ur.clinica_id 
            FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.clinica_id IS NOT NULL
            AND ur.role IN ('proprietaria', 'gerente', 'profissionais')
        )
        OR
        -- Super admin pode atualizar templates públicos
        (publico = true AND EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'super_admin'
        ))
    );

-- Política para exclusão
-- Apenas proprietárias e gerentes podem excluir templates
CREATE POLICY "Users can delete templates" ON public.templates_procedimentos
    FOR DELETE USING (
        clinica_id IN (
            SELECT ur.clinica_id 
            FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.clinica_id IS NOT NULL
            AND ur.role IN ('proprietaria', 'gerente')
        )
        OR
        -- Super admin pode excluir templates públicos
        (publico = true AND EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'super_admin'
        ))
    );

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE public.templates_procedimentos IS 'Templates padronizados para procedimentos estéticos com campos flexíveis';
COMMENT ON COLUMN public.templates_procedimentos.campos_obrigatorios IS 'Campos obrigatórios definidos em JSON com validação de tipo';
COMMENT ON COLUMN public.templates_procedimentos.campos_opcionais IS 'Campos opcionais definidos em JSON com validação de tipo';
COMMENT ON COLUMN public.templates_procedimentos.publico IS 'Se true, template fica disponível para todas as clínicas';
COMMENT ON COLUMN public.templates_procedimentos.template_pai_id IS 'Referência ao template original para controle de versão';
COMMENT ON COLUMN public.templates_procedimentos.metadata IS 'Metadados adicionais como tags, categoria, complexidade';

-- =====================================================
-- MENSAGEM DE CONCLUSÃO
-- =====================================================

DO $ 
BEGIN 
    RAISE NOTICE '=== MIGRAÇÃO TEMPLATES_PROCEDIMENTOS CONCLUÍDA ===';
    RAISE NOTICE 'Componentes criados:';
    RAISE NOTICE '- Tabela templates_procedimentos com campos flexíveis';
    RAISE NOTICE '- 2 tipos enumerados (tipo_procedimento, status_template)';
    RAISE NOTICE '- 8 índices otimizados para performance';
    RAISE NOTICE '- 2 triggers para auditoria e validação';
    RAISE NOTICE '- 4 políticas RLS para isolamento multi-tenant';
    RAISE NOTICE '- Suporte a templates públicos e privados';
    RAISE NOTICE '- Sistema de versionamento implementado';
    RAISE NOTICE '=== READY FOR PROCEDURE TEMPLATES ===';
END $;