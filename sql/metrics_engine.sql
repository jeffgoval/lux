-- =====================================================
-- METRICS ENGINE - SISTEMA DE MÉTRICAS E KPIs
-- Views materializadas e funções para análise de performance
-- =====================================================

-- 1. View materializada para ocupação por profissional
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_ocupacao_profissional AS
WITH ocupacao_dados AS (
  SELECT 
    p.id as profissional_id,
    p.nome as profissional_nome,
    pr.nome_completo as usuario_nome,
    DATE_TRUNC('day', a.data_agendamento) as data,
    COUNT(*) as total_agendamentos,
    COUNT(*) FILTER (WHERE a.status = 'confirmado') as agendamentos_confirmados,
    COUNT(*) FILTER (WHERE a.status = 'finalizado') as agendamentos_finalizados,
    COUNT(*) FILTER (WHERE a.status = 'cancelado') as agendamentos_cancelados,
    COUNT(*) FILTER (WHERE a.status = 'nao_compareceu') as no_shows,
    SUM(a.duracao_minutos) as minutos_agendados,
    SUM(a.duracao_minutos) FILTER (WHERE a.status = 'finalizado') as minutos_efetivos,
    SUM(a.valor_final) as receita_agendada,
    SUM(a.valor_final) FILTER (WHERE a.status = 'finalizado') as receita_efetiva,
    AVG(a.valor_final) as ticket_medio
  FROM public.profissionais p
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  LEFT JOIN public.agendamentos a ON a.profissional_id = p.id
  WHERE a.data_agendamento >= CURRENT_DATE - INTERVAL '90 days'
    AND p.ativo = TRUE
  GROUP BY p.id, p.nome, pr.nome_completo, DATE_TRUNC('day', a.data_agendamento)
)
SELECT 
  *,
  CASE 
    WHEN minutos_agendados > 0 THEN 
      ROUND((minutos_efetivos::NUMERIC / minutos_agendados::NUMERIC) * 100, 2)
    ELSE 0 
  END as taxa_ocupacao_efetiva,
  CASE 
    WHEN total_agendamentos > 0 THEN 
      ROUND((no_shows::NUMERIC / total_agendamentos::NUMERIC) * 100, 2)
    ELSE 0 
  END as taxa_no_show,
  CASE 
    WHEN agendamentos_confirmados > 0 THEN 
      ROUND((agendamentos_cancelados::NUMERIC / agendamentos_confirmados::NUMERIC) * 100, 2)
    ELSE 0 
  END as taxa_cancelamento,
  CURRENT_TIMESTAMP as calculado_em
FROM ocupacao_dados;

-- 2. View materializada para receita por período
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_receita_periodo AS
WITH receita_base AS (
  SELECT 
    DATE_TRUNC('day', a.data_agendamento) as data,
    DATE_TRUNC('week', a.data_agendamento) as semana,
    DATE_TRUNC('month', a.data_agendamento) as mes,
    c.categoria as categoria_cliente,
    s.nome as servico_nome,
    s.categoria as servico_categoria,
    COUNT(*) as total_agendamentos,
    COUNT(*) FILTER (WHERE a.status = 'finalizado') as agendamentos_finalizados,
    SUM(a.valor_final) as receita_agendada,
    SUM(a.valor_final) FILTER (WHERE a.status = 'finalizado') as receita_efetiva,
    SUM(a.desconto_aplicado) as descontos_concedidos,
    AVG(a.valor_final) as ticket_medio,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY a.valor_final) as ticket_mediano
  FROM public.agendamentos a
  JOIN public.clientes c ON c.id = a.cliente_id
  JOIN public.servicos s ON s.id = a.servico_id
  WHERE a.data_agendamento >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY 
    DATE_TRUNC('day', a.data_agendamento),
    DATE_TRUNC('week', a.data_agendamento),
    DATE_TRUNC('month', a.data_agendamento),
    c.categoria,
    s.nome,
    s.categoria
),
crescimento_base AS (
  SELECT *,
    LAG(receita_efetiva, 1) OVER (
      PARTITION BY categoria_cliente, servico_categoria 
      ORDER BY data
    ) as receita_periodo_anterior,
    LAG(receita_efetiva, 30) OVER (
      PARTITION BY categoria_cliente, servico_categoria 
      ORDER BY data
    ) as receita_mes_anterior
  FROM receita_base
)
SELECT *,
  CASE 
    WHEN receita_periodo_anterior > 0 THEN
      ROUND(((receita_efetiva - receita_periodo_anterior) / receita_periodo_anterior * 100), 2)
    ELSE NULL
  END as crescimento_diario_pct,
  CASE 
    WHEN receita_mes_anterior > 0 THEN
      ROUND(((receita_efetiva - receita_mes_anterior) / receita_mes_anterior * 100), 2)
    ELSE NULL
  END as crescimento_mensal_pct,
  CURRENT_TIMESTAMP as calculado_em
