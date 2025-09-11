import { useAuth } from '@/contexts/AuthContext';
import { UserRole, ROLE_PERMISSIONS } from '@/types/auth';

export function useRoles() {
  const { currentRole, roles, hasRole } = useAuth();

  const isAdmin = () => hasRole('super_admin');
  const isProprietaria = () => hasRole('proprietaria');
  const isGerente = () => hasRole('gerente');
  const isProfissional = () => hasRole('profissionais');
  const isRecepcionista = () => hasRole('recepcionistas');
  const isVisitante = () => hasRole('visitante');

  const canManageUsers = () => {
    if (!currentRole) return false;
    return ROLE_PERMISSIONS[currentRole]?.canManageUsers || false;
  };

  const canManageClinics = () => {
    if (!currentRole) return false;
    return ROLE_PERMISSIONS[currentRole]?.canManageClinics || false;
  };

  const canAccessAllData = () => {
    if (!currentRole) return false;
    return ROLE_PERMISSIONS[currentRole]?.canAccessAllData || false;
  };

  const canManageSystem = () => {
    if (!currentRole) return false;
    return ROLE_PERMISSIONS[currentRole]?.canManageSystem || false;
  };

  const getRoleLabel = (role?: UserRole) => {
    if (!role) return '';
    return ROLE_PERMISSIONS[role]?.label || role;
  };

  const hasAnyRole = (requiredRoles: UserRole[]) => {
    return requiredRoles.some(role => hasRole(role));
  };

  const getHighestRole = (): UserRole | null => {
    const roleHierarchy: UserRole[] = [
      'super_admin',
      'proprietaria',
      'gerente',
      'profissionais',
      'recepcionistas',
      'visitante'
    ];

    for (const role of roleHierarchy) {
      if (hasRole(role)) return role;
    }

    return null;
  };

  return {
    currentRole,
    roles,
    hasRole,
    isAdmin,
    isProprietaria,
    isGerente,
    isProfissional,
    isRecepcionista,
    isVisitante,
    canManageUsers,
    canManageClinics,
    canAccessAllData,
    canManageSystem,
    getRoleLabel,
    hasAnyRole,
    getHighestRole
  };
}