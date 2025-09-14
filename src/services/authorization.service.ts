/**
 * 🔐 SERVIÇO DE AUTORIZAÇÃO MULTI-TENANT
 * 
 * Gerencia permissões e roles com isolamento rigoroso entre clínicas
 */

import { UserRole, Permission, UserClinicAccess } from '@/types/auth.types';

// ============================================================================
// MATRIZ DE PERMISSÕES POR ROLE
// ============================================================================

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [
    Permission.CREATE_CLINIC,
    Permission.VIEW_CLINIC,
    Permission.EDIT_CLINIC,
    Permission.DELETE_CLINIC,
    Permission.INVITE_USER,
    Permission.MANAGE_USERS,
    Permission.VIEW_USERS,
    Permission.CREATE_MEDICAL_RECORD,
    Permission.VIEW_MEDICAL_RECORD,
    Permission.EDIT_MEDICAL_RECORD,
    Permission.DELETE_MEDICAL_RECORD,
    Permission.VIEW_FINANCIAL,
    Permission.MANAGE_FINANCIAL,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_DATA,
    Permission.VIEW_AUDIT_LOGS,
    Permission.MANAGE_SYSTEM
  ],

  [UserRole.CLINIC_OWNER]: [
    Permission.CREATE_CLINIC,
    Permission.VIEW_CLINIC,
    Permission.EDIT_CLINIC,
    Permission.INVITE_USER,
    Permission.MANAGE_USERS,
    Permission.VIEW_USERS,
    Permission.CREATE_MEDICAL_RECORD,
    Permission.VIEW_MEDICAL_RECORD,
    Permission.EDIT_MEDICAL_RECORD,
    Permission.DELETE_MEDICAL_RECORD,
    Permission.VIEW_FINANCIAL,
    Permission.MANAGE_FINANCIAL,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_DATA,
    Permission.VIEW_AUDIT_LOGS
  ],

  [UserRole.CLINIC_MANAGER]: [
    Permission.VIEW_CLINIC,
    Permission.EDIT_CLINIC,
    Permission.INVITE_USER,
    Permission.VIEW_USERS,
    Permission.CREATE_MEDICAL_RECORD,
    Permission.VIEW_MEDICAL_RECORD,
    Permission.EDIT_MEDICAL_RECORD,
    Permission.VIEW_FINANCIAL,
    Permission.MANAGE_FINANCIAL,
    Permission.VIEW_REPORTS
  ],

  [UserRole.PROFESSIONAL]: [
    Permission.VIEW_CLINIC,
    Permission.CREATE_MEDICAL_RECORD,
    Permission.VIEW_MEDICAL_RECORD,
    Permission.EDIT_MEDICAL_RECORD,
    Permission.VIEW_REPORTS
  ],

  [UserRole.RECEPTIONIST]: [
    Permission.VIEW_CLINIC,
    Permission.VIEW_MEDICAL_RECORD,
    Permission.VIEW_USERS
  ],

  [UserRole.PATIENT]: [
    Permission.VIEW_MEDICAL_RECORD
  ]
};

// ============================================================================
// HIERARQUIA DE ROLES (para verificações de precedência)
// ============================================================================

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 100,
  [UserRole.CLINIC_OWNER]: 80,
  [UserRole.CLINIC_MANAGER]: 60,
  [UserRole.PROFESSIONAL]: 40,
  [UserRole.RECEPTIONIST]: 20,
  [UserRole.PATIENT]: 10
};

// ============================================================================
// CLASSE DO SERVIÇO DE AUTORIZAÇÃO
// ============================================================================

export class AuthorizationService {
  
  /**
   * Verifica se um role tem uma permissão específica
   */
  static hasRolePermission(role: UserRole, permission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    return rolePermissions.includes(permission);
  }

  /**
   * Verifica se um usuário tem permissão em uma clínica específica
   */
  static hasPermissionInClinic(
    userClinicAccess: UserClinicAccess | null,
    permission: Permission
  ): boolean {
    if (!userClinicAccess || !userClinicAccess.active) {
      return false;
    }

    // Verificar se a associação não expirou
    if (userClinicAccess.expiresAt && new Date(userClinicAccess.expiresAt) <= new Date()) {
      return false;
    }

    // Verificar permissões customizadas primeiro
    if (userClinicAccess.permissions.includes(permission)) {
      return true;
    }

    // Verificar permissões padrão do role
    return this.hasRolePermission(userClinicAccess.role, permission);
  }

