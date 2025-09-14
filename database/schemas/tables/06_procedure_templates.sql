-- =====================================================
-- PROCEDURE TEMPLATES SYSTEM
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- =====================================================
-- PROCEDURE TEMPLATES TABLE
-- =====================================================

-- Main table for procedure templates with JSON validation
CREATE TABLE public.templates_procedimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template identification
  nome_template TEXT NOT NULL,
  tipo_procedimento tipo_procedimento NOT NULL,
  categoria TEXT DEFAULT 'padrao', -- 'padrao', 'personalizado', 'avancado'
  descricao TEXT,
  
  -- Template structure and validation
  campos_obrigatorios JSONB NOT NULL,
  campos_opcionais JSONB DEFAULT '{}'::jsonb,
  validacoes JSONB DEFAULT '{}'::jsonb,
  valores_padrao JSONB DEFAULT '{}'::jsonb,
  
  -- Medical and safety information
  indicacoes TEXT[],
  contraindicacoes TEXT[],
  cuidados_pre_procedimento TEXT[],
  cuidados_pos_procedimento TEXT[],
  riscos_associados TEXT[],
  
  -- Professional requirements
  especialidades_requeridas especialidade_medica[],
  nivel_experiencia_minimo TEXT, -- 'iniciante', 'intermediario', 'avancado', 'especialista'
  certificacoes_necessarias TEXT[],
  
  -- Equipment and products
  equipamentos_necessarios JSONB DEFAULT '[]'::jsonb,
  produtos_recomendados JSONB DEFAULT '[]'::jsonb,
  materiais_consumiveis JSONB DEFAULT '[]'::jsonb,
  
  -- Timing and scheduling
  duracao_estimada_minutos INTEGER,
  intervalo_minimo_dias INTEGER,
  numero_sessoes_tipico INTEGER,
  
  -- Financial information
  custo_base_estimado DECIMAL(10,2),
  margem_lucro_sugerida DECIMAL(5,2),
  
  -- Configuration and customization
  personalizavel BOOLEAN NOT NULL DEFAULT true,
  permite_modificacao_campos BOOLEAN DEFAULT true,
  requer_aprovacao_modificacao BOOLEAN DEFAULT false,
  
  -- Display and organization
  ordem_exibicao INTEGER DEFAULT 0,
  icone_template TEXT,
  cor_categoria TEXT,
  tags TEXT[],
  
  -- Versioning and approval
  versao TEXT NOT NULL DEFAULT '1.0',
  versao_anterior UUID REFERENCES public.templates_procedimentos(id),
  aprovado BOOLEAN DEFAULT false,
  aprovado_por UUID REFERENCES auth.users(id),
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  
  -- Scope and availability
  publico BOOLEAN DEFAULT false, -- Available to all clinics
  organizacao_id UUID REFERENCES public.organizacoes(id),
  clinica_id UUID REFERENCES public.clinicas(id),
  
  -- Usage statistics
  vezes_utilizado INTEGER DEFAULT 0,
  ultima_utilizacao TIMESTAMP WITH TIME ZONE,
  
  -- Status and lifecycle
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_desativacao TIMESTAMP WITH TIME ZONE,
  motivo_desativacao TEXT,
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT templates_duracao_positiva CHECK (duracao_estimada_minutos IS NULL OR duracao_estimada_minutos > 0),
  CONSTRAINT templates_intervalo_positivo CHECK (intervalo_minimo_dias IS NULL OR intervalo_minimo_dias >= 0),
  CONSTRAINT templates_sessoes_positivas CHECK (numero_sessoes_tipico IS NULL OR numero_sessoes_tipico > 0),
  CONSTRAINT templates_custo_positivo CHECK (custo_base_estimado IS NULL OR custo_base_estimado >= 0),
  CONSTRAINT templates_margem_valida CHECK (margem_lucro_sugerida IS NULL OR (margem_lucro_sugerida >= 0 AND margem_lucro_sugerida <= 100))
);

-- =====================================================
-- TEMPLATE FIELDS TABLE
-- =====================================================

