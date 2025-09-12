-- =====================================================
-- AUDIT AND ACCESS CONTROL SYSTEM
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- =====================================================
-- COMPREHENSIVE AUDIT TABLE
-- =====================================================

-- Main audit table for comprehensive logging of all system operations
CREATE TABLE public.auditoria_medica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference information
  prontuario_id UUID REFERENCES public.prontuarios(id),
  tabela_afetada TEXT NOT NULL,
  registro_id UUID,
  schema_name TEXT DEFAULT 'public',
  
  -- Operation details
  operacao TEXT NOT NULL CHECK (operacao IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT', 'TRUNCATE')),
  dados_anteriores JSONB,
  dados_novos JSONB,
  campos_modificados TEXT[],
  
  -- Change tracking
  tipo_mudanca TEXT, -- 'criacao', 'atualizacao', 'exclusao', 'consulta'
  categoria_operacao TEXT, -- 'medica', 'administrativa', 'financeira', 'sistema'
  
  -- Criticality and context
  nivel_criticidade TEXT NOT NULL DEFAULT 'normal', -- 'baixo', 'normal', 'alto', 'critico'
  contexto_operacao TEXT,
  justificativa TEXT,
  motivo_acesso TEXT,
  
  -- User information
  usuario_id UUID NOT NULL,
  usuario_nome TEXT,
  usuario_email TEXT,
  usuario_role TEXT,
  
  -- Session and technical details
  sessao_id TEXT,
  ip_origem INET,
  user_agent TEXT,
  dispositivo_info JSONB,
  localizacao_geografica JSONB,
  
  -- Timing information
  timestamp_operacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duracao_operacao_ms INTEGER,
  
  -- Application context
  aplicacao TEXT DEFAULT 'web',
  versao_aplicacao TEXT,
  modulo_sistema TEXT,
  funcionalidade TEXT,
  
  -- Compliance and legal
  gdpr_compliant BOOLEAN NOT NULL DEFAULT true,
  lgpd_compliant BOOLEAN NOT NULL DEFAULT true,
  hipaa_compliant BOOLEAN NOT NULL DEFAULT true,
  
  -- Data classification
  contem_dados_sensiveis BOOLEAN DEFAULT false,
  nivel_confidencialidade TEXT DEFAULT 'publico', -- 'publico', 'interno', 'confidencial', 'restrito'
  
  -- Multi-tenant context
  organizacao_id UUID REFERENCES public.organizacoes(id),
  clinica_id UUID REFERENCES public.clinicas(id),
  
  -- Audit metadata
  hash_integridade TEXT,
  assinatura_digital TEXT,
  
  -- Constraints
  CONSTRAINT auditoria_duracao_positiva CHECK (duracao_operacao_ms IS NULL OR duracao_operacao_ms >= 0)
);

-- =====================================================
-- ACCESS CONTROL TABLE
-- =====================================================

-- Table for tracking access to medical records and sensitive data
CREATE TABLE public.acessos_prontuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prontuario_id UUID NOT NULL REFERENCES public.prontuarios(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Access details
  tipo_acesso tipo_acesso NOT NULL,
  recurso_acessado TEXT NOT NULL, -- 'prontuario_completo', 'dados_pessoais', 'historico_medico', 'imagens', etc.
  
  -- Accessed sections and fields
  secoes_acessadas TEXT[],
  campos_visualizados TEXT[],
  dados_exportados BOOLEAN DEFAULT false,
  dados_impressos BOOLEAN DEFAULT false,
  
  -- Session information
  sessao_id TEXT,
  tempo_sessao_minutos INTEGER,
  
  -- Technical details
  data_acesso TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_fim_acesso TIMESTAMP WITH TIME ZONE,
  ip_acesso INET,
  dispositivo TEXT,
  navegador TEXT,
  sistema_operacional TEXT,
  
  -- Geographic and location data
  localizacao_geografica JSONB,
  fuso_horario TEXT,
  
  -- Authorization and approval
  autorizado_por UUID REFERENCES auth.users(id),
  motivo_acesso TEXT NOT NULL,
  nivel_urgencia TEXT DEFAULT 'normal', -- 'normal', 'urgente', 'emergencial'
  
  -- Purpose and context
  finalidade_acesso TEXT, -- 'consulta_rotina', 'emergencia_medica', 'auditoria', 'pesquisa'
  contexto_clinico TEXT,
  
  -- Compliance tracking
  consentimento_paciente BOOLEAN DEFAULT false,
  base_legal_acesso TEXT, -- LGPD legal basis
  
  -- Quality and monitoring
  acesso_suspeito BOOLEAN DEFAULT false,
  marcado_revisao BOOLEAN DEFAULT false,
  comentarios_seguranca TEXT,
  
  -- Multi-tenant context
  organizacao_id UUID REFERENCES public.organizacoes(id),
  clinica_id UUID REFERENCES public.clinicas(id),
  
  -- Constraints
  CONSTRAINT acessos_tempo_sessao_positivo CHECK (tempo_sessao_minutos IS NULL OR tempo_sessao_minutos >= 0),
  CONSTRAINT acessos_data_fim_valida CHECK (data_fim_acesso IS NULL OR data_fim_acesso >= data_acesso)
);

