/**
 * 🚪 COMPONENTE DE CONTROLE DE PERMISSÕES
 * 
 * Gate condicional que renderiza conteúdo baseado em permissões do usuário
 */

import React, { useMemo } from 'react';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { UserRole, Permission } from '@/types/auth.types';
import { AuthorizationService } from '@/services/authorization.service';

// ============================================================================
// INTERFACES
// ============================================================================

interface PermissionGateProps {
  children: React.ReactNode;
  
  // Permissões necessárias
  requiredPermissions?: Permission[];
  requiredRoles?: UserRole[];
  
  // Lógica de verificação
  requireAll?: boolean; // Se true, requer TODAS as permissões/roles
  
  // Fallbacks
  fallback?: React.ReactNode;
  showFallback?: boolean;
  fallbackMessage?: string;
  
  // Comportamento
  hideOnDenied?: boolean; // Se true, não renderiza nada quando negado
  logDeniedAccess?: boolean; // Se true, loga tentativas de acesso negado
}

interface ResourceGateProps {
  children: React.ReactNode;
  resourceType: string;
  action: 'create' | 'read' | 'update' | 'delete';
  fallback?: React.ReactNode;
  hideOnDenied?: boolean;
}

// ============================================================================
// COMPONENTE PRINCIPAL - PERMISSION GATE
// ============================================================================

export function PermissionGate({
  children,
  requiredPermissions = [],
  requiredRoles = [],
  requireAll = false,
  fallback,
  showFallback = true,
  fallbackMessage,
  hideOnDenied = false,
  logDeniedAccess = false
}: PermissionGateProps) {
  const { isAuthenticated } = useUnifiedAuth();

  // ==========================================================================
  // LÓGICA DE VERIFICAÇÃO DE ACESSO
  // ==========================================================================

  const accessCheck = useMemo(() => {
    // Se não está autenticado
    if (!isAuthenticated) {
      return {
        hasAccess: false,
        reason: 'Usuário não autenticado'
      };
    }

    // Se não tem clínica ativa
    if (!currentClinic) {
      return {
        hasAccess: false,
        reason: 'Nenhuma clínica selecionada'
      };
    }

    // Verificar roles se especificadas
    if (requiredRoles.length > 0) {
      const hasRequiredRoles = requireAll
        ? requiredRoles.every(role => currentClinic.role === role)
        : requiredRoles.includes(currentClinic.role);

      if (!hasRequiredRoles) {
        return {
          hasAccess: false,
          reason: `Role necessária: ${requiredRoles.join(' ou ')}`
        };
      }
    }

    // Verificar permissões se especificadas
    if (requiredPermissions.length > 0) {
      const hasRequiredPermissions = requireAll
        ? AuthorizationService.hasAllPermissions(currentClinic, requiredPermissions)
        : AuthorizationService.hasAnyPermission(currentClinic, requiredPermissions);

      if (!hasRequiredPermissions) {
        return {
          hasAccess: false,
          reason: `Permissão necessária: ${requiredPermissions.join(requireAll ? ' e ' : ' ou ')}`
        };
      }
    }

    // Se chegou até aqui, tem acesso
    return {
      hasAccess: true,
      reason: null
    };
  }, [isAuthenticated, currentClinic, requiredRoles, requiredPermissions, requireAll]);

  // ==========================================================================
  // LOG DE ACESSO NEGADO
  // ==========================================================================

  React.useEffect(() => {
    if (logDeniedAccess && !accessCheck.hasAccess) {
      console.warn('Permission denied:', {
        reason: accessCheck.reason,
        requiredRoles,
        requiredPermissions,
        currentRole: currentClinic?.role,
        currentPermissions: currentClinic?.permissions,
        clinicId: currentClinic?.clinic.id
      });
    }
  }, [accessCheck, logDeniedAccess, requiredRoles, requiredPermissions, currentClinic]);

  // ==========================================================================
  // RENDERIZAÇÃO CONDICIONAL
  // ==========================================================================

  // Se tem acesso, renderizar children
  if (accessCheck.hasAccess) {
    return <>{children}</>;
  }

  // Se deve esconder quando negado
  if (hideOnDenied) {
    return null;
  }

  // Se tem fallback customizado
  if (fallback) {
    return <>{fallback}</>;
  }

  // Se não deve mostrar fallback
  if (!showFallback) {
    return null;
  }

  // Fallback padrão
  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <Lock className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">
            Acesso Restrito
          </p>
          <p className="text-sm text-gray-600">
            {fallbackMessage || accessCheck.reason || 'Você não tem permissão para ver este conteúdo.'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PARA RECURSOS ESPECÍFICOS
// ============================================================================

export function ResourceGate({
  children,
  resourceType,
  action,
  fallback,
  hideOnDenied = false
}: ResourceGateProps) {
  const { roles, currentRole } = useUnifiedAuth();

  const hasAccess = useMemo(() => {
    // Simplified access check based on roles
    // TODO: Implement proper resource-based authorization
    return roles.length > 0 && currentRole !== null;
  }, [roles, currentRole]);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (hideOnDenied) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Alert variant="destructive">
      <Shield className="h-4 w-4" />
      <AlertDescription>
        Você não tem permissão para {action === 'create' ? 'criar' : 
                                   action === 'read' ? 'visualizar' :
                                   action === 'update' ? 'editar' : 'deletar'} {resourceType}.
      </AlertDescription>
    </Alert>
  );
}

// ============================================================================
// COMPONENTES ESPECIALIZADOS
// ============================================================================

/**
 * Gate para operações administrativas
 */
export function AdminGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.CLINIC_OWNER, UserRole.CLINIC_MANAGER]}
      fallback={fallback}
      fallbackMessage="Acesso restrito a administradores"
    >
      {children}
    </PermissionGate>
  );
}

