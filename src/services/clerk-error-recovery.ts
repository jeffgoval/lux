/**
 * Serviço de recovery específico para erros do Clerk
 * Implementa estratégias de recuperação para diferentes tipos de erro do Clerk
 */

import { ClerkError, ClerkErrorType, CLERK_ERROR_CODES, CLERK_ERROR_MESSAGES } from '../types/clerk-errors';
import { AuthErrorType, RecoveryResult } from '../types/auth-errors';

export class ClerkErrorRecoveryService {
  /**
   * Classifica um erro do Clerk em ClerkError
   */
  classifyClerkError(error: any, context?: Record<string, any>): ClerkError {
    const timestamp = new Date();
    
    // Verificar se é um erro do Clerk
    if (this.isClerkError(error)) {
      const clerkCode = this.extractClerkCode(error);
      const clerkErrorType = this.mapClerkCodeToType(clerkCode);
      
      return {
        type: this.mapClerkTypeToAuthType(clerkErrorType),
        message: this.getClerkErrorMessage(clerkErrorType, error),
        code: clerkCode,
        clerkCode,
        clerkMessage: error.longMessage || error.message,
        recoverable: this.isRecoverable(clerkErrorType),
        retryAfter: this.getRetryDelay(clerkErrorType),
        timestamp,
        context,
        isClerkError: true
      };
    }

    // Erro genérico tratado como erro do Clerk
    return {
      type: AuthErrorType.NETWORK,
      message: error?.message || 'Erro desconhecido no sistema de autenticação',
      recoverable: true,
      timestamp,
      context,
      isClerkError: true
    };
  }

  /**
   * Tenta recuperar de um erro do Clerk
   */
  async recoverFromClerkError(error: ClerkError): Promise<RecoveryResult> {
    if (!error.recoverable) {
      return {
        success: false,
        shouldRetry: false,
        newError: error
      };
    }

    switch (error.clerkCode) {
      case 'session_expired':
      case 'session_not_found':
        return this.handleSessionError(error);
        
      case 'network_error':
      case 'timeout_error':
        return this.handleNetworkError(error);
        
      case 'clerk_missing_publishable_key':
      case 'clerk_invalid_publishable_key':
        return this.handleConfigurationError(error);
        
      default:
        return this.handleGenericError(error);
    }
  }

  private isClerkError(error: any): boolean {
    return (
      error?.clerkError === true ||
      error?.code?.startsWith?.('clerk_') ||
      error?.message?.includes?.('Clerk') ||
      error?.longMessage?.includes?.('Clerk') ||
      typeof error?.code === 'string' && Object.keys(CLERK_ERROR_CODES).includes(error.code)
    );
  }

  private extractClerkCode(error: any): string {
    return error?.code || 
           error?.clerkCode || 
           error?.type ||
           'unknown_clerk_error';
  }

  private mapClerkCodeToType(code: string): ClerkErrorType {
    return CLERK_ERROR_CODES[code as keyof typeof CLERK_ERROR_CODES] || ClerkErrorType.CLERK_NETWORK;
  }

  private mapClerkTypeToAuthType(clerkType: ClerkErrorType): AuthErrorType {
    switch (clerkType) {
      case ClerkErrorType.CLERK_AUTHENTICATION:
        return AuthErrorType.AUTHENTICATION;
      case ClerkErrorType.CLERK_AUTHORIZATION:
        return AuthErrorType.AUTHORIZATION;
      case ClerkErrorType.CLERK_VALIDATION:
        return AuthErrorType.VALIDATION;
      case ClerkErrorType.CLERK_SESSION:
        return AuthErrorType.AUTHENTICATION;
      case ClerkErrorType.CLERK_CONFIGURATION:
        return AuthErrorType.VALIDATION;
      case ClerkErrorType.CLERK_NETWORK:
      default:
        return AuthErrorType.NETWORK;
    }
  }

  private getClerkErrorMessage(clerkType: ClerkErrorType, originalError: any): string {
    const baseMessage = CLERK_ERROR_MESSAGES[clerkType];
    
    // Adicionar detalhes específicos quando disponível
    if (originalError?.longMessage) {
      return `${baseMessage}: ${originalError.longMessage}`;
    }
    
    if (originalError?.message && !originalError.message.includes('Clerk')) {
      return `${baseMessage}: ${originalError.message}`;
    }
    
    return baseMessage;
  }

  private isRecoverable(clerkType: ClerkErrorType): boolean {
    switch (clerkType) {
      case ClerkErrorType.CLERK_NETWORK:
      case ClerkErrorType.CLERK_SESSION:
        return true;
      case ClerkErrorType.CLERK_CONFIGURATION:
      case ClerkErrorType.CLERK_VALIDATION:
        return false;
      case ClerkErrorType.CLERK_AUTHENTICATION:
      case ClerkErrorType.CLERK_AUTHORIZATION:
        return false; // Requer intervenção do usuário
      default:
        return true;
    }
  }

  private getRetryDelay(clerkType: ClerkErrorType): number | undefined {
    switch (clerkType) {
      case ClerkErrorType.CLERK_NETWORK:
        return 2000; // 2 segundos
      case ClerkErrorType.CLERK_SESSION:
        return 1000; // 1 segundo
      default:
        return undefined;
    }
  }

  private async handleSessionError(error: ClerkError): Promise<RecoveryResult> {
    try {
      // Para erros de sessão, redirecionar para login
      return {
        success: false,
        shouldRetry: false,
        newError: {
          ...error,
          message: 'Sua sessão expirou. Você será redirecionado para fazer login novamente.',
          recoverable: false
        }
      };
    } catch (recoveryError) {
      return {
        success: false,
        shouldRetry: false,
        newError: error
      };
    }
  }

  private async handleNetworkError(error: ClerkError): Promise<RecoveryResult> {
    const attempts = (error.attemptCount || 0) + 1;
    const maxAttempts = 3;
    
    if (attempts >= maxAttempts) {
      return {
        success: false,
        shouldRetry: false,
        newError: {
          ...error,
          message: 'Não foi possível conectar ao servidor de autenticação. Tente novamente mais tarde.',
          recoverable: false
        }
      };
    }

    return {
      success: false,
      shouldRetry: true,
      retryAfter: Math.min(1000 * Math.pow(2, attempts - 1), 10000) // Backoff exponencial até 10s
    };
  }

  private async handleConfigurationError(error: ClerkError): Promise<RecoveryResult> {
    return {
      success: false,
      shouldRetry: false,
      newError: {
        ...error,
        message: 'Erro de configuração do sistema. Contate o suporte técnico.',
        recoverable: false
      }
    };
  }

  private async handleGenericError(error: ClerkError): Promise<RecoveryResult> {
    const attempts = (error.attemptCount || 0) + 1;
    const maxAttempts = 2;
    
    return {
      success: false,
      shouldRetry: attempts < maxAttempts,
      retryAfter: attempts < maxAttempts ? 3000 : undefined
    };
  }
}

// Instância singleton do serviço
export const clerkErrorRecovery = new ClerkErrorRecoveryService();