/**
 * Serviço principal de recovery de erros de autenticação
 * Coordena todas as estratégias de recuperação com sistema de retry e backoff exponencial
 */

import { AuthError, AuthErrorType, RecoveryResult } from '../types/auth-errors';
import {
  AuthenticationRecoveryStrategy,
  DatabaseRecoveryStrategy,
  NetworkRecoveryStrategy,
  ValidationRecoveryStrategy,
  TimeoutRecoveryStrategy,
  AuthorizationRecoveryStrategy
} from './auth-recovery-strategies';

export class AuthErrorRecoveryService {
  private strategies = new Map([
    [AuthErrorType.AUTHENTICATION, new AuthenticationRecoveryStrategy()],
    [AuthErrorType.DATABASE, new DatabaseRecoveryStrategy()],
    [AuthErrorType.NETWORK, new NetworkRecoveryStrategy()],
    [AuthErrorType.VALIDATION, new ValidationRecoveryStrategy()],
    [AuthErrorType.TIMEOUT, new TimeoutRecoveryStrategy()],
    [AuthErrorType.AUTHORIZATION, new AuthorizationRecoveryStrategy()]
  ]);

  private activeRecoveries = new Map<string, Promise<RecoveryResult>>();

  /**
   * Tenta recuperar de um erro usando a estratégia apropriada
   */
  async recoverFromError(error: AuthError): Promise<RecoveryResult> {
    const strategy = this.strategies.get(error.type);
    
    if (!strategy || !strategy.canRecover(error)) {
      return {
        success: false,
        shouldRetry: false,
        newError: {
          ...error,
          recoverable: false
        }
      };
    }

    // Evitar múltiplas tentativas simultâneas do mesmo erro
    const errorKey = this.getErrorKey(error);
    const existingRecovery = this.activeRecoveries.get(errorKey);
    
    if (existingRecovery) {
      return existingRecovery;
    }

    const recoveryPromise = this.executeRecovery(strategy, error);
    this.activeRecoveries.set(errorKey, recoveryPromise);

    try {
      const result = await recoveryPromise;
      return result;
    } finally {
      this.activeRecoveries.delete(errorKey);
    }
  }

  /**
   * Executa retry automático com backoff exponencial
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    errorClassifier: (error: any) => AuthError,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: AuthError | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const authError = errorClassifier(error);
        authError.attemptCount = attempt;
        
        lastError = authError;

        if (attempt === maxRetries || !authError.recoverable) {
          throw authError;
        }

        const recoveryResult = await this.recoverFromError(authError);
        
        if (!recoveryResult.shouldRetry) {
          throw recoveryResult.newError || authError;
        }

        if (recoveryResult.retryAfter) {
          await this.delay(recoveryResult.retryAfter);
        }
      }
    }

    throw lastError;
  }

  /**
   * Classifica um erro genérico em AuthError
   */
  classifyError(error: any, context?: Record<string, any>): AuthError {
    const timestamp = new Date();
    
    // Erros do Supabase
    if (error?.code) {
      switch (error.code) {
        case 'invalid_credentials':
        case 'email_not_confirmed':
        case 'signup_disabled':
          return {
            type: AuthErrorType.AUTHENTICATION,
            message: this.getAuthErrorMessage(error.code),
            code: error.code,
            recoverable: error.code === 'invalid_credentials',
            timestamp,
            context
          };

        case 'insufficient_privileges':
        case 'row_level_security_violation':
          return {
            type: AuthErrorType.AUTHORIZATION,
            message: 'Acesso negado. Verifique suas permissões.',
            code: error.code,
            recoverable: false,
            timestamp,
            context
          };

        case '42P01': // Tabela não existe
        case '23503': // Foreign key violation
        case '23505': // Unique violation
          return {
            type: AuthErrorType.DATABASE,
            message: this.getDatabaseErrorMessage(error.code),
            code: error.code,
            recoverable: error.code !== '42P01',
            timestamp,
            context
          };

        default:
          return {
            type: AuthErrorType.DATABASE,
            message: error.message || 'Erro no banco de dados',
            code: error.code,
            recoverable: true,
            timestamp,
            context
          };
      }
    }

    // Erros de rede
    if (error?.name === 'NetworkError' || error?.message?.includes('fetch')) {
      return {
        type: AuthErrorType.NETWORK,
        message: 'Erro de conexão. Verifique sua internet.',
        recoverable: true,
        timestamp,
        context
      };
    }

    // Erros de timeout
    if (error?.name === 'TimeoutError' || error?.message?.includes('timeout')) {
      return {
        type: AuthErrorType.TIMEOUT,
        message: 'Operação demorou muito para responder.',
        recoverable: true,
        timestamp,
        context
      };
    }

    // Erros de validação
    if (error?.name === 'ValidationError' || error?.message?.includes('validation')) {
      return {
        type: AuthErrorType.VALIDATION,
        message: error.message || 'Dados inválidos',
        recoverable: false,
        timestamp,
        context
      };
    }

    // Erro genérico
    return {
      type: AuthErrorType.NETWORK,
      message: error?.message || 'Erro desconhecido',
      recoverable: true,
      timestamp,
      context
    };
  }

  private async executeRecovery(strategy: any, error: AuthError): Promise<RecoveryResult> {
    try {
      return await strategy.recover(error);
    } catch (recoveryError) {
      return {
        success: false,
        shouldRetry: false,
        newError: {
          ...error,
          message: 'Falha na recuperação do erro',
          recoverable: false
        }
      };
    }
  }

  private getErrorKey(error: AuthError): string {
    return `${error.type}-${error.code || 'generic'}-${error.context?.operation || 'unknown'}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getAuthErrorMessage(code: string): string {
    const messages: Record<string, string> = {
      'invalid_credentials': 'Email ou senha incorretos',
      'email_not_confirmed': 'Email não confirmado. Verifique sua caixa de entrada.',
      'signup_disabled': 'Cadastro temporariamente desabilitado'
    };
    return messages[code] || 'Erro de autenticação';
  }

  private getDatabaseErrorMessage(code: string): string {
    const messages: Record<string, string> = {
      '42P01': 'Estrutura do banco de dados incompleta',
      '23503': 'Referência inválida nos dados',
      '23505': 'Dados duplicados não permitidos'
    };
    return messages[code] || 'Erro no banco de dados';
  }
}

// Instância singleton do serviço
export const authErrorRecovery = new AuthErrorRecoveryService();