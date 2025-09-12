// =====================================================
// INPUT VALIDATION MIDDLEWARE
// Validates request data for onboarding and other operations
// =====================================================

const { ValidationHelper, ErrorHandler } = require('./errorHandler');

/**
 * Validation middleware for onboarding completion
 */
const validateOnboardingData = (req, res, next) => {
  const errors = [];
  const {
    nome_completo,
    telefone,
    cpf,
    data_nascimento,
    clinica_nome,
    clinica_cnpj,
    clinica_telefone,
    clinica_email,
    registro_profissional,
    tipo_registro
  } = req.body;

  // Required fields validation
  if (!nome_completo || nome_completo.trim().length < 2) {
    errors.push({
      field: 'nome_completo',
      message: 'Nome completo é obrigatório e deve ter pelo menos 2 caracteres'
    });
  }

  if (!clinica_nome || clinica_nome.trim().length < 2) {
    errors.push({
      field: 'clinica_nome',
      message: 'Nome da clínica é obrigatório e deve ter pelo menos 2 caracteres'
    });
  }

  if (!registro_profissional || registro_profissional.trim().length < 4) {
    errors.push({
      field: 'registro_profissional',
      message: 'Registro profissional é obrigatório e deve ter pelo menos 4 caracteres'
    });
  }

  // Optional fields validation
  if (telefone && !ValidationHelper.validatePhone(telefone)) {
    errors.push({
      field: 'telefone',
      message: 'Formato de telefone inválido'
    });
  }

  if (cpf && !ValidationHelper.validateCPF(cpf)) {
    errors.push({
      field: 'cpf',
      message: 'CPF inválido'
    });
  }

  if (data_nascimento) {
    const birthDate = new Date(data_nascimento);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    
    if (isNaN(birthDate.getTime())) {
      errors.push({
        field: 'data_nascimento',
        message: 'Data de nascimento inválida'
      });
    } else if (age < 18 || age > 100) {
      errors.push({
        field: 'data_nascimento',
        message: 'Idade deve estar entre 18 e 100 anos'
      });
    }
  }

  // Clinic validation
  if (clinica_cnpj && !ValidationHelper.validateCNPJ(clinica_cnpj)) {
    errors.push({
      field: 'clinica_cnpj',
      message: 'CNPJ inválido'
    });
  }

  if (clinica_telefone && !ValidationHelper.validatePhone(clinica_telefone)) {
    errors.push({
      field: 'clinica_telefone',
      message: 'Telefone da clínica inválido'
    });
  }

  if (clinica_email && !ValidationHelper.validateEmail(clinica_email)) {
    errors.push({
      field: 'clinica_email',
      message: 'Email da clínica inválido'
    });
  }

  // Professional registration validation
  if (registro_profissional && !ValidationHelper.validateProfessionalRegistration(registro_profissional, tipo_registro)) {
    errors.push({
      field: 'registro_profissional',
      message: `Formato de registro profissional inválido para ${tipo_registro || 'CRM'}`
    });
  }

  // If there are validation errors, return them
  if (errors.length > 0) {
    const processedError = ErrorHandler.handleBusinessError('VALIDATION_ERROR', { validationErrors: errors });
    return res.status(processedError.statusCode).json({
      success: false,
      error: processedError.message,
      code: processedError.type,
      action: processedError.action,
      details: { validationErrors: errors },
      timestamp: new Date().toISOString()
    });
  }

  // Sanitize and normalize data
  req.body = {
    ...req.body,
    nome_completo: nome_completo?.trim(),
    telefone: telefone?.replace(/\D/g, ''),
    cpf: cpf?.replace(/\D/g, ''),
    clinica_nome: clinica_nome?.trim(),
    clinica_cnpj: clinica_cnpj?.replace(/\D/g, ''),
    clinica_telefone: clinica_telefone?.replace(/\D/g, ''),
    clinica_email: clinica_email?.toLowerCase().trim(),
    registro_profissional: registro_profissional?.trim().toUpperCase(),
    tipo_registro: tipo_registro?.toUpperCase() || 'CRM'
  };

  next();
};

/**
 * Validation middleware for user registration
 */