-- Table for defining individual template fields with detailed configuration
CREATE TABLE public.template_campos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.templates_procedimentos(id) ON DELETE CASCADE,
  
  -- Field identification
  nome_campo TEXT NOT NULL,
  label_campo TEXT NOT NULL,
  descricao_campo TEXT,
  
  -- Field type and validation
  tipo_campo TEXT NOT NULL, -- 'text', 'number', 'date', 'select', 'multiselect', 'boolean', 'textarea', 'file'
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  
  -- Validation rules
  valor_minimo DECIMAL,
  valor_maximo DECIMAL,
  tamanho_minimo INTEGER,
  tamanho_maximo INTEGER,
  regex_validacao TEXT,
  opcoes_validas JSONB, -- For select/multiselect fields
  
  -- Default values and behavior
  valor_padrao TEXT,
  placeholder TEXT,
  help_text TEXT,
  
  -- Display configuration
  ordem_exibicao INTEGER NOT NULL DEFAULT 0,
  largura_campo TEXT DEFAULT 'full', -- 'full', 'half', 'third', 'quarter'
  grupo_campo TEXT, -- For organizing fields into groups
  
  -- Conditional display
  condicao_exibicao JSONB, -- JSON rules for when to show this field
  dependencias TEXT[], -- Other fields this field depends on
  
  -- Medical relevance
  categoria_medica TEXT, -- 'anamnese', 'exame_fisico', 'procedimento', 'pos_procedimento'
  relevancia_clinica TEXT DEFAULT 'normal', -- 'baixa', 'normal', 'alta', 'critica'
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT template_campos_unique UNIQUE(template_id, nome_campo),
  CONSTRAINT template_campos_ordem_positiva CHECK (ordem_exibicao >= 0),
  CONSTRAINT template_campos_tamanho_valido CHECK (
    (tamanho_minimo IS NULL OR tamanho_minimo >= 0) AND
    (tamanho_maximo IS NULL OR tamanho_maximo >= tamanho_minimo)
  )
);

-- =====================================================
-- TEMPLATE USAGE LOG TABLE
-- =====================================================

-- Table for tracking template usage and performance
CREATE TABLE public.template_uso_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.templates_procedimentos(id) ON DELETE CASCADE,
  
  -- Usage context
  prontuario_id UUID REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  sessao_id UUID REFERENCES public.sessoes_atendimento(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES auth.users(id),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id),
  
  -- Usage details
  data_uso TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  campos_preenchidos JSONB NOT NULL,
  campos_modificados TEXT[], -- Fields that were changed from default
  tempo_preenchimento_segundos INTEGER,
  
  -- Outcome and feedback
  procedimento_concluido BOOLEAN DEFAULT false,
  satisfacao_template INTEGER CHECK (satisfacao_template >= 1 AND satisfacao_template <= 5),
  comentarios_uso TEXT,
  sugestoes_melhoria TEXT,
  
  -- Performance metrics
  erros_validacao INTEGER DEFAULT 0,
  campos_obrigatorios_faltantes TEXT[],
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- TEMPLATE CATEGORIES TABLE
-- =====================================================

-- Table for organizing templates into categories
CREATE TABLE public.categorias_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Category identification
  nome_categoria TEXT NOT NULL UNIQUE,
  descricao TEXT,
  
  -- Visual configuration
  icone TEXT,
  cor TEXT,
  
  -- Organization
  categoria_pai UUID REFERENCES public.categorias_template(id),
  ordem_exibicao INTEGER DEFAULT 0,
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for templates_procedimentos table
CREATE INDEX idx_templates_tipo ON public.templates_procedimentos(tipo_procedimento);
CREATE INDEX idx_templates_categoria ON public.templates_procedimentos(categoria);
CREATE INDEX idx_templates_ativo ON public.templates_procedimentos(ativo);
CREATE INDEX idx_templates_publico ON public.templates_procedimentos(publico);
CREATE INDEX idx_templates_organizacao ON public.templates_procedimentos(organizacao_id) WHERE organizacao_id IS NOT NULL;
CREATE INDEX idx_templates_clinica ON public.templates_procedimentos(clinica_id) WHERE clinica_id IS NOT NULL;
CREATE INDEX idx_templates_aprovado ON public.templates_procedimentos(aprovado);
CREATE INDEX idx_templates_especialidades ON public.templates_procedimentos USING GIN(especialidades_requeridas);
CREATE INDEX idx_templates_tags ON public.templates_procedimentos USING GIN(tags);