-- =====================================================
-- SYSTEM EVENTS LOG TABLE
-- =====================================================

-- Table for logging system-wide events and security incidents
CREATE TABLE public.eventos_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event identification
  tipo_evento TEXT NOT NULL, -- 'login', 'logout', 'falha_autenticacao', 'alteracao_permissao', 'backup', 'erro_sistema'
  categoria TEXT NOT NULL, -- 'seguranca', 'sistema', 'usuario', 'dados', 'performance'
  severidade TEXT NOT NULL DEFAULT 'info', -- 'debug', 'info', 'warning', 'error', 'critical'
  
  -- Event details
  titulo TEXT NOT NULL,
  descricao TEXT,
  dados_evento JSONB,
  
  -- User context (if applicable)
  usuario_id UUID REFERENCES auth.users(id),
  usuario_afetado_id UUID REFERENCES auth.users(id),
  
  -- System context
  componente_sistema TEXT,
  versao_sistema TEXT,
  ambiente TEXT DEFAULT 'production', -- 'development', 'staging', 'production'
  
  -- Technical details
  ip_origem INET,
  user_agent TEXT,
  codigo_erro TEXT,
  stack_trace TEXT,
  
  -- Timing
  timestamp_evento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duracao_ms INTEGER,
  
  -- Impact assessment
  usuarios_afetados INTEGER DEFAULT 0,
  servicos_afetados TEXT[],
  dados_comprometidos BOOLEAN DEFAULT false,
  
  -- Resolution tracking
  resolvido BOOLEAN DEFAULT false,
  data_resolucao TIMESTAMP WITH TIME ZONE,
  resolvido_por UUID REFERENCES auth.users(id),
  acao_corretiva TEXT,
  
  -- Notification and escalation
  notificacao_enviada BOOLEAN DEFAULT false,
  escalado BOOLEAN DEFAULT false,
  escalado_para UUID REFERENCES auth.users(id),
  
  -- Multi-tenant context
  organizacao_id UUID REFERENCES public.organizacoes(id),
  clinica_id UUID REFERENCES public.clinicas(id)
);

-- =====================================================
-- DATA RETENTION POLICY TABLE
-- =====================================================

-- Table for managing data retention policies and automated cleanup
CREATE TABLE public.politicas_retencao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Policy identification
  nome_politica TEXT NOT NULL UNIQUE,
  descricao TEXT,
  
  -- Scope
  tabela_alvo TEXT NOT NULL,
  condicoes_aplicacao JSONB, -- JSON conditions for when policy applies
  
  -- Retention rules
  periodo_retencao_dias INTEGER NOT NULL,
  acao_expiracao TEXT NOT NULL DEFAULT 'delete', -- 'delete', 'archive', 'anonymize'
  
  -- Execution settings
  ativa BOOLEAN NOT NULL DEFAULT true,
  execucao_automatica BOOLEAN DEFAULT true,
  frequencia_execucao TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
  
  -- Legal and compliance
  base_legal TEXT,
  categoria_dados TEXT, -- 'pessoais', 'sensiveis', 'medicos', 'financeiros'
  
  -- Execution tracking
  ultima_execucao TIMESTAMP WITH TIME ZONE,
  proxima_execucao TIMESTAMP WITH TIME ZONE,
  registros_processados INTEGER DEFAULT 0,
  registros_removidos INTEGER DEFAULT 0,
  
  -- Audit
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT politicas_periodo_positivo CHECK (periodo_retencao_dias > 0)
);

