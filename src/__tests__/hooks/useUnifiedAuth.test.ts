/**
 * 🧪 TESTES DO HOOK useUnifiedAuth
 * 
 * Testes unitários para verificar que o hook unificado delega corretamente para useClerkAuth
 */

import { renderHook } from '@testing-library/react';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { useClerkAuth } from '@/hooks/useClerkAuth';

// Mock do useClerkAuth
jest.mock('@/hooks/useClerkAuth');

const mockUseClerkAuth = useClerkAuth as jest.MockedFunction<typeof useClerkAuth>;

describe('useUnifiedAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delegate to useClerkAuth', () => {
    const mockAuthData = {
      user: {
        id: 'user_123',
        email: 'test@example.com',
        user_metadata: { nome_completo: 'Test User' },
        app_metadata: {},
        aud: 'authenticated',
        created_at: '2023-01-01T00:00:00.000Z',
      },
      session: null,
      profile: null,
      roles: [],
      currentRole: 'user',
      onboardingStatus: 'completed' as const,
      isInitializing: false,
      isProfileLoading: false,
      isOnboardingLoading: false,
      isInitialized: true,
      isAuthenticated: true,
      isOnboardingComplete: true,
      error: null,
      canRetry: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      hasRole: jest.fn(),
      getCurrentRole: jest.fn(),
      refreshProfile: jest.fn(),
      refreshUserData: jest.fn(),
      clearError: jest.fn(),
      retry: jest.fn(),
    };

    mockUseClerkAuth.mockReturnValue(mockAuthData);

    const { result } = renderHook(() => useUnifiedAuth());

    expect(mockUseClerkAuth).toHaveBeenCalled();
    expect(result.current).toBe(mockAuthData);
  });

  it('should maintain compatibility interface', () => {
    const mockAuthData = {
      user: null,
      session: null,
      profile: null,
      roles: [],
      currentRole: 'user',
      onboardingStatus: 'completed' as const,
      isInitializing: false,
      isProfileLoading: false,
      isOnboardingLoading: false,
      isInitialized: true,
      isAuthenticated: false,
      isOnboardingComplete: true,
      error: null,
      canRetry: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      hasRole: jest.fn(),
      getCurrentRole: jest.fn(),
      refreshProfile: jest.fn(),
      refreshUserData: jest.fn(),
      clearError: jest.fn(),
      retry: jest.fn(),
    };

    mockUseClerkAuth.mockReturnValue(mockAuthData);

    const { result } = renderHook(() => useUnifiedAuth());

    // Verify all expected properties are present
    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('session');
    expect(result.current).toHaveProperty('profile');
    expect(result.current).toHaveProperty('roles');
    expect(result.current).toHaveProperty('currentRole');
    expect(result.current).toHaveProperty('onboardingStatus');
    expect(result.current).toHaveProperty('isInitializing');
    expect(result.current).toHaveProperty('isProfileLoading');
    expect(result.current).toHaveProperty('isOnboardingLoading');
    expect(result.current).toHaveProperty('isInitialized');
    expect(result.current).toHaveProperty('isAuthenticated');
    expect(result.current).toHaveProperty('isOnboardingComplete');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('canRetry');
    expect(result.current).toHaveProperty('signIn');
    expect(result.current).toHaveProperty('signUp');
    expect(result.current).toHaveProperty('signOut');
    expect(result.current).toHaveProperty('hasRole');
    expect(result.current).toHaveProperty('getCurrentRole');
    expect(result.current).toHaveProperty('refreshProfile');
    expect(result.current).toHaveProperty('refreshUserData');
    expect(result.current).toHaveProperty('clearError');
    expect(result.current).toHaveProperty('retry');
  });
});