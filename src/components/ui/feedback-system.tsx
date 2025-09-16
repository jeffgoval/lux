/**
 * 🎯 SISTEMA DE FEEDBACK VISUAL UNIFICADO
 * 
 * Componentes para feedback visual consistente em toda aplicação
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { LoadingSpinner } from './loading-spinner';

// Tipos de feedback
export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading';

// Interface base para componentes de feedback
interface BaseFeedbackProps {
  type: FeedbackType;
  message: string;
  className?: string;
}

// Ícones para cada tipo de feedback
const feedbackIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
  loading: Loader2,
};

// Classes de cor para cada tipo
const feedbackColors = {
  success: 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800',
  error: 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800',
  warning: 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800',
  info: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800',
  loading: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800',
};

// Componente de feedback inline
export const InlineFeedback: React.FC<BaseFeedbackProps & { size?: 'sm' | 'md' | 'lg' }> = ({
  type,
  message,
  size = 'md',
  className
}) => {
  const Icon = feedbackIcons[type];
  
  const sizeClasses = {
    sm: 'text-xs p-2',
    md: 'text-sm p-3',
    lg: 'text-base p-4'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <div className={cn(
      'flex items-center space-x-2 rounded-md border',
      feedbackColors[type],
      sizeClasses[size],
      className
    )}>
      <Icon 
        className={cn(
          iconSizes[size],
          type === 'loading' ? 'animate-spin' : ''
        )} 
      />
      <span className="font-medium">{message}</span>
    </div>
  );
};

// Componente de feedback para formulários
export const FormFeedback: React.FC<BaseFeedbackProps> = ({
  type,
  message,
  className
}) => {
  const Icon = feedbackIcons[type];
  
  const colorClasses = {
    success: 'text-green-600 dark:text-green-400',
    error: 'text-red-600 dark:text-red-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-blue-600 dark:text-blue-400',
    loading: 'text-blue-600 dark:text-blue-400',
  };

  return (
    <div className={cn(
      'flex items-center space-x-2 mt-1',
      colorClasses[type],
      className
    )}>
      <Icon 
        className={cn(
          'h-4 w-4',
          type === 'loading' ? 'animate-spin' : ''
        )} 
      />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

// Componente de status badge
export const StatusBadge: React.FC<BaseFeedbackProps & { 
  variant?: 'solid' | 'outline' | 'soft';
  size?: 'sm' | 'md' | 'lg';
}> = ({
  type,
  message,
  variant = 'soft',
  size = 'md',
  className
}) => {
  const Icon = feedbackIcons[type];
  
  const getVariantClasses = () => {
    const baseColors = {
      success: {
        solid: 'bg-green-600 text-white border-green-600',
        outline: 'bg-transparent text-green-600 border-green-600',
        soft: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800'
      },
      error: {
        solid: 'bg-red-600 text-white border-red-600',
        outline: 'bg-transparent text-red-600 border-red-600',
        soft: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800'
      },
      warning: {
        solid: 'bg-yellow-600 text-white border-yellow-600',
        outline: 'bg-transparent text-yellow-600 border-yellow-600',
        soft: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-800'
      },
      info: {
        solid: 'bg-blue-600 text-white border-blue-600',
        outline: 'bg-transparent text-blue-600 border-blue-600',
        soft: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800'
      },
      loading: {
        solid: 'bg-blue-600 text-white border-blue-600',
        outline: 'bg-transparent text-blue-600 border-blue-600',
        soft: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800'
      }
    };
    
    return baseColors[type][variant];
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <span className={cn(
      'inline-flex items-center space-x-1.5 rounded-full border font-medium',
      getVariantClasses(),
      sizeClasses[size],
      className
    )}>
      <Icon 
        className={cn(
          iconSizes[size],
          type === 'loading' ? 'animate-spin' : ''
        )} 
      />
      <span>{message}</span>
    </span>
  );
};

// Componente de feedback para ações
export const ActionFeedback: React.FC<{
  isLoading?: boolean;
  success?: string;
  error?: string;
  className?: string;
}> = ({
  isLoading,
  success,
  error,
  className
}) => {
  if (isLoading) {
    return (
      <InlineFeedback
        type="loading"
        message="Processando..."
        className={className}
      />
    );
  }

  if (success) {
    return (
      <InlineFeedback
        type="success"
        message={success}
        className={className}
      />
    );
  }

  if (error) {
    return (
      <InlineFeedback
        type="error"
        message={error}
        className={className}
      />
    );
  }

  return null;
};

// Componente de feedback para estados vazios
export const EmptyState: React.FC<{
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({
  title,
  description,
  icon,
  action,
  className
}) => {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      {icon && (
        <div className="mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-muted-foreground mb-6 max-w-md">
          {description}
        </p>
      )}
      {action && action}
    </div>
  );
};

// Componente de feedback para carregamento de página
export const PageLoadingFeedback: React.FC<{
  message?: string;
  className?: string;
}> = ({
  message = "Carregando página...",
  className
}) => {
  return (
    <div className={cn(
      'flex items-center justify-center min-h-[400px]',
      className
    )}>
      <div className="text-center">
        <LoadingSpinner size="xl" variant="spinner" className="mb-4" />
        <p className="text-muted-foreground font-medium">{message}</p>
      </div>
    </div>
  );
};

// Hook para gerenciar estados de feedback
export const useFeedbackState = () => {
  const [state, setState] = React.useState<{
    type: FeedbackType | null;
    message: string;
  }>({ type: null, message: '' });

  const showFeedback = React.useCallback((type: FeedbackType, message: string) => {
    setState({ type, message });
  }, []);

  const clearFeedback = React.useCallback(() => {
    setState({ type: null, message: '' });
  }, []);

  const showSuccess = React.useCallback((message: string) => {
    showFeedback('success', message);
  }, [showFeedback]);

  const showError = React.useCallback((message: string) => {
    showFeedback('error', message);
  }, [showFeedback]);

  const showWarning = React.useCallback((message: string) => {
    showFeedback('warning', message);
  }, [showFeedback]);

  const showInfo = React.useCallback((message: string) => {
    showFeedback('info', message);
  }, [showFeedback]);

  const showLoading = React.useCallback((message: string) => {
    showFeedback('loading', message);
  }, [showFeedback]);

  return {
    feedback: state,
    showFeedback,
    clearFeedback,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
  };
};