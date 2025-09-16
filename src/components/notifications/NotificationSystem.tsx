/**
 * 🔔 SISTEMA UNIFICADO DE NOTIFICAÇÕES
 * 
 * Sistema completo de notificações e feedback visual para toda aplicação
 * Inclui toast notifications, alertas contextuais e indicadores de loading
 */

import React, { createContext, useContext, useCallback } from 'react';
import { toast as sonnerToast } from 'sonner';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Info, XCircle, Loader2 } from 'lucide-react';

// Tipos de notificação
export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';

// Interface para opções de toast
export interface ToastOptions {
  duration?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Interface para alertas contextuais
export interface AlertOptions {
  title?: string;
  description: string;
  type: NotificationType;
  dismissible?: boolean;
  onDismiss?: () => void;
}

// Interface do contexto de notificações
interface NotificationContextType {
  // Toast notifications
  showToast: (message: string, type?: NotificationType, options?: ToastOptions) => void;
  showSuccess: (message: string, options?: ToastOptions) => void;
  showError: (message: string, options?: ToastOptions) => void;
  showWarning: (message: string, options?: ToastOptions) => void;
  showInfo: (message: string, options?: ToastOptions) => void;
  showLoading: (message: string, options?: ToastOptions) => string;
  dismissToast: (toastId?: string) => void;
  
  // Alertas contextuais
  showAlert: (options: AlertOptions) => void;
  
  // Estados de loading
  setLoading: (key: string, loading: boolean, message?: string) => void;
  isLoading: (key: string) => boolean;
  getLoadingMessage: (key: string) => string | undefined;
}

// Contexto de notificações
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Hook para usar o sistema de notificações
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications deve ser usado dentro de NotificationProvider');
  }
  return context;
};

// Ícones para cada tipo de notificação
const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'info':
      return <Info className="h-4 w-4 text-blue-500" />;
    case 'loading':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

// Provider do sistema de notificações
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast: radixToast, dismiss } = useToast();
  const [loadingStates, setLoadingStates] = React.useState<Record<string, { loading: boolean; message?: string }>>({});
  const [alerts, setAlerts] = React.useState<Array<AlertOptions & { id: string }>>([]);

  // Função principal para mostrar toast
  const showToast = useCallback((
    message: string, 
    type: NotificationType = 'info', 
    options: ToastOptions = {}
  ) => {
    const icon = getNotificationIcon(type);
    
    // Usar Sonner para toasts mais visuais
    sonnerToast(message, {
      icon,
      duration: options.duration || (type === 'loading' ? Infinity : 4000),
      position: options.position || 'top-right',
      dismissible: options.dismissible !== false,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      className: `toast-${type}`,
    });
  }, []);

  // Funções de conveniência para diferentes tipos
  const showSuccess = useCallback((message: string, options?: ToastOptions) => {
    showToast(message, 'success', options);
  }, [showToast]);

  const showError = useCallback((message: string, options?: ToastOptions) => {
    showToast(message, 'error', options);
  }, [showToast]);

  const showWarning = useCallback((message: string, options?: ToastOptions) => {
    showToast(message, 'warning', options);
  }, [showToast]);

  const showInfo = useCallback((message: string, options?: ToastOptions) => {
    showToast(message, 'info', options);
  }, [showToast]);

  const showLoading = useCallback((message: string, options?: ToastOptions) => {
    const toastId = sonnerToast(message, {
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      duration: Infinity,
      position: options?.position || 'top-right',
      dismissible: false,
      className: 'toast-loading',
    });
    return toastId as string;
  }, []);

  const dismissToast = useCallback((toastId?: string) => {
    if (toastId) {
      sonnerToast.dismiss(toastId);
    } else {
      sonnerToast.dismiss();
    }
    dismiss(toastId);
  }, [dismiss]);

  // Função para mostrar alertas contextuais
  const showAlert = useCallback((options: AlertOptions) => {
    const alertId = Math.random().toString(36).substr(2, 9);
    const newAlert = { ...options, id: alertId };
    
    setAlerts(prev => [...prev, newAlert]);
    
    // Auto-dismiss após 5 segundos se não for dismissible: false
    if (options.dismissible !== false) {
      setTimeout(() => {
        setAlerts(prev => prev.filter(alert => alert.id !== alertId));
        options.onDismiss?.();
      }, 5000);
    }
  }, []);

  // Gerenciamento de estados de loading
  const setLoading = useCallback((key: string, loading: boolean, message?: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: { loading, message }
    }));
  }, []);

  const isLoading = useCallback((key: string) => {
    return loadingStates[key]?.loading || false;
  }, [loadingStates]);

  const getLoadingMessage = useCallback((key: string) => {
    return loadingStates[key]?.message;
  }, [loadingStates]);

  const contextValue: NotificationContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    dismissToast,
    showAlert,
    setLoading,
    isLoading,
    getLoadingMessage,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* Alertas contextuais */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {alerts.map(alert => (
          <ContextualAlert
            key={alert.id}
            {...alert}
            onDismiss={() => {
              setAlerts(prev => prev.filter(a => a.id !== alert.id));
              alert.onDismiss?.();
            }}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

// Componente de alerta contextual
const ContextualAlert: React.FC<AlertOptions & { id: string; onDismiss: () => void }> = ({
  title,
  description,
  type,
  dismissible = true,
  onDismiss,
}) => {
  const icon = getNotificationIcon(type);
  
  const getAlertStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200';
      case 'loading':
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className={`
      relative rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out
      animate-in slide-in-from-right-full
      ${getAlertStyles()}
    `}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="text-sm font-medium mb-1">
              {title}
            </h4>
          )}
          <p className="text-sm opacity-90">
            {description}
          </p>
        </div>
        {dismissible && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Fechar alerta"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// Componente de indicador de loading global
export const GlobalLoadingIndicator: React.FC = () => {
  const { isLoading, getLoadingMessage } = useNotifications();
  
  // Verificar se há algum loading ativo
  const hasActiveLoading = React.useMemo(() => {
    // Aqui você pode definir quais keys de loading devem mostrar o indicador global
    const globalLoadingKeys = ['app', 'navigation', 'auth', 'data-fetch'];
    return globalLoadingKeys.some(key => isLoading(key));
  }, [isLoading]);

  if (!hasActiveLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary/10 backdrop-blur-sm">
      <div className="h-1 bg-primary/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
      </div>
    </div>
  );
};

export default NotificationProvider;