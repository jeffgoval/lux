/**
 * Sistema de classificação e recovery de erros de autenticação
 * Implementa enum AuthErrorType e interface AuthError conforme design
 */

export enum AuthErrorType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  DATABASE = 'database',
  NETWORK = 'network',
  TIMEOUT = 'timeout'
}

export interface AuthError {
  type: AuthErrorType;
  message: string;
  code?: string;
  recoverable: boolean;
  retryAfter?: number;
  context?: Record<string, any>;
  timestamp: Date;
  attemptCount?: number;
}

export interface RecoveryResult {
  success: boolean;
  shouldRetry: boolean;
  retryAfter?: number;
  newError?: AuthError;
}

export abstract class RecoveryStrategy {
  abstract readonly type: AuthErrorType;
  abstract readonly maxAttempts: number;
  abstract readonly backoffMs: number;

  abstract canRecover(error: AuthError): boolean;
  abstract recover(error: AuthError): Promise<RecoveryResult>;

  protected calculateBackoff(attemptCount: number): number {
    return Math.min(this.backoffMs * Math.pow(2, attemptCount - 1), 30000); // Max 30s
  }

  protected shouldRetry(error: AuthError): boolean {
    const attempts = error.attemptCount || 0;
    return attempts < this.maxAttempts && error.recoverable;
  }
}