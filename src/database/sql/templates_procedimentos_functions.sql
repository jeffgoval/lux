-- =====================================================
-- FUNÇÕES PARA TEMPLATES BÁSICOS DE PROCEDIMENTOS
-- Implementa funções utilitárias para gestão de templates
-- =====================================================

-- =====================================================
-- FUNÇÃO: CRIAR TEMPLATES PADRÃO PARA NOVA CLÍNICA
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_basic_procedure_templates(
    p_clinica_id UUID,
    p_created_by UUID DEFAULT auth.uid()
)
RETURNS JSON AS $
DECLARE
    v_template_id UUID;
    v_templates_created JSON[] := '{}';
    v_template_data JSON;
    v_result JSON;
BEGIN
    -- Verificar se a clínica existe
    IF NOT EXISTS (SELECT 1 FROM public.clinicas WHERE id = p_clinica_id) THEN
        RAISE EXCEPTION 'Clínica não encontrada: %', p_clinica_id;
    END IF;
    
    -- Verificar se o usuário tem permissão
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = p_created_by 
        AND ur.clinica_id = p_clinica_id
        AND ur.role IN ('proprietaria', 'gerente')
    ) THEN
        RAISE EXCEPTION 'Usuário não tem permissão para criar templates nesta clínica';
    END IF;
    
    -- Template 1: Botox/Toxina Botulínica
    INSERT INTO public.templates_procedimentos (
        clinica_id, criado_por, tipo_procedimento, nome_template, descricao,
        duracao_padrao_minutos, valor_base, campos_obrigatorios, campos_opcionais,
        instrucoes_pre_procedimento, instrucoes_pos_procedimento,
        contraindicacoes, materiais_necessarios, requer_avaliacao_previa,
        metadata
    ) VALUES (
        p_clinica_id, p_created_by, 'botox_toxina', 'Botox Facial Padrão',
        'Template padrão para aplicação de toxina botulínica facial',
        45, 350.00,
        '{"anamnese": {"type": "text", "label": "Anamnese", "required": true}, "alergias": {"type": "array", "label": "Alergias conhecidas", "required": true}, "medicamentos": {"type": "text", "label": "Medicamentos em uso", "required": true}, "gravidez": {"type": "boolean", "label": "Está grávida ou amamentando?", "required": true}}'::jsonb,
        '{"observacoes": {"type": "text", "label": "Observações gerais"}, "procedimentos_anteriores": {"type": "text", "label": "Procedimentos estéticos anteriores"}, "expectativas": {"type": "text", "label": "Expectativas do paciente"}}'::jsonb,
        'Não consumir álcool 24h antes. Evitar anti-inflamatórios 7 dias antes. Informar sobre medicamentos em uso.',
        'Não massagear a região por 4h. Evitar exercícios físicos por 24h. Não deitar por 4h após aplicação. Retorno em 15 dias.',
        ARRAY['Gravidez', 'Amamentação', 'Alergia à toxina', 'Doenças neuromusculares', 'Infecção local'],
        ARRAY['Toxina botulínica', 'Seringas descartáveis', 'Agulhas 30G', 'Álcool 70%', 'Gaze estéril'],
        true,
        '{"tags": ["botox", "facial", "rugas"], "categoria": "injetaveis", "nivel_complexidade": "medio", "tempo_recuperacao_dias": 1}'::jsonb
    ) RETURNING id INTO v_template_id;
    
    v_template_data := json_build_object(
        'id', v_template_id,
        'nome', 'Botox Facial Padrão',
        'tipo', 'botox_toxina'
    );
    v_templates_created := array_append(v_templates_created, v_template_data);
    
    -- Template 2: Preenchimento Facial
    INSERT INTO public.templates_procedimentos (
        clinica_id, criado_por, tipo_procedimento, nome_template, descricao,
        duracao_padrao_minutos, valor_base, campos_obrigatorios, campos_opcionais,
        instrucoes_pre_procedimento, instrucoes_pos_procedimento,
        contraindicacoes, materiais_necessarios, requer_avaliacao_previa,
        metadata
    ) VALUES (
        p_clinica_id, p_created_by, 'preenchimento', 'Preenchimento com Ácido Hialurônico',
        'Template padrão para preenchimento facial com ácido hialurônico',
        60, 450.00,
        '{"anamnese": {"type": "text", "label": "Anamnese completa", "required": true}, "alergias": {"type": "array", "label": "Alergias conhecidas", "required": true}, "area_tratamento": {"type": "select", "label": "Área de tratamento", "options": ["Lábios", "Sulco nasogeniano", "Bigode chinês", "Olheiras"], "required": true}, "volume_desejado": {"type": "select", "label": "Volume desejado", "options": ["Sutil", "Moderado", "Intenso"], "required": true}}'::jsonb,
        '{"procedimentos_anteriores": {"type": "text", "label": "Preenchimentos anteriores"}, "cicatrizacao": {"type": "text", "label": "Histórico de cicatrização"}, "expectativas": {"type": "text", "label": "Expectativas do resultado"}}'::jsonb,
        'Não consumir álcool 48h antes. Evitar anti-inflamatórios 7 dias antes. Suspender anticoagulantes se possível.',
        'Aplicar gelo nas primeiras 24h. Evitar exercícios por 48h. Não massagear por 2 semanas. Retorno em 15 dias.',
        ARRAY['Gravidez', 'Amamentação', 'Alergia ao ácido hialurônico', 'Infecção ativa', 'Distúrbios de coagulação'],
        ARRAY['Ácido hialurônico', 'Seringas descartáveis', 'Cânulas ou agulhas', 'Anestésico tópico', 'Gelo'],
        true,
        '{"tags": ["preenchimento", "acido-hialuronico", "facial"], "categoria": "injetaveis", "nivel_complexidade": "alto", "tempo_recuperacao_dias": 3}'::jsonb
    ) RETURNING id INTO v_template_id;
    
    v_template_data := json_build_object(
        'id', v_template_id,
        'nome', 'Preenchimento com Ácido Hialurônico',
        'tipo', 'preenchimento'
    );
    v_templates_created := array_append(v_templates_created, v_template_data);
    
    -- Template 3: Peeling Químico
    INSERT INTO public.templates_procedimentos (
        clinica_id, criado_por, tipo_procedimento, nome_template, descricao,
        duracao_padrao_minutos, valor_base, campos_obrigatorios, campos_opcionais,
        instrucoes_pre_procedimento, instrucoes_pos_procedimento,
        contraindicacoes, materiais_necessarios, requer_avaliacao_previa,
        metadata
    ) VALUES (
        p_clinica_id, p_created_by, 'peeling', 'Peeling Químico Superficial',
        'Template para peeling químico superficial com ácidos',
        90, 180.00,
        '{"tipo_pele": {"type": "select", "label": "Tipo de pele", "options": ["Oleosa", "Seca", "Mista", "Sensível"], "required": true}, "fototipo": {"type": "select", "label": "Fototipo", "options": ["I", "II", "III", "IV", "V", "VI"], "required": true}, "problemas_pele": {"type": "array", "label": "Problemas de pele", "required": true}, "uso_acidos": {"type": "boolean", "label": "Já usa ácidos regularmente?", "required": true}}'::jsonb,
        '{"produtos_uso": {"type": "text", "label": "Produtos em uso"}, "exposicao_solar": {"type": "text", "label": "Exposição solar habitual"}, "tratamentos_anteriores": {"type": "text", "label": "Tratamentos anteriores"}}'::jsonb,
        'Suspender ácidos 7 dias antes. Usar protetor solar diariamente. Não fazer depilação na área 48h antes.',
        'Usar protetor solar FPS 60+. Hidratar bem a pele. Não usar ácidos por 7 dias. Evitar sol direto por 15 dias.',
        ARRAY['Gravidez', 'Amamentação', 'Pele irritada', 'Herpes ativo', 'Uso de isotretinoína'],
        ARRAY['Ácido escolhido', 'Neutralizante', 'Protetor solar', 'Hidratante pós-peeling', 'Luvas'],
        true,
        '{"tags": ["peeling", "acidos", "rejuvenescimento"], "categoria": "tratamento_facial", "nivel_complexidade": "medio", "tempo_recuperacao_dias": 7}'::jsonb
    ) RETURNING id INTO v_template_id;
    
    v_template_data := json_build_object(
        'id', v_template_id,
        'nome', 'Peeling Químico Superficial',
        'tipo', 'peeling'
    );
    v_templates_created := array_append(v_templates_created, v_template_data);
    
    -- Template 4: Limpeza de Pele Profunda
    INSERT INTO public.templates_procedimentos (
        clinica_id, criado_por, tipo_procedimento, nome_template, descricao,
        duracao_padrao_minutos, valor_base, campos_obrigatorios, campos_opcionais,
        instrucoes_pre_procedimento, instrucoes_pos_procedimento,
        contraindicacoes, materiais_necessarios, requer_avaliacao_previa,
        metadata
    ) VALUES (
        p_clinica_id, p_created_by, 'skincare_avancado', 'Limpeza de Pele Profunda',
        'Template para limpeza de pele profunda com extração',
        120, 120.00,
        '{"tipo_pele": {"type": "select", "label": "Tipo de pele", "options": ["Oleosa", "Seca", "Mista", "Acneica"], "required": true}, "comedones": {"type": "boolean", "label": "Presença de comedones?", "required": true}, "sensibilidade": {"type": "select", "label": "Sensibilidade", "options": ["Baixa", "Média", "Alta"], "required": true}}'::jsonb,
        '{"produtos_uso": {"type": "text", "label": "Produtos em uso"}, "frequencia_limpeza": {"type": "text", "label": "Frequência de limpezas anteriores"}, "reacoes_anteriores": {"type": "text", "label": "Reações em tratamentos anteriores"}}'::jsonb,
        'Não usar esfoliantes 3 dias antes. Chegar sem maquiagem. Informar sobre produtos em uso.',
        'Não usar maquiagem por 24h. Evitar sol direto por 48h. Usar protetor solar. Hidratar bem a pele.',
        ARRAY['Pele muito sensível', 'Lesões ativas', 'Uso recente de ácidos fortes', 'Rosácea ativa'],
        ARRAY['Produtos de limpeza', 'Vapor de ozônio', 'Extrator de comedones', 'Máscara calmante', 'Protetor solar'],
        false,
        '{"tags": ["limpeza", "extracao", "skincare"], "categoria": "tratamento_facial", "nivel_complexidade": "baixo", "tempo_recuperacao_dias": 1}'::jsonb
    ) RETURNING id INTO v_template_id;
    
    v_template_data := json_build_object(
        'id', v_template_id,
        'nome', 'Limpeza de Pele Profunda',
        'tipo', 'skincare_avancado'
    );
    v_templates_created := array_append(v_templates_created, v_template_data);
    
    -- Template 5: Microagulhamento
    INSERT INTO public.templates_procedimentos (
        clinica_id, criado_por, tipo_procedimento, nome_template, descricao,
        duracao_padrao_minutos, valor_base, campos_obrigatorios, campos_opcionais,
        instrucoes_pre_procedimento, instrucoes_pos_procedimento,
        contraindicacoes, materiais_necessarios, requer_avaliacao_previa,
        metadata
    ) VALUES (
        p_clinica_id, p_created_by, 'microagulhamento', 'Microagulhamento Facial',
        'Template para microagulhamento facial para rejuvenescimento',
        75, 200.00,
        '{"objetivo": {"type": "select", "label": "Objetivo principal", "options": ["Rugas", "Cicatrizes", "Flacidez", "Melasma", "Poros"], "required": true}, "profundidade": {"type": "select", "label": "Profundidade das agulhas", "options": ["0.5mm", "1.0mm", "1.5mm", "2.0mm"], "required": true}, "area_tratamento": {"type": "array", "label": "Áreas de tratamento", "required": true}}'::jsonb,
        '{"tratamentos_anteriores": {"type": "text", "label": "Microagulhamentos anteriores"}, "cicatrizacao": {"type": "text", "label": "Histórico de cicatrização"}, "medicamentos": {"type": "text", "label": "Medicamentos em uso"}}'::jsonb,
        'Suspender ácidos 5 dias antes. Não fazer depilação 48h antes. Usar protetor solar diariamente.',
        'Não usar maquiagem por 12h. Evitar sol por 48h. Usar protetor solar FPS 60+. Hidratar bem. Retorno em 30 dias.',
        ARRAY['Gravidez', 'Amamentação', 'Quelóide', 'Infecção ativa', 'Uso de anticoagulantes'],
        ARRAY['Roller ou pen', 'Anestésico tópico', 'Soro fisiológico', 'Máscara calmante', 'Protetor solar'],
        true,
        '{"tags": ["microagulhamento", "rejuvenescimento", "cicatrizes"], "categoria": "tratamento_facial", "nivel_complexidade": "medio", "tempo_recuperacao_dias": 2}'::jsonb
    ) RETURNING id INTO v_template_id;
    
    v_template_data := json_build_object(
        'id', v_template_id,
        'nome', 'Microagulhamento Facial',
        'tipo', 'microagulhamento'
    );
    v_templates_created := array_append(v_templates_created, v_template_data);
    
    -- Construir resultado final
    v_result := json_build_object(
        'success', true,
        'clinica_id', p_clinica_id,
        'templates_created', array_to_json(v_templates_created),
        'total_templates', array_length(v_templates_created, 1),
        'created_at', now(),
        'created_by', p_created_by
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'clinica_id', p_clinica_id
        );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: VALIDAR CAMPOS DE TEMPLATE
