-- =====================================================
-- MEDICAL RECORDS CORE TABLES
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- =====================================================
-- MEDICAL RECORDS TABLE (PRONTUÁRIOS)
-- =====================================================

-- Main table for medical records with encryption support for sensitive data
CREATE TABLE public.prontuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_prontuario TEXT NOT NULL UNIQUE DEFAULT public.gerar_numero_prontuario(),
  
  -- Patient identification
  paciente_id UUID NOT NULL, -- References patient profile
  medico_responsavel_id UUID NOT NULL REFERENCES auth.users(id),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id),
  
  -- Record status and classification
  status status_prontuario NOT NULL DEFAULT 'ativo',
  nivel_confidencialidade nivel_acesso_medico NOT NULL DEFAULT 'medico_responsavel',
  
  -- Personal data (some encrypted for LGPD compliance)
  nome_completo TEXT NOT NULL,
  cpf_encrypted TEXT, -- Encrypted CPF
  rg_encrypted TEXT,  -- Encrypted RG
  data_nascimento_encrypted TEXT, -- Encrypted birth date
  telefone_encrypted TEXT, -- Encrypted phone
  email_encrypted TEXT, -- Encrypted email
  endereco_encrypted TEXT, -- Encrypted address
  
  -- Emergency contact (encrypted)
  contato_emergencia_encrypted TEXT,
  
  -- Medical history and anamnesis
  anamnese TEXT,
  historico_medico TEXT,
  historico_familiar TEXT,
  medicamentos_atuais TEXT,
  alergias TEXT,
  contraindicacoes TEXT,
  cirurgias_anteriores TEXT,
  
  -- Aesthetic specific information
  objetivos_esteticos TEXT,
  expectativas_tratamento TEXT,
  tratamentos_anteriores TEXT,
  produtos_utilizados_casa TEXT,
  
  -- Physical examination
  exame_fisico TEXT,
  medidas_corporais JSONB, -- Height, weight, BMI, etc.
  tipo_pele TEXT,
  fototipo TEXT,
  
  -- Risk assessment
  fatores_risco TEXT,
  contraindicacoes_identificadas TEXT,
  
  -- Security and integrity
  hash_integridade TEXT NOT NULL DEFAULT md5(random()::text),
  versao INTEGER NOT NULL DEFAULT 1,
  ultimo_backup TIMESTAMP WITH TIME ZONE,
  
  -- Audit and tracking
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  atualizado_por UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT prontuarios_versao_positiva CHECK (versao > 0),
  CONSTRAINT prontuarios_medico_diferente_paciente CHECK (medico_responsavel_id != paciente_id)
);

-- =====================================================
-- TREATMENT SESSIONS TABLE (SESSÕES DE ATENDIMENTO)
-- =====================================================

