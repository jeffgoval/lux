-- =====================================================
-- AUDIT AND LOGGING FUNCTIONS
-- Sistema de Gestão de Clínicas Estéticas
-- =====================================================

-- =====================================================
-- COMPREHENSIVE AUDIT LOGGING
-- =====================================================

-- Enhanced audit logging function with detailed context
CREATE OR REPLACE FUNCTION public.log_comprehensive_audit(
  p_tabela_afetada TEXT,
  p_registro_id UUID,
  p_operacao TEXT,
  p_dados_anteriores JSONB DEFAULT NULL,
  p_dados_novos JSONB DEFAULT NULL,
  p_contexto_operacao TEXT DEFAULT NULL,
  p_nivel_criticidade TEXT DEFAULT 'normal'
)
RETURNS UUID AS $
DECLARE
  new_audit_id UUID;
  user_info RECORD;
  campos_alterados TEXT[];
  contexto_organizacao UUID;
  contexto_clinica UUID;
BEGIN
  -- Get user information
  SELECT p.nome_completo, p.email INTO user_info
  FROM public.profiles p
  WHERE p.user_id = auth.uid();
  
  -- Calculate changed fields for UPDATE operations
  IF p_operacao = 'UPDATE' AND p_dados_anteriores IS NOT NULL AND p_dados_novos IS NOT NULL THEN
    SELECT array_agg(key) INTO campos_alterados
    FROM jsonb_each(p_dados_novos)
    WHERE p_dados_novos -> key != p_dados_anteriores -> key;
  END IF;
  
  -- Determine organizational context based on table
  CASE p_tabela_afetada
    WHEN 'prontuarios' THEN
      SELECT c.organizacao_id, p.clinica_id INTO contexto_organizacao, contexto_clinica
      FROM public.prontuarios p
      JOIN public.clinicas c ON c.id = p.clinica_id
      WHERE p.id = p_registro_id;
    
    WHEN 'clinicas' THEN
      SELECT organizacao_id, id INTO contexto_organizacao, contexto_clinica
      FROM public.clinicas
      WHERE id = p_registro_id;
    
    WHEN 'organizacoes' THEN
      SELECT id, NULL INTO contexto_organizacao, contexto_clinica
      FROM public.organizacoes
      WHERE id = p_registro_id;
  END CASE;
  
  -- Insert comprehensive audit record
  INSERT INTO public.auditoria_medica (
    tabela_afetada,
    registro_id,
    operacao,
    dados_anteriores,
    dados_novos,
    campos_modificados,
    nivel_criticidade,
    contexto_operacao,
    usuario_id,
    usuario_nome,
    usuario_email,
    ip_origem,
    timestamp_operacao,
    organizacao_id,
    clinica_id,
    categoria_operacao,
    hash_integridade,
    contem_dados_sensiveis
  ) VALUES (
    p_tabela_afetada,
    p_registro_id,
    p_operacao,
    p_dados_anteriores,
    p_dados_novos,
    campos_alterados,
    p_nivel_criticidade,
    p_contexto_operacao,
    auth.uid(),
    user_info.nome_completo,
    user_info.email,
    inet_client_addr(),
    now(),
    contexto_organizacao,
    contexto_clinica,
    CASE 
      WHEN p_tabela_afetada IN ('prontuarios', 'sessoes_atendimento', 'imagens_medicas', 'consentimentos_digitais') THEN 'medica'
      WHEN p_tabela_afetada IN ('produtos', 'movimentacao_estoque', 'pedidos_compra') THEN 'administrativa'
      WHEN p_tabela_afetada IN ('user_roles', 'profiles', 'convites') THEN 'usuario'
      ELSE 'sistema'
    END,
    md5(p_registro_id::text || now()::text || random()::text),
    p_tabela_afetada IN ('prontuarios', 'profiles', 'consentimentos_digitais')
  ) RETURNING id INTO new_audit_id;
  
  RETURN new_audit_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- MEDICAL RECORD ACCESS LOGGING
-- =====================================================

