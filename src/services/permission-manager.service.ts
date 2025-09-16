/**
 * PermissionManager - Granular RBAC system with intelligent caching
 * 
 * Features:
 * - Condition-based permission validation
 * - Intelligent caching with automatic invalidation
 * - Role inheritance and composition
 * - Context-aware permissions
 * - Performance optimized for high-frequency checks
 * - Audit trail integration
 * 
 * Requirements: 4.3
 */

import { auditLogger } from './audit-logger.service';

export interface Permission {
  id: string;
  resource: string;
  action: PermissionAction;
  conditions?: PermissionCondition[];
  effect: 'allow' | 'deny';
  priority: number; // Higher priority wins in conflicts
}

export type PermissionAction = 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete' 
  | 'export' 
  | 'share' 
  | 'print'
  | 'manage'
  | '*'; // Wildcard for all actions

export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith' | 'exists' | 'custom';
  value: any;
  customValidator?: (context: PermissionContext, value: any) => boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  inherits?: string[]; // Role IDs to inherit from
  isSystem: boolean;
  tenantId?: string; // null for system roles
  metadata?: {
    createdAt: Date;
    createdBy: string;
    lastModified: Date;
    modifiedBy: string;
  };
}

export interface User {
  id: string;
  tenantId: string;
  roles: string[]; // Role IDs
  directPermissions?: Permission[]; // Direct permissions override roles
  metadata?: {
    clinicId?: string;
    departmentId?: string;
    specialization?: string;
    level?: number;
  };
}

export interface PermissionContext {
  user: User;
  resource: any; // The actual resource being accessed
  resourceType: string;
  action: PermissionAction;
  environment: {
    ip?: string;
    userAgent?: string;
    timestamp: Date;
    sessionId?: string;
  };
  additionalContext?: Record<string, any>;
}

export interface PermissionResult {
  allowed: boolean;
  reason: string;
  matchedPermissions: Permission[];
  deniedBy?: Permission;
  requiresElevation?: boolean;
  elevationReason?: string;
}

export interface CacheEntry {
  result: PermissionResult;
  timestamp: Date;
  ttl: number;
  dependencies: string[];
}

export class PermissionManager {
  private roleCache = new Map<string, Role>();
  private userCache = new Map<string, User>();
  private permissionCache = new Map<string, CacheEntry>();
  private roleHierarchyCache = new Map<string, string[]>();
  
  private readonly cacheTTL = {
    permission: 5 * 60 * 1000, // 5 minutes
    role: 15 * 60 * 1000, // 15 minutes
    user: 10 * 60 * 1000, // 10 minutes
    hierarchy: 30 * 60 * 1000 // 30 minutes
  };

  constructor() {
    this.initializeSystemRoles();
    this.startCacheCleanup();
  }

  /**
   * Check if user has permission to perform action on resource
   */
  async checkPermission(context: PermissionContext): Promise<PermissionResult> {
    const cacheKey = this.generateCacheKey(context);
    
    // Check cache first
    const cached = this.permissionCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached.result;
    }

