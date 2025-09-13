import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface LoadingFallbackProps {
  message?: string;
  timeout?: number;
  onTimeout?: () => void;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function LoadingFallback({ 
  message = "Carregando...", 
  timeout = 8000,
  onTimeout,
  onRetry,
  showRetry = false
}: LoadingFallbackProps) {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    
    // Update elapsed time every second
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);

    // Set timeout
    const timeoutId = setTimeout(() => {
      setHasTimedOut(true);
      onTimeout?.();
    }, timeout);

    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [timeout, onTimeout]);

  if (hasTimedOut) {
    return (
      <div className="min-h-[200px] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Carregamento demorado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                A página está demorando mais que o esperado para carregar.
              </p>
            </div>
            
            {(onRetry || showRetry) && (
              <div className="space-y-2">
                <Button 
                  onClick={onRetry || (() => window.location.reload())}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar Novamente
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/dashboard'}
                  className="w-full"
                >
                  Ir para Dashboard
                </Button>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              Tempo decorrido: {Math.round(elapsedTime / 1000)}s
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[200px] flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <div>
          <p className="text-sm font-medium">{message}</p>
          {elapsedTime > 3000 && (
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(elapsedTime / 1000)}s decorridos...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Simplified loading spinner for quick operations
export function SimpleSpinner({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <Loader2 className={`animate-spin text-primary ${sizeClasses[size]}`} />
  );
}

// Page-level loading component
export function PageLoading({ message = "Carregando página..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingFallback 
        message={message}
        timeout={10000}
        showRetry={true}
      />
    </div>
  );
}