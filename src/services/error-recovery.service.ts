/**
 * 🔧 SERVIÇO DE RECOVERY DE ERROS
 * 
 * Classificação, recovery automático e estratégias de fallback
 */

import { 
  AuthError, 
  AuthErrorType, 
  RecoveryResult, 
  FallbackStrategy, 
  ErrorStats, 
  ErrorReport 
} from '@/types/auth.types';
import { authService } from '@/services/auth.service';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

export class ErrorRecoveryService {
  private errorStats: Map<AuthErrorType, number> = new Map();
  private totalErrors = 0;

  /**
   * Classifica um erro baseado na mensagem e contexto
   */
  classifyError(error: any): AuthError {
    const message = error.message || error.toString();
    const code = error.code;
    const context: Record<string, any> = {};

    // Extrair contexto baseado no tipo de erro
    if (error.status) {
      context.status = error.status;
      context.statusText = error.statusText;
      context.source = 'network';
    }

    if (error.details) {
      context.details = error.details;
      context.source = 'supabase';
    }

    // Classificação por padrões de mensagem
    if (this.isAuthenticationError(message)) {
      return {
        type: AuthErrorType.AUTHENTICATION,
        message,
        code,
        recoverable: message.includes('Token expired'),
        context
      };
    }

    if (this.isAuthorizationError(message)) {
      return {
        type: AuthErrorType.AUTHORIZATION,
        message,
        code,
        recoverable: false,
        context
      };
    }

    if (this.isValidationError(message)) {
      return {
        type: AuthErrorType.VALIDATION,
        message,
        code,
        recoverable: true,
        context
      };
    }

    if (this.isDatabaseError(message)) {
      return {
        type: AuthErrorType.DATABASE,
        message,
        code,
        recoverable: true,
        context
      };
    }

    if (this.isNetworkError(message)) {
      return {
        type: AuthErrorType.NETWORK,
        message,
        code,
        recoverable: true,
        context
      };
    }

    if (this.isTimeoutError(message)) {
      return {
        type: AuthErrorType.TIMEOUT,
        message,
        code,
        recoverable: true,
        retryAfter: 1000,
        context
      };
    }

    // Erro genérico
    return {
      type: AuthErrorType.NETWORK,
      message,
      code,
      recoverable: true,
      context
    };
  }

  /**
   * Tenta recuperar de um erro automaticamente
   */
  async attemptRecovery(error: AuthError): Promise<RecoveryResult> {
    if (!error.recoverable) {
      return { success: false, error: 'Error is not recoverable' };
    }

    try {
      switch (error.type) {
        case AuthErrorType.DATABASE:
          return await this.recoverDatabase(error);
        
        case AuthErrorType.AUTHENTICATION:
          return await this.recoverAuth(error);
        
        case AuthErrorType.NETWORK:
          return await this.recoverNetwork(error);
        
        case AuthErrorType.VALIDATION:
          return await this.recoverValidation(error);
        
        case AuthErrorType.TIMEOUT:
          return await this.recoverTimeout(error);
        
        default:
          return { success: false, error: 'No recovery strategy available' };
      }
    } catch (recoveryError) {
      logger.error('Recovery attempt failed:', recoveryError);
      return { 
        success: false, 
        error: recoveryError.message,
        attemptsUsed: 1
      };
    }
  }

  /**
   * Retry com backoff exponencial
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      baseDelay?: number;
      jitter?: boolean;
    } = {}
  ): Promise<T> {
    const { maxAttempts = 3, baseDelay = 1000, jitter = false } = options;
    
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          throw error;
        }
        
        const delay = this.calculateDelay(attempt, baseDelay, jitter);
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Obtém estratégia de fallback para erro
   */
  getFallbackStrategy(error: AuthError): FallbackStrategy {
    switch (error.type) {
      case AuthErrorType.AUTHENTICATION:
        return {
          action: 'redirect',
          to: '/auth',
          message: 'Authentication required',
          userMessage: 'Please log in again to continue.',
          canRetry: false
        };

      case AuthErrorType.AUTHORIZATION:
        return {
          action: 'show_error',
          message: 'Access denied',
          userMessage: 'You don\'t have permission to access this resource.',
          canRetry: false
        };

      case AuthErrorType.NETWORK:
        return {
          action: 'retry',
          message: 'Network error',
          userMessage: 'Connection problem. Please check your internet.',
          canRetry: true,
          retryAfter: 2000
        };

      case AuthErrorType.DATABASE:
        return {
          action: 'retry',
          message: 'Service unavailable',
          userMessage: 'Service temporarily unavailable. Please try again.',
          canRetry: true,
          retryAfter: 3000
        };

      case AuthErrorType.VALIDATION:
        return {
          action: 'show_error',
          message: 'Validation error',
          userMessage: 'Please check your input and try again.',
          canRetry: true
        };

      case AuthErrorType.TIMEOUT:
        return {
          action: 'retry',
          message: 'Request timeout',
          userMessage: 'Request took too long. Please try again.',
          canRetry: true,
          retryAfter: 1000
        };

      default:
        return {
          action: 'show_error',
          message: 'Unknown error',
          userMessage: 'An unexpected error occurred. Please try again.',
          canRetry: true
        };
    }
  }

  /**
   * Registra erro para estatísticas
   */
  recordError(error: AuthError): void {
    this.totalErrors++;
    const current = this.errorStats.get(error.type) || 0;
    this.errorStats.set(error.type, current + 1);
  }

