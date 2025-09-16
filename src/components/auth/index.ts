/**
 * Exportações centralizadas dos componentes de autenticação
 */

export { AuthHeader } from './AuthHeader';
export { AuthErrorBoundary } from './AuthErrorBoundary';
export { AuthErrorFallback } from './AuthErrorFallback';
export { ClerkErrorBoundary } from './ClerkErrorBoundary';
export { ClerkErrorFallback } from './ClerkErrorFallback';
export { 
  withAuthErrorHandling,
  withAuthErrorHandlingStrict,
  withAuthErrorHandlingAggressive,
  withAuthErrorHandlingDefault
} from './withAuthErrorHandling';

// Re-exportar tipos e utilitários relacionados
export type { AuthError, AuthErrorType, RecoveryResult } from '../../types/auth-errors';
export type { ClerkError, ClerkErrorType } from '../../types/clerk-errors';
export { authErrorRecovery } from '../../services/auth-error-recovery';
export { clerkErrorRecovery } from '../../services/clerk-error-recovery';
export { useAuthErrorHandler } from '../../hooks/useAuthErrorHandler';
export { 
  AuthErrorProvider, 
  useAuthErrorContext, 
  useErrorReporter 
} from '../../contexts/AuthErrorContext';