-- =====================================================
-- SECURITY INCIDENTS TABLE
-- =====================================================

-- Table for tracking security incidents and breaches
CREATE TABLE public.incidentes_seguranca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Incident identification
  numero_incidente TEXT NOT NULL UNIQUE DEFAULT ('INC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('incidente_sequence')::TEXT, 4, '0')),
  tipo_incidente TEXT NOT NULL, -- 'acesso_nao_autorizado', 'vazamento_dados', 'malware', 'phishing', 'outro'
  severidade TEXT NOT NULL, -- 'baixa', 'media', 'alta', 'critica'
  
  -- Incident details
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  como_descoberto TEXT,
  
  -- Timeline
  data_ocorrencia TIMESTAMP WITH TIME ZONE,
  data_descoberta TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_contencao TIMESTAMP WITH TIME ZONE,
  data_resolucao TIMESTAMP WITH TIME ZONE,
  
  -- Impact assessment
  dados_comprometidos BOOLEAN DEFAULT false,
  tipos_dados_afetados TEXT[],
  numero_registros_afetados INTEGER,
  usuarios_afetados UUID[],
  
  -- Technical details
  vetor_ataque TEXT,
  vulnerabilidade_explorada TEXT,
  sistemas_afetados TEXT[],
  evidencias JSONB,
  
  -- Response actions
  acoes_imediatas TEXT[],
  acoes_corretivas TEXT[],
  acoes_preventivas TEXT[],
  
  -- Legal and compliance
  notificacao_autoridades BOOLEAN DEFAULT false,
  data_notificacao_autoridades TIMESTAMP WITH TIME ZONE,
  notificacao_usuarios BOOLEAN DEFAULT false,
  data_notificacao_usuarios TIMESTAMP WITH TIME ZONE,
  
  -- Investigation
  investigador_responsavel UUID REFERENCES auth.users(id),
  status_investigacao TEXT DEFAULT 'em_andamento', -- 'iniciada', 'em_andamento', 'concluida', 'arquivada'
  conclusoes TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'aberto', -- 'aberto', 'em_investigacao', 'resolvido', 'fechado'
  
  -- Multi-tenant context
  organizacao_id UUID REFERENCES public.organizacoes(id),
  clinica_id UUID REFERENCES public.clinicas(id),
  
  -- Audit
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID NOT NULL REFERENCES auth.users(id)
);

-- =====================================================
-- SEQUENCES FOR NUMBERING
-- =====================================================

CREATE SEQUENCE IF NOT EXISTS incidente_sequence START 1;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for auditoria_medica table
CREATE INDEX idx_auditoria_prontuario ON public.auditoria_medica(prontuario_id) WHERE prontuario_id IS NOT NULL;
CREATE INDEX idx_auditoria_tabela ON public.auditoria_medica(tabela_afetada);
CREATE INDEX idx_auditoria_operacao ON public.auditoria_medica(operacao);
CREATE INDEX idx_auditoria_usuario ON public.auditoria_medica(usuario_id);
CREATE INDEX idx_auditoria_timestamp ON public.auditoria_medica(timestamp_operacao);
CREATE INDEX idx_auditoria_criticidade ON public.auditoria_medica(nivel_criticidade);
CREATE INDEX idx_auditoria_organizacao ON public.auditoria_medica(organizacao_id) WHERE organizacao_id IS NOT NULL;
CREATE INDEX idx_auditoria_clinica ON public.auditoria_medica(clinica_id) WHERE clinica_id IS NOT NULL;
CREATE INDEX idx_auditoria_categoria ON public.auditoria_medica(categoria_operacao) WHERE categoria_operacao IS NOT NULL;

