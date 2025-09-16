/**
 * AuthorizationMiddleware - Middleware for all operations with RBAC integration
 * 
 * Features:
 * - Automatic permission checking for all operations
 * - Integration with audit logging
 * - Performance optimized with caching
 * - Context-aware authorization
 * - Graceful error handling
 * 
 * Requirements: 4.3
 */

import { permissionManager, PermissionContext, PermissionAction } from './permission-manager.service';
import { auditMiddleware, OperationContext } from './audit-middleware.service';

export interface AuthorizationConfig {
  resource: string;
  action: PermissionAction;
  resourceExtractor?: (context: any) => any;
  skipAuthorization?: boolean;
  requireElevation?: boolean;
  customValidator?: (context: PermissionContext) => Promise<boolean>;
}

export interface AuthorizedOperation<T> {
  execute: () => Promise<T>;
  config: AuthorizationConfig;
  context: OperationContext;
}

export class AuthorizationMiddleware {
  private elevatedSessions = new Map<string, { expires: Date; permissions: string[] }>();
  private bypassTokens = new Set<string>(); // For system operations

  /**
   * Authorize and execute an operation
   */
  async authorizeAndExecute<T>(
    operation: AuthorizedOperation<T>
  ): Promise<T> {
    const { config, context, execute } = operation;

    // Skip authorization if configured
    if (config.skipAuthorization) {
      return execute();
    }

    // Check if this is a system operation with bypass token
    if (this.hasValidBypassToken(context.sessionId)) {
      return execute();
    }

    // Build permission context
    const permissionContext = await this.buildPermissionContext(config, context);

    // Check basic permission
    const permissionResult = await permissionManager.checkPermission(permissionContext);

    if (!permissionResult.allowed) {
      throw new AuthorizationError(
        `Access denied: ${permissionResult.reason}`,
        'PERMISSION_DENIED',
        {
          resource: config.resource,
          action: config.action,
          userId: context.userId,
          reason: permissionResult.reason
        }
      );
    }

    // Check if elevation is required
    if (config.requireElevation && !this.hasElevatedSession(context.sessionId)) {
      throw new AuthorizationError(
        'Operation requires elevated privileges',
        'ELEVATION_REQUIRED',
        {
          resource: config.resource,
          action: config.action,
          userId: context.userId,
          elevationRequired: true
        }
      );
    }

    // Run custom validator if provided
    if (config.customValidator) {
      const customResult = await config.customValidator(permissionContext);
      if (!customResult) {
        throw new AuthorizationError(
          'Custom authorization check failed',
          'CUSTOM_VALIDATION_FAILED',
          {
            resource: config.resource,
            action: config.action,
            userId: context.userId
          }
        );
      }
    }

    // Execute the operation with audit logging
    return auditMiddleware.interceptCRUDOperation(
      {
        action: this.mapPermissionActionToCRUD(config.action),
        resource: config.resource,
        resourceId: permissionContext.resource?.id || 'unknown',
        resourceType: config.resource,
        context
      },
      execute
    );
  }

  /**
   * Authorize data access operations
   */
  async authorizeDataAccess<T>(
    resourceType: string,
    resourceId: string,
    accessType: 'view' | 'export' | 'print' | 'share',
    context: OperationContext,
    executor: () => Promise<T>
  ): Promise<T> {
    const config: AuthorizationConfig = {
      resource: resourceType,
      action: this.mapAccessTypeToPermission(accessType),
      requireElevation: accessType === 'export' || accessType === 'share'
    };

    const permissionContext = await this.buildPermissionContext(config, context);
    const permissionResult = await permissionManager.checkPermission(permissionContext);

    if (!permissionResult.allowed) {
      throw new AuthorizationError(
        `Data access denied: ${permissionResult.reason}`,
        'DATA_ACCESS_DENIED',
        {
          resource: resourceType,
          resourceId,
          accessType,
          userId: context.userId,
          reason: permissionResult.reason
        }
      );
    }

    // Check elevation for sensitive operations
    if (config.requireElevation && !this.hasElevatedSession(context.sessionId)) {
      throw new AuthorizationError(
        `${accessType} operation requires elevated privileges`,
        'ELEVATION_REQUIRED',
        {
          resource: resourceType,
          resourceId,
          accessType,
          userId: context.userId
        }
      );
    }

    return auditMiddleware.interceptDataAccess(
      resourceType,
      resourceId,
      accessType,
      context,
      executor
    );
  }

  /**
   * Create authorization decorator for methods
   */
  authorize(config: AuthorizationConfig) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        // Extract context from method arguments or class instance
        const context = this.getOperationContext?.() || this.extractContextFromArgs?.(args);
        
        if (!context) {
          throw new AuthorizationError(
            'Unable to extract operation context for authorization',
            'CONTEXT_EXTRACTION_FAILED'
          );
        }

        const operation: AuthorizedOperation<any> = {
          config,
          context,
          execute: () => originalMethod.apply(this, args)
        };