  /**
   * Obtém estatísticas de erros
   */
  getErrorStats(): ErrorStats {
    const stats = {
      total: this.totalErrors,
      network: this.errorStats.get(AuthErrorType.NETWORK) || 0,
      database: this.errorStats.get(AuthErrorType.DATABASE) || 0,
      authentication: this.errorStats.get(AuthErrorType.AUTHENTICATION) || 0,
      authorization: this.errorStats.get(AuthErrorType.AUTHORIZATION) || 0,
      validation: this.errorStats.get(AuthErrorType.VALIDATION) || 0,
      timeout: this.errorStats.get(AuthErrorType.TIMEOUT) || 0,
      mostFrequent: AuthErrorType.NETWORK
    };

    // Encontrar tipo mais frequente
    let maxCount = 0;
    for (const [type, count] of this.errorStats.entries()) {
      if (count > maxCount) {
        maxCount = count;
        stats.mostFrequent = type;
      }
    }

    return stats;
  }

  /**
   * Gera relatório completo de erros
   */
  generateErrorReport(): ErrorReport {
    const stats = this.getErrorStats();
    
    return {
      totalErrors: stats.total,
      recoverableErrors: stats.network + stats.database + stats.validation + stats.timeout,
      successfulRecoveries: 0, // TODO: Track successful recoveries
      errorsByType: {
        [AuthErrorType.NETWORK]: stats.network,
        [AuthErrorType.DATABASE]: stats.database,
        [AuthErrorType.AUTHENTICATION]: stats.authentication,
        [AuthErrorType.AUTHORIZATION]: stats.authorization,
        [AuthErrorType.VALIDATION]: stats.validation,
        [AuthErrorType.TIMEOUT]: stats.timeout
      },
      timestamp: new Date()
    };
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  private isAuthenticationError(message: string): boolean {
    const patterns = [
      'invalid credentials',
      'user not found',
      'password incorrect',
      'account locked',
      'token expired',
      'authentication failed'
    ];
    return patterns.some(pattern => message.toLowerCase().includes(pattern));
  }

  private isAuthorizationError(message: string): boolean {
    const patterns = [
      'insufficient permissions',
      'access denied',
      'role required',
      'permission denied',
      'unauthorized'
    ];
    return patterns.some(pattern => message.toLowerCase().includes(pattern));
  }

  private isValidationError(message: string): boolean {
    const patterns = [
      'invalid email format',
      'password too short',
      'required field missing',
      'invalid phone number',
      'validation failed'
    ];
    return patterns.some(pattern => message.toLowerCase().includes(pattern));
  }

  private isDatabaseError(message: string): boolean {
    const patterns = [
      'connection failed',
      'query timeout',
      'database unavailable',
      'transaction failed',
      'connection timeout'
    ];
    return patterns.some(pattern => message.toLowerCase().includes(pattern));
  }

  private isNetworkError(message: string): boolean {
    const patterns = [
      'network error',
      'connection refused',
      'dns resolution failed',
      'fetch failed',
      'network request failed'
    ];
    return patterns.some(pattern => message.toLowerCase().includes(pattern));
  }

  private isTimeoutError(message: string): boolean {
    const patterns = [
      'request timeout',
      'operation timed out',
      'timeout exceeded',
      'response timeout'
    ];
    return patterns.some(pattern => message.toLowerCase().includes(pattern));
  }

  private async recoverDatabase(error: AuthError): Promise<RecoveryResult> {
    try {
      // Tentar reconectar ao banco
      const { data, error: dbError } = await supabase.auth.getUser();
      
      if (dbError) {
        throw dbError;
      }

      return {
        success: true,
        strategy: 'database_reconnect',
        attemptsUsed: 1
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        attemptsUsed: 1
      };
    }
  }

  private async recoverAuth(error: AuthError): Promise<RecoveryResult> {
    try {
      // Tentar refresh de tokens
      const result = await authService.refreshTokens();
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        success: true,
        strategy: 'token_refresh',
        attemptsUsed: 1
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        attemptsUsed: 1
      };
    }
  }

  private async recoverNetwork(error: AuthError): Promise<RecoveryResult> {
    return await this.retryWithBackoff(
      async () => {
        const { data, error: networkError } = await supabase.auth.getUser();
        if (networkError) throw networkError;
        return data;
      },
      { maxAttempts: 3, baseDelay: 1000, jitter: true }
    ).then(() => ({
      success: true,
      strategy: 'network_retry',
      attemptsUsed: 3
    })).catch(err => ({
      success: false,
      error: err.message,
      attemptsUsed: 3
    }));
  }

  private async recoverValidation(error: AuthError): Promise<RecoveryResult> {
    const suggestions: string[] = [];

    if (error.message.includes('email')) {
      suggestions.push('Please check email format');
    }
    if (error.message.includes('phone')) {
      suggestions.push('Format: +55 11 99999-9999');
    }
    if (error.message.includes('password')) {
      suggestions.push('Password must be at least 8 characters');
    }

    return {
      success: false,
      error: 'Validation errors cannot be auto-fixed',
      suggestions,
      attemptsUsed: 0
    };
  }

  private async recoverTimeout(error: AuthError): Promise<RecoveryResult> {
    // Para timeouts, apenas aguardar e tentar novamente
    await this.sleep(error.retryAfter || 1000);
    
    return {
      success: true,
      strategy: 'timeout_retry',
      attemptsUsed: 1
    };
  }

  private calculateDelay(attempt: number, baseDelay: number, jitter: boolean): number {
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    
    if (!jitter) {
      return exponentialDelay;
    }
    
    // Adicionar jitter de ±50%
    const jitterRange = exponentialDelay * 0.5;
    const jitterOffset = (Math.random() - 0.5) * 2 * jitterRange;
    
    return Math.max(0, exponentialDelay + jitterOffset);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}