-- Indexes for acessos_prontuario table
CREATE INDEX idx_acessos_prontuario ON public.acessos_prontuario(prontuario_id);
CREATE INDEX idx_acessos_usuario ON public.acessos_prontuario(usuario_id);
CREATE INDEX idx_acessos_data ON public.acessos_prontuario(data_acesso);
CREATE INDEX idx_acessos_tipo ON public.acessos_prontuario(tipo_acesso);
CREATE INDEX idx_acessos_organizacao ON public.acessos_prontuario(organizacao_id) WHERE organizacao_id IS NOT NULL;
CREATE INDEX idx_acessos_clinica ON public.acessos_prontuario(clinica_id) WHERE clinica_id IS NOT NULL;
CREATE INDEX idx_acessos_suspeito ON public.acessos_prontuario(acesso_suspeito) WHERE acesso_suspeito = true;

-- Indexes for eventos_sistema table
CREATE INDEX idx_eventos_tipo ON public.eventos_sistema(tipo_evento);
CREATE INDEX idx_eventos_categoria ON public.eventos_sistema(categoria);
CREATE INDEX idx_eventos_severidade ON public.eventos_sistema(severidade);
CREATE INDEX idx_eventos_timestamp ON public.eventos_sistema(timestamp_evento);
CREATE INDEX idx_eventos_usuario ON public.eventos_sistema(usuario_id) WHERE usuario_id IS NOT NULL;
CREATE INDEX idx_eventos_resolvido ON public.eventos_sistema(resolvido);
CREATE INDEX idx_eventos_organizacao ON public.eventos_sistema(organizacao_id) WHERE organizacao_id IS NOT NULL;

-- Indexes for politicas_retencao table
CREATE INDEX idx_politicas_tabela ON public.politicas_retencao(tabela_alvo);
CREATE INDEX idx_politicas_ativa ON public.politicas_retencao(ativa);
CREATE INDEX idx_politicas_proxima_execucao ON public.politicas_retencao(proxima_execucao) WHERE proxima_execucao IS NOT NULL;

-- Indexes for incidentes_seguranca table
CREATE INDEX idx_incidentes_tipo ON public.incidentes_seguranca(tipo_incidente);
CREATE INDEX idx_incidentes_severidade ON public.incidentes_seguranca(severidade);
CREATE INDEX idx_incidentes_status ON public.incidentes_seguranca(status);
CREATE INDEX idx_incidentes_data_ocorrencia ON public.incidentes_seguranca(data_ocorrencia) WHERE data_ocorrencia IS NOT NULL;
CREATE INDEX idx_incidentes_organizacao ON public.incidentes_seguranca(organizacao_id) WHERE organizacao_id IS NOT NULL;

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Triggers for updating timestamps
CREATE TRIGGER update_politicas_retencao_updated_at
  BEFORE UPDATE ON public.politicas_retencao
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_incidentes_updated_at
  BEFORE UPDATE ON public.incidentes_seguranca
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ENHANCED AUDIT FUNCTIONS
-- =====================================================

-- Enhanced audit logging function with comprehensive tracking
CREATE OR REPLACE FUNCTION public.log_auditoria_completa()
RETURNS TRIGGER AS $
DECLARE
  usuario_atual UUID;
  usuario_info RECORD;
  operacao_tipo TEXT;
  campos_alterados TEXT[];
  nivel_criticidade_calc TEXT;
  contexto_organizacao UUID;
  contexto_clinica UUID;
