/**
 * useMetrics - Hook para consumo de métricas em tempo real
 * Integra com React Query para cache eficiente e atualizações automáticas
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays, startOfDay, endOfDay, format, startOfWeek, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// =====================================================
// INTERFACES
// =====================================================

export interface MetricsSnapshot {
  id: string;
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
  created_at: string;
}

export interface KPIMetrics {
  period: 'daily' | 'weekly' | 'monthly';
  date: string;
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
  updated_at: string;
}

export interface ChartData {
  date: string;
  revenue: number;
  appointments: number;
  occupancy: number;
  satisfaction: number;
}

export interface ComparisonMetrics {
  current: KPIMetrics;
  previous: KPIMetrics;
  growth: {
    revenue: number;
    appointments: number;
    occupancy: number;
    newClients: number;
  };
}

export interface PeriodFilter {
  start: Date;
  end: Date;
  preset: 'today' | 'yesterday' | 'week' | 'lastWeek' | 'month' | 'lastMonth' | 'quarter' | 'year' | 'custom';
}

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export const useMetrics = () => {
  const queryClient = useQueryClient();

  // Snapshot atual das métricas
  const {
    data: currentSnapshot,
    isLoading: snapshotLoading,
    error: snapshotError,
    refetch: refetchSnapshot
  } = useQuery({
    queryKey: ['metrics', 'snapshot', 'current'],
    queryFn: getCurrentSnapshot,
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
    refetchInterval: 5 * 60 * 1000, // Atualizar a cada 5 minutos
    refetchIntervalInBackground: true,
  });

  // KPIs por período
  const {
    data: kpiMetrics,
    isLoading: kpiLoading,
    error: kpiError,
    refetch: refetchKPIs
  } = useQuery({
    queryKey: ['metrics', 'kpis', 'all'],
    queryFn: getAllKPIs,
    staleTime: 10 * 60 * 1000, // 10 minutos
    cacheTime: 30 * 60 * 1000, // 30 minutos
  });

  // Forçar atualização das métricas
  const forceRefresh = async () => {
    try {
      // Chamar edge function de agregação
      const { data, error } = await supabase.functions.invoke('metrics-aggregator');
      
      if (error) {

        throw error;
      }
      
      // Invalidar cache e recarregar
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      
      return data;
    } catch (error) {

      throw error;
    }
  };

  return {
    // Dados
    currentSnapshot,
    kpiMetrics,
    
    // Estados
    isLoading: snapshotLoading || kpiLoading,
    error: snapshotError || kpiError,
    
    // Ações
    refetch: () => {
      refetchSnapshot();
      refetchKPIs();
    },
    forceRefresh,
    
    // Utilitários
    queryClient
  };
};

// =====================================================
// HOOK PARA MÉTRICAS POR PERÍODO
// =====================================================

export const useMetricsByPeriod = (period: PeriodFilter) => {
  return useQuery({
    queryKey: ['metrics', 'period', period.preset, period.start, period.end],
    queryFn: () => getMetricsByPeriod(period),
    staleTime: 5 * 60 * 1000,
    enabled: !!period.start && !!period.end,
  });
};

// =====================================================
// HOOK PARA DADOS DE CHARTS
// =====================================================

export const useChartData = (
  period: 'week' | 'month' | 'quarter' | 'year' = 'month'
) => {
  return useQuery({
    queryKey: ['metrics', 'chart', period],
    queryFn: () => getChartData(period),
    staleTime: 15 * 60 * 1000, // 15 minutos
    cacheTime: 30 * 60 * 1000, // 30 minutos
  });
};

// =====================================================
// HOOK PARA COMPARAÇÃO ENTRE PERÍODOS
// =====================================================

export const useMetricsComparison = (
  currentPeriod: PeriodFilter,
  comparisonPeriod: PeriodFilter
) => {
  return useQuery({
    queryKey: [
      'metrics', 
      'comparison', 
      currentPeriod.preset, 
      comparisonPeriod.preset,
      currentPeriod.start,
      currentPeriod.end,
      comparisonPeriod.start,
      comparisonPeriod.end
    ],
    queryFn: () => getMetricsComparison(currentPeriod, comparisonPeriod),
    staleTime: 10 * 60 * 1000,
    enabled: !!currentPeriod.start && !!comparisonPeriod.start,
  });
};

// =====================================================
// HOOK PARA ALERTAS DE MÉTRICAS
// =====================================================

export const useMetricAlerts = () => {
  return useQuery({
    queryKey: ['metrics', 'alerts'],
    queryFn: getMetricAlerts,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 2 * 60 * 1000, // Verificar alertas a cada 2 minutos
  });
};

// =====================================================
// FUNÇÕES DE FETCH
// =====================================================

async function getCurrentSnapshot(): Promise<MetricsSnapshot | null> {
  try {
    const { data, error } = await supabase
      .from('metrics_snapshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // Não é "no rows"
      throw error;
    }

    return data || null;
  } catch (error) {

    throw error;
  }
}

async function getAllKPIs(): Promise<{
  daily: KPIMetrics[];
  weekly: KPIMetrics[];
  monthly: KPIMetrics[];
}> {
  try {
    const { data, error } = await supabase
      .from('kpi_metrics')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const grouped = data?.reduce((acc, item) => {
      if (!acc[item.period]) acc[item.period] = [];
      acc[item.period].push(item);
      return acc;
    }, {} as Record<string, KPIMetrics[]>);

    return {
      daily: grouped?.daily || [],
      weekly: grouped?.weekly || [],
      monthly: grouped?.monthly || []
    };
  } catch (error) {

    throw error;
  }
}

async function getMetricsByPeriod(period: PeriodFilter): Promise<MetricsSnapshot[]> {
  try {
    const { data, error } = await supabase
      .from('metrics_snapshots')
      .select('*')
      .gte('created_at', period.start.toISOString())
      .lte('created_at', period.end.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {

    throw error;
  }
}

async function getChartData(period: 'week' | 'month' | 'quarter' | 'year'): Promise<ChartData[]> {
  try {
    const now = new Date();
    let startDate: Date;
    let groupBy: string;
    let dateFormat: string;

    switch (period) {
      case 'week':
        startDate = startOfWeek(now);
        groupBy = 'day';
        dateFormat = 'dd/MM';
        break;
      case 'month':
        startDate = startOfMonth(now);
        groupBy = 'day';
        dateFormat = 'dd/MM';
        break;
      case 'quarter':
        startDate = addDays(now, -90);
        groupBy = 'week';
        dateFormat = 'dd/MM';
        break;
      case 'year':
        startDate = addDays(now, -365);
        groupBy = 'month';
        dateFormat = 'MMM/yy';
        break;
    }

    // Buscar snapshots no período
    const { data: snapshots, error } = await supabase
      .from('metrics_snapshots')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', now.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Agrupar e agregar dados
    const groupedData = snapshots?.reduce((acc, snapshot) => {
      const date = new Date(snapshot.created_at);
      const key = format(date, dateFormat, { locale: ptBR });

      if (!acc[key]) {
        acc[key] = {
          date: key,
          revenue: 0,
          appointments: 0,
          occupancy: 0,
          satisfaction: 0,
          count: 0
        };
      }

      acc[key].revenue += snapshot.daily_revenue;
      acc[key].occupancy += snapshot.occupancy_rate;
      acc[key].satisfaction += snapshot.client_satisfaction;
      acc[key].count += 1;

      return acc;
    }, {} as Record<string, any>);

    // Calcular médias e formatar
    const chartData: ChartData[] = Object.values(groupedData || {}).map((item: any) => ({
      date: item.date,
      revenue: Math.round(item.revenue),
      appointments: Math.round(item.appointments / item.count),
      occupancy: Math.round((item.occupancy / item.count) * 100) / 100,
      satisfaction: Math.round((item.satisfaction / item.count) * 10) / 10
    }));

    return chartData;
  } catch (error) {

    throw error;
  }
}

async function getMetricsComparison(
  currentPeriod: PeriodFilter,
  previousPeriod: PeriodFilter
): Promise<ComparisonMetrics | null> {
  try {
    // Buscar KPIs dos dois períodos
    const [currentData, previousData] = await Promise.all([
      getAggregatedKPIs(currentPeriod),
      getAggregatedKPIs(previousPeriod)
    ]);

    if (!currentData || !previousData) {
      return null;
    }

    // Calcular crescimento
    const growth = {
      revenue: calculateGrowth(currentData.total_revenue, previousData.total_revenue),
      appointments: calculateGrowth(currentData.total_appointments, previousData.total_appointments),
      occupancy: calculateGrowth(currentData.completed_appointments, previousData.completed_appointments),
      newClients: calculateGrowth(currentData.new_clients, previousData.new_clients)
    };

    return {
      current: currentData,
      previous: previousData,
      growth
    };
  } catch (error) {

    throw error;
  }
}

async function getAggregatedKPIs(period: PeriodFilter): Promise<KPIMetrics | null> {
  try {
    // Buscar snapshots no período e agregar
    const { data: snapshots, error } = await supabase
      .from('metrics_snapshots')
      .select('*')
      .gte('created_at', period.start.toISOString())
      .lte('created_at', period.end.toISOString());

    if (error) throw error;

    if (!snapshots || snapshots.length === 0) {
      return null;
    }

    // Agregar dados
    const aggregated = snapshots.reduce((acc, snapshot) => {
      acc.total_revenue += snapshot.daily_revenue;
      acc.occupancy_sum += snapshot.occupancy_rate;
      acc.satisfaction_sum += snapshot.client_satisfaction;
      acc.count += 1;
      return acc;
    }, {
      total_revenue: 0,
      occupancy_sum: 0,
      satisfaction_sum: 0,
      count: 0
    });

    // Buscar dados complementares do período
    const { data: appointments } = await supabase
      .from('agendamentos')
      .select('*')
      .gte('data_hora', period.start.toISOString())
      .lte('data_hora', period.end.toISOString());

    const totalAppointments = appointments?.length || 0;
    const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0;
    const cancelledAppointments = appointments?.filter(a => a.status === 'cancelled').length || 0;
    const noShows = appointments?.filter(a => a.status === 'no_show').length || 0;
    const vipAppointments = appointments?.filter(a => a.is_vip === true).length || 0;

    // Buscar novos clientes
    const { data: newClients } = await supabase
      .from('clientes')
      .select('id')
      .gte('created_at', period.start.toISOString())
      .lte('created_at', period.end.toISOString());

    return {
      period: 'custom' as const,
      date: format(period.start, 'yyyy-MM-dd'),
      total_revenue: aggregated.total_revenue,
      total_appointments: totalAppointments,
      completed_appointments: completedAppointments,
      cancelled_appointments: cancelledAppointments,
      no_shows: noShows,
      new_clients: newClients?.length || 0,
      returning_clients: Math.max(totalAppointments - (newClients?.length || 0), 0),
      vip_appointments: vipAppointments,
      growth_rate: 0, // Calculado externamente
      retention_rate: aggregated.count > 0 ? aggregated.satisfaction_sum / aggregated.count : 0,
      updated_at: new Date().toISOString()
    };
  } catch (error) {

    throw error;
  }
}

async function getMetricAlerts(): Promise<Array<{
  id: string;
  type: string;
  message: string;
  severity: string;
  created_at: string;
}>> {
  try {
    const { data, error } = await supabase
      .from('system_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return data || [];
  } catch (error) {

    throw error;
  }
}

// =====================================================
// UTILITÁRIOS
// =====================================================

function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 100) / 100;
}

// =====================================================
// UTILITÁRIOS PARA FILTROS DE PERÍODO
// =====================================================

export const createPeriodFilter = (preset: PeriodFilter['preset'], customStart?: Date, customEnd?: Date): PeriodFilter => {
  const now = new Date();
  
  switch (preset) {
    case 'today':
      return {
        start: startOfDay(now),
        end: endOfDay(now),
        preset
      };
    
    case 'yesterday':
      const yesterday = addDays(now, -1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday),
        preset
      };
    
    case 'week':
      return {
        start: startOfWeek(now),
        end: now,
        preset
      };
    
    case 'lastWeek':
      const lastWeekEnd = addDays(startOfWeek(now), -1);
      const lastWeekStart = startOfWeek(lastWeekEnd);
      return {
        start: lastWeekStart,
        end: endOfDay(lastWeekEnd),
        preset
      };
    
    case 'month':
      return {
        start: startOfMonth(now),
        end: now,
        preset
      };
    
    case 'lastMonth':
      const lastMonth = addDays(startOfMonth(now), -1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfDay(lastMonth),
        preset
      };
    
    case 'quarter':
      return {
        start: addDays(now, -90),
        end: now,
        preset
      };
    
    case 'year':
      return {
        start: addDays(now, -365),
        end: now,
        preset
      };
    
    case 'custom':
      return {
        start: customStart || startOfDay(now),
        end: customEnd || endOfDay(now),
        preset
      };
    
    default:
      return {
        start: startOfDay(now),
        end: endOfDay(now),
        preset: 'today'
      };
  }
};
