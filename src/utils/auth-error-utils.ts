/**
 * Utilitários para tratamento de erros de autenticação
 * Funções auxiliares para classificação e formatação de erros
 */

import { AuthError, AuthErrorType } from '../types/auth-errors';
import { authErrorRecovery } from '../services/auth-error-recovery';

/**
 * Wrapper para operações que podem falhar com retry automático
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  context?: Record<string, any>,
  maxRetries: number = 3
): Promise<T> {
  return authErrorRecovery.retryWithBackoff(
    operation,
    (error) => authErrorRecovery.classifyError(error, context),
    maxRetries
  );
}

/**
 * Classifica e formata erro para exibição ao usuário
 */
export function formatErrorForUser(error: AuthError): string {
  const baseMessage = error.message;
  
  if (!error.recoverable) {
    return baseMessage;
  }

  const retryMessage = error.retryAfter 
    ? ` Tentando novamente em ${Math.ceil(error.retryAfter / 1000)} segundos...`
    : ' Tentando novamente...';

  return baseMessage + retryMessage;
}

/**
 * Verifica se um erro é crítico (não recuperável)
 */
export function isCriticalError(error: AuthError): boolean {
  return !error.recoverable || 
         error.type === AuthErrorType.AUTHORIZATION ||
         (error.type === AuthErrorType.DATABASE && error.code === '42P01');
}

/**
 * Cria um AuthError a partir de um erro genérico
 */
export function createAuthError(
  type: AuthErrorType,
  message: string,
  options: Partial<AuthError> = {}
): AuthError {
  return {
    type,
    message,
    recoverable: true,
    timestamp: new Date(),
    ...options
  };
}

/**
 * Wrapper para operações de autenticação com tratamento de erro
 */
export async function safeAuthOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<{ data: T | null; error: AuthError | null }> {
  try {
    const data = await withRetry(operation, { operation: operationName });
    return { data, error: null };
  } catch (error) {
    const authError = authErrorRecovery.classifyError(error, { operation: operationName });
    return { data: null, error: authError };
  }
}

/**
 * Determina se deve mostrar retry button para o usuário
 */
export function shouldShowRetryButton(error: AuthError): boolean {
  return error.recoverable && 
         error.type !== AuthErrorType.VALIDATION &&
         (error.attemptCount || 0) < 3;
}

/**
 * Gera contexto adicional para logging de erros
 */
export function generateErrorContext(
  operation: string,
  userId?: string,
  additionalContext?: Record<string, any>
): Record<string, any> {
  return {
    operation,
    userId,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...additionalContext
  };
}