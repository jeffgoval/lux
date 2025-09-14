/**
 * IntelligentAlertsEngine - Sistema de Alertas Inteligentes
 * Engine de detecção proativa com análise estatística e machine learning
 */

import { supabase } from '@/integrations/supabase/client';
import { addDays, addHours, startOfDay, endOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { notificationEngine, NotificationContext } from './NotificationEngine';

// =====================================================
// INTERFACES E TIPOS
// =====================================================

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  category: AlertCategory;
  severity: AlertSeverity;
  conditions: AlertCondition[];
  actions: AlertAction[];
  enabled: boolean;
  frequency: AlertFrequency;
  lastChecked?: Date;
  lastTriggered?: Date;
  triggerCount: number;
  metadata?: Record<string, any>;
}

export type AlertCategory = 
  | 'operational'      // Operacional (cancelamentos, no-shows)
  | 'performance'      // Performance (tempo resposta, ocupação)
  | 'financial'        // Financeiro (receita, custos)
  | 'capacity'         // Capacidade (agenda lotada, disponibilidade)
  | 'quality'          // Qualidade (satisfação, reclamações)
  | 'security'         // Segurança (acessos, tentativas)
  | 'technical';       // Técnico (erros, sistema)

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export type AlertFrequency = 'real-time' | 'hourly' | 'daily' | 'weekly';

export interface AlertCondition {
  id: string;
  metric: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne' | 'between' | 'anomaly';
  value: number | string;
  secondaryValue?: number; // Para operador "between"
  timeWindow: number; // em horas
  aggregation: 'count' | 'sum' | 'avg' | 'max' | 'min' | 'stddev';
}

export interface AlertAction {
  type: 'notification' | 'email' | 'webhook' | 'auto-fix';
  config: {
    recipients?: string[];
    template?: string;
    webhook_url?: string;
    fix_function?: string;
  };
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  status: AlertStatus;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  resolvedBy?: string;
  data: AlertData;
  metadata?: Record<string, any>;
}

export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'suppressed';

export interface AlertData {
  currentValue: number | string;
  expectedValue?: number | string;
  threshold: number | string;
  trend?: 'up' | 'down' | 'stable';
  affectedEntities?: string[];
  timeRange: {
    start: Date;
    end: Date;
  };
  context?: Record<string, any>;
}

export interface AnomalyDetection {
  metric: string;
  currentValue: number;
  expectedValue: number;
  standardDeviation: number;
  zScore: number;
  isAnomaly: boolean;
  confidence: number;
  historicalData: number[];
}

// =====================================================
// REGRAS DE ALERTA PREDEFINIDAS
// =====================================================

