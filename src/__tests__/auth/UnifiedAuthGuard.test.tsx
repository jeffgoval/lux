/**
 * 🧪 TESTES UNITÁRIOS - UNIFIED AUTH GUARD
 * 
 * Testes para lógica de decisão determinística, prevenção de loops infinitos,
 * e redirecionamentos
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UnifiedAuthGuard } from '@/components/auth/UnifiedAuthGuard';
import { SecureAuthProvider, useSecureAuth } from '@/contexts/SecureAuthContext';
import { UserRole, Permission } from '@/types/auth.types';

// ============================================================================
// MOCKS
// ============================================================================

// Mock do contexto de autenticação
const mockAuthContext = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: true,
  isOnboardingComplete: true,
  isProfileLoading: false,
  isRolesLoading: false,
  roles: [],
  currentRole: null,
  tokens: null,
  error: null,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  refreshAuth: jest.fn(),
  refreshProfile: jest.fn(),
  clearError: jest.fn(),
  hasPermission: jest.fn(() => false),
  hasRole: jest.fn(() => false),
  hasAnyRole: jest.fn(() => false),
  getCurrentRole: jest.fn(() => null),
  isOnboardingComplete: true,
  refreshUserData: jest.fn(),
  isTokenExpired: jest.fn(() => false)
};

jest.mock('@/contexts/SecureAuthContext', () => ({
  useSecureAuth: () => mockAuthContext,
  SecureAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock do react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/dashboard', search: '', hash: '', state: null })
}));

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

const renderWithRouter = (
  component: React.ReactElement,
  initialEntries: string[] = ['/dashboard']
) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <SecureAuthProvider>
        {component}
      </SecureAuthProvider>
    </MemoryRouter>
  );
};

// ============================================================================
// TESTES DE LÓGICA DE DECISÃO
// ============================================================================

describe('UnifiedAuthGuard - Decision Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock context to default state
    Object.assign(mockAuthContext, {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
      isOnboardingComplete: true,
      error: null
    });
  });

  describe('Loading States', () => {
    it('should show loading when auth is initializing', () => {
      mockAuthContext.isInitialized = false;
      mockAuthContext.isLoading = true;

      renderWithRouter(
        <UnifiedAuthGuard>
          <TestComponent />
        </UnifiedAuthGuard>
      );

      expect(screen.getByTestId('auth-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should show loading when profile is loading', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.isProfileLoading = true;

      renderWithRouter(
        <UnifiedAuthGuard>
          <TestComponent />
        </UnifiedAuthGuard>
      );

      expect(screen.getByTestId('auth-loading')).toBeInTheDocument();
    });

    it('should show loading when onboarding is loading', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.isOnboardingLoading = true;

      renderWithRouter(
        <UnifiedAuthGuard>
          <TestComponent />
        </UnifiedAuthGuard>
      );

      expect(screen.getByTestId('auth-loading')).toBeInTheDocument();
    });

    it('should have timeout for loading states', async () => {
      mockAuthContext.isLoading = true;

      renderWithRouter(
        <UnifiedAuthGuard loadingTimeout={100}>
          <TestComponent />
        </UnifiedAuthGuard>
      );

      expect(screen.getByTestId('auth-loading')).toBeInTheDocument();

      // Wait for timeout
      await waitFor(() => {
        expect(screen.getByTestId('auth-timeout-error')).toBeInTheDocument();
      }, { timeout: 150 });
    });
  });

  describe('Error Handling', () => {
    it('should show error when auth has error', () => {
      mockAuthContext.error = 'Authentication failed';

      renderWithRouter(
        <UnifiedAuthGuard>
          <TestComponent />
        </UnifiedAuthGuard>
      );

      expect(screen.getByText('Authentication failed')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should show retry button for recoverable errors', () => {
      mockAuthContext.error = 'Network error';

      renderWithRouter(
        <UnifiedAuthGuard>
          <TestComponent />
        </UnifiedAuthGuard>
      );

      const retryButton = screen.getByTestId('retry-button');
      expect(retryButton).toBeInTheDocument();

      // Should call refreshAuth when retry is clicked
      mockAuthContext.refreshAuth = jest.fn().mockResolvedValue(true);
      retryButton.click();

      expect(mockAuthContext.refreshAuth).toHaveBeenCalled();
    });
  });

  describe('Public Routes', () => {
    it('should allow access to public routes', () => {
      renderWithRouter(
        <UnifiedAuthGuard isPublicRoute>
          <TestComponent />
        </UnifiedAuthGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should redirect authenticated users from auth pages', () => {
      mockAuthContext.isAuthenticated = true;

      renderWithRouter(
        <UnifiedAuthGuard isPublicRoute redirectAuthenticatedTo="/dashboard">
          <TestComponent />
        </UnifiedAuthGuard>,
        ['/auth']
      );

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  describe('Authentication Flow', () => {
    it('should redirect unauthenticated users to auth', () => {
      renderWithRouter(
        <UnifiedAuthGuard>
          <TestComponent />
        </UnifiedAuthGuard>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/auth', { replace: true });
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should allow access for authenticated users', () => {
      mockAuthContext.isAuthenticated = true;

      renderWithRouter(
        <UnifiedAuthGuard>
          <TestComponent />
        </UnifiedAuthGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Onboarding Flow', () => {
    it('should redirect to onboarding when user needs onboarding', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.isOnboardingComplete = false;

      renderWithRouter(
        <UnifiedAuthGuard>
          <TestComponent />
        </UnifiedAuthGuard>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/onboarding', { replace: true });
    });

    it('should allow onboarding when allowOnboarding is true', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.isOnboardingComplete = false;

      renderWithRouter(
        <UnifiedAuthGuard allowOnboarding>
          <TestComponent />
        </UnifiedAuthGuard>,
        ['/onboarding']
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Permission-based Access', () => {
    beforeEach(() => {
      mockAuthContext.isAuthenticated = true;
    });

    it('should allow access when user has required permission', () => {
      mockAuthContext.hasPermission = jest.fn((permission) => 
        permission === Permission.VIEW_CLINIC
      );

      renderWithRouter(
        <UnifiedAuthGuard requiredPermissions={[Permission.VIEW_CLINIC]}>
          <TestComponent />
        </UnifiedAuthGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(mockAuthContext.hasPermission).toHaveBeenCalledWith(Permission.VIEW_CLINIC);
    });

    it('should deny access when user lacks required permission', () => {
      mockAuthContext.hasPermission = jest.fn(() => false);

      renderWithRouter(
        <UnifiedAuthGuard requiredPermissions={[Permission.MANAGE_USERS]}>
          <TestComponent />
        </UnifiedAuthGuard>
      );

      expect(screen.getByTestId('access-denied')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should check all permissions when requireAll is true', () => {
      mockAuthContext.hasPermission = jest.fn((permission) => 
        permission === Permission.VIEW_CLINIC
      );

      renderWithRouter(
        <UnifiedAuthGuard 
          requiredPermissions={[Permission.VIEW_CLINIC, Permission.EDIT_CLINIC]}
          requireAll={true}
        >
          <TestComponent />
        </UnifiedAuthGuard>
      );

      expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    });

    it('should check any permission when requireAll is false', () => {
      mockAuthContext.hasPermission = jest.fn((permission) => 
        permission === Permission.VIEW_CLINIC
      );

      renderWithRouter(
        <UnifiedAuthGuard 
          requiredPermissions={[Permission.VIEW_CLINIC, Permission.EDIT_CLINIC]}
          requireAll={false}
        >
          <TestComponent />
        </UnifiedAuthGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('Role-based Access', () => {
    beforeEach(() => {
      mockAuthContext.isAuthenticated = true;
    });

    it('should allow access when user has required role', () => {
      mockAuthContext.hasRole = jest.fn((role) => role === UserRole.PROPRIETARIA);

      renderWithRouter(
        <UnifiedAuthGuard requiredRoles={[UserRole.PROPRIETARIA]}>
          <TestComponent />
        </UnifiedAuthGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(mockAuthContext.hasRole).toHaveBeenCalledWith(UserRole.PROPRIETARIA);
    });

    it('should deny access when user lacks required role', () => {
      mockAuthContext.hasRole = jest.fn(() => false);

      renderWithRouter(
        <UnifiedAuthGuard requiredRoles={[UserRole.PROPRIETARIA]}>
          <TestComponent />
        </UnifiedAuthGuard>
      );

      expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    });

    it('should check any role when requireAll is false', () => {
      mockAuthContext.hasAnyRole = jest.fn((roles) => 
        roles.includes(UserRole.PROPRIETARIA)
      );

      renderWithRouter(
        <UnifiedAuthGuard 
          requiredRoles={[UserRole.PROPRIETARIA, UserRole.GERENTE]}
          requireAll={false}
        >
          <TestComponent />
        </UnifiedAuthGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(mockAuthContext.hasAnyRole).toHaveBeenCalledWith([UserRole.PROPRIETARIA, UserRole.GERENTE]);
    });
  });
});

// ============================================================================
// TESTES DE PREVENÇÃO DE LOOPS
// ============================================================================

describe('UnifiedAuthGuard - Loop Prevention', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(mockAuthContext, {
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
      error: null
    });
  });

  it('should track redirect attempts', () => {
    const { rerender } = renderWithRouter(
      <UnifiedAuthGuard>
        <TestComponent />
      </UnifiedAuthGuard>
    );

    expect(mockNavigate).toHaveBeenCalledTimes(1);

    // Re-render should not cause multiple redirects
    rerender(
      <UnifiedAuthGuard>
        <TestComponent />
      </UnifiedAuthGuard>
    );

    // Should not redirect again
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('should prevent excessive redirects', () => {
    // Simulate being on auth page
    renderWithRouter(
      <UnifiedAuthGuard>
        <TestComponent />
      </UnifiedAuthGuard>,
      ['/auth']
    );

    // Should not redirect when already on auth page
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should prevent redirect loops between onboarding and protected routes', () => {
    mockAuthContext.isAuthenticated = true;
    mockAuthContext.isOnboardingComplete = false;

    // Simulate being on onboarding page
    renderWithRouter(
      <UnifiedAuthGuard allowOnboarding>
        <TestComponent />
      </UnifiedAuthGuard>,
      ['/onboarding']
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

// ============================================================================
// TESTES DE PERFORMANCE
// ============================================================================

describe('UnifiedAuthGuard - Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(mockAuthContext, {
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      isOnboardingComplete: true,
      error: null,
      loginAttempts: 0
    });
  });

  it('should not re-render unnecessarily', () => {
    const renderSpy = jest.fn();
    const TestComponentWithSpy = () => {
      renderSpy();
      return <div data-testid="protected-content">Protected Content</div>;
    };

    const { rerender } = renderWithRouter(
      <UnifiedAuthGuard>
        <TestComponentWithSpy />
      </UnifiedAuthGuard>
    );

    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Re-render with same props should not cause child re-render
    rerender(
      <UnifiedAuthGuard>
        <TestComponentWithSpy />
      </UnifiedAuthGuard>
    );

    // Should not cause additional renders
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  it('should memoize permission checks', () => {
    mockAuthContext.hasPermission = jest.fn(() => true);

    renderWithRouter(
      <UnifiedAuthGuard requiredPermissions={[Permission.VIEW_CLINIC]}>
        <TestComponent />
      </UnifiedAuthGuard>
    );

    expect(mockAuthContext.hasPermission).toHaveBeenCalledTimes(1);

    // Re-render should use memoized result
    const { rerender } = renderWithRouter(
      <UnifiedAuthGuard requiredPermissions={[Permission.VIEW_CLINIC]}>
        <TestComponent />
      </UnifiedAuthGuard>
    );

    // Should not call permission check again
    expect(mockAuthContext.hasPermission).toHaveBeenCalledTimes(1);
  });
});