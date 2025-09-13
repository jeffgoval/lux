-- =====================================================
-- NOTIFICATION SYSTEM - SCHEMA E TRIGGERS
-- Sistema completo de notificações multi-canal
-- =====================================================

-- 1. Criar ENUMs para notificações
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_priority') THEN
        CREATE TYPE public.notification_priority AS ENUM (
            'low', 'normal', 'high', 'urgent', 'critical'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
        CREATE TYPE public.notification_status AS ENUM (
            'scheduled', 'processing', 'sent', 'delivered', 'read', 'failed', 'cancelled'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel') THEN
        CREATE TYPE public.notification_channel AS ENUM (
            'whatsapp', 'sms', 'email', 'push'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'template_category') THEN
        CREATE TYPE public.template_category AS ENUM (
            'appointment', 'reminder', 'confirmation', 'marketing', 'alert', 'vip'
        );
    END IF;
END $$;

-- 2. Tabela principal de notificações
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id TEXT NOT NULL,
    priority notification_priority NOT NULL DEFAULT 'normal',
    status notification_status NOT NULL DEFAULT 'processing',
    
    -- Agendamento
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    
    -- Contexto da notificação
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Controle de tentativas
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    last_retry_at TIMESTAMPTZ,
    
    -- Custo total
    total_cost DECIMAL(10,4) DEFAULT 0,
    
    -- Auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 3. Tabela de entregas por canal
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    
    channel notification_channel NOT NULL,
    recipient TEXT NOT NULL, -- telefone, email, device token
    
    -- Status da entrega
    success BOOLEAN NOT NULL DEFAULT FALSE,
    status notification_status NOT NULL DEFAULT 'processing',
    
    -- Timestamps de rastreamento
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    
    -- Informações do provedor
    external_id TEXT, -- ID do provedor (WhatsApp, Twilio, etc.)
    provider_response JSONB,
    
    -- Erro e custo
    error_message TEXT,
    error_code TEXT,
    cost DECIMAL(10,4) DEFAULT 0,
    
    -- Auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabela de templates de notificação
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category template_category NOT NULL,
    description TEXT,
    
    -- Configuração por canal
    whatsapp_config JSONB,
    sms_config JSONB,
    email_config JSONB,
    push_config JSONB,
    
    -- Variáveis do template
    variables TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Filtros de cliente
    client_categories TEXT[],
    
    -- Estado
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 5. Tabela de preferências de notificação por cliente
CREATE TABLE IF NOT EXISTS public.client_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Preferências por canal
    whatsapp_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    
    -- Contatos
    whatsapp_number TEXT,
    sms_number TEXT,
    email_address TEXT,
    push_token TEXT,
    
    -- Preferências por tipo
    appointment_notifications BOOLEAN DEFAULT TRUE,
    reminder_notifications BOOLEAN DEFAULT TRUE,
    marketing_notifications BOOLEAN DEFAULT FALSE,
    
    -- Horários preferidos
    preferred_hours_start TIME DEFAULT '08:00',
    preferred_hours_end TIME DEFAULT '20:00',
    
    -- Auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT client_preferences_unique UNIQUE (client_id)
);

-- 6. View para estatísticas de entrega
CREATE OR REPLACE VIEW public.vw_notification_stats AS
WITH delivery_stats AS (
    SELECT 
        n.template_id,
        n.priority,
        DATE_TRUNC('day', n.created_at) as date,
        COUNT(*) as total_notifications,
        COUNT(*) FILTER (WHERE n.status = 'sent') as sent_notifications,
        COUNT(*) FILTER (WHERE n.status = 'delivered') as delivered_notifications,
        COUNT(*) FILTER (WHERE n.status = 'read') as read_notifications,
        COUNT(*) FILTER (WHERE n.status = 'failed') as failed_notifications,
        SUM(n.total_cost) as total_cost,
        AVG(EXTRACT(EPOCH FROM (n.sent_at - n.created_at))) as avg_send_time_seconds
    FROM public.notifications n
    WHERE n.created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY n.template_id, n.priority, DATE_TRUNC('day', n.created_at)
),
channel_stats AS (
    SELECT 
        nd.channel,
        DATE_TRUNC('day', nd.created_at) as date,
        COUNT(*) as total_deliveries,
        COUNT(*) FILTER (WHERE nd.success = TRUE) as successful_deliveries,
        COUNT(*) FILTER (WHERE nd.delivered_at IS NOT NULL) as delivered_count,
        COUNT(*) FILTER (WHERE nd.read_at IS NOT NULL) as read_count,
        SUM(nd.cost) as channel_cost,
        AVG(EXTRACT(EPOCH FROM (nd.delivered_at - nd.sent_at))) as avg_delivery_time_seconds
    FROM public.notification_deliveries nd
    WHERE nd.created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY nd.channel, DATE_TRUNC('day', nd.created_at)
)
SELECT 
    ds.*,
    ROUND((ds.delivered_notifications::NUMERIC / NULLIF(ds.sent_notifications, 0) * 100), 2) as delivery_rate_pct,
    ROUND((ds.read_notifications::NUMERIC / NULLIF(ds.delivered_notifications, 0) * 100), 2) as read_rate_pct,
    ROUND((ds.failed_notifications::NUMERIC / NULLIF(ds.total_notifications, 0) * 100), 2) as failure_rate_pct
FROM delivery_stats ds;

-- 7. Função para agendar notificação
CREATE OR REPLACE FUNCTION public.schedule_notification(
    p_recipient_id UUID,
    p_template_id TEXT,
    p_context JSONB,
    p_scheduled_for TIMESTAMPTZ DEFAULT NULL,
    p_priority notification_priority DEFAULT 'normal',
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
    v_client_prefs RECORD;
BEGIN
    -- Buscar preferências do cliente
    SELECT * INTO v_client_prefs
    FROM public.client_notification_preferences
    WHERE client_id = p_recipient_id;
    
    -- Se não existe, criar preferências padrão
    IF v_client_prefs IS NULL THEN
        INSERT INTO public.client_notification_preferences (client_id)
        VALUES (p_recipient_id);
    END IF;
    
    -- Criar notificação
    INSERT INTO public.notifications (
        recipient_id,
        template_id,
        priority,
        context,
        metadata,
        scheduled_for,
        status
    ) VALUES (
        p_recipient_id,
        p_template_id,
        p_priority,
        p_context,
        p_metadata,
        p_scheduled_for,
        CASE WHEN p_scheduled_for IS NULL OR p_scheduled_for <= NOW() 
             THEN 'processing' 
             ELSE 'scheduled' 
        END
    )
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;

-- 8. Função para processar fila de notificações agendadas
CREATE OR REPLACE FUNCTION public.process_scheduled_notifications()
RETURNS TABLE (
    processed_count INTEGER,
    failed_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification RECORD;
    v_processed INTEGER := 0;
    v_failed INTEGER := 0;
BEGIN
    -- Buscar notificações que devem ser enviadas
    FOR v_notification IN
        SELECT id, recipient_id, template_id, context, metadata, priority
        FROM public.notifications
        WHERE status = 'scheduled'
          AND scheduled_for <= NOW()
          AND retry_count < max_retries
        ORDER BY priority DESC, scheduled_for ASC
        LIMIT 100 -- Processar em lotes
    LOOP
        BEGIN
            -- Marcar como processando
            UPDATE public.notifications
            SET status = 'processing', updated_at = NOW()
            WHERE id = v_notification.id;
            
            -- TODO: Aqui integraria com o NotificationEngine
            -- Por enquanto, apenas simular sucesso
            UPDATE public.notifications
            SET status = 'sent', sent_at = NOW(), updated_at = NOW()
            WHERE id = v_notification.id;
            
            v_processed := v_processed + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- Marcar como falha e incrementar retry
            UPDATE public.notifications
            SET 
                status = 'failed',
                retry_count = retry_count + 1,
                last_retry_at = NOW(),
                updated_at = NOW()
            WHERE id = v_notification.id;
            
            v_failed := v_failed + 1;
        END;
    END LOOP;
    
    RETURN QUERY SELECT v_processed, v_failed;
END;
$$;

-- 9. Trigger para atualizar timestamp de updated_at
CREATE OR REPLACE FUNCTION public.update_notification_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Criar triggers
DROP TRIGGER IF EXISTS trigger_notifications_updated_at ON public.notifications;
CREATE TRIGGER trigger_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_notification_timestamp();

DROP TRIGGER IF EXISTS trigger_deliveries_updated_at ON public.notification_deliveries;
CREATE TRIGGER trigger_deliveries_updated_at
    BEFORE UPDATE ON public.notification_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_notification_timestamp();

-- 10. Trigger para calcular custo total
CREATE OR REPLACE FUNCTION public.calculate_notification_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_cost DECIMAL(10,4);
BEGIN
    -- Calcular custo total das entregas
    SELECT COALESCE(SUM(cost), 0)
    INTO v_total_cost
    FROM public.notification_deliveries
    WHERE notification_id = COALESCE(NEW.notification_id, OLD.notification_id);
    
    -- Atualizar custo na notificação principal
    UPDATE public.notifications
    SET total_cost = v_total_cost, updated_at = NOW()
    WHERE id = COALESCE(NEW.notification_id, OLD.notification_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger para recalcular custo quando delivery é inserida/atualizada
DROP TRIGGER IF EXISTS trigger_recalculate_cost ON public.notification_deliveries;
CREATE TRIGGER trigger_recalculate_cost
    AFTER INSERT OR UPDATE OR DELETE ON public.notification_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_notification_cost();

-- 11. Função para obter estatísticas de entrega
CREATE OR REPLACE FUNCTION public.get_notification_performance(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_template_id TEXT DEFAULT NULL,
    p_channel notification_channel DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB := '{}'::jsonb;
    v_overall_stats JSONB;
    v_channel_breakdown JSONB;
    v_template_breakdown JSONB;
BEGIN
    -- Estatísticas gerais
    SELECT jsonb_build_object(
        'total_notifications', COUNT(*),
        'sent_notifications', COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'read')),
        'delivered_notifications', COUNT(*) FILTER (WHERE status IN ('delivered', 'read')),
        'read_notifications', COUNT(*) FILTER (WHERE status = 'read'),
        'failed_notifications', COUNT(*) FILTER (WHERE status = 'failed'),
        'total_cost', COALESCE(SUM(total_cost), 0),
        'delivery_rate_pct', ROUND(
            COUNT(*) FILTER (WHERE status IN ('delivered', 'read'))::NUMERIC / 
            NULLIF(COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'read')), 0) * 100, 2
        ),
        'read_rate_pct', ROUND(
            COUNT(*) FILTER (WHERE status = 'read')::NUMERIC / 
            NULLIF(COUNT(*) FILTER (WHERE status IN ('delivered', 'read')), 0) * 100, 2
        )
    ) INTO v_overall_stats
    FROM public.notifications n
    WHERE DATE(n.created_at) BETWEEN p_start_date AND p_end_date
      AND (p_template_id IS NULL OR n.template_id = p_template_id);
    
    -- Breakdown por canal
    SELECT jsonb_object_agg(
        nd.channel,
        jsonb_build_object(
            'total_deliveries', COUNT(*),
            'successful_deliveries', COUNT(*) FILTER (WHERE nd.success = TRUE),
            'total_cost', COALESCE(SUM(nd.cost), 0),
            'avg_delivery_time_seconds', 
            ROUND(AVG(EXTRACT(EPOCH FROM (nd.delivered_at - nd.sent_at))), 2)
        )
    ) INTO v_channel_breakdown
    FROM public.notification_deliveries nd
    JOIN public.notifications n ON n.id = nd.notification_id
    WHERE DATE(nd.created_at) BETWEEN p_start_date AND p_end_date
      AND (p_channel IS NULL OR nd.channel = p_channel)
      AND (p_template_id IS NULL OR n.template_id = p_template_id)
    GROUP BY nd.channel;
    
    -- Breakdown por template
    SELECT jsonb_object_agg(
        n.template_id,
        jsonb_build_object(
            'total_notifications', COUNT(*),
            'delivery_rate_pct', ROUND(
                COUNT(*) FILTER (WHERE n.status IN ('delivered', 'read'))::NUMERIC / 
                NULLIF(COUNT(*), 0) * 100, 2
            ),
            'total_cost', COALESCE(SUM(n.total_cost), 0)
        )
    ) INTO v_template_breakdown
    FROM public.notifications n
    WHERE DATE(n.created_at) BETWEEN p_start_date AND p_end_date
      AND (p_template_id IS NULL OR n.template_id = p_template_id)
    GROUP BY n.template_id;
    
    -- Montar resultado final
    v_result := jsonb_build_object(
        'period', jsonb_build_object(
            'start_date', p_start_date,
            'end_date', p_end_date
        ),
        'overall', v_overall_stats,
        'by_channel', COALESCE(v_channel_breakdown, '{}'::jsonb),
        'by_template', COALESCE(v_template_breakdown, '{}'::jsonb),
        'generated_at', NOW()
    );
    
    RETURN v_result;
END;
$$;

-- 12. Inserir templates padrão
INSERT INTO public.notification_templates (
    id, name, category, description, variables, client_categories, active
) VALUES 
(
    'appointment_confirmation',
    'Confirmação de Agendamento',
    'confirmation',
    'Template para confirmação automática de agendamentos',
    ARRAY['clienteNome', 'servico', 'dataHoraFormatada', 'profissional', 'valor'],
    NULL,
    TRUE
),
(
    'appointment_reminder_24h',
    'Lembrete 24h',
    'reminder',
    'Lembrete enviado 24h antes do agendamento',
    ARRAY['clienteNome', 'servico', 'dataAgendamento', 'horaFormatada'],
    NULL,
    TRUE
),
(
    'vip_special_treatment',
    'Tratamento VIP Especial',
    'vip',
    'Notificação especial para clientes VIP/Premium/Diamond',
    ARRAY['clienteNome', 'servico', 'dataAgendamento'],
    ARRAY['vip', 'premium', 'diamond'],
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- 13. Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_status 
    ON public.notifications(recipient_id, status);

CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for 
    ON public.notifications(scheduled_for) 
    WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_notifications_template_created 
    ON public.notifications(template_id, created_at);

CREATE INDEX IF NOT EXISTS idx_deliveries_notification_channel 
    ON public.notification_deliveries(notification_id, channel);

CREATE INDEX IF NOT EXISTS idx_deliveries_created_status 
    ON public.notification_deliveries(created_at, status);

CREATE INDEX IF NOT EXISTS idx_client_preferences_client 
    ON public.client_notification_preferences(client_id);

-- 14. Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notification_preferences ENABLE ROW LEVEL SECURITY;

-- 15. Políticas RLS
-- Notifications: usuários podem ver suas próprias notificações
CREATE POLICY "notifications_view_own" ON public.notifications
    FOR SELECT USING (recipient_id = auth.uid());

-- Staff pode ver todas as notificações
CREATE POLICY "notifications_view_staff" ON public.notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() 
              AND ur.role IN ('proprietaria', 'gerente', 'profissionais')
              AND ur.ativo = TRUE
        )
    );