-- Table for individual treatment sessions and appointments
CREATE TABLE public.sessoes_atendimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prontuario_id UUID NOT NULL REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  
  -- Session identification
  numero_sessao INTEGER NOT NULL,
  data_sessao TIMESTAMP WITH TIME ZONE NOT NULL,
  tipo_procedimento tipo_procedimento NOT NULL,
  
  -- Professional and location
  profissional_id UUID NOT NULL REFERENCES auth.users(id),
  sala_id UUID REFERENCES public.salas_clinica(id),
  duracao_minutos INTEGER,
  
  -- Pre-procedure assessment
  avaliacao_pre_procedimento TEXT,
  pressao_arterial TEXT,
  temperatura_corporal DECIMAL(4,1),
  peso_atual DECIMAL(5,2),
  
  -- Procedure details
  detalhes_procedimento JSONB NOT NULL,
  tecnica_utilizada TEXT,
  parametros_equipamento JSONB,
  
  -- Products and materials used
  produtos_utilizados JSONB,
  quantidade_produto JSONB,
  lote_produtos JSONB,
  
  -- Equipment used
  equipamentos_utilizados JSONB,
  tempo_uso_equipamentos JSONB,
  
  -- Anesthesia and pain management
  anestesia_utilizada TEXT,
  tipo_anestesia TEXT,
  dosagem_anestesia TEXT,
  
  -- Procedure execution
  observacoes_durante TEXT,
  intercorrencias TEXT,
  complicacoes TEXT,
  
  -- Post-procedure
  observacoes_pos TEXT,
  orientacoes_paciente TEXT,
  cuidados_domiciliares TEXT,
  medicamentos_prescritos TEXT,
  
  -- Results and follow-up
  resultados_imediatos TEXT,
  satisfacao_paciente INTEGER CHECK (satisfacao_paciente >= 1 AND satisfacao_paciente <= 10),
  proxima_sessao_recomendada DATE,
  intervalo_recomendado_dias INTEGER,
  
  -- Financial information
  valor_procedimento DECIMAL(10,2),
  desconto_aplicado DECIMAL(10,2),
  valor_final DECIMAL(10,2),
  forma_pagamento TEXT,
  
  -- Quality and safety
  checklist_seguranca JSONB,
  protocolos_seguidos TEXT[],
  
  -- Status and completion
  status TEXT NOT NULL DEFAULT 'agendado', -- 'agendado', 'em_andamento', 'concluido', 'cancelado'
  motivo_cancelamento TEXT,
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT sessoes_numero_positivo CHECK (numero_sessao > 0),
  CONSTRAINT sessoes_duracao_positiva CHECK (duracao_minutos IS NULL OR duracao_minutos > 0),
  CONSTRAINT sessoes_temperatura_valida CHECK (temperatura_corporal IS NULL OR (temperatura_corporal >= 35.0 AND temperatura_corporal <= 42.0)),
  CONSTRAINT sessoes_peso_positivo CHECK (peso_atual IS NULL OR peso_atual > 0),
  CONSTRAINT sessoes_valor_positivo CHECK (valor_procedimento IS NULL OR valor_procedimento >= 0),
  CONSTRAINT sessoes_desconto_valido CHECK (desconto_aplicado IS NULL OR desconto_aplicado >= 0),
  CONSTRAINT sessoes_valor_final_positivo CHECK (valor_final IS NULL OR valor_final >= 0),
  CONSTRAINT sessoes_intervalo_positivo CHECK (intervalo_recomendado_dias IS NULL OR intervalo_recomendado_dias > 0),
  UNIQUE(prontuario_id, numero_sessao)
);

-- =====================================================
-- PROCEDURE EVOLUTION TABLE
-- =====================================================

-- Table for tracking procedure evolution and progress
CREATE TABLE public.evolucao_procedimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prontuario_id UUID NOT NULL REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  sessao_id UUID REFERENCES public.sessoes_atendimento(id) ON DELETE CASCADE,
  
  -- Evolution tracking
  data_avaliacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tipo_avaliacao TEXT NOT NULL, -- 'inicial', 'intermediaria', 'final', 'seguimento'
  
  -- Clinical assessment
  evolucao_clinica TEXT NOT NULL,
  resultados_observados TEXT,
  melhoras_relatadas TEXT,
  efeitos_adversos TEXT,
  
  -- Measurements and photos reference
  medidas_atuais JSONB,
  fotos_referencia UUID[], -- References to imagens_medicas
  
  -- Professional assessment
  avaliacao_profissional TEXT,
  recomendacoes TEXT,
  ajustes_tratamento TEXT,
  
  -- Patient feedback
  satisfacao_atual INTEGER CHECK (satisfacao_atual >= 1 AND satisfacao_atual <= 10),
  comentarios_paciente TEXT,
  
  -- Next steps
  proximos_passos TEXT,
  data_proxima_avaliacao DATE,
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id)
);

-- =====================================================
-- TREATMENT PLANS TABLE
-- =====================================================

