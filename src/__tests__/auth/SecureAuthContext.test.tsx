/**
 * 🧪 TESTES UNITÁRIOS - SECURE AUTH CONTEXT
 * 
 * Testes abrangentes para transições de estado, lógica de decisão,
 * sistema de recovery de erros e operações atômicas
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { SecureAuthProvider, useSecureAuth } from '@/contexts/SecureAuthContext';
import { UserRole, Permission, AuthResult } from '@/types/auth.types';
import { authService } from '@/services/auth.service';
import { optimizedAuthService } from '@/services/optimized-auth.service';
import { authCache } from '@/utils/auth-cache';
import { supabase } from '@/lib/supabase';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('@/services/auth.service');
jest.mock('@/services/optimized-auth.service');
jest.mock('@/utils/auth-cache');
jest.mock('@/lib/supabase');
jest.mock('@/utils/logger');

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockOptimizedAuthService = optimizedAuthService as jest.Mocked<typeof optimizedAuthService>;
const mockAuthCache = authCache as jest.Mocked<typeof authCache>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

// Mock data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  loginAttempts: 0
};

const mockProfile = {
  id: 'user-123',
  email: 'test@example.com',
  nome_completo: 'Test User',
  primeiro_acesso: false,
  ativo: true,
  criado_em: new Date(),
  atualizado_em: new Date()
};

const mockRoles = [
  {
    role: UserRole.PROPRIETARIA,
    clinica_id: 'clinic-123',
    ativo: true
  }
];

const mockTokens = {
  accessToken: 'access-token-123',
  refreshToken: 'refresh-token-123',
  expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  tokenType: 'Bearer' as const
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const renderWithProvider = (children: React.ReactNode) => {
  return render(
    <SecureAuthProvider>
      {children}
    </SecureAuthProvider>
  );
};

const renderAuthHook = () => {
  return renderHook(() => useSecureAuth(), {
    wrapper: ({ children }) => (
      <SecureAuthProvider>
        {children}
      </SecureAuthProvider>
    )
  });
};

// ============================================================================
// TESTES DE TRANSIÇÕES DE ESTADO
// ============================================================================

describe('SecureAuthContext - State Transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    });
    
    mockAuthCache.get.mockImplementation((key, fetcher) => fetcher());
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', async () => {
      const { result } = renderAuthHook();

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.profile).toBeNull();
      expect(result.current.roles).toEqual([]);
      expect(result.current.currentRole).toBeNull();
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should transition to initialized state after auth check', async () => {
      const { result } = renderAuthHook();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isInitialized).toBe(true);
      });
    });
  });

  describe('Login Flow', () => {
    it('should handle successful login transition', async () => {
      const { result } = renderAuthHook();

      const loginResult: AuthResult = {
        success: true,
        user: mockUser,
        profile: mockProfile,
        roles: mockRoles,
        tokens: mockTokens
      };

      mockAuthService.login.mockResolvedValue(loginResult);

      await act(async () => {
        const result = await result.current.login({
          email: 'test@example.com',
          password: 'password123'
        });
        expect(result.success).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isProfileLoading).toBe(false);
        expect(result.current.isRolesLoading).toBe(false);
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.profile).toEqual(mockProfile);
        expect(result.current.roles).toEqual(mockRoles);
        expect(result.current.error).toBeNull();
      });
    });

    it('should handle failed login transition', async () => {
      const { result } = renderAuthHook();

      const loginResult: AuthResult = {
        success: false,
        error: 'Invalid credentials'
      };

      mockAuthService.login.mockResolvedValue(loginResult);

      await act(async () => {
        const result = await result.current.login({
          email: 'test@example.com',
          password: 'wrongpassword'
        });
        expect(result.success).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.user).toBeNull();
        expect(result.current.error).toBe('Invalid credentials');
      });
    });

    it('should set loading states during login', async () => {
      const { result } = renderAuthHook();

      mockAuthService.login.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          user: mockUser,
          profile: mockProfile,
          roles: mockRoles
        }), 100))
      );

      act(() => {
        result.current.login({
          email: 'test@example.com',
          password: 'password123'
        });
      });

      // Check loading states are set immediately
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isProfileLoading).toBe(true);
      expect(result.current.isRolesLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isProfileLoading).toBe(false);
        expect(result.current.isRolesLoading).toBe(false);
      });
    });
  });

  describe('Logout Flow', () => {
    it('should handle logout transition', async () => {
      const { result } = renderAuthHook();

      // First login
      mockAuthService.login.mockResolvedValue({
        success: true,
        user: mockUser,
        profile: mockProfile,
        roles: mockRoles
      });

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123'
        });
      });

      // Then logout
      mockAuthService.logout.mockResolvedValue();

      await act(async () => {
        await result.current.logout();
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
        expect(result.current.profile).toBeNull();
        expect(result.current.roles).toEqual([]);
        expect(result.current.currentRole).toBeNull();
        expect(result.current.tokens).toBeNull();
        expect(result.current.error).toBeNull();
      });
    });

    it('should clear cache on logout', async () => {
      const { result } = renderAuthHook();

      // Setup authenticated state
      mockAuthService.login.mockResolvedValue({
        success: true,
        user: mockUser,
        profile: mockProfile,
        roles: mockRoles
      });

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123'
        });
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockAuthCache.onAuthStateChange).toHaveBeenCalledWith(
        mockUser.id,
        'logout'
      );
    });
  });
});

// ============================================================================
// TESTES DE AUTORIZAÇÃO
// ============================================================================

describe('SecureAuthContext - Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Permission Checks', () => {
    it('should return false for permissions when not authenticated', () => {
      const { result } = renderAuthHook();

      expect(result.current.hasPermission(Permission.VIEW_CLINIC)).toBe(false);
      expect(result.current.hasRole(UserRole.PROPRIETARIA)).toBe(false);
      expect(result.current.hasAnyRole([UserRole.PROPRIETARIA, UserRole.GERENTE])).toBe(false);
    });

    it('should check permissions correctly when authenticated', async () => {
      const { result } = renderAuthHook();

      mockAuthService.login.mockResolvedValue({
        success: true,
        user: mockUser,
        profile: mockProfile,
        roles: mockRoles
      });

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123'
        });
      });

      await waitFor(() => {
        expect(result.current.hasPermission(Permission.VIEW_CLINIC)).toBe(true);
        expect(result.current.hasRole(UserRole.PROPRIETARIA)).toBe(true);
      });
    });
  });
});

// ============================================================================
// TESTES DE SISTEMA DE RECOVERY
// ============================================================================

describe('SecureAuthContext - Error Recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle network errors gracefully', async () => {
    const { result } = renderAuthHook();

    mockAuthService.login.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      const result = await result.current.login({
        email: 'test@example.com',
        password: 'password123'
      });
      expect(result.success).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it('should clear errors when requested', async () => {
    const { result } = renderAuthHook();

    mockAuthService.login.mockResolvedValue({
      success: false,
      error: 'Test error'
    });

    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'password123'
      });
    });

    expect(result.current.error).toBe('Test error');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});

// ============================================================================
// TESTES DE CACHE E PERFORMANCE
// ============================================================================

describe('SecureAuthContext - Cache Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use cache for auth data', async () => {
    const { result } = renderAuthHook();

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    const completeAuthData = {
      user: mockUser,
      profile: mockProfile,
      roles: mockRoles
    };

    mockAuthCache.get.mockResolvedValue(completeAuthData);

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(mockAuthCache.get).toHaveBeenCalledWith(
      `${mockUser.id}:complete_auth`,
      expect.any(Function),
      5 * 60 * 1000 // 5 minutes TTL
    );
  });
});