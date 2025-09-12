import { AuthCacheManager } from '@/utils/authCache';

// Mock performance monitor
jest.mock('@/utils/performanceMonitor', () => ({
  performanceMonitor: {
    recordCacheOperation: jest.fn()
  }
}));

describe('AuthCacheManager', () => {
  let cacheManager: AuthCacheManager;

  beforeEach(() => {
    cacheManager = new AuthCacheManager(1000, 2000, 3000); // Short TTLs for testing
    jest.clearAllMocks();
  });

  describe('Profile Cache', () => {
    const mockProfile = {
      id: '1',
      user_id: 'user-1',
      nome_completo: 'Test User',
      email: 'test@example.com',
      ativo: true,
      primeiro_acesso: false,
      criado_em: '2023-01-01',
      atualizado_em: '2023-01-01'
    };

    it('stores and retrieves profile data', () => {
      cacheManager.setProfile(mockProfile);
      const cached = cacheManager.getProfile();
      
      expect(cached).toBeTruthy();
      expect(cached?.data).toEqual(mockProfile);
      expect(cached?.isStale).toBe(false);
    });

    it('returns null when no profile is cached', () => {
      const cached = cacheManager.getProfile();
      expect(cached).toBeNull();
    });

    it('marks profile as stale after TTL expires', (done) => {
      cacheManager.setProfile(mockProfile);
      
      // Wait for TTL to expire
      setTimeout(() => {
        const cached = cacheManager.getProfile();
        expect(cached?.isStale).toBe(true);
        done();
      }, 1100);
    });

    it('stores error information with profile', () => {
      const errorMessage = 'Profile fetch failed';
      cacheManager.setProfile(null, errorMessage);
      
      const cached = cacheManager.getProfile();
      expect(cached?.error).toBe(errorMessage);
      expect(cached?.data).toBeNull();
    });
  });

  describe('Roles Cache', () => {
    const mockRoles = [
      {
        id: '1',
        user_id: 'user-1',
        role: 'proprietaria' as const,
        ativo: true,
        criado_em: '2023-01-01',
        criado_por: 'user-1'
      }
    ];

    it('stores and retrieves roles data', () => {
      cacheManager.setRoles(mockRoles);
      const cached = cacheManager.getRoles();
      
      expect(cached).toBeTruthy();
      expect(cached?.data).toEqual(mockRoles);
      expect(cached?.isStale).toBe(false);
    });

    it('returns null when no roles are cached', () => {
      const cached = cacheManager.getRoles();
      expect(cached).toBeNull();
    });

    it('marks roles as stale after TTL expires', (done) => {
      cacheManager.setRoles(mockRoles);
      
      // Wait for TTL to expire
      setTimeout(() => {
        const cached = cacheManager.getRoles();
        expect(cached?.isStale).toBe(true);
        done();
      }, 2100);
    });
  });

  describe('Permissions Cache', () => {
    const mockPermissions = ['read:users', 'write:users'];

    it('stores and retrieves permissions data', () => {
      cacheManager.setPermissions(mockPermissions);
      const cached = cacheManager.getPermissions();
      
      expect(cached).toBeTruthy();
      expect(cached?.data).toEqual(mockPermissions);
      expect(cached?.isStale).toBe(false);
    });

    it('marks permissions as stale after TTL expires', (done) => {
      cacheManager.setPermissions(mockPermissions);
      
      // Wait for TTL to expire
      setTimeout(() => {
        const cached = cacheManager.getPermissions();
        expect(cached?.isStale).toBe(true);
        done();
      }, 3100);
    });
  });

  describe('Cache Management', () => {
    const mockProfile = {
      id: '1',
      user_id: 'user-1',
      nome_completo: 'Test User',
      email: 'test@example.com',
      ativo: true,
      primeiro_acesso: false,
      criado_em: '2023-01-01',
      atualizado_em: '2023-01-01'
    };

    const mockRoles = [
      {
        id: '1',
        user_id: 'user-1',
        role: 'proprietaria' as const,
        ativo: true,
        criado_em: '2023-01-01',
        criado_por: 'user-1'
      }
    ];

    it('invalidates profile cache', () => {
      cacheManager.setProfile(mockProfile);
      cacheManager.invalidateProfile();
      
      const cached = cacheManager.getProfile();
      expect(cached?.isStale).toBe(true);
    });

    it('invalidates roles cache', () => {
      cacheManager.setRoles(mockRoles);
      cacheManager.invalidateRoles();
      
      const cached = cacheManager.getRoles();
      expect(cached?.isStale).toBe(true);
    });

    it('invalidates all caches', () => {
      cacheManager.setProfile(mockProfile);
      cacheManager.setRoles(mockRoles);
      cacheManager.setPermissions(['read:users']);
      
      cacheManager.invalidateAll();
      
      expect(cacheManager.getProfile()?.isStale).toBe(true);
      expect(cacheManager.getRoles()?.isStale).toBe(true);
      expect(cacheManager.getPermissions()?.isStale).toBe(true);
    });

    it('clears all caches', () => {
      cacheManager.setProfile(mockProfile);
      cacheManager.setRoles(mockRoles);
      cacheManager.setPermissions(['read:users']);
      
      cacheManager.clearAll();
      
      expect(cacheManager.getProfile()).toBeNull();
      expect(cacheManager.getRoles()).toBeNull();
      expect(cacheManager.getPermissions()).toBeNull();
    });
  });

  describe('Utility Methods', () => {
    const mockProfile = {
      id: '1',
      user_id: 'user-1',
      nome_completo: 'Test User',
      email: 'test@example.com',
      ativo: true,
      primeiro_acesso: false,
      criado_em: '2023-01-01',
      atualizado_em: '2023-01-01'
    };

    it('checks if profile is fresh', () => {
      expect(cacheManager.isProfileFresh()).toBe(false);
      
      cacheManager.setProfile(mockProfile);
      expect(cacheManager.isProfileFresh()).toBe(true);
    });

    it('checks if roles are fresh', () => {
      expect(cacheManager.isRolesFresh()).toBe(false);
      
      cacheManager.setRoles([]);
      expect(cacheManager.isRolesFresh()).toBe(true);
    });

    it('generates cache statistics', () => {
      cacheManager.setProfile(mockProfile);
      cacheManager.setRoles([]);
      
      const stats = cacheManager.getCacheStats();
      
      expect(stats.profileCached).toBe(true);
      expect(stats.profileFresh).toBe(true);
      expect(stats.rolesCached).toBe(true);
      expect(stats.rolesFresh).toBe(true);
      expect(stats.permissionsCached).toBe(false);
      expect(stats.permissionsFresh).toBe(false);
    });

    it('generates auth state', () => {
      cacheManager.setProfile(mockProfile);
      cacheManager.setRoles([{
        id: '1',
        user_id: 'user-1',
        role: 'proprietaria' as const,
        ativo: true,
        criado_em: '2023-01-01',
        criado_por: 'user-1'
      }]);
      
      const authState = cacheManager.getAuthState(true);
      
      expect(authState.isReady).toBe(true);
      expect(authState.hasValidSession).toBe(true);
      expect(authState.hasProfile).toBe(true);
      expect(authState.hasRoles).toBe(true);
      expect(authState.needsOnboarding).toBe(false);
    });

    it('detects onboarding needed from profile', () => {
      const onboardingProfile = { ...mockProfile, primeiro_acesso: true };
      cacheManager.setProfile(onboardingProfile);
      
      const authState = cacheManager.getAuthState(true);
      expect(authState.needsOnboarding).toBe(true);
    });
  });

  describe('Performance Monitoring Integration', () => {
    const { performanceMonitor } = require('@/utils/performanceMonitor');

    it('records cache operations', () => {
      const mockProfile = {
        id: '1',
        user_id: 'user-1',
        nome_completo: 'Test User',
        email: 'test@example.com',
        ativo: true,
        primeiro_acesso: false,
        criado_em: '2023-01-01',
        atualizado_em: '2023-01-01'
      };

      cacheManager.setProfile(mockProfile);
      expect(performanceMonitor.recordCacheOperation).toHaveBeenCalledWith(
        'write',
        'profile',
        expect.any(Number)
      );

      cacheManager.getProfile();
      expect(performanceMonitor.recordCacheOperation).toHaveBeenCalledWith(
        'hit',
        'profile',
        expect.any(Number)
      );
    });

    it('records cache misses', () => {
      cacheManager.getProfile(); // No profile cached
      expect(performanceMonitor.recordCacheOperation).toHaveBeenCalledWith(
        'miss',
        'profile',
        expect.any(Number)
      );
    });
  });
});