-- Enhanced function to log medical record access with detailed tracking
CREATE OR REPLACE FUNCTION public.log_medical_record_access(
  p_prontuario_id UUID,
  p_tipo_acesso tipo_acesso,
  p_recurso_acessado TEXT,
  p_motivo_acesso TEXT,
  p_secoes_acessadas TEXT[] DEFAULT NULL,
  p_finalidade_acesso TEXT DEFAULT 'consulta_rotina',
  p_nivel_urgencia TEXT DEFAULT 'normal',
  p_consentimento_paciente BOOLEAN DEFAULT false
)
RETURNS UUID AS $
DECLARE
  new_access_id UUID;
  user_context RECORD;
  client_info RECORD;
  base_legal_acesso TEXT;
BEGIN
  -- Get user context
  SELECT ur.organizacao_id, ur.clinica_id, ur.role INTO user_context
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid() AND ur.ativo = true
  LIMIT 1;
  
  -- Get client information
  SELECT 
    inet_client_addr() as ip_address,
    current_setting('request.headers', true)::jsonb->>'user-agent' as user_agent
  INTO client_info;
  
  -- Determine legal basis for access (LGPD compliance)
  base_legal_acesso := CASE p_finalidade_acesso
    WHEN 'consulta_rotina' THEN 'Execução de contrato'
    WHEN 'emergencia_medica' THEN 'Proteção da vida'
    WHEN 'auditoria' THEN 'Cumprimento de obrigação legal'
    WHEN 'pesquisa' THEN 'Consentimento do titular'
    ELSE 'Legítimo interesse'
  END;
  
  -- Insert access log
  INSERT INTO public.acessos_prontuario (
    prontuario_id,
    usuario_id,
    tipo_acesso,
    recurso_acessado,
    motivo_acesso,
    secoes_acessadas,
    finalidade_acesso,
    nivel_urgencia,
    consentimento_paciente,
    base_legal_acesso,
    ip_acesso,
    navegador,
    organizacao_id,
    clinica_id,
    data_acesso
  ) VALUES (
    p_prontuario_id,
    auth.uid(),
    p_tipo_acesso,
    p_recurso_acessado,
    p_motivo_acesso,
    p_secoes_acessadas,
    p_finalidade_acesso,
    p_nivel_urgencia,
    p_consentimento_paciente,
    base_legal_acesso,
    client_info.ip_address,
    client_info.user_agent,
    user_context.organizacao_id,
    user_context.clinica_id,
    now()
  ) RETURNING id INTO new_access_id;
  
  -- Log system event for high-sensitivity access
  IF p_tipo_acesso IN ('edicao', 'exclusao', 'download') OR p_nivel_urgencia = 'emergencial' THEN
    PERFORM public.log_evento_sistema(
      'sensitive_medical_access',
      'seguranca',
      CASE p_nivel_urgencia WHEN 'emergencial' THEN 'warning' ELSE 'info' END,
      'Sensitive medical record access',
      format('User %s performed %s on medical record %s', auth.uid(), p_tipo_acesso, p_prontuario_id),
      jsonb_build_object(
        'access_id', new_access_id,
        'prontuario_id', p_prontuario_id,
        'tipo_acesso', p_tipo_acesso,
        'nivel_urgencia', p_nivel_urgencia,
        'user_id', auth.uid()
      )
    );
  END IF;
  
  RETURN new_access_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- SYSTEM EVENT LOGGING
-- =====================================================

