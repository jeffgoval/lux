-- =====================================================
-- SISTEMA DE MÉTRICAS E KPIs
-- Schema completo para armazenamento, agregação e análise de performance
-- =====================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- TABELAS PARA ARMAZENAMENTO DE MÉTRICAS
-- =====================================================

-- Snapshots das métricas (atualizados a cada 5 minutos)
CREATE TABLE metrics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Métricas operacionais
    occupancy_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    daily_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
    cancellation_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    no_show_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    
    -- Métricas de serviço
    avg_service_duration INTEGER DEFAULT 0, -- em minutos
    client_satisfaction NUMERIC(3,1) DEFAULT 0, -- 0-10
    conversion_rate NUMERIC(5,2) DEFAULT 0,
    avg_ticket NUMERIC(8,2) DEFAULT 0,
    
    -- Utilização de recursos
    staff_utilization NUMERIC(5,2) DEFAULT 0,
    peak_hours TEXT[] DEFAULT '{}',
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- KPIs agregados por período (diário, semanal, mensal)
CREATE TABLE kpi_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
    date DATE NOT NULL,
    
    -- Métricas financeiras
    total_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
    growth_rate NUMERIC(5,2) DEFAULT 0,
    retention_rate NUMERIC(5,2) DEFAULT 0,
    
    -- Métricas de agendamentos
    total_appointments INTEGER NOT NULL DEFAULT 0,
    completed_appointments INTEGER NOT NULL DEFAULT 0,
    cancelled_appointments INTEGER NOT NULL DEFAULT 0,
    no_shows INTEGER NOT NULL DEFAULT 0,
    vip_appointments INTEGER NOT NULL DEFAULT 0,
    
    -- Métricas de clientes
    new_clients INTEGER NOT NULL DEFAULT 0,
    returning_clients INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(period, date)
);

-- Alertas do sistema de métricas
CREATE TABLE system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    
    -- Dados contextuais
    data JSONB DEFAULT '{}',
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para metrics_snapshots
CREATE INDEX idx_metrics_snapshots_timestamp ON metrics_snapshots(timestamp DESC);
CREATE INDEX idx_metrics_snapshots_created_at ON metrics_snapshots(created_at DESC);

-- Índices para kpi_metrics
CREATE INDEX idx_kpi_metrics_period_date ON kpi_metrics(period, date DESC);
CREATE INDEX idx_kpi_metrics_date ON kpi_metrics(date DESC);
CREATE INDEX idx_kpi_metrics_updated_at ON kpi_metrics(updated_at DESC);

-- Índices para system_alerts
CREATE INDEX idx_system_alerts_status ON system_alerts(status);
CREATE INDEX idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX idx_system_alerts_created_at ON system_alerts(created_at DESC);
CREATE INDEX idx_system_alerts_type ON system_alerts(type);

-- =====================================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas para visualização (usuários autenticados)
CREATE POLICY "Users can view metrics snapshots" ON metrics_snapshots
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view kpi metrics" ON kpi_metrics
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view system alerts" ON system_alerts
    FOR SELECT USING (auth.role() = 'authenticated');

-- Políticas para inserção (apenas sistema)
CREATE POLICY "System can insert metrics snapshots" ON metrics_snapshots
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "System can manage kpi metrics" ON kpi_metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage system alerts" ON system_alerts
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- DADOS INICIAIS E CONFIGURAÇÕES
-- =====================================================

-- Inserir snapshot inicial (dados de exemplo)
INSERT INTO metrics_snapshots (
    timestamp,
    occupancy_rate,
    daily_revenue,
    cancellation_rate,
    no_show_rate,
    avg_service_duration,
    client_satisfaction,
    conversion_rate,
    avg_ticket,
    staff_utilization,
    peak_hours
) VALUES (
    NOW(),
    75.5,
    1250.00,
    8.2,
    3.1,
    65,
    8.7,
    92.3,
    125.50,
    82.4,
    ARRAY['14:00-15:00', '16:00-17:00', '18:00-19:00']
);

-- Inserir KPIs iniciais para o mês atual
INSERT INTO kpi_metrics (
    period,
    date,
    total_revenue,
    growth_rate,
    retention_rate,
    total_appointments,
    completed_appointments,
    cancelled_appointments,
    no_shows,
    vip_appointments,
    new_clients,
    returning_clients
) VALUES 
(
    'monthly',
    DATE_TRUNC('month', CURRENT_DATE)::DATE,
    15750.00,
    12.5,
    87.3,
    126,
    118,
    6,
    2,
    18,
    23,
    95
),
(
    'weekly',
    DATE_TRUNC('week', CURRENT_DATE)::DATE,
    3250.00,
    8.7,
    89.1,
    28,
    26,
    1,
    1,
    4,
    6,
    20
),
(
    'daily',
    CURRENT_DATE,
    450.00,
    15.2,
    88.5,
    4,
    4,
    0,
    0,
    1,
    1,
    3
);