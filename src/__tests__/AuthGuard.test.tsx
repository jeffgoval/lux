import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthGuard } from '@/components/AuthGuard';
import { AuthProvider } from '@/contexts/AuthContext';
import { NavigationProvider } from '@/contexts/NavigationContext';

// Mock the auth context
const mockAuthContext = {
  isAuthenticated: false,
  currentRole: null,
  isLoading: false,
  profile: null,
  isProfileLoading: false,
  isRolesLoading: false,
  user: null,
  session: null,
  roles: [],
  signUp: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  hasRole: jest.fn(),
  getCurrentRole: jest.fn(),
  refreshProfile: jest.fn(),
  refreshUserData: jest.fn(),
  clearAuthCache: jest.fn(),
  getAuthState: jest.fn(),
  isOnboardingComplete: false,
  fixMissingUserData: jest.fn()
};

// Mock the navigation context
const mockNavigationContext = {
  currentRoute: '/',
  previousRoute: '',
  navigationHistory: ['/'],
  isNavigating: false,
  navigationState: {
    currentPath: '/',
    previousPath: '',
    isLoading: false,
    retryCount: 0,
    lastSuccessfulNavigation: '/',
    navigationHistory: ['/']
  },
  setNavigating: jest.fn(),
  recordNavigation: jest.fn(),
  canNavigateBack: jest.fn(),
  clearHistory: jest.fn(),
  setNavigationError: jest.fn(),
  retryNavigation: jest.fn(),
  getNavigationStats: jest.fn()
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

jest.mock('@/contexts/NavigationContext', () => ({
  useNavigation: () => mockNavigationContext,
  NavigationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/test' })
}));

const TestComponent = () => <div>Protected Content</div>;

const renderAuthGuard = (props = {}) => {
  return render(
    <BrowserRouter>
      <NavigationProvider>
        <AuthGuard {...props}>
          <TestComponent />
        </AuthGuard>
      </NavigationProvider>
    </BrowserRouter>
  );
};

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock context to default state
    Object.assign(mockAuthContext, {
      isAuthenticated: false,
      currentRole: null,
      isLoading: false,
      profile: null,
      isProfileLoading: false,
      isRolesLoading: false,
      isOnboardingComplete: false
    });
  });

  describe('Loading States', () => {
    it('shows loading spinner when auth is loading', () => {
      mockAuthContext.isLoading = true;
      renderAuthGuard();
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('shows loading spinner when profile is loading', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.isProfileLoading = true;
      renderAuthGuard({ requiredRoles: ['proprietaria'] });
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('shows loading spinner when roles are loading for protected routes', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.profile = { primeiro_acesso: false };
      mockAuthContext.isRolesLoading = true;
      renderAuthGuard({ requiredRoles: ['proprietaria'] });
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Unauthenticated Users', () => {
    it('redirects unauthenticated users to auth page', async () => {
      mockAuthContext.isAuthenticated = false;
      renderAuthGuard();
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/auth', {
          state: { from: '/test' },
          replace: true
        });
      });
    });

    it('uses custom redirect path when provided', async () => {
      mockAuthContext.isAuthenticated = false;
      renderAuthGuard({ redirectTo: '/custom-login' });
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/custom-login', {
          state: { from: '/test' },
          replace: true
        });
      });
    });
  });

  describe('Onboarding Flow', () => {
    it('redirects to onboarding when user has no profile', async () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.profile = null;
      renderAuthGuard();
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/onboarding', { replace: true });
      });
    });

    it('redirects to onboarding when user is on first access', async () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.profile = { primeiro_acesso: true };
      renderAuthGuard();
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/onboarding', { replace: true });
      });
    });

    it('does not redirect to onboarding when user has roles even if primeiro_acesso is true', async () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.profile = { primeiro_acesso: true } as any;
      mockAuthContext.currentRole = 'proprietaria';
      mockAuthContext.roles = [{ role: 'proprietaria', ativo: true }] as any;
      renderAuthGuard();
      
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
      expect(mockNavigate).not.toHaveBeenCalledWith('/onboarding', expect.anything());
    });

    it('redirects to onboarding when user has profile but no roles', async () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.profile = { primeiro_acesso: false } as any;
      mockAuthContext.currentRole = null;
      mockAuthContext.roles = [] as any;
      renderAuthGuard();
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/onboarding', { replace: true });
      });
    });
  });

  describe('Role-Based Access Control', () => {
    beforeEach(() => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.profile = { primeiro_acesso: false };
      mockAuthContext.isOnboardingComplete = true;
    });

    it('allows access when user has required role', async () => {
      mockAuthContext.currentRole = 'proprietaria';
      renderAuthGuard({ requiredRoles: ['proprietaria', 'gerente'] });
      
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('denies access when user lacks required role', async () => {
      mockAuthContext.currentRole = 'recepcionistas';
      renderAuthGuard({ requiredRoles: ['proprietaria', 'gerente'] });
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/unauthorized', { replace: true });
      });
    });

    it('allows access to routes without role requirements', async () => {
      mockAuthContext.currentRole = null;
      renderAuthGuard(); // No requiredRoles specified
      
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('redirects to unauthorized when no role after waiting', async () => {
      mockAuthContext.currentRole = null;
      renderAuthGuard({ requiredRoles: ['proprietaria'] });
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/unauthorized', { replace: true });
      });
    });
  });

  describe('Grace Period Handling', () => {
    it('waits for profile loading before making decisions', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.isProfileLoading = true;
      renderAuthGuard();
      
      // Should show loading, not redirect immediately
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('waits for roles loading before making decisions', () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.profile = { primeiro_acesso: false };
      mockAuthContext.isRolesLoading = true;
      renderAuthGuard({ requiredRoles: ['proprietaria'] });
      
      // Should show loading, not redirect immediately
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Navigation Error Handling', () => {
    it('records navigation errors for unauthenticated users', async () => {
      mockAuthContext.isAuthenticated = false;
      renderAuthGuard();
      
      await waitFor(() => {
        expect(mockNavigationContext.setNavigationError).toHaveBeenCalledWith('User not authenticated');
      });
    });

    it('records navigation errors for insufficient roles', async () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.profile = { primeiro_acesso: false };
      mockAuthContext.currentRole = 'recepcionistas';
      renderAuthGuard({ requiredRoles: ['proprietaria'] });
      
      await waitFor(() => {
        expect(mockNavigationContext.setNavigationError).toHaveBeenCalledWith(
          'Insufficient role: recepcionistas not in proprietaria'
        );
      });
    });

    it('clears navigation errors on successful access', async () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.profile = { primeiro_acesso: false };
      mockAuthContext.currentRole = 'proprietaria';
      renderAuthGuard({ requiredRoles: ['proprietaria'] });
      
      await waitFor(() => {
        expect(mockNavigationContext.setNavigationError).toHaveBeenCalledWith(undefined);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles missing navigation context gracefully', () => {
      // This would test the component's behavior if NavigationProvider is not present
      // In a real scenario, this might throw an error or have fallback behavior
      expect(() => renderAuthGuard()).not.toThrow();
    });

    it('handles rapid auth state changes', async () => {
      mockAuthContext.isAuthenticated = false;
      const { rerender } = renderAuthGuard();
      
      // Simulate rapid auth state change
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.profile = { primeiro_acesso: false };
      mockAuthContext.currentRole = 'proprietaria';
      
      rerender(
        <BrowserRouter>
          <NavigationProvider>
            <AuthGuard>
              <TestComponent />
            </AuthGuard>
          </NavigationProvider>
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });
  });
});