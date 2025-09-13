/**
 * Tipos para o sistema de métricas
 */

// Período de datas para filtrar métricas
export interface MetricsTimeRange {
  from: Date;
  to: Date;
}

// Snapshot das métricas em tempo real
export interface MetricsSnapshot {
  id: string;
  timestamp: string;
  
  // Métricas operacionais
  occupancy_rate: number;
  daily_revenue: number;
  cancellation_rate: number;
  no_show_rate: number;
  
  // Métricas de serviço
  avg_service_duration: number;
  client_satisfaction: number;
  conversion_rate: number;
  avg_ticket: number;
  
  // Utilização de recursos
  staff_utilization: number;
  peak_hours: string[];
  
  created_at: string;
}

// KPIs agregados por período
export interface KPIMetrics {
  id: string;
  period: 'daily' | 'weekly' | 'monthly';
  date: string;
  
  total_revenue: number;
  growth_rate?: number;
  retention_rate?: number;
  
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  no_shows: number;
  vip_appointments: number;
  
  new_clients: number;
  returning_clients: number;
  
  created_at: string;
  updated_at: string;
}

// Alerta do sistema
export interface SystemAlert {
  id: string;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  data?: Record<string, any>;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledged_at?: string;
  created_at: string;
}

// Análise de tendência
export interface TrendAnalysis {
  metric: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  direction: 'up' | 'down' | 'stable';
  insight: string;
}

// Previsão de métricas
export interface MetricsForecast {
  metric: string;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  forecastDate: string;
  factors: string[];
}

// Recomendação de ação
export interface ActionRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  impact: string;
  metrics_affected: string[];
  created_at: string;
}