BEGIN
  usuario_atual := auth.uid();
  
  -- Get user information
  SELECT p.nome_completo, p.email INTO usuario_info
  FROM public.profiles p
  WHERE p.user_id = usuario_atual;
  
  -- Determine operation type
  CASE TG_OP
    WHEN 'INSERT' THEN operacao_tipo := 'INSERT';
    WHEN 'UPDATE' THEN operacao_tipo := 'UPDATE';
    WHEN 'DELETE' THEN operacao_tipo := 'DELETE';
  END CASE;
  
  -- Calculate changed fields for UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(key) INTO campos_alterados
    FROM jsonb_each(to_jsonb(NEW))
    WHERE to_jsonb(NEW) -> key != to_jsonb(OLD) -> key;
  END IF;
  
  -- Determine criticality level based on table and operation
  nivel_criticidade_calc := CASE 
    WHEN TG_TABLE_NAME IN ('prontuarios', 'consentimentos_digitais', 'imagens_medicas') THEN 'alto'
    WHEN TG_TABLE_NAME IN ('sessoes_atendimento', 'user_roles') THEN 'medio'
    ELSE 'normal'
  END;
  
  -- Get organizational context
  IF TG_TABLE_NAME = 'prontuarios' THEN
    SELECT p.clinica_id INTO contexto_clinica
    FROM public.prontuarios p
    WHERE p.id = COALESCE(NEW.id, OLD.id);
    
    SELECT c.organizacao_id INTO contexto_organizacao
    FROM public.clinicas c
    WHERE c.id = contexto_clinica;
  END IF;
  
  -- Insert comprehensive audit record
  INSERT INTO public.auditoria_medica (
    prontuario_id,
    tabela_afetada,
    registro_id,
    operacao,
    dados_anteriores,
    dados_novos,
    campos_modificados,
    nivel_criticidade,
    usuario_id,
    usuario_nome,
    usuario_email,
    ip_origem,
    timestamp_operacao,
    organizacao_id,
    clinica_id,
    categoria_operacao,
    hash_integridade
  ) VALUES (
    CASE WHEN TG_TABLE_NAME = 'prontuarios' THEN COALESCE(NEW.id, OLD.id) ELSE NULL END,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    operacao_tipo,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    campos_alterados,
    nivel_criticidade_calc,
    usuario_atual,
    usuario_info.nome_completo,
    usuario_info.email,
    inet_client_addr(),
    now(),
    contexto_organizacao,
    contexto_clinica,
    CASE 
      WHEN TG_TABLE_NAME IN ('prontuarios', 'sessoes_atendimento', 'imagens_medicas', 'consentimentos_digitais') THEN 'medica'
      WHEN TG_TABLE_NAME IN ('produtos', 'movimentacao_estoque', 'pedidos_compra') THEN 'administrativa'
      ELSE 'sistema'
    END,
    md5(COALESCE(NEW.id, OLD.id)::text || now()::text || random()::text)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to log medical record access
CREATE OR REPLACE FUNCTION public.log_acesso_prontuario(
  p_prontuario_id UUID,
  p_tipo_acesso tipo_acesso,
  p_recurso_acessado TEXT,
  p_motivo_acesso TEXT,
  p_secoes_acessadas TEXT[] DEFAULT NULL,
  p_finalidade_acesso TEXT DEFAULT 'consulta_rotina'
)
RETURNS UUID AS $
DECLARE
  new_access_id UUID;
  user_context RECORD;
BEGIN
  -- Get user context
  SELECT ur.organizacao_id, ur.clinica_id INTO user_context
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid() AND ur.ativo = true
  LIMIT 1;
  
  -- Insert access log
  INSERT INTO public.acessos_prontuario (
    prontuario_id,
    usuario_id,
    tipo_acesso,
    recurso_acessado,
    motivo_acesso,
    secoes_acessadas,
    finalidade_acesso,
    ip_acesso,
    organizacao_id,
    clinica_id
  ) VALUES (
    p_prontuario_id,
    auth.uid(),
    p_tipo_acesso,
    p_recurso_acessado,
    p_motivo_acesso,
    p_secoes_acessadas,
    p_finalidade_acesso,
    inet_client_addr(),
    user_context.organizacao_id,
    user_context.clinica_id
  ) RETURNING id INTO new_access_id;
  
  RETURN new_access_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to log system events
CREATE OR REPLACE FUNCTION public.log_evento_sistema(
  p_tipo_evento TEXT,
  p_categoria TEXT,
  p_severidade TEXT,
  p_titulo TEXT,
  p_descricao TEXT DEFAULT NULL,
  p_dados_evento JSONB DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  new_event_id UUID;
BEGIN
  INSERT INTO public.eventos_sistema (
    tipo_evento,
    categoria,
    severidade,
    titulo,
    descricao,
    dados_evento,
    usuario_id,
    ip_origem
  ) VALUES (
    p_tipo_evento,
    p_categoria,
    p_severidade,
    p_titulo,
    p_descricao,
    p_dados_evento,
    auth.uid(),
    inet_client_addr()
  ) RETURNING id INTO new_event_id;
  
  RETURN new_event_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to create security incident
CREATE OR REPLACE FUNCTION public.criar_incidente_seguranca(
  p_tipo_incidente TEXT,
  p_severidade TEXT,
  p_titulo TEXT,
  p_descricao TEXT,
  p_dados_comprometidos BOOLEAN DEFAULT false,
  p_sistemas_afetados TEXT[] DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  new_incident_id UUID;
BEGIN
  INSERT INTO public.incidentes_seguranca (
    tipo_incidente,
    severidade,
    titulo,
    descricao,
    dados_comprometidos,
    sistemas_afetados,
    criado_por
  ) VALUES (
    p_tipo_incidente,
    p_severidade,
    p_titulo,
    p_descricao,
    p_dados_comprometidos,
    p_sistemas_afetados,
    auth.uid()
  ) RETURNING id INTO new_incident_id;
  
  -- Log system event for the incident
  PERFORM public.log_evento_sistema(
    'incidente_seguranca',
    'seguranca',
    p_severidade,
    'Novo incidente de segurança criado',
    format('Incidente %s: %s', p_tipo_incidente, p_titulo),
    jsonb_build_object('incident_id', new_incident_id, 'type', p_tipo_incidente)
  );
  
  RETURN new_incident_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get audit trail for a medical record
CREATE OR REPLACE FUNCTION public.get_audit_trail_prontuario(
  p_prontuario_id UUID,
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL
)
RETURNS TABLE(
  timestamp_operacao TIMESTAMP WITH TIME ZONE,
  operacao TEXT,
  usuario_nome TEXT,
  tabela_afetada TEXT,
  campos_modificados TEXT[],
  nivel_criticidade TEXT,
  ip_origem INET
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    a.timestamp_operacao,
    a.operacao,
    a.usuario_nome,
    a.tabela_afetada,
    a.campos_modificados,
    a.nivel_criticidade,
    a.ip_origem
  FROM public.auditoria_medica a
  WHERE a.prontuario_id = p_prontuario_id
    AND (p_data_inicio IS NULL OR a.timestamp_operacao::date >= p_data_inicio)
    AND (p_data_fim IS NULL OR a.timestamp_operacao::date <= p_data_fim)
  ORDER BY a.timestamp_operacao DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get access history for a medical record
CREATE OR REPLACE FUNCTION public.get_access_history_prontuario(
  p_prontuario_id UUID,
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL
)
RETURNS TABLE(
  data_acesso TIMESTAMP WITH TIME ZONE,
  usuario_nome TEXT,
  tipo_acesso tipo_acesso,
  recurso_acessado TEXT,
  motivo_acesso TEXT,
  ip_acesso INET,
  tempo_sessao_minutos INTEGER
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    ap.data_acesso,
    p.nome_completo as usuario_nome,
    ap.tipo_acesso,
    ap.recurso_acessado,
    ap.motivo_acesso,
    ap.ip_acesso,
    ap.tempo_sessao_minutos
  FROM public.acessos_prontuario ap
  JOIN public.profiles p ON p.user_id = ap.usuario_id
  WHERE ap.prontuario_id = p_prontuario_id
    AND (p_data_inicio IS NULL OR ap.data_acesso::date >= p_data_inicio)
    AND (p_data_fim IS NULL OR ap.data_acesso::date <= p_data_fim)
  ORDER BY ap.data_acesso DESC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- APPLY AUDIT TRIGGERS TO CRITICAL TABLES
-- =====================================================

-- Apply comprehensive audit triggers to all critical tables
CREATE TRIGGER auditoria_completa_prontuarios
  AFTER INSERT OR UPDATE OR DELETE ON public.prontuarios
  FOR EACH ROW EXECUTE FUNCTION public.log_auditoria_completa();

CREATE TRIGGER auditoria_completa_sessoes
  AFTER INSERT OR UPDATE OR DELETE ON public.sessoes_atendimento
  FOR EACH ROW EXECUTE FUNCTION public.log_auditoria_completa();

CREATE TRIGGER auditoria_completa_imagens
  AFTER INSERT OR UPDATE OR DELETE ON public.imagens_medicas
  FOR EACH ROW EXECUTE FUNCTION public.log_auditoria_completa();

CREATE TRIGGER auditoria_completa_consentimentos
  AFTER INSERT OR UPDATE OR DELETE ON public.consentimentos_digitais
  FOR EACH ROW EXECUTE FUNCTION public.log_auditoria_completa();

CREATE TRIGGER auditoria_completa_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_auditoria_completa();

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.auditoria_medica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acessos_prontuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.politicas_retencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidentes_seguranca ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Policies for auditoria_medica (read-only for authorized users)
CREATE POLICY "Profissionais podem visualizar auditoria de suas clínicas"
ON public.auditoria_medica FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.organizacao_id = public.auditoria_medica.organizacao_id OR ur.clinica_id = public.auditoria_medica.clinica_id)
      AND ur.ativo = true
  )
);

CREATE POLICY "Administradores podem visualizar toda auditoria"
ON public.auditoria_medica FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'proprietaria')
      AND ur.ativo = true
  )
);

