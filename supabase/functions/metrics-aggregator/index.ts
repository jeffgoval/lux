/**
 * Edge Function: Metrics Aggregator
 * Executa agregação de métricas de performance a cada 5 minutos
 * Atualiza as views materializadas e cache de KPIs
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Interface para métricas agregadas
interface MetricsSnapshot {
  timestamp: string;
  occupancy_rate: number;
  daily_revenue: number;
  cancellation_rate: number;
  no_show_rate: number;
  avg_service_duration: number;
  client_satisfaction: number;
  peak_hours: string[];
  staff_utilization: number;
  conversion_rate: number;
  avg_ticket: number;
}

// Interface para KPIs calculados
interface KPIMetrics {
  period: string;
  total_revenue: number;
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  no_shows: number;
  new_clients: number;
  returning_clients: number;
  vip_appointments: number;
  growth_rate: number;
  retention_rate: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Inicializar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🚀 Starting metrics aggregation...')
    
    // 1. Atualizar views materializadas
    await refreshMaterializedViews(supabaseClient)
    
    // 2. Calcular snapshot atual
    const currentSnapshot = await calculateCurrentSnapshot(supabaseClient)
    
    // 3. Calcular KPIs do período
    const dailyKPIs = await calculateDailyKPIs(supabaseClient)
    const weeklyKPIs = await calculateWeeklyKPIs(supabaseClient)
    const monthlyKPIs = await calculateMonthlyKPIs(supabaseClient)
    
    // 4. Salvar snapshot no cache
    await saveMetricsSnapshot(supabaseClient, currentSnapshot)
    
    // 5. Salvar KPIs agregados
    await saveKPIMetrics(supabaseClient, [dailyKPIs, weeklyKPIs, monthlyKPIs])
    
    // 6. Limpar dados antigos (manter 90 dias)
    await cleanupOldMetrics(supabaseClient)
    
    // 7. Gerar alerta se necessário para métricas críticas
    await checkMetricAlerts(supabaseClient, currentSnapshot)
    
    console.log('✅ Metrics aggregation completed successfully')
    
    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        snapshot: currentSnapshot,
        kpis: {
          daily: dailyKPIs,
          weekly: weeklyKPIs,
          monthly: monthlyKPIs
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Error in metrics aggregation:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

/**
 * Atualizar todas as views materializadas
 */
async function refreshMaterializedViews(supabase: any): Promise<void> {
  console.log('🔄 Refreshing materialized views...')
  
  const views = [
    'mv_occupancy_metrics',
    'mv_revenue_metrics', 
    'mv_cancellation_metrics',
    'mv_client_analytics',
    'mv_staff_performance',
    'mv_service_metrics'
  ]
  
  for (const view of views) {
    try {
      const { error } = await supabase.rpc('refresh_materialized_view', {
        view_name: view
      })
      
      if (error) {
        console.warn(`⚠️ Warning refreshing ${view}:`, error.message)
      } else {
        console.log(`✅ Refreshed ${view}`)
      }
    } catch (err) {
      console.warn(`⚠️ Error refreshing ${view}:`, err.message)
    }
  }
}

/**
 * Calcular snapshot atual das métricas
 */
