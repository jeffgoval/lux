/**
 * 🚨 COMPONENTES DE ERRO APRIMORADOS
 * 
 * Mensagens de erro claras, acionáveis e com recovery automático
 */

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Mail, 
  Shield, 
  Database, 
  Wifi, 
  Clock,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type ErrorType = 
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'database'
  | 'network'
  | 'timeout'
  | 'generic';

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  code?: string;
  recoverable: boolean;
  retryAfter?: number;
  context?: Record<string, any>;
  timestamp?: Date;
}

interface EnhancedErrorProps {
  error: ErrorInfo;
  onRetry?: () => void;
  onDismiss?: () => void;
  onGoHome?: () => void;
  className?: string;
  showDetails?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: ErrorInfo | null;
  retryCount: number;
}

// ============================================================================
// COMPONENTE DE ERRO PRINCIPAL
// ============================================================================

export function EnhancedError({
  error,
  onRetry,
  onDismiss,
  onGoHome,
  className,
  showDetails = false,
  autoRetry = false,
  maxRetries = 3
}: EnhancedErrorProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [autoRetryCountdown, setAutoRetryCountdown] = useState(0);

  // Auto retry logic
  useEffect(() => {
    if (autoRetry && error.recoverable && retryCount < maxRetries && error.retryAfter) {
      setAutoRetryCountdown(error.retryAfter / 1000);
      
      const interval = setInterval(() => {
        setAutoRetryCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleRetry();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [error, retryCount, maxRetries, autoRetry]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    onRetry?.();
  };

  // Mapear tipo de erro para ícone e cor
  const getErrorConfig = (type: ErrorType) => {
    const configs = {
      authentication: {
        icon: Shield,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        title: 'Erro de Autenticação'
      },
      authorization: {
        icon: Shield,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        title: 'Acesso Negado'
      },
      validation: {
        icon: AlertTriangle,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        title: 'Dados Inválidos'
      },
      database: {
        icon: Database,
        color: 'text-purple-500',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        title: 'Erro no Banco de Dados'
      },
      network: {
        icon: Wifi,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        title: 'Erro de Conexão'
      },
      timeout: {
        icon: Clock,
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        title: 'Tempo Esgotado'
      },
      generic: {
        icon: AlertTriangle,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        title: 'Erro Inesperado'
      }
    };

    return configs[type] || configs.generic;
  };

  const config = getErrorConfig(error.type);
  const Icon = config.icon;

  // Gerar sugestões de ação baseadas no tipo de erro
  const getActionSuggestions = (type: ErrorType) => {
    const suggestions = {
      authentication: [
        'Verifique suas credenciais',
        'Tente fazer login novamente',
        'Verifique se sua conta está ativa'
      ],
      authorization: [
        'Verifique suas permissões',
        'Entre em contato com o administrador',
        'Tente acessar uma página diferente'
      ],
      validation: [
        'Verifique os dados inseridos',
        'Certifique-se de preencher todos os campos obrigatórios',
        'Verifique o formato dos dados'
      ],
      database: [
        'Tente novamente em alguns instantes',
        'Verifique sua conexão com a internet',
        'Entre em contato com o suporte se persistir'
      ],
      network: [
        'Verifique sua conexão com a internet',
        'Tente recarregar a página',
        'Verifique se o servidor está disponível'
      ],
      timeout: [
        'Tente novamente com uma conexão mais estável',
        'Verifique sua velocidade de internet',
        'Tente em um horário de menor movimento'
      ],
      generic: [
        'Tente recarregar a página',
        'Verifique sua conexão',
        'Entre em contato com o suporte'
      ]
    };

    return suggestions[type] || suggestions.generic;
  };

  const suggestions = getActionSuggestions(error.type);

  return (
    <div className={cn(
      'rounded-lg border p-4',
      config.bgColor,
      config.borderColor,
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Icon className={cn('w-5 h-5 mt-0.5', config.color)} />
          <div className="flex-1">
            <h3 className={cn('font-semibold', config.color)}>
              {config.title}
            </h3>
            <p className="text-gray-700 mt-1">
              {error.message}
            </p>
            
            {error.code && (
              <p className="text-sm text-gray-500 mt-1">
                Código: {error.code}
              </p>
            )}
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Auto retry countdown */}
      {autoRetryCountdown > 0 && (
        <div className="mt-3 p-2 bg-white rounded border">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Tentando novamente em {autoRetryCountdown}s...</span>
          </div>
        </div>
      )}

      {/* Suggestions */}
      <div className="mt-3">
        <p className="text-sm font-medium text-gray-700 mb-2">
          O que você pode fazer:
        </p>
        <ul className="text-sm text-gray-600 space-y-1">
          {suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-gray-400 mt-1">•</span>
              <span>{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {error.recoverable && onRetry && retryCount < maxRetries && (
          <button
            onClick={handleRetry}
            disabled={autoRetryCountdown > 0}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded transition-colors',
              'bg-white border hover:bg-gray-50',
              config.color,
              config.borderColor,
              autoRetryCountdown > 0 && 'opacity-50 cursor-not-allowed'
            )}
          >
            <RefreshCw className="w-4 h-4 inline mr-1" />
            Tentar Novamente
            {retryCount > 0 && ` (${retryCount}/${maxRetries})`}
          </button>
        )}

        {onGoHome && (
          <button
            onClick={onGoHome}
            className="px-3 py-1.5 text-sm font-medium rounded transition-colors bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <Home className="w-4 h-4 inline mr-1" />
            Ir para Início
          </button>
        )}

        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1.5 text-sm font-medium rounded transition-colors bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4 inline mr-1" />
          Recarregar Página
        </button>
      </div>

      {/* Details toggle */}
      {showDetails && error.context && (
        <div className="mt-4">
          <button
            onClick={() => setShowFullDetails(!showFullDetails)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {showFullDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Detalhes técnicos
          </button>
          
          {showFullDetails && (
            <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-600 overflow-auto max-h-32">
              <pre>{JSON.stringify(error.context, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {/* Timestamp */}
      {error.timestamp && (
        <div className="mt-3 text-xs text-gray-400">
          Ocorreu em: {error.timestamp.toLocaleString()}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ERROR BOUNDARY COMPONENT
// ============================================================================

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: ErrorInfo; onRetry: () => void }>;
  onError?: (error: ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error: {
        type: 'generic',
        message: error.message || 'Ocorreu um erro inesperado',
        recoverable: true,
        timestamp: new Date(),
        context: {
          stack: error.stack,
          name: error.name
        }
      },
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorData: ErrorInfo = {
      type: 'generic',
      message: error.message || 'Ocorreu um erro inesperado',
      recoverable: true,
      timestamp: new Date(),
      context: {
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        name: error.name
      }
    };

    this.props.onError?.(errorData);
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} onRetry={this.handleRetry} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <EnhancedError
              error={this.state.error}
              onRetry={this.handleRetry}
              showDetails={true}
              autoRetry={false}
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// HOOK PARA GERENCIAR ERROS
// ============================================================================

export function useErrorHandler() {
  const [error, setError] = useState<ErrorInfo | null>(null);

  const handleError = (errorData: Partial<ErrorInfo>) => {
    const fullError: ErrorInfo = {
      type: 'generic',
      message: 'Ocorreu um erro',
      recoverable: true,
      timestamp: new Date(),
      ...errorData
    };

    setError(fullError);
  };

  const clearError = () => {
    setError(null);
  };

  const createErrorFromException = (exception: any, type: ErrorType = 'generic'): ErrorInfo => {
    return {
      type,
      message: exception.message || 'Erro inesperado',
      code: exception.code,
      recoverable: true,
      timestamp: new Date(),
      context: {
        name: exception.name,
        stack: exception.stack
      }
    };
  };

  return {
    error,
    handleError,
    clearError,
    createErrorFromException,
    hasError: error !== null
  };
}