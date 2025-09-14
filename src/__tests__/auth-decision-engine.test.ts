/**
 * 🧪 TESTES UNITÁRIOS - Motor de Decisão de Auth
 * 
 * Cobertura completa de todos os cenários de autenticação.
 * Objetivo: 100% coverage nas decisões críticas.
 */

import {
  determineAuthRoute,
  createTestContext,
  diagnoseAuthState,
  measureAuthDecisionPerformance
} from '@/utils/auth-decision-engine';
import { AuthStateContext } from '@/types/auth-state';

describe('🎯 Auth Decision Engine', () => {
  
  describe('determineAuthRoute - Cenários Básicos', () => {
    
    test('usuário anônimo deve redirecionar para auth', () => {
      const context = createTestContext({
        hasValidToken: false,
        user: null,
        profile: null,
        currentPath: '/dashboard'
      });
      
      const result = determineAuthRoute(context);
      
      expect(result.state).toBe('ANONYMOUS');
      expect(result.decision).toBe('REDIRECT_AUTH');
      expect(result.redirectPath).toBe('/auth');
    });
    
    test('usuário autenticado sem profile deve redirecionar para auth', () => {
      const context = createTestContext({
        hasValidToken: true,
        user: { id: 'user-123', email: 'test@test.com' },
        profile: null,
        currentPath: '/dashboard'
      });
      
      const result = determineAuthRoute(context);
      
      expect(result.state).toBe('ANONYMOUS');
      expect(result.decision).toBe('REDIRECT_AUTH');
    });
    
    test('usuário novo (primeiro_acesso=true) deve redirecionar para onboarding', () => {
      const context = createTestContext({
        hasValidToken: true,
        user: { id: 'user-123', email: 'test@test.com' },
        profile: {
          id: 'profile-123',
          primeiro_acesso: true,
          nome_completo: 'Test User',
          email: 'test@test.com',
          ativo: true
        },
        currentPath: '/dashboard'
      });
      
      const result = determineAuthRoute(context);
      
      expect(result.state).toBe('AUTHENTICATED_NEW');
      expect(result.decision).toBe('REDIRECT_ONBOARDING');
      expect(result.redirectPath).toBe('/onboarding');
    });
    
    test('usuário existente deve permitir acesso', () => {
      const context = createTestContext({
        hasValidToken: true,
        user: { id: 'user-123', email: 'test@test.com' },
        profile: {
          id: 'profile-123',
          primeiro_acesso: false,
          nome_completo: 'Test User',
          email: 'test@test.com',
          ativo: true
        },
        roles: [{ role: 'proprietaria', ativo: true }],
        currentPath: '/dashboard'
      });
      
      const result = determineAuthRoute(context);
      
      expect(result.state).toBe('AUTHENTICATED_EXISTING');
      expect(result.decision).toBe('ALLOW_ACCESS');
    });
    
  });
  
  describe('determineAuthRoute - Onboarding em Progresso', () => {
    
    test('usuário em onboarding deve permitir acesso à página de onboarding', () => {
      const context = createTestContext({
        hasValidToken: true,
        user: { id: 'user-123', email: 'test@test.com' },
        profile: {
          id: 'profile-123',
          primeiro_acesso: true,
          nome_completo: 'Test User',
          email: 'test@test.com',
          ativo: true
        },
        currentPath: '/onboarding'
      });
      
      const result = determineAuthRoute(context);
      
      expect(result.state).toBe('ONBOARDING_IN_PROGRESS');
      expect(result.decision).toBe('ALLOW_ACCESS');
    });
    
    test('usuário em onboarding tentando acessar outra rota deve redirecionar', () => {
      const context = createTestContext({
        hasValidToken: true,
        user: { id: 'user-123', email: 'test@test.com' },
        profile: {
          id: 'profile-123',
          primeiro_acesso: true,
          nome_completo: 'Test User',
          email: 'test@test.com',
          ativo: true
        },
        currentPath: '/clientes'
      });
      
      const result = determineAuthRoute(context);
      
      expect(result.state).toBe('AUTHENTICATED_NEW');
      expect(result.decision).toBe('REDIRECT_ONBOARDING');
    });
    
  });
  
  describe('determineAuthRoute - Rotas Públicas', () => {
    
    const publicRoutes = ['/', '/auth', '/unauthorized', '/404'];
    
    publicRoutes.forEach(route => {
      test(`rota pública ${route} deve sempre permitir acesso`, () => {
        const context = createTestContext({
          hasValidToken: false,
          user: null,
          profile: null,
          currentPath: route
        });
        
        const result = determineAuthRoute(context);
        
        expect(result.decision).toBe('ALLOW_ACCESS');
      });
    });
    
  });
  
  describe('determineAuthRoute - Verificação de Roles', () => {
    
    test('usuário sem roles tentando acessar rota protegida deve ser negado', () => {
      const context = createTestContext({
        hasValidToken: true,
        user: { id: 'user-123', email: 'test@test.com' },
        profile: {
          id: 'profile-123',
          primeiro_acesso: false,
          nome_completo: 'Test User',
          email: 'test@test.com',
          ativo: true
        },
        roles: [], // Sem roles
        currentPath: '/agendamento'
      });
      
      const result = determineAuthRoute(context);
      
      expect(result.state).toBe('AUTHENTICATED_EXISTING');
      expect(result.decision).toBe('DENY_ACCESS');
    });
    
    test('usuário com role ativo deve ter acesso', () => {
      const context = createTestContext({
        hasValidToken: true,
        user: { id: 'user-123', email: 'test@test.com' },
        profile: {
          id: 'profile-123',
          primeiro_acesso: false,
          nome_completo: 'Test User',
          email: 'test@test.com',
          ativo: true
        },
        roles: [{ role: 'proprietaria', ativo: true }],
        currentPath: '/agendamento'
      });
      
      const result = determineAuthRoute(context);
      
      expect(result.decision).toBe('ALLOW_ACCESS');
    });
    
    test('usuário com role inativo deve ser negado', () => {
      const context = createTestContext({
        hasValidToken: true,
        user: { id: 'user-123', email: 'test@test.com' },
        profile: {
          id: 'profile-123',
          primeiro_acesso: false,
          nome_completo: 'Test User',
          email: 'test@test.com',
          ativo: true
        },
        roles: [{ role: 'proprietaria', ativo: false }],
        currentPath: '/agendamento'
      });
      
      const result = determineAuthRoute(context);
      
      expect(result.decision).toBe('DENY_ACCESS');
    });
    
  });
  
  describe('determineAuthRoute - Estados de Erro', () => {
    
    test('profile inativo deve resultar em estado de erro', () => {
      const context = createTestContext({
        hasValidToken: true,
        user: { id: 'user-123', email: 'test@test.com' },
        profile: {
          id: 'profile-123',
          primeiro_acesso: false,
          nome_completo: 'Test User',
          email: 'test@test.com',
          ativo: false // Profile inativo
        },
        currentPath: '/dashboard'
      });
      
      const result = determineAuthRoute(context);
      
      expect(result.state).toBe('ERROR_STATE');
      expect(result.decision).toBe('REDIRECT_DASHBOARD');
    });
    
    test('contexto inconsistente deve resultar em estado de erro', () => {
      const context = createTestContext({
        hasValidToken: true,
        user: { id: 'user-123', email: 'test@test.com' },
        profile: {
          id: 'profile-123',
          primeiro_acesso: false,
          nome_completo: '',
          email: '',
          ativo: false
        },
        currentPath: '/dashboard'
      });
      
      const result = determineAuthRoute(context);
      
      expect(result.state).toBe('ERROR_STATE');
    });
    
  });
  
  describe('Performance Tests', () => {
    
    test('decisão de auth deve ser rápida (< 5ms)', () => {
      const context = createTestContext({
        hasValidToken: true,
        user: { id: 'user-123', email: 'test@test.com' },
        profile: {
          id: 'profile-123',
          primeiro_acesso: false,
          nome_completo: 'Test User',
          email: 'test@test.com',
          ativo: true
        },
        roles: [{ role: 'proprietaria', ativo: true }],
        currentPath: '/dashboard'
      });
      
      const result = measureAuthDecisionPerformance(context);
      
      expect(result.performanceMs).toBeLessThan(5);
    });
    
    test('1000 decisões consecutivas devem manter performance', () => {
      const context = createTestContext({
        hasValidToken: true,
        user: { id: 'user-123', email: 'test@test.com' },
        profile: {
          id: 'profile-123',
          primeiro_acesso: false,
          nome_completo: 'Test User',
          email: 'test@test.com',
          ativo: true
        },
        roles: [{ role: 'proprietaria', ativo: true }],
        currentPath: '/dashboard'
      });
      
      const times: number[] = [];
      
      for (let i = 0; i < 1000; i++) {
        const result = measureAuthDecisionPerformance(context);
        times.push(result.performanceMs!);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      
      expect(avgTime).toBeLessThan(2); // Média < 2ms
      expect(maxTime).toBeLessThan(10); // Máximo < 10ms
    });
    
  });
  
  describe('Diagnóstico de Estado', () => {
    
    test('diagnoseAuthState deve retornar informações completas', () => {
      const context = createTestContext({
        hasValidToken: true,
        user: { id: 'user-123', email: 'test@test.com' },
        profile: {
          id: 'profile-123',
          primeiro_acesso: false,
          nome_completo: 'Test User',
          email: 'test@test.com',
          ativo: true
        },
        roles: [{ role: 'proprietaria', ativo: true }],
        currentPath: '/dashboard'
      });
      
      const diagnosis = diagnoseAuthState(context);
      
      expect(diagnosis.diagnostics).toHaveProperty('hasToken');
      expect(diagnosis.diagnostics).toHaveProperty('hasUser');
      expect(diagnosis.diagnostics).toHaveProperty('hasProfile');
      expect(diagnosis.diagnostics).toHaveProperty('rolesCount');
      expect(diagnosis.diagnostics).toHaveProperty('currentPath');
      expect(diagnosis.diagnostics).toHaveProperty('timestamp');
      
      expect(diagnosis.diagnostics.hasToken).toBe(true);
      expect(diagnosis.diagnostics.hasUser).toBe(true);
      expect(diagnosis.diagnostics.hasProfile).toBe(true);
      expect(diagnosis.diagnostics.rolesCount).toBe(1);
    });
    
  });
  
  describe('Casos Edge', () => {
    
    test('email vazio deve ser tratado corretamente', () => {
      const context = createTestContext({
        hasValidToken: true,
        user: { id: 'user-123', email: '' },
        profile: {
          id: 'profile-123',
          primeiro_acesso: false,
          nome_completo: 'Test User',
          email: '',
          ativo: true
        },
        currentPath: '/dashboard'
      });
      
      const result = determineAuthRoute(context);
      
      // Sistema deve ainda funcionar com emails vazios
      expect(result.state).toBe('AUTHENTICATED_EXISTING');
    });
    
    test('múltiplos roles com diferentes status', () => {
      const context = createTestContext({
        hasValidToken: true,
        user: { id: 'user-123', email: 'test@test.com' },
        profile: {
          id: 'profile-123',
          primeiro_acesso: false,
          nome_completo: 'Test User',
          email: 'test@test.com',
          ativo: true
        },
        roles: [
          { role: 'proprietaria', ativo: false },
          { role: 'gerente', ativo: true },
          { role: 'recepcionistas', ativo: false }
        ],
        currentPath: '/agendamento'
      });
      
      const result = determineAuthRoute(context);
      
      // Deve permitir acesso se pelo menos um role está ativo
      expect(result.decision).toBe('ALLOW_ACCESS');
    });
    
    test('path com query parameters e hash', () => {
      const context = createTestContext({
        hasValidToken: true,
        user: { id: 'user-123', email: 'test@test.com' },
        profile: {
          id: 'profile-123',
          primeiro_acesso: false,
          nome_completo: 'Test User',
          email: 'test@test.com',
          ativo: true
        },
        roles: [{ role: 'proprietaria', ativo: true }],
        currentPath: '/dashboard?tab=1#section'
      });
      
      const result = determineAuthRoute(context);
      
      expect(result.decision).toBe('ALLOW_ACCESS');
    });
    
  });
  
});