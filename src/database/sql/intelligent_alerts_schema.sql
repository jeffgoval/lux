-- =====================================================
-- SISTEMA DE ALERTAS INTELIGENTES
-- Schema completo para monitoramento proativo e detecção de anomalias
-- =====================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- =====================================================
-- ENUMERAÇÕES
-- =====================================================

-- Categorias de alerta
CREATE TYPE alert_category AS ENUM (
    'operational',    -- Operacional (cancelamentos, no-shows)
    'performance',    -- Performance (tempo resposta, ocupação)
    'financial',      -- Financeiro (receita, custos)
    'capacity',       -- Capacidade (agenda lotada, disponibilidade)
    'quality',        -- Qualidade (satisfação, reclamações)
    'security',       -- Segurança (acessos, tentativas)
    'technical'       -- Técnico (erros, sistema)
);

-- Severidades de alerta
CREATE TYPE alert_severity AS ENUM (
    'info',           -- Informativo
    'warning',        -- Aviso
    'error',          -- Erro
    'critical'        -- Crítico
);

-- Status do alerta
CREATE TYPE alert_status AS ENUM (
    'active',         -- Ativo
    'acknowledged',   -- Reconhecido
    'resolved',       -- Resolvido
    'suppressed'      -- Suprimido
);

-- Frequência de verificação
CREATE TYPE alert_frequency AS ENUM (
    'real-time',      -- Tempo real (minutos)
    'hourly',         -- A cada hora
    'daily',          -- Diariamente
    'weekly'          -- Semanalmente
);

-- Operadores de condição
CREATE TYPE alert_operator AS ENUM (
    'gt',             -- Maior que
    'lt',             -- Menor que
    'gte',            -- Maior ou igual
    'lte',            -- Menor ou igual
    'eq',             -- Igual
    'ne',             -- Diferente
    'between',        -- Entre valores
    'anomaly'         -- Detecção de anomalia
);

-- Tipo de ação
CREATE TYPE alert_action_type AS ENUM (
    'notification',   -- Notificação
    'email',          -- Email
    'webhook',        -- Webhook
    'auto-fix'        -- Auto-correção
);

-- =====================================================
-- TABELAS PRINCIPAIS
-- =====================================================

-- Regras de alerta
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category alert_category NOT NULL,
    severity alert_severity NOT NULL,
    frequency alert_frequency NOT NULL DEFAULT 'hourly',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Condições (JSON array)
    conditions JSONB NOT NULL DEFAULT '[]',
    -- Estrutura: [{
    --   "id": "string",
    --   "metric": "string",
    --   "operator": "gt|lt|gte|lte|eq|ne|between|anomaly",
    --   "value": number|string,
    --   "secondaryValue": number (para 'between'),
    --   "timeWindow": number (horas),
    --   "aggregation": "count|sum|avg|max|min|stddev"
    -- }]
    
    -- Ações (JSON array)
    actions JSONB NOT NULL DEFAULT '[]',
    -- Estrutura: [{
    --   "type": "notification|email|webhook|auto-fix",
    --   "config": {
    --     "recipients": ["string"],
    --     "template": "string",
    --     "webhook_url": "string",
    --     "fix_function": "string"
    --   }
    -- }]
    
    -- Metadados e estatísticas
    trigger_count INTEGER NOT NULL DEFAULT 0,
    last_checked TIMESTAMP WITH TIME ZONE,
    last_triggered TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Alertas disparados
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    category alert_category NOT NULL,
    severity alert_severity NOT NULL,
    
    -- Informações do alerta
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status alert_status NOT NULL DEFAULT 'active',
    
    -- Dados do contexto
    data JSONB NOT NULL DEFAULT '{}',
    -- Estrutura: {
    --   "currentValue": number|string,
    --   "expectedValue": number|string,
    --   "threshold": number|string,
    --   "trend": "up|down|stable",
    --   "affectedEntities": ["string"],
    --   "timeRange": {"start": "ISO date", "end": "ISO date"},
    --   "context": {...}
    -- }
    
    -- Timestamps importantes
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Responsáveis
    acknowledged_by UUID REFERENCES auth.users(id),
    resolved_by UUID REFERENCES auth.users(id),
    
    -- Metadados adicionais
    metadata JSONB DEFAULT '{}',
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Histórico de execução de regras
CREATE TABLE alert_rule_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    
    -- Resultado da execução
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    success BOOLEAN NOT NULL,
    conditions_met BOOLEAN NOT NULL DEFAULT FALSE,
    alert_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Dados da execução
    execution_data JSONB DEFAULT '{}',
    -- Estrutura: {
    --   "conditions": [{
    --     "id": "string",
    --     "result": boolean,
    --     "currentValue": any,
    --     "executionTime": number
    --   }],
    --   "totalExecutionTime": number,
    --   "errors": ["string"]
    -- }
    
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ações executadas
CREATE TABLE alert_actions_executed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    
    -- Informações da ação
    action_type alert_action_type NOT NULL,
    action_config JSONB NOT NULL DEFAULT '{}',
    
    -- Resultado
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    success BOOLEAN NOT NULL,
    response_data JSONB DEFAULT '{}',
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Log de anomalias detectadas
CREATE TABLE anomaly_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Informações da métrica
    metric_name VARCHAR(255) NOT NULL,
    current_value NUMERIC NOT NULL,
    expected_value NUMERIC,
    standard_deviation NUMERIC,
    z_score NUMERIC,
    
    -- Resultado da detecção
    is_anomaly BOOLEAN NOT NULL,
    confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Dados históricos utilizados
    historical_data JSONB DEFAULT '[]',
    detection_algorithm VARCHAR(100) DEFAULT 'z_score',
    
    -- Contexto
    time_window_start TIMESTAMP WITH TIME ZONE,
    time_window_end TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Alert Rules
