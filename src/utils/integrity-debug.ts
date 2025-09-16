/**
 * Debugging utilities for integrity verification
 * Provides detailed logging and debugging information for data integrity issues
 */

import { supabase } from '@/integrations/supabase/client';
import type { UserIntegrityReport } from '@/services/integrity-verification.service';

export interface DebugInfo {
  timestamp: string;
  userId: string;
  action: string;
  details: Record<string, any>;
  success: boolean;
  error?: string;
}

export class IntegrityDebugger {
  private logs: DebugInfo[] = [];
  private maxLogs = 1000;

  // Log debug information
  log(userId: string, action: string, details: Record<string, any>, success: boolean, error?: string): void {
    const debugInfo: DebugInfo = {
      timestamp: new Date().toISOString(),
      userId,
      action,
      details,
      success,
      error
    };

    this.logs.unshift(debugInfo);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Console log for development
    if (import.meta.env.DEV) {
      console.log(`[IntegrityDebug] ${action}:`, debugInfo);
    }
  }

  // Get logs for a specific user
  getUserLogs(userId: string): DebugInfo[] {
    return this.logs.filter(log => log.userId === userId);
  }

  // Get recent logs
  getRecentLogs(limit: number = 50): DebugInfo[] {
    return this.logs.slice(0, limit);
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
  }

  // Generate detailed debug report
  async generateDebugReport(userId: string): Promise<{
    userInfo: any;
    databaseState: any;
    recentLogs: DebugInfo[];
    recommendations: string[];
  }> {
    this.log(userId, 'generate_debug_report', { action: 'start' }, true);

    try {
      // Get user info
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Get all related data
      const [
        { data: userRoles },
        { data: clinics },
        { data: professionals },
        { data: clinicProfessionals },
        { data: templates }
      ] = await Promise.all([
        supabase.from('user_roles').select('*').eq('user_id', userId),
        supabase.from('clinicas').select('*').in('id', 
          (await supabase.from('user_roles').select('clinica_id').eq('user_id', userId)).data?.map(r => r.clinica_id).filter(Boolean) || []
        ),
        supabase.from('profissionais').select('*').eq('user_id', userId),
        supabase.from('clinica_profissionais').select('*').eq('user_id', userId),
        supabase.from('templates_procedimentos').select('*').eq('criado_por', userId)
      ]);

      const databaseState = {
        profile,
        userRoles,
        clinics,
        professionals,
        clinicProfessionals,
        templates
      };

      const recentLogs = this.getUserLogs(userId);

      // Generate recommendations based on data state
      const recommendations = this.generateRecommendations(databaseState);

      this.log(userId, 'generate_debug_report', { 
        action: 'complete',
        dataFound: {
          profile: !!profile,
          userRoles: userRoles?.length || 0,
          clinics: clinics?.length || 0,
          professionals: professionals?.length || 0,
          clinicProfessionals: clinicProfessionals?.length || 0,
          templates: templates?.length || 0
        }
      }, true);

      return {
        userInfo: profile,
        databaseState,
        recentLogs,
        recommendations
      };

    } catch (error) {
      this.log(userId, 'generate_debug_report', { action: 'error' }, false, (error as Error).message);
      throw error;
    }
  }

  // Generate recommendations based on database state
  private generateRecommendations(databaseState: any): string[] {
    const recommendations: string[] = [];

    if (!databaseState.profile) {
      recommendations.push('CRÍTICO: Profile do usuário não encontrado - verificar autenticação');
    }

    if (!databaseState.userRoles || databaseState.userRoles.length === 0) {
      recommendations.push('CRÍTICO: Usuário não possui roles - executar criação de role');
    } else {
      const proprietariaRole = databaseState.userRoles.find((r: any) => r.role === 'proprietaria');
      if (!proprietariaRole) {
        recommendations.push('IMPORTANTE: Usuário não possui role de proprietária');
      } else if (!proprietariaRole.clinica_id) {
        recommendations.push('CRÍTICO: Role proprietária sem clinica_id - executar criação de clínica');
      }
    }

    if (!databaseState.clinics || databaseState.clinics.length === 0) {
      recommendations.push('CRÍTICO: Nenhuma clínica encontrada - executar criação de clínica');
    }

    if (!databaseState.professionals || databaseState.professionals.length === 0) {
      recommendations.push('IMPORTANTE: Registro profissional não encontrado - executar criação de profissional');
    }

    if (!databaseState.clinicProfessionals || databaseState.clinicProfessionals.length === 0) {
      recommendations.push('CRÍTICO: Vínculo profissional-clínica não encontrado - executar vinculação');
    }

    if (!databaseState.templates || databaseState.templates.length === 0) {
      recommendations.push('RECOMENDADO: Nenhum template criado - criar templates básicos');
    }

    if (databaseState.profile?.primeiro_acesso === true) {
      recommendations.push('IMPORTANTE: Onboarding não marcado como concluído - atualizar primeiro_acesso');
    }

    return recommendations;
  }