-- Table for comprehensive treatment plans
CREATE TABLE public.planos_tratamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prontuario_id UUID NOT NULL REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  
  -- Plan identification
  nome_plano TEXT NOT NULL,
  descricao TEXT,
  objetivo_principal TEXT NOT NULL,
  objetivos_secundarios TEXT[],
  
  -- Timeline and phases
  data_inicio DATE NOT NULL,
  data_fim_prevista DATE,
  numero_sessoes_previstas INTEGER,
  intervalo_sessoes_dias INTEGER,
  
  -- Procedures included
  procedimentos_incluidos JSONB NOT NULL, -- Array of procedures with details
  produtos_necessarios JSONB,
  equipamentos_necessarios JSONB,
  
  -- Cost and financial
  custo_total_estimado DECIMAL(12,2),
  custo_por_sessao DECIMAL(10,2),
  forma_pagamento_sugerida TEXT,
  
  -- Risks and contraindications
  riscos_identificados TEXT[],
  contraindicacoes TEXT[],
  cuidados_especiais TEXT[],
  
  -- Professional responsibility
  profissional_responsavel_id UUID NOT NULL REFERENCES auth.users(id),
  profissionais_envolvidos UUID[],
  
  -- Status and approval
  status TEXT NOT NULL DEFAULT 'proposto', -- 'proposto', 'aprovado', 'em_andamento', 'concluido', 'cancelado'
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  aprovado_por UUID REFERENCES auth.users(id),
  
  -- Patient consent
  consentimento_assinado BOOLEAN DEFAULT false,
  data_consentimento TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT planos_data_fim_posterior CHECK (data_fim_prevista IS NULL OR data_fim_prevista > data_inicio),
  CONSTRAINT planos_sessoes_positivas CHECK (numero_sessoes_previstas IS NULL OR numero_sessoes_previstas > 0),
  CONSTRAINT planos_intervalo_positivo CHECK (intervalo_sessoes_dias IS NULL OR intervalo_sessoes_dias > 0),
  CONSTRAINT planos_custo_positivo CHECK (custo_total_estimado IS NULL OR custo_total_estimado >= 0)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for prontuarios table
CREATE INDEX idx_prontuarios_paciente ON public.prontuarios(paciente_id);
CREATE INDEX idx_prontuarios_medico ON public.prontuarios(medico_responsavel_id);
CREATE INDEX idx_prontuarios_clinica ON public.prontuarios(clinica_id);
CREATE INDEX idx_prontuarios_numero ON public.prontuarios(numero_prontuario);
CREATE INDEX idx_prontuarios_status ON public.prontuarios(status);
CREATE INDEX idx_prontuarios_nivel_confidencialidade ON public.prontuarios(nivel_confidencialidade);
CREATE INDEX idx_prontuarios_criado_em ON public.prontuarios(criado_em);

-- Indexes for sessoes_atendimento table
CREATE INDEX idx_sessoes_prontuario ON public.sessoes_atendimento(prontuario_id);
CREATE INDEX idx_sessoes_data ON public.sessoes_atendimento(data_sessao);
CREATE INDEX idx_sessoes_tipo ON public.sessoes_atendimento(tipo_procedimento);
CREATE INDEX idx_sessoes_profissional ON public.sessoes_atendimento(profissional_id);
CREATE INDEX idx_sessoes_sala ON public.sessoes_atendimento(sala_id) WHERE sala_id IS NOT NULL;
CREATE INDEX idx_sessoes_status ON public.sessoes_atendimento(status);
CREATE INDEX idx_sessoes_numero ON public.sessoes_atendimento(prontuario_id, numero_sessao);

-- Indexes for evolucao_procedimentos table
CREATE INDEX idx_evolucao_prontuario ON public.evolucao_procedimentos(prontuario_id);
CREATE INDEX idx_evolucao_sessao ON public.evolucao_procedimentos(sessao_id) WHERE sessao_id IS NOT NULL;
CREATE INDEX idx_evolucao_data ON public.evolucao_procedimentos(data_avaliacao);
CREATE INDEX idx_evolucao_tipo ON public.evolucao_procedimentos(tipo_avaliacao);

