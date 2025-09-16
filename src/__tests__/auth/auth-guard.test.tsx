/**
 * 🧪 TESTES UNITÁRIOS - AUTH GUARD LOGIC
 * 
 * Testes para lógica de decisão determinística e prevenção de loops
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserRole, Permission } from '@/types/auth.types';

// ============================================================================
// MOCK AUTH DECISION ENGINE
// ============================================================================

interface AuthDecision {
  action: 'ALLOW' | 'REDIRECT' | 'LOADING' | 'ERROR';
  to?: string;
  reason: string;
  canRetry?: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  isOnboardingComplete: boolean;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  error: string | null;
}

class AuthDecisionEngine {
  makeDecision(
    authState: AuthState,
    currentPath: string,
    options: {
      isPublicRoute?: boolean;
      allowOnboarding?: boolean;
      requiredPermissions?: Permission[];
      requiredRoles?: UserRole[];
      requireAll?: boolean;
    } = {}
  ): AuthDecision {
    const {
      isPublicRoute = false,
      allowOnboarding = false,
      requiredPermissions = [],
      requiredRoles = [],
      requireAll = false
    } = options;

    // 1. Loading states
    if (!authState.isInitialized || authState.isLoading) {
      return { action: 'LOADING', reason: 'Auth initializing' };
    }

    // 2. Error states
    if (authState.error) {
      const canRetry = !authState.error.includes('Invalid credentials');
      return { action: 'ERROR', reason: authState.error, canRetry };
    }

    // 3. Public routes
    if (isPublicRoute) {
      if (authState.isAuthenticated && currentPath.startsWith('/auth')) {
        return { action: 'REDIRECT', to: '/dashboard', reason: 'Authenticated user on auth page' };
      }
      return { action: 'ALLOW', reason: 'Public route' };
    }

    // 4. Authentication check
    if (!authState.isAuthenticated) {
      if (currentPath.startsWith('/auth')) {
        return { action: 'ALLOW', reason: 'Already on auth page' };
      }
      return { action: 'REDIRECT', to: '/auth', reason: 'Not authenticated' };
    }

    // 5. Onboarding check
    if (!authState.isOnboardingComplete) {
      if (allowOnboarding || currentPath.startsWith('/onboarding')) {
        return { action: 'ALLOW', reason: 'Onboarding allowed' };
      }
      return { action: 'REDIRECT', to: '/onboarding', reason: 'Onboarding required' };
    }

    // 6. Permission checks
    if (requiredPermissions.length > 0) {
      const hasPermissions = requireAll
        ? requiredPermissions.every(p => authState.hasPermission(p))
        : requiredPermissions.some(p => authState.hasPermission(p));

      if (!hasPermissions) {
        return { action: 'ERROR', reason: 'Insufficient permissions', canRetry: false };
      }
    }

    // 7. Role checks
    if (requiredRoles.length > 0) {
      const hasRoles = requireAll
        ? requiredRoles.every(r => authState.hasRole(r))
        : authState.hasAnyRole(requiredRoles);

      if (!hasRoles) {
        return { action: 'ERROR', reason: 'Insufficient role permissions', canRetry: false };
      }
    }

    return { action: 'ALLOW', reason: 'All checks passed' };
  }
}

// ============================================================================
// TESTES DA LÓGICA DE DECISÃO
// ============================================================================

describe('Auth Decision Engine', () => {
  let engine: AuthDecisionEngine;
  let mockAuthState: AuthState;

  beforeEach(() => {
    engine = new AuthDecisionEngine();
    mockAuthState = {
      isAuthenticated: false,
      isLoading: false,
      isInitialized: true,
      isOnboardingComplete: true,
      hasPermission: jest.fn(() => false),
      hasRole: jest.fn(() => false),
      hasAnyRole: jest.fn(() => false),
      error: null
    };
  });

  describe('Loading States', () => {
    it('should return LOADING when not initialized', () => {
      mockAuthState.isInitialized = false;

      const decision = engine.makeDecision(mockAuthState, '/dashboard');

      expect(decision.action).toBe('LOADING');
      expect(decision.reason).toBe('Auth initializing');
    });

    it('should return LOADING when auth is loading', () => {
      mockAuthState.isLoading = true;

      const decision = engine.makeDecision(mockAuthState, '/dashboard');

      expect(decision.action).toBe('LOADING');
      expect(decision.reason).toBe('Auth initializing');
    });
  });

  describe('Error States', () => {
    it('should return ERROR when auth has error', () => {
      mockAuthState.error = 'Network error';

      const decision = engine.makeDecision(mockAuthState, '/dashboard');

      expect(decision.action).toBe('ERROR');
      expect(decision.reason).toBe('Network error');
      expect(decision.canRetry).toBe(true);
    });

    it('should not allow retry for credential errors', () => {
      mockAuthState.error = 'Invalid credentials';

      const decision = engine.makeDecision(mockAuthState, '/dashboard');

      expect(decision.action).toBe('ERROR');
      expect(decision.canRetry).toBe(false);
    });
  });

  describe('Public Routes', () => {
    it('should allow access to public routes', () => {
      const decision = engine.makeDecision(mockAuthState, '/public', {
        isPublicRoute: true
      });

      expect(decision.action).toBe('ALLOW');
      expect(decision.reason).toBe('Public route');
    });

    it('should redirect authenticated users from auth pages', () => {
      mockAuthState.isAuthenticated = true;

      const decision = engine.makeDecision(mockAuthState, '/auth/login', {
        isPublicRoute: true
      });

      expect(decision.action).toBe('REDIRECT');
      expect(decision.to).toBe('/dashboard');
      expect(decision.reason).toBe('Authenticated user on auth page');
    });
  });

  describe('Authentication Flow', () => {
    it('should redirect unauthenticated users to auth', () => {
      const decision = engine.makeDecision(mockAuthState, '/dashboard');

      expect(decision.action).toBe('REDIRECT');
      expect(decision.to).toBe('/auth');
      expect(decision.reason).toBe('Not authenticated');
    });

    it('should allow access when already on auth page', () => {
      const decision = engine.makeDecision(mockAuthState, '/auth/login');

      expect(decision.action).toBe('ALLOW');
      expect(decision.reason).toBe('Already on auth page');
    });

    it('should allow access for authenticated users', () => {
      mockAuthState.isAuthenticated = true;

      const decision = engine.makeDecision(mockAuthState, '/dashboard');

      expect(decision.action).toBe('ALLOW');
      expect(decision.reason).toBe('All checks passed');
    });
  });

  describe('Onboarding Flow', () => {
    beforeEach(() => {
      mockAuthState.isAuthenticated = true;
      mockAuthState.isOnboardingComplete = false;
    });

    it('should redirect to onboarding when required', () => {
      const decision = engine.makeDecision(mockAuthState, '/dashboard');

      expect(decision.action).toBe('REDIRECT');
      expect(decision.to).toBe('/onboarding');
      expect(decision.reason).toBe('Onboarding required');
    });

    it('should allow access to onboarding page', () => {
      const decision = engine.makeDecision(mockAuthState, '/onboarding', {
        allowOnboarding: true
      });

      expect(decision.action).toBe('ALLOW');
      expect(decision.reason).toBe('Onboarding allowed');
    });

    it('should allow access when on onboarding path', () => {
      const decision = engine.makeDecision(mockAuthState, '/onboarding/step-1');

      expect(decision.action).toBe('ALLOW');
      expect(decision.reason).toBe('Onboarding allowed');
    });
  });

  describe('Permission-based Access', () => {
    beforeEach(() => {
      mockAuthState.isAuthenticated = true;
    });

    it('should allow access when user has required permission', () => {
      mockAuthState.hasPermission = jest.fn((permission) => 
        permission === Permission.VIEW_CLINIC
      );

      const decision = engine.makeDecision(mockAuthState, '/dashboard', {
        requiredPermissions: [Permission.VIEW_CLINIC]
      });

      expect(decision.action).toBe('ALLOW');
      expect(mockAuthState.hasPermission).toHaveBeenCalledWith(Permission.VIEW_CLINIC);
    });

    it('should deny access when user lacks required permission', () => {
      mockAuthState.hasPermission = jest.fn(() => false);

      const decision = engine.makeDecision(mockAuthState, '/admin', {
        requiredPermissions: [Permission.MANAGE_USERS]
      });

      expect(decision.action).toBe('ERROR');
      expect(decision.reason).toBe('Insufficient permissions');
      expect(decision.canRetry).toBe(false);
    });

    it('should check all permissions when requireAll is true', () => {
      mockAuthState.hasPermission = jest.fn((permission) => 
        permission === Permission.VIEW_CLINIC
      );

      const decision = engine.makeDecision(mockAuthState, '/admin', {
        requiredPermissions: [Permission.VIEW_CLINIC, Permission.EDIT_CLINIC],
        requireAll: true
      });

      expect(decision.action).toBe('ERROR');
      expect(decision.reason).toBe('Insufficient permissions');
    });

    it('should check any permission when requireAll is false', () => {
      mockAuthState.hasPermission = jest.fn((permission) => 
        permission === Permission.VIEW_CLINIC
      );

      const decision = engine.makeDecision(mockAuthState, '/dashboard', {
        requiredPermissions: [Permission.VIEW_CLINIC, Permission.EDIT_CLINIC],
        requireAll: false
      });

      expect(decision.action).toBe('ALLOW');
    });
  });

  describe('Role-based Access', () => {
    beforeEach(() => {
      mockAuthState.isAuthenticated = true;
    });

    it('should allow access when user has required role', () => {
      mockAuthState.hasRole = jest.fn((role) => role === UserRole.PROPRIETARIA);

      const decision = engine.makeDecision(mockAuthState, '/admin', {
        requiredRoles: [UserRole.PROPRIETARIA]
      });

      expect(decision.action).toBe('ALLOW');
      expect(mockAuthState.hasRole).toHaveBeenCalledWith(UserRole.PROPRIETARIA);
    });

    it('should deny access when user lacks required role', () => {
      mockAuthState.hasRole = jest.fn(() => false);

      const decision = engine.makeDecision(mockAuthState, '/admin', {
        requiredRoles: [UserRole.PROPRIETARIA]
      });

      expect(decision.action).toBe('ERROR');
      expect(decision.reason).toBe('Insufficient role permissions');
    });

    it('should check any role when requireAll is false', () => {
      mockAuthState.hasAnyRole = jest.fn((roles) => 
        roles.includes(UserRole.PROPRIETARIA)
      );

      const decision = engine.makeDecision(mockAuthState, '/dashboard', {
        requiredRoles: [UserRole.PROPRIETARIA, UserRole.GERENTE],
        requireAll: false
      });

      expect(decision.action).toBe('ALLOW');
      expect(mockAuthState.hasAnyRole).toHaveBeenCalledWith([UserRole.PROPRIETARIA, UserRole.GERENTE]);
    });

    it('should check all roles when requireAll is true', () => {
      mockAuthState.hasRole = jest.fn((role) => role === UserRole.PROPRIETARIA);

      const decision = engine.makeDecision(mockAuthState, '/super-admin', {
        requiredRoles: [UserRole.PROPRIETARIA, UserRole.SUPER_ADMIN],
        requireAll: true
      });

      expect(decision.action).toBe('ERROR');
      expect(decision.reason).toBe('Insufficient role permissions');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple requirements correctly', () => {
      mockAuthState.isAuthenticated = true;
      mockAuthState.hasPermission = jest.fn((permission) => 
        permission === Permission.VIEW_CLINIC
      );
      mockAuthState.hasRole = jest.fn((role) => role === UserRole.PROPRIETARIA);

      const decision = engine.makeDecision(mockAuthState, '/admin', {
        requiredPermissions: [Permission.VIEW_CLINIC],
        requiredRoles: [UserRole.PROPRIETARIA],
        requireAll: true
      });

      expect(decision.action).toBe('ALLOW');
    });

    it('should fail when any requirement is not met', () => {
      mockAuthState.isAuthenticated = true;
      mockAuthState.hasPermission = jest.fn(() => false); // No permissions
      mockAuthState.hasRole = jest.fn((role) => role === UserRole.PROPRIETARIA);

      const decision = engine.makeDecision(mockAuthState, '/admin', {
        requiredPermissions: [Permission.MANAGE_USERS],
        requiredRoles: [UserRole.PROPRIETARIA]
      });

      expect(decision.action).toBe('ERROR');
      expect(decision.reason).toBe('Insufficient permissions');
    });

    it('should prioritize authentication over permissions', () => {
      mockAuthState.isAuthenticated = false;

      const decision = engine.makeDecision(mockAuthState, '/admin', {
        requiredPermissions: [Permission.MANAGE_USERS],
        requiredRoles: [UserRole.PROPRIETARIA]
      });

      expect(decision.action).toBe('REDIRECT');
      expect(decision.to).toBe('/auth');
      expect(decision.reason).toBe('Not authenticated');
    });

    it('should prioritize onboarding over permissions', () => {
      mockAuthState.isAuthenticated = true;
      mockAuthState.isOnboardingComplete = false;

      const decision = engine.makeDecision(mockAuthState, '/admin', {
        requiredPermissions: [Permission.MANAGE_USERS]
      });

      expect(decision.action).toBe('REDIRECT');
      expect(decision.to).toBe('/onboarding');
      expect(decision.reason).toBe('Onboarding required');
    });
  });
});

// ============================================================================
// TESTES DE PREVENÇÃO DE LOOPS
// ============================================================================

describe('Redirect Loop Prevention', () => {
  class RedirectTracker {
    private attempts = new Map<string, { count: number; lastAttempt: number }>();
    private readonly MAX_ATTEMPTS = 3;
    private readonly TTL = 5000;

    canRedirect(to: string): boolean {
      const now = Date.now();
      const existing = this.attempts.get(to);

      if (!existing) {
        this.attempts.set(to, { count: 1, lastAttempt: now });
        return true;
      }

      if (now - existing.lastAttempt > this.TTL) {
        this.attempts.set(to, { count: 1, lastAttempt: now });
        return true;
      }

      if (existing.count >= this.MAX_ATTEMPTS) {
        return false;
      }

      this.attempts.set(to, { count: existing.count + 1, lastAttempt: now });
      return true;
    }

    reset(): void {
      this.attempts.clear();
    }

    getAttempts(to: string): number {
      return this.attempts.get(to)?.count || 0;
    }
  }

  let tracker: RedirectTracker;

  beforeEach(() => {
    tracker = new RedirectTracker();
  });

  it('should allow first redirect attempt', () => {
    expect(tracker.canRedirect('/auth')).toBe(true);
    expect(tracker.getAttempts('/auth')).toBe(1);
  });

  it('should allow multiple redirects within limit', () => {
    expect(tracker.canRedirect('/auth')).toBe(true);
    expect(tracker.canRedirect('/auth')).toBe(true);
    expect(tracker.canRedirect('/auth')).toBe(true);
    expect(tracker.getAttempts('/auth')).toBe(3);
  });

  it('should prevent redirects after limit exceeded', () => {
    // Exceed limit
    tracker.canRedirect('/auth');
    tracker.canRedirect('/auth');
    tracker.canRedirect('/auth');
    
    expect(tracker.canRedirect('/auth')).toBe(false);
  });

  it('should reset attempts after TTL', async () => {
    // Mock Date.now to control time
    const originalNow = Date.now;
    let mockTime = 1000;
    Date.now = jest.fn(() => mockTime);

    // Exceed limit
    tracker.canRedirect('/auth');
    tracker.canRedirect('/auth');
    tracker.canRedirect('/auth');
    expect(tracker.canRedirect('/auth')).toBe(false);

    // Advance time beyond TTL
    mockTime += 6000; // 6 seconds

    // Should allow redirect again
    expect(tracker.canRedirect('/auth')).toBe(true);

    // Restore original Date.now
    Date.now = originalNow;
  });

  it('should track different routes separately', () => {
    tracker.canRedirect('/auth');
    tracker.canRedirect('/auth');
    tracker.canRedirect('/auth');

    // Different route should still be allowed
    expect(tracker.canRedirect('/dashboard')).toBe(true);
    expect(tracker.canRedirect('/auth')).toBe(false);
  });

  it('should reset all attempts when requested', () => {
    tracker.canRedirect('/auth');
    tracker.canRedirect('/dashboard');
    
    expect(tracker.getAttempts('/auth')).toBe(1);
    expect(tracker.getAttempts('/dashboard')).toBe(1);

    tracker.reset();

    expect(tracker.getAttempts('/auth')).toBe(0);
    expect(tracker.getAttempts('/dashboard')).toBe(0);
  });
});

// ============================================================================
// TESTES DE PERFORMANCE
// ============================================================================

describe('Auth Guard Performance', () => {
  let engine: AuthDecisionEngine;
  let mockAuthState: AuthState;

  beforeEach(() => {
    engine = new AuthDecisionEngine();
    mockAuthState = {
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      isOnboardingComplete: true,
      hasPermission: jest.fn(() => true),
      hasRole: jest.fn(() => true),
      hasAnyRole: jest.fn(() => true),
      error: null
    };
  });

  it('should make decisions quickly for simple cases', () => {
    const start = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      engine.makeDecision(mockAuthState, '/dashboard');
    }
    
    const end = performance.now();
    const duration = end - start;
    
    // Should complete 1000 decisions in less than 10ms
    expect(duration).toBeLessThan(10);
  });

  it('should not call permission checks unnecessarily', () => {
    engine.makeDecision(mockAuthState, '/dashboard');
    
    expect(mockAuthState.hasPermission).not.toHaveBeenCalled();
    expect(mockAuthState.hasRole).not.toHaveBeenCalled();
  });

  it('should minimize permission checks', () => {
    engine.makeDecision(mockAuthState, '/admin', {
      requiredPermissions: [Permission.VIEW_CLINIC, Permission.EDIT_CLINIC],
      requireAll: false
    });
    
    // Should stop checking after first permission passes
    expect(mockAuthState.hasPermission).toHaveBeenCalledTimes(1);
  });

  it('should handle complex scenarios efficiently', () => {
    const start = performance.now();
    
    for (let i = 0; i < 100; i++) {
      engine.makeDecision(mockAuthState, '/complex', {
        requiredPermissions: [Permission.VIEW_CLINIC, Permission.EDIT_CLINIC, Permission.MANAGE_USERS],
        requiredRoles: [UserRole.PROPRIETARIA, UserRole.GERENTE],
        requireAll: true
      });
    }
    
    const end = performance.now();
    const duration = end - start;
    
    // Should complete 100 complex decisions in less than 5ms
    expect(duration).toBeLessThan(5);
  });
});