FROM crescimento_base;

-- 3. View materializada para análise de cancelamentos
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_analise_cancelamentos AS
WITH cancelamentos_detalhado AS (
  SELECT 
    DATE_TRUNC('day', a.data_agendamento) as data,
    DATE_TRUNC('hour', a.created_at) as hora_agendamento,
    a.profissional_id,
    a.servico_id,
    c.categoria as categoria_cliente,
    EXTRACT(EPOCH FROM (a.updated_at - a.created_at)) / 3600.0 as horas_ate_cancelamento,
    EXTRACT(EPOCH FROM (a.data_agendamento - a.updated_at)) / 3600.0 as horas_antecedencia,
    a.valor_final,
    CASE 
      WHEN EXTRACT(DOW FROM a.data_agendamento) IN (0, 6) THEN 'fim_semana'
      ELSE 'dia_util'
    END as tipo_dia,
    CASE 
      WHEN EXTRACT(HOUR FROM a.data_agendamento) BETWEEN 8 AND 12 THEN 'manha'
      WHEN EXTRACT(HOUR FROM a.data_agendamento) BETWEEN 13 AND 17 THEN 'tarde'
      WHEN EXTRACT(HOUR FROM a.data_agendamento) BETWEEN 18 AND 21 THEN 'noite'
      ELSE 'fora_horario'
    END as periodo_dia
  FROM public.agendamentos a
  JOIN public.clientes c ON c.id = a.cliente_id
  WHERE a.status = 'cancelado'
    AND a.data_agendamento >= CURRENT_DATE - INTERVAL '6 months'
),
padroes_cancelamento AS (
  SELECT 
    data,
    profissional_id,
    categoria_cliente,
    tipo_dia,
    periodo_dia,
    COUNT(*) as total_cancelamentos,
    AVG(horas_ate_cancelamento) as media_horas_ate_cancelamento,
    AVG(horas_antecedencia) as media_horas_antecedencia,
    AVG(valor_final) as valor_medio_cancelado,
    STDDEV(valor_final) as desvio_valor,
    COUNT(*) FILTER (WHERE horas_antecedencia < 24) as cancelamentos_ultima_hora,
    COUNT(*) FILTER (WHERE horas_antecedencia < 2) as cancelamentos_emergencia
  FROM cancelamentos_detalhado
  GROUP BY data, profissional_id, categoria_cliente, tipo_dia, periodo_dia
)
SELECT *,
  CASE 
    WHEN total_cancelamentos > 0 THEN
      ROUND((cancelamentos_ultima_hora::NUMERIC / total_cancelamentos::NUMERIC) * 100, 2)
    ELSE 0
  END as taxa_cancelamento_ultima_hora,
  CASE 
    WHEN total_cancelamentos > 0 THEN
      ROUND((cancelamentos_emergencia::NUMERIC / total_cancelamentos::NUMERIC) * 100, 2)
    ELSE 0
  END as taxa_cancelamento_emergencia,
  CURRENT_TIMESTAMP as calculado_em
FROM padroes_cancelamento;

