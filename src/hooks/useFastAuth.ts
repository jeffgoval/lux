import { useMemo } from 'react';
import { useSecureAuth } from '@/contexts/SecureAuthContext';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role_type'];

interface FastAuthState {
  isReady: boolean;
  isAuthenticated: boolean;
  hasProfile: boolean;
  hasRoles: boolean;
  currentRole: UserRole | null;
  needsOnboarding: boolean;
  canAccess: (roles?: UserRole[]) => boolean;
}

/**
 * Hook otimizado para verificações de auth rápidas
 * Evita re-renders desnecessários e fornece decisões instantâneas
 */
export function useFastAuth(): FastAuthState {
  const { 
    isAuthenticated, 
    isLoading, 
    profile, 
    roles, 
    currentRole,
    isProfileLoading,
    isRolesLoading 
  } = useSecureAuth();

  return useMemo(() => {
    const isReady = !isLoading && !isProfileLoading && !isRolesLoading;
    const hasProfile = !!profile;
    const hasRoles = roles.length > 0;
    const needsOnboarding = hasProfile ? profile.primeiro_acesso : false;

    const canAccess = (requiredRoles?: UserRole[]) => {
      if (!isAuthenticated) return false;
      if (!requiredRoles || requiredRoles.length === 0) return true;
      if (!currentRole) return false;
      return requiredRoles.includes(currentRole);
    };

    return {
      isReady,
      isAuthenticated,
      hasProfile,
      hasRoles,
      currentRole,
      needsOnboarding,
      canAccess
    };
  }, [
    isAuthenticated,
    isLoading,
    isProfileLoading,
    isRolesLoading,
    profile,
    roles,
    currentRole
  ]);
}

/**
 * Hook para verificação rápida de permissões sem re-render
 */
export function useCanAccess(requiredRoles?: UserRole[]): boolean {
  const { canAccess } = useFastAuth();
  return useMemo(() => canAccess(requiredRoles), [canAccess, requiredRoles]);
}

/**
 * Hook para verificação de estado de loading otimizada
 */
export function useAuthLoading(): {
  isLoading: boolean;
  isInitialLoading: boolean;
  isDataLoading: boolean;
} {
  const { isLoading, isProfileLoading, isRolesLoading } = useAuth();
  
  return useMemo(() => ({
    isLoading: isLoading || isProfileLoading || isRolesLoading,
    isInitialLoading: isLoading,
    isDataLoading: isProfileLoading || isRolesLoading
  }), [isLoading, isProfileLoading, isRolesLoading]);
}