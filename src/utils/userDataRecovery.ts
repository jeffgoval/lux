import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export interface UserDataStatus {
  hasProfile: boolean;
  hasRole: boolean;
  profileData?: any;
  roleData?: any;
  isComplete: boolean;
}

export interface RecoveryResult {
  success: boolean;
  profileCreated: boolean;
  roleCreated: boolean;
  error?: string;
}

/**
 * Check the current status of user data (profile and roles)
 */
export async function checkUserDataStatus(userId: string): Promise<UserDataStatus> {
  try {
    // Check profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error checking profile:', profileError);
    }

    // Check roles
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('ativo', true);

    if (roleError) {
      console.error('Error checking roles:', roleError);
    }

    const hasProfile = !!profileData;
    const hasRole = !!(roleData && roleData.length > 0);

    return {
      hasProfile,
      hasRole,
      profileData,
      roleData,
      isComplete: hasProfile && hasRole
    };
  } catch (error) {
    console.error('Error checking user data status:', error);
    return {
      hasProfile: false,
      hasRole: false,
      isComplete: false
    };
  }
}

/**
 * Attempt to recover missing user data using the database function
 */
export async function recoverMissingUserData(userId: string): Promise<RecoveryResult> {
  try {
    const { data, error } = await supabase.rpc('fix_missing_user_data', {
      user_uuid: userId
    });

    if (error) {
      console.error('Error calling fix_missing_user_data:', error);
      return {
        success: false,
        profileCreated: false,
        roleCreated: false,
        error: error.message
      };
    }

    if (data?.success) {
      return {
        success: true,
        profileCreated: data.profile_created || false,
        roleCreated: data.role_created || false
      };
    }

    return {
      success: false,
      profileCreated: false,
      roleCreated: false,
      error: data?.error || 'Unknown error'
    };
  } catch (error: any) {
    console.error('Error recovering user data:', error);
    return {
      success: false,
      profileCreated: false,
      roleCreated: false,
      error: error.message || 'Network error'
    };
  }
}

/**
 * Manual fallback to create missing profile
 */
export async function createMissingProfile(user: User): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .insert({
        user_id: user.id,
        nome_completo: user.user_metadata?.nome_completo || user.email || 'Usuário',
        email: user.email || '',
        primeiro_acesso: true,
        ativo: true
      });

    if (error) {
      console.error('Error creating missing profile:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error creating missing profile:', error);
    return false;
  }
}

/**
 * Manual fallback to create missing role
 */
export async function createMissingRole(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'proprietaria',
        ativo: true,
        criado_por: userId
      });

    if (error) {
      console.error('Error creating missing role:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error creating missing role:', error);
    return false;
  }
}

/**
 * Comprehensive recovery function that tries multiple approaches
 */
export async function comprehensiveUserDataRecovery(user: User): Promise<RecoveryResult> {
  console.log('Starting comprehensive user data recovery for:', user.email);

  // First, check current status
  const status = await checkUserDataStatus(user.id);
  console.log('Current user data status:', status);

  if (status.isComplete) {
    return {
      success: true,
      profileCreated: false,
      roleCreated: false
    };
  }

  // Try using the database function first
  const dbRecovery = await recoverMissingUserData(user.id);
  if (dbRecovery.success) {
    console.log('Database recovery successful:', dbRecovery);
    return dbRecovery;
  }

  console.log('Database recovery failed, trying manual approach...');

  // Manual fallback approach
  let profileCreated = false;
  let roleCreated = false;
  let lastError = '';

  // Create missing profile
  if (!status.hasProfile) {
    profileCreated = await createMissingProfile(user);
    if (!profileCreated) {
      lastError = 'Failed to create profile manually';
    }
  }

  // Create missing role
  if (!status.hasRole) {
    roleCreated = await createMissingRole(user.id);
    if (!roleCreated) {
      lastError = 'Failed to create role manually';
    }
  }

  const success = (status.hasProfile || profileCreated) && (status.hasRole || roleCreated);

  return {
    success,
    profileCreated,
    roleCreated,
    error: success ? undefined : lastError
  };
}

/**
 * Validate user data integrity and report issues
 */
export async function validateUserDataIntegrity(userId: string): Promise<{
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  try {
    const status = await checkUserDataStatus(userId);

    if (!status.hasProfile) {
      issues.push('Profile não encontrado');
      recommendations.push('Execute a recuperação de dados do usuário');
    } else if (status.profileData) {
      if (!status.profileData.nome_completo) {
        issues.push('Nome completo não preenchido no profile');
        recommendations.push('Complete o nome no perfil do usuário');
      }
      if (!status.profileData.email) {
        issues.push('Email não preenchido no profile');
        recommendations.push('Atualize o email no perfil do usuário');
      }
    }

    if (!status.hasRole) {
      issues.push('Nenhum role encontrado');
      recommendations.push('Execute a recuperação de dados do usuário');
    } else if (status.roleData && status.roleData.length === 0) {
      issues.push('Roles existem mas estão inativos');
      recommendations.push('Ative pelo menos um role para o usuário');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  } catch (error) {
    console.error('Error validating user data integrity:', error);
    return {
      isValid: false,
      issues: ['Erro ao validar integridade dos dados'],
      recommendations: ['Tente novamente ou contate o suporte']
    };
  }
}