-- Enhanced system event logging with categorization and alerting
CREATE OR REPLACE FUNCTION public.log_sistema_evento_detalhado(
  p_tipo_evento TEXT,
  p_categoria TEXT,
  p_severidade TEXT,
  p_titulo TEXT,
  p_descricao TEXT DEFAULT NULL,
  p_dados_evento JSONB DEFAULT NULL,
  p_componente_sistema TEXT DEFAULT NULL,
  p_usuario_afetado_id UUID DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  new_event_id UUID;
  user_context RECORD;
  should_escalate BOOLEAN := false;
BEGIN
  -- Get user context if available
  IF auth.uid() IS NOT NULL THEN
    SELECT ur.organizacao_id, ur.clinica_id, ur.role INTO user_context
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.ativo = true
    LIMIT 1;
  END IF;
  
  -- Determine if event should be escalated
  should_escalate := p_severidade IN ('error', 'critical') OR 
                     p_tipo_evento IN ('security_breach', 'data_corruption', 'system_failure');
  
  -- Insert system event
  INSERT INTO public.eventos_sistema (
    tipo_evento,
    categoria,
    severidade,
    titulo,
    descricao,
    dados_evento,
    componente_sistema,
    usuario_id,
    usuario_afetado_id,
    ip_origem,
    timestamp_evento,
    organizacao_id,
    clinica_id,
    escalado
  ) VALUES (
    p_tipo_evento,
    p_categoria,
    p_severidade,
    p_titulo,
    p_descricao,
    p_dados_evento,
    p_componente_sistema,
    auth.uid(),
    p_usuario_afetado_id,
    inet_client_addr(),
    now(),
    user_context.organizacao_id,
    user_context.clinica_id,
    should_escalate
  ) RETURNING id INTO new_event_id;
  
  -- Create security incident for critical events
  IF p_severidade = 'critical' AND p_categoria = 'seguranca' THEN
    PERFORM public.criar_incidente_seguranca(
      CASE p_tipo_evento
        WHEN 'unauthorized_access' THEN 'acesso_nao_autorizado'
        WHEN 'data_breach' THEN 'vazamento_dados'
        WHEN 'malware_detected' THEN 'malware'
        ELSE 'outro'
      END,
      'critica',
      p_titulo,
      p_descricao,
      p_tipo_evento IN ('data_breach', 'data_corruption'),
      ARRAY[p_componente_sistema]
    );
  END IF;
  
  RETURN new_event_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- AUTOMATED AUDIT TRIGGERS
-- =====================================================

-- Enhanced trigger function for automatic audit logging
CREATE OR REPLACE FUNCTION public.trigger_audit_automatico()
RETURNS TRIGGER AS $
DECLARE
  operacao_tipo TEXT;
  nivel_criticidade_calc TEXT;
  contexto_operacao TEXT;
BEGIN
  -- Determine operation type
  CASE TG_OP
    WHEN 'INSERT' THEN operacao_tipo := 'INSERT';
    WHEN 'UPDATE' THEN operacao_tipo := 'UPDATE';
    WHEN 'DELETE' THEN operacao_tipo := 'DELETE';
  END CASE;
  
  -- Calculate criticality level based on table and operation
  nivel_criticidade_calc := CASE 
    WHEN TG_TABLE_NAME IN ('prontuarios', 'consentimentos_digitais') THEN 'alto'
    WHEN TG_TABLE_NAME IN ('sessoes_atendimento', 'imagens_medicas', 'user_roles') THEN 'medio'
    WHEN TG_OP = 'DELETE' THEN 'alto'
    ELSE 'normal'
  END;
  
  -- Generate context description
  contexto_operacao := format('%s em %s via %s', 
    operacao_tipo, 
    TG_TABLE_NAME,
    COALESCE(current_setting('application_name', true), 'database')
  );
  
  -- Log the audit record
  PERFORM public.log_comprehensive_audit(
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    operacao_tipo,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
    contexto_operacao,
    nivel_criticidade_calc
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- AUDIT TRAIL ANALYSIS FUNCTIONS
-- =====================================================

-- Function to get comprehensive audit trail for a record
CREATE OR REPLACE FUNCTION public.get_audit_trail_completo(
  p_tabela TEXT,
  p_registro_id UUID,
  p_data_inicio TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_data_fim TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_incluir_detalhes BOOLEAN DEFAULT true
)
RETURNS JSONB AS $
DECLARE
  audit_trail JSONB;
BEGIN
  -- Check if user has permission to view audit trail
  IF NOT public.user_has_permission_in_context(auth.uid(), 'admin', NULL, NULL) THEN
    -- Check if user has access to the specific record
    IF p_tabela = 'prontuarios' AND NOT public.can_access_medical_record(auth.uid(), p_registro_id, 'read') THEN
      RAISE EXCEPTION 'Sem permissão para visualizar trilha de auditoria';
    END IF;
  END IF;
  
  SELECT jsonb_build_object(
    'record_info', jsonb_build_object(
      'tabela', p_tabela,
      'registro_id', p_registro_id,
      'periodo_consulta', jsonb_build_object(
        'inicio', COALESCE(p_data_inicio, (SELECT MIN(timestamp_operacao) FROM public.auditoria_medica WHERE tabela_afetada = p_tabela AND registro_id = p_registro_id)),
        'fim', COALESCE(p_data_fim, now())
      )
    ),
    'summary', jsonb_build_object(
      'total_operacoes', (
        SELECT COUNT(*)
        FROM public.auditoria_medica a
        WHERE a.tabela_afetada = p_tabela 
          AND a.registro_id = p_registro_id
          AND (p_data_inicio IS NULL OR a.timestamp_operacao >= p_data_inicio)
          AND (p_data_fim IS NULL OR a.timestamp_operacao <= p_data_fim)
      ),
      'operacoes_por_tipo', (
        SELECT jsonb_object_agg(operacao, count)
        FROM (
          SELECT a.operacao, COUNT(*) as count
          FROM public.auditoria_medica a
          WHERE a.tabela_afetada = p_tabela 
            AND a.registro_id = p_registro_id
            AND (p_data_inicio IS NULL OR a.timestamp_operacao >= p_data_inicio)
            AND (p_data_fim IS NULL OR a.timestamp_operacao <= p_data_fim)
          GROUP BY a.operacao
        ) ops
      ),
      'usuarios_envolvidos', (
        SELECT COUNT(DISTINCT usuario_id)
        FROM public.auditoria_medica a
        WHERE a.tabela_afetada = p_tabela 
          AND a.registro_id = p_registro_id
          AND (p_data_inicio IS NULL OR a.timestamp_operacao >= p_data_inicio)
          AND (p_data_fim IS NULL OR a.timestamp_operacao <= p_data_fim)
      )
    ),
    'audit_records', CASE WHEN p_incluir_detalhes THEN (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'timestamp', a.timestamp_operacao,
          'operacao', a.operacao,
          'usuario_nome', a.usuario_nome,
          'usuario_email', a.usuario_email,
          'ip_origem', a.ip_origem,
          'nivel_criticidade', a.nivel_criticidade,
          'contexto_operacao', a.contexto_operacao,
          'campos_modificados', a.campos_modificados,
          'dados_anteriores', CASE WHEN a.operacao = 'UPDATE' THEN a.dados_anteriores ELSE NULL END,
          'dados_novos', CASE WHEN a.operacao IN ('INSERT', 'UPDATE') THEN a.dados_novos ELSE NULL END
        ) ORDER BY a.timestamp_operacao DESC
      )
      FROM public.auditoria_medica a
      WHERE a.tabela_afetada = p_tabela 
        AND a.registro_id = p_registro_id
        AND (p_data_inicio IS NULL OR a.timestamp_operacao >= p_data_inicio)
        AND (p_data_fim IS NULL OR a.timestamp_operacao <= p_data_fim)
    ) ELSE NULL END
  ) INTO audit_trail;
  
  RETURN audit_trail;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to detect suspicious access patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_access_patterns(
  p_user_id UUID DEFAULT NULL,
  p_hours_lookback INTEGER DEFAULT 24
)
RETURNS JSONB AS $
DECLARE
  suspicious_patterns JSONB;
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Check permissions
  IF target_user_id != auth.uid() AND NOT public.user_has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Sem permissão para analisar padrões de acesso de outros usuários';
  END IF;
  
  SELECT jsonb_build_object(
    'analysis_period', jsonb_build_object(
      'start_time', now() - (p_hours_lookback || ' hours')::INTERVAL,
      'end_time', now(),
      'user_id', target_user_id
    ),
    'patterns', jsonb_build_object(
      'excessive_access', (
        SELECT COUNT(*) > 100 -- More than 100 accesses in the period
        FROM public.acessos_prontuario ap
        WHERE ap.usuario_id = target_user_id
          AND ap.data_acesso > now() - (p_hours_lookback || ' hours')::INTERVAL
      ),
      'unusual_hours', (
        SELECT COUNT(*) > 0 -- Access outside business hours
        FROM public.acessos_prontuario ap
        WHERE ap.usuario_id = target_user_id
          AND ap.data_acesso > now() - (p_hours_lookback || ' hours')::INTERVAL
          AND (EXTRACT(HOUR FROM ap.data_acesso) < 6 OR EXTRACT(HOUR FROM ap.data_acesso) > 22)
      ),
      'multiple_ips', (
        SELECT COUNT(DISTINCT ip_acesso) > 3 -- Access from more than 3 different IPs
        FROM public.acessos_prontuario ap
        WHERE ap.usuario_id = target_user_id
          AND ap.data_acesso > now() - (p_hours_lookback || ' hours')::INTERVAL
      ),
      'bulk_downloads', (
        SELECT COUNT(*) > 10 -- More than 10 downloads
        FROM public.acessos_prontuario ap
        WHERE ap.usuario_id = target_user_id
          AND ap.data_acesso > now() - (p_hours_lookback || ' hours')::INTERVAL
          AND ap.dados_exportados = true
      )
    ),
    'details', jsonb_build_object(
      'total_accesses', (
        SELECT COUNT(*)
        FROM public.acessos_prontuario ap
        WHERE ap.usuario_id = target_user_id
          AND ap.data_acesso > now() - (p_hours_lookback || ' hours')::INTERVAL
      ),
      'unique_records_accessed', (
        SELECT COUNT(DISTINCT prontuario_id)
        FROM public.acessos_prontuario ap
        WHERE ap.usuario_id = target_user_id
          AND ap.data_acesso > now() - (p_hours_lookback || ' hours')::INTERVAL
      ),
      'unique_ips', (
        SELECT array_agg(DISTINCT ip_acesso)
        FROM public.acessos_prontuario ap
        WHERE ap.usuario_id = target_user_id
          AND ap.data_acesso > now() - (p_hours_lookback || ' hours')::INTERVAL
      ),
      'access_times', (
        SELECT array_agg(DISTINCT EXTRACT(HOUR FROM data_acesso))
        FROM public.acessos_prontuario ap
        WHERE ap.usuario_id = target_user_id
          AND ap.data_acesso > now() - (p_hours_lookback || ' hours')::INTERVAL
      )
    )
  ) INTO suspicious_patterns;
  
  -- Log the analysis
  PERFORM public.log_evento_sistema(
    'access_pattern_analysis',
    'seguranca',
    'info',
    'Suspicious access pattern analysis performed',
    format('Analysis performed for user %s over %s hours', target_user_id, p_hours_lookback),
    suspicious_patterns
  );
  
  RETURN suspicious_patterns;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- COMPLIANCE REPORTING FUNCTIONS