/**
 * Gate para proprietários de clínica
 */
export function OwnerGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.CLINIC_OWNER]}
      fallback={fallback}
      fallbackMessage="Acesso restrito a proprietários"
    >
      {children}
    </PermissionGate>
  );
}

/**
 * Gate para profissionais de saúde
 */
export function ProfessionalGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.CLINIC_OWNER, UserRole.CLINIC_MANAGER, UserRole.PROFESSIONAL]}
      fallback={fallback}
      fallbackMessage="Acesso restrito a profissionais de saúde"
    >
      {children}
    </PermissionGate>
  );
}

/**
 * Gate para dados financeiros
 */
export function FinancialGate({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGate
      requiredPermissions={[Permission.VIEW_FINANCIAL]}
      fallback={fallback}
      fallbackMessage="Acesso restrito a dados financeiros"
    >
      {children}
    </PermissionGate>
  );
}

/**
 * Gate para prontuários médicos
 */
export function MedicalRecordGate({ 
  children, 
  action = 'read',
  fallback 
}: { 
  children: React.ReactNode; 
  action?: 'create' | 'read' | 'update' | 'delete';
  fallback?: React.ReactNode;
}) {
  const permissionMap = {
    create: Permission.CREATE_MEDICAL_RECORD,
    read: Permission.VIEW_MEDICAL_RECORD,
    update: Permission.EDIT_MEDICAL_RECORD,
    delete: Permission.DELETE_MEDICAL_RECORD
  };

  return (
    <PermissionGate
      requiredPermissions={[permissionMap[action]]}
      fallback={fallback}
      fallbackMessage={`Sem permissão para ${action === 'create' ? 'criar' : 
                                            action === 'read' ? 'visualizar' :
                                            action === 'update' ? 'editar' : 'deletar'} prontuários`}
    >
      {children}
    </PermissionGate>
  );
}

// ============================================================================
// HOOKS UTILITÁRIOS
// ============================================================================

/**
 * Hook para verificar permissões
 */
export function usePermissionCheck() {
  const { roles, currentRole } = useUnifiedAuth();

  return {
    hasPermission: (permission: Permission) => 
      AuthorizationService.hasPermissionInClinic(currentClinic, permission),
    
    hasRole: (role: UserRole) => 
      currentClinic?.role === role,
    
    hasAnyRole: (roles: UserRole[]) => 
      currentClinic ? roles.includes(currentClinic.role) : false,
    
    canAccessResource: (resourceType: string, action: 'create' | 'read' | 'update' | 'delete') =>
      AuthorizationService.canAccessResource(currentClinic, resourceType, action),
    
    isAdmin: () => 
      currentClinic ? [UserRole.SUPER_ADMIN, UserRole.CLINIC_OWNER, UserRole.CLINIC_MANAGER].includes(currentClinic.role) : false,
    
    isOwner: () => 
      currentClinic ? [UserRole.SUPER_ADMIN, UserRole.CLINIC_OWNER].includes(currentClinic.role) : false,
    
    isProfessional: () => 
      currentClinic ? [UserRole.SUPER_ADMIN, UserRole.CLINIC_OWNER, UserRole.CLINIC_MANAGER, UserRole.PROFESSIONAL].includes(currentClinic.role) : false
  };
}

/**
 * Hook para obter informações de permissões
 */
export function usePermissionInfo() {
  const { roles, currentRole } = useUnifiedAuth();

  return useMemo(() => {
    return AuthorizationService.getPermissionsSummary(currentClinic);
  }, [currentClinic]);
}