async function calculateCurrentSnapshot(supabase: any): Promise<MetricsSnapshot> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
  
  // Ocupação atual
  const { data: occupancyData } = await supabase.rpc('get_occupancy_rate', {
    p_start_date: todayStart.toISOString(),
    p_end_date: todayEnd.toISOString()
  })
  
  // Receita do dia
  const { data: revenueData } = await supabase
    .from('pagamentos')
    .select('amount')
    .gte('created_at', todayStart.toISOString())
    .lt('created_at', todayEnd.toISOString())
    .eq('status', 'completed')
  
  const dailyRevenue = revenueData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
  
  // Taxa de cancelamento
  const { data: cancellationData } = await supabase.rpc('get_cancellation_rate', {
    p_start_date: todayStart.toISOString(),
    p_end_date: todayEnd.toISOString()
  })
  
  // Taxa de no-show
  const { data: noShowData } = await supabase.rpc('get_no_show_rate', {
    p_start_date: todayStart.toISOString(),
    p_end_date: todayEnd.toISOString()
  })
  
  // Duração média dos serviços (últimos 7 dias)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const { data: serviceData } = await supabase
    .from('agendamentos')
    .select('servico_id, data_hora, duracao_real')
    .gte('data_hora', weekAgo.toISOString())
    .not('duracao_real', 'is', null)
  
  const avgServiceDuration = serviceData?.length > 0
    ? serviceData.reduce((sum, a) => sum + (a.duracao_real || 0), 0) / serviceData.length
    : 0
  
  // Horários de pico (mock - implementar análise real)
  const peakHours = ['14:00-15:00', '16:00-17:00', '18:00-19:00']
  
  // Utilização da equipe (mock)
  const staffUtilization = Math.random() * 20 + 70 // 70-90%
  
  // Taxa de conversão (mock)
  const conversionRate = Math.random() * 10 + 85 // 85-95%
  
  // Ticket médio
  const avgTicket = dailyRevenue / Math.max((occupancyData?.occupied_slots || 1), 1)
  
  return {
    timestamp: now.toISOString(),
    occupancy_rate: occupancyData?.occupancy_rate || 0,
    daily_revenue: dailyRevenue,
    cancellation_rate: cancellationData?.cancellation_rate || 0,
    no_show_rate: noShowData?.no_show_rate || 0,
    avg_service_duration: Math.round(avgServiceDuration),
    client_satisfaction: Math.random() * 10 + 85, // Mock 85-95%
    peak_hours: peakHours,
    staff_utilization: Math.round(staffUtilization * 100) / 100,
    conversion_rate: Math.round(conversionRate * 100) / 100,
    avg_ticket: Math.round(avgTicket * 100) / 100
  }
}

/**
 * Calcular KPIs diários
 */
async function calculateDailyKPIs(supabase: any): Promise<KPIMetrics> {
  const today = new Date()
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
  
  // Agendamentos do dia
  const { data: appointments } = await supabase
    .from('agendamentos')
    .select('*')
    .gte('data_hora', todayStart.toISOString())
    .lt('data_hora', todayEnd.toISOString())
  
  const totalAppointments = appointments?.length || 0
  const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0
  const cancelledAppointments = appointments?.filter(a => a.status === 'cancelled').length || 0
  const noShows = appointments?.filter(a => a.status === 'no_show').length || 0
  const vipAppointments = appointments?.filter(a => a.is_vip === true).length || 0
  
  // Receita do dia
  const { data: payments } = await supabase
    .from('pagamentos')
    .select('amount')
    .gte('created_at', todayStart.toISOString())
    .lt('created_at', todayEnd.toISOString())
    .eq('status', 'completed')
  
  const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
  
  // Novos clientes (primeira vez)
  const { data: newClients } = await supabase
    .from('clientes')
    .select('id')
    .gte('created_at', todayStart.toISOString())
    .lt('created_at', todayEnd.toISOString())
  
  const newClientsCount = newClients?.length || 0
  
  // Clientes retornando (com agendamento anterior)
  const returningClients = totalAppointments - newClientsCount
  
  // Taxa de crescimento (mock - comparar com ontem)
  const growthRate = Math.random() * 10 + 2 // 2-12%
  
  // Taxa de retenção (mock)
  const retentionRate = Math.random() * 15 + 80 // 80-95%
  
  return {
    period: 'daily',
    total_revenue: totalRevenue,
    total_appointments: totalAppointments,
    completed_appointments: completedAppointments,
    cancelled_appointments: cancelledAppointments,
    no_shows: noShows,
    new_clients: newClientsCount,
    returning_clients: Math.max(returningClients, 0),
    vip_appointments: vipAppointments,
    growth_rate: Math.round(growthRate * 100) / 100,
    retention_rate: Math.round(retentionRate * 100) / 100
  }
}

/**
 * Calcular KPIs semanais
 */
