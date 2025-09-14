import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { 
  MetricsSnapshot, 
  KPIMetrics, 
  SystemAlert, 
  MetricsTimeRange 
} from '@/types/metrics';

export interface UseMetricsReturn {
  // Dados
  currentMetrics: MetricsSnapshot | null;
  kpiMetrics: KPIMetrics[];
  alerts: SystemAlert[];
  
  // Estados
  loading: boolean;
  error: string | null;
  
  // Ações
  refreshMetrics: () => Promise<void>;
  updateDateRange: (range: MetricsTimeRange) => void;
  acknowledgeAlert: (alertId: string) => Promise<void>;
}

export function useMetrics(): UseMetricsReturn {
  const [currentMetrics, setCurrentMetrics] = useState<MetricsSnapshot | null>(null);
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<MetricsTimeRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
    to: new Date()
  });

  // Buscar métricas atuais (último snapshot)
  async function fetchCurrentMetrics() {
    try {
      const { data, error } = await supabase
        .from('metrics_snapshots')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      setCurrentMetrics(data || null);
    } catch (err) {

      throw err;
    }
  }

  // Buscar KPIs por período
  async function fetchKPIMetrics() {
    try {
      const { data, error } = await supabase
        .from('kpi_metrics')
        .select('*')
        .gte('date', dateRange.from.toISOString().split('T')[0])
        .lte('date', dateRange.to.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;

      setKpiMetrics(data || []);
    } catch (err) {

      throw err;
    }
  }

  // Buscar alertas ativos
  async function fetchAlerts() {
    try {
      const { data, error } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setAlerts(data || []);
    } catch (err) {

      throw err;
    }
  }

  // Atualizar todas as métricas
  async function refreshMetrics() {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchCurrentMetrics(),
        fetchKPIMetrics(),
        fetchAlerts()
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(`Erro ao carregar métricas: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  // Atualizar período de data
  function updateDateRange(range: MetricsTimeRange) {
    setDateRange(range);
  }

  // Marcar alerta como reconhecido
  async function acknowledgeAlert(alertId: string) {
    try {
      const { error } = await supabase
        .from('system_alerts')
        .update({ 
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      // Atualizar lista local de alertas
      setAlerts(alerts.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'acknowledged', acknowledged_at: new Date().toISOString() }
          : alert
      ));

      toast.success('Alerta reconhecido com sucesso');
    } catch (err) {

      toast.error('Erro ao reconhecer alerta');
    }
  }

  // Configurar atualização automática a cada 5 minutos
  useEffect(() => {
    refreshMetrics();

    const interval = setInterval(() => {
      fetchCurrentMetrics();
      fetchAlerts();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, []);

  // Recarregar KPIs quando o período mudar
  useEffect(() => {
    if (dateRange.from && dateRange.to) {
      fetchKPIMetrics();
    }
  }, [dateRange]);

  // Subscription para alertas em tempo real
  useEffect(() => {
    const alertsSubscription = supabase
      .channel('system_alerts')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'system_alerts' 
        }, 
        (payload) => {
          const newAlert = payload.new as SystemAlert;
          setAlerts(prev => [newAlert, ...prev]);
          
          // Mostrar notificação para alertas críticos
          if (newAlert.severity === 'critical') {
            toast.error(`Alerta crítico: ${newAlert.message}`, {
              duration: 10000,
              action: {
                label: 'Ver detalhes',
                onClick: () => {
                  // Navegar para o dashboard de alertas
                  window.location.href = '/dashboard/alerts';
                }
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(alertsSubscription);
    };
  }, []);

  return {
    currentMetrics,
    kpiMetrics,
    alerts,
    loading,
    error,
    refreshMetrics,
    updateDateRange,
    acknowledgeAlert
  };
}