  /**
   * Verifica se um usuário tem qualquer uma das permissões especificadas
   */
  static hasAnyPermission(
    userClinicAccess: UserClinicAccess | null,
    permissions: Permission[]
  ): boolean {
    return permissions.some(permission => 
      this.hasPermissionInClinic(userClinicAccess, permission)
    );
  }

  /**
   * Verifica se um usuário tem todas as permissões especificadas
   */
  static hasAllPermissions(
    userClinicAccess: UserClinicAccess | null,
    permissions: Permission[]
  ): boolean {
    return permissions.every(permission => 
      this.hasPermissionInClinic(userClinicAccess, permission)
    );
  }

  /**
   * Verifica se um role é superior a outro na hierarquia
   */
  static isRoleHigherThan(role1: UserRole, role2: UserRole): boolean {
    return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
  }

  /**
   * Verifica se um usuário pode gerenciar outro usuário
   */
  static canManageUser(
    managerAccess: UserClinicAccess | null,
    targetAccess: UserClinicAccess | null
  ): boolean {
    if (!managerAccess || !targetAccess) {
      return false;
    }

    // Deve ser na mesma clínica
    if (managerAccess.clinic.id !== targetAccess.clinic.id) {
      return false;
    }

    // Deve ter permissão de gerenciar usuários
    if (!this.hasPermissionInClinic(managerAccess, Permission.MANAGE_USERS)) {
      return false;
    }

    // Não pode gerenciar usuários com role superior ou igual
    return this.isRoleHigherThan(managerAccess.role, targetAccess.role);
  }

  /**
   * Obtém todas as permissões de um role
   */
  static getRolePermissions(role: UserRole): Permission[] {
    return [...(ROLE_PERMISSIONS[role] || [])];
  }

  /**
   * Obtém todas as permissões efetivas de um usuário em uma clínica
   */
  static getEffectivePermissions(userClinicAccess: UserClinicAccess | null): Permission[] {
    if (!userClinicAccess || !userClinicAccess.active) {
      return [];
    }

    // Verificar se a associação não expirou
    if (userClinicAccess.expiresAt && new Date(userClinicAccess.expiresAt) <= new Date()) {
      return [];
    }

    // Combinar permissões do role com permissões customizadas
    const rolePermissions = this.getRolePermissions(userClinicAccess.role);
    const customPermissions = userClinicAccess.permissions || [];

    // Remover duplicatas
    const allPermissions = [...new Set([...rolePermissions, ...customPermissions])];

    return allPermissions;
  }

  /**
   * Verifica se um usuário pode acessar um recurso específico
   */
  static canAccessResource(
    userClinicAccess: UserClinicAccess | null,
    resourceType: string,
    action: 'create' | 'read' | 'update' | 'delete'
  ): boolean {
    const permissionMap: Record<string, Record<string, Permission>> = {
      'clinic': {
        'create': Permission.CREATE_CLINIC,
        'read': Permission.VIEW_CLINIC,
        'update': Permission.EDIT_CLINIC,
        'delete': Permission.DELETE_CLINIC
      },
      'user': {
        'create': Permission.INVITE_USER,
        'read': Permission.VIEW_USERS,
        'update': Permission.MANAGE_USERS,
        'delete': Permission.MANAGE_USERS
      },
      'medical_record': {
        'create': Permission.CREATE_MEDICAL_RECORD,
        'read': Permission.VIEW_MEDICAL_RECORD,
        'update': Permission.EDIT_MEDICAL_RECORD,
        'delete': Permission.DELETE_MEDICAL_RECORD
      },
      'financial': {
        'create': Permission.MANAGE_FINANCIAL,
        'read': Permission.VIEW_FINANCIAL,
        'update': Permission.MANAGE_FINANCIAL,
        'delete': Permission.MANAGE_FINANCIAL
      },
      'report': {
        'create': Permission.VIEW_REPORTS,
        'read': Permission.VIEW_REPORTS,
        'update': Permission.VIEW_REPORTS,
        'delete': Permission.VIEW_REPORTS
      }
    };

    const requiredPermission = permissionMap[resourceType]?.[action];
    
    if (!requiredPermission) {
      return false;
    }

    return this.hasPermissionInClinic(userClinicAccess, requiredPermission);
  }

  /**
   * Filtra uma lista de clínicas baseado nas permissões do usuário
   */
  static filterAccessibleClinics(
    allClinics: UserClinicAccess[],
    requiredPermission?: Permission
  ): UserClinicAccess[] {
    return allClinics.filter(clinicAccess => {
      // Verificar se a associação está ativa
      if (!clinicAccess.active) {
        return false;
      }

      // Verificar se não expirou
      if (clinicAccess.expiresAt && new Date(clinicAccess.expiresAt) <= new Date()) {
        return false;
      }

      // Se não especificou permissão, incluir todas as clínicas ativas
      if (!requiredPermission) {
        return true;
      }

      // Verificar se tem a permissão específica
      return this.hasPermissionInClinic(clinicAccess, requiredPermission);
    });
  }

