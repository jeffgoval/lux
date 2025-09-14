/**
 * DashboardExecutivo - Dashboard completo com métricas, charts e exportações
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Calendar,
  AlertTriangle,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  Star,
  Eye,
  FileSpreadsheet,
  FileImage
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';

// Hooks e utilitários (usando mock temporariamente)
import {
  useMetrics,
  useChartData,
  useMetricsComparison,
  useMetricAlerts,
  createPeriodFilter
} from '@/hooks/useMetricsMock';

// Interface para PeriodFilter
export interface PeriodFilter {
  start: Date;
  end: Date;
  preset: string;
}

// =====================================================
// INTERFACES
// =====================================================

interface ExportOptions {
  format: 'pdf' | 'csv' | 'xlsx';
  period: PeriodFilter;
  sections: string[];
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const DashboardExecutivo: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter['preset']>('month');
  const [comparisonPeriod, setComparisonPeriod] = useState<PeriodFilter['preset']>('lastMonth');
  const [customPeriod, setCustomPeriod] = useState<{ from?: Date; to?: Date }>({});
  const [activeTab, setActiveTab] = useState('overview');
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>('area');

  // Hooks de dados
  const { currentSnapshot, kpiMetrics, isLoading, error, forceRefresh } = useMetrics();
  
  const currentPeriodFilter = useMemo(() => 
    createPeriodFilter(selectedPeriod, customPeriod.from, customPeriod.to),
    [selectedPeriod, customPeriod]
  );
  
  const comparisonPeriodFilter = useMemo(() => 
    createPeriodFilter(comparisonPeriod),
    [comparisonPeriod]
  );

  const { data: chartData, isLoading: chartLoading } = useChartData(
    selectedPeriod === 'week' || selectedPeriod === 'month' ? selectedPeriod :
    selectedPeriod === 'quarter' ? 'quarter' : 'year'
  );

  const { data: comparisonData, isLoading: comparisonLoading } = useMetricsComparison(
    currentPeriodFilter,
    comparisonPeriodFilter
  );

  const { data: alerts } = useMetricAlerts();

  // Handlers
  const handleExport = async (format: 'pdf' | 'csv' | 'xlsx') => {
    try {
      // Implementar exportação

      // TODO: Implementar lógica de exportação
    } catch (error) {

    }
  };

  const handleRefresh = async () => {
    try {
      await forceRefresh();
    } catch (error) {

    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-gray-600 mb-2">Erro ao carregar dashboard</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Executivo</h1>
          <p className="text-gray-600 mt-1">
            Visão completa das métricas de performance e KPIs
            {currentSnapshot && (
              <span className="ml-2 text-sm">
                • Última atualização: {format(new Date(currentSnapshot.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="yesterday">Ontem</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="lastWeek">Semana passada</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="lastMonth">Mês passado</SelectItem>
              <SelectItem value="quarter">Último trimestre</SelectItem>
              <SelectItem value="year">Último ano</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {selectedPeriod === 'custom' && (
            <DatePickerWithRange
              from={customPeriod.from}
              to={customPeriod.to}
              onSelect={(range) => setCustomPeriod({ from: range?.from, to: range?.to })}
            />
          )}

          <Button 
            onClick={handleRefresh} 
            variant="outline"
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Select defaultValue="pdf" onValueChange={handleExport}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">
                <div className="flex items-center gap-2">
                  <FileImage className="w-4 h-4" />
                  PDF
                </div>
              </SelectItem>
              <SelectItem value="csv">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  CSV
                </div>
              </SelectItem>
              <SelectItem value="xlsx">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alertas críticos */}
      {alerts && alerts.length > 0 && (
        <AlertsBanner alerts={alerts} />
      )}

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="operations">Operacional</TabsTrigger>
          <TabsTrigger value="analysis">Análise</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <MetricsOverview 
            snapshot={currentSnapshot}
            comparison={comparisonData}
            isLoading={isLoading}
          />
          <RevenueChart 
            data={chartData}
            type={chartType}
            onTypeChange={setChartType}
            isLoading={chartLoading}
          />
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          <FinancialMetrics 
            kpis={kpiMetrics}
            comparison={comparisonData}
            isLoading={isLoading}
          />
          <FinancialCharts 
            data={chartData}
            isLoading={chartLoading}
          />
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <OperationalMetrics 
            snapshot={currentSnapshot}
            kpis={kpiMetrics}
            isLoading={isLoading}
          />
          <OperationalCharts 
            data={chartData}
            isLoading={chartLoading}
          />
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <AnalysisMetrics 
            comparison={comparisonData}
            isLoading={comparisonLoading}
          />
          <TrendAnalysis 
            data={chartData}
            isLoading={chartLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// =====================================================
// BANNER DE ALERTAS
// =====================================================

interface AlertsBannerProps {
  alerts: Array<{
    id: string;
    type: string;
    message: string;
    severity: string;
    created_at: string;
  }>;
}

const AlertsBanner: React.FC<AlertsBannerProps> = ({ alerts }) => {
  const criticalAlerts = alerts.filter(a => a.severity === 'error' || a.severity === 'critical');
  
  if (criticalAlerts.length === 0) return null;

  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-800 mb-2">Alertas Críticos</h3>
            <div className="space-y-1">
              {criticalAlerts.slice(0, 3).map(alert => (
                <p key={alert.id} className="text-sm text-red-700">{alert.message}</p>
              ))}
            </div>
            {criticalAlerts.length > 3 && (
              <p className="text-sm text-red-600 mt-1">
                +{criticalAlerts.length - 3} alertas adicionais
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// =====================================================
// MÉTRICAS OVERVIEW
// =====================================================

interface MetricsOverviewProps {
  snapshot: any;
  comparison: any;
  isLoading: boolean;
}

const MetricsOverview: React.FC<MetricsOverviewProps> = ({ 
  snapshot, 
  comparison, 
  isLoading 
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: 'Receita Diária',
      value: `R$ ${(snapshot?.daily_revenue || 0).toLocaleString('pt-BR')}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: comparison?.growth?.revenue,
    },
    {
      title: 'Taxa de Ocupação',
      value: `${(snapshot?.occupancy_rate || 0).toFixed(1)}%`,
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: comparison?.growth?.occupancy,
    },
    {
      title: 'Satisfação',
      value: `${(snapshot?.client_satisfaction || 0).toFixed(1)}/10`,
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      change: null,
    },
    {
      title: 'Ticket Médio',
      value: `R$ ${(snapshot?.avg_ticket || 0).toFixed(2)}`,
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: null,
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {metric.title}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {metric.value}
                </p>
                {metric.change !== null && metric.change !== undefined && (
                  <div className="flex items-center mt-2">
                    {metric.change >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                    )}
                    <span className={
                      metric.change >= 0 ? 'text-green-500' : 'text-red-500'
                    }>
                      {Math.abs(metric.change).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-full ${metric.bgColor}`}>
                <metric.icon className={`w-6 h-6 ${metric.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// =====================================================
// GRÁFICO DE RECEITA
// =====================================================

interface RevenueChartProps {
  data: any[];
  type: 'area' | 'bar' | 'line';
  onTypeChange: (type: 'area' | 'bar' | 'line') => void;
  isLoading: boolean;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ 
  data, 
  type, 
  onTypeChange, 
  isLoading 
}) => {
  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-80 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  const ChartComponent = type === 'area' ? AreaChart : 
                       type === 'bar' ? BarChart : LineChart;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Receita e Ocupação</CardTitle>
        <div className="flex gap-2">
          <Button
            variant={type === 'area' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onTypeChange('area')}
          >
            Área
          </Button>
          <Button
            variant={type === 'bar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onTypeChange('bar')}
          >
            Barras
          </Button>
          <Button
            variant={type === 'line' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onTypeChange('line')}
          >
            Linha
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={data || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="revenue" orientation="left" />
            <YAxis yAxisId="occupancy" orientation="right" />
            <Tooltip 
              formatter={(value, name) => [
                name === 'revenue' ? `R$ ${Number(value).toLocaleString('pt-BR')}` : `${value}%`,
                name === 'revenue' ? 'Receita' : 'Ocupação'
              ]}
            />
            <Legend />
            
            {type === 'area' && (
              <>
                <Area
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="revenue"
                  stackId="1"
                  stroke="#10b981"
                  fill="#d1fae5"
                  name="Receita"
                />
                <Area
                  yAxisId="occupancy"
                  type="monotone"
                  dataKey="occupancy"
                  stackId="2"
                  stroke="#3b82f6"
                  fill="#dbeafe"
                  name="Ocupação"
                />
              </>
            )}
            
            {type === 'bar' && (
              <>
                <Bar yAxisId="revenue" dataKey="revenue" fill="#10b981" name="Receita" />
                <Bar yAxisId="occupancy" dataKey="occupancy" fill="#3b82f6" name="Ocupação" />
              </>
            )}
            
            {type === 'line' && (
              <>
                <Line yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Receita" />
                <Line yAxisId="occupancy" type="monotone" dataKey="occupancy" stroke="#3b82f6" strokeWidth={2} name="Ocupação" />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// =====================================================
// COMPONENTES FINANCEIROS
// =====================================================

const FinancialMetrics: React.FC<{ kpis: any; comparison: any; isLoading: boolean }> = ({ 
  kpis, 
  comparison, 
  isLoading 
}) => {
  if (isLoading) {
    return <div className="h-40 bg-gray-200 rounded animate-pulse"></div>;
  }

  const currentMonthKPIs = kpis?.monthly?.[0];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Receita Total (Mês)</p>
              <p className="text-2xl font-bold">
                R$ {(currentMonthKPIs?.total_revenue || 0).toLocaleString('pt-BR')}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Crescimento</p>
              <p className="text-2xl font-bold">
                {comparison?.growth?.revenue > 0 ? '+' : ''}
                {(comparison?.growth?.revenue || 0).toFixed(1)}%
              </p>
            </div>
            {(comparison?.growth?.revenue || 0) >= 0 ? (
              <TrendingUp className="w-8 h-8 text-green-600" />
            ) : (
              <TrendingDown className="w-8 h-8 text-red-600" />
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Novos Clientes</p>
              <p className="text-2xl font-bold">
                {currentMonthKPIs?.new_clients || 0}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const FinancialCharts: React.FC<{ data: any[]; isLoading: boolean }> = ({ 
  data, 
  isLoading 
}) => {
  if (isLoading) {
    return <div className="h-80 bg-gray-200 rounded animate-pulse"></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise Financeira</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Receita']} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// =====================================================
// COMPONENTES OPERACIONAIS
// =====================================================

const OperationalMetrics: React.FC<{ snapshot: any; kpis: any; isLoading: boolean }> = ({
  snapshot,
  kpis,
  isLoading
}) => {
  if (isLoading) {
    return <div className="h-40 bg-gray-200 rounded animate-pulse"></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card>
        <CardContent className="p-6 text-center">
          <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Taxa Cancelamento</p>
          <p className="text-xl font-bold">{(snapshot?.cancellation_rate || 0).toFixed(1)}%</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6 text-center">
          <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Taxa No-show</p>
          <p className="text-xl font-bold">{(snapshot?.no_show_rate || 0).toFixed(1)}%</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6 text-center">
          <Activity className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Duração Média</p>
          <p className="text-xl font-bold">{snapshot?.avg_service_duration || 0} min</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6 text-center">
          <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Utilização Staff</p>
          <p className="text-xl font-bold">{(snapshot?.staff_utilization || 0).toFixed(1)}%</p>
        </CardContent>
      </Card>
    </div>
  );
};

const OperationalCharts: React.FC<{ data: any[]; isLoading: boolean }> = ({
  data,
  isLoading
}) => {
  if (isLoading) {
    return <div className="h-80 bg-gray-200 rounded animate-pulse"></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Operacional</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="occupancy"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Ocupação (%)"
            />
            <Line
              type="monotone"
              dataKey="satisfaction"
              stroke="#f59e0b"
              strokeWidth={2}
              name="Satisfação"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// =====================================================
// COMPONENTES DE ANÁLISE
// =====================================================

const AnalysisMetrics: React.FC<{ comparison: any; isLoading: boolean }> = ({
  comparison,
  isLoading
}) => {
  if (isLoading) {
    return <div className="h-40 bg-gray-200 rounded animate-pulse"></div>;
  }

  if (!comparison) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          Dados de comparação não disponíveis
        </CardContent>
      </Card>
    );
  }

  const growthMetrics = [
    {
      label: 'Receita',
      value: comparison.growth.revenue,
      format: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
    },
    {
      label: 'Agendamentos',
      value: comparison.growth.appointments,
      format: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
    },
    {
      label: 'Novos Clientes',
      value: comparison.growth.newClients,
      format: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {growthMetrics.map((metric, index) => (
        <Card key={index}>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-gray-600 mb-2">{metric.label}</p>
            <div className="flex items-center justify-center gap-2">
              {metric.value >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
              <span className={`text-xl font-bold ${
                metric.value >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.format(metric.value)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const TrendAnalysis: React.FC<{ data: any[]; isLoading: boolean }> = ({
  data,
  isLoading
}) => {
  if (isLoading) {
    return <div className="h-80 bg-gray-200 rounded animate-pulse"></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Tendências</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="revenue"
              fill="#10b981"
              fillOpacity={0.3}
              stroke="#10b981"
              name="Receita"
            />
            <Line
              type="monotone"
              dataKey="occupancy"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Ocupação"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
