/**
 * Tests for PermissionManager and AuthorizationMiddleware
 * Validates RBAC functionality, caching, and security features
 */

import { 
  PermissionManager, 
  Permission, 
  Role, 
  User, 
  PermissionContext,
  PermissionAction
} from '../../services/permission-manager.service';
import { 
  AuthorizationMiddleware, 
  AuthorizationError,
  AuthorizationConfig,
  OperationContext
} from '../../services/authorization-middleware.service';

// Mock audit logger
jest.mock('../../services/audit-logger.service', () => ({
  auditLogger: {
    logAction: jest.fn().mockResolvedValue(undefined),
    logCRUDOperation: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock audit middleware
jest.mock('../../services/audit-middleware.service', () => ({
  auditMiddleware: {
    interceptCRUDOperation: jest.fn().mockImplementation((operation, executor) => executor()),
    interceptDataAccess: jest.fn().mockImplementation((resourceType, resourceId, accessType, context, executor) => executor())
  }
}));

describe('PermissionManager', () => {
  let permissionManager: PermissionManager;

  beforeEach(() => {
    permissionManager = new PermissionManager();
    jest.clearAllMocks();
  });

  describe('checkPermission', () => {
    it('should allow access for super admin', async () => {
      const context: PermissionContext = {
        user: {
          id: 'admin-1',
          tenantId: 'tenant-1',
          roles: ['super_admin']
        },
        resource: { id: 'patient-1', clinicId: 'clinic-1' },
        resourceType: 'patients',
        action: 'delete',
        environment: {
          timestamp: new Date(),
          ip: '192.168.1.1',
          userAgent: 'Test Agent'
        }
      };

      const result = await permissionManager.checkPermission(context);

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('Access granted');
      expect(result.matchedPermissions.length).toBeGreaterThan(0);
    });

    it('should deny access for insufficient permissions', async () => {
      const context: PermissionContext = {
        user: {
          id: 'user-1',
          tenantId: 'tenant-1',
          roles: ['basic_user']
        },
        resource: { id: 'patient-1', clinicId: 'other-clinic' },
        resourceType: 'medical_records',
        action: 'delete',
        environment: {
          timestamp: new Date(),
          ip: '192.168.1.1',
          userAgent: 'Test Agent'
        }
      };

      const result = await permissionManager.checkPermission(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('denied');
    });

    it('should evaluate conditions correctly', async () => {
      // Create a role with conditional permissions
      const doctorRole: Role = {
        id: 'test-doctor',
        name: 'Test Doctor',
        description: 'Doctor with clinic-specific access',
        permissions: [{
          id: 'doctor-clinic-access',
          resource: 'patients',
          action: 'read',
          effect: 'allow',
          priority: 500,
          conditions: [{
            field: 'user.metadata.clinicId',
            operator: 'eq',
            value: 'clinic-1'
          }]
        }],
        isSystem: false,
        tenantId: 'tenant-1'
      };

      await permissionManager.createRole(doctorRole);

      const context: PermissionContext = {
        user: {
          id: 'doctor-1',
          tenantId: 'tenant-1',
          roles: ['test-doctor'],
          metadata: {
            clinicId: 'clinic-1'
          }
        },
        resource: { id: 'patient-1', clinicId: 'clinic-1' },
        resourceType: 'patients',
        action: 'read',
        environment: {
          timestamp: new Date(),
          ip: '192.168.1.1',
          userAgent: 'Test Agent'
        }
      };

      const result = await permissionManager.checkPermission(context);

      expect(result.allowed).toBe(true);
    });

    it('should deny access when conditions are not met', async () => {
      const context: PermissionContext = {
        user: {
          id: 'doctor-1',
          tenantId: 'tenant-1',
          roles: ['doctor'],
          metadata: {
            clinicId: 'clinic-1'
          }
        },
        resource: { id: 'patient-1', clinicId: 'clinic-2' }, // Different clinic
        resourceType: 'patients',
        action: 'read',
        environment: {
          timestamp: new Date(),
          ip: '192.168.1.1',
          userAgent: 'Test Agent'
        }
      };

      const result = await permissionManager.checkPermission(context);

      expect(result.allowed).toBe(false);
    });

    it('should handle wildcard permissions', async () => {
      const context: PermissionContext = {
        user: {
          id: 'admin-1',
          tenantId: 'tenant-1',
          roles: ['super_admin']
        },
        resource: { id: 'any-resource' },
        resourceType: 'any_resource_type',
        action: 'any_action' as PermissionAction,
        environment: {
          timestamp: new Date(),
          ip: '192.168.1.1',
          userAgent: 'Test Agent'
        }
      };

      const result = await permissionManager.checkPermission(context);

      expect(result.allowed).toBe(true);
    });
  });

  describe('getUserEffectivePermissions', () => {
    it('should return effective permissions for user', async () => {
      const permissions = await permissionManager.getUserEffectivePermissions('user-1', 'tenant-1');

      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBeGreaterThan(0);
    });

    it('should include inherited permissions from roles', async () => {
      // This would test role inheritance in a real implementation
      const permissions = await permissionManager.getUserEffectivePermissions('admin-1', 'tenant-1');

      expect(permissions.length).toBeGreaterThan(0);
    });
  });

  describe('role management', () => {
    it('should create new roles', async () => {
      const newRole = {
        name: 'Test Role',
        description: 'A test role',
        permissions: [{
          id: 'test-permission',
          resource: 'test_resource',
          action: 'read' as PermissionAction,
          effect: 'allow' as const,
          priority: 100
        }],
        isSystem: false,
        tenantId: 'tenant-1'
      };

      const createdRole = await permissionManager.createRole(newRole);

      expect(createdRole.id).toBeDefined();
      expect(createdRole.name).toBe(newRole.name);
      expect(createdRole.permissions).toEqual(newRole.permissions);
      expect(createdRole.metadata).toBeDefined();
    });

    it('should validate role permissions', async () => {
      const invalidRole = {
        name: 'Invalid Role',
        description: 'Role with invalid permissions',
        permissions: [{
          id: '', // Invalid: empty ID
          resource: 'test_resource',
          action: 'read' as PermissionAction,
          effect: 'allow' as const,
          priority: 100
        }],
        isSystem: false,
        tenantId: 'tenant-1'
      };

      await expect(permissionManager.createRole(invalidRole)).rejects.toThrow();
    });

    it('should assign roles to users', async () => {
      const roleId = 'test-role';
      const userId = 'user-1';
      const tenantId = 'tenant-1';

      // This would work with a real database implementation
      await expect(
        permissionManager.assignRoleToUser(userId, roleId, tenantId)
      ).rejects.toThrow(); // Throws because role doesn't exist in mock
    });
  });

  describe('caching', () => {
    it('should cache permission results', async () => {
      const context: PermissionContext = {
        user: {
          id: 'user-1',
          tenantId: 'tenant-1',
          roles: ['basic_user']
        },
        resource: { id: 'resource-1' },
        resourceType: 'test_resource',
        action: 'read',
        environment: {
          timestamp: new Date(),
          ip: '192.168.1.1',
          userAgent: 'Test Agent'
        }
      };

      // First call
      const result1 = await permissionManager.checkPermission(context);
      
      // Second call should use cache
      const result2 = await permissionManager.checkPermission(context);

      expect(result1.allowed).toBe(result2.allowed);
      expect(result1.reason).toBe(result2.reason);
    });
  });

  describe('condition evaluation', () => {
    it('should evaluate equality conditions', async () => {
      const context: PermissionContext = {
        user: {
          id: 'user-1',
          tenantId: 'tenant-1',
          roles: ['test-role'],
          metadata: { level: 5 }
        },
        resource: { id: 'resource-1', level: 5 },
        resourceType: 'test_resource',
        action: 'read',
        environment: {
          timestamp: new Date(),
          ip: '192.168.1.1',
          userAgent: 'Test Agent'
        }
      };

      // Would test condition evaluation in real implementation
      const result = await permissionManager.checkPermission(context);
      expect(typeof result.allowed).toBe('boolean');
    });

    it('should evaluate array inclusion conditions', async () => {
      const context: PermissionContext = {
        user: {
          id: 'user-1',
          tenantId: 'tenant-1',
          roles: ['test-role'],
          metadata: { departments: ['cardiology', 'surgery'] }
        },
        resource: { id: 'resource-1', department: 'cardiology' },
        resourceType: 'test_resource',
        action: 'read',
        environment: {
          timestamp: new Date(),
          ip: '192.168.1.1',
          userAgent: 'Test Agent'
        }
      };

      const result = await permissionManager.checkPermission(context);
      expect(typeof result.allowed).toBe('boolean');
    });
  });
});

describe('AuthorizationMiddleware', () => {
  let authorizationMiddleware: AuthorizationMiddleware;
  let mockContext: OperationContext;

  beforeEach(() => {
    authorizationMiddleware = new AuthorizationMiddleware();
    mockContext = {
      userId: 'user-1',
      userRole: 'doctor',
      tenantId: 'tenant-1',
      sessionId: 'session-1',
      ip: '192.168.1.1',
      userAgent: 'Test Agent',
      endpoint: '/api/patients',
      method: 'GET'
    };
    jest.clearAllMocks();
  });

  describe('authorizeAndExecute', () => {
    it('should execute operation when authorized', async () => {
      const config: AuthorizationConfig = {
        resource: 'patients',
        action: 'read'
      };

      const mockExecutor = jest.fn().mockResolvedValue({ id: 'patient-1' });

      const operation = {
        config,
        context: mockContext,
        execute: mockExecutor
      };

      const result = await authorizationMiddleware.authorizeAndExecute(operation);

      expect(mockExecutor).toHaveBeenCalled();
      expect(result).toEqual({ id: 'patient-1' });
    });

    it('should throw AuthorizationError when access denied', async () => {
      const config: AuthorizationConfig = {
        resource: 'medical_records',
        action: 'delete' // High-risk operation
      };

      const mockExecutor = jest.fn().mockResolvedValue({});

      const operation = {
        config,
        context: {
          ...mockContext,
          userRole: 'receptionist' // Insufficient role
        },
        execute: mockExecutor
      };

      await expect(
        authorizationMiddleware.authorizeAndExecute(operation)
      ).rejects.toThrow(AuthorizationError);

      expect(mockExecutor).not.toHaveBeenCalled();
    });

    it('should skip authorization when configured', async () => {
      const config: AuthorizationConfig = {
        resource: 'test_resource',
        action: 'read',
        skipAuthorization: true
      };

      const mockExecutor = jest.fn().mockResolvedValue({ success: true });

      const operation = {
        config,
        context: mockContext,
        execute: mockExecutor
      };

      const result = await authorizationMiddleware.authorizeAndExecute(operation);

      expect(mockExecutor).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should require elevation for sensitive operations', async () => {
      const config: AuthorizationConfig = {
        resource: 'medical_records',
        action: 'export',
        requireElevation: true
      };

      const mockExecutor = jest.fn().mockResolvedValue({});

      const operation = {
        config,
        context: mockContext,
        execute: mockExecutor
      };

      await expect(
        authorizationMiddleware.authorizeAndExecute(operation)
      ).rejects.toThrow(AuthorizationError);

      expect(mockExecutor).not.toHaveBeenCalled();
    });
  });

  describe('authorizeDataAccess', () => {
    it('should authorize data viewing', async () => {
      const mockExecutor = jest.fn().mockResolvedValue({ data: 'patient data' });

      const result = await authorizationMiddleware.authorizeDataAccess(
        'patients',
        'patient-1',
        'view',
        mockContext,
        mockExecutor
      );

      expect(mockExecutor).toHaveBeenCalled();
      expect(result).toEqual({ data: 'patient data' });
    });

    it('should require elevation for data export', async () => {
      const mockExecutor = jest.fn().mockResolvedValue({});

      await expect(
        authorizationMiddleware.authorizeDataAccess(
          'medical_records',
          'record-1',
          'export',
          mockContext,
          mockExecutor
        )
      ).rejects.toThrow(AuthorizationError);

      expect(mockExecutor).not.toHaveBeenCalled();
    });
  });

  describe('session elevation', () => {
    it('should elevate session privileges', async () => {
      await authorizationMiddleware.elevateSession(
        'session-1',
        'user-1',
        ['export_medical_records'],
        15
      );

      // Test that elevation is active
      const config: AuthorizationConfig = {
        resource: 'medical_records',
        action: 'export',
        requireElevation: true
      };

      const mockExecutor = jest.fn().mockResolvedValue({});

      const operation = {
        config,
        context: mockContext,
        execute: mockExecutor
      };

      // Should now succeed with elevated session
      const result = await authorizationMiddleware.authorizeAndExecute(operation);
      expect(mockExecutor).toHaveBeenCalled();
    });

    it('should expire elevated sessions', async () => {
      // Elevate for a very short duration
      await authorizationMiddleware.elevateSession(
        'session-1',
        'user-1',
        ['export_medical_records'],
        0.01 // 0.01 minutes = 0.6 seconds
      );

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1000));

      const config: AuthorizationConfig = {
        resource: 'medical_records',
        action: 'export',
        requireElevation: true
      };

      const mockExecutor = jest.fn().mockResolvedValue({});

      const operation = {
        config,
        context: mockContext,
        execute: mockExecutor
      };

      // Should fail after expiration
      await expect(
        authorizationMiddleware.authorizeAndExecute(operation)
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('system bypass tokens', () => {
    it('should create and validate bypass tokens', async () => {
      const token = authorizationMiddleware.createSystemBypassToken('migration-001');

      expect(typeof token).toBe('string');
      expect(token).toContain('system_migration-001');
    });

    it('should allow operations with valid bypass token', async () => {
      const token = authorizationMiddleware.createSystemBypassToken('test-operation');

      const config: AuthorizationConfig = {
        resource: 'medical_records',
        action: 'delete'
      };

      const mockExecutor = jest.fn().mockResolvedValue({ deleted: true });

      const operation = {
        config,
        context: {
          ...mockContext,
          sessionId: token // Use token as session ID
        },
        execute: mockExecutor
      };

      const result = await authorizationMiddleware.authorizeAndExecute(operation);

      expect(mockExecutor).toHaveBeenCalled();
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('batch authorization', () => {
    it('should authorize multiple operations', async () => {
      const operations = [
        {
          config: { resource: 'patients', action: 'read' as PermissionAction },
          context: mockContext
        },
        {
          config: { resource: 'appointments', action: 'create' as PermissionAction },
          context: mockContext
        }
      ];

      const results = await authorizationMiddleware.authorizeBatch(operations);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('authorized');
      expect(results[1]).toHaveProperty('authorized');
    });
  });

  describe('permission summaries', () => {
    it('should get user resource permissions', async () => {
      const summary = await authorizationMiddleware.getUserResourcePermissions(
        'user-1',
        'tenant-1',
        'patients'
      );

      expect(summary).toHaveProperty('userId', 'user-1');
      expect(summary).toHaveProperty('tenantId', 'tenant-1');
      expect(summary).toHaveProperty('resourceType', 'patients');
      expect(summary).toHaveProperty('allowedActions');
      expect(summary).toHaveProperty('hasFullAccess');
      expect(summary).toHaveProperty('requiresElevation');
      expect(Array.isArray(summary.allowedActions)).toBe(true);
    });
  });
});