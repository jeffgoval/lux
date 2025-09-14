import React, { Component, ErrorInfo, ReactNode, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { errorRecoveryManager, ErrorCategory, ErrorSeverity } from '@/utils/errorRecovery';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  isRecovering: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      isRecovering: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {

    // Create error in recovery system
    const appError = errorRecoveryManager.createError(
      error.message || 'Unexpected application error',
      ErrorCategory.UI,
      ErrorSeverity.HIGH,
      {
        currentRoute: window.location.pathname,
        additionalData: {
          componentStack: errorInfo.componentStack,
          errorBoundary: 'GlobalErrorBoundary'
        }
      },
      error
    );

    this.setState({ 
      error, 
      errorInfo, 
      errorId: appError.id 
    });

    // Attempt automatic recovery
    this.attemptRecovery(appError);
  }

  private async attemptRecovery(appError: any) {
    this.setState({ isRecovering: true });
    
    try {
      const recovered = await errorRecoveryManager.attemptRecovery(appError);
      if (recovered) {
        // If recovery was successful, try to reset the error boundary
        setTimeout(() => {
          this.handleRetry();
        }, 1000);
      }
    } catch (recoveryError) {

    } finally {
      this.setState({ isRecovering: false });
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      errorId: undefined,
      isRecovering: false
    });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReportError = () => {
    if (this.state.errorId) {
      const errorReport = errorRecoveryManager.generateErrorReport();

      // In a real app, you would send this to your error reporting service
      alert('Relatório de erro gerado no console. Por favor, contate o suporte técnico.');
    }
  };

  render() {
    if (this.state.hasError) {
      // Log do erro apenas no console (desenvolvimento)
      if (process.env.NODE_ENV === 'development') {
        console.error('Error Boundary capturou erro:', this.state.error);
        console.error('Component Stack:', this.state.errorInfo?.componentStack);
      }

      // Tentar recuperação automática silenciosa
      if (!this.state.isRecovering) {
        setTimeout(() => {
          this.handleRetry();
        }, 100);

        this.setState({ isRecovering: true });
      }

      // Mostrar apenas um loading discreto
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for handling errors in functional components
export function useErrorHandler() {
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback((error: Error, context?: any) => {

    const appError = errorRecoveryManager.createError(
      error.message,
      ErrorCategory.UI,
      ErrorSeverity.MEDIUM,
      {
        currentRoute: window.location.pathname,
        additionalData: context
      },
      error
    );

    // Attempt automatic recovery
    errorRecoveryManager.attemptRecovery(appError);
    
    setError(error);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Throw error to be caught by error boundary if needed
  if (error) {
    throw error;
  }

  return { handleError, clearError };
}
