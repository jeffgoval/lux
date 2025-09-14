/**
 * 🔒 TESTES DE SEGURANÇA - SISTEMA DE AUTENTICAÇÃO
 * 
 * Testes abrangentes para validar a segurança do sistema de autenticação
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthService } from '@/services/auth.service';
import { AuthorizationService } from '@/services/authorization.service';
import { SecureLoginForm } from '@/components/auth/SecureLoginForm';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { UserRole, Permission } from '@/types/auth.types';
import { AUTH_CONFIG } from '@/config/auth.config';

// ============================================================================
// MOCKS E SETUP
// ============================================================================

// Mock do serviço de autenticação
vi.mock('@/services/auth.service');
const mockAuthService = vi.mocked(AuthService);

// Mock do contexto de autenticação
const mockAuthContext = {
  isAuthenticated: false,
  user: null,
  currentClinic: null,
  availableClinics: [],
  login: vi.fn(),
  logout: vi.fn(),
  hasPermission: vi.fn(),
  hasRole: vi.fn(),
  isLoading: false,
  error: null,
  clearError: vi.fn()
};

vi.mock('@/contexts/SecureAuthContext', () => ({
  useSecureAuth: () => mockAuthContext
}));

// ============================================================================
// TESTES DE VALIDAÇÃO DE INPUT
// ============================================================================

describe('Input Validation Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject SQL injection attempts in email field', async () => {
    const maliciousEmails = [
      "admin'; DROP TABLE users; --",
      "test@test.com'; DELETE FROM users WHERE '1'='1",
      "' OR '1'='1' --",
      "admin'/**/UNION/**/SELECT/**/password/**/FROM/**/users--"
    ];

    for (const email of maliciousEmails) {
      const result = await AuthService.prototype.login({
        email,
        password: 'validPassword123!'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email inválido');
    }
  });

  it('should reject XSS attempts in input fields', async () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(1)">',
      '"><script>alert(String.fromCharCode(88,83,83))</script>'
    ];

    for (const payload of xssPayloads) {
      const result = await AuthService.prototype.login({
        email: payload,
        password: 'validPassword123!'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email inválido');
    }
  });

  it('should enforce password complexity requirements', async () => {
    const weakPasswords = [
      '123456',           // Muito simples
      'password',         // Sem números/símbolos
      'PASSWORD',         // Sem minúsculas
      'password123',      // Sem maiúsculas/símbolos
      'Password',         // Sem números/símbolos
      'Pass1',           // Muito curto
      ''                 // Vazio
    ];

    for (const password of weakPasswords) {
      const result = await AuthService.prototype.login({
        email: 'test@test.com',
        password
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/senha/i);
    }
  });

  it('should accept strong passwords', async () => {
    const strongPasswords = [
      'MyStr0ng!Pass',
      'C0mpl3x@P4ssw0rd',
      'S3cur3#P4ssw0rd!',
      'V3ry$tr0ng&P4ss'
    ];

    mockAuthService.prototype.login.mockResolvedValue({
      success: true,
      user: { id: '1', email: 'test@test.com', name: 'Test User' } as any,
      tokens: { accessToken: 'token', refreshToken: 'refresh', expiresAt: new Date() } as any
    });

    for (const password of strongPasswords) {
      const result = await AuthService.prototype.login({
        email: 'test@test.com',
        password
      });

      // Não deve falhar por validação de senha
      expect(result.error).not.toMatch(/senha/i);
    }
  });
});

// ============================================================================
// TESTES DE RATE LIMITING
// ============================================================================

describe('Rate Limiting Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should implement login rate limiting', async () => {
    const credentials = {
      email: 'test@test.com',
      password: 'wrongPassword'
    };

    // Simular falhas de login
    mockAuthService.prototype.login.mockResolvedValue({
      success: false,
      error: 'Credenciais inválidas'
    });

    // Fazer múltiplas tentativas
    for (let i = 0; i < AUTH_CONFIG.PASSWORD.MAX_LOGIN_ATTEMPTS; i++) {
      await AuthService.prototype.login(credentials);
    }

    // Próxima tentativa deve ser bloqueada
    const result = await AuthService.prototype.login(credentials);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/bloqueada|lockout/i);
  });

  it('should reset rate limiting after successful login', async () => {
    const credentials = {
      email: 'test@test.com',
      password: 'correctPassword123!'
    };

    // Simular algumas falhas
    mockAuthService.prototype.login
      .mockResolvedValueOnce({ success: false, error: 'Credenciais inválidas' })
      .mockResolvedValueOnce({ success: false, error: 'Credenciais inválidas' })
      .mockResolvedValueOnce({
        success: true,
        user: { id: '1', email: 'test@test.com', name: 'Test User' } as any,
        tokens: { accessToken: 'token', refreshToken: 'refresh', expiresAt: new Date() } as any
      });

    // Fazer tentativas falhadas
    await AuthService.prototype.login(credentials);
    await AuthService.prototype.login(credentials);

    // Login bem-sucedido deve resetar contador
    const result = await AuthService.prototype.login(credentials);
    expect(result.success).toBe(true);

    // Verificar se contador foi resetado
    expect(localStorage.getItem('login_attempts')).toBeNull();
  });
});