const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'high_cancellation_rate',
    name: 'Taxa Alta de Cancelamentos',
    description: 'Alerta quando a taxa de cancelamento excede 20% nas últimas 24h',
    category: 'operational',
    severity: 'warning',
    frequency: 'hourly',
    enabled: true,
    triggerCount: 0,
    conditions: [{
      id: 'cancellation_rate',
      metric: 'cancellation_rate',
      operator: 'gt',
      value: 20,
      timeWindow: 24,
      aggregation: 'avg'
    }],
    actions: [{
      type: 'notification',
      config: {
        recipients: ['gerente', 'proprietaria'],
        template: 'high_cancellation_alert'
      }
    }]
  },
  
  {
    id: 'low_occupancy_rate',
    name: 'Baixa Taxa de Ocupação',
    description: 'Alerta quando ocupação fica abaixo de 40% por mais de 2 dias',
    category: 'performance',
    severity: 'warning',
    frequency: 'daily',
    enabled: true,
    triggerCount: 0,
    conditions: [{
      id: 'occupancy_rate',
      metric: 'occupancy_rate',
      operator: 'lt',
      value: 40,
      timeWindow: 48,
      aggregation: 'avg'
    }],
    actions: [{
      type: 'notification',
      config: {
        recipients: ['gerente', 'marketing'],
        template: 'low_occupancy_alert'
      }
    }]
  },
  
  {
    id: 'revenue_drop_anomaly',
    name: 'Anomalia na Receita',
    description: 'Detecta quedas anômalas na receita diária usando análise estatística',
    category: 'financial',
    severity: 'error',
    frequency: 'daily',
    enabled: true,
    triggerCount: 0,
    conditions: [{
      id: 'daily_revenue',
      metric: 'daily_revenue',
      operator: 'anomaly',
      value: -2, // Z-score threshold
      timeWindow: 24,
      aggregation: 'sum'
    }],
    actions: [{
      type: 'notification',
      config: {
        recipients: ['proprietaria', 'financeiro'],
        template: 'revenue_anomaly_alert'
      }
    }]
  },
  
  {
    id: 'capacity_overload',
    name: 'Sobrecarga de Capacidade',
    description: 'Agenda com mais de 90% de ocupação nos próximos 3 dias',
    category: 'capacity',
    severity: 'info',
    frequency: 'daily',
    enabled: true,
    triggerCount: 0,
    conditions: [{
      id: 'future_occupancy',
      metric: 'future_occupancy_3d',
      operator: 'gt',
      value: 90,
      timeWindow: 72,
      aggregation: 'avg'
    }],
    actions: [{
      type: 'notification',
      config: {
        recipients: ['recepcionistas', 'gerente'],
        template: 'capacity_overload_alert'
      }
    }]
  },
  
  {
    id: 'excessive_no_shows',
    name: 'Excesso de No-Shows',
    description: 'No-shows acima de 15% nas últimas 48h',
    category: 'operational',
    severity: 'warning',
    frequency: 'daily',
    enabled: true,
    triggerCount: 0,
    conditions: [{
      id: 'no_show_rate',
      metric: 'no_show_rate',
      operator: 'gt',
      value: 15,
      timeWindow: 48,
      aggregation: 'avg'
    }],
    actions: [
      {
        type: 'notification',
        config: {
          recipients: ['gerente', 'recepcionistas'],
          template: 'high_no_show_alert'
        }
      },
      {
        type: 'auto-fix',
        config: {
          fix_function: 'increase_reminder_frequency'
        }
      }
    ]
  },
  
  {
    id: 'system_errors_spike',
    name: 'Pico de Erros do Sistema',
    description: 'Aumento súbito nos erros do sistema',
    category: 'technical',
    severity: 'critical',
    frequency: 'real-time',
    enabled: true,
    triggerCount: 0,
    conditions: [{
      id: 'error_count',
      metric: 'system_errors',
      operator: 'gt',
      value: 10,
      timeWindow: 1,
      aggregation: 'count'
    }],
    actions: [{
      type: 'notification',
      config: {
        recipients: ['technical', 'proprietaria'],
        template: 'system_error_alert'
      }
    }]
  }
];

// =====================================================
// CLASSE PRINCIPAL
// =====================================================

export class IntelligentAlertsEngine {
  private static instance: IntelligentAlertsEngine;
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private isRunning: boolean = false;

  public static getInstance(): IntelligentAlertsEngine {
    if (!IntelligentAlertsEngine.instance) {
      IntelligentAlertsEngine.instance = new IntelligentAlertsEngine();
    }
    return IntelligentAlertsEngine.instance;
  }

  constructor() {
    this.loadDefaultRules();
  }

  /**
   * Inicializar sistema de alertas
   */
  async initialize(): Promise<void> {
    try {
      // Carregar regras do banco de dados
      await this.loadRulesFromDatabase();
      
      // Carregar alertas ativos
      await this.loadActiveAlerts();
      
      // Iniciar monitoramento
      await this.startMonitoring();

    } catch (error) {

    }
  }

