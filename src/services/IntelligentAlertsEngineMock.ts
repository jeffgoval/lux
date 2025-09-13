/**
 * IntelligentAlertsEngineMock - Mock do sistema de alertas para funcionar sem backend
 */

export type AlertCategory = 
  | 'operational'
  | 'performance' 
  | 'financial'
  | 'capacity'
  | 'quality'
  | 'security'
  | 'technical';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'suppressed';

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
  data: {
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
  };
  metadata?: Record<string, any>;
}

// Mock data
const mockAlerts: Alert[] = [
  {
    id: crypto.randomUUID(),
    ruleId: 'rule-1',
    ruleName: 'Taxa Alta de Cancelamentos',
    category: 'operational',
    severity: 'warning',
    title: 'Taxa Alta de Cancelamentos',
    description: 'Taxa de cancelamento excedeu 20% nas últimas 24h',
    status: 'active',
    triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    data: {
      currentValue: 22.5,
      threshold: 20,
      trend: 'up',
      timeRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      },
      context: {
        total_appointments: 40,
        cancelled_appointments: 9
      }
    }
  },
  {
    id: crypto.randomUUID(),
    ruleId: 'rule-2',
    ruleName: 'Baixa Taxa de Ocupação',
    category: 'performance',
    severity: 'warning',
    title: 'Baixa Taxa de Ocupação',
    description: 'Ocupação abaixo de 40% por mais de 2 dias',
    status: 'acknowledged',
    triggeredAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    acknowledgedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    acknowledgedBy: 'user-123',
    data: {
      currentValue: 35.2,
      threshold: 40,
      trend: 'down',
      timeRange: {
        start: new Date(Date.now() - 48 * 60 * 60 * 1000),
        end: new Date()
      },
      context: {
        total_slots: 100,
        occupied_slots: 35
      }
    }
  },
  {
    id: crypto.randomUUID(),
    ruleId: 'rule-3',
    ruleName: 'Anomalia na Receita',
    category: 'financial',
    severity: 'error',
    title: 'Anomalia na Receita',
    description: 'Detectada queda anômala na receita diária',
    status: 'active',
    triggeredAt: new Date(Date.now() - 30 * 60 * 1000),
    data: {
      currentValue: 680.50,
      expectedValue: 1200.00,
      threshold: -2,
      trend: 'down',
      timeRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      },
      context: {
        z_score: -2.3,
        confidence: 0.85
      }
    }
  },
  {
    id: crypto.randomUUID(),
    ruleId: 'rule-4',
    ruleName: 'Sobrecarga de Capacidade',
    category: 'capacity',
    severity: 'info',
    title: 'Sobrecarga de Capacidade',
    description: 'Agenda com mais de 90% de ocupação nos próximos 3 dias',
    status: 'active',
    triggeredAt: new Date(Date.now() - 15 * 60 * 1000),
    data: {
      currentValue: 92.8,
      threshold: 90,
      trend: 'up',
      timeRange: {
        start: new Date(),
        end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      },
      context: {
        total_appointments: 45,
        available_slots: 48
      }
    }
  }
];

export class IntelligentAlertsEngine {
  private static instance: IntelligentAlertsEngine;
  private alerts: Alert[] = [...mockAlerts];

  public static getInstance(): IntelligentAlertsEngine {
    if (!IntelligentAlertsEngine.instance) {
      IntelligentAlertsEngine.instance = new IntelligentAlertsEngine();
    }
    return IntelligentAlertsEngine.instance;
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && alert.status === 'active') {
      alert.status = 'acknowledged';
      alert.acknowledgedAt = new Date();
      alert.acknowledgedBy = userId;
    }
  }

  async resolveAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && alert.status !== 'resolved') {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      alert.resolvedBy = userId;
    }
  }

  getActiveAlerts(): Alert[] {
    return this.alerts
      .filter(alert => alert.status === 'active' || alert.status === 'acknowledged')
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
  }

  // Método para simular adição de novos alertas
  addRandomAlert(): void {
    const categories: AlertCategory[] = ['operational', 'performance', 'financial', 'capacity'];
    const severities: AlertSeverity[] = ['info', 'warning', 'error'];
    
    const newAlert: Alert = {
      id: crypto.randomUUID(),
      ruleId: `rule-${Date.now()}`,
      ruleName: 'Novo Alerta Simulado',
      category: categories[Math.floor(Math.random() * categories.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      title: 'Alerta Simulado',
      description: 'Este é um alerta simulado para demonstração',
      status: 'active',
      triggeredAt: new Date(),
      data: {
        currentValue: Math.random() * 100,
        threshold: 50,
        trend: 'up',
        timeRange: {
          start: new Date(Date.now() - 60 * 60 * 1000),
          end: new Date()
        }
      }
    };

    this.alerts.unshift(newAlert);
  }
}

export const intelligentAlertsEngine = IntelligentAlertsEngine.getInstance();