-- =====================================================

CREATE OR REPLACE FUNCTION public.validate_template_fields(
    p_campos_obrigatorios JSONB,
    p_campos_opcionais JSONB DEFAULT '{}'::jsonb
)
RETURNS JSON AS $
DECLARE
    v_campo_key TEXT;
    v_campo_config JSONB;
    v_errors TEXT[] := '{}';
    v_warnings TEXT[] := '{}';
    v_result JSON;
BEGIN
    -- Validar campos obrigatórios
    FOR v_campo_key IN SELECT jsonb_object_keys(p_campos_obrigatorios)
    LOOP
        v_campo_config := p_campos_obrigatorios->v_campo_key;
        
        -- Verificar chaves obrigatórias
        IF NOT (v_campo_config ? 'type') THEN
            v_errors := array_append(v_errors, format('Campo "%s": propriedade "type" é obrigatória', v_campo_key));
        END IF;
        
        IF NOT (v_campo_config ? 'label') THEN
            v_errors := array_append(v_errors, format('Campo "%s": propriedade "label" é obrigatória', v_campo_key));
        END IF;
        
        -- Validar tipo
        IF v_campo_config ? 'type' AND NOT (v_campo_config->>'type' IN ('text', 'number', 'boolean', 'array', 'date', 'select')) THEN
            v_errors := array_append(v_errors, format('Campo "%s": tipo "%s" não é válido', v_campo_key, v_campo_config->>'type'));
        END IF;
        
        -- Validar select options
        IF v_campo_config->>'type' = 'select' AND NOT (v_campo_config ? 'options') THEN
            v_errors := array_append(v_errors, format('Campo "%s": tipo "select" requer propriedade "options"', v_campo_key));
        END IF;
        
        -- Avisos para melhorias
        IF NOT (v_campo_config ? 'placeholder') THEN
            v_warnings := array_append(v_warnings, format('Campo "%s": considere adicionar "placeholder"', v_campo_key));
        END IF;
    END LOOP;
    
    -- Validar campos opcionais (mesma lógica)
    FOR v_campo_key IN SELECT jsonb_object_keys(p_campos_opcionais)
    LOOP
        v_campo_config := p_campos_opcionais->v_campo_key;
        
        IF NOT (v_campo_config ? 'type') THEN
            v_errors := array_append(v_errors, format('Campo opcional "%s": propriedade "type" é obrigatória', v_campo_key));
        END IF;
        
        IF NOT (v_campo_config ? 'label') THEN
            v_errors := array_append(v_errors, format('Campo opcional "%s": propriedade "label" é obrigatória', v_campo_key));
        END IF;
        
        IF v_campo_config ? 'type' AND NOT (v_campo_config->>'type' IN ('text', 'number', 'boolean', 'array', 'date', 'select')) THEN
            v_errors := array_append(v_errors, format('Campo opcional "%s": tipo "%s" não é válido', v_campo_key, v_campo_config->>'type'));
        END IF;
        
        IF v_campo_config->>'type' = 'select' AND NOT (v_campo_config ? 'options') THEN
            v_errors := array_append(v_errors, format('Campo opcional "%s": tipo "select" requer propriedade "options"', v_campo_key));
        END IF;
    END LOOP;
    
    -- Construir resultado
    v_result := json_build_object(
        'valid', array_length(v_errors, 1) IS NULL OR array_length(v_errors, 1) = 0,
        'errors', array_to_json(v_errors),
        'warnings', array_to_json(v_warnings),
        'total_errors', COALESCE(array_length(v_errors, 1), 0),
        'total_warnings', COALESCE(array_length(v_warnings, 1), 0)
    );
    
    RETURN v_result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: CRIAR NOVA VERSÃO DE TEMPLATE
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_template_version(
    p_template_id UUID,
    p_changes JSONB,
    p_created_by UUID DEFAULT auth.uid()
)
RETURNS JSON AS $
DECLARE
    v_original_template RECORD;
    v_new_template_id UUID;
    v_new_version INTEGER;
    v_result JSON;
