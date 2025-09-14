-- =====================================================
-- MEDICAL IMAGES AND CONSENT SYSTEM
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- =====================================================
-- MEDICAL IMAGES TABLE
-- =====================================================

-- Table for secure medical images with comprehensive metadata
CREATE TABLE public.imagens_medicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prontuario_id UUID NOT NULL REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  sessao_id UUID REFERENCES public.sessoes_atendimento(id) ON DELETE CASCADE,
  
  -- Image identification and classification
  nome_arquivo TEXT NOT NULL,
  nome_original TEXT NOT NULL, -- Original filename from upload
  tipo_imagem tipo_imagem NOT NULL,
  categoria TEXT, -- 'before_after', 'documentation', 'complication', 'evolution'
  
  -- Storage and access information
  caminho_storage TEXT NOT NULL, -- Path in storage bucket
  url_publica TEXT, -- Public URL if applicable
  bucket_name TEXT NOT NULL DEFAULT 'imagens-medicas',
  
  -- File metadata
  tamanho_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  dimensoes TEXT, -- Format: "1920x1080"
  resolucao_dpi INTEGER,
  
  -- Medical context
  regiao_anatomica TEXT NOT NULL,
  procedimento_relacionado tipo_procedimento,
  momento_captura TEXT, -- 'pre_procedimento', 'durante_procedimento', 'pos_imediato', 'seguimento'
  
  -- Capture details
  data_captura TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  equipamento_utilizado TEXT,
  configuracoes_camera JSONB, -- Camera settings, lighting conditions, etc.
  angulo_captura TEXT,
  distancia_captura TEXT,
  condicoes_iluminacao TEXT,
  
  -- Security and privacy
  hash_arquivo TEXT NOT NULL, -- File integrity hash
  criptografada BOOLEAN NOT NULL DEFAULT false,
  chave_criptografia TEXT, -- Encryption key reference
  watermark_aplicado BOOLEAN NOT NULL DEFAULT false,
  watermark_texto TEXT,
  
  -- Access control and consent
  visivel_paciente BOOLEAN NOT NULL DEFAULT false,
  consentimento_uso BOOLEAN NOT NULL DEFAULT false,
  consentimento_id UUID, -- References consentimentos_digitais
  finalidade_uso TEXT[], -- 'tratamento', 'documentacao', 'ensino', 'pesquisa'
  
  -- Quality and validation
  qualidade_imagem INTEGER CHECK (qualidade_imagem >= 1 AND qualidade_imagem <= 5),
  aprovada_uso BOOLEAN DEFAULT false,
  aprovada_por UUID REFERENCES auth.users(id),
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  
  -- Metadata and tags
  tags TEXT[],
  descricao TEXT,
  observacoes_tecnicas TEXT,
  
  -- Audit and tracking
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT imagens_tamanho_positivo CHECK (tamanho_bytes > 0),
  CONSTRAINT imagens_mime_valido CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/tiff')),
  CONSTRAINT imagens_qualidade_valida CHECK (qualidade_imagem IS NULL OR (qualidade_imagem >= 1 AND qualidade_imagem <= 5))
);

-- =====================================================
-- DIGITAL CONSENTS TABLE
-- =====================================================