-- 4. View materializada para análise de clientes
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_analise_clientes AS
WITH cliente_metricas AS (
  SELECT 
    c.id as cliente_id,
    c.nome,
    c.categoria,
    c.created_at as data_cadastro,
    COUNT(a.id) as total_agendamentos,
    COUNT(a.id) FILTER (WHERE a.status = 'finalizado') as agendamentos_finalizados,
    COUNT(a.id) FILTER (WHERE a.status = 'cancelado') as agendamentos_cancelados,
    COUNT(a.id) FILTER (WHERE a.status = 'nao_compareceu') as no_shows,
    MIN(a.data_agendamento) as primeiro_agendamento,
    MAX(a.data_agendamento) as ultimo_agendamento,
    SUM(a.valor_final) FILTER (WHERE a.status = 'finalizado') as receita_total,
    AVG(a.valor_final) as ticket_medio,
    COUNT(DISTINCT a.servico_id) as variedade_servicos,
    COUNT(DISTINCT a.profissional_id) as profissionais_diferentes,
    AVG(EXTRACT(EPOCH FROM (a.data_agendamento - a.created_at)) / 86400.0) as media_dias_antecedencia
  FROM public.clientes c
  LEFT JOIN public.agendamentos a ON a.cliente_id = c.id
  WHERE c.ativo = TRUE
  GROUP BY c.id, c.nome, c.categoria, c.created_at
),
cliente_classificacao AS (
  SELECT *,
    CASE 
      WHEN ultimo_agendamento IS NULL THEN 'sem_agendamento'
      WHEN ultimo_agendamento >= CURRENT_DATE - INTERVAL '30 days' THEN 'ativo'
      WHEN ultimo_agendamento >= CURRENT_DATE - INTERVAL '90 days' THEN 'dormindo'
      WHEN ultimo_agendamento >= CURRENT_DATE - INTERVAL '180 days' THEN 'inativo'
      ELSE 'perdido'
    END as status_cliente,
    CASE 
      WHEN total_agendamentos >= 12 AND receita_total >= 5000 THEN 'alto_valor'
      WHEN total_agendamentos >= 6 AND receita_total >= 2000 THEN 'medio_valor'
      WHEN total_agendamentos >= 3 THEN 'baixo_valor'
      ELSE 'novo'
    END as segmento_valor,
    CASE 
      WHEN ultimo_agendamento IS NOT NULL THEN
        EXTRACT(EPOCH FROM (ultimo_agendamento - primeiro_agendamento)) / 86400.0
      ELSE NULL
    END as ciclo_vida_dias
  FROM cliente_metricas
)
SELECT *,
  CASE 
    WHEN total_agendamentos > 0 THEN
      ROUND((no_shows::NUMERIC / total_agendamentos::NUMERIC) * 100, 2)
    ELSE 0
  END as taxa_no_show,
  CASE 
    WHEN total_agendamentos > 0 THEN
      ROUND((agendamentos_cancelados::NUMERIC / total_agendamentos::NUMERIC) * 100, 2)
    ELSE 0
  END as taxa_cancelamento,
  CASE 
    WHEN ciclo_vida_dias > 0 AND agendamentos_finalizados > 0 THEN
      ROUND(ciclo_vida_dias / agendamentos_finalizados, 1)
    ELSE NULL
  END as frequencia_media_dias,
  CURRENT_TIMESTAMP as calculado_em
FROM cliente_classificacao;