-- =====================================================

-- Function to generate LGPD compliance report
CREATE OR REPLACE FUNCTION public.generate_lgpd_compliance_report(
  p_data_inicio DATE,
  p_data_fim DATE,
  p_organizacao_id UUID DEFAULT NULL
)
RETURNS JSONB AS $
DECLARE
  compliance_report JSONB;
BEGIN
  -- Check permissions
  IF NOT public.user_has_permission_in_context(auth.uid(), 'admin', p_organizacao_id, NULL) THEN
    RAISE EXCEPTION 'Sem permissão para gerar relatórios de compliance';
  END IF;
  
  SELECT jsonb_build_object(
    'report_info', jsonb_build_object(
      'period', jsonb_build_object(
        'start_date', p_data_inicio,
        'end_date', p_data_fim
      ),
      'organization_id', p_organizacao_id,
      'generated_at', now(),
      'generated_by', auth.uid()
    ),
    'data_processing_activities', jsonb_build_object(
      'total_medical_records_created', (
        SELECT COUNT(*)
        FROM public.prontuarios p
        WHERE p.criado_em::date BETWEEN p_data_inicio AND p_data_fim
          AND (p_organizacao_id IS NULL OR EXISTS (
            SELECT 1 FROM public.clinicas c 
            WHERE c.id = p.clinica_id AND c.organizacao_id = p_organizacao_id
          ))
      ),
      'total_access_events', (
        SELECT COUNT(*)
        FROM public.acessos_prontuario ap
        WHERE ap.data_acesso::date BETWEEN p_data_inicio AND p_data_fim
          AND (p_organizacao_id IS NULL OR ap.organizacao_id = p_organizacao_id)
      ),
      'consent_records', (
        SELECT COUNT(*)
        FROM public.consentimentos_digitais cd
        WHERE cd.data_assinatura::date BETWEEN p_data_inicio AND p_data_fim
          AND (p_organizacao_id IS NULL OR EXISTS (
            SELECT 1 FROM public.prontuarios p
            JOIN public.clinicas c ON c.id = p.clinica_id
            WHERE p.id = cd.prontuario_id AND c.organizacao_id = p_organizacao_id
          ))
      )
    ),
    'access_patterns', jsonb_build_object(
      'by_legal_basis', (
        SELECT jsonb_object_agg(base_legal_acesso, count)
        FROM (
          SELECT ap.base_legal_acesso, COUNT(*) as count
          FROM public.acessos_prontuario ap
          WHERE ap.data_acesso::date BETWEEN p_data_inicio AND p_data_fim
            AND (p_organizacao_id IS NULL OR ap.organizacao_id = p_organizacao_id)
          GROUP BY ap.base_legal_acesso
        ) legal_basis
      ),
      'by_purpose', (
        SELECT jsonb_object_agg(finalidade_acesso, count)
        FROM (
          SELECT ap.finalidade_acesso, COUNT(*) as count
          FROM public.acessos_prontuario ap
          WHERE ap.data_acesso::date BETWEEN p_data_inicio AND p_data_fim
            AND (p_organizacao_id IS NULL OR ap.organizacao_id = p_organizacao_id)
          GROUP BY ap.finalidade_acesso
        ) purpose
      )
    ),
    'security_incidents', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', is_inc.id,
          'type', is_inc.tipo_incidente,
          'severity', is_inc.severidade,
          'date', is_inc.data_ocorrencia,
          'data_compromised', is_inc.dados_comprometidos,
          'status', is_inc.status
        )
      )
      FROM public.incidentes_seguranca is_inc
      WHERE is_inc.data_ocorrencia::date BETWEEN p_data_inicio AND p_data_fim
        AND (p_organizacao_id IS NULL OR is_inc.organizacao_id = p_organizacao_id)
    ),
    'compliance_metrics', jsonb_build_object(
      'consent_rate', (
        SELECT ROUND(
          (COUNT(*) FILTER (WHERE consentimento_paciente = true)::DECIMAL / 
           NULLIF(COUNT(*), 0)) * 100, 2
        )
        FROM public.acessos_prontuario ap
        WHERE ap.data_acesso::date BETWEEN p_data_inicio AND p_data_fim
          AND (p_organizacao_id IS NULL OR ap.organizacao_id = p_organizacao_id)
      ),
      'data_retention_compliance', (
        SELECT COUNT(*) = 0 -- Should be 0 for full compliance
        FROM public.prontuarios p
        WHERE p.criado_em < now() - INTERVAL '20 years' -- Example retention period
          AND p.status = 'ativo'
          AND (p_organizacao_id IS NULL OR EXISTS (
            SELECT 1 FROM public.clinicas c 
            WHERE c.id = p.clinica_id AND c.organizacao_id = p_organizacao_id
          ))
      )
    )
  ) INTO compliance_report;
  
  -- Log report generation
  PERFORM public.log_evento_sistema(
    'compliance_report_generated',
    'sistema',
    'info',
    'LGPD compliance report generated',
    format('Report generated for period %s to %s', p_data_inicio, p_data_fim),
    jsonb_build_object(
      'report_type', 'lgpd_compliance',
      'period_start', p_data_inicio,
      'period_end', p_data_fim,
      'organization_id', p_organizacao_id
    )
  );
  
  RETURN compliance_report;
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- COMPLETION VERIFICATION
-- =====================================================

-- Verify all functions were created successfully
DO $
DECLARE
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'log_comprehensive_audit',
      'log_medical_record_access',
      'log_sistema_evento_detalhado',
      'trigger_audit_automatico',
      'get_audit_trail_completo',
      'detect_suspicious_access_patterns',
      'generate_lgpd_compliance_report'
    );
  
  IF function_count >= 7 THEN
    RAISE NOTICE 'Audit and logging functions created successfully: % functions', function_count;
  ELSE
    RAISE EXCEPTION 'Audit and logging functions incomplete - only % functions created', function_count;
  END IF;
END $;

-- Add comment to track completion
COMMENT ON SCHEMA public IS 'Audit and logging functions implemented - ' || now();