-- Policies for acessos_prontuario
CREATE POLICY "Profissionais podem visualizar acessos de suas clínicas"
ON public.acessos_prontuario FOR SELECT
USING (
  usuario_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (ur.organizacao_id = public.acessos_prontuario.organizacao_id OR ur.clinica_id = public.acessos_prontuario.clinica_id)
      AND ur.role IN ('proprietaria', 'gerente')
      AND ur.ativo = true
  )
);

CREATE POLICY "Sistema pode registrar acessos"
ON public.acessos_prontuario FOR INSERT
WITH CHECK (usuario_id = auth.uid());

-- Policies for eventos_sistema
CREATE POLICY "Administradores podem visualizar eventos do sistema"
ON public.eventos_sistema FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'proprietaria')
      AND ur.ativo = true
  )
);

-- Policies for politicas_retencao
CREATE POLICY "Administradores podem gerenciar políticas de retenção"
ON public.politicas_retencao FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'proprietaria')
      AND ur.ativo = true
  )
);

-- Policies for incidentes_seguranca
CREATE POLICY "Administradores podem gerenciar incidentes de segurança"
ON public.incidentes_seguranca FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin', 'proprietaria')
      AND ur.ativo = true
  )
);

-- =====================================================
-- INSERT DEFAULT RETENTION POLICIES
-- =====================================================