// ============================================================================
// TESTES DE AUTORIZAÇÃO
// ============================================================================

describe('Authorization Security', () => {
  const mockUserClinicAccess = {
    clinic: { id: 'clinic1', name: 'Test Clinic' },
    role: UserRole.PROFESSIONAL,
    permissions: [Permission.VIEW_MEDICAL_RECORD, Permission.CREATE_MEDICAL_RECORD],
    active: true,
    expiresAt: null
  } as any;

  it('should deny access without proper permissions', () => {
    const hasAccess = AuthorizationService.hasPermissionInClinic(
      mockUserClinicAccess,
      Permission.MANAGE_FINANCIAL
    );

    expect(hasAccess).toBe(false);
  });

  it('should allow access with proper permissions', () => {
    const hasAccess = AuthorizationService.hasPermissionInClinic(
      mockUserClinicAccess,
      Permission.VIEW_MEDICAL_RECORD
    );

    expect(hasAccess).toBe(true);
  });

  it('should deny access to expired associations', () => {
    const expiredAccess = {
      ...mockUserClinicAccess,
      expiresAt: new Date(Date.now() - 1000) // Expirado há 1 segundo
    };

    const hasAccess = AuthorizationService.hasPermissionInClinic(
      expiredAccess,
      Permission.VIEW_MEDICAL_RECORD
    );

    expect(hasAccess).toBe(false);
  });

  it('should deny access to inactive associations', () => {
    const inactiveAccess = {
      ...mockUserClinicAccess,
      active: false
    };

    const hasAccess = AuthorizationService.hasPermissionInClinic(
      inactiveAccess,
      Permission.VIEW_MEDICAL_RECORD
    );

    expect(hasAccess).toBe(false);
  });

  it('should enforce role hierarchy', () => {
    const canManage = AuthorizationService.canManageUser(
      { ...mockUserClinicAccess, role: UserRole.CLINIC_MANAGER },
      { ...mockUserClinicAccess, role: UserRole.PROFESSIONAL }
    );

    expect(canManage).toBe(true);

    const cannotManage = AuthorizationService.canManageUser(
      { ...mockUserClinicAccess, role: UserRole.PROFESSIONAL },
      { ...mockUserClinicAccess, role: UserRole.CLINIC_MANAGER }
    );

    expect(cannotManage).toBe(false);
  });
});

// ============================================================================
// TESTES DE ISOLAMENTO MULTI-TENANT
// ============================================================================

describe('Multi-tenant Isolation', () => {
  it('should prevent cross-tenant data access', () => {
    const userClinic1 = {
      clinic: { id: 'clinic1', name: 'Clinic 1' },
      role: UserRole.CLINIC_OWNER,
      permissions: [Permission.VIEW_CLINIC],
      active: true
    } as any;

    const validation = AuthorizationService.validateTenantOperation(
      userClinic1,
      'clinic2', // Tentando acessar clínica diferente
      Permission.VIEW_CLINIC
    );

    expect(validation.allowed).toBe(false);
    expect(validation.reason).toContain('clínica diferente');
  });

  it('should allow same-tenant operations', () => {
    const userClinic1 = {
      clinic: { id: 'clinic1', name: 'Clinic 1' },
      role: UserRole.CLINIC_OWNER,
      permissions: [Permission.VIEW_CLINIC],
      active: true
    } as any;

    const validation = AuthorizationService.validateTenantOperation(
      userClinic1,
      'clinic1', // Mesma clínica
      Permission.VIEW_CLINIC
    );

    expect(validation.allowed).toBe(true);
  });
});

// ============================================================================
// TESTES DE COMPONENTES DE SEGURANÇA
// ============================================================================

