import React, { Component, ErrorInfo, ReactNode, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class SidebarErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {

    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Log do erro apenas no console (desenvolvimento)
      if (process.env.NODE_ENV === 'development') {
        console.error('Sidebar Error Boundary capturou erro:', this.state.error);
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Tentar recuperação automática silenciosa
      setTimeout(() => {
        this.handleRetry();
      }, 100);

      // Retornar um placeholder discreto
      return (
        <div className="flex items-center justify-center p-4">
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useSidebarErrorHandler() {
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback((error: Error) => {

    setError(error);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}
