/**
 * Implementação das estratégias de recovery para cada tipo de erro
 * Cada estratégia implementa lógica específica de recuperação
 */

import { AuthErrorType, AuthError, RecoveryStrategy, RecoveryResult } from '../types/auth-errors';
import { supabase } from '../integrations/supabase/client';

export class AuthenticationRecoveryStrategy extends RecoveryStrategy {
  readonly type = AuthErrorType.AUTHENTICATION;
  readonly maxAttempts = 3;
  readonly backoffMs = 1000;

  canRecover(error: AuthError): boolean {
    return error.type === AuthErrorType.AUTHENTICATION && 
           error.recoverable && 
           this.shouldRetry(error);
  }

  async recover(error: AuthError): Promise<RecoveryResult> {
    try {
      // Tentar refresh do token
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        return {
          success: false,
          shouldRetry: false,
          newError: {
            ...error,
            message: 'Falha ao renovar sessão. Faça login novamente.',
            recoverable: false
          }
        };
      }

      return {
        success: true,
        shouldRetry: false
      };
    } catch (recoveryError) {
      const attempts = (error.attemptCount || 0) + 1;
      return {
        success: false,
        shouldRetry: attempts < this.maxAttempts,
        retryAfter: this.calculateBackoff(attempts)
      };
    }
  }
}

export class DatabaseRecoveryStrategy extends RecoveryStrategy {
  readonly type = AuthErrorType.DATABASE;
  readonly maxAttempts = 2;
  readonly backoffMs = 2000;

  canRecover(error: AuthError): boolean {
    return error.type === AuthErrorType.DATABASE && 
           error.recoverable && 
           this.shouldRetry(error);
  }

  async recover(error: AuthError): Promise<RecoveryResult> {
    try {
      // Verificar se é erro de tabela faltante
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return {
          success: false,
          shouldRetry: false,
          newError: {
            ...error,
            message: 'Estrutura do banco de dados incompleta. Contate o suporte.',
            recoverable: false
          }
        };
      }

      // Para outros erros de DB, tentar novamente após backoff
      const attempts = (error.attemptCount || 0) + 1;
      return {
        success: false,
        shouldRetry: attempts < this.maxAttempts,
        retryAfter: this.calculateBackoff(attempts)
      };
    } catch (recoveryError) {
      return {
        success: false,
        shouldRetry: false
      };
    }
  }
}

export class NetworkRecoveryStrategy extends RecoveryStrategy {
  readonly type = AuthErrorType.NETWORK;
  readonly maxAttempts = 5;
  readonly backoffMs = 1000;

  canRecover(error: AuthError): boolean {
    return error.type === AuthErrorType.NETWORK && 
           error.recoverable && 
           this.shouldRetry(error);
  }

  async recover(error: AuthError): Promise<RecoveryResult> {
    try {
      // Verificar conectividade básica
      const response = await fetch(supabase.supabaseUrl + '/rest/v1/', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        return {
          success: true,
          shouldRetry: false
        };
      }

      const attempts = (error.attemptCount || 0) + 1;
      return {
        success: false,
        shouldRetry: attempts < this.maxAttempts,
        retryAfter: this.calculateBackoff(attempts)
      };
    } catch (recoveryError) {
      const attempts = (error.attemptCount || 0) + 1;
      return {
        success: false,
        shouldRetry: attempts < this.maxAttempts,
        retryAfter: this.calculateBackoff(attempts)
      };
    }
  }
}

export class ValidationRecoveryStrategy extends RecoveryStrategy {
  readonly type = AuthErrorType.VALIDATION;
  readonly maxAttempts = 1;
  readonly backoffMs = 0;

  canRecover(error: AuthError): boolean {
    return error.type === AuthErrorType.VALIDATION && error.recoverable;
  }

  async recover(error: AuthError): Promise<RecoveryResult> {
    // Erros de validação geralmente não são recuperáveis automaticamente
    // Requerem intervenção do usuário
    return {
      success: false,
      shouldRetry: false,
      newError: {
        ...error,
        message: error.message || 'Dados inválidos. Verifique as informações fornecidas.',
        recoverable: false
      }
    };
  }
}

export class TimeoutRecoveryStrategy extends RecoveryStrategy {
  readonly type = AuthErrorType.TIMEOUT;
  readonly maxAttempts = 3;
  readonly backoffMs = 2000;

  canRecover(error: AuthError): boolean {
    return error.type === AuthErrorType.TIMEOUT && 
           error.recoverable && 
           this.shouldRetry(error);
  }

  async recover(error: AuthError): Promise<RecoveryResult> {
    const attempts = (error.attemptCount || 0) + 1;
    
    // Para timeouts, simplesmente tentar novamente com backoff
    return {
      success: false,
      shouldRetry: attempts < this.maxAttempts,
      retryAfter: this.calculateBackoff(attempts)
    };
  }
}

export class AuthorizationRecoveryStrategy extends RecoveryStrategy {
  readonly type = AuthErrorType.AUTHORIZATION;
  readonly maxAttempts = 1;
  readonly backoffMs = 0;

  canRecover(error: AuthError): boolean {
    return error.type === AuthErrorType.AUTHORIZATION && error.recoverable;
  }

  async recover(error: AuthError): Promise<RecoveryResult> {
    // Erros de autorização geralmente requerem re-autenticação
    return {
      success: false,
      shouldRetry: false,
      newError: {
        ...error,
        message: 'Acesso negado. Faça login novamente.',
        recoverable: false
      }
    };
  }
}