describe('Security Components', () => {
  it('should hide content without permissions', () => {
    mockAuthContext.currentClinic = {
      clinic: { id: 'clinic1', name: 'Test Clinic' },
      role: UserRole.RECEPTIONIST,
      permissions: [Permission.VIEW_USERS],
      active: true
    } as any;

    render(
      <PermissionGate requiredPermissions={[Permission.MANAGE_FINANCIAL]}>
        <div data-testid="protected-content">Financial Data</div>
      </PermissionGate>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByText(/acesso restrito/i)).toBeInTheDocument();
  });

  it('should show content with proper permissions', () => {
    mockAuthContext.currentClinic = {
      clinic: { id: 'clinic1', name: 'Test Clinic' },
      role: UserRole.CLINIC_OWNER,
      permissions: [Permission.MANAGE_FINANCIAL],
      active: true
    } as any;

    mockAuthContext.hasPermission.mockReturnValue(true);

    render(
      <PermissionGate requiredPermissions={[Permission.MANAGE_FINANCIAL]}>
        <div data-testid="protected-content">Financial Data</div>
      </PermissionGate>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });
});

// ============================================================================
// TESTES DE SEGURANÇA DE TOKENS
// ============================================================================

describe('Token Security', () => {
  it('should handle expired tokens gracefully', async () => {
    const expiredTokens = {
      accessToken: 'expired.token.here',
      refreshToken: 'refresh.token.here',
      expiresAt: new Date(Date.now() - 1000), // Expirado
      tokenType: 'Bearer' as const
    };

    // Simular tokens expirados no localStorage
    localStorage.setItem('auth_tokens', btoa(JSON.stringify(expiredTokens)));

    const authService = new AuthService();
    const user = await authService.getCurrentUser();

    expect(user).toBeNull();
    expect(localStorage.getItem('auth_tokens')).toBeNull();
  });

  it('should validate token format', () => {
    const invalidTokens = [
      'invalid-token',
      '',
      'not.a.jwt',
      null,
      undefined
    ];

    for (const token of invalidTokens) {
      // Simular token inválido
      if (token) {
        localStorage.setItem('auth_tokens', token);
      }

      const authService = new AuthService();
      expect(() => authService.getCurrentUser()).not.toThrow();
    }
  });
});

// ============================================================================
// TESTES DE PERFORMANCE
// ============================================================================

describe('Performance Security', () => {
  it('should complete authentication checks within acceptable time', async () => {
    const startTime = performance.now();

    const hasPermission = AuthorizationService.hasPermissionInClinic(
      {
        clinic: { id: 'clinic1', name: 'Test Clinic' },
        role: UserRole.PROFESSIONAL,
        permissions: [Permission.VIEW_MEDICAL_RECORD],
        active: true
      } as any,
      Permission.VIEW_MEDICAL_RECORD
    );

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(hasPermission).toBe(true);
    expect(duration).toBeLessThan(5); // Menos de 5ms
  });

  it('should handle large permission sets efficiently', () => {
    const largePermissionSet = Object.values(Permission);
    
    const startTime = performance.now();

    const effectivePermissions = AuthorizationService.getEffectivePermissions({
      clinic: { id: 'clinic1', name: 'Test Clinic' },
      role: UserRole.SUPER_ADMIN,
      permissions: largePermissionSet,
      active: true
    } as any);

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(effectivePermissions.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(10); // Menos de 10ms
  });
});

// ============================================================================
// TESTES DE EDGE CASES
// ============================================================================

describe('Edge Cases Security', () => {
  it('should handle null/undefined inputs gracefully', () => {
    expect(() => {
      AuthorizationService.hasPermissionInClinic(null, Permission.VIEW_CLINIC);
    }).not.toThrow();

    expect(() => {
      AuthorizationService.hasPermissionInClinic(undefined as any, Permission.VIEW_CLINIC);
    }).not.toThrow();

    expect(() => {
      AuthorizationService.validateTenantOperation(null, 'clinic1', Permission.VIEW_CLINIC);
    }).not.toThrow();
  });

  it('should handle malformed data structures', () => {
    const malformedAccess = {
      clinic: null,
      role: 'invalid_role' as any,
      permissions: null,
      active: 'true' as any // String em vez de boolean
    };

    expect(() => {
      AuthorizationService.hasPermissionInClinic(malformedAccess as any, Permission.VIEW_CLINIC);
    }).not.toThrow();
  });

  it('should prevent privilege escalation attempts', () => {
    const userAccess = {
      clinic: { id: 'clinic1', name: 'Test Clinic' },
      role: UserRole.RECEPTIONIST,
      permissions: [Permission.VIEW_USERS],
      active: true
    } as any;

    // Tentar acessar funcionalidade de admin
    const canManageUsers = AuthorizationService.hasPermissionInClinic(
      userAccess,
      Permission.MANAGE_USERS
    );

    expect(canManageUsers).toBe(false);

    // Tentar acessar dados financeiros
    const canViewFinancial = AuthorizationService.hasPermissionInClinic(
      userAccess,
      Permission.VIEW_FINANCIAL
    );

    expect(canViewFinancial).toBe(false);
  });
});