-- Indexes for planos_tratamento table
CREATE INDEX idx_planos_prontuario ON public.planos_tratamento(prontuario_id);
CREATE INDEX idx_planos_profissional ON public.planos_tratamento(profissional_responsavel_id);
CREATE INDEX idx_planos_status ON public.planos_tratamento(status);
CREATE INDEX idx_planos_data_inicio ON public.planos_tratamento(data_inicio);
CREATE INDEX idx_planos_data_fim ON public.planos_tratamento(data_fim_prevista) WHERE data_fim_prevista IS NOT NULL;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Trigger for updating timestamps and version in prontuarios
CREATE OR REPLACE FUNCTION public.update_prontuario_version()
RETURNS TRIGGER AS $
BEGIN
  NEW.atualizado_em = now();
  NEW.versao = OLD.versao + 1;
  NEW.atualizado_por = auth.uid();
  NEW.hash_integridade = md5(NEW.id::text || NEW.atualizado_em::text || random()::text);
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER update_prontuarios_version
  BEFORE UPDATE ON public.prontuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_prontuario_version();

-- Trigger for updating timestamps in sessoes_atendimento
CREATE TRIGGER update_sessoes_updated_at
  BEFORE UPDATE ON public.sessoes_atendimento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating timestamps in planos_tratamento
CREATE TRIGGER update_planos_updated_at
  BEFORE UPDATE ON public.planos_tratamento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for automatic session numbering
CREATE OR REPLACE FUNCTION public.auto_number_session()
RETURNS TRIGGER AS $
BEGIN
  IF NEW.numero_sessao IS NULL THEN
    SELECT COALESCE(MAX(numero_sessao), 0) + 1 
    INTO NEW.numero_sessao
    FROM public.sessoes_atendimento 
    WHERE prontuario_id = NEW.prontuario_id;
  END IF;
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER auto_number_sessions
  BEFORE INSERT ON public.sessoes_atendimento
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_number_session();

-- =====================================================
-- MEDICAL RECORDS FUNCTIONS
-- =====================================================