-- Table for comprehensive digital consent management
CREATE TABLE public.consentimentos_digitais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prontuario_id UUID NOT NULL REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  
  -- Consent identification
  numero_consentimento TEXT NOT NULL UNIQUE DEFAULT ('CONS-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('consent_sequence')::TEXT, 6, '0')),
  tipo_consentimento tipo_consentimento NOT NULL,
  subtipo TEXT, -- More specific classification
  
  -- Document content
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL, -- Full consent text
  versao_documento TEXT NOT NULL DEFAULT '1.0',
  idioma TEXT NOT NULL DEFAULT 'pt-BR',
  
  -- Template and customization
  template_id UUID, -- Reference to consent template
  campos_personalizados JSONB, -- Custom fields for this consent
  
  -- Legal and regulatory
  base_legal TEXT, -- LGPD, medical ethics, etc.
  regulamentacao_aplicavel TEXT[],
  
  -- Procedures and risks covered
  procedimentos_cobertos tipo_procedimento[],
  riscos_informados TEXT[],
  alternativas_apresentadas TEXT[],
  cuidados_pos_procedimento TEXT[],
  
  -- Digital signature
  assinatura_digital TEXT NOT NULL, -- Cryptographic signature
  hash_documento TEXT NOT NULL, -- Document integrity hash
  certificado_digital TEXT, -- Digital certificate info
  
  -- Signature details
  ip_assinatura INET NOT NULL,
  dispositivo_assinatura TEXT,
  navegador_assinatura TEXT,
  localizacao_assinatura JSONB, -- GPS coordinates if available
  data_assinatura TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Witness information (if required)
  testemunha_necessaria BOOLEAN DEFAULT false,
  testemunha_nome TEXT,
  testemunha_documento TEXT,
  testemunha_assinatura TEXT,
  testemunha_data TIMESTAMP WITH TIME ZONE,
  
  -- Validity and expiration
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_expiracao DATE,
  valido_indefinidamente BOOLEAN DEFAULT false,
  
  -- Status and lifecycle
  status TEXT NOT NULL DEFAULT 'ativo', -- 'ativo', 'expirado', 'revogado', 'suspenso'
  data_revogacao TIMESTAMP WITH TIME ZONE,
  motivo_revogacao TEXT,
  revogado_por UUID REFERENCES auth.users(id),
  
  -- Professional responsibility
  profissional_responsavel_id UUID NOT NULL REFERENCES auth.users(id),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id),
  
  -- Audit and compliance
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT consentimentos_data_expiracao_valida CHECK (
    valido_indefinidamente = true OR 
    (data_expiracao IS NOT NULL AND data_expiracao > data_inicio)
  ),
  CONSTRAINT consentimentos_revogacao_valida CHECK (
    (status = 'revogado' AND data_revogacao IS NOT NULL AND revogado_por IS NOT NULL) OR
    (status != 'revogado' AND data_revogacao IS NULL)
  )
);

-- =====================================================
-- CONSENT TEMPLATES TABLE
-- =====================================================

-- Table for consent document templates
CREATE TABLE public.templates_consentimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template identification
  nome_template TEXT NOT NULL,
  tipo_consentimento tipo_consentimento NOT NULL,
  categoria TEXT, -- 'padrao', 'personalizado', 'especializado'
  
  -- Content and structure
  titulo_padrao TEXT NOT NULL,
  conteudo_template TEXT NOT NULL,
  campos_variaveis JSONB, -- Variable fields that can be customized
  
  -- Versioning
  versao TEXT NOT NULL DEFAULT '1.0',
  versao_anterior UUID REFERENCES public.templates_consentimento(id),
  
  -- Applicability
  procedimentos_aplicaveis tipo_procedimento[],
  especialidades_aplicaveis especialidade_medica[],
  
  -- Legal compliance
  base_legal TEXT[],
  orgao_regulador TEXT,
  data_aprovacao_legal DATE,
  
  -- Configuration
  obrigatorio_testemunha BOOLEAN DEFAULT false,
  permite_assinatura_digital BOOLEAN DEFAULT true,
  validade_dias INTEGER, -- Default validity in days
  
  -- Status and availability
  ativo BOOLEAN NOT NULL DEFAULT true,
  publico BOOLEAN DEFAULT false, -- Available to all clinics
  organizacao_id UUID REFERENCES public.organizacoes(id), -- If specific to organization
  clinica_id UUID REFERENCES public.clinicas(id), -- If specific to clinic
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT templates_validade_positiva CHECK (validade_dias IS NULL OR validade_dias > 0)
);

-- =====================================================
-- IMAGE COLLECTIONS TABLE
-- =====================================================

