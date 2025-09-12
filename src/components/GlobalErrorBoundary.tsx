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
    console.error('Global Error Boundary caught an error:', error, errorInfo);
    
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
      console.error('Recovery attempt failed:', recoveryError);
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
      console.log('Error Report:', errorReport);
      
      // In a real app, you would send this to your error reporting service
      alert('Relatório de erro gerado no console. Por favor, contate o suporte técnico.');
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Oops! Algo deu errado</CardTitle>
              <CardDescription>
                Ocorreu um erro inesperado na aplicação. Nossa equipe foi notificada.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {this.state.isRecovering && (
                <div className="text-center text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                  Tentando recuperar automaticamente...
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-2">
                <Button 
                  onClick={this.handleRetry}
                  disabled={this.state.isRecovering}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar Novamente
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                  className="w-full"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Ir para Dashboard
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={this.handleReload}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recarregar Página
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <div className="space-y-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={this.handleReportError}
                    className="w-full text-xs"
                  >
                    <Bug className="h-3 w-3 mr-2" />
                    Gerar Relatório de Erro
                  </Button>
                  
                  {this.state.error && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground mb-2">
                        Detalhes técnicos
                      </summary>
                      <div className="bg-muted p-3 rounded text-xs font-mono overflow-auto max-h-40">
                        <div className="mb-2">
                          <strong>Erro:</strong> {this.state.error.message}
                        </div>
                        {this.state.error.stack && (
                          <div className="mb-2">
                            <strong>Stack:</strong>
                            <pre className="whitespace-pre-wrap text-xs">
                              {this.state.error.stack}
                            </pre>
                          </div>
                        )}
                        {this.state.errorInfo?.componentStack && (
                          <div>
                            <strong>Component Stack:</strong>
                            <pre className="whitespace-pre-wrap text-xs">
                              {this.state.errorInfo.componentStack}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              )}
              
              <div className="text-center text-xs text-muted-foreground">
                ID do Erro: {this.state.errorId?.slice(-8)}
              </div>
            </CardContent>
          </Card>
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
    console.error('Component error:', error, context);
    
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