const validateRegistrationData = (req, res, next) => {
  const errors = [];
  const { email, password, nome_completo, telefone } = req.body;

  // Required fields
  if (!email || !ValidationHelper.validateEmail(email)) {
    errors.push({
      field: 'email',
      message: 'Email válido é obrigatório'
    });
  }

  if (!password || password.length < 8) {
    errors.push({
      field: 'password',
      message: 'Senha deve ter pelo menos 8 caracteres'
    });
  }

  if (!nome_completo || nome_completo.trim().length < 2) {
    errors.push({
      field: 'nome_completo',
      message: 'Nome completo é obrigatório e deve ter pelo menos 2 caracteres'
    });
  }

  // Optional fields
  if (telefone && !ValidationHelper.validatePhone(telefone)) {
    errors.push({
      field: 'telefone',
      message: 'Formato de telefone inválido'
    });
  }

  // Password strength validation
  if (password) {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      errors.push({
        field: 'password',
        message: 'Senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número'
      });
    }
  }

  if (errors.length > 0) {
    const processedError = ErrorHandler.handleBusinessError('VALIDATION_ERROR', { validationErrors: errors });
    return res.status(processedError.statusCode).json({
      success: false,
      error: processedError.message,
      code: processedError.type,
      action: processedError.action,
      details: { validationErrors: errors },
      timestamp: new Date().toISOString()
    });
  }

  // Sanitize data
  req.body = {
    ...req.body,
    email: email.toLowerCase().trim(),
    nome_completo: nome_completo.trim(),
    telefone: telefone?.replace(/\D/g, '')
  };

  next();
};

/**
 * Validation middleware for login data
 */
const validateLoginData = (req, res, next) => {
  const errors = [];
  const { email, password } = req.body;

  if (!email || !ValidationHelper.validateEmail(email)) {
    errors.push({
      field: 'email',
      message: 'Email válido é obrigatório'
    });
  }

  if (!password || password.length < 1) {
    errors.push({
      field: 'password',
      message: 'Senha é obrigatória'
    });
  }

  if (errors.length > 0) {
    const processedError = ErrorHandler.handleBusinessError('VALIDATION_ERROR', { validationErrors: errors });
    return res.status(processedError.statusCode).json({
      success: false,
      error: processedError.message,
      code: processedError.type,
      action: processedError.action,
      details: { validationErrors: errors },
      timestamp: new Date().toISOString()
    });
  }

  // Sanitize data
  req.body = {
    ...req.body,
    email: email.toLowerCase().trim()
  };

  next();
};

/**
 * Validation middleware for clinic data
 */
const validateClinicData = (req, res, next) => {
  const errors = [];
  const { nome, cnpj, telefone_principal, email_contato } = req.body;

  // Required fields
  if (!nome || nome.trim().length < 2) {
    errors.push({
      field: 'nome',
      message: 'Nome da clínica é obrigatório e deve ter pelo menos 2 caracteres'
    });
  }

  // Optional fields validation
  if (cnpj && !ValidationHelper.validateCNPJ(cnpj)) {
    errors.push({
      field: 'cnpj',
      message: 'CNPJ inválido'
    });
  }

  if (telefone_principal && !ValidationHelper.validatePhone(telefone_principal)) {
    errors.push({
      field: 'telefone_principal',
      message: 'Telefone principal inválido'
    });
  }

  if (email_contato && !ValidationHelper.validateEmail(email_contato)) {
    errors.push({
      field: 'email_contato',
      message: 'Email de contato inválido'
    });
  }

  if (errors.length > 0) {
    const processedError = ErrorHandler.handleBusinessError('VALIDATION_ERROR', { validationErrors: errors });
    return res.status(processedError.statusCode).json({
      success: false,
      error: processedError.message,
      code: processedError.type,
      action: processedError.action,
      details: { validationErrors: errors },
      timestamp: new Date().toISOString()
    });
  }

  // Sanitize data
  req.body = {
    ...req.body,
    nome: nome?.trim(),
    cnpj: cnpj?.replace(/\D/g, ''),
    telefone_principal: telefone_principal?.replace(/\D/g, ''),
    email_contato: email_contato?.toLowerCase().trim()
  };

  next();
};