-- Table for organizing images into collections (before/after sets, evolution series, etc.)
CREATE TABLE public.colecoes_imagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prontuario_id UUID NOT NULL REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  
  -- Collection identification
  nome_colecao TEXT NOT NULL,
  tipo_colecao TEXT NOT NULL, -- 'antes_depois', 'evolucao', 'documentacao', 'complicacao'
  descricao TEXT,
  
  -- Medical context
  procedimento_relacionado tipo_procedimento,
  regiao_anatomica TEXT,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  
  -- Collection metadata
  imagens_ids UUID[], -- Array of image IDs
  ordem_exibicao INTEGER[],
  
  -- Access and sharing
  visivel_paciente BOOLEAN DEFAULT false,
  compartilhavel BOOLEAN DEFAULT false,
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT colecoes_data_fim_valida CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

-- =====================================================
-- SEQUENCES FOR NUMBERING
-- =====================================================

-- Sequence for consent numbering
CREATE SEQUENCE IF NOT EXISTS consent_sequence START 1;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for imagens_medicas table
CREATE INDEX idx_imagens_prontuario ON public.imagens_medicas(prontuario_id);
CREATE INDEX idx_imagens_sessao ON public.imagens_medicas(sessao_id) WHERE sessao_id IS NOT NULL;
CREATE INDEX idx_imagens_tipo ON public.imagens_medicas(tipo_imagem);
CREATE INDEX idx_imagens_regiao ON public.imagens_medicas(regiao_anatomica);
CREATE INDEX idx_imagens_data_captura ON public.imagens_medicas(data_captura);
CREATE INDEX idx_imagens_procedimento ON public.imagens_medicas(procedimento_relacionado) WHERE procedimento_relacionado IS NOT NULL;
CREATE INDEX idx_imagens_hash ON public.imagens_medicas(hash_arquivo);
CREATE INDEX idx_imagens_consentimento ON public.imagens_medicas(consentimento_id) WHERE consentimento_id IS NOT NULL;
CREATE INDEX idx_imagens_visivel_paciente ON public.imagens_medicas(visivel_paciente);

-- Indexes for consentimentos_digitais table
CREATE INDEX idx_consentimentos_prontuario ON public.consentimentos_digitais(prontuario_id);
CREATE INDEX idx_consentimentos_numero ON public.consentimentos_digitais(numero_consentimento);
CREATE INDEX idx_consentimentos_tipo ON public.consentimentos_digitais(tipo_consentimento);
CREATE INDEX idx_consentimentos_status ON public.consentimentos_digitais(status);
CREATE INDEX idx_consentimentos_profissional ON public.consentimentos_digitais(profissional_responsavel_id);
CREATE INDEX idx_consentimentos_clinica ON public.consentimentos_digitais(clinica_id);
CREATE INDEX idx_consentimentos_data_assinatura ON public.consentimentos_digitais(data_assinatura);
CREATE INDEX idx_consentimentos_data_expiracao ON public.consentimentos_digitais(data_expiracao) WHERE data_expiracao IS NOT NULL;

-- Indexes for templates_consentimento table
CREATE INDEX idx_templates_consent_tipo ON public.templates_consentimento(tipo_consentimento);
CREATE INDEX idx_templates_consent_ativo ON public.templates_consentimento(ativo);
CREATE INDEX idx_templates_consent_publico ON public.templates_consentimento(publico);
CREATE INDEX idx_templates_consent_organizacao ON public.templates_consentimento(organizacao_id) WHERE organizacao_id IS NOT NULL;
CREATE INDEX idx_templates_consent_clinica ON public.templates_consentimento(clinica_id) WHERE clinica_id IS NOT NULL;

