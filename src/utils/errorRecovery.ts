import { User } from '@supabase/supabase-js';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  DATA = 'data',
  NAVIGATION = 'navigation',
  UI = 'ui',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  userId?: string;
  userEmail?: string;
  currentRoute?: string;
  previousRoute?: string;
  userAgent?: string;
  timestamp: string;
  sessionId?: string;
  additionalData?: Record<string, any>;
}

export interface AppError {
  id: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: ErrorContext;
  originalError?: Error;
  stack?: string;
  recoverable: boolean;
  recoveryActions: RecoveryAction[];
}

export interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  action: () => Promise<boolean>;
  priority: number;
  automatic?: boolean;
}

export interface RecoveryStrategy {
  category: ErrorCategory;
  severity: ErrorSeverity;
  actions: RecoveryAction[];
  fallbackRoute?: string;
  userMessage?: string;
}

class ErrorRecoveryManager {
  private errorHistory: AppError[] = [];
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map();
  private maxHistorySize = 100;

  constructor() {
    this.initializeDefaultStrategies();
  }

  private initializeDefaultStrategies() {
    // Authentication errors
    this.addRecoveryStrategy({
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.CRITICAL,
      actions: [
        {
          id: 'refresh-session',
          label: 'Atualizar Sessão',
          description: 'Tenta renovar a sessão de autenticação',
          action: async () => {
            try {
              const { supabase } = await import('@/integrations/supabase/client');
              const { error } = await supabase.auth.refreshSession();
              return !error;
            } catch {
              return false;
            }
          },
          priority: 1,
          automatic: true
        },
        {
          id: 'clear-auth-cache',
          label: 'Limpar Cache',
          description: 'Limpa o cache de autenticação',
          action: async () => {
            try {
              const { clearAuthCache } = await import('@/utils/authCache');
              clearAuthCache();
              return true;
            } catch {
              return false;
            }
          },
          priority: 2,
          automatic: true
        },
        {
          id: 'redirect-to-login',
          label: 'Fazer Login Novamente',
          description: 'Redireciona para a página de login',
          action: async () => {
            window.location.href = '/auth';
            return true;
          },
          priority: 3
        }
      ],
      fallbackRoute: '/auth',
      userMessage: 'Sua sessão expirou. Por favor, faça login novamente.'
    });

    // Authorization errors
    this.addRecoveryStrategy({
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.HIGH,
      actions: [
        {
          id: 'refresh-user-data',
          label: 'Atualizar Dados do Usuário',
          description: 'Recarrega perfil e roles do usuário',
          action: async () => {
            try {
              // This will be injected by the auth context
              return false;
            } catch {
              return false;
            }
          },
          priority: 1,
          automatic: true
        },
        {
          id: 'redirect-to-dashboard',
          label: 'Ir para Dashboard',
          description: 'Redireciona para uma área segura',
          action: async () => {
            window.location.href = '/dashboard';
            return true;
          },
          priority: 2
        }
      ],
      fallbackRoute: '/dashboard',
      userMessage: 'Você não tem permissão para acessar esta área.'
    });

    // Network errors
    this.addRecoveryStrategy({
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      actions: [
        {
          id: 'retry-request',
          label: 'Tentar Novamente',
          description: 'Repete a última operação',
          action: async () => {
            // Will be implemented by specific components
            return false;
          },
          priority: 1,
          automatic: true
        },
        {
          id: 'use-cached-data',
          label: 'Usar Dados em Cache',
          description: 'Utiliza dados salvos localmente',
          action: async () => {
            // Will be implemented by specific components
            return false;
          },
          priority: 2,
          automatic: true
        }
      ],
      userMessage: 'Problema de conexão. Tentando novamente...'
    });

    // Data errors
    this.addRecoveryStrategy({
      category: ErrorCategory.DATA,
      severity: ErrorSeverity.HIGH,
      actions: [
        {
          id: 'fix-missing-data',
          label: 'Corrigir Dados Faltantes',
          description: 'Tenta recriar dados de usuário faltantes',
          action: async () => {
            try {
              // This will be injected by the auth context
              return false;
            } catch {
              return false;
            }
          },
          priority: 1,
          automatic: true
        },
        {
          id: 'redirect-to-onboarding',
          label: 'Completar Configuração',
          description: 'Redireciona para completar o setup',
          action: async () => {
            window.location.href = '/onboarding';
            return true;
          },
          priority: 2
        }
      ],
      fallbackRoute: '/onboarding',
      userMessage: 'Dados incompletos detectados. Redirecionando para configuração...'
    });
  }

  addRecoveryStrategy(strategy: RecoveryStrategy) {
    const key = `${strategy.category}-${strategy.severity}`;
    this.recoveryStrategies.set(key, strategy);
  }