-- Indexes for template_campos table
CREATE INDEX idx_template_campos_template ON public.template_campos(template_id);
CREATE INDEX idx_template_campos_tipo ON public.template_campos(tipo_campo);
CREATE INDEX idx_template_campos_obrigatorio ON public.template_campos(obrigatorio);
CREATE INDEX idx_template_campos_ordem ON public.template_campos(template_id, ordem_exibicao);
CREATE INDEX idx_template_campos_ativo ON public.template_campos(ativo);

-- Indexes for template_uso_log table
CREATE INDEX idx_template_uso_template ON public.template_uso_log(template_id);
CREATE INDEX idx_template_uso_profissional ON public.template_uso_log(profissional_id);
CREATE INDEX idx_template_uso_clinica ON public.template_uso_log(clinica_id);
CREATE INDEX idx_template_uso_data ON public.template_uso_log(data_uso);
CREATE INDEX idx_template_uso_prontuario ON public.template_uso_log(prontuario_id) WHERE prontuario_id IS NOT NULL;

-- Indexes for categorias_template table
CREATE INDEX idx_categorias_pai ON public.categorias_template(categoria_pai) WHERE categoria_pai IS NOT NULL;
CREATE INDEX idx_categorias_ativo ON public.categorias_template(ativo);
CREATE INDEX idx_categorias_ordem ON public.categorias_template(ordem_exibicao);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Triggers for updating timestamps
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates_procedimentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_template_campos_updated_at
  BEFORE UPDATE ON public.template_campos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categorias_updated_at
  BEFORE UPDATE ON public.categorias_template
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update usage statistics
CREATE OR REPLACE FUNCTION public.update_template_usage_stats()
RETURNS TRIGGER AS $
BEGIN
  UPDATE public.templates_procedimentos 
  SET 
    vezes_utilizado = vezes_utilizado + 1,
    ultima_utilizacao = NEW.data_uso
  WHERE id = NEW.template_id;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER update_template_stats
  AFTER INSERT ON public.template_uso_log
  FOR EACH ROW
  EXECUTE FUNCTION public.update_template_usage_stats();

-- =====================================================
-- TEMPLATE SYSTEM FUNCTIONS
-- =====================================================

