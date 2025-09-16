/**
 * Tests for Unified Appwrite Auth Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { unifiedAppwriteAuthService } from '../unified-appwrite-auth.service';

// Mock Appwrite
vi.mock('@/lib/appwrite', () => ({
  account: {
    createEmailSession: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    deleteSession: vi.fn(),
    updatePrefs: vi.fn()
  },
  databases: {
    listDocuments: vi.fn(),
    createDocument: vi.fn(),
    getDocument: vi.fn()
  },
  DATABASE_ID: 'test-db',
  COLLECTIONS: {
    PROFILES: 'profiles',
    USER_ROLES: 'user_roles',
    ORGANIZACOES: 'organizacoes',
    CLINICAS: 'clinicas'
  }
}));

// Mock services
vi.mock('../encryption.service', () => ({
  EncryptionService: vi.fn().mockImplementation(() => ({
    encryptData: vi.fn().mockResolvedValue('encrypted-data'),
    decryptData: vi.fn().mockResolvedValue('decrypted-data')
  }))
}));

vi.mock('../audit-logger.service', () => ({
  AuditLogger: vi.fn().mockImplementation(() => ({
    logAuthEvent: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('../permission-manager.service', () => ({
  PermissionManager: vi.fn().mockImplementation(() => ({
    checkPermission: vi.fn().mockResolvedValue(true)
  }))
}));

describe('UnifiedAppwriteAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', async () => {
      const mockUser = {
        $id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerification: true,
        status: true,
        registration: '2024-01-01T00:00:00.000Z',
        passwordUpdate: '2024-01-01T00:00:00.000Z'
      };

      const { account } = await import('@/lib/appwrite');
      vi.mocked(account.get).mockResolvedValue(mockUser);

      const result = await unifiedAppwriteAuthService.getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(account.get).toHaveBeenCalledOnce();
    });

    it('should return null when not authenticated', async () => {
      const { account } = await import('@/lib/appwrite');
      vi.mocked(account.get).mockRejectedValue(new Error('Not authenticated'));

      const result = await unifiedAppwriteAuthService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      const mockUser = {
        $id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerification: true,
        status: true,
        registration: '2024-01-01T00:00:00.000Z',
        passwordUpdate: '2024-01-01T00:00:00.000Z',
        prefs: { tenantId: 'tenant-123' }
      };

      const { account, databases } = await import('@/lib/appwrite');
      vi.mocked(account.get).mockResolvedValue(mockUser);
      vi.mocked(databases.listDocuments).mockResolvedValue({
        documents: [],
        total: 0
      });

      const result = await unifiedAppwriteAuthService.refreshSession();

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.currentTenant).toBe('tenant-123');
    });

    it('should handle refresh session failure', async () => {
      const { account } = await import('@/lib/appwrite');
      vi.mocked(account.get).mockRejectedValue(new Error('Session expired'));

      const result = await unifiedAppwriteAuthService.refreshSession();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sessão expirada');
    });
  });
});