async function calculateWeeklyKPIs(supabase: any): Promise<KPIMetrics> {
  const today = new Date()
  const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  // Agendamentos da semana
  const { data: appointments } = await supabase
    .from('agendamentos')
    .select('*')
    .gte('data_hora', weekStart.toISOString())
    .lte('data_hora', today.toISOString())
  
  const totalAppointments = appointments?.length || 0
  const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0
  const cancelledAppointments = appointments?.filter(a => a.status === 'cancelled').length || 0
  const noShows = appointments?.filter(a => a.status === 'no_show').length || 0
  const vipAppointments = appointments?.filter(a => a.is_vip === true).length || 0
  
  // Receita da semana
  const { data: payments } = await supabase
    .from('pagamentos')
    .select('amount')
    .gte('created_at', weekStart.toISOString())
    .lte('created_at', today.toISOString())
    .eq('status', 'completed')
  
  const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
  
  // Novos clientes da semana
  const { data: newClients } = await supabase
    .from('clientes')
    .select('id')
    .gte('created_at', weekStart.toISOString())
    .lte('created_at', today.toISOString())
  
  const newClientsCount = newClients?.length || 0
  const returningClients = totalAppointments - newClientsCount
  
  return {
    period: 'weekly',
    total_revenue: totalRevenue,
    total_appointments: totalAppointments,
    completed_appointments: completedAppointments,
    cancelled_appointments: cancelledAppointments,
    no_shows: noShows,
    new_clients: newClientsCount,
    returning_clients: Math.max(returningClients, 0),
    vip_appointments: vipAppointments,
    growth_rate: Math.random() * 8 + 5, // Mock
    retention_rate: Math.random() * 10 + 85 // Mock
  }
}

/**
 * Calcular KPIs mensais
 */
async function calculateMonthlyKPIs(supabase: any): Promise<KPIMetrics> {
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  
  // Agendamentos do mês
  const { data: appointments } = await supabase
    .from('agendamentos')
    .select('*')
    .gte('data_hora', monthStart.toISOString())
    .lte('data_hora', today.toISOString())
  
  const totalAppointments = appointments?.length || 0
  const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0
  const cancelledAppointments = appointments?.filter(a => a.status === 'cancelled').length || 0
  const noShows = appointments?.filter(a => a.status === 'no_show').length || 0
  const vipAppointments = appointments?.filter(a => a.is_vip === true).length || 0
  
  // Receita do mês
  const { data: payments } = await supabase
    .from('pagamentos')
    .select('amount')
    .gte('created_at', monthStart.toISOString())
    .lte('created_at', today.toISOString())
    .eq('status', 'completed')
  
  const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
  
  // Novos clientes do mês
  const { data: newClients } = await supabase
    .from('clientes')
    .select('id')
    .gte('created_at', monthStart.toISOString())
    .lte('created_at', today.toISOString())
  
  const newClientsCount = newClients?.length || 0
  const returningClients = totalAppointments - newClientsCount
  
  return {
    period: 'monthly',
    total_revenue: totalRevenue,
    total_appointments: totalAppointments,
    completed_appointments: completedAppointments,
    cancelled_appointments: cancelledAppointments,
    no_shows: noShows,
    new_clients: newClientsCount,
    returning_clients: Math.max(returningClients, 0),
    vip_appointments: vipAppointments,
    growth_rate: Math.random() * 15 + 10, // Mock
    retention_rate: Math.random() * 5 + 90 // Mock
  }
}

/**
 * Salvar snapshot das métricas
 */
async function saveMetricsSnapshot(supabase: any, snapshot: MetricsSnapshot): Promise<void> {
  const { error } = await supabase
    .from('metrics_snapshots')
    .insert([{
      id: crypto.randomUUID(),
      timestamp: snapshot.timestamp,
      occupancy_rate: snapshot.occupancy_rate,
      daily_revenue: snapshot.daily_revenue,
      cancellation_rate: snapshot.cancellation_rate,
      no_show_rate: snapshot.no_show_rate,
      avg_service_duration: snapshot.avg_service_duration,
      client_satisfaction: snapshot.client_satisfaction,
      peak_hours: snapshot.peak_hours,
      staff_utilization: snapshot.staff_utilization,
      conversion_rate: snapshot.conversion_rate,
      avg_ticket: snapshot.avg_ticket,
      created_at: new Date().toISOString()
    }])
  
  if (error) {
    console.error('Error saving metrics snapshot:', error)
  } else {
    console.log('✅ Metrics snapshot saved')
  }
}