-- Function to create procedure template
CREATE OR REPLACE FUNCTION public.create_procedure_template(
  p_nome_template TEXT,
  p_tipo_procedimento tipo_procedimento,
  p_campos_obrigatorios JSONB,
  p_campos_opcionais JSONB DEFAULT '{}'::jsonb,
  p_descricao TEXT DEFAULT NULL,
  p_duracao_estimada_minutos INTEGER DEFAULT NULL,
  p_organizacao_id UUID DEFAULT NULL,
  p_clinica_id UUID DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  new_template_id UUID;
BEGIN
  -- Validate JSON structure for required fields
  IF NOT (p_campos_obrigatorios ? 'fields' OR jsonb_typeof(p_campos_obrigatorios) = 'object') THEN
    RAISE EXCEPTION 'campos_obrigatorios must be a valid JSON object';
  END IF;
  
  -- Insert template
  INSERT INTO public.templates_procedimentos (
    nome_template,
    tipo_procedimento,
    campos_obrigatorios,
    campos_opcionais,
    descricao,
    duracao_estimada_minutos,
    organizacao_id,
    clinica_id,
    criado_por
  ) VALUES (
    p_nome_template,
    p_tipo_procedimento,
    p_campos_obrigatorios,
    p_campos_opcionais,
    p_descricao,
    p_duracao_estimada_minutos,
    p_organizacao_id,
    p_clinica_id,
    auth.uid()
  ) RETURNING id INTO new_template_id;
  
  RETURN new_template_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to validate template data against template structure
CREATE OR REPLACE FUNCTION public.validate_template_data(
  p_template_id UUID,
  p_data JSONB
)
RETURNS JSONB AS $
DECLARE
  template_record RECORD;
  validation_result JSONB;
  missing_fields TEXT[];
  field_key TEXT;
  field_config JSONB;
BEGIN
  -- Get template configuration
  SELECT * INTO template_record
  FROM public.templates_procedimentos
  WHERE id = p_template_id AND ativo = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Template not found or inactive');
  END IF;
  
  -- Initialize validation result
  validation_result := jsonb_build_object('valid', true, 'errors', '[]'::jsonb, 'warnings', '[]'::jsonb);
  
  -- Check required fields
  FOR field_key IN SELECT jsonb_object_keys(template_record.campos_obrigatorios)
  LOOP
    IF NOT (p_data ? field_key) THEN
      missing_fields := array_append(missing_fields, field_key);
    END IF;
  END LOOP;
  
  -- Add missing fields error if any
  IF array_length(missing_fields, 1) > 0 THEN
    validation_result := jsonb_set(
      validation_result,
      '{valid}',
      'false'::jsonb
    );
    validation_result := jsonb_set(
      validation_result,
      '{errors}',
      validation_result->'errors' || jsonb_build_object(
        'type', 'missing_required_fields',
        'fields', to_jsonb(missing_fields)
      )
    );
  END IF;
  
  RETURN validation_result;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get available templates for user
CREATE OR REPLACE FUNCTION public.get_available_templates(
  p_tipo_procedimento tipo_procedimento DEFAULT NULL,
  p_clinica_id UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  nome_template TEXT,
  tipo_procedimento tipo_procedimento,
  descricao TEXT,
  duracao_estimada_minutos INTEGER,
  vezes_utilizado INTEGER,
  categoria TEXT
) AS $
DECLARE
  user_clinica_id UUID;
  user_organizacao_id UUID;
BEGIN
  -- Get user's clinic and organization context
  SELECT ur.clinica_id, ur.organizacao_id 
  INTO user_clinica_id, user_organizacao_id
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid() 
    AND ur.ativo = true
    AND (p_clinica_id IS NULL OR ur.clinica_id = p_clinica_id)
  LIMIT 1;
  
  RETURN QUERY
  SELECT 
    t.id,
    t.nome_template,
    t.tipo_procedimento,
    t.descricao,
    t.duracao_estimada_minutos,
    t.vezes_utilizado,
    t.categoria
  FROM public.templates_procedimentos t
  WHERE t.ativo = true
    AND t.aprovado = true
    AND (p_tipo_procedimento IS NULL OR t.tipo_procedimento = p_tipo_procedimento)
    AND (
      t.publico = true OR
      t.organizacao_id = user_organizacao_id OR
      t.clinica_id = user_clinica_id
    )
  ORDER BY t.vezes_utilizado DESC, t.nome_template;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to log template usage
CREATE OR REPLACE FUNCTION public.log_template_usage(
  p_template_id UUID,
  p_prontuario_id UUID,
  p_sessao_id UUID DEFAULT NULL,
  p_campos_preenchidos JSONB,
  p_tempo_preenchimento_segundos INTEGER DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  new_log_id UUID;
  user_clinica_id UUID;
BEGIN
  -- Get user's clinic context
  SELECT ur.clinica_id INTO user_clinica_id
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid() AND ur.ativo = true
  LIMIT 1;
  
  -- Insert usage log
  INSERT INTO public.template_uso_log (
    template_id,
    prontuario_id,
    sessao_id,
    profissional_id,
    clinica_id,
    campos_preenchidos,
    tempo_preenchimento_segundos
  ) VALUES (
    p_template_id,
    p_prontuario_id,
    p_sessao_id,
    auth.uid(),
    user_clinica_id,
    p_campos_preenchidos,
    p_tempo_preenchimento_segundos
  ) RETURNING id INTO new_log_id;
  
  RETURN new_log_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get template statistics
CREATE OR REPLACE FUNCTION public.get_template_statistics(p_template_id UUID)
RETURNS JSONB AS $
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_usos', COUNT(*),
    'usuarios_unicos', COUNT(DISTINCT profissional_id),
    'clinicas_utilizaram', COUNT(DISTINCT clinica_id),
    'tempo_medio_preenchimento', AVG(tempo_preenchimento_segundos),
    'satisfacao_media', AVG(satisfacao_template),
    'ultimo_uso', MAX(data_uso),
    'erros_validacao_total', SUM(erros_validacao)
  ) INTO stats
  FROM public.template_uso_log
  WHERE template_id = p_template_id;
  
  RETURN stats;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- INSERT DEFAULT PROCEDURE TEMPLATES
-- =====================================================

-- Insert default template categories
INSERT INTO public.categorias_template (nome_categoria, descricao, icone, cor, ordem_exibicao) VALUES
('Injetáveis', 'Procedimentos com aplicação de injetáveis', 'syringe', '#4F46E5', 1),
('Laser e Luz', 'Tratamentos com equipamentos de laser e luz pulsada', 'zap', '#059669', 2),
('Peeling', 'Procedimentos de peeling químico e físico', 'droplet', '#DC2626', 3),
('Corporal', 'Tratamentos estéticos corporais', 'user', '#7C2D12', 4),
('Facial', 'Tratamentos faciais não invasivos', 'smile', '#BE185D', 5);

-- Insert default procedure templates
INSERT INTO public.templates_procedimentos (
  nome_template, 
  tipo_procedimento, 
  categoria,
  descricao,
  campos_obrigatorios, 
  campos_opcionais,
  indicacoes,
  contraindicacoes,
  duracao_estimada_minutos,
  numero_sessoes_tipico,
  publico,
  aprovado
) VALUES
(
  'Aplicação de Toxina Botulínica Padrão',
  'botox_toxina',
  'padrao',
  'Template padrão para aplicação de toxina botulínica em rugas de expressão',
  '{
    "regioes_aplicacao": {"type": "array", "required": true, "label": "Regiões de Aplicação"},
    "unidades_totais": {"type": "number", "required": true, "min": 1, "max": 200, "label": "Unidades Totais"},
    "produto_utilizado": {"type": "select", "required": true, "options": ["Botox", "Dysport", "Xeomin", "Prosigne"], "label": "Produto Utilizado"},
    "tecnica_aplicacao": {"type": "select", "required": true, "options": ["Intramuscular", "Intradérmica"], "label": "Técnica de Aplicação"},
    "diluicao": {"type": "text", "required": true, "label": "Diluição Utilizada"}
  }',
  '{
    "lote_produto": {"type": "text", "label": "Lote do Produto"},
    "validade_produto": {"type": "date", "label": "Validade do Produto"},
    "tempo_aplicacao": {"type": "number", "label": "Tempo de Aplicação (min)"},
    "orientacoes_pos": {"type": "textarea", "label": "Orientações Pós-Procedimento"},
    "retorno_recomendado": {"type": "number", "label": "Retorno Recomendado (dias)"}
  }',
  ARRAY['Rugas dinâmicas', 'Linhas de expressão', 'Hiperidrose', 'Bruxismo'],
  ARRAY['Gravidez', 'Lactação', 'Miastenia gravis', 'Infecção local', 'Alergia ao produto'],
  30,
  1,
  true,
  true
),
(
  'Preenchimento com Ácido Hialurônico',
  'preenchimento',
  'padrao',
  'Template para preenchimento facial com ácido hialurônico',
  '{
    "area_tratada": {"type": "select", "required": true, "options": ["Lábios", "Sulco nasogeniano", "Bigode chinês", "Olheiras", "Malar", "Mandíbula"], "label": "Área Tratada"},
    "volume_aplicado": {"type": "number", "required": true, "min": 0.1, "max": 5.0, "step": 0.1, "label": "Volume Aplicado (ml)"},
    "produto_utilizado": {"type": "select", "required": true, "options": ["Juvederm", "Restylane", "Belotero", "Radiesse"], "label": "Produto Utilizado"},
    "tecnica_injecao": {"type": "select", "required": true, "options": ["Linear", "Pontos", "Leque", "Cross-hatching"], "label": "Técnica de Injeção"},
    "calibre_agulha": {"type": "select", "required": true, "options": ["25G", "27G", "30G", "Cânula 22G", "Cânula 25G"], "label": "Calibre da Agulha/Cânula"}
  }',
  '{
    "anestesia_utilizada": {"type": "select", "options": ["Tópica", "Bloqueio", "Não utilizada"], "label": "Anestesia Utilizada"},
    "tempo_procedimento": {"type": "number", "label": "Tempo de Procedimento (min)"},
    "massagem_pos": {"type": "boolean", "label": "Massagem Pós-Procedimento"},
    "gelo_aplicado": {"type": "boolean", "label": "Gelo Aplicado"},
    "retorno_recomendado": {"type": "number", "label": "Retorno Recomendado (dias)"}
  }',
  ARRAY['Perda de volume facial', 'Rugas estáticas', 'Assimetrias faciais', 'Aumento labial'],
  ARRAY['Gravidez', 'Lactação', 'Infecção local', 'Histórico de quelóide', 'Alergia ao ácido hialurônico'],
  45,
  1,
  true,
  true
),
(
  'Harmonização Facial Completa',
  'harmonizacao_facial',
  'avancado',
  'Template para planejamento de harmonização facial completa',
  '{
    "areas_tratamento": {"type": "multiselect", "required": true, "options": ["Terço superior", "Terço médio", "Terço inferior", "Pescoço"], "label": "Áreas de Tratamento"},
    "plano_tratamento": {"type": "textarea", "required": true, "label": "Plano de Tratamento Detalhado"},
    "procedimentos_realizados": {"type": "multiselect", "required": true, "options": ["Toxina botulínica", "Preenchimento", "Bioestimulador", "Fios de PDO"], "label": "Procedimentos Realizados"},
    "profissional_responsavel": {"type": "text", "required": true, "label": "Profissional Responsável"}
  }',
  '{
    "faseamento": {"type": "textarea", "label": "Faseamento do Tratamento"},
    "cronograma": {"type": "textarea", "label": "Cronograma de Sessões"},
    "custo_total": {"type": "number", "label": "Custo Total Estimado"},
    "fotos_planejamento": {"type": "file", "multiple": true, "label": "Fotos de Planejamento"}
  }',
  ARRAY['Assimetrias faciais', 'Envelhecimento facial', 'Perda de definição facial'],
  ARRAY['Expectativas irreais', 'Dismorfofobia', 'Gravidez', 'Lactação'],
  120,
  3,
  true,
  true
);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.templates_procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_campos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_uso_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_template ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Policies for templates_procedimentos
CREATE POLICY "Profissionais podem visualizar templates disponíveis"
ON public.templates_procedimentos FOR SELECT
USING (
  ativo = true AND (
    publico = true OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND (ur.organizacao_id = public.templates_procedimentos.organizacao_id OR 
             ur.clinica_id = public.templates_procedimentos.clinica_id)
        AND ur.ativo = true
    )
  )
);

