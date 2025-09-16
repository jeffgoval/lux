/**
 * 🔄 COMPONENTES DE LOADING APRIMORADOS
 * 
 * Loading states granulares, timeout visual e feedback claro
 */

import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type LoadingState = 
  | 'idle'
  | 'initializing'
  | 'loading'
  | 'profile_loading'
  | 'roles_loading'
  | 'onboarding_loading'
  | 'success'
  | 'error'
  | 'timeout';

interface LoadingProps {
  state: LoadingState;
  message?: string;
  timeout?: number;
  onTimeout?: () => void;
  onRetry?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  progress?: number;
}

interface ProgressBarProps {
  progress: number;
  className?: string;
  animated?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

interface LoadingOverlayProps {
  isVisible: boolean;
  state: LoadingState;
  message?: string;
  onCancel?: () => void;
}

// ============================================================================
// COMPONENTE DE LOADING PRINCIPAL
// ============================================================================

export function EnhancedLoading({
  state,
  message,
  timeout = 30000, // 30 segundos default
  onTimeout,
  onRetry,
  className,
  size = 'md',
  showProgress = false,
  progress = 0
}: LoadingProps) {
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer para timeout
  useEffect(() => {
    if (state === 'loading' || state === 'profile_loading' || state === 'roles_loading' || state === 'onboarding_loading') {
      setTimeoutReached(false);
      setElapsedTime(0);

      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setElapsedTime(elapsed);

        if (elapsed >= timeout) {
          setTimeoutReached(true);
          onTimeout?.();
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [state, timeout, onTimeout]);

  // Configurações de tamanho
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const containerClasses = {
    sm: 'gap-2 text-sm',
    md: 'gap-3 text-base',
    lg: 'gap-4 text-lg'
  };

  // Renderizar baseado no estado
  const renderContent = () => {
    switch (state) {
      case 'idle':
        return null;

      case 'initializing':
        return (
          <div className={cn('flex items-center', containerClasses[size])}>
            <Loader2 className={cn('animate-spin text-blue-500', sizeClasses[size])} />
            <span className="text-gray-600">Inicializando sistema...</span>
          </div>
        );

      case 'loading':
        return (
          <div className={cn('flex flex-col items-center', containerClasses[size])}>
            <div className="flex items-center gap-3">
              <Loader2 className={cn('animate-spin text-blue-500', sizeClasses[size])} />
              <span className="text-gray-600">
                {message || 'Carregando...'}
              </span>
            </div>
            {showProgress && (
              <ProgressBar 
                progress={progress} 
                className="mt-2 w-full max-w-xs"
                animated
              />
            )}
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{Math.floor(elapsedTime / 1000)}s</span>
            </div>
          </div>
        );

      case 'profile_loading':
        return (
          <div className={cn('flex items-center', containerClasses[size])}>
            <Loader2 className={cn('animate-spin text-green-500', sizeClasses[size])} />
            <span className="text-gray-600">Carregando perfil...</span>
            <div className="ml-2 text-xs text-gray-400">
              {Math.floor(elapsedTime / 1000)}s
            </div>
          </div>
        );

      case 'roles_loading':
        return (
          <div className={cn('flex items-center', containerClasses[size])}>
            <Loader2 className={cn('animate-spin text-purple-500', sizeClasses[size])} />
            <span className="text-gray-600">Carregando permissões...</span>
            <div className="ml-2 text-xs text-gray-400">
              {Math.floor(elapsedTime / 1000)}s
            </div>
          </div>
        );

      case 'onboarding_loading':
        return (
          <div className={cn('flex flex-col items-center', containerClasses[size])}>
            <div className="flex items-center gap-3">
              <Loader2 className={cn('animate-spin text-orange-500', sizeClasses[size])} />
              <span className="text-gray-600">Configurando sua conta...</span>
            </div>
            {showProgress && (
              <ProgressBar 
                progress={progress} 
                className="mt-3 w-full max-w-sm"
                animated
                color="yellow"
              />
            )}
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{Math.floor(elapsedTime / 1000)}s</span>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className={cn('flex items-center text-green-600', containerClasses[size])}>
            <CheckCircle className={cn(sizeClasses[size])} />
            <span>{message || 'Concluído com sucesso!'}</span>
          </div>
        );

      case 'error':
        return (
          <div className={cn('flex flex-col items-center text-red-600', containerClasses[size])}>
            <div className="flex items-center gap-3">
              <AlertCircle className={cn(sizeClasses[size])} />
              <span>{message || 'Ocorreu um erro'}</span>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                Tentar novamente
              </button>
            )}
          </div>
        );

      case 'timeout':
        return (
          <div className={cn('flex flex-col items-center text-yellow-600', containerClasses[size])}>
            <div className="flex items-center gap-3">
              <WifiOff className={cn(sizeClasses[size])} />
              <span>Operação demorou mais que o esperado</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Tempo limite: {timeout / 1000}s
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
              >
                Tentar novamente
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (timeoutReached && state !== 'timeout') {
    return (
      <div className={cn('flex flex-col items-center text-yellow-600', containerClasses[size])}>
        <div className="flex items-center gap-3">
          <WifiOff className={cn(sizeClasses[size])} />
          <span>Operação demorou mais que o esperado</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
          >
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex justify-center items-center p-4', className)}>
      {renderContent()}
    </div>
  );
}

// ============================================================================
// COMPONENTE DE BARRA DE PROGRESSO
// ============================================================================

export function ProgressBar({
  progress,
  className,
  animated = false,
  color = 'blue'
}: ProgressBarProps) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };

  return (
    <div className={cn('w-full bg-gray-200 rounded-full h-2', className)}>
      <div
        className={cn(
          'h-2 rounded-full transition-all duration-300',
          colorClasses[color],
          animated && 'animate-pulse'
        )}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}

// ============================================================================
// COMPONENTE DE OVERLAY DE LOADING
// ============================================================================

export function LoadingOverlay({
  isVisible,
  state,
  message,
  onCancel
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <EnhancedLoading
          state={state}
          message={message}
          size="lg"
          showProgress={state === 'onboarding_loading'}
          progress={state === 'onboarding_loading' ? 75 : 0}
        />
        
        {onCancel && state !== 'success' && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE DE STATUS DE CONEXÃO
// ============================================================================

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 z-50">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span className="text-sm">Sem conexão com a internet</span>
      </div>
    </div>
  );
}

// ============================================================================
// HOOK PARA GERENCIAR ESTADOS DE LOADING
// ============================================================================

export function useLoadingState(initialState: LoadingState = 'idle') {
  const [state, setState] = useState<LoadingState>(initialState);
  const [message, setMessage] = useState<string>('');
  const [progress, setProgress] = useState(0);

  const setLoading = (newState: LoadingState, newMessage?: string) => {
    setState(newState);
    if (newMessage) setMessage(newMessage);
  };

  const setLoadingProgress = (newProgress: number) => {
    setProgress(newProgress);
  };

  const reset = () => {
    setState('idle');
    setMessage('');
    setProgress(0);
  };

  return {
    state,
    message,
    progress,
    setLoading,
    setLoadingProgress,
    reset,
    isLoading: ['loading', 'profile_loading', 'roles_loading', 'onboarding_loading', 'initializing'].includes(state)
  };
}