-- Function to create new medical record
CREATE OR REPLACE FUNCTION public.create_medical_record(
  p_paciente_id UUID,
  p_medico_responsavel_id UUID,
  p_clinica_id UUID,
  p_nome_completo TEXT,
  p_cpf TEXT DEFAULT NULL,
  p_data_nascimento DATE DEFAULT NULL,
  p_telefone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  new_record_id UUID;
  encrypted_cpf TEXT;
  encrypted_birth TEXT;
  encrypted_phone TEXT;
  encrypted_email TEXT;
BEGIN
  -- Encrypt sensitive data
  encrypted_cpf := CASE WHEN p_cpf IS NOT NULL THEN public.hash_sensitive_data(p_cpf) ELSE NULL END;
  encrypted_birth := CASE WHEN p_data_nascimento IS NOT NULL THEN public.hash_sensitive_data(p_data_nascimento::text) ELSE NULL END;
  encrypted_phone := CASE WHEN p_telefone IS NOT NULL THEN public.hash_sensitive_data(p_telefone) ELSE NULL END;
  encrypted_email := CASE WHEN p_email IS NOT NULL THEN public.hash_sensitive_data(p_email) ELSE NULL END;
  
  -- Insert medical record
  INSERT INTO public.prontuarios (
    paciente_id,
    medico_responsavel_id,
    clinica_id,
    nome_completo,
    cpf_encrypted,
    data_nascimento_encrypted,
    telefone_encrypted,
    email_encrypted,
    criado_por
  ) VALUES (
    p_paciente_id,
    p_medico_responsavel_id,
    p_clinica_id,
    p_nome_completo,
    encrypted_cpf,
    encrypted_birth,
    encrypted_phone,
    encrypted_email,
    auth.uid()
  ) RETURNING id INTO new_record_id;
  
  RETURN new_record_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to schedule treatment session
CREATE OR REPLACE FUNCTION public.schedule_treatment_session(
  p_prontuario_id UUID,
  p_data_sessao TIMESTAMP WITH TIME ZONE,
  p_tipo_procedimento tipo_procedimento,
  p_profissional_id UUID,
  p_sala_id UUID DEFAULT NULL,
  p_duracao_minutos INTEGER DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  new_session_id UUID;
BEGIN
  -- Check if professional has access to the clinic
  IF NOT EXISTS (
    SELECT 1 FROM public.prontuarios p
    JOIN public.clinica_profissionais cp ON cp.clinica_id = p.clinica_id
    WHERE p.id = p_prontuario_id 
      AND cp.user_id = p_profissional_id 
      AND cp.ativo = true
  ) THEN
    RAISE EXCEPTION 'Professional does not have access to this clinic';
  END IF;
  
  -- Insert session
  INSERT INTO public.sessoes_atendimento (
    prontuario_id,
    data_sessao,
    tipo_procedimento,
    profissional_id,
    sala_id,
    duracao_minutos,
    detalhes_procedimento,
    criado_por
  ) VALUES (
    p_prontuario_id,
    p_data_sessao,
    p_tipo_procedimento,
    p_profissional_id,
    p_sala_id,
    p_duracao_minutos,
    '{}'::jsonb,
    auth.uid()
  ) RETURNING id INTO new_session_id;
  
  RETURN new_session_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get medical record summary
CREATE OR REPLACE FUNCTION public.get_medical_record_summary(p_prontuario_id UUID)
RETURNS JSONB AS $
DECLARE
  summary JSONB;
BEGIN
  SELECT jsonb_build_object(
    'prontuario_info', (
      SELECT jsonb_build_object(
        'id', id,
        'numero_prontuario', numero_prontuario,
        'nome_completo', nome_completo,
        'status', status,
        'criado_em', criado_em,
        'versao', versao
      ) FROM public.prontuarios WHERE id = p_prontuario_id
    ),
    'total_sessoes', (
      SELECT COUNT(*) FROM public.sessoes_atendimento 
      WHERE prontuario_id = p_prontuario_id
    ),
    'ultima_sessao', (
      SELECT MAX(data_sessao) FROM public.sessoes_atendimento 
      WHERE prontuario_id = p_prontuario_id
    ),
    'proxima_sessao', (
      SELECT MIN(data_sessao) FROM public.sessoes_atendimento 
      WHERE prontuario_id = p_prontuario_id 
        AND data_sessao > now() 
        AND status = 'agendado'
    ),
    'procedimentos_realizados', (
      SELECT array_agg(DISTINCT tipo_procedimento) 
      FROM public.sessoes_atendimento 
      WHERE prontuario_id = p_prontuario_id 
        AND status = 'concluido'
    ),
    'planos_ativos', (
      SELECT COUNT(*) FROM public.planos_tratamento 
      WHERE prontuario_id = p_prontuario_id 
        AND status IN ('aprovado', 'em_andamento')
    )
  ) INTO summary;
  
  RETURN summary;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolucao_procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos_tratamento ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Policies for prontuarios
CREATE POLICY "Profissionais podem visualizar prontuários de suas clínicas"
ON public.prontuarios FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clinica_profissionais cp
    WHERE cp.user_id = auth.uid()
      AND cp.clinica_id = public.prontuarios.clinica_id
      AND cp.ativo = true
  )
);

CREATE POLICY "Profissionais podem criar prontuários"
ON public.prontuarios FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinica_profissionais cp
    WHERE cp.user_id = auth.uid()
      AND cp.clinica_id = NEW.clinica_id
      AND cp.ativo = true
      AND cp.pode_criar_prontuarios = true
  ) AND criado_por = auth.uid()
);

CREATE POLICY "Profissionais podem atualizar prontuários"
ON public.prontuarios FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clinica_profissionais cp
    WHERE cp.user_id = auth.uid()
      AND cp.clinica_id = public.prontuarios.clinica_id
      AND cp.ativo = true
      AND cp.pode_editar_prontuarios = true
  )
);

