/**
 * 🧪 TESTES DO HOOK useClerkAuth
 * 
 * Testes unitários para verificar funcionalidade do hook de autenticação Clerk
 */

import { renderHook } from '@testing-library/react';
import { useClerkAuth } from '@/hooks/useClerkAuth';

// Mock do Clerk
jest.mock('@clerk/clerk-react', () => ({
  useAuth: jest.fn(),
  useUser: jest.fn(),
}));

import { useAuth, useUser } from '@clerk/clerk-react';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

describe('useClerkAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Unauthenticated State', () => {
    it('should return null user when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        isSignedIn: false,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      mockUseUser.mockReturnValue({
        isSignedIn: false,
        user: null,
        isLoaded: true,
      } as any);

      const { result } = renderHook(() => useClerkAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.profile).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isInitialized).toBe(true);
    });

    it('should show loading state when not loaded', () => {
      mockUseAuth.mockReturnValue({
        isSignedIn: false,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      mockUseUser.mockReturnValue({
        isSignedIn: false,
        user: null,
        isLoaded: false,
      } as any);

      const { result } = renderHook(() => useClerkAuth());

      expect(result.current.isInitializing).toBe(true);
      expect(result.current.isInitialized).toBe(false);
    });
  });

  describe('Authenticated State', () => {
    const mockClerkUser = {
      id: 'user_123',
      firstName: 'John',
      lastName: 'Doe',
      primaryEmailAddress: {
        emailAddress: 'john.doe@example.com'
      },
      primaryPhoneNumber: {
        phoneNumber: '+1234567890'
      },
      imageUrl: 'https://example.com/avatar.jpg',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02'),
    };

    it('should return user data when authenticated', () => {
      mockUseAuth.mockReturnValue({
        isSignedIn: true,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      mockUseUser.mockReturnValue({
        isSignedIn: true,
        user: mockClerkUser,
        isLoaded: true,
      } as any);

      const { result } = renderHook(() => useClerkAuth());

      expect(result.current.user).toBeTruthy();
      expect(result.current.user?.id).toBe('user_123');
      expect(result.current.user?.email).toBe('john.doe@example.com');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isInitialized).toBe(true);
    });

    it('should create compatible session object', () => {
      mockUseAuth.mockReturnValue({
        isSignedIn: true,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      mockUseUser.mockReturnValue({
        isSignedIn: true,
        user: mockClerkUser,
        isLoaded: true,
      } as any);

      const { result } = renderHook(() => useClerkAuth());

      expect(result.current.session).toBeTruthy();
      expect(result.current.session?.access_token).toBe('clerk-session-token');
      expect(result.current.session?.token_type).toBe('Bearer');
      expect(result.current.session?.user).toBeTruthy();
    });

    it('should create compatible profile object', () => {
      mockUseAuth.mockReturnValue({
        isSignedIn: true,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      mockUseUser.mockReturnValue({
        isSignedIn: true,
        user: mockClerkUser,
        isLoaded: true,
      } as any);

      const { result } = renderHook(() => useClerkAuth());

      expect(result.current.profile).toBeTruthy();
      expect(result.current.profile?.id).toBe('user_123');
      expect(result.current.profile?.nome_completo).toBe('John Doe');
      expect(result.current.profile?.email).toBe('john.doe@example.com');
      expect(result.current.profile?.telefone).toBe('+1234567890');
      expect(result.current.profile?.avatar_url).toBe('https://example.com/avatar.jpg');
    });
  });

  describe('Role Management', () => {
    it('should provide default user role', () => {
      mockUseAuth.mockReturnValue({
        isSignedIn: true,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      mockUseUser.mockReturnValue({
        isSignedIn: true,
        user: mockClerkUser,
        isLoaded: true,
      } as any);

      const { result } = renderHook(() => useClerkAuth());

      expect(result.current.roles).toHaveLength(1);
      expect(result.current.roles[0].role).toBe('user');
      expect(result.current.currentRole).toBe('user');
      expect(result.current.hasRole('user')).toBe(true);
      expect(result.current.hasRole('admin')).toBe(false);
    });

    it('should handle getCurrentRole method', () => {
      mockUseAuth.mockReturnValue({
        isSignedIn: true,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      mockUseUser.mockReturnValue({
        isSignedIn: true,
        user: mockClerkUser,
        isLoaded: true,
      } as any);

      const { result } = renderHook(() => useClerkAuth());

      expect(result.current.getCurrentRole()).toBe('user');
    });
  });

  describe('Authentication Methods', () => {
    it('should provide signOut method', async () => {
      const mockSignOut = jest.fn();
      
      mockUseAuth.mockReturnValue({
        isSignedIn: true,
        signOut: mockSignOut,
        getToken: jest.fn(),
      } as any);

      mockUseUser.mockReturnValue({
        isSignedIn: true,
        user: mockClerkUser,
        isLoaded: true,
      } as any);

      const { result } = renderHook(() => useClerkAuth());

      await result.current.signOut();
      expect(mockSignOut).toHaveBeenCalled();
    });

    it('should provide compatibility methods', () => {
      mockUseAuth.mockReturnValue({
        isSignedIn: false,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      mockUseUser.mockReturnValue({
        isSignedIn: false,
        user: null,
        isLoaded: true,
      } as any);

      const { result } = renderHook(() => useClerkAuth());

      // These methods are maintained for compatibility
      expect(typeof result.current.signIn).toBe('function');
      expect(typeof result.current.signUp).toBe('function');
      expect(typeof result.current.refreshProfile).toBe('function');
      expect(typeof result.current.refreshUserData).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.retry).toBe('function');
    });
  });

  describe('State Properties', () => {
    it('should provide all required state properties', () => {
      mockUseAuth.mockReturnValue({
        isSignedIn: true,
        signOut: jest.fn(),
        getToken: jest.fn(),
      } as any);

      mockUseUser.mockReturnValue({
        isSignedIn: true,
        user: mockClerkUser,
        isLoaded: true,
      } as any);

      const { result } = renderHook(() => useClerkAuth());

      // Check all required properties exist
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

      // Check default values
      expect(result.current.onboardingStatus).toBe('completed');
      expect(result.current.isProfileLoading).toBe(false);
      expect(result.current.isOnboardingLoading).toBe(false);
      expect(result.current.isOnboardingComplete).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.canRetry).toBe(false);
    });
  });
});