-- Indexes for colecoes_imagens table
CREATE INDEX idx_colecoes_prontuario ON public.colecoes_imagens(prontuario_id);
CREATE INDEX idx_colecoes_tipo ON public.colecoes_imagens(tipo_colecao);
CREATE INDEX idx_colecoes_procedimento ON public.colecoes_imagens(procedimento_relacionado) WHERE procedimento_relacionado IS NOT NULL;
CREATE INDEX idx_colecoes_ativo ON public.colecoes_imagens(ativo);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Triggers for updating timestamps
CREATE TRIGGER update_imagens_updated_at
  BEFORE UPDATE ON public.imagens_medicas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consentimentos_updated_at
  BEFORE UPDATE ON public.consentimentos_digitais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_templates_consent_updated_at
  BEFORE UPDATE ON public.templates_consentimento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_colecoes_updated_at
  BEFORE UPDATE ON public.colecoes_imagens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- MEDICAL IMAGES AND CONSENT FUNCTIONS
-- =====================================================

-- Function to upload medical image with metadata
CREATE OR REPLACE FUNCTION public.upload_medical_image(
  p_prontuario_id UUID,
  p_sessao_id UUID DEFAULT NULL,
  p_nome_arquivo TEXT,
  p_nome_original TEXT,
  p_tipo_imagem tipo_imagem,
  p_regiao_anatomica TEXT,
  p_caminho_storage TEXT,
  p_tamanho_bytes BIGINT,
  p_mime_type TEXT,
  p_hash_arquivo TEXT,
  p_procedimento_relacionado tipo_procedimento DEFAULT NULL,
  p_consentimento_id UUID DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  new_image_id UUID;
BEGIN
  -- Verify user has access to the medical record
  IF NOT EXISTS (
    SELECT 1 FROM public.prontuarios p
    JOIN public.clinica_profissionais cp ON cp.clinica_id = p.clinica_id
    WHERE p.id = p_prontuario_id
      AND cp.user_id = auth.uid()
      AND cp.ativo = true
  ) THEN
    RAISE EXCEPTION 'User does not have access to this medical record';
  END IF;
  
  -- Insert image record
  INSERT INTO public.imagens_medicas (
    prontuario_id,
    sessao_id,
    nome_arquivo,
    nome_original,
    tipo_imagem,
    regiao_anatomica,
    caminho_storage,
    tamanho_bytes,
    mime_type,
    hash_arquivo,
    procedimento_relacionado,
    consentimento_id,
    criado_por
  ) VALUES (
    p_prontuario_id,
    p_sessao_id,
    p_nome_arquivo,
    p_nome_original,
    p_tipo_imagem,
    p_regiao_anatomica,
    p_caminho_storage,
    p_tamanho_bytes,
    p_mime_type,
    p_hash_arquivo,
    p_procedimento_relacionado,
    p_consentimento_id,
    auth.uid()
  ) RETURNING id INTO new_image_id;
  
  RETURN new_image_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to create digital consent
CREATE OR REPLACE FUNCTION public.create_digital_consent(
  p_prontuario_id UUID,
  p_tipo_consentimento tipo_consentimento,
  p_titulo TEXT,
  p_conteudo TEXT,
  p_profissional_responsavel_id UUID,
  p_clinica_id UUID,
  p_procedimentos_cobertos tipo_procedimento[] DEFAULT NULL,
  p_ip_assinatura INET DEFAULT NULL,
  p_dispositivo_assinatura TEXT DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  new_consent_id UUID;
  document_hash TEXT;
  digital_signature TEXT;
BEGIN
  -- Generate document hash
  document_hash := md5(p_conteudo || p_titulo || now()::text);
  
  -- Generate digital signature (simplified - in production use proper cryptographic signing)
  digital_signature := encode(digest(document_hash || auth.uid()::text || now()::text, 'sha256'), 'hex');
  
  -- Insert consent record
  INSERT INTO public.consentimentos_digitais (
    prontuario_id,
    tipo_consentimento,
    titulo,
    conteudo,
    procedimentos_cobertos,
    hash_documento,
    assinatura_digital,
    ip_assinatura,
    dispositivo_assinatura,
    data_assinatura,
    profissional_responsavel_id,
    clinica_id,
    criado_por
  ) VALUES (
    p_prontuario_id,
    p_tipo_consentimento,
    p_titulo,
    p_conteudo,
    p_procedimentos_cobertos,
    document_hash,
    digital_signature,
    COALESCE(p_ip_assinatura, inet_client_addr()),
    p_dispositivo_assinatura,
    now(),
    p_profissional_responsavel_id,
    p_clinica_id,
    auth.uid()
  ) RETURNING id INTO new_consent_id;
  
  RETURN new_consent_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to verify consent validity
CREATE OR REPLACE FUNCTION public.verify_consent_validity(p_consent_id UUID)
RETURNS BOOLEAN AS $
DECLARE
  consent_record RECORD;
BEGIN
  SELECT * INTO consent_record
  FROM public.consentimentos_digitais
  WHERE id = p_consent_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if consent is active
  IF consent_record.status != 'ativo' THEN
    RETURN false;
  END IF;
  
  -- Check expiration
  IF NOT consent_record.valido_indefinidamente AND 
     consent_record.data_expiracao IS NOT NULL AND 
     consent_record.data_expiracao < CURRENT_DATE THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to create image collection
CREATE OR REPLACE FUNCTION public.create_image_collection(
  p_prontuario_id UUID,
  p_nome_colecao TEXT,
  p_tipo_colecao TEXT,
  p_imagens_ids UUID[],
  p_procedimento_relacionado tipo_procedimento DEFAULT NULL,
  p_regiao_anatomica TEXT DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  new_collection_id UUID;
BEGIN
  -- Verify all images belong to the same medical record
  IF EXISTS (
    SELECT 1 FROM public.imagens_medicas
    WHERE id = ANY(p_imagens_ids)
      AND prontuario_id != p_prontuario_id
  ) THEN
    RAISE EXCEPTION 'All images must belong to the same medical record';
  END IF;
  
  -- Insert collection
  INSERT INTO public.colecoes_imagens (
    prontuario_id,
    nome_colecao,
    tipo_colecao,
    imagens_ids,
    procedimento_relacionado,
    regiao_anatomica,
    data_inicio,
    criado_por
  ) VALUES (
    p_prontuario_id,
    p_nome_colecao,
    p_tipo_colecao,
    p_imagens_ids,
    p_procedimento_relacionado,
    p_regiao_anatomica,
    CURRENT_DATE,
    auth.uid()
  ) RETURNING id INTO new_collection_id;
  
  RETURN new_collection_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get images by medical record
CREATE OR REPLACE FUNCTION public.get_medical_record_images(
  p_prontuario_id UUID,
  p_tipo_imagem tipo_imagem DEFAULT NULL,
  p_visivel_paciente BOOLEAN DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  nome_arquivo TEXT,
  tipo_imagem tipo_imagem,
  regiao_anatomica TEXT,
  data_captura TIMESTAMP WITH TIME ZONE,
  url_publica TEXT,
  visivel_paciente BOOLEAN,
  consentimento_uso BOOLEAN
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.nome_arquivo,
    i.tipo_imagem,
    i.regiao_anatomica,
    i.data_captura,
    i.url_publica,
    i.visivel_paciente,
    i.consentimento_uso
  FROM public.imagens_medicas i
  WHERE i.prontuario_id = p_prontuario_id
    AND (p_tipo_imagem IS NULL OR i.tipo_imagem = p_tipo_imagem)
    AND (p_visivel_paciente IS NULL OR i.visivel_paciente = p_visivel_paciente)
  ORDER BY i.data_captura DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.imagens_medicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consentimentos_digitais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_consentimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colecoes_imagens ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Policies for imagens_medicas
CREATE POLICY "Profissionais podem visualizar imagens de suas clínicas"
ON public.imagens_medicas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.prontuarios p
    JOIN public.clinica_profissionais cp ON cp.clinica_id = p.clinica_id
    WHERE p.id = public.imagens_medicas.prontuario_id
      AND cp.user_id = auth.uid()
      AND cp.ativo = true
  )
);

CREATE POLICY "Profissionais podem fazer upload de imagens"
ON public.imagens_medicas FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.prontuarios p
    JOIN public.clinica_profissionais cp ON cp.clinica_id = p.clinica_id
    WHERE p.id = NEW.prontuario_id
      AND cp.user_id = auth.uid()
      AND cp.ativo = true
  ) AND criado_por = auth.uid()
);

