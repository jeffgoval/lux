import { ReactNode } from 'react';
import { useHasAnyRole, useHasPermission } from '@/hooks/usePermissions';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role_type'];

interface PermissionGateProps {
  children: ReactNode;
  roles?: UserRole[];
  permission?: 'canView' | 'canEdit' | 'canDelete' | 'canCreate';
  fallback?: ReactNode;
  requireAll?: boolean; // Se true, precisa de TODAS as roles, se false, precisa de QUALQUER uma
}

/**
 * Componente que renderiza condicionalmente baseado em permissões
 * Mais leve que o AuthGuard para verificações internas
 */
export function PermissionGate({
  children,
  roles,
  permission,
  fallback = null,
  requireAll = false
}: PermissionGateProps) {
  const hasRoles = useHasAnyRole(roles || []);
  const hasPermission = useHasPermission(permission || 'canView');

  // Se especificou roles, verificar roles
  if (roles && roles.length > 0) {
    if (!hasRoles) {
      return <>{fallback}</>;
    }
  }

  // Se especificou permissão, verificar permissão
  if (permission) {
    if (!hasPermission) {
      return <>{fallback}</>;
    }
  }

  // Se não especificou nada, sempre renderizar
  return <>{children}</>;
}

/**
 * Componente para mostrar conteúdo apenas para admins
 */
export function AdminOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate 
      roles={['super_admin', 'proprietaria', 'gerente']} 
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}

/**
 * Componente para mostrar conteúdo apenas para proprietários
 */
export function OwnerOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate 
      roles={['super_admin', 'proprietaria']} 
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}

/**
 * Componente para mostrar conteúdo baseado em permissão específica
 */
export function CanEdit({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate 
      permission="canEdit" 
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}

export function CanDelete({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate 
      permission="canDelete" 
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}

export function CanCreate({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate 
      permission="canCreate" 
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}