-- Insert default data retention policies
INSERT INTO public.politicas_retencao (nome_politica, descricao, tabela_alvo, periodo_retencao_dias, acao_expiracao, categoria_dados, criado_por) VALUES
('Auditoria Geral', 'Retenção de logs de auditoria geral por 7 anos', 'auditoria_medica', 2555, 'archive', 'medicos', '00000000-0000-0000-0000-000000000000'),
('Eventos Sistema', 'Retenção de eventos de sistema por 2 anos', 'eventos_sistema', 730, 'delete', 'sistema', '00000000-0000-0000-0000-000000000000'),
('Acessos Prontuário', 'Retenção de logs de acesso por 5 anos', 'acessos_prontuario', 1825, 'archive', 'medicos', '00000000-0000-0000-0000-000000000000'),
('Sessões Usuário', 'Retenção de sessões de usuário por 1 ano', 'user_sessions', 365, 'delete', 'pessoais', '00000000-0000-0000-0000-000000000000');

-- =====================================================
-- COMPLETION VERIFICATION
-- =====================================================

-- Verify all tables were created successfully
DO $
DECLARE
  table_count INTEGER;
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('auditoria_medica', 'acessos_prontuario', 'eventos_sistema', 'politicas_retencao', 'incidentes_seguranca');
  
  SELECT COUNT(*) INTO policy_count
  FROM public.politicas_retencao
  WHERE ativa = true;
  
  IF table_count = 5 THEN
    RAISE NOTICE 'Audit and access control system created successfully: % tables, % retention policies', table_count, policy_count;
  ELSE
    RAISE EXCEPTION 'Audit and access control system incomplete - only % tables created', table_count;
  END IF;
END $;

-- Add comments to track completion
COMMENT ON TABLE public.auditoria_medica IS 'Comprehensive audit logging table - created ' || now();
COMMENT ON TABLE public.acessos_prontuario IS 'Medical record access control table - created ' || now();
COMMENT ON TABLE public.eventos_sistema IS 'System events logging table - created ' || now();
COMMENT ON TABLE public.politicas_retencao IS 'Data retention policies table - created ' || now();
COMMENT ON TABLE public.incidentes_seguranca IS 'Security incidents tracking table - created ' || now();