/**
 * 🔄 SERVIÇO DE TRANSAÇÕES ATÔMICAS DO ONBOARDING
 * 
 * Operações atômicas, rollback e validação de integridade
 */

import { 
  TransactionResult, 
  OnboardingData, 
  IntegrityResult, 
  IntegrityCheck, 
  IntegrityReport,
  ProgressCallback,
  UserRole,
  TipoProcedimento
} from '@/types/auth.types';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

export class OnboardingTransaction {
  private userId: string;
  private rollbackOperations: Array<() => Promise<void>> = [];

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Cria ou atualiza o perfil do usuário
   */
  async createProfile(profileData: any): Promise<TransactionResult> {
    try {
      // Validar dados obrigatórios
      if (!profileData.nome_completo?.trim()) {
        return { success: false, error: 'nome_completo is required' };
      }

      if (!profileData.email?.trim()) {
        return { success: false, error: 'email is required' };
      }

      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: this.userId,
          ...profileData,
          primeiro_acesso: true,
          ativo: true,
          atualizado_em: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Adicionar operação de rollback
      this.rollbackOperations.push(async () => {
        await supabase
          .from('profiles')
          .update({ primeiro_acesso: true })
          .eq('id', this.userId);
      });

      return { success: true, data };
    } catch (error) {
      logger.error('Profile creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cria role de proprietária para o usuário
   */
  async createRole(): Promise<TransactionResult> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: this.userId,
          role: UserRole.PROPRIETARIA,
          ativo: true,
          criado_em: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        // Se for erro de duplicata, buscar role existente
        if (error.code === '23505') {
          const { data: existingRole } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', this.userId)
            .eq('role', UserRole.PROPRIETARIA)
            .single();

          if (existingRole) {
            return { success: true, data: existingRole };
          }
        }
        
        return { success: false, error: error.message };
      }

      // Adicionar operação de rollback
      this.rollbackOperations.push(async () => {
        await supabase
          .from('user_roles')
          .delete()
          .eq('id', data.id);
      });

      return { success: true, data };
    } catch (error) {
      logger.error('Role creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cria clínica e retorna o ID
   */
  async createClinic(clinicData: any): Promise<TransactionResult> {
    try {
      // Validar dados obrigatórios
      if (!clinicData.nome?.trim()) {
        return { success: false, error: 'nome is required' };
      }

      const { data, error } = await supabase
        .from('clinicas')
        .insert({
          ...clinicData,
          proprietario_id: this.userId,
          ativo: true,
          criado_em: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Adicionar operação de rollback
      this.rollbackOperations.push(async () => {
        await supabase
          .from('clinicas')
          .delete()
          .eq('id', data.id);
      });

      return { success: true, data, clinicId: data.id };
    } catch (error) {
      logger.error('Clinic creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Atualiza role com ID da clínica
   */
  async updateRoleWithClinic(clinicId: string): Promise<TransactionResult> {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .update({ 
          clinica_id: clinicId,
          atualizado_em: new Date().toISOString()
        })
        .eq('user_id', this.userId)
        .eq('role', UserRole.PROPRIETARIA)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Role update failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cria registro profissional
   */
  async createProfessional(professionalData: any): Promise<TransactionResult> {
    try {
      const { data, error } = await supabase
        .from('profissionais')
        .insert({
          user_id: this.userId,
          ...professionalData,
          ativo: true,
          criado_em: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        // Se for erro de duplicata, buscar profissional existente
        if (error.code === '23505') {
          const { data: existingProfessional } = await supabase
            .from('profissionais')
            .select('*')
            .eq('user_id', this.userId)
            .single();

          if (existingProfessional) {
            return { success: true, data: existingProfessional };
          }
        }
        
        return { success: false, error: error.message };
      }

      // Adicionar operação de rollback
      this.rollbackOperations.push(async () => {
        await supabase
          .from('profissionais')
          .delete()
          .eq('id', data.id);
      });

      return { success: true, data };
    } catch (error) {
      logger.error('Professional creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Vincula profissional à clínica
   */
  async linkProfessionalToClinic(clinicId: string): Promise<TransactionResult> {
    try {
      const { data, error } = await supabase
        .from('clinica_profissionais')
        .insert({
          clinica_id: clinicId,
          user_id: this.userId,
          cargo: 'Proprietário',
          pode_criar_prontuarios: true,
          pode_editar_prontuarios: true,
          pode_visualizar_financeiro: true,
          ativo: true,
          criado_em: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        // Se for erro de duplicata, buscar vinculação existente
        if (error.code === '23505') {
          const { data: existingLink } = await supabase
            .from('clinica_profissionais')
            .select('*')
            .eq('clinica_id', clinicId)
            .eq('user_id', this.userId)
            .single();

          if (existingLink) {
            return { success: true, data: existingLink };
          }
        }
        
        return { success: false, error: error.message };
      }

      // Adicionar operação de rollback
      this.rollbackOperations.push(async () => {
        await supabase
          .from('clinica_profissionais')
          .delete()
          .eq('id', data.id);
      });

      return { success: true, data };
    } catch (error) {
      logger.error('Professional linking failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cria templates básicos de procedimentos
   */
  async createTemplates(): Promise<TransactionResult> {
    try {
      const basicTemplates = [
        {
          tipo_procedimento: TipoProcedimento.LIMPEZA_PELE,
          nome_template: 'Limpeza de Pele Básica',
          descricao: 'Limpeza profunda com extração de cravos',
          duracao_padrao_minutos: 60,
          valor_base: 80.00,
          ativo: true,
          criado_por: this.userId,
          criado_em: new Date().toISOString()
        },
        {
          tipo_procedimento: TipoProcedimento.PEELING,
          nome_template: 'Peeling Químico',
          descricao: 'Peeling químico superficial',
          duracao_padrao_minutos: 45,
          valor_base: 120.00,
          ativo: true,
          criado_por: this.userId,
          criado_em: new Date().toISOString()
        }
      ];

      const { data, error } = await supabase
        .from('templates_procedimentos')
        .insert(basicTemplates)
        .select();

      if (error) {
        return { success: false, error: error.message };
      }

      // Adicionar operação de rollback
      this.rollbackOperations.push(async () => {
        const templateIds = data.map(t => t.id);
        await supabase
          .from('templates_procedimentos')
          .delete()
          .in('id', templateIds);
      });

      return { success: true, data };
    } catch (error) {
      logger.error('Template creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Marca onboarding como completo
   */
  async markOnboardingComplete(): Promise<TransactionResult> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          primeiro_acesso: false,
          onboarding_completed_at: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        })
        .eq('id', this.userId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      logger.error('Onboarding completion failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Executa transação completa de onboarding
   */
  async executeComplete(
    data: OnboardingData,
    progressCallback?: ProgressCallback
  ): Promise<TransactionResult> {
    try {
      // Validar dados de entrada
      const validation = this.validateOnboardingData(data);
      if (!validation.success) {
        return validation;
      }

      const steps = [
        { method: 'createProfile', data: data.profile, message: 'Creating user profile...' },
        { method: 'createRole', data: null, message: 'Creating user role...' },
        { method: 'createClinic', data: data.clinic, message: 'Creating clinic...' },
        { method: 'updateRoleWithClinic', data: null, message: 'Updating role with clinic...' },
        { method: 'createProfessional', data: data.professional, message: 'Creating professional record...' },
        { method: 'linkProfessionalToClinic', data: null, message: 'Linking professional to clinic...' },
        { method: 'createTemplates', data: null, message: 'Creating procedure templates...' },
        { method: 'markOnboardingComplete', data: null, message: 'Finalizing onboarding...' }
      ];

      let clinicId: string | undefined;

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        
        if (progressCallback) {
          progressCallback({
            step: step.method,
            progress: ((i + 1) / steps.length) * 100,
            message: step.message
          });
        }

        let result: TransactionResult;

        switch (step.method) {
          case 'createProfile':
            result = await this.createProfile(step.data);
            break;
          case 'createRole':
            result = await this.createRole();
            break;
          case 'createClinic':
            result = await this.createClinic(step.data);
            if (result.success) {
              clinicId = result.clinicId;
            }
            break;
          case 'updateRoleWithClinic':
            result = await this.updateRoleWithClinic(clinicId!);
            break;
          case 'createProfessional':
            result = await this.createProfessional(step.data);
            break;
          case 'linkProfessionalToClinic':
            result = await this.linkProfessionalToClinic(clinicId!);
            break;
          case 'createTemplates':
            result = await this.createTemplates();
            break;
          case 'markOnboardingComplete':
            result = await this.markOnboardingComplete();
            break;
          default:
            result = { success: false, error: `Unknown step: ${step.method}` };
        }

        if (!result.success) {
          // Executar rollback
          await this.rollback();
          return { success: false, error: result.error };
        }
      }

      return { success: true, clinicId };
    } catch (error) {
      logger.error('Complete onboarding transaction failed:', error);
      await this.rollback();
      return { success: false, error: error.message };
    }
  }

  /**
   * Executa rollback de todas as operações
   */
  async rollback(): Promise<TransactionResult> {
    try {
      // Executar operações de rollback em ordem reversa
      for (const operation of this.rollbackOperations.reverse()) {
        try {
          await operation();
        } catch (error) {
          logger.error('Rollback operation failed:', error);
        }
      }

      this.rollbackOperations = [];
      return { success: true };
    } catch (error) {
      logger.error('Rollback failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verifica integridade dos dados após onboarding
   */
  async verifyIntegrity(clinicId: string): Promise<IntegrityResult> {
    const checks: IntegrityCheck = {
      profile: false,
      role: false,
      clinic: false,
      professional: false,
      clinicLink: false,
      templates: false,
      onboardingComplete: false
    };

    const missingRelationships: string[] = [];

    try {
      // Verificar profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', this.userId)
        .single();
      
      checks.profile = !!profile;
      checks.onboardingComplete = profile?.primeiro_acesso === false;

      // Verificar role
      const { data: role } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', this.userId)
        .eq('clinica_id', clinicId)
        .single();
      
      checks.role = !!role;

      // Verificar clinic
      const { data: clinic } = await supabase
        .from('clinicas')
        .select('*')
        .eq('id', clinicId)
        .single();
      
      checks.clinic = !!clinic;

      // Verificar professional
      const { data: professional } = await supabase
        .from('profissionais')
        .select('*')
        .eq('user_id', this.userId)
        .single();
      
      checks.professional = !!professional;

      // Verificar clinic link
      const { data: clinicLink } = await supabase
        .from('clinica_profissionais')
        .select('*')
        .eq('clinica_id', clinicId)
        .eq('user_id', this.userId)
        .single();
      
      checks.clinicLink = !!clinicLink;

      // Verificar templates
      const { data: templates } = await supabase
        .from('templates_procedimentos')
        .select('*')
        .eq('criado_por', this.userId);
      
      checks.templates = templates && templates.length > 0;

      // Identificar relacionamentos faltantes
      Object.entries(checks).forEach(([key, value]) => {
        if (!value) {
          missingRelationships.push(key);
        }
      });

      const success = Object.values(checks).every(check => check);

      const result: IntegrityResult = {
        success,
        checks,
        missingRelationships: success ? undefined : missingRelationships
      };

      if (!success) {
        result.repairSuggestions = this.generateRepairSuggestions(missingRelationships);
      }

      return result;
    } catch (error) {
      logger.error('Integrity verification failed:', error);
      return {
        success: false,
        checks,
        missingRelationships: Object.keys(checks),
        repairSuggestions: ['Run complete onboarding transaction again']
      };
    }
  }

  /**
   * Gera relatório completo de integridade
   */
  async generateIntegrityReport(clinicId: string): Promise<IntegrityReport> {
    const integrityResult = await this.verifyIntegrity(clinicId);
    
    const totalChecks = Object.keys(integrityResult.checks).length;
    const passedChecks = Object.values(integrityResult.checks).filter(Boolean).length;
    const failedChecks = totalChecks - passedChecks;

    return {
      timestamp: new Date(),
      userId: this.userId,
      clinicId,
      checks: integrityResult.checks,
      summary: {
        totalChecks,
        passedChecks,
        failedChecks,
        overallStatus: integrityResult.success ? 'PASS' : 'FAIL'
      }
    };
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  private validateOnboardingData(data: OnboardingData): TransactionResult {
    if (!data.profile?.nome_completo?.trim()) {
      return { success: false, error: 'Profile name is required' };
    }

    if (!data.profile?.email?.trim()) {
      return { success: false, error: 'Profile email is required' };
    }

    if (!data.clinic?.nome?.trim()) {
      return { success: false, error: 'Clinic name is required' };
    }

    if (!data.professional?.especialidades?.length) {
      return { success: false, error: 'At least one specialty is required' };
    }

    return { success: true };
  }

  private generateRepairSuggestions(missingRelationships: string[]): string[] {
    const suggestions: string[] = [];

    if (missingRelationships.includes('profile')) {
      suggestions.push('Create or update user profile');
    }

    if (missingRelationships.includes('role')) {
      suggestions.push('Create proprietaria role for user');
    }

    if (missingRelationships.includes('clinic')) {
      suggestions.push('Create clinic record');
    }

    if (missingRelationships.includes('professional')) {
      suggestions.push('Create professional record');
    }

    if (missingRelationships.includes('clinicLink')) {
      suggestions.push('Link professional to clinic');
    }

    if (missingRelationships.includes('templates')) {
      suggestions.push('Create basic procedure templates');
    }

    if (missingRelationships.includes('onboardingComplete')) {
      suggestions.push('Mark onboarding as complete');
    }

    return suggestions;
  }
}