CREATE POLICY "Gerentes podem criar templates para suas organizações"
ON public.templates_procedimentos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.organizacao_id = NEW.organizacao_id OR ur.clinica_id = NEW.clinica_id)
      AND ur.role IN ('proprietaria', 'gerente')
      AND ur.ativo = true
  ) AND criado_por = auth.uid()
);

CREATE POLICY "Criadores podem atualizar seus templates"
ON public.templates_procedimentos FOR UPDATE
USING (criado_por = auth.uid());

-- Policies for template_campos
CREATE POLICY "Profissionais podem visualizar campos de templates disponíveis"
ON public.template_campos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.templates_procedimentos t
    WHERE t.id = public.template_campos.template_id
      AND (t.publico = true OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND (ur.organizacao_id = t.organizacao_id OR ur.clinica_id = t.clinica_id)
          AND ur.ativo = true
      ))
  )
);

-- Policies for template_uso_log
CREATE POLICY "Profissionais podem visualizar logs de suas clínicas"
ON public.template_uso_log FOR SELECT
USING (
  profissional_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.clinica_id = public.template_uso_log.clinica_id
      AND ur.role IN ('proprietaria', 'gerente')
      AND ur.ativo = true
  )
);

CREATE POLICY "Profissionais podem registrar uso de templates"
ON public.template_uso_log FOR INSERT
WITH CHECK (profissional_id = auth.uid());

