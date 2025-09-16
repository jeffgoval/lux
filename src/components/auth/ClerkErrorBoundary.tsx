/**
 * Error Boundary específico para erros do Clerk Authentication
 * Captura e trata erros específicos do Clerk com recovery automático
 */

import React, { Component, ReactNode } from 'react';
import { ClerkError } from '../../types/clerk-errors';
import { clerkErrorRecovery } from '../../services/clerk-error-recovery';
import { ClerkErrorFallback } from './ClerkErrorFallback';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: ClerkError; retry: () => void; reset: () => void }>;
  onError?: (error: ClerkError, errorInfo: React.ErrorInfo) => void;
  enableAutoRecovery?: boolean;
  maxAutoRecoveryAttempts?: number;
}

interface State {
  hasError: boolean;
  error: ClerkError | null;
  isRecovering: boolean;
  recoveryAttempts: number;
  lastRecoveryTime: number;
}

export class ClerkErrorBoundary extends Component<Props, State> {
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
    // Classifica o erro como ClerkError
    const clerkError = clerkErrorRecovery.classifyClerkError(error, {
      source: 'ClerkErrorBoundary',
      componentStack: true
    });

    return {
      hasError: true,
      error: clerkError
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const clerkError = this.state.error;
    
    if (clerkError && this.props.onError) {
      this.props.onError(clerkError, errorInfo);
    }

    // Log estruturado do erro
    this.logClerkError(clerkError, error, errorInfo);

    // Tentar recovery automático se habilitado
    if (this.props.enableAutoRecovery !== false && clerkError?.recoverable) {
      this.attemptAutoRecovery(clerkError);
    }
  }

  componentWillUnmount() {
    if (this.recoveryTimeoutId) {
      clearTimeout(this.recoveryTimeoutId);
    }
  }

  private async attemptAutoRecovery(error: ClerkError) {
    const { recoveryAttempts } = this.state;
    
    if (recoveryAttempts >= this.maxAutoRecoveryAttempts) {
      return;
    }

    // Evitar tentativas muito frequentes
    const now = Date.now();
    const timeSinceLastRecovery = now - this.state.lastRecoveryTime;
    const minInterval = 3000; // 3 segundos mínimo entre tentativas

    if (timeSinceLastRecovery < minInterval) {
      return;
    }

    this.setState({
      isRecovering: true,
      recoveryAttempts: recoveryAttempts + 1,
      lastRecoveryTime: now
    });

    try {
      const recoveryResult = await clerkErrorRecovery.recoverFromClerkError(error);
      
      if (recoveryResult.success) {
        // Recovery bem-sucedido, resetar o boundary
        this.handleReset();
        return;
      }

      if (recoveryResult.shouldRetry && recoveryResult.retryAfter) {
        // Agendar nova tentativa
        this.recoveryTimeoutId = setTimeout(() => {
          this.attemptAutoRecovery(recoveryResult.newError as ClerkError || error);
        }, recoveryResult.retryAfter);
      } else {
        // Recovery falhou definitivamente
        this.setState({
          isRecovering: false,
          error: (recoveryResult.newError as ClerkError) || error
        });
      }
    } catch (recoveryError) {
      this.setState({
        isRecovering: false,
        error: clerkErrorRecovery.classifyClerkError(recoveryError, {
          source: 'ClerkAutoRecovery',
          originalError: error
        })
      });
    }
  }

  private logClerkError(clerkError: ClerkError | null, originalError: Error, errorInfo: React.ErrorInfo) {
    const logData = {
      timestamp: new Date().toISOString(),
      clerkError,
      originalError: {
        name: originalError.name,
        message: originalError.message,
        stack: originalError.stack
      },
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      clerkContext: {
        publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY ? 'present' : 'missing'
      }
    };

    // Log no console para desenvolvimento
    console.error('ClerkErrorBoundary caught error:', logData);

    // Em produção, enviar para serviço de logging
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(logData);
    }
  }

  private sendToLoggingService(logData: any) {
    // Implementar integração com serviço de logging
    try {
      const existingLogs = JSON.parse(localStorage.getItem('clerk-error-logs') || '[]');
      existingLogs.push(logData);
      
      // Manter apenas os últimos 30 logs
      if (existingLogs.length > 30) {
        existingLogs.splice(0, existingLogs.length - 30);
      }
      
      localStorage.setItem('clerk-error-logs', JSON.stringify(existingLogs));
    } catch (storageError) {
      console.warn('Failed to store Clerk error log:', storageError);
    }
  }

  private handleRetry = async () => {
    const { error } = this.state;
    
    if (!error) return;

    this.setState({ isRecovering: true });

    try {
      const recoveryResult = await clerkErrorRecovery.recoverFromClerkError(error);
      
      if (recoveryResult.success) {
        this.handleReset();
      } else {
        this.setState({
          isRecovering: false,
          error: (recoveryResult.newError as ClerkError) || error
        });
      }
    } catch (recoveryError) {
      this.setState({
        isRecovering: false,
        error: clerkErrorRecovery.classifyClerkError(recoveryError)
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

    // Usar fallback padrão específico do Clerk
    return (
      <ClerkErrorFallback
        error={error}
        isRecovering={isRecovering}
        onRetry={this.handleRetry}
        onReset={this.handleReset}
      />
    );
  }
}