/**
 * Validation middleware for professional data
 */
const validateProfessionalData = (req, res, next) => {
  const errors = [];
  const { registro_profissional, tipo_registro, experiencia_anos } = req.body;

  // Required fields
  if (!registro_profissional || registro_profissional.trim().length < 4) {
    errors.push({
      field: 'registro_profissional',
      message: 'Registro profissional é obrigatório e deve ter pelo menos 4 caracteres'
    });
  }

  // Validate professional registration format
  if (registro_profissional && !ValidationHelper.validateProfessionalRegistration(registro_profissional, tipo_registro)) {
    errors.push({
      field: 'registro_profissional',
      message: `Formato de registro profissional inválido para ${tipo_registro || 'CRM'}`
    });
  }

  // Validate experience years
  if (experiencia_anos !== undefined && experiencia_anos !== null) {
    const years = parseInt(experiencia_anos);
    if (isNaN(years) || years < 0 || years > 60) {
      errors.push({
        field: 'experiencia_anos',
        message: 'Anos de experiência deve ser um número entre 0 e 60'
      });
    }
  }

  if (errors.length > 0) {
    const processedError = ErrorHandler.handleBusinessError('VALIDATION_ERROR', { validationErrors: errors });
    return res.status(processedError.statusCode).json({
      success: false,
      error: processedError.message,
      code: processedError.type,
      action: processedError.action,
      details: { validationErrors: errors },
      timestamp: new Date().toISOString()
    });
  }

  // Sanitize data
  req.body = {
    ...req.body,
    registro_profissional: registro_profissional?.trim().toUpperCase(),
    tipo_registro: tipo_registro?.toUpperCase() || 'CRM',
    experiencia_anos: experiencia_anos ? parseInt(experiencia_anos) : null
  };

  next();
};

/**
 * Generic validation middleware factory
 */
const createValidationMiddleware = (validationRules) => {
  return (req, res, next) => {
    const errors = [];

    for (const rule of validationRules) {
      const { field, required, type, minLength, maxLength, pattern, custom } = rule;
      const value = req.body[field];

      // Required field check
      if (required && (!value || (typeof value === 'string' && value.trim().length === 0))) {
        errors.push({
          field,
          message: `${field} é obrigatório`
        });
        continue;
      }

      // Skip further validation if field is empty and not required
      if (!value) continue;

      // Type validation
      if (type === 'email' && !ValidationHelper.validateEmail(value)) {
        errors.push({
          field,
          message: `${field} deve ser um email válido`
        });
      }

      if (type === 'phone' && !ValidationHelper.validatePhone(value)) {
        errors.push({
          field,
          message: `${field} deve ser um telefone válido`
        });
      }

      if (type === 'cpf' && !ValidationHelper.validateCPF(value)) {
        errors.push({
          field,
          message: `${field} deve ser um CPF válido`
        });
      }

      if (type === 'cnpj' && !ValidationHelper.validateCNPJ(value)) {
        errors.push({
          field,
          message: `${field} deve ser um CNPJ válido`
        });
      }

      // Length validation
      if (minLength && value.length < minLength) {
        errors.push({
          field,
          message: `${field} deve ter pelo menos ${minLength} caracteres`
        });
      }

      if (maxLength && value.length > maxLength) {
        errors.push({
          field,
          message: `${field} deve ter no máximo ${maxLength} caracteres`
        });
      }

      // Pattern validation
      if (pattern && !pattern.test(value)) {
        errors.push({
          field,
          message: `${field} tem formato inválido`
        });
      }

      // Custom validation
      if (custom && !custom(value)) {
        errors.push({
          field,
          message: `${field} é inválido`
        });
      }
    }

    if (errors.length > 0) {
      const processedError = ErrorHandler.handleBusinessError('VALIDATION_ERROR', { validationErrors: errors });
      return res.status(processedError.statusCode).json({
        success: false,
        error: processedError.message,
        code: processedError.type,
        action: processedError.action,
        details: { validationErrors: errors },
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

module.exports = {
  validateOnboardingData,
  validateRegistrationData,
  validateLoginData,
  validateClinicData,
  validateProfessionalData,
  createValidationMiddleware
};