-- 5. View para KPIs em tempo real
CREATE OR REPLACE VIEW public.vw_kpis_tempo_real AS
WITH dados_hoje AS (
  SELECT 
    COUNT(*) as agendamentos_hoje,
    COUNT(*) FILTER (WHERE status = 'confirmado') as confirmados_hoje,
    COUNT(*) FILTER (WHERE status = 'finalizado') as finalizados_hoje,
    COUNT(*) FILTER (WHERE status = 'cancelado') as cancelados_hoje,
    SUM(valor_final) as receita_agendada_hoje,
    SUM(valor_final) FILTER (WHERE status = 'finalizado') as receita_efetiva_hoje
  FROM public.agendamentos
  WHERE DATE(data_agendamento) = CURRENT_DATE
),
dados_mes AS (
  SELECT 
    COUNT(*) as agendamentos_mes,
    COUNT(*) FILTER (WHERE status = 'finalizado') as finalizados_mes,
    SUM(valor_final) FILTER (WHERE status = 'finalizado') as receita_mes
  FROM public.agendamentos
  WHERE DATE_TRUNC('month', data_agendamento) = DATE_TRUNC('month', CURRENT_DATE)
),
metas AS (
  SELECT 
    50 as meta_agendamentos_dia, -- configurável
    30000 as meta_receita_mes    -- configurável
)
SELECT 
  h.*,
  m.agendamentos_mes,
  m.finalizados_mes,
  m.receita_mes,
  mt.meta_agendamentos_dia,
  mt.meta_receita_mes,
  ROUND((h.agendamentos_hoje::NUMERIC / mt.meta_agendamentos_dia::NUMERIC) * 100, 1) as progresso_meta_dia_pct,
  ROUND((m.receita_mes::NUMERIC / mt.meta_receita_mes::NUMERIC) * 100, 1) as progresso_meta_mes_pct,
  CASE 
    WHEN h.agendamentos_hoje > 0 THEN
      ROUND((h.cancelados_hoje::NUMERIC / h.agendamentos_hoje::NUMERIC) * 100, 2)
    ELSE 0
  END as taxa_cancelamento_hoje,
  CURRENT_TIMESTAMP as calculado_em
FROM dados_hoje h
CROSS JOIN dados_mes m
CROSS JOIN metas mt;

