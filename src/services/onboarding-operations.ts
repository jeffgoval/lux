import { supabase } from '@/integrations/supabase/client';
import { authLogger } from '@/utils/logger';
import {
  OnboardingOperation,
  OnboardingOperationContext,
  OnboardingOperationResult,
  OnboardingOperationType
} from '@/types/onboarding-transaction';

// Base operation class
abstract class BaseOnboardingOperation implements OnboardingOperation {
  abstract type: OnboardingOperationType;
  
  abstract execute(context: OnboardingOperationContext): Promise<OnboardingOperationResult>;
  abstract rollback(context: OnboardingOperationContext, rollbackInfo: any): Promise<void>;
  
  async validate(context: OnboardingOperationContext): Promise<boolean> {
    // Default validation - check if user exists and is authenticated
    if (!context.userId) {
      return false;
    }
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      return !error && !!session && session.user.id === context.userId;
    } catch {
      return false;
    }
  }

  protected createResult(
    success: boolean, 
    operationId: string, 
    data?: any, 
    error?: string, 
    rollbackInfo?: any
  ): OnboardingOperationResult {
    return {
      success,
      operationId,
      data,
      error,
      rollbackInfo
    };
  }
}

// Create Profile Operation
export class CreateProfileOperation extends BaseOnboardingOperation {
  type = OnboardingOperationType.CREATE_PROFILE;

  async execute(context: OnboardingOperationContext): Promise<OnboardingOperationResult> {
    const operationId = `${this.type}_${Date.now()}`;
    
    try {
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, nome_completo')
        .eq('id', context.userId)
        .maybeSingle();

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            nome_completo: context.data.nomeCompleto,
            telefone: context.data.telefone
          })
          .eq('id', context.userId);

        if (updateError) {
          throw new Error(`Failed to update profile: ${updateError.message}`);
        }