  /**
   * Carregar regras padrão
   */
  private loadDefaultRules(): void {
    DEFAULT_ALERT_RULES.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  /**
   * Carregar regras do banco de dados
   */
  private async loadRulesFromDatabase(): Promise<void> {
    try {
      const { data: rules, error } = await supabase
        .from('alert_rules')
        .select('*')
        .eq('enabled', true);

      if (error) throw error;

      rules?.forEach(rule => {
        this.alertRules.set(rule.id, {
          ...rule,
          conditions: rule.conditions || [],
          actions: rule.actions || [],
          lastChecked: rule.last_checked ? new Date(rule.last_checked) : undefined,
          lastTriggered: rule.last_triggered ? new Date(rule.last_triggered) : undefined
        });
      });
    } catch (error) {

    }
  }

  /**
   * Carregar alertas ativos
   */
  private async loadActiveAlerts(): Promise<void> {
    try {
      const { data: alerts, error } = await supabase
        .from('alerts')
        .select('*')
        .in('status', ['active', 'acknowledged']);

      if (error) throw error;

      alerts?.forEach(alert => {
        this.activeAlerts.set(alert.id, {
          ...alert,
          triggeredAt: new Date(alert.triggered_at),
          acknowledgedAt: alert.acknowledged_at ? new Date(alert.acknowledged_at) : undefined,
          resolvedAt: alert.resolved_at ? new Date(alert.resolved_at) : undefined
        });
      });
    } catch (error) {

    }
  }

  /**
   * Iniciar monitoramento automático
   */
  async startMonitoring(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Executar verificações em intervalos diferentes
    this.scheduleChecks('real-time', 60 * 1000);    // 1 minuto
    this.scheduleChecks('hourly', 60 * 60 * 1000);  // 1 hora
    this.scheduleChecks('daily', 24 * 60 * 60 * 1000); // 24 horas

  }

  /**
   * Agendar verificações por frequência
   */
  private scheduleChecks(frequency: AlertFrequency, interval: number): void {
    const check = async () => {
      if (!this.isRunning) return;
      
      try {
        await this.checkAlertsByFrequency(frequency);
      } catch (error) {

      }
      
      setTimeout(check, interval);
    };
    
    setTimeout(check, interval);
  }

  /**
   * Verificar alertas por frequência
   */
  async checkAlertsByFrequency(frequency: AlertFrequency): Promise<void> {
    const rules = Array.from(this.alertRules.values()).filter(
      rule => rule.frequency === frequency && rule.enabled
    );

    for (const rule of rules) {
      try {
        await this.evaluateRule(rule);
      } catch (error) {

      }
    }
  }

  /**
   * Avaliar uma regra específica
   */
  async evaluateRule(rule: AlertRule): Promise<void> {
    const now = new Date();
    
    // Verificar todas as condições
    const conditionResults = await Promise.all(
      rule.conditions.map(condition => this.evaluateCondition(condition))
    );

    // Todas as condições devem ser verdadeiras
    const shouldTrigger = conditionResults.every(result => result.triggered);

    if (shouldTrigger) {
      // Verificar se já existe alerta ativo para esta regra
      const existingAlert = Array.from(this.activeAlerts.values())
        .find(alert => alert.ruleId === rule.id && alert.status === 'active');

      if (!existingAlert) {
        await this.triggerAlert(rule, conditionResults);
      }
    }

    // Atualizar timestamp da última verificação
    rule.lastChecked = now;
    await this.updateRuleInDatabase(rule);
  }

  /**
   * Avaliar condição individual
   */
  private async evaluateCondition(condition: AlertCondition): Promise<{
    triggered: boolean;
    currentValue: number | string;
    expectedValue?: number;
    data?: any;
  }> {
    
    switch (condition.metric) {
      case 'cancellation_rate':
        return await this.evaluateCancellationRate(condition);
      case 'occupancy_rate':
        return await this.evaluateOccupancyRate(condition);
      case 'daily_revenue':
        return await this.evaluateRevenueAnomaly(condition);
      case 'future_occupancy_3d':
        return await this.evaluateFutureOccupancy(condition);
      case 'no_show_rate':
        return await this.evaluateNoShowRate(condition);
      case 'system_errors':
        return await this.evaluateSystemErrors(condition);
      default:
        return { triggered: false, currentValue: 0 };
    }
  }

  /**
   * Avaliar taxa de cancelamento
   */
  private async evaluateCancellationRate(condition: AlertCondition): Promise<any> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (condition.timeWindow * 60 * 60 * 1000));

