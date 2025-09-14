import { useMemo } from 'react';
import { useSecureAuth } from '@/contexts/SecureAuthContext';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role_type'];

interface PermissionCheck {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  isOwner: boolean;
  isAdmin: boolean;
}

/**
 * Hook otimizado para verificações de permissões
 * Cacheia resultados e evita re-computações desnecessárias
 */
export function usePermissions(): PermissionCheck {
  const { currentRole, roles, isAuthenticated } = useSecureAuth();

  return useMemo(() => {
    if (!isAuthenticated || !currentRole) {
      return {
        canView: false,
        canEdit: false,
        canDelete: false,
        canCreate: false,
        hasRole: () => false,
        hasAnyRole: () => false,
        isOwner: false,
        isAdmin: false
      };
    }

    const roleHierarchy: Record<UserRole, number> = {
      'super_admin': 100,
      'proprietaria': 90,
      'gerente': 80,
      'profissionais': 70,
      'recepcionistas': 60,
      'visitante': 50,
      'cliente': 40
    };

    const currentLevel = roleHierarchy[currentRole] || 0;
    const isOwner = currentRole === 'proprietaria' || currentRole === 'super_admin';
    const isAdmin = currentLevel >= 80;

    const hasRole = (role: UserRole) => {
      return roles.some(r => r.role === role);
    };

    const hasAnyRole = (rolesToCheck: UserRole[]) => {
      return rolesToCheck.some(role => hasRole(role));
    };

    // Permissões baseadas no nível hierárquico
    const canView = currentLevel >= 40; // Todos podem ver (exceto visitantes sem permissão)
    const canEdit = currentLevel >= 60; // Recepcionistas e acima
    const canDelete = currentLevel >= 80; // Gerentes e acima
    const canCreate = currentLevel >= 60; // Recepcionistas e acima

    return {
      canView,
      canEdit,
      canDelete,
      canCreate,
      hasRole,
      hasAnyRole,
      isOwner,
      isAdmin
    };
  }, [currentRole, roles, isAuthenticated]);
}

/**
 * Hook para verificação específica de uma permissão
 */
export function useHasPermission(permission: keyof PermissionCheck): boolean {
  const permissions = usePermissions();
  return useMemo(() => {
    const value = permissions[permission];
    return typeof value === 'boolean' ? value : false;
  }, [permissions, permission]);
}

/**
 * Hook para verificação de role específica
 */
export function useHasRole(role: UserRole): boolean {
  const { hasRole } = usePermissions();
  return useMemo(() => hasRole(role), [hasRole, role]);
}

/**
 * Hook para verificação de múltiplas roles
 */
export function useHasAnyRole(roles: UserRole[]): boolean {
  const { hasAnyRole } = usePermissions();
  return useMemo(() => hasAnyRole(roles), [hasAnyRole, roles]);
}