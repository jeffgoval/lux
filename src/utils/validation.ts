/**
 * Comprehensive data validation system for auth and onboarding
 * Implements validation for email uniqueness, clinic data, foreign keys, and procedure types
 */

import { supabase } from '@/integrations/supabase/client';

// Email validation
export interface EmailValidationResult {
  isValid: boolean;
  isUnique: boolean;
  errors: string[];
}

export const validateEmail = async (email: string): Promise<EmailValidationResult> => {
  const result: EmailValidationResult = {
    isValid: false,
    isUnique: false,
    errors: []
  };

  // Format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    result.errors.push('Formato de email inválido');
    return result;
  }

  result.isValid = true;

  // Uniqueness check
  try {
    const { data: existingUser, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      result.errors.push('Erro ao verificar unicidade do email');
      return result;
    }

    if (existingUser) {
      result.errors.push('Este email já está em uso');
      return result;
    }

    result.isUnique = true;
  } catch (error) {
    result.errors.push('Erro ao verificar email no banco de dados');
  }

  return result;
};

// Clinic data validation
export interface ClinicValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface ClinicData {
  nome: string;
  cnpj?: string;
  telefone?: string;
  endereco?: {
    cep?: string;
    logradouro?: string;
    numero?: string;
    cidade?: string;
    estado?: string;
  };
}

export const validateClinicData = (data: ClinicData): ClinicValidationResult => {
  const result: ClinicValidationResult = {
    isValid: true,
    errors: {}
  };

  // Required fields
  if (!data.nome || data.nome.trim().length < 2) {
    result.errors.nome = 'Nome da clínica é obrigatório (mínimo 2 caracteres)';
    result.isValid = false;
  }

  // CNPJ validation (if provided)
  if (data.cnpj) {
    const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/;
    if (!cnpjRegex.test(data.cnpj)) {
      result.errors.cnpj = 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX ou apenas números';
      result.isValid = false;
    }
  }

  // Phone validation (if provided)
  if (data.telefone) {
    const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$|^\d{10,11}$/;
    if (!phoneRegex.test(data.telefone)) {
      result.errors.telefone = 'Telefone deve estar no formato (XX) XXXXX-XXXX ou apenas números';
      result.isValid = false;
    }
  }

  // Address validation (if provided)
  if (data.endereco) {
    if (data.endereco.cep) {
      const cepRegex = /^\d{5}-\d{3}$|^\d{8}$/;
      if (!cepRegex.test(data.endereco.cep)) {
        result.errors['endereco.cep'] = 'CEP deve estar no formato XXXXX-XXX ou apenas números';
        result.isValid = false;
      }
    }
  }

  return result;
};
// 
Foreign key validation
export interface ForeignKeyValidationResult {
  isValid: boolean;
  exists: boolean;
  error?: string;
}

export const validateForeignKey = async (
  table: string,
  column: string,
  value: string
): Promise<ForeignKeyValidationResult> => {
  const result: ForeignKeyValidationResult = {
    isValid: false,
    exists: false
  };

  if (!value) {
    result.error = 'Valor da chave estrangeira não pode ser vazio';
    return result;
  }

  try {
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .eq(column, value)
      .single();

    if (error && error.code !== 'PGRST116') {
      result.error = `Erro ao verificar ${table}.${column}`;
      return result;
    }

    if (data) {
      result.exists = true;
      result.isValid = true;
    } else {
      result.error = `Registro não encontrado em ${table}.${column}`;
    }
  } catch (error) {
    result.error = `Erro de conexão ao validar ${table}.${column}`;
  }

  return result;
};

// Batch foreign key validation
export const validateMultipleForeignKeys = async (
  validations: Array<{ table: string; column: string; value: string; name: string }>
): Promise<Record<string, ForeignKeyValidationResult>> => {
  const results: Record<string, ForeignKeyValidationResult> = {};

  const promises = validations.map(async (validation) => {
    const result = await validateForeignKey(validation.table, validation.column, validation.value);
    results[validation.name] = result;
  });

  await Promise.all(promises);
  return results;
};