    try {
      // Perform permission check
      const result = await this.performPermissionCheck(context);
      
      // Cache the result
      this.cachePermissionResult(cacheKey, result, context);
      
      // Log permission check for audit
      await this.logPermissionCheck(context, result);
      
      return result;

    } catch (error) {
      // Log error and deny by default
      await auditLogger.logAction(
        'access_denied',
        context.resourceType,
        context.resource?.id || 'unknown',
        {
          userId: context.user.id,
          tenantId: context.user.tenantId,
          userRole: context.user.roles.join(','),
          sessionId: context.environment.sessionId || 'unknown',
          context: {
            ip: context.environment.ip || 'unknown',
            userAgent: context.environment.userAgent || 'unknown',
            device: { type: 'api' },
            api: {}
          },
          security: {
            riskLevel: 'high',
            authMethod: 'password',
            encryptionUsed: false
          }
        }
      );

      return {
        allowed: false,
        reason: `Permission check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        matchedPermissions: []
      };
    }
  }

  /**
   * Check multiple permissions at once (batch operation)
   */
  async checkPermissions(contexts: PermissionContext[]): Promise<PermissionResult[]> {
    const results = await Promise.all(
      contexts.map(context => this.checkPermission(context))
    );
    
    return results;
  }

  /**
   * Get effective permissions for a user
   */
  async getUserEffectivePermissions(userId: string, tenantId: string): Promise<Permission[]> {
    const user = await this.getUser(userId, tenantId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const permissions: Permission[] = [];
    
    // Add direct permissions
    if (user.directPermissions) {
      permissions.push(...user.directPermissions);
    }

    // Add role-based permissions
    for (const roleId of user.roles) {
      const role = await this.getRole(roleId, tenantId);
      if (role) {
        permissions.push(...role.permissions);
        
        // Add inherited permissions
        const inheritedRoles = await this.getInheritedRoles(roleId, tenantId);
        for (const inheritedRole of inheritedRoles) {
          permissions.push(...inheritedRole.permissions);
        }
      }
    }

    // Remove duplicates and resolve conflicts
    return this.resolvePermissionConflicts(permissions);
  }

  /**
   * Create or update a role
   */
  async createRole(role: Omit<Role, 'id' | 'metadata'>): Promise<Role> {
    const newRole: Role = {
      ...role,
      id: this.generateRoleId(),
      metadata: {
        createdAt: new Date(),
        createdBy: 'system', // In real implementation, get from context
        lastModified: new Date(),
        modifiedBy: 'system'
      }
    };

    // Validate role permissions
    this.validateRolePermissions(newRole);

    // Store role (in production, persist to database)
    this.roleCache.set(newRole.id, newRole);

    // Invalidate related caches
    this.invalidateRoleRelatedCaches(newRole.id);

    // Log role creation
    await auditLogger.logAction(
      'create',
      'roles',
      newRole.id,
      {
        userId: 'system',
        tenantId: role.tenantId || 'system',
        userRole: 'system',
        sessionId: 'system',
        resourceType: 'role',
        changes: {
          fields: ['name', 'permissions', 'inherits'],
          sensitiveFields: [],
          after: {
            name: newRole.name,
            permissionCount: newRole.permissions.length,
            inherits: newRole.inherits
          }
        },
        security: {
          riskLevel: 'medium',
          authMethod: 'api_key',
          encryptionUsed: false
        }
      }
    );

    return newRole;
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(userId: string, roleId: string, tenantId: string): Promise<void> {
    const user = await this.getUser(userId, tenantId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const role = await this.getRole(roleId, tenantId);
    if (!role) {
      throw new Error(`Role ${roleId} not found`);
    }

    // Check if user already has the role
    if (user.roles.includes(roleId)) {
      return; // Already assigned
    }

    // Add role to user
    user.roles.push(roleId);

    // Update cache
    this.userCache.set(this.getUserCacheKey(userId, tenantId), user);

    // Invalidate permission caches for this user
    this.invalidateUserPermissionCaches(userId);

    // Log role assignment
    await auditLogger.logAction(
      'update',
      'users',
      userId,
      {
        userId: 'system',
        tenantId,
        userRole: 'system',
        sessionId: 'system',
        resourceType: 'user_role',
        changes: {
          fields: ['roles'],
          sensitiveFields: [],
          before: { roles: user.roles.filter(r => r !== roleId) },
          after: { roles: user.roles }
        },
        security: {
          riskLevel: 'high',
          authMethod: 'api_key',
          encryptionUsed: false
        }
      }
    );
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: string, roleId: string, tenantId: string): Promise<void> {
    const user = await this.getUser(userId, tenantId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Remove role from user
    user.roles = user.roles.filter(r => r !== roleId);

    // Update cache
    this.userCache.set(this.getUserCacheKey(userId, tenantId), user);

    // Invalidate permission caches for this user
    this.invalidateUserPermissionCaches(userId);

    // Log role removal
    await auditLogger.logAction(
      'update',
      'users',
      userId,
      {
        userId: 'system',
        tenantId,
        userRole: 'system',
        sessionId: 'system',
        resourceType: 'user_role',
        changes: {
          fields: ['roles'],
          sensitiveFields: [],
          before: { roles: [...user.roles, roleId] },
          after: { roles: user.roles }
        },
        security: {
          riskLevel: 'high',
          authMethod: 'api_key',
          encryptionUsed: false
        }
      }
    );
  }

  /**
   * Create authorization middleware for Express/similar frameworks
   */
  createAuthorizationMiddleware(
    resourceType: string,
    action: PermissionAction,
    resourceExtractor?: (req: any) => any
  ) {
    return async (req: any, res: any, next: any) => {
      try {
        const user = req.user; // Assume user is attached by auth middleware
        if (!user) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const resource = resourceExtractor ? resourceExtractor(req) : null;
        
        const context: PermissionContext = {
          user,
          resource,
          resourceType,
          action,
          environment: {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date(),
            sessionId: req.sessionID
          },
          additionalContext: {
            params: req.params,
            query: req.query,
            body: req.body
          }
        };

        const result = await this.checkPermission(context);
        
        if (!result.allowed) {
          return res.status(403).json({ 
            error: 'Access denied',
            reason: result.reason
          });
        }

        // Attach permission result to request for downstream use
        req.permissionResult = result;
        next();

      } catch (error) {
        console.error('Authorization middleware error:', error);
        res.status(500).json({ error: 'Authorization check failed' });
      }
    };
  }

  // Private methods

  private async performPermissionCheck(context: PermissionContext): Promise<PermissionResult> {
    const effectivePermissions = await this.getUserEffectivePermissions(
      context.user.id,
      context.user.tenantId
    );

    const matchedPermissions: Permission[] = [];
    let deniedBy: Permission | undefined;
    let highestPriorityAllow = -1;
    let highestPriorityDeny = -1;

    // Check each permission
    for (const permission of effectivePermissions) {
      if (this.permissionMatches(permission, context)) {
        matchedPermissions.push(permission);

        if (permission.effect === 'allow' && permission.priority > highestPriorityAllow) {
          highestPriorityAllow = permission.priority;
        } else if (permission.effect === 'deny' && permission.priority > highestPriorityDeny) {
          highestPriorityDeny = permission.priority;
          deniedBy = permission;
        }
      }
    }

    // Determine final result (deny wins if same priority)
    const allowed = highestPriorityAllow > highestPriorityDeny;
    
    return {
      allowed,
      reason: allowed 
        ? `Access granted by permission ${matchedPermissions.find(p => p.effect === 'allow')?.id}`
        : `Access denied by permission ${deniedBy?.id || 'default deny'}`,
      matchedPermissions,
      deniedBy: allowed ? undefined : deniedBy
    };
  }

  private permissionMatches(permission: Permission, context: PermissionContext): boolean {
    // Check resource match
    if (permission.resource !== '*' && permission.resource !== context.resourceType) {
      return false;
    }

    // Check action match
    if (permission.action !== '*' && permission.action !== context.action) {
      return false;
    }

    // Check conditions
    if (permission.conditions) {
      for (const condition of permission.conditions) {
        if (!this.evaluateCondition(condition, context)) {
          return false;
        }
      }
    }

    return true;
  }

  private evaluateCondition(condition: PermissionCondition, context: PermissionContext): boolean {
    let actualValue: any;

    // Extract value from context
    if (condition.field.startsWith('user.')) {
      const field = condition.field.substring(5);
      actualValue = this.getNestedValue(context.user, field);
    } else if (condition.field.startsWith('resource.')) {
      const field = condition.field.substring(9);
      actualValue = this.getNestedValue(context.resource, field);
    } else if (condition.field.startsWith('env.')) {
      const field = condition.field.substring(4);
      actualValue = this.getNestedValue(context.environment, field);
    } else {
      actualValue = this.getNestedValue(context.additionalContext, condition.field);
    }

    // Apply operator
    switch (condition.operator) {
      case 'eq':
        return actualValue === condition.value;
      case 'ne':
        return actualValue !== condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(actualValue);
      case 'nin':
        return Array.isArray(condition.value) && !condition.value.includes(actualValue);
      case 'contains':
        return typeof actualValue === 'string' && actualValue.includes(condition.value);
      case 'startsWith':
        return typeof actualValue === 'string' && actualValue.startsWith(condition.value);
      case 'endsWith':
        return typeof actualValue === 'string' && actualValue.endsWith(condition.value);
      case 'exists':
        return actualValue !== undefined && actualValue !== null;
      case 'custom':
        return condition.customValidator ? condition.customValidator(context, actualValue) : false;
      default:
        return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async getRole(roleId: string, tenantId: string): Promise<Role | null> {
    const cacheKey = `${roleId}:${tenantId}`;
    
    if (this.roleCache.has(cacheKey)) {
      return this.roleCache.get(cacheKey)!;
    }

    // In production, fetch from database
    // For now, return null for non-system roles
    return null;
  }

  private async getUser(userId: string, tenantId: string): Promise<User | null> {
    const cacheKey = this.getUserCacheKey(userId, tenantId);
    
    if (this.userCache.has(cacheKey)) {
      return this.userCache.get(cacheKey)!;
    }

    // In production, fetch from database
    // For now, return mock user
    const mockUser: User = {
      id: userId,
      tenantId,
      roles: ['basic_user']
    };

    this.userCache.set(cacheKey, mockUser);
    return mockUser;
  }

  private async getInheritedRoles(roleId: string, tenantId: string): Promise<Role[]> {
    const role = await this.getRole(roleId, tenantId);
    if (!role || !role.inherits) {
      return [];
    }

    const inheritedRoles: Role[] = [];
    for (const inheritedRoleId of role.inherits) {
      const inheritedRole = await this.getRole(inheritedRoleId, tenantId);
      if (inheritedRole) {
        inheritedRoles.push(inheritedRole);
        // Recursively get inherited roles
        const nestedInherited = await this.getInheritedRoles(inheritedRoleId, tenantId);
        inheritedRoles.push(...nestedInherited);
      }
    }

    return inheritedRoles;
  }

  private resolvePermissionConflicts(permissions: Permission[]): Permission[] {
    // Remove duplicates and sort by priority
    const uniquePermissions = permissions.filter((permission, index, array) => 
      array.findIndex(p => p.id === permission.id) === index
    );

    return uniquePermissions.sort((a, b) => b.priority - a.priority);
  }

  private validateRolePermissions(role: Role): void {
    for (const permission of role.permissions) {
      if (!permission.id || !permission.resource || !permission.action) {
        throw new Error(`Invalid permission in role ${role.name}`);
      }
      
      if (permission.priority < 0 || permission.priority > 1000) {
        throw new Error(`Permission priority must be between 0 and 1000`);
      }
    }
  }

  private generateCacheKey(context: PermissionContext): string {
    return `perm:${context.user.id}:${context.resourceType}:${context.action}:${context.resource?.id || 'null'}`;
  }

  private getUserCacheKey(userId: string, tenantId: string): string {
    return `user:${userId}:${tenantId}`;
  }

  private generateRoleId(): string {
    return `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cachePermissionResult(key: string, result: PermissionResult, context: PermissionContext): void {
    const entry: CacheEntry = {
      result,
      timestamp: new Date(),
      ttl: this.cacheTTL.permission,
      dependencies: [
        `user:${context.user.id}`,
        `resource:${context.resourceType}`,
        ...context.user.roles.map(roleId => `role:${roleId}`)
      ]
    };

    this.permissionCache.set(key, entry);
  }

  private isCacheValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp.getTime() < entry.ttl;
  }

  private invalidateRoleRelatedCaches(roleId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.permissionCache.entries()) {
      if (entry.dependencies.includes(`role:${roleId}`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.permissionCache.delete(key));
  }

  private invalidateUserPermissionCaches(userId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.permissionCache.entries()) {
      if (entry.dependencies.includes(`user:${userId}`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.permissionCache.delete(key));
  }

  private async logPermissionCheck(context: PermissionContext, result: PermissionResult): Promise<void> {
    // Only log denied permissions and high-risk allowed permissions
    if (!result.allowed || context.action === 'delete' || context.resourceType === 'medical_records') {
      await auditLogger.logAction(
        result.allowed ? 'read' : 'access_denied',
        context.resourceType,
        context.resource?.id || 'unknown',
        {
          userId: context.user.id,
          tenantId: context.user.tenantId,
          userRole: context.user.roles.join(','),
          sessionId: context.environment.sessionId || 'unknown',
          resourceType: 'permission_check',
          context: {
            ip: context.environment.ip || 'unknown',
            userAgent: context.environment.userAgent || 'unknown',
            device: { type: 'api' },
            api: {}
          },
          changes: {
            fields: ['permission_result'],
            sensitiveFields: [],
            after: {
              action: context.action,
              allowed: result.allowed,
              reason: result.reason,
              matchedPermissions: result.matchedPermissions.length
            }
          },
          security: {
            riskLevel: result.allowed ? 'low' : 'high',
            authMethod: 'password',
            encryptionUsed: false
          }
        }
      );
    }
  }

  private initializeSystemRoles(): void {
    // Initialize default system roles
    const systemRoles: Role[] = [
      {
        id: 'super_admin',
        name: 'Super Administrator',
        description: 'Full system access',
        permissions: [{
          id: 'super_admin_all',
          resource: '*',
          action: '*',
          effect: 'allow',
          priority: 1000
        }],
        isSystem: true
      },
      {
        id: 'clinic_owner',
        name: 'Clinic Owner',
        description: 'Full clinic management access',
        permissions: [{
          id: 'clinic_owner_all',
          resource: '*',
          action: '*',
          effect: 'allow',
          priority: 900,
          conditions: [{
            field: 'user.metadata.clinicId',
            operator: 'eq',
            value: 'resource.clinicId'
          }]
        }],
        isSystem: true
      },
      {
        id: 'doctor',
        name: 'Healthcare Professional',
        description: 'Medical professional access',
        permissions: [
          {
            id: 'doctor_read_patients',
            resource: 'patients',
            action: 'read',
            effect: 'allow',
            priority: 500,
            conditions: [{
              field: 'user.metadata.clinicId',
              operator: 'eq',
              value: 'resource.clinicId'
            }]
          },
          {
            id: 'doctor_manage_medical_records',
            resource: 'medical_records',
            action: '*',
            effect: 'allow',
            priority: 500,
            conditions: [{
              field: 'user.id',
              operator: 'eq',
              value: 'resource.professionalId'
            }]
          }
        ],
        isSystem: true
      }
    ];

    systemRoles.forEach(role => {
      this.roleCache.set(role.id, role);
    });
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      
      // Clean permission cache
      for (const [key, entry] of this.permissionCache.entries()) {
        if (now - entry.timestamp.getTime() > entry.ttl) {
          this.permissionCache.delete(key);
        }
      }
    }, 60000); // Run every minute
  }
}

// Singleton instance for application-wide use
export const permissionManager = new PermissionManager();

// Export types
export type { 
  Permission, 
  Role, 
  User, 
  PermissionContext, 
  PermissionResult, 
  PermissionAction,
  PermissionCondition
};