    const { data, error } = await supabase.rpc('get_cancellation_rate', {
      p_start_date: startTime.toISOString(),
      p_end_date: endTime.toISOString()
    });

    if (error) throw error;

    const currentRate = data?.cancellation_rate || 0;
    const triggered = this.evaluateOperator(currentRate, condition.operator, condition.value);

    return {
      triggered,
      currentValue: currentRate,
      data: { 
        total_appointments: data?.total_appointments || 0,
        cancelled_appointments: data?.cancelled_appointments || 0
      }
    };
  }

  /**
   * Avaliar taxa de ocupação
   */
  private async evaluateOccupancyRate(condition: AlertCondition): Promise<any> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (condition.timeWindow * 60 * 60 * 1000));

    const { data, error } = await supabase.rpc('get_occupancy_rate', {
      p_start_date: startTime.toISOString(),
      p_end_date: endTime.toISOString()
    });

    if (error) throw error;

    const currentRate = data?.occupancy_rate || 0;
    const triggered = this.evaluateOperator(currentRate, condition.operator, condition.value);

    return {
      triggered,
      currentValue: currentRate,
      data: { 
        total_slots: data?.total_slots || 0,
        occupied_slots: data?.occupied_slots || 0
      }
    };
  }

  /**
   * Detectar anomalias na receita usando Z-score
   */
  private async evaluateRevenueAnomaly(condition: AlertCondition): Promise<any> {
    const { data: revenueData, error } = await supabase.rpc('get_daily_revenue_history', {
      p_days: 30
    });

    if (error) throw error;

    const values = revenueData?.map((d: any) => d.revenue) || [];
    if (values.length < 7) {
      return { triggered: false, currentValue: 0 };
    }

    const anomaly = this.detectAnomaly({
      metric: 'daily_revenue',
      historicalData: values.slice(0, -1), // Dados históricos
      currentValue: values[values.length - 1] // Valor atual
    });

    const triggered = condition.operator === 'anomaly' && 
                     anomaly.isAnomaly && 
                     anomaly.zScore <= (condition.value as number);

    return {
      triggered,
      currentValue: anomaly.currentValue,
      expectedValue: anomaly.expectedValue,
      data: {
        z_score: anomaly.zScore,
        confidence: anomaly.confidence,
        trend: anomaly.currentValue < anomaly.expectedValue ? 'down' : 'up'
      }
    };
  }

  /**
   * Avaliar ocupação futura
   */
  private async evaluateFutureOccupancy(condition: AlertCondition): Promise<any> {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + (condition.timeWindow * 60 * 60 * 1000));

    const { data, error } = await supabase.rpc('get_future_occupancy', {
      p_start_date: startTime.toISOString(),
      p_end_date: endTime.toISOString()
    });

    if (error) throw error;

    const currentRate = data?.occupancy_rate || 0;
    const triggered = this.evaluateOperator(currentRate, condition.operator, condition.value);

    return {
      triggered,
      currentValue: currentRate,
      data: { 
        total_appointments: data?.total_appointments || 0,
        available_slots: data?.available_slots || 0
      }
    };
  }

  /**
   * Avaliar taxa de no-show
   */
  private async evaluateNoShowRate(condition: AlertCondition): Promise<any> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (condition.timeWindow * 60 * 60 * 1000));

    const { data, error } = await supabase.rpc('get_no_show_rate', {
      p_start_date: startTime.toISOString(),
      p_end_date: endTime.toISOString()
    });

    if (error) throw error;

    const currentRate = data?.no_show_rate || 0;
    const triggered = this.evaluateOperator(currentRate, condition.operator, condition.value);

    return {
      triggered,
      currentValue: currentRate,
      data: { 
        total_appointments: data?.total_appointments || 0,
        no_shows: data?.no_shows || 0
      }
    };
  }

  /**
   * Avaliar erros do sistema
   */
  private async evaluateSystemErrors(condition: AlertCondition): Promise<any> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (condition.timeWindow * 60 * 60 * 1000));

    // Simular contagem de erros (implementar com sistema de logs real)
    const errorCount = Math.floor(Math.random() * 20); // Mock data
    const triggered = this.evaluateOperator(errorCount, condition.operator, condition.value);

    return {
      triggered,
      currentValue: errorCount,
      data: { 
        time_window: condition.timeWindow,
        error_types: ['database', 'api', 'frontend'] // Mock
      }
    };
  }

  /**
   * Avaliar operador de condição
   */
  private evaluateOperator(
    current: number, 
    operator: AlertCondition['operator'], 
    threshold: number | string
  ): boolean {
    const numThreshold = Number(threshold);
    
    switch (operator) {
      case 'gt': return current > numThreshold;
      case 'lt': return current < numThreshold;
      case 'gte': return current >= numThreshold;
      case 'lte': return current <= numThreshold;
      case 'eq': return current === numThreshold;
      case 'ne': return current !== numThreshold;
      default: return false;
    }
  }

  /**
   * Detectar anomalias usando Z-score
   */
  private detectAnomaly(params: {
    metric: string;
    historicalData: number[];
    currentValue: number;
  }): AnomalyDetection {
    
    const { historicalData, currentValue } = params;
    
    if (historicalData.length < 3) {
      return {
        metric: params.metric,
        currentValue,
        expectedValue: currentValue,
        standardDeviation: 0,
        zScore: 0,
        isAnomaly: false,
        confidence: 0,
        historicalData
      };
    }

    // Calcular média e desvio padrão
    const mean = historicalData.reduce((sum, val) => sum + val, 0) / historicalData.length;
    const variance = historicalData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalData.length;
    const stdDev = Math.sqrt(variance);

    // Calcular Z-score
    const zScore = stdDev > 0 ? (currentValue - mean) / stdDev : 0;
    
    // Considerar anomalia se Z-score > 2 ou < -2
    const isAnomaly = Math.abs(zScore) > 2;
    
    // Calcular confiança (0-1)
    const confidence = Math.min(Math.abs(zScore) / 3, 1);

    return {
      metric: params.metric,
      currentValue,
      expectedValue: mean,
      standardDeviation: stdDev,
      zScore,
      isAnomaly,
      confidence,
      historicalData
    };
  }

  /**
   * Disparar alerta
   */
  private async triggerAlert(
    rule: AlertRule, 
    conditionResults: any[]
  ): Promise<void> {
    
    const alert: Alert = {
      id: crypto.randomUUID(),
      ruleId: rule.id,
      ruleName: rule.name,
      category: rule.category,
      severity: rule.severity,
      title: rule.name,
      description: rule.description,
      status: 'active',
      triggeredAt: new Date(),
      data: {
        currentValue: conditionResults[0]?.currentValue || 0,
        expectedValue: conditionResults[0]?.expectedValue,
        threshold: rule.conditions[0]?.value || 0,
        trend: conditionResults[0]?.data?.trend,
        timeRange: {
          start: new Date(Date.now() - (rule.conditions[0]?.timeWindow || 24) * 60 * 60 * 1000),
          end: new Date()
        },
        context: conditionResults[0]?.data
      }
    };

    // Salvar no banco de dados
    await this.saveAlert(alert);
    
    // Adicionar aos alertas ativos
    this.activeAlerts.set(alert.id, alert);
    
    // Executar ações
    await this.executeAlertActions(rule, alert);
    
    // Atualizar contadores da regra
    rule.triggerCount++;
    rule.lastTriggered = new Date();

  }

  /**
   * Executar ações do alerta
   */
  private async executeAlertActions(rule: AlertRule, alert: Alert): Promise<void> {
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'notification':
            await this.sendNotificationAction(action, alert);
            break;
          case 'email':
            await this.sendEmailAction(action, alert);
            break;
          case 'webhook':
            await this.sendWebhookAction(action, alert);
            break;
          case 'auto-fix':
            await this.executeAutoFix(action, alert);
            break;
        }
      } catch (error) {

      }
    }
  }

  /**
   * Enviar notificação
   */
  private async sendNotificationAction(action: AlertAction, alert: Alert): Promise<void> {
    const context: NotificationContext = {
      clienteNome: 'Sistema',
      customData: {
        alertTitle: alert.title,
        alertDescription: alert.description,
        currentValue: alert.data.currentValue,
        threshold: alert.data.threshold,
        severity: alert.severity
      }
    };

    // TODO: Implementar notificação para recipients específicos

  }

  /**
   * Executar auto-fix
   */
  private async executeAutoFix(action: AlertAction, alert: Alert): Promise<void> {
    switch (action.config.fix_function) {
      case 'increase_reminder_frequency':
        await this.increaseReminderFrequency();
        break;
      // Adicionar outras funções de auto-fix
    }
  }

  private async increaseReminderFrequency(): Promise<void> {
    // Implementar lógica para aumentar frequência de lembretes

  }

  private async sendEmailAction(action: AlertAction, alert: Alert): Promise<void> {
    // TODO: Implementar envio de email
  }

  private async sendWebhookAction(action: AlertAction, alert: Alert): Promise<void> {
    // TODO: Implementar webhook
  }

  /**
   * Salvar alerta no banco
   */
  private async saveAlert(alert: Alert): Promise<void> {
    await supabase.from('alerts').insert({
      id: alert.id,
      rule_id: alert.ruleId,
      rule_name: alert.ruleName,
      category: alert.category,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      status: alert.status,
      triggered_at: alert.triggeredAt.toISOString(),
      data: alert.data,
      metadata: alert.metadata
    });
  }

  private async updateRuleInDatabase(rule: AlertRule): Promise<void> {
    await supabase.from('alert_rules').upsert({
      id: rule.id,
      last_checked: rule.lastChecked?.toISOString(),
      trigger_count: rule.triggerCount,
      last_triggered: rule.lastTriggered?.toISOString()
    });
  }

  /**
   * Reconhecer alerta
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert && alert.status === 'active') {
      alert.status = 'acknowledged';
      alert.acknowledgedAt = new Date();
      alert.acknowledgedBy = userId;

      await supabase.from('alerts')
        .update({
          status: 'acknowledged',
          acknowledged_at: alert.acknowledgedAt.toISOString(),
          acknowledged_by: userId
        })
        .eq('id', alertId);
    }
  }

  /**
   * Resolver alerta
   */
  async resolveAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert && alert.status !== 'resolved') {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      alert.resolvedBy = userId;

      await supabase.from('alerts')
        .update({
          status: 'resolved',
          resolved_at: alert.resolvedAt.toISOString(),
          resolved_by: userId
        })
        .eq('id', alertId);

      this.activeAlerts.delete(alertId);
    }
  }

  /**
   * Obter alertas ativos
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
  }

  /**
   * Parar monitoramento
   */
  stopMonitoring(): void {
    this.isRunning = false;

  }
}

// =====================================================
// INSTÂNCIA SINGLETON
// =====================================================

export const intelligentAlertsEngine = IntelligentAlertsEngine.getInstance();
