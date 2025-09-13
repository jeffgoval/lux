import { UserProfile, UserRoleContext } from '@/contexts/AuthContext';

export interface OnboardingStatus {
  needsOnboarding: boolean;
  reason: string;
  canSkip: boolean;
}

/**
 * Determines if a user needs to go through onboarding
 */
export function checkOnboardingStatus(
  profile: UserProfile | null,
  roles: UserRoleContext[],
  isProfileLoading: boolean,
  isRolesLoading: boolean
): OnboardingStatus {
  // If data is still loading, don't make decisions yet
  if (isProfileLoading || isRolesLoading) {
    return {
      needsOnboarding: false,
      reason: 'Data still loading',
      canSkip: false
    };
  }

  // If we have no profile and no roles, but data finished loading,
  // this might be a temporary state during user creation - be conservative
  if (!profile && roles.length === 0) {
    return {
      needsOnboarding: true,
      reason: 'No profile and no roles found',
      canSkip: false
    };
  }

  // No profile at all - definitely needs onboarding
  if (!profile) {
    return {
      needsOnboarding: true,
      reason: 'No profile found',
      canSkip: false
    };
  }

  // Profile explicitly marked as first access
  if (profile.primeiro_acesso) {
    return {
      needsOnboarding: true,
      reason: 'First access flag is true',
      canSkip: false
    };
  }

  // Profile exists but no roles - this is more nuanced
  if (roles.length === 0) {


    // If profile has basic info filled out, user might not need full onboarding
    // Para usuários existentes que foram criados automaticamente, ser mais flexível
    const emailPrefix = profile.email?.split('@')[0];
    const hasBasicInfo = profile.nome_completo && 
                        profile.email &&
                        (profile.nome_completo !== emailPrefix || 
                         profile.nome_completo.includes('Usuário') ||
                         !profile.primeiro_acesso); // Se primeiro_acesso é false, considerar válido

    if (hasBasicInfo) {
      return {
        needsOnboarding: true,
        reason: 'Missing roles but has profile info',
        canSkip: true // Could potentially skip to role assignment
      };
    } else {
      return {
        needsOnboarding: true,
        reason: 'Incomplete profile and no roles',
        canSkip: false
      };
    }
  }

  // Has profile and roles - no onboarding needed
  return {
    needsOnboarding: false,
    reason: 'Complete profile and roles exist',
    canSkip: true
  };
}

/**
 * Determines if a user can access basic dashboard features without full onboarding
 */
export function canAccessBasicFeatures(
  profile: UserProfile | null,
  roles: UserRoleContext[]
): boolean {
  // Must have a profile
  if (!profile) return false;

  // If explicitly marked as first access, must complete onboarding
  if (profile.primeiro_acesso) return false;

  // If has basic profile info, can access basic features even without roles
  const hasBasicInfo = profile.nome_completo && 
                      profile.email && 
                      profile.ativo;

  return hasBasicInfo;
}

/**
 * Gets the appropriate redirect path based on user state
 */
export function getRedirectPath(
  profile: UserProfile | null,
  roles: UserRoleContext[],
  currentPath: string,
  targetPath?: string
): string {
  const onboardingStatus = checkOnboardingStatus(profile, roles, false, false);

  // If needs onboarding and can't skip, go to onboarding
  if (onboardingStatus.needsOnboarding && !onboardingStatus.canSkip) {
    return '/onboarding';
  }

  // If needs onboarding but can skip, and trying to access protected route
  if (onboardingStatus.needsOnboarding && onboardingStatus.canSkip) {
    // If trying to access a role-protected route without roles, go to unauthorized
    if (targetPath && requiresRoles(targetPath) && roles.length === 0) {
      return '/unauthorized';
    }
    // Otherwise allow access to basic features
  }

  // If has target path and can access it, go there
  if (targetPath && canAccessPath(targetPath, profile, roles)) {
    return targetPath;
  }

  // Default to dashboard
  return '/dashboard';
}

/**
 * Checks if a path requires specific roles
 */
function requiresRoles(path: string): boolean {
  const protectedPaths = [
    '/agendamento',
    '/clientes',
    '/servicos',
    '/produtos',
    '/equipamentos',
    '/financeiro',
    '/comunicacao',
    '/prontuarios'
  ];

  return protectedPaths.some(protectedPath => path.startsWith(protectedPath));
}

/**
 * Checks if user can access a specific path
 */
function canAccessPath(
  path: string,
  profile: UserProfile | null,
  roles: UserRoleContext[]
): boolean {
  // Basic paths that don't require roles
  const basicPaths = ['/dashboard', '/perfil'];
  if (basicPaths.some(basicPath => path.startsWith(basicPath))) {
    return !!profile && !profile.primeiro_acesso;
  }

  // Role-protected paths
  if (requiresRoles(path)) {
    return roles.length > 0;
  }

  // Default allow if not explicitly protected
  return true;
}

/**
 * Marks user as having completed onboarding
 */
export async function markOnboardingComplete(userId: string): Promise<boolean> {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { error } = await supabase
      .from('profiles')
      .update({ primeiro_acesso: false })
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to mark onboarding as complete:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error marking onboarding complete:', error);
    return false;
  }
}