        return this.authorizationMiddleware.authorizeAndExecute(operation);
      };

      return descriptor;
    };
  }

  /**
   * Elevate session privileges temporarily
   */
  async elevateSession(
    sessionId: string,
    userId: string,
    permissions: string[],
    durationMinutes: number = 15
  ): Promise<void> {
    const expires = new Date(Date.now() + durationMinutes * 60 * 1000);
    
    this.elevatedSessions.set(sessionId, {
      expires,
      permissions
    });

    // Log elevation
    await auditMiddleware.interceptCRUDOperation(
      {
        action: 'update',
        resource: 'session',
        resourceId: sessionId,
        resourceType: 'session_elevation',
        context: {
          userId,
          userRole: 'unknown',
          tenantId: 'unknown',
          sessionId,
          ip: 'unknown',
          userAgent: 'unknown'
        }
      },
      async () => ({ elevated: true, expires, permissions })
    );
  }

  /**
   * Create system bypass token for automated operations
   */
  createSystemBypassToken(operationId: string): string {
    const token = `system_${operationId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.bypassTokens.add(token);
    
    // Auto-expire after 1 hour
    setTimeout(() => {
      this.bypassTokens.delete(token);
    }, 60 * 60 * 1000);

    return token;
  }

  /**
   * Batch authorization for multiple operations
   */
  async authorizeBatch(
    operations: Array<{
      config: AuthorizationConfig;
      context: OperationContext;
    }>
  ): Promise<Array<{ authorized: boolean; reason?: string }>> {
    const permissionContexts = await Promise.all(
      operations.map(op => this.buildPermissionContext(op.config, op.context))
    );

    const results = await permissionManager.checkPermissions(permissionContexts);

    return results.map(result => ({
      authorized: result.allowed,
      reason: result.allowed ? undefined : result.reason
    }));
  }

  /**
   * Get user's effective permissions for a resource
   */
  async getUserResourcePermissions(
    userId: string,
    tenantId: string,
    resourceType: string
  ): Promise<PermissionSummary> {
    const effectivePermissions = await permissionManager.getUserEffectivePermissions(userId, tenantId);
    
    const resourcePermissions = effectivePermissions.filter(p => 
      p.resource === resourceType || p.resource === '*'
    );

    const allowedActions = new Set<PermissionAction>();
    const deniedActions = new Set<PermissionAction>();

    for (const permission of resourcePermissions) {
      if (permission.effect === 'allow') {
        if (permission.action === '*') {
          allowedActions.add('create');
          allowedActions.add('read');
          allowedActions.add('update');
          allowedActions.add('delete');
          allowedActions.add('export');
          allowedActions.add('share');
          allowedActions.add('print');
        } else {
          allowedActions.add(permission.action);
        }
      } else {
        if (permission.action === '*') {
          deniedActions.add('create');
          deniedActions.add('read');
          deniedActions.add('update');
          deniedActions.add('delete');
          deniedActions.add('export');
          deniedActions.add('share');
          deniedActions.add('print');
        } else {
          deniedActions.add(permission.action);
        }
      }
    }

    // Remove denied actions from allowed actions
    for (const deniedAction of deniedActions) {
      allowedActions.delete(deniedAction);
    }

    return {
      userId,
      tenantId,
      resourceType,
      allowedActions: Array.from(allowedActions),
      hasFullAccess: allowedActions.has('manage' as PermissionAction) || 
                     (allowedActions.size >= 4 && !deniedActions.size),
      requiresElevation: resourceType === 'medical_records' || resourceType === 'users'
    };
  }

  // Private methods

  private async buildPermissionContext(
    config: AuthorizationConfig,
    context: OperationContext
  ): Promise<PermissionContext> {
    // Get user information (in production, fetch from database)
    const user = {
      id: context.userId,
      tenantId: context.tenantId,
      roles: ['basic_user'], // Would be fetched from database
      metadata: {
        clinicId: context.tenantId // Simplified mapping
      }
    };

    // Extract resource if extractor is provided
    const resource = config.resourceExtractor ? config.resourceExtractor(context) : null;

    return {
      user,
      resource,
      resourceType: config.resource,
      action: config.action,
      environment: {
        ip: context.ip,
        userAgent: context.userAgent,
        timestamp: new Date(),
        sessionId: context.sessionId
      },
      additionalContext: {
        endpoint: context.endpoint,
        method: context.method
      }
    };
  }

  private mapPermissionActionToCRUD(action: PermissionAction): 'create' | 'read' | 'update' | 'delete' {
    switch (action) {
      case 'create':
        return 'create';
      case 'read':
      case 'export':
      case 'print':
      case 'share':
        return 'read';
      case 'update':
        return 'update';
      case 'delete':
        return 'delete';
      default:
        return 'read';
    }
  }

  private mapAccessTypeToPermission(accessType: 'view' | 'export' | 'print' | 'share'): PermissionAction {
    switch (accessType) {
      case 'view':
        return 'read';
      case 'export':
        return 'export';
      case 'print':
        return 'print';
      case 'share':
        return 'share';
      default:
        return 'read';
    }
  }

  private hasElevatedSession(sessionId: string): boolean {
    const elevation = this.elevatedSessions.get(sessionId);
    if (!elevation) return false;

    if (elevation.expires < new Date()) {
      this.elevatedSessions.delete(sessionId);
      return false;
    }

    return true;
  }

  private hasValidBypassToken(sessionId: string): boolean {
    return this.bypassTokens.has(sessionId);
  }
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export interface PermissionSummary {
  userId: string;
  tenantId: string;
  resourceType: string;
  allowedActions: PermissionAction[];
  hasFullAccess: boolean;
  requiresElevation: boolean;
}

// Singleton instance for application-wide use
export const authorizationMiddleware = new AuthorizationMiddleware();

// Export types
export type { 
  AuthorizationConfig, 
  AuthorizedOperation, 
  PermissionSummary 
};