BEGIN
    -- Buscar template original
    SELECT * INTO v_original_template 
    FROM public.templates_procedimentos 
    WHERE id = p_template_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template não encontrado: %', p_template_id;
    END IF;
    
    -- Verificar permissão
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = p_created_by 
        AND ur.clinica_id = v_original_template.clinica_id
        AND ur.role IN ('proprietaria', 'gerente', 'profissionais')
    ) THEN
        RAISE EXCEPTION 'Usuário não tem permissão para versionar este template';
    END IF;
    
    -- Calcular nova versão
    SELECT COALESCE(MAX(versao), 0) + 1 INTO v_new_version
    FROM public.templates_procedimentos
    WHERE template_pai_id = p_template_id OR id = p_template_id;
    
    -- Criar nova versão
    INSERT INTO public.templates_procedimentos (
        clinica_id, criado_por, tipo_procedimento, nome_template, descricao,
        duracao_padrao_minutos, valor_base, campos_obrigatorios, campos_opcionais,
        instrucoes_pre_procedimento, instrucoes_pos_procedimento,
        contraindicacoes, materiais_necessarios, permite_agendamento_online,
        requer_avaliacao_previa, intervalo_minimo_dias, status, publico,
        versao, template_pai_id, metadata
    ) VALUES (
        v_original_template.clinica_id,
        p_created_by,
        COALESCE((p_changes->>'tipo_procedimento')::tipo_procedimento, v_original_template.tipo_procedimento),
        COALESCE(p_changes->>'nome_template', v_original_template.nome_template),
        COALESCE(p_changes->>'descricao', v_original_template.descricao),
        COALESCE((p_changes->>'duracao_padrao_minutos')::INTEGER, v_original_template.duracao_padrao_minutos),
        COALESCE((p_changes->>'valor_base')::DECIMAL, v_original_template.valor_base),
        COALESCE(p_changes->'campos_obrigatorios', v_original_template.campos_obrigatorios),
        COALESCE(p_changes->'campos_opcionais', v_original_template.campos_opcionais),
        COALESCE(p_changes->>'instrucoes_pre_procedimento', v_original_template.instrucoes_pre_procedimento),
        COALESCE(p_changes->>'instrucoes_pos_procedimento', v_original_template.instrucoes_pos_procedimento),
        COALESCE(
            CASE WHEN p_changes ? 'contraindicacoes' 
                 THEN ARRAY(SELECT jsonb_array_elements_text(p_changes->'contraindicacoes'))
                 ELSE v_original_template.contraindicacoes 
            END
        ),
        COALESCE(
            CASE WHEN p_changes ? 'materiais_necessarios' 
                 THEN ARRAY(SELECT jsonb_array_elements_text(p_changes->'materiais_necessarios'))
                 ELSE v_original_template.materiais_necessarios 
            END
        ),
        COALESCE((p_changes->>'permite_agendamento_online')::BOOLEAN, v_original_template.permite_agendamento_online),
        COALESCE((p_changes->>'requer_avaliacao_previa')::BOOLEAN, v_original_template.requer_avaliacao_previa),
        COALESCE((p_changes->>'intervalo_minimo_dias')::INTEGER, v_original_template.intervalo_minimo_dias),
        COALESCE((p_changes->>'status')::status_template, v_original_template.status),
        COALESCE((p_changes->>'publico')::BOOLEAN, v_original_template.publico),
        v_new_version,
        CASE WHEN v_original_template.template_pai_id IS NULL THEN p_template_id ELSE v_original_template.template_pai_id END,
        COALESCE(p_changes->'metadata', v_original_template.metadata)
    ) RETURNING id INTO v_new_template_id;
    
    -- Construir resultado
    v_result := json_build_object(
        'success', true,
        'original_template_id', p_template_id,
        'new_template_id', v_new_template_id,
        'new_version', v_new_version,
        'changes_applied', p_changes,
        'created_at', now(),
        'created_by', p_created_by
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'template_id', p_template_id
        );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: OBTER TEMPLATES DISPONÍVEIS PARA CLÍNICA
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_available_templates(
    p_clinica_id UUID,
    p_tipo_procedimento tipo_procedimento DEFAULT NULL,
    p_include_public BOOLEAN DEFAULT true
)
RETURNS JSON AS $
DECLARE
    v_result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', t.id,
            'nome_template', t.nome_template,
            'tipo_procedimento', t.tipo_procedimento,
            'descricao', t.descricao,
            'duracao_padrao_minutos', t.duracao_padrao_minutos,
            'valor_base', t.valor_base,
            'publico', t.publico,
            'versao', t.versao,
            'requer_avaliacao_previa', t.requer_avaliacao_previa,
            'permite_agendamento_online', t.permite_agendamento_online,
            'metadata', t.metadata,
            'criado_em', t.criado_em,
            'is_own_template', t.clinica_id = p_clinica_id
        ) ORDER BY t.publico ASC, t.nome_template ASC
    ) INTO v_result
    FROM public.templates_procedimentos t
    WHERE t.status = 'ativo'
    AND (
        t.clinica_id = p_clinica_id
        OR (p_include_public = true AND t.publico = true)
    )
    AND (p_tipo_procedimento IS NULL OR t.tipo_procedimento = p_tipo_procedimento);
    
    RETURN COALESCE(v_result, '[]'::json);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION public.create_basic_procedure_templates(UUID, UUID) IS 'Cria templates básicos padrão para uma nova clínica';
COMMENT ON FUNCTION public.validate_template_fields(JSONB, JSONB) IS 'Valida estrutura dos campos obrigatórios e opcionais de um template';
COMMENT ON FUNCTION public.create_template_version(UUID, JSONB, UUID) IS 'Cria nova versão de um template existente com alterações';
COMMENT ON FUNCTION public.get_available_templates(UUID, tipo_procedimento, BOOLEAN) IS 'Retorna templates disponíveis para uma clínica (próprios + públicos)';

-- =====================================================
-- MENSAGEM DE CONCLUSÃO
-- =====================================================

DO $ 
BEGIN 
    RAISE NOTICE '=== FUNÇÕES PARA TEMPLATES BÁSICOS CRIADAS ===';
    RAISE NOTICE 'Funções implementadas:';
    RAISE NOTICE '- create_basic_procedure_templates(): Cria 5 templates padrão';
    RAISE NOTICE '- validate_template_fields(): Valida estrutura de campos';
    RAISE NOTICE '- create_template_version(): Sistema de versionamento';
    RAISE NOTICE '- get_available_templates(): Lista templates disponíveis';
    RAISE NOTICE '=== READY FOR TEMPLATE MANAGEMENT ===';
END $;