CREATE POLICY "Profissionais podem atualizar imagens que criaram"
ON public.imagens_medicas FOR UPDATE
USING (criado_por = auth.uid());

-- Policies for consentimentos_digitais
CREATE POLICY "Profissionais podem visualizar consentimentos de suas clínicas"
ON public.consentimentos_digitais FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.prontuarios p
    JOIN public.clinica_profissionais cp ON cp.clinica_id = p.clinica_id
    WHERE p.id = public.consentimentos_digitais.prontuario_id
      AND cp.user_id = auth.uid()
      AND cp.ativo = true
  )
);

CREATE POLICY "Profissionais podem criar consentimentos"
ON public.consentimentos_digitais FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.prontuarios p
    JOIN public.clinica_profissionais cp ON cp.clinica_id = p.clinica_id
    WHERE p.id = NEW.prontuario_id
      AND cp.user_id = auth.uid()
      AND cp.ativo = true
  ) AND criado_por = auth.uid()
);

CREATE POLICY "Profissionais responsáveis podem atualizar consentimentos"
ON public.consentimentos_digitais FOR UPDATE
USING (profissional_responsavel_id = auth.uid());

-- Policies for templates_consentimento
CREATE POLICY "Profissionais podem visualizar templates públicos e de suas organizações"
ON public.templates_consentimento FOR SELECT
USING (
  publico = true OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.organizacao_id = public.templates_consentimento.organizacao_id
      AND ur.ativo = true
  ) OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.clinica_id = public.templates_consentimento.clinica_id
      AND ur.ativo = true
  )
);