/**
 * Salvar KPIs agregados
 */
async function saveKPIMetrics(supabase: any, kpis: KPIMetrics[]): Promise<void> {
  for (const kpi of kpis) {
    const { error } = await supabase
      .from('kpi_metrics')
      .upsert([{
        period: kpi.period,
        date: new Date().toISOString().split('T')[0],
        total_revenue: kpi.total_revenue,
        total_appointments: kpi.total_appointments,
        completed_appointments: kpi.completed_appointments,
        cancelled_appointments: kpi.cancelled_appointments,
        no_shows: kpi.no_shows,
        new_clients: kpi.new_clients,
        returning_clients: kpi.returning_clients,
        vip_appointments: kpi.vip_appointments,
        growth_rate: kpi.growth_rate,
        retention_rate: kpi.retention_rate,
        updated_at: new Date().toISOString()
      }], {
        onConflict: 'period,date'
      })
    
    if (error) {
      console.error(`Error saving ${kpi.period} KPIs:`, error)
    } else {
      console.log(`✅ ${kpi.period} KPIs saved`)
    }
  }
}

/**
 * Limpar métricas antigas (manter 90 dias)
 */
async function cleanupOldMetrics(supabase: any): Promise<void> {
  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  
  // Limpar snapshots antigos
  const { error: snapshotError } = await supabase
    .from('metrics_snapshots')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
  
  if (snapshotError) {
    console.warn('Warning cleaning old snapshots:', snapshotError.message)
  }
  
  // Limpar KPIs antigos
  const { error: kpiError } = await supabase
    .from('kpi_metrics')
    .delete()
    .lt('updated_at', cutoffDate.toISOString())
  
  if (kpiError) {
    console.warn('Warning cleaning old KPIs:', kpiError.message)
  }
  
  console.log('🧹 Old metrics cleaned up')
}

/**
 * Verificar e gerar alertas para métricas críticas
 */
async function checkMetricAlerts(supabase: any, snapshot: MetricsSnapshot): Promise<void> {
  const alerts: Array<{type: string, message: string, severity: string}> = []
  
  // Verificar ocupação muito baixa
  if (snapshot.occupancy_rate < 30) {
    alerts.push({
      type: 'low_occupancy',
      message: `Taxa de ocupação crítica: ${snapshot.occupancy_rate}%`,
      severity: 'error'
    })
  }
  
  // Verificar taxa de cancelamento alta
  if (snapshot.cancellation_rate > 25) {
    alerts.push({
      type: 'high_cancellation',
      message: `Taxa de cancelamento alta: ${snapshot.cancellation_rate}%`,
      severity: 'warning'
    })
  }
  
  // Verificar no-shows excessivos
  if (snapshot.no_show_rate > 20) {
    alerts.push({
      type: 'high_no_show',
      message: `Taxa de no-show alta: ${snapshot.no_show_rate}%`,
      severity: 'warning'
    })
  }
  
  // Verificar utilização da equipe baixa
  if (snapshot.staff_utilization < 60) {
    alerts.push({
      type: 'low_staff_utilization',
      message: `Utilização da equipe baixa: ${snapshot.staff_utilization}%`,
      severity: 'info'
    })
  }
  
  // Salvar alertas se houver
  for (const alert of alerts) {
    await supabase.from('system_alerts').insert([{
      type: alert.type,
      message: alert.message,
      severity: alert.severity,
      data: { snapshot },
      created_at: new Date().toISOString()
    }])
  }
  
  if (alerts.length > 0) {
    console.log(`⚠️ Generated ${alerts.length} metric alerts`)
  }
}