-- 6. Função para atualizar todas as views materializadas
CREATE OR REPLACE FUNCTION public.atualizar_metricas()
RETURNS TABLE (
  view_name TEXT,
  status TEXT,
  rows_affected BIGINT,
  duracao_ms BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
  v_rows BIGINT;
BEGIN
  -- Ocupação por profissional
  v_start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW public.mv_ocupacao_profissional;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_end_time := clock_timestamp();
  
  RETURN QUERY SELECT 
    'mv_ocupacao_profissional'::TEXT,
    'success'::TEXT,
    v_rows,
    EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::BIGINT;

  -- Receita por período
  v_start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW public.mv_receita_periodo;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_end_time := clock_timestamp();
  
  RETURN QUERY SELECT 
    'mv_receita_periodo'::TEXT,
    'success'::TEXT,
    v_rows,
    EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::BIGINT;

  -- Análise de cancelamentos
  v_start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW public.mv_analise_cancelamentos;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_end_time := clock_timestamp();
  
  RETURN QUERY SELECT 
    'mv_analise_cancelamentos'::TEXT,
    'success'::TEXT,
    v_rows,
    EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::BIGINT;

  -- Análise de clientes
  v_start_time := clock_timestamp();
  REFRESH MATERIALIZED VIEW public.mv_analise_clientes;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_end_time := clock_timestamp();
  
  RETURN QUERY SELECT 
    'mv_analise_clientes'::TEXT,
    'success'::TEXT,
    v_rows,
    EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::BIGINT;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 
    'error'::TEXT,
    SQLERRM::TEXT,
    0::BIGINT,
    0::BIGINT;
END;
$$;

-- 7. Função para obter métricas de dashboard
CREATE OR REPLACE FUNCTION public.obter_metricas_dashboard(
  p_data_inicio DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_data_fim DATE DEFAULT CURRENT_DATE,
  p_profissional_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resultado JSONB := '{}'::jsonb;
  v_ocupacao JSONB;
  v_receita JSONB;
  v_cancelamentos JSONB;
  v_kpis JSONB;
BEGIN
  -- KPIs gerais
  SELECT jsonb_build_object(
    'agendamentos_hoje', agendamentos_hoje,
    'receita_efetiva_hoje', receita_efetiva_hoje,
    'taxa_cancelamento_hoje', taxa_cancelamento_hoje,
    'progresso_meta_mes', progresso_meta_mes_pct,
    'calculado_em', calculado_em
  ) INTO v_kpis
  FROM public.vw_kpis_tempo_real;

  -- Métricas de ocupação
  SELECT jsonb_agg(
    jsonb_build_object(
      'data', data,
      'profissional', profissional_nome,
      'taxa_ocupacao', taxa_ocupacao_efetiva,
      'receita_efetiva', receita_efetiva,
      'total_agendamentos', total_agendamentos
    )
  ) INTO v_ocupacao
  FROM public.mv_ocupacao_profissional
  WHERE data BETWEEN p_data_inicio AND p_data_fim
    AND (p_profissional_id IS NULL OR profissional_id = p_profissional_id)
  ORDER BY data DESC, taxa_ocupacao_efetiva DESC
  LIMIT 100;

  -- Métricas de receita
  SELECT jsonb_agg(
    jsonb_build_object(
      'data', data,
      'receita_efetiva', receita_efetiva,
      'ticket_medio', ticket_medio,
      'crescimento_diario', crescimento_diario_pct,
      'categoria_cliente', categoria_cliente
    )
  ) INTO v_receita
  FROM public.mv_receita_periodo
  WHERE data BETWEEN p_data_inicio AND p_data_fim
  ORDER BY data DESC, receita_efetiva DESC
  LIMIT 100;

  -- Análise de cancelamentos
  SELECT jsonb_agg(
    jsonb_build_object(
      'data', data,
      'total_cancelamentos', total_cancelamentos,
      'taxa_ultima_hora', taxa_cancelamento_ultima_hora,
      'valor_medio', valor_medio_cancelado
    )
  ) INTO v_cancelamentos
  FROM public.mv_analise_cancelamentos
  WHERE data BETWEEN p_data_inicio AND p_data_fim
  ORDER BY data DESC
  LIMIT 50;

  -- Montar resultado final
  v_resultado := jsonb_build_object(
    'kpis', v_kpis,
    'ocupacao', COALESCE(v_ocupacao, '[]'::jsonb),
    'receita', COALESCE(v_receita, '[]'::jsonb),
    'cancelamentos', COALESCE(v_cancelamentos, '[]'::jsonb),
    'gerado_em', CURRENT_TIMESTAMP
  );

  RETURN v_resultado;
END;
$$;

-- 8. Índices para performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_status 
  ON public.agendamentos(data_agendamento, status);

CREATE INDEX IF NOT EXISTS idx_agendamentos_profissional_data 
  ON public.agendamentos(profissional_id, data_agendamento);

CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente_data 
  ON public.agendamentos(cliente_id, data_agendamento);

-- 9. Configurar atualização automática das views materializadas
CREATE OR REPLACE FUNCTION public.agendar_atualizacao_metricas()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- TODO: Integrar com cron job ou edge function
  -- Por enquanto, apenas placeholder
  RAISE NOTICE 'Sistema de atualização automática configurado';
END;
$$;

-- 10. Políticas RLS para as views
ALTER MATERIALIZED VIEW public.mv_ocupacao_profissional OWNER TO postgres;
ALTER MATERIALIZED VIEW public.mv_receita_periodo OWNER TO postgres;
ALTER MATERIALIZED VIEW public.mv_analise_cancelamentos OWNER TO postgres;
ALTER MATERIALIZED VIEW public.mv_analise_clientes OWNER TO postgres;

-- 11. Comentários para documentação
COMMENT ON MATERIALIZED VIEW public.mv_ocupacao_profissional IS 'Métricas de ocupação e performance por profissional';
COMMENT ON MATERIALIZED VIEW public.mv_receita_periodo IS 'Análise de receita por período com crescimento';
COMMENT ON MATERIALIZED VIEW public.mv_analise_cancelamentos IS 'Padrões e análise detalhada de cancelamentos';
COMMENT ON MATERIALIZED VIEW public.mv_analise_clientes IS 'Segmentação e análise comportamental de clientes';
COMMENT ON FUNCTION public.atualizar_metricas() IS 'Atualiza todas as views materializadas de métricas';
COMMENT ON FUNCTION public.obter_metricas_dashboard IS 'Retorna métricas formatadas para dashboard executivo';

-- Log de instalação
DO $$
BEGIN
  RAISE NOTICE 'MetricsEngine instalado com sucesso!';
  RAISE NOTICE 'Views materializadas: mv_ocupacao_profissional, mv_receita_periodo, mv_analise_cancelamentos, mv_analise_clientes';
  RAISE NOTICE 'Funções: atualizar_metricas(), obter_metricas_dashboard()';
  RAISE NOTICE 'Para atualizar: SELECT * FROM public.atualizar_metricas();';
END $$;