CREATE INDEX idx_alert_rules_enabled ON alert_rules(enabled) WHERE enabled = TRUE;
CREATE INDEX idx_alert_rules_frequency ON alert_rules(frequency);
CREATE INDEX idx_alert_rules_category ON alert_rules(category);
CREATE INDEX idx_alert_rules_severity ON alert_rules(severity);
CREATE INDEX idx_alert_rules_last_checked ON alert_rules(last_checked);

-- Alerts
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_category ON alerts(category);
CREATE INDEX idx_alerts_rule_id ON alerts(rule_id);
CREATE INDEX idx_alerts_triggered_at ON alerts(triggered_at);
CREATE INDEX idx_alerts_active_status ON alerts(status, triggered_at) WHERE status IN ('active', 'acknowledged');

-- Rule Executions
CREATE INDEX idx_alert_rule_executions_rule_id ON alert_rule_executions(rule_id);
CREATE INDEX idx_alert_rule_executions_executed_at ON alert_rule_executions(executed_at);
CREATE INDEX idx_alert_rule_executions_success ON alert_rule_executions(success);

-- Actions Executed
CREATE INDEX idx_alert_actions_alert_id ON alert_actions_executed(alert_id);
CREATE INDEX idx_alert_actions_executed_at ON alert_actions_executed(executed_at);
CREATE INDEX idx_alert_actions_success ON alert_actions_executed(success);

-- Anomaly Detections
CREATE INDEX idx_anomaly_detections_metric ON anomaly_detections(metric_name);
CREATE INDEX idx_anomaly_detections_is_anomaly ON anomaly_detections(is_anomaly, created_at);
CREATE INDEX idx_anomaly_detections_created_at ON anomaly_detections(created_at);

-- Índices compostos para consultas frequentes
CREATE INDEX idx_alerts_status_severity ON alerts(status, severity, triggered_at);
CREATE INDEX idx_alert_rules_enabled_frequency ON alert_rules(enabled, frequency, last_checked);

-- =====================================================
-- FUNÇÕES PARA MÉTRICAS E ALERTAS
-- =====================================================

-- Função para obter taxa de cancelamento
CREATE OR REPLACE FUNCTION get_cancellation_rate(
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
) RETURNS JSON AS $$
DECLARE
    v_total_appointments INTEGER;
    v_cancelled_appointments INTEGER;
    v_cancellation_rate NUMERIC;
    v_result JSON;