        return this.createResult(
          true,
          operationId,
          { profileId: context.userId, updated: true },
          undefined,
          { existingProfile, operation: 'update' }
        );
      } else {
        // Create new profile
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: context.userId,
            nome_completo: context.data.nomeCompleto,
            telefone: context.data.telefone,
            email: (await supabase.auth.getUser()).data.user?.email || ''
          });

        if (createError) {
          throw new Error(`Failed to create profile: ${createError.message}`);
        }

        return this.createResult(
          true,
          operationId,
          { profileId: context.userId, created: true },
          undefined,
          { operation: 'create' }
        );
      }
    } catch (error) {
      authLogger.error('CreateProfileOperation failed:', error);
      return this.createResult(
        false,
        operationId,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async rollback(context: OnboardingOperationContext, rollbackInfo: any): Promise<void> {
    try {
      if (rollbackInfo?.operation === 'create') {
        // Delete created profile
        await supabase
          .from('profiles')
          .delete()
          .eq('id', context.userId);
      } else if (rollbackInfo?.operation === 'update' && rollbackInfo?.existingProfile) {
        // Restore original profile data
        await supabase
          .from('profiles')
          .update({
            nome_completo: rollbackInfo.existingProfile.nome_completo
          })
          .eq('id', context.userId);
      }
    } catch (error) {
      authLogger.error('CreateProfileOperation rollback failed:', error);
    }
  }
}

// Create Role Operation
export class CreateRoleOperation extends BaseOnboardingOperation {
  type = OnboardingOperationType.CREATE_ROLE;

  async execute(context: OnboardingOperationContext): Promise<OnboardingOperationResult> {
    const operationId = `${this.type}_${Date.now()}`;
    
    try {
      // Check if role already exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id, role, clinica_id')
        .eq('user_id', context.userId)
        .eq('role', 'proprietaria')
        .maybeSingle();

      if (existingRole) {
        return this.createResult(
          true,
          operationId,
          { roleId: existingRole.id, exists: true },
          undefined,
          { existingRole, operation: 'exists' }
        );
      }

      // Create new role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: context.userId,
          role: 'proprietaria',
          ativo: true,
          criado_por: context.userId
        })
        .select('id')
        .single();

      if (roleError) {
        throw new Error(`Failed to create role: ${roleError.message}`);
      }

      return this.createResult(
        true,
        operationId,
        { roleId: roleData.id, created: true },
        undefined,
        { roleId: roleData.id, operation: 'create' }
      );
    } catch (error) {
      authLogger.error('CreateRoleOperation failed:', error);
      return this.createResult(
        false,
        operationId,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async rollback(context: OnboardingOperationContext, rollbackInfo: any): Promise<void> {
    try {
      if (rollbackInfo?.operation === 'create' && rollbackInfo?.roleId) {
        // Delete created role
        await supabase
          .from('user_roles')
          .delete()
          .eq('id', rollbackInfo.roleId);
      }
    } catch (error) {
      authLogger.error('CreateRoleOperation rollback failed:', error);
    }
  }
}

// Create Clinic Operation
export class CreateClinicOperation extends BaseOnboardingOperation {
  type = OnboardingOperationType.CREATE_CLINIC;

  async execute(context: OnboardingOperationContext): Promise<OnboardingOperationResult & { clinicId?: string }> {
    const operationId = `${this.type}_${Date.now()}`;
    
    try {
      // Prepare clinic data
      const horarioFuncionamento = {
        segunda: { inicio: context.data.horarioInicio, fim: context.data.horarioFim, ativo: true },
        terca: { inicio: context.data.horarioInicio, fim: context.data.horarioFim, ativo: true },
        quarta: { inicio: context.data.horarioInicio, fim: context.data.horarioFim, ativo: true },
        quinta: { inicio: context.data.horarioInicio, fim: context.data.horarioFim, ativo: true },
        sexta: { inicio: context.data.horarioInicio, fim: context.data.horarioFim, ativo: true },
        sabado: { inicio: context.data.horarioInicio, fim: context.data.horarioFim, ativo: false },
        domingo: { inicio: context.data.horarioInicio, fim: context.data.horarioFim, ativo: false }
      };

      const enderecoJson = {
        rua: context.data.enderecoRua || null,
        numero: context.data.enderecoNumero || null,
        complemento: context.data.enderecoComplemento || null,
        bairro: context.data.enderecoBairro || null,
        cidade: context.data.enderecoCidade || null,
        estado: context.data.enderecoEstado || null,
        cep: context.data.enderecoCep || null
      };

      const clinicaPayload = {
        nome: context.data.nomeClinica,
        cnpj: context.data.cnpj || null,
        endereco: enderecoJson,
        telefone_principal: context.data.telefoneClinica || null,
        email_contato: context.data.emailClinica || null,
        horario_funcionamento: horarioFuncionamento
      };

      // Create clinic
      const { data: clinicaResponse, error: clinicaError } = await supabase
        .from('clinicas')
        .insert(clinicaPayload)
        .select('id')
        .single();

      if (clinicaError) {
        throw new Error(`Failed to create clinic: ${clinicaError.message}`);
      }

      const clinicId = clinicaResponse.id;

      return {
        ...this.createResult(
          true,
          operationId,
          { clinicId, created: true },
          undefined,
          { clinicId, operation: 'create' }
        ),
        clinicId
      };
    } catch (error) {
      authLogger.error('CreateClinicOperation failed:', error);
      return {
        ...this.createResult(
          false,
          operationId,
          undefined,
          error instanceof Error ? error.message : 'Unknown error'
        )
      };
    }
  }

  async rollback(context: OnboardingOperationContext, rollbackInfo: any): Promise<void> {
    try {
      if (rollbackInfo?.operation === 'create' && rollbackInfo?.clinicId) {
        // Delete created clinic
        await supabase
          .from('clinicas')
          .delete()
          .eq('id', rollbackInfo.clinicId);
      }
    } catch (error) {
      authLogger.error('CreateClinicOperation rollback failed:', error);
    }
  }
}

// Update Role with Clinic Operation
export class UpdateRoleWithClinicOperation extends BaseOnboardingOperation {
  type = OnboardingOperationType.UPDATE_ROLE_WITH_CLINIC;
  
  private clinicId: string;

  constructor(clinicId: string) {
    super();
    this.clinicId = clinicId;
  }

  async execute(context: OnboardingOperationContext): Promise<OnboardingOperationResult> {
    const operationId = `${this.type}_${Date.now()}`;
    
    try {
      // Get current role data for rollback
      const { data: currentRole } = await supabase
        .from('user_roles')
        .select('id, clinica_id')
        .eq('user_id', context.userId)
        .eq('role', 'proprietaria')
        .single();

      if (!currentRole) {
        throw new Error('Role not found for user');
      }

      // Update role with clinic ID
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ clinica_id: this.clinicId })
        .eq('user_id', context.userId)
        .eq('role', 'proprietaria');

      if (updateError) {
        throw new Error(`Failed to update role with clinic: ${updateError.message}`);
      }

      return this.createResult(
        true,
        operationId,
        { roleId: currentRole.id, clinicId: this.clinicId, updated: true },
        undefined,
        { roleId: currentRole.id, previousClinicId: currentRole.clinica_id, operation: 'update' }
      );
    } catch (error) {
      authLogger.error('UpdateRoleWithClinicOperation failed:', error);
      return this.createResult(
        false,
        operationId,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async rollback(context: OnboardingOperationContext, rollbackInfo: any): Promise<void> {
    try {
      if (rollbackInfo?.operation === 'update' && rollbackInfo?.roleId) {
        // Restore previous clinic ID (or null)
        await supabase
          .from('user_roles')
          .update({ clinica_id: rollbackInfo.previousClinicId })
          .eq('id', rollbackInfo.roleId);
      }
    } catch (error) {
      authLogger.error('UpdateRoleWithClinicOperation rollback failed:', error);
    }
  }
}

// Create Professional Operation
export class CreateProfessionalOperation extends BaseOnboardingOperation {
  type = OnboardingOperationType.CREATE_PROFESSIONAL;

  async execute(context: OnboardingOperationContext): Promise<OnboardingOperationResult> {
    const operationId = `${this.type}_${Date.now()}`;
    
    try {
      // Only create professional record if user is marking themselves as professional
      if (!context.data.souEuMesma) {
        return this.createResult(
          true,
          operationId,
          { skipped: true, reason: 'User is not marking themselves as professional' },
          undefined,
          { operation: 'skip' }
        );
      }

      // Check if professional record already exists
      const { data: existingProfessional } = await supabase
        .from('profissionais')
        .select('id, registro_profissional')
        .eq('user_id', context.userId)
        .maybeSingle();

      if (existingProfessional) {
        return this.createResult(
          true,
          operationId,
          { professionalId: existingProfessional.id, exists: true },
          undefined,
          { existingProfessional, operation: 'exists' }
        );
      }

      // Create professional record
      const { data: professionalData, error: professionalError } = await supabase
        .from('profissionais')
        .insert({
          user_id: context.userId,
          registro_profissional: `TEMP-${Date.now()}`, // Temporary registration
          especialidades: [context.data.especialidade],
          ativo: true
        })
        .select('id')
        .single();

      if (professionalError) {
        // Handle duplicate key error gracefully
        if (professionalError.code === '23505') {
          authLogger.warn('Professional record already exists, continuing...');
          return this.createResult(
            true,
            operationId,
            { exists: true, duplicate: true },
            undefined,
            { operation: 'duplicate' }
          );
        }
        throw new Error(`Failed to create professional: ${professionalError.message}`);
      }

      return this.createResult(
        true,
        operationId,
        { professionalId: professionalData.id, created: true },
        undefined,
        { professionalId: professionalData.id, operation: 'create' }
      );
    } catch (error) {
      authLogger.error('CreateProfessionalOperation failed:', error);
      return this.createResult(
        false,
        operationId,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async rollback(context: OnboardingOperationContext, rollbackInfo: any): Promise<void> {
    try {
      if (rollbackInfo?.operation === 'create' && rollbackInfo?.professionalId) {
        // Delete created professional record
        await supabase
          .from('profissionais')
          .delete()
          .eq('id', rollbackInfo.professionalId);
      }
    } catch (error) {
      authLogger.error('CreateProfessionalOperation rollback failed:', error);
    }
  }
}

// Link Professional to Clinic Operation
export class LinkProfessionalToClinicOperation extends BaseOnboardingOperation {
  type = OnboardingOperationType.LINK_PROFESSIONAL_TO_CLINIC;
  
  private clinicId: string;

  constructor(clinicId: string) {
    super();
    this.clinicId = clinicId;
  }

  async execute(context: OnboardingOperationContext): Promise<OnboardingOperationResult> {
    const operationId = `${this.type}_${Date.now()}`;
    
    try {
      // Check if link already exists
      const { data: existingLink } = await supabase
        .from('clinica_profissionais')
        .select('id, cargo, especialidades')
        .eq('clinica_id', this.clinicId)
        .eq('user_id', context.userId)
        .maybeSingle();

      if (existingLink) {
        return this.createResult(
          true,
          operationId,
          { linkId: existingLink.id, exists: true },
          undefined,
          { existingLink, operation: 'exists' }
        );
      }

      // Determine professional data based on user choice
      const cargo = context.data.souEuMesma ? 'Proprietário' : 'Profissional';
      const especialidades = context.data.souEuMesma 
        ? [context.data.especialidade]
        : [context.data.especialidadeProfissional];

      // Create professional-clinic link
      const { data: linkData, error: linkError } = await supabase
        .from('clinica_profissionais')
        .insert({
          clinica_id: this.clinicId,
          user_id: context.data.souEuMesma ? context.userId : null, // null for external professionals
          cargo,
          especialidades,
          pode_criar_prontuarios: true,
          pode_editar_prontuarios: true,
          pode_visualizar_financeiro: context.data.souEuMesma, // Only owner can see financial
          ativo: true
        })
        .select('id')
        .single();

      if (linkError) {
        // Handle duplicate key error gracefully
        if (linkError.code === '23505') {
          authLogger.warn('Professional-clinic link already exists, continuing...');
          return this.createResult(
            true,
            operationId,
            { exists: true, duplicate: true },
            undefined,
            { operation: 'duplicate' }
          );
        }
        throw new Error(`Failed to link professional to clinic: ${linkError.message}`);
      }

      return this.createResult(
        true,
        operationId,
        { linkId: linkData.id, created: true, clinicId: this.clinicId },
        undefined,
        { linkId: linkData.id, clinicId: this.clinicId, operation: 'create' }
      );
    } catch (error) {
      authLogger.error('LinkProfessionalToClinicOperation failed:', error);
      return this.createResult(
        false,
        operationId,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async rollback(context: OnboardingOperationContext, rollbackInfo: any): Promise<void> {
    try {
      if (rollbackInfo?.operation === 'create' && rollbackInfo?.linkId) {
        // Delete created professional-clinic link
        await supabase
          .from('clinica_profissionais')
          .delete()
          .eq('id', rollbackInfo.linkId);
      }
    } catch (error) {
      authLogger.error('LinkProfessionalToClinicOperation rollback failed:', error);
    }
  }
}

// Create Template Operation
export class CreateTemplateOperation extends BaseOnboardingOperation {
  type = OnboardingOperationType.CREATE_TEMPLATE;

  async execute(context: OnboardingOperationContext): Promise<OnboardingOperationResult> {
    const operationId = `${this.type}_${Date.now()}`;
    
    try {
      // Parse price from string format
      const precoNumerico = parseFloat(
        context.data.precoServico.replace(/[^\d,]/g, '').replace(',', '.')
      ) || 0;

      // Validate required data
      if (!context.data.nomeServico?.trim()) {
        throw new Error('Service name is required for template creation');
      }

      if (precoNumerico <= 0) {
        throw new Error('Service price must be greater than zero');
      }

      // Check if template with same name already exists for this user
      const { data: existingTemplate } = await supabase
        .from('templates_procedimentos')
        .select('id, nome_template')
        .eq('criado_por', context.userId)
        .eq('nome_template', context.data.nomeServico)
        .maybeSingle();

      if (existingTemplate) {
        return this.createResult(
          true,
          operationId,
          { templateId: existingTemplate.id, exists: true },
          undefined,
          { existingTemplate, operation: 'exists' }
        );
      }

      // Create template
      const { data: templateData, error: templateError } = await supabase
        .from('templates_procedimentos')
        .insert({
          tipo_procedimento: 'consulta', // Default for onboarding
          nome_template: context.data.nomeServico,
          descricao: context.data.descricaoServico || null,
          duracao_padrao_minutos: context.data.duracaoServico,
          valor_base: precoNumerico,
          campos_obrigatorios: {
            duracao_minutos: { 
              type: "number", 
              required: true, 
              default: context.data.duracaoServico 
            },
            valor_procedimento: { 
              type: "number", 
              required: true, 
              default: precoNumerico 
            }
          },
          campos_opcionais: {
            observacoes: { type: "text" },
            retorno_recomendado: { type: "date" }
          },
          ativo: true,
          criado_por: context.userId
        })
        .select('id')
        .single();

      if (templateError) {
        // Handle duplicate key error gracefully
        if (templateError.code === '23505') {
          authLogger.warn('Template already exists, continuing...');
          return this.createResult(
            true,
            operationId,
            { exists: true, duplicate: true },
            undefined,
            { operation: 'duplicate' }
          );
        }
        throw new Error(`Failed to create template: ${templateError.message}`);
      }

      return this.createResult(
        true,
        operationId,
        { templateId: templateData.id, created: true },
        undefined,
        { templateId: templateData.id, operation: 'create' }
      );
    } catch (error) {
      authLogger.error('CreateTemplateOperation failed:', error);
      return this.createResult(
        false,
        operationId,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async rollback(context: OnboardingOperationContext, rollbackInfo: any): Promise<void> {
    try {
      if (rollbackInfo?.operation === 'create' && rollbackInfo?.templateId) {
        // Delete created template
        await supabase
          .from('templates_procedimentos')
          .delete()
          .eq('id', rollbackInfo.templateId);
      }
    } catch (error) {
      authLogger.error('CreateTemplateOperation rollback failed:', error);
    }
  }
}

// Mark Onboarding Complete Operation
export class MarkOnboardingCompleteOperation extends BaseOnboardingOperation {
  type = OnboardingOperationType.MARK_ONBOARDING_COMPLETE;

  async execute(context: OnboardingOperationContext): Promise<OnboardingOperationResult> {
    const operationId = `${this.type}_${Date.now()}`;
    
    try {
      // Get current profile state for rollback
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id, primeiro_acesso')
        .eq('id', context.userId)
        .single();

      if (!currentProfile) {
        throw new Error('Profile not found for user');
      }

      // Update profile to mark onboarding as complete
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          primeiro_acesso: false,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', context.userId);

      if (updateError) {
        throw new Error(`Failed to mark onboarding complete: ${updateError.message}`);
      }

      // Verify the update was successful
      const { data: verifyData, error: verifyError } = await supabase
        .from('profiles')
        .select('primeiro_acesso')
        .eq('id', context.userId)
        .single();

      if (verifyError) {
        throw new Error(`Failed to verify onboarding completion: ${verifyError.message}`);
      }

      if (verifyData.primeiro_acesso !== false) {
        throw new Error('Failed to mark onboarding as complete - verification failed');
      }

      return this.createResult(
        true,
        operationId,
        { profileId: context.userId, completed: true },
        undefined,
        { 
          profileId: context.userId, 
          previousFirstAccess: currentProfile.primeiro_acesso,
          operation: 'update' 
        }
      );
    } catch (error) {
      authLogger.error('MarkOnboardingCompleteOperation failed:', error);
      return this.createResult(
        false,
        operationId,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async rollback(context: OnboardingOperationContext, rollbackInfo: any): Promise<void> {
    try {
      if (rollbackInfo?.operation === 'update' && rollbackInfo?.profileId) {
        // Restore previous primeiro_acesso value
        await supabase
          .from('profiles')
          .update({ primeiro_acesso: rollbackInfo.previousFirstAccess })
          .eq('id', rollbackInfo.profileId);
      }
    } catch (error) {
      authLogger.error('MarkOnboardingCompleteOperation rollback failed:', error);
    }
  }
}

// Export all operations
export const onboardingOperations = {
  CreateProfileOperation,
  CreateRoleOperation,
  CreateClinicOperation,
  UpdateRoleWithClinicOperation,
  CreateProfessionalOperation,
  LinkProfessionalToClinicOperation,
  CreateTemplateOperation,
  MarkOnboardingCompleteOperation
};