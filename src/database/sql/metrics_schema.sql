-- =====================================================
-- SISTEMA DE MÉTRICAS E KPIs
-- Schema completo para armazenamento, agregação e análise de performance
-- =====================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- =====================================================
-- TABELAS PARA ARMAZENAMENTO DE MÉTRICAS
-- =====================================================

-- Snapshots das métricas (atualizados a cada 5 minutos)
CREATE TABLE metrics_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
-- VIEWS MATERIALIZADAS PARA PERFORMANCE
-- =====================================================

-- View materializada: Métricas de ocupação
CREATE MATERIALIZED VIEW mv_occupancy_metrics AS
SELECT 
    DATE(a.data_hora) as date,
    COUNT(*) as total_slots,
    COUNT(*) FILTER (WHERE a.status NOT IN ('cancelled', 'no_show')) as occupied_slots,
    ROUND(
        (COUNT(*) FILTER (WHERE a.status NOT IN ('cancelled', 'no_show'))::NUMERIC / 
         NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 
        2
    ) as occupancy_rate,
    AVG(EXTRACT(EPOCH FROM (a.data_fim - a.data_hora))/60) as avg_duration_minutes
FROM agendamentos a
WHERE a.data_hora >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(a.data_hora)
ORDER BY date DESC;

CREATE UNIQUE INDEX ON mv_occupancy_metrics (date);

-- View materializada: Métricas de receita
CREATE MATERIALIZED VIEW mv_revenue_metrics AS
SELECT 
    DATE(p.created_at) as date,
    COUNT(*) as total_payments,
    SUM(p.amount) as total_revenue,
    AVG(p.amount) as avg_ticket,
    COUNT(*) FILTER (WHERE p.payment_method = 'pix') as pix_payments,
    COUNT(*) FILTER (WHERE p.payment_method = 'credit_card') as card_payments,
    SUM(p.amount) FILTER (WHERE p.status = 'completed') as confirmed_revenue
FROM pagamentos p
WHERE p.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(p.created_at)
ORDER BY date DESC;

CREATE UNIQUE INDEX ON mv_revenue_metrics (date);

-- View materializada: Métricas de cancelamentos
CREATE MATERIALIZED VIEW mv_cancellation_metrics AS
SELECT 
    DATE(a.data_hora) as date,
    COUNT(*) as total_appointments,
    COUNT(*) FILTER (WHERE a.status = 'cancelled') as cancelled_count,
    COUNT(*) FILTER (WHERE a.status = 'no_show') as no_show_count,
    COUNT(*) FILTER (WHERE a.status = 'completed') as completed_count,
    ROUND(
        (COUNT(*) FILTER (WHERE a.status = 'cancelled')::NUMERIC / 
         NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 
        2
    ) as cancellation_rate,
    ROUND(
        (COUNT(*) FILTER (WHERE a.status = 'no_show')::NUMERIC / 
         NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 
        2
    ) as no_show_rate
FROM agendamentos a
WHERE a.data_hora >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(a.data_hora)
ORDER BY date DESC;

CREATE UNIQUE INDEX ON mv_cancellation_metrics (date);

-- View materializada: Analytics de clientes
CREATE MATERIALIZED VIEW mv_client_analytics AS
SELECT 
    DATE(c.created_at) as date,
    COUNT(*) as new_clients,
    COUNT(*) FILTER (WHERE c.is_vip = true) as new_vip_clients,
    AVG(
        (SELECT COUNT(*) 
         FROM agendamentos a2 
         WHERE a2.cliente_id = c.id AND a2.status = 'completed')
    ) as avg_appointments_per_client,
    COUNT(*) FILTER (
        WHERE EXISTS (
            SELECT 1 FROM agendamentos a3 
            WHERE a3.cliente_id = c.id 
            AND a3.data_hora > c.created_at + INTERVAL '30 days'
        )
    ) as retained_clients_30d
FROM clientes c
WHERE c.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(c.created_at)
ORDER BY date DESC;

CREATE UNIQUE INDEX ON mv_client_analytics (date);

-- View materializada: Performance da equipe
CREATE MATERIALIZED VIEW mv_staff_performance AS
SELECT 
    DATE(a.data_hora) as date,
    a.funcionario_id,
    COUNT(*) as total_appointments,
    COUNT(*) FILTER (WHERE a.status = 'completed') as completed_appointments,
    AVG(EXTRACT(EPOCH FROM (a.data_fim - a.data_hora))/60) as avg_service_time,
    SUM(p.amount) as total_revenue_generated
FROM agendamentos a
LEFT JOIN pagamentos p ON p.agendamento_id = a.id AND p.status = 'completed'
WHERE a.data_hora >= CURRENT_DATE - INTERVAL '90 days'
  AND a.funcionario_id IS NOT NULL
GROUP BY DATE(a.data_hora), a.funcionario_id
ORDER BY date DESC, funcionario_id;

CREATE UNIQUE INDEX ON mv_staff_performance (date, funcionario_id);

-- View materializada: Métricas de serviços
CREATE MATERIALIZED VIEW mv_service_metrics AS
SELECT 
    DATE(a.data_hora) as date,
    s.id as service_id,
    s.nome as service_name,
    COUNT(*) as total_bookings,
    COUNT(*) FILTER (WHERE a.status = 'completed') as completed_bookings,
    AVG(p.amount) as avg_price,
    SUM(p.amount) FILTER (WHERE p.status = 'completed') as total_revenue,
    AVG(a.duracao_real) as avg_actual_duration,
    AVG(s.duracao) as scheduled_duration
FROM agendamentos a
INNER JOIN servicos s ON s.id = a.servico_id
LEFT JOIN pagamentos p ON p.agendamento_id = a.id
WHERE a.data_hora >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(a.data_hora), s.id, s.nome
ORDER BY date DESC, service_id;

CREATE UNIQUE INDEX ON mv_service_metrics (date, service_id);

-- =====================================================
-- FUNÇÕES PARA ATUALIZAÇÃO DAS VIEWS
-- =====================================================

-- Função para atualizar uma view materializada específica
CREATE OR REPLACE FUNCTION refresh_materialized_view(view_name TEXT)
RETURNS VOID AS $$
BEGIN
    CASE view_name
        WHEN 'mv_occupancy_metrics' THEN
            REFRESH MATERIALIZED VIEW CONCURRENTLY mv_occupancy_metrics;
        WHEN 'mv_revenue_metrics' THEN
            REFRESH MATERIALIZED VIEW CONCURRENTLY mv_revenue_metrics;
        WHEN 'mv_cancellation_metrics' THEN
            REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cancellation_metrics;
        WHEN 'mv_client_analytics' THEN
            REFRESH MATERIALIZED VIEW CONCURRENTLY mv_client_analytics;
        WHEN 'mv_staff_performance' THEN
            REFRESH MATERIALIZED VIEW CONCURRENTLY mv_staff_performance;
        WHEN 'mv_service_metrics' THEN
            REFRESH MATERIALIZED VIEW CONCURRENTLY mv_service_metrics;
        ELSE
            RAISE EXCEPTION 'Unknown materialized view: %', view_name;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar todas as views materializadas
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS VOID AS $$
DECLARE
    view_name TEXT;
    view_names TEXT[] := ARRAY[
        'mv_occupancy_metrics',
        'mv_revenue_metrics',
        'mv_cancellation_metrics',
        'mv_client_analytics',
        'mv_staff_performance',
        'mv_service_metrics'
    ];
BEGIN
    FOREACH view_name IN ARRAY view_names LOOP
        BEGIN
            PERFORM refresh_materialized_view(view_name);
            RAISE NOTICE 'Refreshed materialized view: %', view_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to refresh materialized view %: %', view_name, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÕES PARA CÁLCULO DE MÉTRICAS EM TEMPO REAL
-- =====================================================

-- Função para calcular métricas de hoje
CREATE OR REPLACE FUNCTION get_today_metrics()
RETURNS JSON AS $$
DECLARE
    today_start TIMESTAMP WITH TIME ZONE := CURRENT_DATE;
    today_end TIMESTAMP WITH TIME ZONE := CURRENT_DATE + INTERVAL '1 day';
    result JSON;
BEGIN
    SELECT json_build_object(
        'occupancy_rate', COALESCE(
            (SELECT occupancy_rate FROM mv_occupancy_metrics WHERE date = CURRENT_DATE), 0
        ),
        'daily_revenue', COALESCE(
            (SELECT total_revenue FROM mv_revenue_metrics WHERE date = CURRENT_DATE), 0
        ),
        'cancellation_rate', COALESCE(
            (SELECT cancellation_rate FROM mv_cancellation_metrics WHERE date = CURRENT_DATE), 0
        ),
        'no_show_rate', COALESCE(
            (SELECT no_show_rate FROM mv_cancellation_metrics WHERE date = CURRENT_DATE), 0
        ),
        'total_appointments', COALESCE(
            (SELECT total_appointments FROM mv_cancellation_metrics WHERE date = CURRENT_DATE), 0
        ),
        'new_clients', COALESCE(
            (SELECT new_clients FROM mv_client_analytics WHERE date = CURRENT_DATE), 0
        ),
        'avg_ticket', COALESCE(
            (SELECT avg_ticket FROM mv_revenue_metrics WHERE date = CURRENT_DATE), 0
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular tendências semanais
CREATE OR REPLACE FUNCTION get_weekly_trends()
RETURNS JSON AS $$
DECLARE
    week_start DATE := CURRENT_DATE - INTERVAL '7 days';
    result JSON;
BEGIN
    SELECT json_build_object(
        'revenue_trend', json_agg(
            json_build_object(
                'date', date,
                'revenue', total_revenue
            ) ORDER BY date
        ),
        'occupancy_trend', json_agg(
            json_build_object(
                'date', date,
                'occupancy', occupancy_rate
            ) ORDER BY date
        ),
        'total_revenue', SUM(total_revenue),
        'avg_occupancy', AVG(occupancy_rate),
        'total_appointments', SUM(total_appointments)
    ) INTO result
    FROM (
        SELECT 
            r.date,
            COALESCE(r.total_revenue, 0) as total_revenue,
            COALESCE(o.occupancy_rate, 0) as occupancy_rate,
            COALESCE(c.total_appointments, 0) as total_appointments
        FROM mv_revenue_metrics r
        FULL OUTER JOIN mv_occupancy_metrics o ON r.date = o.date
        FULL OUTER JOIN mv_cancellation_metrics c ON r.date = c.date
        WHERE COALESCE(r.date, o.date, c.date) >= week_start
        ORDER BY COALESCE(r.date, o.date, c.date)
    ) weekly_data;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para comparar períodos
CREATE OR REPLACE FUNCTION compare_periods(
    current_start DATE,
    current_end DATE,
    previous_start DATE,
    previous_end DATE
)
RETURNS JSON AS $$
DECLARE
    current_data RECORD;
    previous_data RECORD;
    result JSON;
BEGIN
    -- Dados do período atual
    SELECT 
        SUM(COALESCE(r.total_revenue, 0)) as total_revenue,
        AVG(COALESCE(o.occupancy_rate, 0)) as avg_occupancy,
        SUM(COALESCE(c.total_appointments, 0)) as total_appointments,
        SUM(COALESCE(ca.new_clients, 0)) as new_clients
    INTO current_data
    FROM generate_series(current_start, current_end, '1 day'::interval) d(date)
    LEFT JOIN mv_revenue_metrics r ON r.date = d.date::date
    LEFT JOIN mv_occupancy_metrics o ON o.date = d.date::date
    LEFT JOIN mv_cancellation_metrics c ON c.date = d.date::date
    LEFT JOIN mv_client_analytics ca ON ca.date = d.date::date;
    
    -- Dados do período anterior
    SELECT 
        SUM(COALESCE(r.total_revenue, 0)) as total_revenue,
        AVG(COALESCE(o.occupancy_rate, 0)) as avg_occupancy,
        SUM(COALESCE(c.total_appointments, 0)) as total_appointments,
        SUM(COALESCE(ca.new_clients, 0)) as new_clients
    INTO previous_data
    FROM generate_series(previous_start, previous_end, '1 day'::interval) d(date)
    LEFT JOIN mv_revenue_metrics r ON r.date = d.date::date
    LEFT JOIN mv_occupancy_metrics o ON o.date = d.date::date
    LEFT JOIN mv_cancellation_metrics c ON c.date = d.date::date
    LEFT JOIN mv_client_analytics ca ON ca.date = d.date::date;
    
    -- Calcular crescimento
    SELECT json_build_object(
        'current', json_build_object(
            'total_revenue', COALESCE(current_data.total_revenue, 0),
            'avg_occupancy', COALESCE(current_data.avg_occupancy, 0),
            'total_appointments', COALESCE(current_data.total_appointments, 0),
            'new_clients', COALESCE(current_data.new_clients, 0)
        ),
        'previous', json_build_object(
            'total_revenue', COALESCE(previous_data.total_revenue, 0),
            'avg_occupancy', COALESCE(previous_data.avg_occupancy, 0),
            'total_appointments', COALESCE(previous_data.total_appointments, 0),
            'new_clients', COALESCE(previous_data.new_clients, 0)
        ),
        'growth', json_build_object(
            'revenue', CASE 
                WHEN COALESCE(previous_data.total_revenue, 0) > 0 
                THEN ROUND(((COALESCE(current_data.total_revenue, 0) - COALESCE(previous_data.total_revenue, 0)) / COALESCE(previous_data.total_revenue, 1)) * 100, 2)
                ELSE 0 
            END,
            'occupancy', CASE 
                WHEN COALESCE(previous_data.avg_occupancy, 0) > 0 
                THEN ROUND(((COALESCE(current_data.avg_occupancy, 0) - COALESCE(previous_data.avg_occupancy, 0)) / COALESCE(previous_data.avg_occupancy, 1)) * 100, 2)
                ELSE 0 
            END,
            'appointments', CASE 
                WHEN COALESCE(previous_data.total_appointments, 0) > 0 
                THEN ROUND(((COALESCE(current_data.total_appointments, 0) - COALESCE(previous_data.total_appointments, 0)) / COALESCE(previous_data.total_appointments, 1)) * 100, 2)
                ELSE 0 
            END,
            'new_clients', CASE 
                WHEN COALESCE(previous_data.new_clients, 0) > 0 
                THEN ROUND(((COALESCE(current_data.new_clients, 0) - COALESCE(previous_data.new_clients, 0)) / COALESCE(previous_data.new_clients, 1)) * 100, 2)
                ELSE 0 
            END
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS E AUTOMAÇÕES
-- =====================================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kpi_metrics_updated_at
    BEFORE UPDATE ON kpi_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para metrics_snapshots
CREATE INDEX idx_metrics_snapshots_timestamp ON metrics_snapshots(timestamp DESC);
CREATE INDEX idx_metrics_snapshots_created_at ON metrics_snapshots(created_at DESC);
CREATE INDEX idx_metrics_snapshots_date ON metrics_snapshots(DATE(timestamp));

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
-- CONFIGURAÇÃO DE CRON JOBS (pg_cron)
-- =====================================================

-- Atualizar views materializadas a cada 15 minutos
SELECT cron.schedule(
    'refresh-materialized-views',
    '*/15 * * * *',
    'SELECT refresh_all_materialized_views();'
);

-- Limpar dados antigos (executar diariamente às 2h da manhã)
SELECT cron.schedule(
    'cleanup-old-metrics',
    '0 2 * * *',
    $$
    DELETE FROM metrics_snapshots WHERE created_at < NOW() - INTERVAL '90 days';
    DELETE FROM system_alerts WHERE created_at < NOW() - INTERVAL '30 days' AND status = 'resolved';
    $$
);

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

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE metrics_snapshots IS 'Snapshots das métricas coletados a cada 5 minutos para análise em tempo real';
COMMENT ON TABLE kpi_metrics IS 'KPIs agregados por período (diário, semanal, mensal) para análise de tendências';
COMMENT ON TABLE system_alerts IS 'Alertas gerados automaticamente pelo sistema de monitoramento';

COMMENT ON MATERIALIZED VIEW mv_occupancy_metrics IS 'View materializada com métricas de ocupação agregadas por dia';
COMMENT ON MATERIALIZED VIEW mv_revenue_metrics IS 'View materializada com métricas de receita agregadas por dia';
COMMENT ON MATERIALIZED VIEW mv_cancellation_metrics IS 'View materializada com métricas de cancelamento agregadas por dia';

COMMENT ON FUNCTION refresh_materialized_view(TEXT) IS 'Função para atualizar uma view materializada específica';
COMMENT ON FUNCTION get_today_metrics() IS 'Função para obter métricas do dia atual';
COMMENT ON FUNCTION compare_periods(DATE, DATE, DATE, DATE) IS 'Função para comparar métricas entre dois períodos';

-- Mensagem de conclusão
DO $$ 
BEGIN 
    RAISE NOTICE '=== SISTEMA DE MÉTRICAS E KPIs INSTALADO COM SUCESSO ===';
    RAISE NOTICE 'Componentes criados:';
    RAISE NOTICE '- 3 tabelas principais para armazenamento';
    RAISE NOTICE '- 6 views materializadas otimizadas';
    RAISE NOTICE '- 5 funções para cálculos em tempo real';
    RAISE NOTICE '- 2 cron jobs para automação';
    RAISE NOTICE '- Índices e políticas RLS configurados';
    RAISE NOTICE '- Dados de exemplo inseridos';
    RAISE NOTICE '=== READY FOR METRICS COLLECTION ===';
END $$;