// =====================================================
// COMPREHENSIVE ERROR HANDLING MIDDLEWARE
// Handles database errors, RLS violations, and business logic errors
// =====================================================

class ErrorHandler {
  // Database error codes mapping
  static DATABASE_ERRORS = {
    '23505': 'DUPLICATE_ENTRY',
    '23503': 'FOREIGN_KEY_VIOLATION',
    '23502': 'NOT_NULL_VIOLATION',
    '23514': 'CHECK_VIOLATION',
    '42501': 'RLS_VIOLATION',
    '42P01': 'TABLE_NOT_FOUND',
    '42703': 'COLUMN_NOT_FOUND',
    '08003': 'CONNECTION_FAILURE',
    '08006': 'CONNECTION_FAILURE',
    '57P01': 'ADMIN_SHUTDOWN',
    '53300': 'TOO_MANY_CONNECTIONS'
  };

  // Business error types
  static BUSINESS_ERRORS = {
    'VALIDATION_ERROR': 400,
    'DUPLICATE_EMAIL': 409,
    'DUPLICATE_REGISTRATION': 409,
    'INVALID_CREDENTIALS': 401,
    'UNAUTHORIZED': 401,
    'FORBIDDEN': 403,
    'NOT_FOUND': 404,
    'ONBOARDING_INCOMPLETE': 422,
    'INVALID_INPUT': 422
  };

  /**
   * Handle database-specific errors
   */
  static handleDatabaseError(error) {
    const errorCode = error.code;
    const constraint = error.constraint;
    const table = error.table;
    const column = error.column;

    switch (errorCode) {
      case '23505': // Unique violation
        if (constraint?.includes('profiles_email_key') || constraint?.includes('users_email_key')) {
          return {
            type: 'DUPLICATE_EMAIL',
            message: 'Este email já está cadastrado no sistema',
            statusCode: 409,
            action: 'USE_DIFFERENT_EMAIL'
          };
        }
        if (constraint?.includes('profissionais_unique_registro')) {
          return {
            type: 'DUPLICATE_REGISTRATION',
            message: 'Este registro profissional já está cadastrado',
            statusCode: 409,
            action: 'USE_DIFFERENT_REGISTRATION'
          };
        }
        if (constraint?.includes('clinica_profissionais') && constraint?.includes('unique')) {
          return {
            type: 'DUPLICATE_CLINIC_LINK',
            message: 'Este profissional já está vinculado a esta clínica',
            statusCode: 409,
            action: 'UPDATE_EXISTING_LINK'
          };
        }
        return {
          type: 'DUPLICATE_ENTRY',
          message: 'Dados duplicados encontrados',
          statusCode: 409,
          action: 'CHECK_UNIQUE_FIELDS'
        };

      case '23503': // Foreign key violation
        if (constraint?.includes('user_id')) {
          return {
            type: 'INVALID_USER_REFERENCE',
            message: 'Usuário não encontrado ou inválido',
            statusCode: 400,
            action: 'VERIFY_USER_EXISTS'
          };
        }
        if (constraint?.includes('clinica_id')) {
          return {
            type: 'INVALID_CLINIC_REFERENCE',
            message: 'Clínica não encontrada ou inválida',
            statusCode: 400,
            action: 'VERIFY_CLINIC_EXISTS'
          };
        }
        return {
          type: 'FOREIGN_KEY_VIOLATION',
          message: 'Referência inválida nos dados fornecidos',
          statusCode: 400,
          action: 'CHECK_REFERENCES'
        };

      case '23502': // Not null violation
        return {
          type: 'MISSING_REQUIRED_FIELD',
          message: `Campo obrigatório não fornecido: ${column || 'campo desconhecido'}`,
          statusCode: 400,
          action: 'PROVIDE_REQUIRED_FIELDS'
        };

      case '42501': // RLS violation
        return {
          type: 'RLS_VIOLATION',
          message: 'Permissão negada para esta operação',
          statusCode: 403,
          action: 'CHECK_PERMISSIONS'
        };

      case '42P01': // Table doesn't exist
        return {
          type: 'TABLE_NOT_FOUND',
          message: 'Estrutura do banco de dados incompleta',
          statusCode: 500,
          action: 'CONTACT_ADMINISTRATOR'
        };

      case '42703': // Column doesn't exist
        return {
          type: 'COLUMN_NOT_FOUND',
          message: 'Estrutura da tabela está desatualizada',
          statusCode: 500,
          action: 'UPDATE_DATABASE_SCHEMA'
        };

      case '08003':
      case '08006':
        return {
          type: 'CONNECTION_FAILURE',
          message: 'Falha na conexão com o banco de dados',
          statusCode: 503,
          action: 'RETRY_LATER'
        };

      case '53300':
        return {
          type: 'TOO_MANY_CONNECTIONS',
          message: 'Muitas conexões simultâneas. Tente novamente em alguns instantes',
          statusCode: 503,
          action: 'RETRY_WITH_DELAY'
        };

      default:
        return {
          type: 'DATABASE_ERROR',
          message: 'Erro interno do banco de dados',
          statusCode: 500,
          action: 'CONTACT_SUPPORT'
        };
    }
  }