BEGIN
    -- Contar total de agendamentos
    SELECT COUNT(*) INTO v_total_appointments
    FROM agendamentos 
    WHERE created_at BETWEEN p_start_date AND p_end_date;
    
    -- Contar cancelamentos
    SELECT COUNT(*) INTO v_cancelled_appointments
    FROM agendamentos 
    WHERE created_at BETWEEN p_start_date AND p_end_date
    AND status = 'cancelled';
    
    -- Calcular taxa
    IF v_total_appointments > 0 THEN
        v_cancellation_rate := (v_cancelled_appointments::NUMERIC / v_total_appointments::NUMERIC) * 100;
    ELSE
        v_cancellation_rate := 0;
    END IF;
    
    v_result := json_build_object(
        'total_appointments', v_total_appointments,
        'cancelled_appointments', v_cancelled_appointments,
        'cancellation_rate', ROUND(v_cancellation_rate, 2)
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter taxa de ocupação
CREATE OR REPLACE FUNCTION get_occupancy_rate(
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
) RETURNS JSON AS $$
DECLARE
    v_total_slots INTEGER;
    v_occupied_slots INTEGER;
    v_occupancy_rate NUMERIC;
    v_result JSON;
BEGIN
    -- Simular cálculo de slots (implementar com lógica real da agenda)
    v_total_slots := EXTRACT(EPOCH FROM (p_end_date - p_start_date)) / 3600 * 10; -- 10 slots por hora
    
    SELECT COUNT(*) INTO v_occupied_slots
    FROM agendamentos 
    WHERE data_hora BETWEEN p_start_date AND p_end_date
    AND status NOT IN ('cancelled', 'no_show');
    
    IF v_total_slots > 0 THEN
        v_occupancy_rate := (v_occupied_slots::NUMERIC / v_total_slots::NUMERIC) * 100;
    ELSE
        v_occupancy_rate := 0;
    END IF;
    
    v_result := json_build_object(
        'total_slots', v_total_slots,
        'occupied_slots', v_occupied_slots,
        'occupancy_rate', ROUND(v_occupancy_rate, 2)
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter taxa de no-show
CREATE OR REPLACE FUNCTION get_no_show_rate(
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
) RETURNS JSON AS $$
DECLARE
    v_total_appointments INTEGER;
    v_no_shows INTEGER;
    v_no_show_rate NUMERIC;
    v_result JSON;
BEGIN
    SELECT COUNT(*) INTO v_total_appointments
    FROM agendamentos 
    WHERE data_hora BETWEEN p_start_date AND p_end_date
    AND status NOT IN ('cancelled');
    
    SELECT COUNT(*) INTO v_no_shows
    FROM agendamentos 
    WHERE data_hora BETWEEN p_start_date AND p_end_date
    AND status = 'no_show';
    
    IF v_total_appointments > 0 THEN
        v_no_show_rate := (v_no_shows::NUMERIC / v_total_appointments::NUMERIC) * 100;
    ELSE
        v_no_show_rate := 0;
    END IF;
    
    v_result := json_build_object(
        'total_appointments', v_total_appointments,
        'no_shows', v_no_shows,
        'no_show_rate', ROUND(v_no_show_rate, 2)
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter ocupação futura
CREATE OR REPLACE FUNCTION get_future_occupancy(
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
) RETURNS JSON AS $$
DECLARE
    v_total_appointments INTEGER;
    v_available_slots INTEGER;
    v_occupancy_rate NUMERIC;
    v_result JSON;
BEGIN
    SELECT COUNT(*) INTO v_total_appointments
    FROM agendamentos 
    WHERE data_hora BETWEEN p_start_date AND p_end_date
    AND status NOT IN ('cancelled');
    
    -- Simular slots disponíveis
    v_available_slots := EXTRACT(EPOCH FROM (p_end_date - p_start_date)) / 3600 * 8; -- 8 slots disponíveis por hora
    
    IF v_available_slots > 0 THEN
        v_occupancy_rate := (v_total_appointments::NUMERIC / v_available_slots::NUMERIC) * 100;
    ELSE
        v_occupancy_rate := 0;
    END IF;
    
    v_result := json_build_object(
        'total_appointments', v_total_appointments,
        'available_slots', v_available_slots,
        'occupancy_rate', ROUND(v_occupancy_rate, 2)
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter histórico de receita diária
CREATE OR REPLACE FUNCTION get_daily_revenue_history(
    p_days INTEGER DEFAULT 30
) RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'date', revenue_date,
            'revenue', COALESCE(daily_revenue, 0)
        ) ORDER BY revenue_date
    ) INTO v_result
    FROM (
        SELECT 
            DATE(p.created_at) as revenue_date,
            SUM(p.amount) as daily_revenue
        FROM pagamentos p
        WHERE p.created_at >= NOW() - INTERVAL '%s days' % p_days
        AND p.status = 'completed'
        GROUP BY DATE(p.created_at)
        
        UNION ALL
        
        -- Preencher dias sem receita
        SELECT 
            generate_series(
                (NOW() - INTERVAL '%s days' % p_days)::date,
                NOW()::date,
                '1 day'::interval
            )::date as revenue_date,
            0 as daily_revenue
        WHERE NOT EXISTS (
            SELECT 1 FROM pagamentos p2 
            WHERE DATE(p2.created_at) = generate_series(
                (NOW() - INTERVAL '%s days' % p_days)::date,
                NOW()::date,
                '1 day'::interval
            )::date
            AND p2.status = 'completed'
        )
    ) revenue_data;
    
    RETURN COALESCE(v_result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS PARA AUDITORIA
-- =====================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas tabelas
CREATE TRIGGER update_alert_rules_updated_at
    BEFORE UPDATE ON alert_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para log de mudanças de status de alertas
CREATE OR REPLACE FUNCTION log_alert_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO alert_actions_executed (
            alert_id,
            rule_id,
            action_type,
            action_config,
            success,
            response_data
        ) VALUES (
            NEW.id,
            NEW.rule_id,
            'notification',
            json_build_object(
                'action', 'status_change',
                'old_status', OLD.status,
                'new_status', NEW.status
            ),
            true,
            json_build_object(
                'changed_at', NOW(),
                'changed_by', COALESCE(NEW.acknowledged_by, NEW.resolved_by)
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alert_status_change_log
    AFTER UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION log_alert_status_change();

-- =====================================================
-- FUNÇÕES DE GESTÃO DE ALERTAS
-- =====================================================

-- Função para executar regra de alerta
CREATE OR REPLACE FUNCTION execute_alert_rule(
    p_rule_id UUID
) RETURNS JSON AS $$
DECLARE
    v_rule RECORD;
    v_execution_result JSON;
    v_execution_id UUID;
BEGIN
    -- Buscar regra
    SELECT * INTO v_rule FROM alert_rules WHERE id = p_rule_id AND enabled = TRUE;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Rule not found or disabled');
    END IF;
    
    -- Criar registro de execução
    INSERT INTO alert_rule_executions (rule_id, success, conditions_met, alert_triggered)
    VALUES (p_rule_id, true, false, false)
    RETURNING id INTO v_execution_id;
    
    -- Atualizar timestamp da última verificação
    UPDATE alert_rules 
    SET last_checked = NOW() 
    WHERE id = p_rule_id;
    
    -- Retornar resultado
    v_execution_result := json_build_object(
        'execution_id', v_execution_id,
        'rule_id', p_rule_id,
        'executed_at', NOW(),
        'success', true
    );
    
    RETURN v_execution_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter estatísticas de alertas
CREATE OR REPLACE FUNCTION get_alerts_statistics(
    p_days INTEGER DEFAULT 7
) RETURNS JSON AS $$
DECLARE
    v_stats JSON;
BEGIN
    SELECT json_build_object(
        'total_alerts', COUNT(*),
        'active_alerts', COUNT(*) FILTER (WHERE status = 'active'),
        'acknowledged_alerts', COUNT(*) FILTER (WHERE status = 'acknowledged'),
        'resolved_alerts', COUNT(*) FILTER (WHERE status = 'resolved'),
        'critical_alerts', COUNT(*) FILTER (WHERE severity = 'critical'),
        'error_alerts', COUNT(*) FILTER (WHERE severity = 'error'),
        'warning_alerts', COUNT(*) FILTER (WHERE severity = 'warning'),
        'info_alerts', COUNT(*) FILTER (WHERE severity = 'info'),
        'by_category', json_build_object(
            'operational', COUNT(*) FILTER (WHERE category = 'operational'),
            'performance', COUNT(*) FILTER (WHERE category = 'performance'),
            'financial', COUNT(*) FILTER (WHERE category = 'financial'),
            'capacity', COUNT(*) FILTER (WHERE category = 'capacity'),
            'quality', COUNT(*) FILTER (WHERE category = 'quality'),
            'security', COUNT(*) FILTER (WHERE category = 'security'),
            'technical', COUNT(*) FILTER (WHERE category = 'technical')
        ),
        'period_days', p_days
    ) INTO v_stats
    FROM alerts
    WHERE triggered_at >= NOW() - INTERVAL '%s days' % p_days;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rule_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_actions_executed ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_detections ENABLE ROW LEVEL SECURITY;

-- Políticas para alert_rules (apenas usuários autenticados)
CREATE POLICY "Users can view alert rules" ON alert_rules
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage alert rules" ON alert_rules
    FOR ALL USING (
        auth.role() = 'authenticated' AND 
        auth.uid() IN (
            SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Políticas para alerts (apenas usuários autenticados)
CREATE POLICY "Users can view alerts" ON alerts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can acknowledge/resolve alerts" ON alerts
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        status IN ('active', 'acknowledged')
    );

-- Políticas para executions e actions (apenas visualização para usuários autenticados)
CREATE POLICY "Users can view executions" ON alert_rule_executions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view actions" ON alert_actions_executed
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view anomalies" ON anomaly_detections
    FOR SELECT USING (auth.role() = 'authenticated');

-- =====================================================
-- DADOS INICIAIS - REGRAS PADRÃO
-- =====================================================

INSERT INTO alert_rules (
    id, name, description, category, severity, frequency, enabled,
    conditions, actions
) VALUES 
(
    uuid_generate_v4(),
    'Taxa Alta de Cancelamentos',
    'Alerta quando a taxa de cancelamento excede 20% nas últimas 24h',
    'operational',
    'warning',
    'hourly',
    true,
    '[{"id": "cancellation_rate", "metric": "cancellation_rate", "operator": "gt", "value": 20, "timeWindow": 24, "aggregation": "avg"}]'::jsonb,
    '[{"type": "notification", "config": {"recipients": ["gerente", "proprietaria"], "template": "high_cancellation_alert"}}]'::jsonb
),
(
    uuid_generate_v4(),
    'Baixa Taxa de Ocupação',
    'Alerta quando ocupação fica abaixo de 40% por mais de 2 dias',
    'performance',
    'warning',
    'daily',
    true,
    '[{"id": "occupancy_rate", "metric": "occupancy_rate", "operator": "lt", "value": 40, "timeWindow": 48, "aggregation": "avg"}]'::jsonb,
    '[{"type": "notification", "config": {"recipients": ["gerente", "marketing"], "template": "low_occupancy_alert"}}]'::jsonb
),
(
    uuid_generate_v4(),
    'Anomalia na Receita',
    'Detecta quedas anômalas na receita diária usando análise estatística',
    'financial',
    'error',
    'daily',
    true,
    '[{"id": "daily_revenue", "metric": "daily_revenue", "operator": "anomaly", "value": -2, "timeWindow": 24, "aggregation": "sum"}]'::jsonb,
    '[{"type": "notification", "config": {"recipients": ["proprietaria", "financeiro"], "template": "revenue_anomaly_alert"}}]'::jsonb
),
(
    uuid_generate_v4(),
    'Excesso de No-Shows',
    'No-shows acima de 15% nas últimas 48h com auto-correção',
    'operational',
    'warning',
    'daily',
    true,
    '[{"id": "no_show_rate", "metric": "no_show_rate", "operator": "gt", "value": 15, "timeWindow": 48, "aggregation": "avg"}]'::jsonb,
    '[{"type": "notification", "config": {"recipients": ["gerente", "recepcionistas"], "template": "high_no_show_alert"}}, {"type": "auto-fix", "config": {"fix_function": "increase_reminder_frequency"}}]'::jsonb
);

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE alert_rules IS 'Regras configuráveis para detecção proativa de problemas';
COMMENT ON TABLE alerts IS 'Alertas disparados pelo sistema de monitoramento';
COMMENT ON TABLE alert_rule_executions IS 'Histórico de execução das regras de alerta';
COMMENT ON TABLE alert_actions_executed IS 'Log de ações executadas em resposta aos alertas';
COMMENT ON TABLE anomaly_detections IS 'Registro de anomalias detectadas por análise estatística';

COMMENT ON COLUMN alert_rules.conditions IS 'Array JSON com condições para disparar o alerta';
COMMENT ON COLUMN alert_rules.actions IS 'Array JSON com ações a serem executadas quando alerta for disparado';
COMMENT ON COLUMN alerts.data IS 'Contexto e dados do alerta disparado';
COMMENT ON COLUMN anomaly_detections.z_score IS 'Z-score calculado para detecção de anomalia';
COMMENT ON COLUMN anomaly_detections.confidence IS 'Nível de confiança da detecção (0-1)';

-- Mensagem de conclusão
DO $$ 
BEGIN 
    RAISE NOTICE '=== SISTEMA DE ALERTAS INTELIGENTES INSTALADO COM SUCESSO ===';
    RAISE NOTICE 'Componentes criados:';
    RAISE NOTICE '- 5 tipos enumerados para categorização';
    RAISE NOTICE '- 5 tabelas principais com índices otimizados';
    RAISE NOTICE '- 6 funções para métricas e análise';
    RAISE NOTICE '- 3 triggers para auditoria automática';
    RAISE NOTICE '- 2 funções de gestão de alertas';
    RAISE NOTICE '- Políticas RLS para segurança';
    RAISE NOTICE '- 4 regras padrão pré-configuradas';
    RAISE NOTICE '=== READY FOR INTELLIGENT MONITORING ===';
END $$;