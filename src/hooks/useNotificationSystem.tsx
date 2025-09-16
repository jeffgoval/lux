/**
 * 🔔 HOOK DO SISTEMA DE NOTIFICAÇÕES
 * 
 * Hook unificado para gerenciar todas as notificações da aplicação
 */

import { useCallback } from 'react';
import { toast as sonnerToast } from 'sonner';
import { useToast } from './use-toast';
import { CheckCircle, XCircle, AlertCircle, Info, Loader2 } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface NotificationOptions {
  duration?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
}

export interface AsyncActionOptions {
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  showSuccess?: boolean;
  showError?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onFinally?: () => void;
}

export const useNotificationSystem = () => {
  const { toast: radixToast, dismiss } = useToast();

  // Função para obter ícone baseado no tipo
  const getIcon = useCallback((type: NotificationType) => {
    const iconProps = { className: "h-4 w-4" };
    
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
  }, []);

  // Função principal para mostrar notificações
  const notify = useCallback((
    message: string,
    type: NotificationType = 'info',
    options: NotificationOptions = {}
  ) => {
    const icon = getIcon(type);
    
    const toastId = sonnerToast(message, {
      icon,
      duration: options.persistent ? Infinity : (options.duration || getDurationByType(type)),
      position: options.position || 'top-right',
      dismissible: options.dismissible !== false,
      action: options.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
      className: `notification-${type}`,
    });

    return toastId as string;
  }, [getIcon]);

  // Funções de conveniência
  const success = useCallback((message: string, options?: NotificationOptions) => {
    return notify(message, 'success', options);
  }, [notify]);

  const error = useCallback((message: string, options?: NotificationOptions) => {
    return notify(message, 'error', options);
  }, [notify]);

  const warning = useCallback((message: string, options?: NotificationOptions) => {
    return notify(message, 'warning', options);
  }, [notify]);

  const info = useCallback((message: string, options?: NotificationOptions) => {
    return notify(message, 'info', options);
  }, [notify]);

  const loading = useCallback((message: string, options?: NotificationOptions) => {
    return notify(message, 'loading', { ...options, persistent: true });
  }, [notify]);

  // Função para dispensar notificações
  const dismissNotification = useCallback((toastId?: string) => {
    if (toastId) {
      sonnerToast.dismiss(toastId);
    } else {
      sonnerToast.dismiss();
    }
  }, []);

  // Função para atualizar uma notificação existente
  const update = useCallback((
    toastId: string,
    message: string,
    type: NotificationType = 'info',
    options: NotificationOptions = {}
  ) => {
    sonnerToast.dismiss(toastId);
    return notify(message, type, options);
  }, [notify]);

  // Função para executar ações assíncronas com feedback automático
  const executeAsync = useCallback(async (
    action: () => Promise<any>,
    options: AsyncActionOptions = {}
  ): Promise<any> => {
    let loadingToastId: string | undefined;

    try {
      // Mostrar loading se especificado
      if (options.loadingMessage) {
        loadingToastId = loading(options.loadingMessage);
      }

      // Executar a ação
      const result = await action();

      // Dispensar loading
      if (loadingToastId) {
        dismissNotification(loadingToastId);
      }

      // Mostrar sucesso se especificado
      if (options.showSuccess !== false && options.successMessage) {
        success(options.successMessage);
      }

      // Callback de sucesso
      options.onSuccess?.();

      return result;
    } catch (err) {
      // Dispensar loading
      if (loadingToastId) {
        dismissNotification(loadingToastId);
      }

      const errorObj = err instanceof Error ? err : new Error(String(err));

      // Mostrar erro se especificado
      if (options.showError !== false) {
        const errorMessage = options.errorMessage || errorObj.message || 'Ocorreu um erro';
        error(errorMessage);
      }

      // Callback de erro
      options.onError?.(errorObj);

      throw errorObj;
    } finally {
      // Callback final
      options.onFinally?.();
    }
  }, [loading, dismissNotification, success, error]);

  // Função para mostrar confirmação com ação
  const confirm = useCallback((
    message: string,
    onConfirm: () => void | Promise<void>,
    options: {
      confirmLabel?: string;
      type?: NotificationType;
      duration?: number;
    } = {}
  ) => {
    const handleConfirm = async () => {
      try {
        await onConfirm();
      } catch (err) {
        error('Erro ao executar ação');
      }
    };

    return notify(message, options.type || 'info', {
      duration: options.duration || 10000,
      action: {
        label: options.confirmLabel || 'Confirmar',
        onClick: handleConfirm,
      },
    });
  }, [notify, error]);

  // Função para mostrar progresso
  const progress = useCallback((
    message: string,
    current: number,
    total: number,
    options?: NotificationOptions
  ) => {
    const percentage = Math.round((current / total) * 100);
    const progressMessage = `${message} (${percentage}%)`;
    
    return notify(progressMessage, 'loading', {
      ...options,
      persistent: current < total,
    });
  }, [notify]);

  return {
    // Funções principais
    notify,
    success,
    error,
    warning,
    info,
    loading,
    dismiss: dismissNotification,
    update,
    
    // Funções avançadas
    executeAsync,
    confirm,
    progress,
    
    // Utilitários
    getIcon,
  };
};

