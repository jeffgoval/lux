/**
 * AlertsDashboard - Dashboard para visualização e gerenciamento de alertas
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bell, 
  Check, 
  X, 
  AlertTriangle, 
  Info, 
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Shield,
  Wrench,
  Filter,
  Calendar,
  Clock,
  BarChart3,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Alert, AlertCategory, AlertSeverity, intelligentAlertsEngine } from '@/services/IntelligentAlertsEngineMock';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

// =====================================================
// INTERFACES
// =====================================================

interface AlertsMetrics {
  totalActive: number;
  totalAcknowledged: number;
  totalResolved: number;
  criticalCount: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  byCategory: Record<AlertCategory, number>;
  trendData: Array<{
    date: string;
    active: number;
    resolved: number;
  }>;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const AlertsDashboard: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [metrics, setMetrics] = useState<AlertsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<AlertCategory | 'all'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverity | 'all'>('all');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Carregar dados
  useEffect(() => {
    loadAlertsData();
  }, []);

  const loadAlertsData = async () => {
    setLoading(true);
    try {
      // Carregar alertas ativos
      const activeAlerts = intelligentAlertsEngine.getActiveAlerts();
      setAlerts(activeAlerts);
      
      // Calcular métricas
      const metricsData = calculateMetrics(activeAlerts);
      setMetrics(metricsData);
      
    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (alertsData: Alert[]): AlertsMetrics => {
    const byCategory: Record<AlertCategory, number> = {
      operational: 0,
      performance: 0,
      financial: 0,
      capacity: 0,
      quality: 0,
      security: 0,
      technical: 0
    };

    alertsData.forEach(alert => {
      byCategory[alert.category]++;
    });

    // Mock trend data
    const trendData = Array.from({ length: 7 }, (_, i) => ({
      date: format(new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000), 'dd/MM'),
      active: Math.floor(Math.random() * 20) + 5,
      resolved: Math.floor(Math.random() * 15) + 3
    }));

    return {
      totalActive: alertsData.filter(a => a.status === 'active').length,
      totalAcknowledged: alertsData.filter(a => a.status === 'acknowledged').length,
      totalResolved: 0, // Mock - seria carregado do banco
      criticalCount: alertsData.filter(a => a.severity === 'critical').length,
      errorCount: alertsData.filter(a => a.severity === 'error').length,
      warningCount: alertsData.filter(a => a.severity === 'warning').length,
      infoCount: alertsData.filter(a => a.severity === 'info').length,
      byCategory,
      trendData
    };
  };

  const filteredAlerts = alerts.filter(alert => {
    const categoryMatch = selectedCategory === 'all' || alert.category === selectedCategory;
    const severityMatch = selectedSeverity === 'all' || alert.severity === selectedSeverity;
    return categoryMatch && severityMatch;
  });

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await intelligentAlertsEngine.acknowledgeAlert(alertId, 'current-user-id');
      await loadAlertsData();
    } catch (error) {

    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await intelligentAlertsEngine.resolveAlert(alertId, 'current-user-id');
      await loadAlertsData();
    } catch (error) {

    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alertas Inteligentes</h1>
          <p className="text-gray-600 mt-1">Monitoramento proativo e detecção de anomalias</p>
        </div>
        <Button onClick={loadAlertsData} className="flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Atualizar
        </Button>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="alerts">Alertas Ativos</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <MetricsOverview metrics={metrics} />
          <CategoryBreakdown metrics={metrics} />
        </TabsContent>

        {/* Active Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <AlertsFilters
            selectedCategory={selectedCategory}
            selectedSeverity={selectedSeverity}
            onCategoryChange={setSelectedCategory}
            onSeverityChange={setSelectedSeverity}
          />
          <AlertsList
            alerts={filteredAlerts}
            onAcknowledge={handleAcknowledgeAlert}
            onResolve={handleResolveAlert}
          />
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <TrendsChart data={metrics?.trendData || []} />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <AlertSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// =====================================================
// MÉTRICAS OVERVIEW
// =====================================================

interface MetricsOverviewProps {
  metrics: AlertsMetrics | null;
}

const MetricsOverview: React.FC<MetricsOverviewProps> = ({ metrics }) => {
  if (!metrics) return null;

  const metricCards = [
    {
      title: 'Alertas Ativos',
      value: metrics.totalActive,
      icon: Bell,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      change: '+12%',
      trend: 'up'
    },
    {
      title: 'Críticos',
      value: metrics.criticalCount,
      icon: AlertTriangle,
      color: 'text-red-700',
      bgColor: 'bg-red-100',
      change: '0%',
      trend: 'stable'
    },
    {
      title: 'Reconhecidos',
      value: metrics.totalAcknowledged,
      icon: Eye,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      change: '+5%',
      trend: 'up'
    },
    {
      title: 'Resolvidos (24h)',
      value: metrics.totalResolved,
      icon: Check,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '+8%',
      trend: 'up'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metricCards.map((metric, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {metric.title}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {metric.value}
                </p>
                <div className="flex items-center mt-2 text-sm">
                  {metric.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  ) : metric.trend === 'down' ? (
                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                  ) : null}
                  <span className={
                    metric.trend === 'up' ? 'text-green-500' :
                    metric.trend === 'down' ? 'text-red-500' :
                    'text-gray-500'
                  }>
                    {metric.change}
                  </span>
                </div>
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
// BREAKDOWN POR CATEGORIA
// =====================================================

interface CategoryBreakdownProps {
  metrics: AlertsMetrics | null;
}

const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ metrics }) => {
  if (!metrics) return null;

  const categoryData = [
    { 
      category: 'operational', 
      name: 'Operacional', 
      icon: Activity, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      count: metrics.byCategory.operational 
    },
    { 
      category: 'performance', 
      name: 'Performance', 
      icon: BarChart3, 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      count: metrics.byCategory.performance 
    },
    { 
      category: 'financial', 
      name: 'Financeiro', 
      icon: DollarSign, 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      count: metrics.byCategory.financial 
    },
    { 
      category: 'capacity', 
      name: 'Capacidade', 
      icon: Users, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      count: metrics.byCategory.capacity 
    },
    { 
      category: 'security', 
      name: 'Segurança', 
      icon: Shield, 
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      count: metrics.byCategory.security 
    },
    { 
      category: 'technical', 
      name: 'Técnico', 
      icon: Wrench, 
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      count: metrics.byCategory.technical 
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categoryData.map((item) => (
            <div key={item.category} className="text-center p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
              <div className={`w-12 h-12 rounded-full ${item.bgColor} flex items-center justify-center mx-auto mb-2`}>
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{item.count}</p>
              <p className="text-sm text-gray-600">{item.name}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// =====================================================
// FILTROS DE ALERTAS
// =====================================================

interface AlertsFiltersProps {
  selectedCategory: AlertCategory | 'all';
  selectedSeverity: AlertSeverity | 'all';
  onCategoryChange: (category: AlertCategory | 'all') => void;
  onSeverityChange: (severity: AlertSeverity | 'all') => void;
}

const AlertsFilters: React.FC<AlertsFiltersProps> = ({
  selectedCategory,
  selectedSeverity,
  onCategoryChange,
  onSeverityChange
}) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtros:</span>
          </div>
          
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              <SelectItem value="operational">Operacional</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="financial">Financeiro</SelectItem>
              <SelectItem value="capacity">Capacidade</SelectItem>
              <SelectItem value="quality">Qualidade</SelectItem>
              <SelectItem value="security">Segurança</SelectItem>
              <SelectItem value="technical">Técnico</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedSeverity} onValueChange={onSeverityChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Severidades</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
              <SelectItem value="warning">Aviso</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

// =====================================================
// LISTA DE ALERTAS
// =====================================================

interface AlertsListProps {
  alerts: Alert[];
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string) => void;
}

const AlertsList: React.FC<AlertsListProps> = ({ alerts, onAcknowledge, onResolve }) => {
  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical': return 'text-red-700 bg-red-100';
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-600 bg-blue-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-600 bg-red-100';
      case 'acknowledged': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-4">
      {alerts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-gray-600 mb-2">Nenhum alerta encontrado</p>
            <p className="text-sm text-gray-500">
              Todos os alertas foram resolvidos ou não há alertas para os filtros selecionados.
            </p>
          </CardContent>
        </Card>
      ) : (
        alerts.map((alert) => (
          <Card key={alert.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(alert.status)}>
                      {alert.status}
                    </Badge>
                    <Badge variant="secondary">
                      {alert.category}
                    </Badge>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {alert.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-3">
                    {alert.description}
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Valor Atual:</span>
                      <span className="ml-2 font-medium">{alert.data.currentValue}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Limite:</span>
                      <span className="ml-2 font-medium">{alert.data.threshold}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Disparado:</span>
                      <span className="ml-2 font-medium">
                        {format(alert.triggeredAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                    {alert.data.trend && (
                      <div className="flex items-center">
                        <span className="text-gray-500 mr-2">Tendência:</span>
                        {alert.data.trend === 'up' ? (
                          <TrendingUp className="w-4 h-4 text-red-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-green-500" />
                        )}
                        <span className="ml-1 font-medium capitalize">{alert.data.trend}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  {alert.status === 'active' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAcknowledge(alert.id)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Reconhecer
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onResolve(alert.id)}
                        className="flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Resolver
                      </Button>
                    </>
                  )}
                  {alert.status === 'acknowledged' && (
                    <Button
                      size="sm"
                      onClick={() => onResolve(alert.id)}
                      className="flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Resolver
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

// =====================================================
// GRÁFICO DE TENDÊNCIAS
// =====================================================

interface TrendsChartProps {
  data: Array<{
    date: string;
    active: number;
    resolved: number;
  }>;
}

const TrendsChart: React.FC<TrendsChartProps> = ({ data }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendência de Alertas (Últimos 7 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="active" 
              stackId="1"
              stroke="#ef4444" 
              fill="#fef2f2" 
              name="Ativos"
            />
            <Area 
              type="monotone" 
              dataKey="resolved" 
              stackId="1"
              stroke="#10b981" 
              fill="#f0fdf4" 
              name="Resolvidos"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// =====================================================
// CONFIGURAÇÕES DE ALERTAS
// =====================================================

const AlertSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Monitoramento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Monitoramento em Tempo Real</h4>
              <p className="text-sm text-gray-600">Verificação de alertas críticos a cada minuto</p>
            </div>
            <Badge className="bg-green-100 text-green-700">Ativo</Badge>
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Detecção de Anomalias</h4>
              <p className="text-sm text-gray-600">Análise estatística com Z-score para receita e ocupação</p>
            </div>
            <Badge className="bg-green-100 text-green-700">Ativo</Badge>
          </div>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">Auto-correção</h4>
              <p className="text-sm text-gray-600">Aplicação automática de correções para problemas conhecidos</p>
            </div>
            <Badge className="bg-yellow-100 text-yellow-700">Parcial</Badge>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Regras Ativas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              'Taxa Alta de Cancelamentos (>20%)',
              'Baixa Taxa de Ocupação (<40%)',
              'Anomalia na Receita (Z-score < -2)',
              'Sobrecarga de Capacidade (>90%)',
              'Excesso de No-Shows (>15%)',
              'Pico de Erros do Sistema (>10)'
            ].map((rule, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">{rule}</span>
                <Badge className="bg-green-100 text-green-700">Ativo</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