  /**
   * Valida se uma operação multi-tenant é permitida
   */
  static validateTenantOperation(
    userClinicAccess: UserClinicAccess | null,
    targetClinicId: string,
    requiredPermission: Permission
  ): { allowed: boolean; reason?: string } {
    // Verificar se usuário está autenticado
    if (!userClinicAccess) {
      return { allowed: false, reason: 'Usuário não autenticado' };
    }

    // Verificar se a associação está ativa
    if (!userClinicAccess.active) {
      return { allowed: false, reason: 'Associação com a clínica inativa' };
    }

    // Verificar se não expirou
    if (userClinicAccess.expiresAt && new Date(userClinicAccess.expiresAt) <= new Date()) {
      return { allowed: false, reason: 'Associação com a clínica expirada' };
    }

    // Verificar isolamento de tenant
    if (userClinicAccess.clinic.id !== targetClinicId) {
      return { allowed: false, reason: 'Acesso negado: clínica diferente' };
    }

    // Verificar permissão específica
    if (!this.hasPermissionInClinic(userClinicAccess, requiredPermission)) {
      return { allowed: false, reason: 'Permissões insuficientes' };
    }

    return { allowed: true };
  }

  /**
   * Gera um resumo das permissões do usuário para debug
   */
  static getPermissionsSummary(userClinicAccess: UserClinicAccess | null): {
    role: UserRole | null;
    clinicId: string | null;
    clinicName: string | null;
    permissions: Permission[];
    isActive: boolean;
    expiresAt: Date | null;
  } {
    if (!userClinicAccess) {
      return {
        role: null,
        clinicId: null,
        clinicName: null,
        permissions: [],
        isActive: false,
        expiresAt: null
      };
    }

    return {
      role: userClinicAccess.role,
      clinicId: userClinicAccess.clinic.id,
      clinicName: userClinicAccess.clinic.name,
      permissions: this.getEffectivePermissions(userClinicAccess),
      isActive: userClinicAccess.active,
      expiresAt: userClinicAccess.expiresAt || null
    };
  }
}

// ============================================================================
// HOOKS PARA REACT
// ============================================================================

/**
 * Hook para verificar permissões no contexto atual
 */
export function usePermission(permission: Permission) {
  // Este hook será implementado junto com o contexto React
  // Por enquanto, retorna uma função placeholder
  return {
    hasPermission: (userClinicAccess: UserClinicAccess | null) => 
      AuthorizationService.hasPermissionInClinic(userClinicAccess, permission),
    
    canAccess: (resourceType: string, action: 'create' | 'read' | 'update' | 'delete') =>
      (userClinicAccess: UserClinicAccess | null) =>
        AuthorizationService.canAccessResource(userClinicAccess, resourceType, action)
  };
}

// ============================================================================
// UTILITÁRIOS DE VALIDAÇÃO
// ============================================================================

export const PermissionValidator = {
  /**
   * Valida se uma lista de permissões é válida
   */
  validatePermissions(permissions: string[]): Permission[] {
    return permissions.filter(p => 
      Object.values(Permission).includes(p as Permission)
    ) as Permission[];
  },

  /**
   * Valida se um role é válido
   */
  validateRole(role: string): UserRole | null {
    return Object.values(UserRole).includes(role as UserRole) ? role as UserRole : null;
  },

  /**
   * Verifica se uma operação é permitida baseada em regras de negócio
   */
  validateBusinessRule(
    operation: string,
    userRole: UserRole,
    targetRole?: UserRole
  ): { valid: boolean; reason?: string } {
    switch (operation) {
      case 'promote_user':
        if (targetRole && !AuthorizationService.isRoleHigherThan(userRole, targetRole)) {
          return { valid: false, reason: 'Não é possível promover para role superior ou igual' };
        }
        break;
        
      case 'delete_clinic':
        if (userRole !== UserRole.SUPER_ADMIN) {
          return { valid: false, reason: 'Apenas super admins podem deletar clínicas' };
        }
        break;
        
      case 'export_sensitive_data':
        if (!AuthorizationService.hasRolePermission(userRole, Permission.EXPORT_DATA)) {
          return { valid: false, reason: 'Permissão de exportação necessária' };
        }
        break;
    }

    return { valid: true };
  }
};
