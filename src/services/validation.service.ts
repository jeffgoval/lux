/**
 * Validation service for auth and onboarding operations
 * Provides centralized validation logic with database integration
 */

import { supabase } from '@/integrations/supabase/client';
import {
  validateEmail,
  validateClinicData,
  validateForeignKey,
  validateMultipleForeignKeys,
  validateProcedureType,
  validateTemplateData,
  validateOnboardingData,
  type EmailValidationResult,
  type ClinicValidationResult,
  type ForeignKeyValidationResult,
  type ProcedureTypeValidationResult,
  type TemplateValidationResult,
  type OnboardingValidationResult,
  type OnboardingValidationData,
  type ClinicData,
  type TemplateData
} from '@/utils/validation';

export class ValidationService {
  // Email validation with caching
  private emailCache = new Map<string, { result: EmailValidationResult; timestamp: number }>();
  private readonly EMAIL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async validateEmailWithCache(email: string): Promise<EmailValidationResult> {
    const normalizedEmail = email.toLowerCase().trim();
    const cached = this.emailCache.get(normalizedEmail);
    
    if (cached && Date.now() - cached.timestamp < this.EMAIL_CACHE_TTL) {
      return cached.result;
    }

    const result = await validateEmail(normalizedEmail);
    this.emailCache.set(normalizedEmail, { result, timestamp: Date.now() });
    
    return result;
  }

  // Clinic data validation
  validateClinic(data: ClinicData): ClinicValidationResult {
    return validateClinicData(data);
  }

  // Foreign key validation for onboarding
  async validateOnboardingForeignKeys(userId: string, clinicId?: string): Promise<Record<string, ForeignKeyValidationResult>> {
    const validations = [
      { table: 'profiles', column: 'id', value: userId, name: 'user' }
    ];

    if (clinicId) {
      validations.push({ table: 'clinicas', column: 'id', value: clinicId, name: 'clinic' });
    }

    return await validateMultipleForeignKeys(validations);
  }

  // Professional data validation
  async validateProfessionalData(userId: string, clinicId: string): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const result = { isValid: true, errors: [] as string[] };

    // Validate foreign keys
    const fkValidations = await this.validateOnboardingForeignKeys(userId, clinicId);
    
    if (!fkValidations.user.isValid) {
      result.isValid = false;
      result.errors.push(fkValidations.user.error || 'Usuário inválido');
    }

    if (!fkValidations.clinic.isValid) {
      result.isValid = false;
      result.errors.push(fkValidations.clinic.error || 'Clínica inválida');
    }

    // Check if professional already exists
    try {
      const { data: existingProfessional } = await supabase
        .from('profissionais')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingProfessional) {
        // This is not necessarily an error, just a warning
        console.log('Professional already exists for user:', userId);
      }
    } catch (error) {
      // Error checking existing professional - not critical
      console.warn('Error checking existing professional:', error);
    }

    return result;
  }

  // Template validation
  validateTemplate(data: TemplateData): TemplateValidationResult {
    return validateTemplateData(data);
  }

  // Procedure type validation
  validateProcedureType(type: string): ProcedureTypeValidationResult {
    return validateProcedureType(type);
  }

  // Comprehensive onboarding validation
  async validateCompleteOnboarding(data: OnboardingValidationData): Promise<OnboardingValidationResult> {
    return await validateOnboardingData(data);
  }

  // User role validation
  async validateUserRole(userId: string, role: string): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const result = { isValid: true, errors: [] as string[] };

    // Validate user exists
    const userValidation = await validateForeignKey('profiles', 'id', userId);
    if (!userValidation.isValid) {
      result.isValid = false;
      result.errors.push(userValidation.error || 'Usuário não encontrado');
    }

    // Validate role format
    const validRoles = ['proprietaria', 'funcionaria', 'admin'];
    if (!validRoles.includes(role)) {
      result.isValid = false;
      result.errors.push(`Role inválido. Roles válidos: ${validRoles.join(', ')}`);
    }

    // Check for duplicate roles
    try {
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', role)
        .single();

      if (existingRole) {
        result.isValid = false;
        result.errors.push('Usuário já possui este role');
      }
    } catch (error) {
      // No existing role found - this is good
    }

    return result;
  }

  // Clinic-professional relationship validation
  async validateClinicProfessionalRelationship(
    userId: string, 
    clinicId: string
  ): Promise<{
    isValid: boolean;
    errors: string[];
    alreadyExists: boolean;
  }> {
    const result = { 
      isValid: true, 
      errors: [] as string[], 
      alreadyExists: false 
    };

    // Validate foreign keys
    const fkValidations = await this.validateOnboardingForeignKeys(userId, clinicId);
    
    if (!fkValidations.user.isValid) {
      result.isValid = false;
      result.errors.push(fkValidations.user.error || 'Usuário inválido');
    }

    if (!fkValidations.clinic.isValid) {
      result.isValid = false;
      result.errors.push(fkValidations.clinic.error || 'Clínica inválida');
    }

    // Check if relationship already exists
    try {
      const { data: existingRelation } = await supabase
        .from('clinica_profissionais')
        .select('id')
        .eq('user_id', userId)
        .eq('clinica_id', clinicId)
        .single();

      if (existingRelation) {
        result.alreadyExists = true;
        // This might not be an error, depending on context
      }
    } catch (error) {
      // No existing relationship - this is expected for new onboarding
    }

    return result;
  }

  // Clear caches
  clearCaches(): void {
    this.emailCache.clear();
  }

  // Get cache statistics
  getCacheStats(): {
    emailCacheSize: number;
    emailCacheHitRate: number;
  } {
    return {
      emailCacheSize: this.emailCache.size,
      emailCacheHitRate: 0 // Would need to track hits/misses for accurate calculation
    };
  }
}

// Export singleton instance
export const validationService = new ValidationService();