/**
 * 🔍 SISTEMA DE VALIDAÇÃO DE ESTADO
 * 
 * Sistema para validar estados de componentes e dados
 * com fallbacks seguros e recuperação automática.
 */

import { authLogger } from './logger';
import { handleError, ErrorType } from './errorHandler';

// ============================================================================
// TIPOS DE VALIDAÇÃO
// ============================================================================

export interface ValidationRule<T> {
  validate: (value: T) => boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

export interface StateValidationConfig {
  strict: boolean; // Se true, falha na primeira validação
  logErrors: boolean;
  throwOnError: boolean;
}

// ============================================================================
// VALIDADORES ESPECÍFICOS
// ============================================================================

export class AuthStateValidator {
  static validateUser(user: any): ValidationResult {
    const rules: ValidationRule<any>[] = [
      {
        validate: (u) => u && typeof u === 'object',
        message: 'User deve ser um objeto válido',
        severity: 'error'
      },
      {
        validate: (u) => u?.id && typeof u.id === 'string',
        message: 'User deve ter um ID válido',
        severity: 'error'
      },
      {
        validate: (u) => u?.email && typeof u.email === 'string',
        message: 'User deve ter um email válido',
        severity: 'error'
      },
      {
        validate: (u) => u?.email?.includes('@'),
        message: 'Email deve ter formato válido',
        severity: 'warning'
      }
    ];

    return this.validateWithRules(user, rules);
  }

  static validateProfile(profile: any): ValidationResult {
    const rules: ValidationRule<any>[] = [
      {
        validate: (p) => p && typeof p === 'object',
        message: 'Profile deve ser um objeto válido',
        severity: 'error'
      },
      {
        validate: (p) => p?.id && typeof p.id === 'string',
        message: 'Profile deve ter um ID válido',
        severity: 'error'
      },
      {
        validate: (p) => p?.nome_completo && typeof p.nome_completo === 'string',
        message: 'Profile deve ter nome completo',
        severity: 'error'
      },
      {
        validate: (p) => p?.email && typeof p.email === 'string',
        message: 'Profile deve ter email',
        severity: 'error'
      },
      {
        validate: (p) => typeof p?.primeiro_acesso === 'boolean',
        message: 'Profile deve ter flag primeiro_acesso',
        severity: 'warning'
      }
    ];

    return this.validateWithRules(profile, rules);
  }

  static validateRoles(roles: any[]): ValidationResult {
    const rules: ValidationRule<any[]>[] = [
      {
        validate: (r) => Array.isArray(r),
        message: 'Roles deve ser um array',
        severity: 'error'
      },
      {
        validate: (r) => r.every(role => role && typeof role === 'object'),
        message: 'Todos os roles devem ser objetos válidos',
        severity: 'error'
      },
      {
        validate: (r) => r.every(role => role?.role && typeof role.role === 'string'),
        message: 'Todos os roles devem ter propriedade role',
        severity: 'error'
      },
      {
        validate: (r) => r.every(role => typeof role?.ativo === 'boolean'),
        message: 'Todos os roles devem ter flag ativo',
        severity: 'warning'
      }
    ];

    return this.validateWithRules(roles, rules);
  }

  private static validateWithRules<T>(value: T, rules: ValidationRule<T>[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    for (const rule of rules) {
      try {
        if (!rule.validate(value)) {
          switch (rule.severity) {
            case 'error':
              result.errors.push(rule.message);
              result.isValid = false;
              break;
            case 'warning':
              result.warnings.push(rule.message);
              break;
            case 'info':
              result.info.push(rule.message);
              break;
          }
        }
      } catch (error) {
        result.errors.push(`Erro na validação: ${rule.message}`);
        result.isValid = false;
      }
    }

    return result;
  }
}

// ============================================================================
// VALIDADOR DE ESTADO DE COMPONENTE
// ============================================================================

export class ComponentStateValidator {
  static validateAuthState(state: any): ValidationResult {
    const results: ValidationResult[] = [];

    // Validar user
    if (state.user) {
      results.push(AuthStateValidator.validateUser(state.user));
    }

    // Validar profile
    if (state.profile) {
      results.push(AuthStateValidator.validateProfile(state.profile));
    }

    // Validar roles
    if (state.roles) {
      results.push(AuthStateValidator.validateRoles(state.roles));
    }

    // Validar estados booleanos
    const booleanRules: ValidationRule<any>[] = [
      {
        validate: (s) => typeof s?.isLoading === 'boolean',
        message: 'isLoading deve ser boolean',
        severity: 'warning'
      },
      {
        validate: (s) => typeof s?.isAuthenticated === 'boolean',
        message: 'isAuthenticated deve ser boolean',
        severity: 'warning'
      },
      {
        validate: (s) => typeof s?.isInitialized === 'boolean',
        message: 'isInitialized deve ser boolean',
        severity: 'warning'
      }
    ];

    results.push(this.validateWithRules(state, booleanRules));

    // Combinar resultados
    return this.combineResults(results);
  }

