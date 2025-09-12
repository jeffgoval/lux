import { UserProfile, UserRoleContext } from '@/contexts/AuthContext';
import { checkOnboardingStatus, canAccessBasicFeatures } from './onboardingUtils';

export function debugUserState(
  isAuthenticated: boolean,
  profile: UserProfile | null,
  roles: UserRoleContext[],
  currentRole: string | null,
  isProfileLoading: boolean,
  isRolesLoading: boolean,
  currentPath: string
) {
  console.group('🔍 User State Debug');
  
  console.log('Authentication:', {
    isAuthenticated,
    currentPath,
    isProfileLoading,
    isRolesLoading
  });
  
  console.log('Profile:', {
    exists: !!profile,
    primeiroAcesso: profile?.primeiro_acesso,
    nomeCompleto: profile?.nome_completo,
    email: profile?.email,
    ativo: profile?.ativo
  });
  
  console.log('Roles:', {
    count: roles.length,
    currentRole,
    roles: roles.map(r => ({ role: r.role, ativo: r.ativo }))
  });
  
  if (profile) {
    const onboardingStatus = checkOnboardingStatus(profile, roles, isProfileLoading, isRolesLoading);
    const canAccessBasic = canAccessBasicFeatures(profile, roles);
    
    console.log('Onboarding Status:', onboardingStatus);
    console.log('Can Access Basic Features:', canAccessBasic);
  }
  
  console.groupEnd();
}

// Add to window for easy access in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).debugUserState = debugUserState;
}