// Função auxiliar para obter duração baseada no tipo
function getDurationByType(type: NotificationType): number {
  switch (type) {
    case 'success':
      return 3000;
    case 'error':
      return 5000;
    case 'warning':
      return 4000;
    case 'info':
      return 3000;
    case 'loading':
      return Infinity;
    default:
      return 3000;
  }
}

// Hook para notificações de formulário
export const useFormNotifications = () => {
  const { success, error, loading, dismiss } = useNotificationSystem();

  const notifySubmitting = useCallback((message = 'Salvando...') => {
    return loading(message);
  }, [loading]);

  const notifySuccess = useCallback((message = 'Salvo com sucesso!') => {
    return success(message);
  }, [success]);

  const notifyError = useCallback((message = 'Erro ao salvar') => {
    return error(message);
  }, [error]);

  const notifyValidationError = useCallback((message = 'Verifique os campos obrigatórios') => {
    return error(message);
  }, [error]);

  return {
    notifySubmitting,
    notifySuccess,
    notifyError,
    notifyValidationError,
    dismiss,
  };
};

// Hook para notificações de CRUD
export const useCrudNotifications = () => {
  const { success, error, executeAsync } = useNotificationSystem();

  const notifyCreated = useCallback((entity = 'Item') => {
    return success(`${entity} criado com sucesso!`);
  }, [success]);

  const notifyUpdated = useCallback((entity = 'Item') => {
    return success(`${entity} atualizado com sucesso!`);
  }, [success]);

  const notifyDeleted = useCallback((entity = 'Item') => {
    return success(`${entity} excluído com sucesso!`);
  }, [success]);

  const executeCreate = useCallback(async (
    action: () => Promise<any>,
    entity = 'Item'
  ) => {
    return executeAsync(action, {
      loadingMessage: `Criando ${entity.toLowerCase()}...`,
      successMessage: `${entity} criado com sucesso!`,
      errorMessage: `Erro ao criar ${entity.toLowerCase()}`,
    });
  }, [executeAsync]);

  const executeUpdate = useCallback(async (
    action: () => Promise<any>,
    entity = 'Item'
  ) => {
    return executeAsync(action, {
      loadingMessage: `Atualizando ${entity.toLowerCase()}...`,
      successMessage: `${entity} atualizado com sucesso!`,
      errorMessage: `Erro ao atualizar ${entity.toLowerCase()}`,
    });
  }, [executeAsync]);

  const executeDelete = useCallback(async (
    action: () => Promise<any>,
    entity = 'Item'
  ) => {
    return executeAsync(action, {
      loadingMessage: `Excluindo ${entity.toLowerCase()}...`,
      successMessage: `${entity} excluído com sucesso!`,
      errorMessage: `Erro ao excluir ${entity.toLowerCase()}`,
    });
  }, [executeAsync]);

  return {
    notifyCreated,
    notifyUpdated,
    notifyDeleted,
    executeCreate,
    executeUpdate,
    executeDelete,
  };
};