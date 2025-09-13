/**
 * Sistema de notificações push e em tempo real
 */

import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

export interface PushNotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

class NotificationManager {
  private registration: ServiceWorkerRegistration | null = null;
  private permission: NotificationPermission = {
    granted: false,
    denied: false,
    default: true
  };

  constructor() {
    this.updatePermissionStatus();
  }

  // Atualizar status da permissão
  private updatePermissionStatus() {
    if ('Notification' in window) {
      const permission = Notification.permission;
      this.permission = {
        granted: permission === 'granted',
        denied: permission === 'denied',
        default: permission === 'default'
      };
    }
  }

  // Solicitar permissão para notificações
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Este navegador não suporta notificações push');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.updatePermissionStatus();
      
      if (permission === 'granted') {
        toast.success('Notificações ativadas com sucesso!');
        return true;
      } else {
        toast.warning('Notificações foram negadas. Você pode ativá-las nas configurações do navegador.');
        return false;
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão para notificações:', error);
      toast.error('Erro ao ativar notificações');
      return false;
    }
  }

  // Registrar service worker
  async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registrado com sucesso');
      } catch (error) {
        console.error('Erro ao registrar service worker:', error);
      }
    }
  }

  // Mostrar notificação local
  async showNotification(data: PushNotificationData): Promise<void> {
    if (!this.permission.granted) {
      console.warn('Permissão para notificações não concedida');
      return;
    }

    try {
      if (this.registration) {
        // Usar service worker para notificação
        await this.registration.showNotification(data.title, {
          body: data.body,
          icon: data.icon || '/icon-192x192.png',
          badge: data.badge || '/badge-72x72.png',
          tag: data.tag || 'default',
          data: data.data || {},
          actions: data.actions || [],
          requireInteraction: true,
          timestamp: Date.now()
        });
      } else {
        // Fallback para notificação direta
        new Notification(data.title, {
          body: data.body,
          icon: data.icon || '/icon-192x192.png',
          tag: data.tag || 'default',
          data: data.data || {}
        });
      }
    } catch (error) {
      console.error('Erro ao mostrar notificação:', error);
      
      // Fallback para toast
      toast.error(`${data.title}: ${data.body}`);
    }
  }

  // Configurar notificações para alertas críticos
  setupCriticalAlerts(): void {
    if (!this.permission.granted) return;

    const alertsChannel = supabase
      .channel('critical_alerts')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'system_alerts',
          filter: 'severity=eq.critical'
        }, 
        (payload) => {
          const alert = payload.new as any;
          
          this.showNotification({
            title: '🚨 Alerta Crítico',
            body: alert.message,
            tag: `alert-${alert.id}`,
            data: { 
              alertId: alert.id, 
              type: alert.type,
              url: '/dashboard/alerts'
            },
            actions: [
              {
                action: 'view',
                title: 'Ver Detalhes'
              },
              {
                action: 'acknowledge',
                title: 'Reconhecer'
              }
            ]
          });
        }
      )
      .subscribe();

    // Guardar referência para cleanup
    window.addEventListener('beforeunload', () => {
      supabase.removeChannel(alertsChannel);
    });
  }

  // Configurar notificações para métricas importantes
  setupMetricsAlerts(): void {
    if (!this.permission.granted) return;

    // Alertas baseados em limites de métricas
    const metricsChannel = supabase
      .channel('metrics_alerts')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'metrics_snapshots'
        }, 
        (payload) => {
          const metrics = payload.new as any;
          
          // Alertas automáticos baseados em thresholds
          this.checkMetricsThresholds(metrics);
        }
      )
      .subscribe();

    window.addEventListener('beforeunload', () => {
      supabase.removeChannel(metricsChannel);
    });
  }

  // Verificar limites de métricas e criar alertas
  private checkMetricsThresholds(metrics: any): void {
    const alerts: PushNotificationData[] = [];

    // Taxa de ocupação muito baixa (< 30%)
    if (metrics.occupancy_rate < 30) {
      alerts.push({
        title: '⚠️ Taxa de Ocupação Baixa',
        body: `Ocupação atual: ${metrics.occupancy_rate}%`,
        tag: 'low-occupancy',
        data: { type: 'occupancy', value: metrics.occupancy_rate }
      });
    }

    // Taxa de cancelamento alta (> 15%)
    if (metrics.cancellation_rate > 15) {
      alerts.push({
        title: '📈 Taxa de Cancelamento Alta',
        body: `${metrics.cancellation_rate}% de cancelamentos hoje`,
        tag: 'high-cancellation',
        data: { type: 'cancellation', value: metrics.cancellation_rate }
      });
    }

    // Satisfação baixa (< 7.0)
    if (metrics.client_satisfaction < 7.0) {
      alerts.push({
        title: '😞 Satisfação do Cliente Baixa',
        body: `Nota média: ${metrics.client_satisfaction}/10`,
        tag: 'low-satisfaction',
        data: { type: 'satisfaction', value: metrics.client_satisfaction }
      });
    }

    // Mostrar alertas
    alerts.forEach(alert => {
      setTimeout(() => this.showNotification(alert), 1000);
    });
  }

  // Configurar todas as notificações
  async initialize(): Promise<void> {
    try {
      await this.registerServiceWorker();
      
      if (this.permission.granted) {
        this.setupCriticalAlerts();
        this.setupMetricsAlerts();
        console.log('Sistema de notificações inicializado');
      } else {
        console.log('Permissão para notificações não concedida');
      }
    } catch (error) {
      console.error('Erro ao inicializar sistema de notificações:', error);
    }
  }

  // Getter para status da permissão
  get hasPermission(): boolean {
    return this.permission.granted;
  }

  // Desativar todas as notificações
  disable(): void {
    if (this.registration) {
      this.registration.getNotifications().then(notifications => {
        notifications.forEach(notification => notification.close());
      });
    }
  }
}

// Instância global
export const notificationManager = new NotificationManager();

// Hook para usar notificações em componentes React
export function useNotifications() {
  const requestPermission = () => notificationManager.requestPermission();
  const showNotification = (data: PushNotificationData) => notificationManager.showNotification(data);
  const hasPermission = notificationManager.hasPermission;
  
  return {
    requestPermission,
    showNotification,
    hasPermission,
    initialize: notificationManager.initialize.bind(notificationManager),
    disable: notificationManager.disable.bind(notificationManager)
  };
}