  // Validate database consistency
  async validateDatabaseConsistency(userId: string): Promise<{
    isConsistent: boolean;
    issues: string[];
    details: Record<string, any>;
  }> {
    this.log(userId, 'validate_consistency', { action: 'start' }, true);

    const issues: string[] = [];
    const details: Record<string, any> = {};

    try {
      // Check profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        issues.push('Profile não encontrado');
        details.profileError = profileError;
      } else {
        details.profile = profile;
      }

      // Check user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);

      if (rolesError) {
        issues.push('Erro ao buscar roles do usuário');
        details.rolesError = rolesError;
      } else if (!userRoles || userRoles.length === 0) {
        issues.push('Usuário não possui roles');
      } else {
        details.userRoles = userRoles;

        // Check clinic references
        for (const role of userRoles) {
          if (role.clinica_id) {
            const { data: clinic, error: clinicError } = await supabase
              .from('clinicas')
              .select('id, nome, ativo')
              .eq('id', role.clinica_id)
              .single();

            if (clinicError || !clinic) {
              issues.push(`Clínica referenciada no role não encontrada: ${role.clinica_id}`);
            } else if (!clinic.ativo) {
              issues.push(`Clínica referenciada está inativa: ${clinic.nome}`);
            }
          }
        }
      }

      // Check professional record
      const { data: professional, error: professionalError } = await supabase
        .from('profissionais')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (professionalError && professionalError.code !== 'PGRST116') {
        issues.push('Erro ao buscar registro profissional');
        details.professionalError = professionalError;
      } else if (!professional) {
        issues.push('Registro profissional não encontrado');
      } else {
        details.professional = professional;
      }

      // Check clinic-professional relationships
      const { data: relationships, error: relationshipError } = await supabase
        .from('clinica_profissionais')
        .select('*')
        .eq('user_id', userId);

      if (relationshipError) {
        issues.push('Erro ao buscar vínculos profissionais');
        details.relationshipError = relationshipError;
      } else {
        details.relationships = relationships;
      }

      const isConsistent = issues.length === 0;

      this.log(userId, 'validate_consistency', { 
        action: 'complete',
        isConsistent,
        issuesCount: issues.length
      }, true);

      return {
        isConsistent,
        issues,
        details
      };

    } catch (error) {
      this.log(userId, 'validate_consistency', { action: 'error' }, false, (error as Error).message);
      throw error;
    }
  }

  // Export logs for analysis
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Import logs from JSON
  importLogs(logsJson: string): void {
    try {
      const importedLogs = JSON.parse(logsJson);
      if (Array.isArray(importedLogs)) {
        this.logs = importedLogs;
      }
    } catch (error) {
      console.error('Error importing logs:', error);
    }
  }

  // Get statistics about logs
  getLogStatistics(): {
    totalLogs: number;
    successRate: number;
    mostCommonActions: Array<{ action: string; count: number }>;
    mostCommonErrors: Array<{ error: string; count: number }>;
  } {
    const totalLogs = this.logs.length;
    const successfulLogs = this.logs.filter(log => log.success).length;
    const successRate = totalLogs > 0 ? (successfulLogs / totalLogs) * 100 : 0;

    // Count actions
    const actionCounts: Record<string, number> = {};
    this.logs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });

    const mostCommonActions = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));

    // Count errors
    const errorCounts: Record<string, number> = {};
    this.logs.filter(log => log.error).forEach(log => {
      if (log.error) {
        errorCounts[log.error] = (errorCounts[log.error] || 0) + 1;
      }
    });

    const mostCommonErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([error, count]) => ({ error, count }));

    return {
      totalLogs,
      successRate,
      mostCommonActions,
      mostCommonErrors
    };
  }
}

// Export singleton instance
export const integrityDebugger = new IntegrityDebugger();

// Utility functions for common debugging scenarios
export const debugUtils = {
  // Quick integrity check with logging
  async quickCheck(userId: string): Promise<boolean> {
    integrityDebugger.log(userId, 'quick_check', { action: 'start' }, true);

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      const { data: roles } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId);

      const hasProfile = !!profile;
      const hasRoles = !!(roles && roles.length > 0);
      const isValid = hasProfile && hasRoles;

      integrityDebugger.log(userId, 'quick_check', { 
        action: 'complete',
        hasProfile,
        hasRoles,
        isValid
      }, true);

      return isValid;

    } catch (error) {
      integrityDebugger.log(userId, 'quick_check', { action: 'error' }, false, (error as Error).message);
      return false;
    }
  },

  // Log integrity report for debugging
  logIntegrityReport(report: UserIntegrityReport): void {
    integrityDebugger.log(report.userId, 'integrity_report', {
      overallStatus: report.overallStatus,
      summary: report.summary,
      hasRecommendations: report.recommendations.length > 0
    }, report.overallStatus !== 'invalid');
  }
};