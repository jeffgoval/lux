/**
 * 🔄 SERVIÇO DE COMPATIBILIDADE DE ROLES APPWRITE
 * 
 * Mantém compatibilidade com o sistema de roles existente
 * enquanto usa a nova implementação Appwrite
 */

import { UserRole as LegacyUserRole, Permission } from '@/types/auth.types';
import { UserRole as AppwriteUserRole } from './unified-appwrite-auth.service';
import { unifiedAppwriteAuthService } from './unified-appwrite-auth.service';
import { authLogger } from '@/utils/logger';

// Mapeamento de roles legados para novos roles Appwrite
const ROLE_MAPPING: Record<string, string> = {
  'proprietaria': 'clinic_owner',
  'gerente': 'clinic_manager', 
  'recepcionista': 'receptionist',
  'super_admin': 'super_admin',
  'professional': 'professional'
};

// Mapeamento reverso
const REVERSE_ROLE_MAPPING: Record<string, string> = Object.fromEntries(
  Object.entries(ROLE_MAPPING).map(([key, value]) => [value, key])
);

// Mapeamento de permissões
const PERMISSION_MAPPING: Record<Permission, string[]> = {
  [Permission.VIEW_CLINIC]: ['clinic:read'],
  [Permission.EDIT_CLINIC]: ['clinic:write'],
  [Permission.DELETE_CLINIC]: ['clinic:delete'],
  [Permission.MANAGE_USERS]: ['user:read', 'user:write', 'user:delete'],
  [Permission.VIEW_REPORTS]: ['report:read'],
  [Permission.MANAGE_APPOINTMENTS]: ['appointment:read', 'appointment:write'],
  [Permission.VIEW_FINANCIAL]: ['financial:read'],
  [Permission.EDIT_FINANCIAL]: ['financial:write']
};

export class AppwriteRoleCompatibilityService {
  /**
   * Converter role legado para role Appwrite
   */
  mapLegacyRoleToAppwrite(legacyRole: string): string {
    return ROLE_MAPPING[legacyRole] || legacyRole;
  }

  /**
   * Converter role Appwrite para role legado
   */
  mapAppwriteRoleToLegacy(appwriteRole: string): string {
    return REVERSE_ROLE_MAPPING[appwriteRole] || appwriteRole;
  }

  /**
   * Converter permissão legada para permissões Appwrite
   */
  mapLegacyPermissionToAppwrite(permission: Permission): string[] {
    return PERMISSION_MAPPING[permission] || [];
  }

  /**
   * Converter role Appwrite para formato legado
   */
  convertAppwriteRoleToLegacy(appwriteRole: AppwriteUserRole): LegacyUserRole {
    return {
      id: appwriteRole.$id,
      user_id: appwriteRole.userId,
      role: this.mapAppwriteRoleToLegacy(appwriteRole.role) as any,
      clinica_id: appwriteRole.clinicId,
      ativo: appwriteRole.ativo,
      criado_em: appwriteRole.criadoEm
    };
  }

  /**
   * Verificar se usuário tem permissão específica (compatibilidade)
   */
  async hasLegacyPermission(
    userId: string, 
    permission: Permission, 
    tenantId: string,
    resourceId?: string
  ): Promise<boolean> {
    try {
      const appwritePermissions = this.mapLegacyPermissionToAppwrite(permission);
      
      // Verificar cada permissão mapeada
      for (const appwritePermission of appwritePermissions) {
        const hasPermission = await unifiedAppwriteAuthService.hasPermission(
          userId,
          appwritePermission,
          tenantId,
          resourceId
        );
        
        if (hasPermission) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      authLogger.error('Erro ao verificar permissão legada', error);
      return false;
    }
  }

  /**
   * Verificar se usuário tem role específico (compatibilidade)
   */
  async hasLegacyRole(userId: string, role: string, tenantId: string): Promise<boolean> {
    try {
      const user = await unifiedAppwriteAuthService.getCurrentUser();
      if (!user || user.$id !== userId) {
        return false;
      }

      // Buscar roles do usuário
      const authResult = await unifiedAppwriteAuthService.refreshSession();
      if (!authResult.success || !authResult.roles) {
        return false;
      }

      // Verificar se tem o role (mapeado)
      const appwriteRole = this.mapLegacyRoleToAppwrite(role);
      return authResult.roles.some(r => 
        r.role === appwriteRole && 
        r.tenantId === tenantId && 
        r.ativo
      );
    } catch (error) {
      authLogger.error('Erro ao verificar role legado', error);
      return false;
    }
  }

  /**
   * Obter roles do usuário no formato legado
   */
  async getLegacyUserRoles(userId: string, tenantId: string): Promise<LegacyUserRole[]> {
    try {
      const user = await unifiedAppwriteAuthService.getCurrentUser();
      if (!user || user.$id !== userId) {
        return [];
      }

      const authResult = await unifiedAppwriteAuthService.refreshSession();
      if (!authResult.success || !authResult.roles) {
        return [];
      }

      // Converter roles para formato legado
      return authResult.roles
        .filter(role => role.tenantId === tenantId)
        .map(role => this.convertAppwriteRoleToLegacy(role));
    } catch (error) {
      authLogger.error('Erro ao buscar roles legados', error);
      return [];
    }
  }

  /**
   * Verificar múltiplas permissões de uma vez
   */
  async hasAnyLegacyPermission(
    userId: string,
    permissions: Permission[],
    tenantId: string,
    resourceId?: string
  ): Promise<boolean> {
    try {
      for (const permission of permissions) {
        const hasPermission = await this.hasLegacyPermission(
          userId,
          permission,
          tenantId,
          resourceId
        );
        
        if (hasPermission) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      authLogger.error('Erro ao verificar múltiplas permissões', error);
      return false;
    }
  }

  /**
   * Verificar se usuário tem todos os roles especificados
   */
  async hasAllLegacyRoles(
    userId: string,
    roles: string[],
    tenantId: string
  ): Promise<boolean> {
    try {
      for (const role of roles) {
        const hasRole = await this.hasLegacyRole(userId, role, tenantId);
        if (!hasRole) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      authLogger.error('Erro ao verificar múltiplos roles', error);
      return false;
    }
  }

  /**
   * Obter permissões do usuário no formato legado
   */
  async getLegacyUserPermissions(userId: string, tenantId: string): Promise<Permission[]> {
    try {
      const appwritePermissions = await unifiedAppwriteAuthService.getUserPermissions(
        userId,
        tenantId
      );

      const legacyPermissions: Permission[] = [];

      // Mapear permissões Appwrite para permissões legadas
      for (const [legacyPermission, appwritePerms] of Object.entries(PERMISSION_MAPPING)) {
        const hasAllRequired = appwritePerms.every(perm => 
          appwritePermissions.includes(perm)
        );
        
        if (hasAllRequired) {
          legacyPermissions.push(legacyPermission as Permission);
        }
      }

      return legacyPermissions;
    } catch (error) {
      authLogger.error('Erro ao buscar permissões legadas', error);
      return [];
    }
  }
}

export const appwriteRoleCompatibilityService = new AppwriteRoleCompatibilityService();