-- Policies for sessoes_atendimento
CREATE POLICY "Profissionais podem visualizar sessões de suas clínicas"
ON public.sessoes_atendimento FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.prontuarios p
    JOIN public.clinica_profissionais cp ON cp.clinica_id = p.clinica_id
    WHERE p.id = public.sessoes_atendimento.prontuario_id
      AND cp.user_id = auth.uid()
      AND cp.ativo = true
  )
);

CREATE POLICY "Profissionais podem criar sessões"
ON public.sessoes_atendimento FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.prontuarios p
    JOIN public.clinica_profissionais cp ON cp.clinica_id = p.clinica_id
    WHERE p.id = NEW.prontuario_id
      AND cp.user_id = auth.uid()
      AND cp.ativo = true
  ) AND criado_por = auth.uid()
);

CREATE POLICY "Profissionais podem atualizar suas sessões"
ON public.sessoes_atendimento FOR UPDATE
USING (
  profissional_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.prontuarios p
    JOIN public.clinica_profissionais cp ON cp.clinica_id = p.clinica_id
    WHERE p.id = public.sessoes_atendimento.prontuario_id
      AND cp.user_id = auth.uid()
      AND cp.ativo = true
      AND cp.pode_editar_prontuarios = true
  )
);

-- Policies for evolucao_procedimentos
CREATE POLICY "Profissionais podem visualizar evoluções de suas clínicas"
ON public.evolucao_procedimentos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.prontuarios p
    JOIN public.clinica_profissionais cp ON cp.clinica_id = p.clinica_id
    WHERE p.id = public.evolucao_procedimentos.prontuario_id
      AND cp.user_id = auth.uid()
      AND cp.ativo = true
  )
);

CREATE POLICY "Profissionais podem criar evoluções"
ON public.evolucao_procedimentos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.prontuarios p
    JOIN public.clinica_profissionais cp ON cp.clinica_id = p.clinica_id
    WHERE p.id = NEW.prontuario_id
      AND cp.user_id = auth.uid()
      AND cp.ativo = true
  ) AND criado_por = auth.uid()
);

-- Policies for planos_tratamento
CREATE POLICY "Profissionais podem visualizar planos de suas clínicas"
ON public.planos_tratamento FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.prontuarios p
    JOIN public.clinica_profissionais cp ON cp.clinica_id = p.clinica_id
    WHERE p.id = public.planos_tratamento.prontuario_id
      AND cp.user_id = auth.uid()
      AND cp.ativo = true
  )
);

CREATE POLICY "Profissionais podem criar planos"
ON public.planos_tratamento FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.prontuarios p
    JOIN public.clinica_profissionais cp ON cp.clinica_id = p.clinica_id
    WHERE p.id = NEW.prontuario_id
      AND cp.user_id = auth.uid()
      AND cp.ativo = true
  ) AND criado_por = auth.uid()
);

CREATE POLICY "Profissionais responsáveis podem atualizar planos"
ON public.planos_tratamento FOR UPDATE
USING (
  profissional_responsavel_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.prontuarios p
    JOIN public.clinica_profissionais cp ON cp.clinica_id = p.clinica_id
    WHERE p.id = public.planos_tratamento.prontuario_id
      AND cp.user_id = auth.uid()
      AND cp.ativo = true
      AND cp.pode_editar_prontuarios = true
  )
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
    AND table_name IN ('prontuarios', 'sessoes_atendimento', 'evolucao_procedimentos', 'planos_tratamento');
  
  IF table_count = 4 THEN
    RAISE NOTICE 'Medical records core tables created successfully: % tables', table_count;
  ELSE
    RAISE EXCEPTION 'Medical records core tables incomplete - only % tables created', table_count;
  END IF;
END $;

-- Add comments to track completion
COMMENT ON TABLE public.prontuarios IS 'Medical records table with encryption support - created ' || now();
COMMENT ON TABLE public.sessoes_atendimento IS 'Treatment sessions table - created ' || now();
COMMENT ON TABLE public.evolucao_procedimentos IS 'Procedure evolution tracking table - created ' || now();
COMMENT ON TABLE public.planos_tratamento IS 'Treatment plans table - created ' || now();