  /**
   * Handle business logic errors
   */
  static handleBusinessError(errorType, details = {}) {
    const statusCode = this.BUSINESS_ERRORS[errorType] || 500;

    const errorMessages = {
      'VALIDATION_ERROR': 'Dados fornecidos são inválidos',
      'DUPLICATE_EMAIL': 'Este email já está cadastrado',
      'DUPLICATE_REGISTRATION': 'Este registro profissional já existe',
      'INVALID_CREDENTIALS': 'Email ou senha incorretos',
      'UNAUTHORIZED': 'Acesso não autorizado',
      'FORBIDDEN': 'Você não tem permissão para esta ação',
      'NOT_FOUND': 'Recurso não encontrado',
      'ONBOARDING_INCOMPLETE': 'Processo de cadastro incompleto',
      'INVALID_INPUT': 'Dados de entrada inválidos'
    };

    return {
      type: errorType,
      message: errorMessages[errorType] || 'Erro de negócio',
      statusCode,
      details,
      action: this.getBusinessErrorAction(errorType)
    };
  }

  /**
   * Get recommended action for business errors
   */
  static getBusinessErrorAction(errorType) {
    const actions = {
      'VALIDATION_ERROR': 'VALIDATE_INPUT',
      'DUPLICATE_EMAIL': 'USE_DIFFERENT_EMAIL',
      'DUPLICATE_REGISTRATION': 'USE_DIFFERENT_REGISTRATION',
      'INVALID_CREDENTIALS': 'CHECK_CREDENTIALS',
      'UNAUTHORIZED': 'LOGIN_REQUIRED',
      'FORBIDDEN': 'CHECK_PERMISSIONS',
      'NOT_FOUND': 'VERIFY_RESOURCE',
      'ONBOARDING_INCOMPLETE': 'COMPLETE_ONBOARDING',
      'INVALID_INPUT': 'CORRECT_INPUT'
    };

    return actions[errorType] || 'CONTACT_SUPPORT';
  }

  /**
   * Main error processing function
   */
  static processError(error, context = {}) {
    // Database errors
    if (error.code && this.DATABASE_ERRORS[error.code]) {
      return this.handleDatabaseError(error);
    }

    // Business errors
    if (error.type && this.BUSINESS_ERRORS[error.type]) {
      return this.handleBusinessError(error.type, error.details);
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      return {
        type: 'INVALID_TOKEN',
        message: 'Token de autenticação inválido',
        statusCode: 401,
        action: 'LOGIN_REQUIRED'
      };
    }

    if (error.name === 'TokenExpiredError') {
      return {
        type: 'EXPIRED_TOKEN',
        message: 'Token de autenticação expirado',
        statusCode: 401,
        action: 'REFRESH_TOKEN'
      };
    }

    // Validation errors (from express-validator or similar)
    if (error.name === 'ValidationError' || error.errors) {
      return {
        type: 'VALIDATION_ERROR',
        message: 'Dados de entrada inválidos',
        statusCode: 400,
        details: error.errors || error.details,
        action: 'VALIDATE_INPUT'
      };
    }

    // Network/timeout errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return {
        type: 'CONNECTION_ERROR',
        message: 'Falha na conexão com o servidor',
        statusCode: 503,
        action: 'RETRY_LATER'
      };
    }

    // Default unknown error
    return {
      type: 'UNKNOWN_ERROR',
      message: 'Erro interno do servidor',
      statusCode: 500,
      action: 'CONTACT_SUPPORT'
    };
  }
}

