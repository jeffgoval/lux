/**
 * Integrity verification service for post-onboarding data consistency
 * Provides comprehensive checks for data completeness and relationship integrity
 */

import { supabase } from '@/integrations/supabase/client';

export interface IntegrityCheckResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, any>;
}

export interface UserIntegrityReport {
  userId: string;
  email: string;
  overallStatus: 'valid' | 'invalid' | 'warning';
  checks: {
    profile: IntegrityCheckResult;
    userRole: IntegrityCheckResult;
    clinic: IntegrityCheckResult;
    professional: IntegrityCheckResult;
    clinicProfessionalLink: IntegrityCheckResult;
    templates: IntegrityCheckResult;
    onboardingCompletion: IntegrityCheckResult;
  };
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warningChecks: number;
  };
  recommendations: string[];
}

export class IntegrityVerificationService {
  // Check user profile completeness
  async checkProfileIntegrity(userId: string): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      isValid: true,
      errors: [],
      warnings: [],
      details: {}
    };

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        result.isValid = false;
        result.errors.push('Profile não encontrado');
        return result;
      }

      result.details.profile = profile;

      // Check required fields
      if (!profile.email) {
        result.isValid = false;
        result.errors.push('Email não definido no profile');
      }

      if (!profile.nome_completo) {
        result.isValid = false;
        result.errors.push('Nome completo não definido');
      }

      // Check optional but recommended fields
      if (!profile.telefone) {
        result.warnings.push('Telefone não definido');
      }

      // Check onboarding status
      if (profile.primeiro_acesso === null || profile.primeiro_acesso === undefined) {
        result.warnings.push('Status de primeiro acesso não definido');
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push('Erro ao verificar profile: ' + (error as Error).message);
    }

    return result;
  }

  // Check user role integrity
  async checkUserRoleIntegrity(userId: string): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      isValid: true,
      errors: [],
      warnings: [],
      details: {}
    };

    try {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        result.isValid = false;
        result.errors.push('Erro ao buscar roles do usuário');
        return result;
      }

      result.details.roles = roles;

      if (!roles || roles.length === 0) {
        result.isValid = false;
        result.errors.push('Usuário não possui nenhum role definido');
        return result;
      }

      // Check for primary role (proprietaria)
      const proprietariaRole = roles.find(role => role.role === 'proprietaria');
      if (!proprietariaRole) {
        result.warnings.push('Usuário não possui role de proprietária');
      } else {
        // Check if proprietaria role has clinic_id
        if (!proprietariaRole.clinica_id) {
          result.isValid = false;
          result.errors.push('Role proprietária não possui clinica_id definido');
        }
        result.details.primaryRole = proprietariaRole;
      }

      // Check for duplicate roles
      const roleTypes = roles.map(r => r.role);
      const uniqueRoles = new Set(roleTypes);
      if (roleTypes.length !== uniqueRoles.size) {
        result.warnings.push('Usuário possui roles duplicados');
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push('Erro ao verificar roles: ' + (error as Error).message);
    }

    return result;
  }

  // Check clinic integrity
  async checkClinicIntegrity(userId: string): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      isValid: true,
      errors: [],
      warnings: [],
      details: {}
    };

    try {
      // Get user's clinic from user_roles
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('clinica_id')
        .eq('user_id', userId)
        .eq('role', 'proprietaria')
        .single();

      if (!userRole?.clinica_id) {
        result.isValid = false;
        result.errors.push('Usuário não possui clínica associada');
        return result;
      }

      // Check clinic exists and is complete
      const { data: clinic, error } = await supabase
        .from('clinicas')
        .select('*')
        .eq('id', userRole.clinica_id)
        .single();

      if (error || !clinic) {
        result.isValid = false;
        result.errors.push('Clínica não encontrada');
        return result;
      }

      result.details.clinic = clinic;

      // Check required fields
      if (!clinic.nome) {
        result.isValid = false;
        result.errors.push('Nome da clínica não definido');
      }

      // Check optional but recommended fields
      if (!clinic.cnpj) {
        result.warnings.push('CNPJ da clínica não definido');
      }

      if (!clinic.telefone) {
        result.warnings.push('Telefone da clínica não definido');
      }

      if (!clinic.endereco) {
        result.warnings.push('Endereço da clínica não definido');
      }

      // Check if clinic is active
      if (!clinic.ativo) {
        result.warnings.push('Clínica está marcada como inativa');
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push('Erro ao verificar clínica: ' + (error as Error).message);
    }

    return result;
  }

  // Check professional record integrity
  async checkProfessionalIntegrity(userId: string): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      isValid: true,
      errors: [],
      warnings: [],
      details: {}
    };

    try {
      const { data: professional, error } = await supabase
        .from('profissionais')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !professional) {
        result.isValid = false;
        result.errors.push('Registro profissional não encontrado');
        return result;
      }

      result.details.professional = professional;

      // Check if professional is active
      if (!professional.ativo) {
        result.warnings.push('Registro profissional está inativo');
      }

      // Check professional data completeness
      if (!professional.especialidades || professional.especialidades.length === 0) {
        result.warnings.push('Especialidades não definidas');
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push('Erro ao verificar registro profissional: ' + (error as Error).message);
    }

    return result;
  }

  // Check clinic-professional relationship
  async checkClinicProfessionalLink(userId: string): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      isValid: true,
      errors: [],
      warnings: [],
      details: {}
    };

    try {
      // Get user's clinic
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('clinica_id')
        .eq('user_id', userId)
        .eq('role', 'proprietaria')
        .single();

      if (!userRole?.clinica_id) {
        result.isValid = false;
        result.errors.push('Não foi possível determinar a clínica do usuário');
        return result;
      }

      // Check clinic-professional relationship
      const { data: relationship, error } = await supabase
        .from('clinica_profissionais')
        .select('*')
        .eq('user_id', userId)
        .eq('clinica_id', userRole.clinica_id)
        .single();

      if (error || !relationship) {
        result.isValid = false;
        result.errors.push('Vínculo profissional com a clínica não encontrado');
        return result;
      }

      result.details.relationship = relationship;

      // Check relationship is active
      if (!relationship.ativo) {
        result.warnings.push('Vínculo profissional está inativo');
      }

      // Check permissions
      const permissions = [
        'pode_criar_prontuarios',
        'pode_editar_prontuarios',
        'pode_visualizar_financeiro'
      ];

      const missingPermissions = permissions.filter(perm => !relationship[perm]);
      if (missingPermissions.length > 0) {
        result.warnings.push(`Permissões não definidas: ${missingPermissions.join(', ')}`);
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push('Erro ao verificar vínculo profissional: ' + (error as Error).message);
    }

    return result;
  }

  // Check templates integrity
  async checkTemplatesIntegrity(userId: string): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      isValid: true,
      errors: [],
      warnings: [],
      details: {}
    };

    try {
      const { data: templates, error } = await supabase
        .from('templates_procedimentos')
        .select('*')
        .eq('criado_por', userId);

      if (error) {
        result.isValid = false;
        result.errors.push('Erro ao buscar templates');
        return result;
      }

      result.details.templates = templates;

      if (!templates || templates.length === 0) {
        result.warnings.push('Nenhum template de procedimento criado');
      } else {
        // Check template completeness
        const incompleteTemplates = templates.filter(t => 
          !t.nome_template || 
          !t.tipo_procedimento || 
          !t.duracao_padrao_minutos ||
          t.valor_base === null || t.valor_base === undefined
        );

        if (incompleteTemplates.length > 0) {
          result.warnings.push(`${incompleteTemplates.length} template(s) com dados incompletos`);
        }

        // Check for inactive templates
        const inactiveTemplates = templates.filter(t => !t.ativo);
        if (inactiveTemplates.length > 0) {
          result.warnings.push(`${inactiveTemplates.length} template(s) inativo(s)`);
        }
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push('Erro ao verificar templates: ' + (error as Error).message);
    }

    return result;
  }

  // Check onboarding completion status
  async checkOnboardingCompletion(userId: string): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      isValid: true,
      errors: [],
      warnings: [],
      details: {}
    };

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('primeiro_acesso, onboarding_completed_at')
        .eq('id', userId)
        .single();

      if (!profile) {
        result.isValid = false;
        result.errors.push('Profile não encontrado para verificar onboarding');
        return result;
      }

      result.details.onboardingStatus = profile;

      // Check if onboarding is marked as complete
      if (profile.primeiro_acesso === true) {
        result.warnings.push('Onboarding ainda não foi marcado como concluído');
      }

      if (!profile.onboarding_completed_at) {
        result.warnings.push('Data de conclusão do onboarding não registrada');
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push('Erro ao verificar status do onboarding: ' + (error as Error).message);
    }

    return result;
  }

  // Generate comprehensive integrity report
  async generateIntegrityReport(userId: string): Promise<UserIntegrityReport> {
    // Get user email for report
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    const email = profile?.email || 'unknown';

    // Run all integrity checks
    const checks = {
      profile: await this.checkProfileIntegrity(userId),
      userRole: await this.checkUserRoleIntegrity(userId),
      clinic: await this.checkClinicIntegrity(userId),
      professional: await this.checkProfessionalIntegrity(userId),
      clinicProfessionalLink: await this.checkClinicProfessionalLink(userId),
      templates: await this.checkTemplatesIntegrity(userId),
      onboardingCompletion: await this.checkOnboardingCompletion(userId)
    };

    // Calculate summary
    const totalChecks = Object.keys(checks).length;
    const passedChecks = Object.values(checks).filter(check => check.isValid && check.errors.length === 0).length;
    const failedChecks = Object.values(checks).filter(check => !check.isValid || check.errors.length > 0).length;
    const warningChecks = Object.values(checks).filter(check => check.warnings.length > 0).length;

    // Determine overall status
    let overallStatus: 'valid' | 'invalid' | 'warning' = 'valid';
    if (failedChecks > 0) {
      overallStatus = 'invalid';
    } else if (warningChecks > 0) {
      overallStatus = 'warning';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (!checks.profile.isValid) {
      recommendations.push('Complete os dados do perfil do usuário');
    }
    
    if (!checks.userRole.isValid) {
      recommendations.push('Configure os roles do usuário corretamente');
    }
    
    if (!checks.clinic.isValid) {
      recommendations.push('Complete os dados da clínica');
    }
    
    if (!checks.professional.isValid) {
      recommendations.push('Crie o registro profissional do usuário');
    }
    
    if (!checks.clinicProfessionalLink.isValid) {
      recommendations.push('Estabeleça o vínculo entre profissional e clínica');
    }
    
    if (checks.templates.warnings.length > 0) {
      recommendations.push('Crie templates básicos de procedimentos');
    }
    
    if (checks.onboardingCompletion.warnings.length > 0) {
      recommendations.push('Marque o onboarding como concluído');
    }

    return {
      userId,
      email,
      overallStatus,
      checks,
      summary: {
        totalChecks,
        passedChecks,
        failedChecks,
        warningChecks
      },
      recommendations
    };
  }

  // Batch integrity verification for multiple users
  async batchIntegrityCheck(userIds: string[]): Promise<UserIntegrityReport[]> {
    const reports: UserIntegrityReport[] = [];
    
    for (const userId of userIds) {
      try {
        const report = await this.generateIntegrityReport(userId);
        reports.push(report);
      } catch (error) {
        console.error(`Error generating report for user ${userId}:`, error);
        // Add error report
        reports.push({
          userId,
          email: 'error',
          overallStatus: 'invalid',
          checks: {} as any,
          summary: { totalChecks: 0, passedChecks: 0, failedChecks: 1, warningChecks: 0 },
          recommendations: ['Erro ao gerar relatório de integridade']
        });
      }
    }
    
    return reports;
  }

  // Fix common integrity issues automatically
  async autoFixIntegrityIssues(userId: string): Promise<{
    fixed: string[];
    failed: string[];
  }> {
    const result = {
      fixed: [] as string[],
      failed: [] as string[]
    };

    try {
      // Auto-fix: Mark onboarding as complete if all other data is present
      const report = await this.generateIntegrityReport(userId);
      
      if (report.overallStatus === 'warning' && 
          report.checks.profile.isValid &&
          report.checks.userRole.isValid &&
          report.checks.clinic.isValid &&
          report.checks.professional.isValid &&
          report.checks.clinicProfessionalLink.isValid) {
        
        // Mark onboarding as complete
        const { error } = await supabase
          .from('profiles')
          .update({ 
            primeiro_acesso: false,
            onboarding_completed_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (!error) {
          result.fixed.push('Onboarding marcado como concluído');
        } else {
          result.failed.push('Falha ao marcar onboarding como concluído');
        }
      }

    } catch (error) {
      result.failed.push('Erro durante auto-correção: ' + (error as Error).message);
    }

    return result;
  }
}

// Export singleton instance
export const integrityVerificationService = new IntegrityVerificationService();