CREATE POLICY "Gerentes podem criar templates para suas organizações"
ON public.templates_consentimento FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.organizacao_id = NEW.organizacao_id OR ur.clinica_id = NEW.clinica_id)
      AND ur.role IN ('proprietaria', 'gerente')
      AND ur.ativo = true
  ) AND criado_por = auth.uid()
);

-- Policies for colecoes_imagens
CREATE POLICY "Profissionais podem visualizar coleções de suas clínicas"
ON public.colecoes_imagens FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.prontuarios p
    JOIN public.clinica_profissionais cp ON cp.clinica_id = p.clinica_id
    WHERE p.id = public.colecoes_imagens.prontuario_id
      AND cp.user_id = auth.uid()
      AND cp.ativo = true
  )
);

CREATE POLICY "Profissionais podem criar coleções"
ON public.colecoes_imagens FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.prontuarios p
    JOIN public.clinica_profissionais cp ON cp.clinica_id = p.clinica_id
    WHERE p.id = NEW.prontuario_id
      AND cp.user_id = auth.uid()
      AND cp.ativo = true
  ) AND criado_por = auth.uid()
);

-- =====================================================
-- COMPLETION VERIFICATION
-- =====================================================

-- Verify all tables were created successfully
DO $
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('imagens_medicas', 'consentimentos_digitais', 'templates_consentimento', 'colecoes_imagens');
  
  IF table_count = 4 THEN
    RAISE NOTICE 'Medical images and consent system tables created successfully: % tables', table_count;
  ELSE
    RAISE EXCEPTION 'Medical images and consent system tables incomplete - only % tables created', table_count;
  END IF;
END $;

-- Add comments to track completion
COMMENT ON TABLE public.imagens_medicas IS 'Medical images table with security features - created ' || now();
COMMENT ON TABLE public.consentimentos_digitais IS 'Digital consent management table - created ' || now();
COMMENT ON TABLE public.templates_consentimento IS 'Consent document templates table - created ' || now();
COMMENT ON TABLE public.colecoes_imagens IS 'Image collections organization table - created ' || now();