/**
 * Express error handling middleware
 */
const errorHandlerMiddleware = (err, req, res, next) => {
  // Log error for debugging
  console.error('Error occurred:', {
    error: err.message,
    code: err.code,
    constraint: err.constraint,
    table: err.table,
    column: err.column,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    userId: req.user?.userId,
    timestamp: new Date().toISOString()
  });

  // Process error
  const processedError = ErrorHandler.processError(err, {
    url: req.url,
    method: req.method,
    userId: req.user?.userId
  });

  // Send response
  res.status(processedError.statusCode).json({
    success: false,
    error: processedError.message,
    code: processedError.type,
    action: processedError.action,
    details: processedError.details,
    timestamp: new Date().toISOString(),
    // Include additional debug info in development
    ...(process.env.NODE_ENV === 'development' && {
      debug: {
        originalError: err.message,
        stack: err.stack,
        constraint: err.constraint,
        table: err.table,
        column: err.column
      }
    })
  });
};

/**
 * Async error wrapper for route handlers
 */
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Retry logic with exponential backoff
 */
class RetryManager {
  static async withRetry(operation, options = {}) {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      retryCondition = (error) => this.isRetryableError(error)
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry if it's not a retryable error
        if (!retryCondition(error)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        
        console.warn(`Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  static isRetryableError(error) {
    // Retry on connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Retry on database connection errors
    if (error.code === '08003' || error.code === '08006') {
      return true;
    }

    // Retry on too many connections
    if (error.code === '53300') {
      return true;
    }

    // Don't retry on other errors
    return false;
  }
}

/**
 * Input validation helpers
 */
class ValidationHelper {
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateCPF(cpf) {
    if (!cpf) return true; // CPF is optional
    
    // Remove non-digits
    cpf = cpf.replace(/\D/g, '');
    
    // Check length
    if (cpf.length !== 11) return false;
    
    // Check for repeated digits
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    // Validate check digits
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;
    
    return true;
  }

  static validateCNPJ(cnpj) {
    if (!cnpj) return true; // CNPJ is optional
    
    // Remove non-digits
    cnpj = cnpj.replace(/\D/g, '');
    
    // Check length
    if (cnpj.length !== 14) return false;
    
    // Check for repeated digits
    if (/^(\d)\1{13}$/.test(cnpj)) return false;
    
    // Validate check digits
    let length = cnpj.length - 2;
    let numbers = cnpj.substring(0, length);
    let digits = cnpj.substring(length);
    let sum = 0;
    let pos = length - 7;
    
    for (let i = length; i >= 1; i--) {
      sum += numbers.charAt(length - i) * pos--;
      if (pos < 2) pos = 9;
    }
    
    let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result !== parseInt(digits.charAt(0))) return false;
    
    length = length + 1;
    numbers = cnpj.substring(0, length);
    sum = 0;
    pos = length - 7;
    
    for (let i = length; i >= 1; i--) {
      sum += numbers.charAt(length - i) * pos--;
      if (pos < 2) pos = 9;
    }
    
    result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result !== parseInt(digits.charAt(1))) return false;
    
    return true;
  }

  static validatePhone(phone) {
    if (!phone) return true; // Phone is optional
    
    // Remove non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Brazilian phone numbers: 10 or 11 digits
    return digits.length >= 10 && digits.length <= 11;
  }

  static validateProfessionalRegistration(registration, type = 'CRM') {
    if (!registration) return false;
    
    // Remove non-alphanumeric characters
    const clean = registration.replace(/[^A-Za-z0-9]/g, '');
    
    switch (type.toUpperCase()) {
      case 'CRM':
        // CRM: 4-6 digits + state (2 letters)
        return /^\d{4,6}[A-Z]{2}$/.test(clean);
      case 'CRO':
        // CRO: similar to CRM
        return /^\d{4,6}[A-Z]{2}$/.test(clean);
      case 'CREFITO':
        // CREFITO: numbers + region
        return /^\d{4,6}-[A-Z0-9]{1,3}$/.test(registration);
      default:
        // Generic: at least 4 characters
        return clean.length >= 4;
    }
  }
}

module.exports = {
  ErrorHandler,
  errorHandlerMiddleware,
  asyncErrorHandler,
  RetryManager,
  ValidationHelper
};