  createError(
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: Partial<ErrorContext> = {},
    originalError?: Error
  ): AppError {
    const error: AppError = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      category,
      severity,
      context: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ...context
      },
      originalError,
      stack: originalError?.stack || new Error().stack,
      recoverable: true,
      recoveryActions: this.getRecoveryActions(category, severity)
    };

    this.addToHistory(error);
    return error;
  }

  private getRecoveryActions(category: ErrorCategory, severity: ErrorSeverity): RecoveryAction[] {
    const key = `${category}-${severity}`;
    const strategy = this.recoveryStrategies.get(key);
    return strategy?.actions || [];
  }

  private addToHistory(error: AppError) {
    this.errorHistory.unshift(error);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  async attemptRecovery(error: AppError): Promise<boolean> {
    console.log(`Attempting recovery for error: ${error.message}`);
    
    const automaticActions = error.recoveryActions
      .filter(action => action.automatic)
      .sort((a, b) => a.priority - b.priority);

    for (const action of automaticActions) {
      try {
        console.log(`Trying recovery action: ${action.label}`);
        const success = await action.action();
        if (success) {
          console.log(`Recovery successful with action: ${action.label}`);
          return true;
        }
      } catch (actionError) {
        console.error(`Recovery action failed: ${action.label}`, actionError);
      }
    }

    console.log('Automatic recovery failed');
    return false;
  }

  getRecoveryStrategy(category: ErrorCategory, severity: ErrorSeverity): RecoveryStrategy | undefined {
    const key = `${category}-${severity}`;
    return this.recoveryStrategies.get(key);
  }

  getErrorHistory(): AppError[] {
    return [...this.errorHistory];
  }

  clearHistory() {
    this.errorHistory = [];
  }

  // Inject dependencies for recovery actions
  injectAuthRecovery(refreshUserData: () => Promise<boolean>, fixMissingUserData: () => Promise<boolean>) {
    // Update authorization recovery
    const authStrategy = this.recoveryStrategies.get(`${ErrorCategory.AUTHORIZATION}-${ErrorSeverity.HIGH}`);
    if (authStrategy) {
      const refreshAction = authStrategy.actions.find(a => a.id === 'refresh-user-data');
      if (refreshAction) {
        refreshAction.action = refreshUserData;
      }
    }

    // Update data recovery
    const dataStrategy = this.recoveryStrategies.get(`${ErrorCategory.DATA}-${ErrorSeverity.HIGH}`);
    if (dataStrategy) {
      const fixAction = dataStrategy.actions.find(a => a.id === 'fix-missing-data');
      if (fixAction) {
        fixAction.action = fixMissingUserData;
      }
    }
  }

  // Generate error report for debugging
  generateErrorReport(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: AppError[];
    recoverySuccessRate: number;
  } {
    const errorsByCategory = {} as Record<ErrorCategory, number>;
    const errorsBySeverity = {} as Record<ErrorSeverity, number>;

    this.errorHistory.forEach(error => {
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    return {
      totalErrors: this.errorHistory.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors: this.errorHistory.slice(0, 10),
      recoverySuccessRate: 0 // TODO: Track recovery attempts and successes
    };
  }
}

// Singleton instance
export const errorRecoveryManager = new ErrorRecoveryManager();

// Utility functions
export const createAuthError = (message: string, context?: Partial<ErrorContext>, originalError?: Error) =>
  errorRecoveryManager.createError(message, ErrorCategory.AUTHENTICATION, ErrorSeverity.CRITICAL, context, originalError);

export const createAuthorizationError = (message: string, context?: Partial<ErrorContext>, originalError?: Error) =>
  errorRecoveryManager.createError(message, ErrorCategory.AUTHORIZATION, ErrorSeverity.HIGH, context, originalError);

export const createNetworkError = (message: string, context?: Partial<ErrorContext>, originalError?: Error) =>
  errorRecoveryManager.createError(message, ErrorCategory.NETWORK, ErrorSeverity.MEDIUM, context, originalError);

export const createDataError = (message: string, context?: Partial<ErrorContext>, originalError?: Error) =>
  errorRecoveryManager.createError(message, ErrorCategory.DATA, ErrorSeverity.HIGH, context, originalError);

export const createNavigationError = (message: string, context?: Partial<ErrorContext>, originalError?: Error) =>
  errorRecoveryManager.createError(message, ErrorCategory.NAVIGATION, ErrorSeverity.MEDIUM, context, originalError);

// Development helper
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).errorRecovery = {
    manager: errorRecoveryManager,
    generateReport: () => errorRecoveryManager.generateErrorReport(),
    getHistory: () => errorRecoveryManager.getErrorHistory()
  };
}