  private static validateWithRules<T>(value: T, rules: ValidationRule<T>[]): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    for (const rule of rules) {
      try {
        if (!rule.validate(value)) {
          switch (rule.severity) {
            case 'error':
              result.errors.push(rule.message);
              result.isValid = false;
              break;
            case 'warning':
              result.warnings.push(rule.message);
              break;
            case 'info':
              result.info.push(rule.message);
              break;
          }
        }
      } catch (error) {
        result.errors.push(`Erro na validação: ${rule.message}`);
        result.isValid = false;
      }
    }

    return result;
  }

  private static combineResults(results: ValidationResult[]): ValidationResult {
    const combined: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    for (const result of results) {
      combined.errors.push(...result.errors);
      combined.warnings.push(...result.warnings);
      combined.info.push(...result.info);
      
      if (!result.isValid) {
        combined.isValid = false;
      }
    }

    return combined;
  }
}

// ============================================================================
// SISTEMA DE RECUPERAÇÃO DE ESTADO
// ============================================================================

export class StateRecovery {
  static recoverAuthState(currentState: any): any {
    const recoveredState = { ...currentState };

    try {
      // Recuperar user se inválido
      if (!currentState.user || typeof currentState.user !== 'object') {
        recoveredState.user = null;
        authLogger.warn('User state recovered to null');
      }

      // Recuperar profile se inválido
      if (!currentState.profile || typeof currentState.profile !== 'object') {
        recoveredState.profile = null;
        authLogger.warn('Profile state recovered to null');
      }

      // Recuperar roles se inválido
      if (!Array.isArray(currentState.roles)) {
        recoveredState.roles = [];
        authLogger.warn('Roles state recovered to empty array');
      }

      // Recuperar estados booleanos
      if (typeof currentState.isLoading !== 'boolean') {
        recoveredState.isLoading = false;
        authLogger.warn('isLoading state recovered to false');
      }

      if (typeof currentState.isAuthenticated !== 'boolean') {
        recoveredState.isAuthenticated = !!currentState.user;
        authLogger.warn('isAuthenticated state recovered based on user');
      }

      if (typeof currentState.isInitialized !== 'boolean') {
        recoveredState.isInitialized = true;
        authLogger.warn('isInitialized state recovered to true');
      }

      return recoveredState;
    } catch (error) {
      handleError(error, { context: 'StateRecovery.recoverAuthState' });
      return currentState;
    }
  }

  static createSafeDefaultState(): any {
    return {
      user: null,
      session: null,
      profile: null,
      roles: [],
      currentRole: null,
      isLoading: false,
      isProfileLoading: false,
      isRolesLoading: false,
      isInitialized: false,
      error: null,
      isAuthenticated: false,
      isOnboardingComplete: false
    };
  }
}

// ============================================================================
// HOOK PARA VALIDAÇÃO DE ESTADO
// ============================================================================

export function useStateValidation<T>(
  state: T,
  validator: (state: T) => ValidationResult,
  config: StateValidationConfig = { strict: false, logErrors: true, throwOnError: false }
): ValidationResult {
  try {
    const result = validator(state);

    if (config.logErrors && !result.isValid) {
      authLogger.warn('State validation failed:', {
        errors: result.errors,
        warnings: result.warnings,
        state: state
      });
    }

    if (config.throwOnError && !result.isValid) {
      const error = new Error(`State validation failed: ${result.errors.join(', ')}`);
      handleError(error, { context: 'useStateValidation', state });
      throw error;
    }

    return result;
  } catch (error) {
    handleError(error, { context: 'useStateValidation' });
    return {
      isValid: false,
      errors: ['Erro na validação de estado'],
      warnings: [],
      info: []
    };
  }
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

export function validateAndRecoverState<T>(
  state: T,
  validator: (state: T) => ValidationResult,
  recoverer: (state: T) => T
): { state: T; isValid: boolean; recovered: boolean } {
  const validation = validator(state);
  
  if (validation.isValid) {
    return { state, isValid: true, recovered: false };
  }

  const recoveredState = recoverer(state);
  const recoveredValidation = validator(recoveredState);

  return {
    state: recoveredState,
    isValid: recoveredValidation.isValid,
    recovered: true
  };
}

export function createStateValidator<T>(
  rules: ValidationRule<T>[]
): (state: T) => ValidationResult {
  return (state: T) => {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    for (const rule of rules) {
      try {
        if (!rule.validate(state)) {
          switch (rule.severity) {
            case 'error':
              result.errors.push(rule.message);
              result.isValid = false;
              break;
            case 'warning':
              result.warnings.push(rule.message);
              break;
            case 'info':
              result.info.push(rule.message);
              break;
          }
        }
      } catch (error) {
        result.errors.push(`Erro na validação: ${rule.message}`);
        result.isValid = false;
      }
    }

    return result;
  };
}
