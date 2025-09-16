/**
 * Error Boundary para capturar e tratar erros de autenticação
 * Implementa recovery automático e fallbacks apropriados
 */

import React, { Component, ReactNode } from 'react';
import { AuthError, AuthErrorType } from '../../types/auth-errors';
import { authErrorRecovery } from '../../services/auth-error-recovery';
import { formatErrorForUser, isCriticalError, shouldShowRetryButton } from '../../utils/auth-error-utils';
import { AuthErrorFallback } from './AuthErrorFallback';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: AuthError; retry: () => void; reset: () => void }>;
  onError?: (error: AuthError, errorInfo: React.ErrorInfo) => void;
  enableAutoRecovery?: boolean;
  maxAutoRecoveryAttempts?: number;
}

interface State {
  hasError: boolean;
  error: AuthError | null;
  isRecovering: boolean;
  recoveryAttempts: number;
  lastRecoveryTime: number;
}

export class AuthErrorBoundary extends Component<Props, State> {
  private recoveryTimeoutId: NodeJS.Timeout | null = null;
  private readonly maxAutoRecoveryAttempts: number;

  constructor(props: Props) {
    super(props);
    this.maxAutoRecoveryAttempts = props.maxAutoRecoveryAttempts || 3;
    
    this.state = {
      hasError: false,
      error: null,
      isRecovering: false,
      recoveryAttempts: 0,
      lastRecoveryTime: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Classifica o erro como AuthError
    const authError = authErrorRecovery.classifyError(error, {
      source: 'ErrorBoundary',
      componentStack: true
    });

    return {
      hasError: true,
      error: authError
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const authError = this.state.error;
    
    if (authError && this.props.onError) {
      this.props.onError(authError, errorInfo);
    }

    // Log estruturado do erro
    this.logError(authError, error, errorInfo);

    // Tentar recovery automático se habilitado
    if (this.props.enableAutoRecovery !== false && authError?.recoverable) {
      this.attemptAutoRecovery(authError);
    }
  }

  componentWillUnmount() {
    if (this.recoveryTimeoutId) {
      clearTimeout(this.recoveryTimeoutId);
    }
  }

  private async attemptAutoRecovery(error: AuthError) {
    const { recoveryAttempts } = this.state;
    
    if (recoveryAttempts >= this.maxAutoRecoveryAttempts) {
      return;
    }

    // Evitar tentativas muito frequentes
    const now = Date.now();
    const timeSinceLastRecovery = now - this.state.lastRecoveryTime;
    const minInterval = 5000; // 5 segundos mínimo entre tentativas

    if (timeSinceLastRecovery < minInterval) {
      return;
    }

    this.setState({
      isRecovering: true,
      recoveryAttempts: recoveryAttempts + 1,
      lastRecoveryTime: now
    });

    try {
      const recoveryResult = await authErrorRecovery.recoverFromError(error);
      
      if (recoveryResult.success) {
        // Recovery bem-sucedido, resetar o boundary
        this.handleReset();
        return;
      }

      if (recoveryResult.shouldRetry && recoveryResult.retryAfter) {
        // Agendar nova tentativa
        this.recoveryTimeoutId = setTimeout(() => {
          this.attemptAutoRecovery(recoveryResult.newError || error);
        }, recoveryResult.retryAfter);
      } else {
        // Recovery falhou definitivamente
        this.setState({
          isRecovering: false,
          error: recoveryResult.newError || error
        });
      }
    } catch (recoveryError) {
      this.setState({
        isRecovering: false,
        error: authErrorRecovery.classifyError(recoveryError, {
          source: 'AutoRecovery',
          originalError: error
        })
      });
    }
  }

  private logError(authError: AuthError | null, originalError: Error, errorInfo: React.ErrorInfo) {
    const logData = {
      timestamp: new Date().toISOString(),
      authError,
      originalError: {
        name: originalError.name,
        message: originalError.message,
        stack: originalError.stack
      },
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Log no console para desenvolvimento
    console.error('AuthErrorBoundary caught error:', logData);

    // Em produção, enviar para serviço de logging
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrar com serviço de logging (Sentry, LogRocket, etc.)
      this.sendToLoggingService(logData);
    }
  }

  private sendToLoggingService(logData: any) {
    // Implementar integração com serviço de logging
    // Por enquanto, apenas armazenar no localStorage para debug
    try {
      const existingLogs = JSON.parse(localStorage.getItem('auth-error-logs') || '[]');
      existingLogs.push(logData);
      
      // Manter apenas os últimos 50 logs
      if (existingLogs.length > 50) {
        existingLogs.splice(0, existingLogs.length - 50);
      }
      
      localStorage.setItem('auth-error-logs', JSON.stringify(existingLogs));
    } catch (storageError) {
      console.warn('Failed to store error log:', storageError);
    }
  }

  private handleRetry = async () => {
    const { error } = this.state;
    
    if (!error) return;

    this.setState({ isRecovering: true });

    try {
      const recoveryResult = await authErrorRecovery.recoverFromError(error);
      
      if (recoveryResult.success) {
        this.handleReset();
      } else {
        this.setState({
          isRecovering: false,
          error: recoveryResult.newError || error
        });
      }
    } catch (recoveryError) {
      this.setState({
        isRecovering: false,
        error: authErrorRecovery.classifyError(recoveryError)
      });
    }
  };

  private handleReset = () => {
    if (this.recoveryTimeoutId) {
      clearTimeout(this.recoveryTimeoutId);
      this.recoveryTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      isRecovering: false,
      recoveryAttempts: 0,
      lastRecoveryTime: 0
    });
  };

  render() {
    const { hasError, error, isRecovering } = this.state;
    const { children, fallback: CustomFallback } = this.props;

    if (!hasError || !error) {
      return children;
    }

    // Usar fallback customizado se fornecido
    if (CustomFallback) {
      return (
        <CustomFallback 
          error={error} 
          retry={this.handleRetry} 
          reset={this.handleReset}
        />
      );
    }

    // Usar fallback padrão
    return (
      <AuthErrorFallback
        error={error}
        isRecovering={isRecovering}
        onRetry={this.handleRetry}
        onReset={this.handleReset}
        showRetryButton={shouldShowRetryButton(error)}
        isCritical={isCriticalError(error)}
      />
    );
  }
}