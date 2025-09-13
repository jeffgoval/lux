import { useEffect, useState } from 'react';

interface QuickLoaderProps {
  message?: string;
  timeout?: number;
  onTimeout?: () => void;
  minimal?: boolean;
}

/**
 * Loader otimizado e leve para situações que precisam de feedback rápido
 * Evita layouts complexos e animações pesadas
 */
export function QuickLoader({ 
  message = "Carregando...", 
  timeout = 3000,
  onTimeout,
  minimal = false 
}: QuickLoaderProps) {
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    if (timeout && onTimeout) {
      const timer = setTimeout(() => {
        setShowTimeout(true);
        onTimeout();
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [timeout, onTimeout]);

  if (minimal) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">{message}</p>
        {showTimeout && (
          <p className="text-xs text-destructive">
            Carregamento demorado. Verifique sua conexão.
          </p>
        )}
      </div>
    </div>
  );
}