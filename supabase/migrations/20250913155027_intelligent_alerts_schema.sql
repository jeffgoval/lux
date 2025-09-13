-- =====================================================
-- SISTEMA DE ALERTAS INTELIGENTES
-- Schema completo para monitoramento proativo e detecção de anomalias
-- =====================================================

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

-- =====================================================
-- TABELAS PRINCIPAIS
-- =====================================================

-- Extensão necessária para UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Regras de alerta
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category alert_category NOT NULL,
    severity alert_severity NOT NULL,
    frequency alert_frequency NOT NULL DEFAULT 'hourly',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Condições (JSON array)
    conditions JSONB NOT NULL DEFAULT '[]',
    
    -- Ações (JSON array)
    actions JSONB NOT NULL DEFAULT '[]',
    
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- =====================================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

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

-- =====================================================
-- DADOS INICIAIS - REGRAS PADRÃO
-- =====================================================

INSERT INTO alert_rules (
    id, name, description, category, severity, frequency, enabled,
    conditions, actions
) VALUES 
(
    gen_random_uuid(),
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
    gen_random_uuid(),
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
    gen_random_uuid(),
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
    gen_random_uuid(),
    'Excesso de No-Shows',
    'No-shows acima de 15% nas últimas 48h com auto-correção',
    'operational',
    'warning',
    'daily',
    true,
    '[{"id": "no_show_rate", "metric": "no_show_rate", "operator": "gt", "value": 15, "timeWindow": 48, "aggregation": "avg"}]'::jsonb,
    '[{"type": "notification", "config": {"recipients": ["gerente", "recepcionistas"], "template": "high_no_show_alert"}}, {"type": "auto-fix", "config": {"fix_function": "increase_reminder_frequency"}}]'::jsonb
);