/**
 * Hook para tratamento de erros de autenticação
 * Integra com o sistema de recovery e error boundaries
 */

import { useCallback, useState } from 'react';
import { AuthError } from '../types/auth-errors';
import { authErrorRecovery } from '../services/auth-error-recovery';
import { safeAuthOperation, generateErrorContext } from '../utils/auth-error-utils';

interface UseAuthErrorHandlerOptions {
  onError?: (error: AuthError) => void;
  enableAutoRetry?: boolean;
  maxRetries?: number;
}

interface AuthErrorState {
  error: AuthError | null;
  isRecovering: boolean;
  canRetry: boolean;
}

export function useAuthErrorHandler(options: UseAuthErrorHandlerOptions = {}) {
  const [errorState, setErrorState] = useState<AuthErrorState>({
    error: null,
    isRecovering: false,
    canRetry: false
  });

  const handleError = useCallback((error: any, context?: Record<string, any>) => {
    const authError = authErrorRecovery.classifyError(error, context);
    
    setErrorState({
      error: authError,
      isRecovering: false,
      canRetry: authError.recoverable
    });

    if (options.onError) {
      options.onError(authError);
    }

    return authError;
  }, [options.onError]);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isRecovering: false,
      canRetry: false
    });
  }, []);

  const retryOperation = useCallback(async (operation: () => Promise<any>) => {
    if (!errorState.error || !errorState.canRetry) {
      return;
    }

    setErrorState(prev => ({ ...prev, isRecovering: true }));

    try {
      const result = await operation();
      clearError();
      return result;
    } catch (error) {
      const authError = handleError(error);
      setErrorState(prev => ({ 
        ...prev, 
        error: authError,
        isRecovering: false,
        canRetry: authError.recoverable
      }));
      throw authError;
    }
  }, [errorState.error, errorState.canRetry, handleError, clearError]);

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
    additionalContext?: Record<string, any>
  ): Promise<{ data: T | null; error: AuthError | null }> => {
    clearError();
    
    const context = generateErrorContext(operationName, undefined, additionalContext);
    
    try {
      const result = await safeAuthOperation(operation, operationName);
      
      if (result.error) {
        handleError(result.error, context);
      }
      
      return result;
    } catch (error) {
      const authError = handleError(error, context);
      return { data: null, error: authError };
    }
  }, [handleError, clearError]);

  const recoverFromError = useCallback(async () => {
    if (!errorState.error) {
      return false;
    }

    setErrorState(prev => ({ ...prev, isRecovering: true }));

    try {
      const recoveryResult = await authErrorRecovery.recoverFromError(errorState.error);
      
      if (recoveryResult.success) {
        clearError();
        return true;
      }

      setErrorState(prev => ({
        ...prev,
        error: recoveryResult.newError || prev.error,
        isRecovering: false,
        canRetry: recoveryResult.shouldRetry
      }));

      return false;
    } catch (recoveryError) {
      const authError = handleError(recoveryError, { source: 'recovery' });
      setErrorState(prev => ({
        ...prev,
        error: authError,
        isRecovering: false,
        canRetry: authError.recoverable
      }));
      return false;
    }
  }, [errorState.error, handleError, clearError]);

  return {
    // Estado
    error: errorState.error,
    isRecovering: errorState.isRecovering,
    canRetry: errorState.canRetry,
    hasError: !!errorState.error,

    // Ações
    handleError,
    clearError,
    retryOperation,
    executeWithErrorHandling,
    recoverFromError
  };
}