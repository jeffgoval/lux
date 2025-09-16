/**
 * Contexto global para tratamento de erros de autenticação
 * Centraliza o estado de erros e recovery em toda a aplicação
 */

import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { AuthError } from '../types/auth-errors';
import { authErrorRecovery } from '../services/auth-error-recovery';

interface AuthErrorContextValue {
  // Estado global de erros
  globalError: AuthError | null;
  isGlobalRecovering: boolean;
  errorHistory: AuthError[];

  // Ações
  reportError: (error: any, context?: Record<string, any>) => AuthError;
  clearGlobalError: () => void;
  recoverFromGlobalError: () => Promise<boolean>;
  
  // Configurações
  enableGlobalRecovery: boolean;
  setEnableGlobalRecovery: (enabled: boolean) => void;
}

const AuthErrorContext = createContext<AuthErrorContextValue | undefined>(undefined);

interface Props {
  children: ReactNode;
  maxErrorHistory?: number;
  enableGlobalRecovery?: boolean;
}

export const AuthErrorProvider: React.FC<Props> = ({
  children,
  maxErrorHistory = 10,
  enableGlobalRecovery = true
}) => {
  const [globalError, setGlobalError] = useState<AuthError | null>(null);
  const [isGlobalRecovering, setIsGlobalRecovering] = useState(false);
  const [errorHistory, setErrorHistory] = useState<AuthError[]>([]);
  const [enableRecovery, setEnableRecovery] = useState(enableGlobalRecovery);

  const reportError = useCallback((error: any, context?: Record<string, any>): AuthError => {
    const authError = authErrorRecovery.classifyError(error, {
      ...context,
      source: 'GlobalErrorHandler',
      timestamp: new Date().toISOString()
    });

    // Atualizar histórico de erros
    setErrorHistory(prev => {
      const newHistory = [authError, ...prev];
      return newHistory.slice(0, maxErrorHistory);
    });

    // Definir como erro global se for crítico ou se não há erro global atual
    if (!globalError || authError.type === 'authorization' || authError.type === 'authentication') {
      setGlobalError(authError);
    }

    // Log estruturado
    console.error('Global auth error reported:', {
      error: authError,
      context,
      timestamp: new Date().toISOString()
    });

    return authError;
  }, [globalError, maxErrorHistory]);

  const clearGlobalError = useCallback(() => {
    setGlobalError(null);
    setIsGlobalRecovering(false);
  }, []);

  const recoverFromGlobalError = useCallback(async (): Promise<boolean> => {
    if (!globalError || !enableRecovery) {
      return false;
    }

    setIsGlobalRecovering(true);

    try {
      const recoveryResult = await authErrorRecovery.recoverFromError(globalError);
      
      if (recoveryResult.success) {
        clearGlobalError();
        return true;
      }

      // Atualizar erro com resultado do recovery
      if (recoveryResult.newError) {
        setGlobalError(recoveryResult.newError);
      }

      setIsGlobalRecovering(false);
      return false;
    } catch (recoveryError) {
      const newError = authErrorRecovery.classifyError(recoveryError, {
        source: 'GlobalRecovery',
        originalError: globalError
      });
      
      setGlobalError(newError);
      setIsGlobalRecovering(false);
      return false;
    }
  }, [globalError, enableRecovery, clearGlobalError]);

  const setEnableGlobalRecovery = useCallback((enabled: boolean) => {
    setEnableRecovery(enabled);
  }, []);

  const contextValue: AuthErrorContextValue = {
    globalError,
    isGlobalRecovering,
    errorHistory,
    reportError,
    clearGlobalError,
    recoverFromGlobalError,
    enableGlobalRecovery: enableRecovery,
    setEnableGlobalRecovery
  };

  return (
    <AuthErrorContext.Provider value={contextValue}>
      {children}
    </AuthErrorContext.Provider>
  );
};

export const useAuthErrorContext = (): AuthErrorContextValue => {
  const context = useContext(AuthErrorContext);
  
  if (context === undefined) {
    throw new Error('useAuthErrorContext must be used within an AuthErrorProvider');
  }
  
  return context;
};

// Hook para reportar erros facilmente
export const useErrorReporter = () => {
  const { reportError } = useAuthErrorContext();
  
  return useCallback((error: any, context?: Record<string, any>) => {
    return reportError(error, context);
  }, [reportError]);
};