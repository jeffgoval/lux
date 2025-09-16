/**
 * Hook para tratamento de erros específicos do Clerk
 * Implementa retry logic e handling para diferentes tipos de erro
 */

import { useCallback, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ClerkError } from '../types/clerk-errors';
import { clerkErrorRecovery } from '../services/clerk-error-recovery';

interface UseClerkErrorHandlerOptions {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: ClerkError) => void;
  onRecovery?: (error: ClerkError) => void;
}

interface UseClerkErrorHandlerReturn {
  handleError: (error: any, context?: Record<string, any>) => Promise<ClerkError>;
  retryOperation: <T>(operation: () => Promise<T>, context?: Record<string, any>) => Promise<T>;
  isRecovering: boolean;
  lastError: ClerkError | null;
  clearError: () => void;
}

export function useClerkErrorHandler(options: UseClerkErrorHandlerOptions = {}): UseClerkErrorHandlerReturn {
  const { signOut } = useAuth();
  const [isRecovering, setIsRecovering] = useState(false);
  const [lastError, setLastError] = useState<ClerkError | null>(null);

  const {
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onRecovery
  } = options;

  const handleError = useCallback(async (error: any, context?: Record<string, any>): Promise<ClerkError> => {
    const clerkError = clerkErrorRecovery.classifyClerkError(error, context);
    setLastError(clerkError);
    
    if (onError) {
      onError(clerkError);
    }

    // Tratar erros específicos do Clerk
    await handleSpecificClerkError(clerkError);
    
    return clerkError;
  }, [onError, signOut]);

  const handleSpecificClerkError = async (error: ClerkError) => {
    switch (error.clerkCode) {
      case 'session_expired':
      case 'session_not_found':
        // Sessão expirada - fazer logout automático
        try {
          await signOut();
        } catch (signOutError) {
          console.warn('Failed to sign out after session error:', signOutError);
        }
        break;
        
      case 'network_error':
      case 'timeout_error':
        // Erros de rede - não fazer logout, apenas reportar
        console.warn('Network error in Clerk operation:', error);
        break;
        
      case 'clerk_missing_publishable_key':
      case 'clerk_invalid_publishable_key':
        // Erros de configuração - reportar como crítico
        console.error('Clerk configuration error:', error);
        break;
    }
  };

  const retryOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> => {
    let lastError: ClerkError | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setIsRecovering(attempt > 1);
        const result = await operation();
        
        if (lastError && onRecovery) {
          onRecovery(lastError);
        }
        
        setIsRecovering(false);
        setLastError(null);
        return result;
        
      } catch (error) {
        const clerkError = await handleError(error, { 
          ...context, 
          attempt,
          maxRetries 
        });
        
        lastError = clerkError;
        
        // Se não é recuperável ou é a última tentativa, falhar
        if (!clerkError.recoverable || attempt === maxRetries) {
          setIsRecovering(false);
          throw clerkError;
        }
        
        // Tentar recovery automático
        try {
          const recoveryResult = await clerkErrorRecovery.recoverFromClerkError(clerkError);
          
          if (!recoveryResult.shouldRetry) {
            setIsRecovering(false);
            throw recoveryResult.newError || clerkError;
          }
          
          // Aguardar antes da próxima tentativa
          const delay = recoveryResult.retryAfter || (retryDelay * Math.pow(2, attempt - 1));
          await new Promise(resolve => setTimeout(resolve, delay));
          
        } catch (recoveryError) {
          setIsRecovering(false);
          throw clerkError;
        }
      }
    }
    
    setIsRecovering(false);
    throw lastError || new Error('Max retries exceeded');
  }, [maxRetries, retryDelay, handleError, onRecovery]);

  const clearError = useCallback(() => {
    setLastError(null);
    setIsRecovering(false);
  }, []);

  return {
    handleError,
    retryOperation,
    isRecovering,
    lastError,
    clearError
  };
}