-- Policies for categorias_template
CREATE POLICY "Todos podem visualizar categorias ativas"
ON public.categorias_template FOR SELECT
USING (ativo = true);

CREATE POLICY "Administradores podem gerenciar categorias"
ON public.categorias_template FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'proprietaria')
      AND ur.ativo = true
  )
);

-- =====================================================
-- COMPLETION VERIFICATION
-- =====================================================

-- Verify all tables were created successfully
DO $
DECLARE
  table_count INTEGER;
  template_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('templates_procedimentos', 'template_campos', 'template_uso_log', 'categorias_template');
  
  SELECT COUNT(*) INTO template_count
  FROM public.templates_procedimentos
  WHERE publico = true AND aprovado = true;
  
  IF table_count = 4 THEN
    RAISE NOTICE 'Procedure templates system created successfully: % tables, % default templates', table_count, template_count;
  ELSE
    RAISE EXCEPTION 'Procedure templates system incomplete - only % tables created', table_count;
  END IF;
END $;

-- Add comments to track completion
COMMENT ON TABLE public.templates_procedimentos IS 'Procedure templates with JSON validation - created ' || now();
COMMENT ON TABLE public.template_campos IS 'Template field definitions - created ' || now();
COMMENT ON TABLE public.template_uso_log IS 'Template usage tracking - created ' || now();
COMMENT ON TABLE public.categorias_template IS 'Template categories organization - created ' || now();