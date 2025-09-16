/**
 * React hooks for data validation
 * Provides reactive validation with loading states and error handling
 */

import { useState, useCallback, useEffect } from 'react';
import { validationService } from '@/services/validation.service';
import type {
  EmailValidationResult,
  ClinicValidationResult,
  TemplateValidationResult,
  OnboardingValidationResult,
  OnboardingValidationData,
  ClinicData,
  TemplateData
} from '@/utils/validation';

// Email validation hook
export const useEmailValidation = () => {
  const [result, setResult] = useState<EmailValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = useCallback(async (email: string) => {
    if (!email.trim()) {
      setResult(null);
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const validationResult = await validationService.validateEmailWithCache(email);
      setResult(validationResult);
    } catch (err) {
      setError('Erro ao validar email');
      setResult(null);
    } finally {
      setIsValidating(false);
    }
  }, []);

  return {
    result,
    isValidating,
    error,
    validateEmail,
    isValid: result?.isValid && result?.isUnique,
    errors: result?.errors || []
  };
};

// Clinic validation hook
export const useClinicValidation = () => {
  const [result, setResult] = useState<ClinicValidationResult | null>(null);

  const validateClinic = useCallback((data: ClinicData) => {
    const validationResult = validationService.validateClinic(data);
    setResult(validationResult);
    return validationResult;
  }, []);

  return {
    result,
    validateClinic,
    isValid: result?.isValid || false,
    errors: result?.errors || {}
  };
};

// Template validation hook
export const useTemplateValidation = () => {
  const [result, setResult] = useState<TemplateValidationResult | null>(null);

  const validateTemplate = useCallback((data: TemplateData) => {
    const validationResult = validationService.validateTemplate(data);
    setResult(validationResult);
    return validationResult;
  }, []);

  return {
    result,
    validateTemplate,
    isValid: result?.isValid || false,
    errors: result?.errors || {}
  };
};

// Professional validation hook
export const useProfessionalValidation = () => {
  const [result, setResult] = useState<{ isValid: boolean; errors: string[] } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateProfessional = useCallback(async (userId: string, clinicId: string) => {
    setIsValidating(true);
    setError(null);

    try {
      const validationResult = await validationService.validateProfessionalData(userId, clinicId);
      setResult(validationResult);
    } catch (err) {
      setError('Erro ao validar dados profissionais');
      setResult(null);
    } finally {
      setIsValidating(false);
    }
  }, []);

  return {
    result,
    isValidating,
    error,
    validateProfessional,
    isValid: result?.isValid || false,
    errors: result?.errors || []
  };
};

// Comprehensive onboarding validation hook
export const useOnboardingValidation = () => {
  const [result, setResult] = useState<OnboardingValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateOnboarding = useCallback(async (data: OnboardingValidationData) => {
    setIsValidating(true);
    setError(null);

    try {
      const validationResult = await validationService.validateCompleteOnboarding(data);
      setResult(validationResult);
    } catch (err) {
      setError('Erro ao validar dados de onboarding');
      setResult(null);
    } finally {
      setIsValidating(false);
    }
  }, []);

  return {
    result,
    isValidating,
    error,
    validateOnboarding,
    isValid: result?.isValid || false,
    errors: result?.errors || []
  };
};

// Real-time validation hook for forms
export const useFormValidation = <T extends Record<string, any>>(
  initialData: T,
  validator: (data: T) => Promise<{ isValid: boolean; errors: Record<string, string> }> | { isValid: boolean; errors: Record<string, string> }
) => {
  const [data, setData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback(async (field: keyof T, value: any) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    setTouched(prev => ({ ...prev, [field]: true }));

    setIsValidating(true);
    try {
      const result = await validator(newData);
      setErrors(result.errors);
      setIsValid(result.isValid);
    } catch (err) {
      console.error('Validation error:', err);
    } finally {
      setIsValidating(false);
    }
  }, [data, validator]);

  const validateAll = useCallback(async () => {
    setIsValidating(true);
    try {
      const result = await validator(data);
      setErrors(result.errors);
      setIsValid(result.isValid);
      
      // Mark all fields as touched
      const allTouched = Object.keys(data).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {} as Record<string, boolean>);
      setTouched(allTouched);
      
      return result;
    } catch (err) {
      console.error('Validation error:', err);
      return { isValid: false, errors: { general: 'Erro de validação' } };
    } finally {
      setIsValidating(false);
    }
  }, [data, validator]);

  const updateField = useCallback((field: keyof T, value: any) => {
    validateField(field, value);
  }, [validateField]);

  const reset = useCallback(() => {
    setData(initialData);
    setErrors({});
    setIsValid(false);
    setTouched({});
  }, [initialData]);

  return {
    data,
    errors,
    isValid,
    isValidating,
    touched,
    updateField,
    validateAll,
    reset,
    hasErrors: Object.keys(errors).length > 0,
    getFieldError: (field: keyof T) => touched[field as string] ? errors[field as string] : undefined
  };
};

// Debounced validation hook
export const useDebouncedValidation = <T>(
  value: T,
  validator: (value: T) => Promise<any>,
  delay: number = 500
) => {
  const [result, setResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setResult(null);
      return;
    }

    setIsValidating(true);
    setError(null);

    const timeoutId = setTimeout(async () => {
      try {
        const validationResult = await validator(value);
        setResult(validationResult);
      } catch (err) {
        setError('Erro de validação');
        setResult(null);
      } finally {
        setIsValidating(false);
      }
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      setIsValidating(false);
    };
  }, [value, validator, delay]);

  return {
    result,
    isValidating,
    error
  };
};