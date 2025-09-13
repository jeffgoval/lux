/**
 * useMetricsMock - Mock do hook de métricas para funcionar sem backend completo
 */

import { useState, useEffect } from 'react';
import { format, subDays, startOfDay } from 'date-fns';

// Interfaces do sistema real
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

// Mock data generators
const generateMockSnapshot = (): MetricsSnapshot => ({
  id: crypto.randomUUID(),
  timestamp: new Date().toISOString(),
  occupancy_rate: 65 + Math.random() * 30,
  daily_revenue: 800 + Math.random() * 1000,
  cancellation_rate: 5 + Math.random() * 10,
  no_show_rate: 2 + Math.random() * 8,
  avg_service_duration: 45 + Math.random() * 30,
  client_satisfaction: 8 + Math.random() * 2,
  peak_hours: ['14:00-15:00', '16:00-17:00', '18:00-19:00'],
  staff_utilization: 70 + Math.random() * 25,
  conversion_rate: 85 + Math.random() * 10,
  avg_ticket: 100 + Math.random() * 100,
  created_at: new Date().toISOString()
});

const generateMockKPIs = () => ({
  daily: [
    {
      period: 'daily' as const,
      date: format(new Date(), 'yyyy-MM-dd'),
      total_revenue: 450 + Math.random() * 300,
      total_appointments: 4 + Math.floor(Math.random() * 6),
      completed_appointments: 4,
      cancelled_appointments: 0,
      no_shows: 0,
      new_clients: 1,
      returning_clients: 3,
      vip_appointments: 1,
      growth_rate: -5 + Math.random() * 20,
      retention_rate: 85 + Math.random() * 10,
      updated_at: new Date().toISOString()
    }
  ],
  weekly: [
    {
      period: 'weekly' as const,
      date: format(startOfDay(subDays(new Date(), 7)), 'yyyy-MM-dd'),
      total_revenue: 3250 + Math.random() * 1000,
      total_appointments: 28 + Math.floor(Math.random() * 10),
      completed_appointments: 26,
      cancelled_appointments: 1,
      no_shows: 1,
      new_clients: 6,
      returning_clients: 20,
      vip_appointments: 4,
      growth_rate: 5 + Math.random() * 10,
      retention_rate: 88 + Math.random() * 7,
      updated_at: new Date().toISOString()
    }
  ],
  monthly: [
    {
      period: 'monthly' as const,
      date: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
      total_revenue: 15750 + Math.random() * 5000,
      total_appointments: 126 + Math.floor(Math.random() * 30),
      completed_appointments: 118,
      cancelled_appointments: 6,
      no_shows: 2,
      new_clients: 23,
      returning_clients: 95,
      vip_appointments: 18,
      growth_rate: 8 + Math.random() * 10,
      retention_rate: 85 + Math.random() * 10,
      updated_at: new Date().toISOString()
    }
  ]
});

const generateChartData = (period: string): ChartData[] => {
  const days = period === 'week' ? 7 : period === 'month' ? 30 : period === 'quarter' ? 90 : 365;
  
  return Array.from({ length: Math.min(days, 30) }, (_, i) => {
    const date = subDays(new Date(), days - i - 1);
    return {
      date: format(date, 'dd/MM'),
      revenue: 400 + Math.random() * 800,
      appointments: 3 + Math.floor(Math.random() * 8),
      occupancy: 50 + Math.random() * 40,
      satisfaction: 7.5 + Math.random() * 2
    };
  });
};

const generateComparison = (currentKPIs: any): ComparisonMetrics => {
  const current = currentKPIs.monthly[0];
  const previous = {
    ...current,
    total_revenue: current.total_revenue * (0.9 + Math.random() * 0.2),
    total_appointments: current.total_appointments * (0.9 + Math.random() * 0.2),
    new_clients: current.new_clients * (0.8 + Math.random() * 0.4)
  };

  return {
    current,
    previous,
    growth: {
      revenue: ((current.total_revenue - previous.total_revenue) / previous.total_revenue) * 100,
      appointments: ((current.total_appointments - previous.total_appointments) / previous.total_appointments) * 100,
      occupancy: (current.completed_appointments - previous.completed_appointments) / previous.completed_appointments * 100,
      newClients: ((current.new_clients - previous.new_clients) / previous.new_clients) * 100
    }
  };
};

// Hook principal
export const useMetrics = () => {
  const [currentSnapshot, setCurrentSnapshot] = useState<MetricsSnapshot | null>(null);
  const [kpiMetrics, setKpiMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    // Simular carregamento
    const timer = setTimeout(() => {
      setCurrentSnapshot(generateMockSnapshot());
      setKpiMetrics(generateMockKPIs());
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const forceRefresh = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setCurrentSnapshot(generateMockSnapshot());
      setKpiMetrics(generateMockKPIs());
      setIsLoading(false);
    }, 500);
  };

  const refetch = () => {
    forceRefresh();
  };

  return {
    currentSnapshot,
    kpiMetrics,
    isLoading,
    error,
    refetch,
    forceRefresh,
    queryClient: null
  };
};

export const useChartData = (period: 'week' | 'month' | 'quarter' | 'year' = 'month') => {
  const [data, setData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setData(generateChartData(period));
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [period]);

  return { data, isLoading };
};

export const useMetricsComparison = (currentPeriod: any, comparisonPeriod: any) => {
  const [data, setData] = useState<ComparisonMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      const kpis = generateMockKPIs();
      setData(generateComparison(kpis));
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentPeriod, comparisonPeriod]);

  return { data, isLoading };
};

export const useMetricAlerts = () => {
  const [data, setData] = useState([
    {
      id: '1',
      type: 'high_cancellation',
      message: 'Taxa de cancelamento alta: 12.5% nas últimas 24h',
      severity: 'warning',
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      type: 'low_occupancy',
      message: 'Taxa de ocupação baixa: 45% hoje',
      severity: 'info',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    }
  ]);

  return { data, isLoading: false };
};

export const useMetricsByPeriod = (period: any) => {
  return { data: [], isLoading: false };
};

// Utilitário para criar filtros de período
export const createPeriodFilter = (preset: string, customStart?: Date, customEnd?: Date) => {
  const now = new Date();
  
  switch (preset) {
    case 'today':
      return { start: startOfDay(now), end: now, preset };
    case 'month':
      return { 
        start: new Date(now.getFullYear(), now.getMonth(), 1), 
        end: now, 
        preset 
      };
    default:
      return { start: customStart || startOfDay(now), end: customEnd || now, preset };
  }
};