-- Deliveries: mesmas regras das notifications
CREATE POLICY "deliveries_view_own" ON public.notification_deliveries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.notifications n
            WHERE n.id = notification_id AND n.recipient_id = auth.uid()
        )
    );

CREATE POLICY "deliveries_view_staff" ON public.notification_deliveries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() 
              AND ur.role IN ('proprietaria', 'gerente', 'profissionais')
              AND ur.ativo = TRUE
        )
    );

-- Templates: todos podem ler templates ativos
CREATE POLICY "templates_read_active" ON public.notification_templates
    FOR SELECT USING (active = TRUE);

-- Preferências: usuários podem gerenciar suas próprias preferências
CREATE POLICY "preferences_manage_own" ON public.client_notification_preferences
    FOR ALL USING (client_id = auth.uid())
    WITH CHECK (client_id = auth.uid());

-- 16. Comentários para documentação
COMMENT ON TABLE public.notifications IS 'Notificações multi-canal com agendamento';
COMMENT ON TABLE public.notification_deliveries IS 'Log de entregas por canal específico';
COMMENT ON TABLE public.notification_templates IS 'Templates de notificação configuráveis';
COMMENT ON TABLE public.client_notification_preferences IS 'Preferências de notificação por cliente';
COMMENT ON FUNCTION public.schedule_notification IS 'Agenda uma notificação para envio';
COMMENT ON FUNCTION public.process_scheduled_notifications IS 'Processa fila de notificações agendadas';
COMMENT ON FUNCTION public.get_notification_performance IS 'Retorna estatísticas de performance das notificações';

-- Log de instalação
DO $$
BEGIN
    RAISE NOTICE 'Sistema de Notificações instalado com sucesso!';
    RAISE NOTICE 'Tabelas: notifications, notification_deliveries, notification_templates, client_notification_preferences';
    RAISE NOTICE 'Views: vw_notification_stats';
    RAISE NOTICE 'Funções: schedule_notification(), process_scheduled_notifications(), get_notification_performance()';
    RAISE NOTICE 'Para estatísticas: SELECT * FROM public.get_notification_performance();';
END $$;