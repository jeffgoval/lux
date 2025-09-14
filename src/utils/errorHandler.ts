/**
 * 🛡️ SISTEMA DE TRATAMENTO DE ERROS ROBUSTO
 * 
 * Sistema centralizado para tratamento de erros com fallbacks,
 * recuperação automática e logging estruturado.
 */

import { authLogger, criticalLog } from './logger';

// ============================================================================
// TIPOS DE ERRO
// ============================================================================

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  DATABASE = 'DATABASE',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  originalError?: Error;
  context?: Record<string, any>;
  recoverable: boolean;
  timestamp: Date;
}

// ============================================================================
// CLASSES DE ERRO PERSONALIZADAS
// ============================================================================

export class NetworkError extends Error {
  public readonly type = ErrorType.NETWORK;
  public readonly severity = ErrorSeverity.MEDIUM;
  public readonly recoverable = true;

  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends Error {
  public readonly type = ErrorType.AUTHENTICATION;
  public readonly severity = ErrorSeverity.HIGH;
  public readonly recoverable = false;

  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  public readonly type = ErrorType.AUTHORIZATION;
  public readonly severity = ErrorSeverity.HIGH;
  public readonly recoverable = false;

  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends Error {
  public readonly type = ErrorType.VALIDATION;
  public readonly severity = ErrorSeverity.LOW;
  public readonly recoverable = true;

  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  public readonly type = ErrorType.DATABASE;
  public readonly severity = ErrorSeverity.HIGH;
  public readonly recoverable = true;

  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// ============================================================================
// ANALISADOR DE ERROS
// ============================================================================

export class ErrorAnalyzer {
  static analyze(error: any): AppError {
    const timestamp = new Date();
    
    // Erro de rede
    if (error instanceof NetworkError || 
        error?.message?.includes('Network') ||
        error?.message?.includes('fetch') ||
        error?.code === 'NETWORK_ERROR') {
      return {
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: error.message || 'Erro de conexão',
        originalError: error,
        recoverable: true,
        timestamp
      };
    }

    // Erro de autenticação
    if (error instanceof AuthenticationError ||
        error?.message?.includes('JWT') ||
        error?.message?.includes('token') ||
        error?.code === 'PGRST301' ||
        error?.code === 'UNAUTHORIZED') {
      return {
        type: ErrorType.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        message: error.message || 'Erro de autenticação',
        originalError: error,
        recoverable: false,
        timestamp
      };
    }

    // Erro de autorização
    if (error instanceof AuthorizationError ||
        error?.code === '42501' ||
        error?.message?.includes('permission') ||
        error?.message?.includes('insufficient_privilege')) {
      return {
        type: ErrorType.AUTHORIZATION,
        severity: ErrorSeverity.HIGH,
        message: error.message || 'Erro de permissão',
        originalError: error,
        recoverable: false,
        timestamp
      };
    }

    // Erro de validação
    if (error instanceof ValidationError ||
        error?.code === '23505' ||
        error?.message?.includes('validation') ||
        error?.message?.includes('required')) {
      return {
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.LOW,
        message: error.message || 'Erro de validação',
        originalError: error,
        recoverable: true,
        timestamp
      };
    }

    // Erro de banco de dados
    if (error instanceof DatabaseError ||
        error?.code?.startsWith('PGRST') ||
        error?.message?.includes('database') ||
        error?.message?.includes('SQL')) {
      return {
        type: ErrorType.DATABASE,
        severity: ErrorSeverity.HIGH,
        message: error.message || 'Erro de banco de dados',
        originalError: error,
        recoverable: true,
        timestamp
      };
    }

    // Erro desconhecido
    return {
      type: ErrorType.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      message: error?.message || 'Erro desconhecido',
      originalError: error,
      recoverable: true,
      timestamp
    };
  }
}

// ============================================================================
// MANIPULADOR DE ERROS
// ============================================================================

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorHistory: AppError[] = [];
  private maxHistorySize = 100;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handle(error: any, context?: Record<string, any>): AppError {
    const appError = ErrorAnalyzer.analyze(error);
    
    // Adicionar contexto se fornecido
    if (context) {
      appError.context = context;
    }

    // Adicionar ao histórico
    this.addToHistory(appError);

    // Log baseado na severidade
    this.logError(appError);

    // Ações baseadas no tipo de erro
    this.handleErrorActions(appError);

    return appError;
  }

  private addToHistory(error: AppError): void {
    this.errorHistory.unshift(error);
    
    // Manter apenas os últimos N erros
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  private logError(error: AppError): void {
    const logMessage = `[${error.type}] ${error.message}`;
    const logData = {
      severity: error.severity,
      recoverable: error.recoverable,
      context: error.context,
      timestamp: error.timestamp
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        criticalLog(logMessage, logData);
        break;
      case ErrorSeverity.HIGH:
        authLogger.error(logMessage, logData);
        break;
      case ErrorSeverity.MEDIUM:
        authLogger.warn(logMessage, logData);
        break;
      case ErrorSeverity.LOW:
        authLogger.info(logMessage, logData);
        break;
    }
  }

  private handleErrorActions(error: AppError): void {
    switch (error.type) {
      case ErrorType.AUTHENTICATION:
        // Redirecionar para login
        if (typeof window !== 'undefined') {
          window.location.href = '/auth';
        }
        break;
      
      case ErrorType.AUTHORIZATION:
        // Redirecionar para página de não autorizado
        if (typeof window !== 'undefined') {
          window.location.href = '/unauthorized';
        }
        break;
      
      case ErrorType.NETWORK:
        // Mostrar notificação de erro de rede
        this.showNetworkErrorNotification();
        break;
      
      case ErrorType.DATABASE:
        // Tentar reconectar ou mostrar erro de sistema
        this.showDatabaseErrorNotification();
        break;
    }
  }

  private showNetworkErrorNotification(): void {
    // Implementar notificação de erro de rede
    if (typeof window !== 'undefined' && 'toast' in window) {
      // Usar sistema de toast se disponível
      (window as any).toast?.error('Erro de conexão. Verifique sua internet.');
    }
  }

  private showDatabaseErrorNotification(): void {
    // Implementar notificação de erro de banco
    if (typeof window !== 'undefined' && 'toast' in window) {
      (window as any).toast?.error('Erro no sistema. Tente novamente em alguns instantes.');
    }
  }

  getErrorHistory(): AppError[] {
    return [...this.errorHistory];
  }

  clearHistory(): void {
    this.errorHistory = [];
  }

  getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    this.errorHistory.forEach(error => {
      const key = `${error.type}_${error.severity}`;
      stats[key] = (stats[key] || 0) + 1;
    });

    return stats;
  }
}

// ============================================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================================

export const errorHandler = ErrorHandler.getInstance();

export function handleError(error: any, context?: Record<string, any>): AppError {
  return errorHandler.handle(error, context);
}

export function createError(type: ErrorType, message: string, originalError?: Error): AppError {
  const timestamp = new Date();
  
  return {
    type,
    severity: getSeverityForType(type),
    message,
    originalError,
    recoverable: isRecoverableType(type),
    timestamp
  };
}

function getSeverityForType(type: ErrorType): ErrorSeverity {
  switch (type) {
    case ErrorType.AUTHENTICATION:
    case ErrorType.AUTHORIZATION:
      return ErrorSeverity.HIGH;
    case ErrorType.DATABASE:
      return ErrorSeverity.HIGH;
    case ErrorType.NETWORK:
      return ErrorSeverity.MEDIUM;
    case ErrorType.VALIDATION:
      return ErrorSeverity.LOW;
    case ErrorType.UNKNOWN:
      return ErrorSeverity.MEDIUM;
  }
}

function isRecoverableType(type: ErrorType): boolean {
  switch (type) {
    case ErrorType.AUTHENTICATION:
    case ErrorType.AUTHORIZATION:
      return false;
    case ErrorType.DATABASE:
    case ErrorType.NETWORK:
    case ErrorType.VALIDATION:
    case ErrorType.UNKNOWN:
      return true;
  }
}

// ============================================================================
// HOOK PARA REACT
// ============================================================================

export function useErrorHandler() {
  return {
    handleError,
    createError,
    getErrorHistory: () => errorHandler.getErrorHistory(),
    getErrorStats: () => errorHandler.getErrorStats(),
    clearHistory: () => errorHandler.clearHistory()
  };
}