// Procedure type validation
export type TipoProcedimento = 
  | 'harmonizacao_facial'
  | 'preenchimento'
  | 'toxina_botulinica'
  | 'peeling'
  | 'limpeza_pele'
  | 'microagulhamento'
  | 'laser'
  | 'radiofrequencia'
  | 'criolipólise'
  | 'massagem'
  | 'drenagem_linfatica'
  | 'outros';

export const VALID_PROCEDURE_TYPES: TipoProcedimento[] = [
  'harmonizacao_facial',
  'preenchimento',
  'toxina_botulinica',
  'peeling',
  'limpeza_pele',
  'microagulhamento',
  'laser',
  'radiofrequencia',
  'criolipólise',
  'massagem',
  'drenagem_linfatica',
  'outros'
];

export interface ProcedureTypeValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateProcedureType = (type: string): ProcedureTypeValidationResult => {
  const result: ProcedureTypeValidationResult = {
    isValid: false
  };

  if (!type) {
    result.error = 'Tipo de procedimento é obrigatório';
    return result;
  }

  if (!VALID_PROCEDURE_TYPES.includes(type as TipoProcedimento)) {
    result.error = `Tipo de procedimento inválido. Tipos válidos: ${VALID_PROCEDURE_TYPES.join(', ')}`;
    return result;
  }

  result.isValid = true;
  return result;
};

// Template validation
export interface TemplateData {
  tipo_procedimento: string;
  nome_template: string;
  descricao?: string;
  duracao_padrao_minutos?: number;
  valor_base?: number;
}

export interface TemplateValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateTemplateData = (data: TemplateData): TemplateValidationResult => {
  const result: TemplateValidationResult = {
    isValid: true,
    errors: {}
  };

  // Required fields
  if (!data.nome_template || data.nome_template.trim().length < 2) {
    result.errors.nome_template = 'Nome do template é obrigatório (mínimo 2 caracteres)';
    result.isValid = false;
  }

  // Procedure type validation
  const typeValidation = validateProcedureType(data.tipo_procedimento);
  if (!typeValidation.isValid) {
    result.errors.tipo_procedimento = typeValidation.error || 'Tipo de procedimento inválido';
    result.isValid = false;
  }

  // Duration validation
  if (data.duracao_padrao_minutos !== undefined) {
    if (data.duracao_padrao_minutos < 15 || data.duracao_padrao_minutos > 480) {
      result.errors.duracao_padrao_minutos = 'Duração deve estar entre 15 e 480 minutos';
      result.isValid = false;
    }
  }

  // Price validation
  if (data.valor_base !== undefined) {
    if (data.valor_base < 0) {
      result.errors.valor_base = 'Valor base não pode ser negativo';
      result.isValid = false;
    }
  }

  return result;
};

// Comprehensive validation for onboarding data
export interface OnboardingValidationData {
  email: string;
  clinicData: ClinicData;
  templateData?: TemplateData;
}

export interface OnboardingValidationResult {
  isValid: boolean;
  emailValidation: EmailValidationResult;
  clinicValidation: ClinicValidationResult;
  templateValidation?: TemplateValidationResult;
  errors: string[];
}

export const validateOnboardingData = async (
  data: OnboardingValidationData
): Promise<OnboardingValidationResult> => {
  const result: OnboardingValidationResult = {
    isValid: true,
    emailValidation: { isValid: false, isUnique: false, errors: [] },
    clinicValidation: { isValid: false, errors: {} },
    errors: []
  };

  // Validate email
  result.emailValidation = await validateEmail(data.email);
  if (!result.emailValidation.isValid || !result.emailValidation.isUnique) {
    result.isValid = false;
    result.errors.push(...result.emailValidation.errors);
  }

  // Validate clinic data
  result.clinicValidation = validateClinicData(data.clinicData);
  if (!result.clinicValidation.isValid) {
    result.isValid = false;
    result.errors.push(...Object.values(result.clinicValidation.errors));
  }

  // Validate template data (if provided)
  if (data.templateData) {
    result.templateValidation = validateTemplateData(data.templateData);
    if (!result.templateValidation.isValid) {
      result.isValid = false;
      result.errors.push(...Object.values(result.templateValidation.errors));
    }
  }

  return result;
};