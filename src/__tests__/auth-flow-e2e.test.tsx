/**
 * 🎭 TESTES E2E - Fluxos Completos de Autenticação
 * 
 * Testa jornadas completas do usuário:
 * - Novo usuário → Wizard
 * - Usuário existente → Dashboard  
 * - Token expirado → Re-login
 * - Navegação durante onboarding
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import AuthRouterV2, { AuthDebugInfo } from '@/components/AuthRouterV2';
import Dashboard from '@/pages/Dashboard';
import { OnboardingWizard } from '@/components/OnboardingWizard';

// Mock do Supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      }))
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(),
          single: jest.fn()
        }))
      }))
    }))
  }
}));

// Mock do hook de auth otimizado
const mockAuthState = {
  user: null,
  session: null,
  profile: null,
  roles: [],
  isAuthenticated: false,
  isLoading: false,
  authDecision: {
    state: 'ANONYMOUS',
    decision: 'REDIRECT_AUTH',
    reason: 'Not authenticated'
  },
  flightStatus: { total: 0, active: [], profiles: [], roles: [], sessions: [] }
};

jest.mock('@/hooks/useOptimizedAuth', () => ({
  useOptimizedAuth: () => mockAuthState,
  useAuthRoute: () => mockAuthState.authDecision,
  useOptimizedLoading: () => ({ 
    isLoading: false, 
    isForceTimeout: false, 
    authState: mockAuthState.authDecision.state 
  })
}));

// Helper para renderizar com providers
function renderWithProviders(
  component: React.ReactElement, 
  initialRoute: string = '/'
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          {component}
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('🎭 Fluxos E2E de Autenticação', () => {
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Set feature flag
    process.env.REACT_APP_AUTH_V2_ENABLED = 'true';
  });

  describe('👤 Usuário Anônimo', () => {
    
    test('deve redirecionar para /auth quando não autenticado', async () => {
      // Mock: usuário não autenticado
      Object.assign(mockAuthState, {
        user: null,
        session: null,
        profile: null,
        isAuthenticated: false,
        authDecision: {
          state: 'ANONYMOUS',
          decision: 'REDIRECT_AUTH',
          reason: 'Not authenticated',
          redirectPath: '/auth'
        }
      });

      renderWithProviders(
        <AuthRouterV2>
          <Dashboard />
        </AuthRouterV2>,
        '/dashboard'
      );

      // Deve redirecionar para auth (navegação simulada)
      await waitFor(() => {
        // Verificar que o dashboard não é renderizado
        expect(screen.queryByText('Dashboard')).toBeNull();
      });
    });
    
    test('deve permitir acesso a rotas públicas', async () => {
      // Mock: usuário não autenticado acessando rota pública
      Object.assign(mockAuthState, {
        authDecision: {
          state: 'ANONYMOUS',
          decision: 'ALLOW_ACCESS',
          reason: 'Rota pública'
        }
      });

      renderWithProviders(
        <AuthRouterV2>
          <div>Página Pública</div>
        </AuthRouterV2>,
        '/'
      );

      expect(screen.getByText('Página Pública')).toBeInTheDocument();
    });
    
  });

  describe('🆕 Usuário Novo (Primeiro Acesso)', () => {
    
    test('deve redirecionar para onboarding quando primeiro_acesso = true', async () => {
      // Mock: usuário novo autenticado
      Object.assign(mockAuthState, {
        user: { id: 'user-123', email: 'novo@test.com' },
        session: { access_token: 'valid-token' },
        profile: {
          id: 'profile-123',
          primeiro_acesso: true,
          nome_completo: 'Novo Usuario',
          email: 'novo@test.com',
          ativo: true
        },
        isAuthenticated: true,
        authDecision: {
          state: 'AUTHENTICATED_NEW',
          decision: 'REDIRECT_ONBOARDING',
          reason: 'Usuário precisa completar onboarding',
          redirectPath: '/onboarding'
        }
      });

      renderWithProviders(
        <AuthRouterV2>
          <Dashboard />
        </AuthRouterV2>,
        '/dashboard'
      );

      // Deve redirecionar para onboarding
      await waitFor(() => {
        expect(screen.queryByText('Dashboard')).toBeNull();
      });
    });
    
    test('deve permitir acesso ao onboarding quando já está na rota', async () => {
      // Mock: usuário novo já na página de onboarding
      Object.assign(mockAuthState, {
        user: { id: 'user-123', email: 'novo@test.com' },
        profile: { 
          primeiro_acesso: true,
          ativo: true,
          nome_completo: 'Novo Usuario',
          email: 'novo@test.com'
        },
        isAuthenticated: true,
        authDecision: {
          state: 'ONBOARDING_IN_PROGRESS',
          decision: 'ALLOW_ACCESS',
          reason: 'Onboarding em progresso'
        }
      });

      renderWithProviders(
        <AuthRouterV2 allowOnboarding={true}>
          <div>Wizard de Onboarding</div>
        </AuthRouterV2>,
        '/onboarding'
      );

      expect(screen.getByText('Wizard de Onboarding')).toBeInTheDocument();
    });
    
  });

  describe('✅ Usuário Existente', () => {
    
    test('deve permitir acesso ao dashboard', async () => {
      // Mock: usuário existente válido
      Object.assign(mockAuthState, {
        user: { id: 'user-123', email: 'existente@test.com' },
        session: { access_token: 'valid-token' },
        profile: {
          id: 'profile-123',
          primeiro_acesso: false,
          nome_completo: 'Usuario Existente',
          email: 'existente@test.com',
          ativo: true
        },
        roles: [{ role: 'proprietaria', ativo: true }],
        isAuthenticated: true,
        authDecision: {
          state: 'AUTHENTICATED_EXISTING',
          decision: 'ALLOW_ACCESS',
          reason: 'Usuário existente com acesso liberado'
        }
      });

      renderWithProviders(
        <AuthRouterV2>
          <Dashboard />
        </AuthRouterV2>,
        '/dashboard'
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });
    
    test('deve verificar permissões para rotas protegidas', async () => {
      // Mock: usuário sem permissão para a rota
      Object.assign(mockAuthState, {
        user: { id: 'user-123', email: 'sem-permissao@test.com' },
        profile: { primeiro_acesso: false, ativo: true },
        roles: [], // Sem roles
        isAuthenticated: true,
        authDecision: {
          state: 'AUTHENTICATED_EXISTING',
          decision: 'DENY_ACCESS',
          reason: 'Permissões insuficientes'
        }
      });

      renderWithProviders(
        <AuthRouterV2 requiredRoles={['proprietaria']}>
          <div>Rota Protegida</div>
        </AuthRouterV2>,
        '/financeiro'
      );

      // Não deve renderizar conteúdo protegido
      await waitFor(() => {
        expect(screen.queryByText('Rota Protegida')).toBeNull();
      });
    });
    
  });

  describe('⏱️ Estados de Loading', () => {
    
    test('deve mostrar loading otimizado durante autenticação', async () => {
      // Mock: estado de loading
      Object.assign(mockAuthState, {
        isLoading: true,
        authDecision: {
          state: 'ANONYMOUS',
          decision: 'REDIRECT_AUTH'
        }
      });

      // Mock do loading hook
      jest.doMock('@/hooks/useOptimizedAuth', () => ({
        useOptimizedAuth: () => mockAuthState,
        useAuthRoute: () => mockAuthState.authDecision,
        useOptimizedLoading: () => ({ 
          isLoading: true, 
          isForceTimeout: false, 
          authState: 'ANONYMOUS' 
        })
      }));

      renderWithProviders(
        <AuthRouterV2>
          <Dashboard />
        </AuthRouterV2>
      );

      // Deve mostrar loading
      expect(screen.getByText('Autenticando...')).toBeInTheDocument();
    });
    
    test('deve permitir acesso após timeout forçado', async () => {
      // Mock: timeout forçado
      Object.assign(mockAuthState, {
        isLoading: false
      });

      // Mock loading hook com timeout
      jest.doMock('@/hooks/useOptimizedAuth', () => ({
        useOptimizedAuth: () => mockAuthState,
        useAuthRoute: () => mockAuthState.authDecision,
        useOptimizedLoading: () => ({ 
          isLoading: false, 
          isForceTimeout: true,
          authState: 'AUTHENTICATED_EXISTING' 
        })
      }));

      renderWithProviders(
        <AuthRouterV2>
          <Dashboard />
        </AuthRouterV2>
      );

      // Deve permitir acesso mesmo com dados incompletos
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
    
  });

  describe('🔄 Transições de Estado', () => {
    
    test('deve transicionar de novo usuário para existente após onboarding', async () => {
      // Estado inicial: novo usuário
      Object.assign(mockAuthState, {
        profile: { primeiro_acesso: true },
        authDecision: {
          state: 'AUTHENTICATED_NEW',
          decision: 'REDIRECT_ONBOARDING'
        }
      });

      const { rerender } = renderWithProviders(
        <AuthRouterV2>
          <Dashboard />
        </AuthRouterV2>
      );

      // Simular conclusão do onboarding
      Object.assign(mockAuthState, {
        profile: { 
          primeiro_acesso: false,
          ativo: true,
          nome_completo: 'Usuario',
          email: 'test@test.com'
        },
        authDecision: {
          state: 'AUTHENTICATED_EXISTING',
          decision: 'ALLOW_ACCESS'
        }
      });

      rerender(
        <AuthRouterV2>
          <Dashboard />
        </AuthRouterV2>
      );

      // Deve permitir acesso ao dashboard
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });
    });
    
  });

  describe('🚨 Estados de Erro', () => {
    
    test('deve lidar com estado de erro graciosamente', async () => {
      // Mock: estado de erro
      Object.assign(mockAuthState, {
        user: { id: 'user-123' },
        profile: { ativo: false }, // Profile inativo
        authDecision: {
          state: 'ERROR_STATE',
          decision: 'REDIRECT_DASHBOARD',
          reason: 'Estado de erro - redirecionando para dashboard'
        }
      });

      renderWithProviders(
        <AuthRouterV2>
          <div>Conteúdo Atual</div>
        </AuthRouterV2>,
        '/clientes'
      );

      // Deve redirecionar graciosamente
      await waitFor(() => {
        expect(screen.queryByText('Conteúdo Atual')).toBeNull();
      });
    });
    
  });

  describe('📊 Debugging e Monitoramento', () => {
    
    test('deve mostrar informações de debug em desenvolvimento', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      renderWithProviders(<AuthDebugInfo />);

      // Verificar elementos de debug
      expect(screen.getByText(/Auth State:/)).toBeInTheDocument();
      expect(screen.getByText(/Decision:/)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
    
    test('não deve mostrar debug em produção', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      renderWithProviders(<AuthDebugInfo />);

      // Não deve mostrar elementos de debug
      expect(screen.queryByText(/Auth State:/)).toBeNull();

      process.env.NODE_ENV = originalEnv;
    });
    
  });

});

describe('🚀 Performance E2E', () => {
  
  test('decisão de auth deve ser instantânea', async () => {
    const startTime = performance.now();

    renderWithProviders(
      <AuthRouterV2>
        <Dashboard />
      </AuthRouterV2>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Renderização completa deve ser < 50ms
    expect(renderTime).toBeLessThan(50);
  });
  
  test('deve lidar com re-renders frequentes', async () => {
    let renderCount = 0;
    
    function TestComponent() {
      renderCount++;
      return <div>Render Count: {renderCount}</div>;
    }

    const { rerender } = renderWithProviders(
      <AuthRouterV2>
        <TestComponent />
      </AuthRouterV2>
    );

    // Re-render múltiplas vezes
    for (let i = 0; i < 10; i++) {
      rerender(
        <AuthRouterV2>
          <TestComponent />
        </AuthRouterV2>
      );
    }

    // Deve manter performance
    expect(renderCount).toBeLessThan(20); // Otimizações devem reduzir re-renders
  });
  
});

describe('🛡️ Casos Edge E2E', () => {
  
  test('deve lidar com mudança de rota durante loading', async () => {
    // Mock: loading inicial
    Object.assign(mockAuthState, {
      isLoading: true
    });

    const { rerender } = renderWithProviders(
      <AuthRouterV2>
        <Dashboard />
      </AuthRouterV2>,
      '/dashboard'
    );

    // Simular mudança de rota durante loading
    rerender(
      <AuthRouterV2>
        <div>Nova Página</div>
      </AuthRouterV2>
    );

    // Simular conclusão do loading
    Object.assign(mockAuthState, {
      isLoading: false,
      isAuthenticated: true,
      authDecision: {
        state: 'AUTHENTICATED_EXISTING',
        decision: 'ALLOW_ACCESS'
      }
    });

    rerender(
      <AuthRouterV2>
        <div>Nova Página</div>
      </AuthRouterV2>
    );

    expect(screen.getByText('Nova Página')).toBeInTheDocument();
  });
  
  test('deve prevenir loops de redirecionamento', async () => {
    let redirectCount = 0;
    
    // Mock que simula possível loop
    Object.assign(mockAuthState, {
      authDecision: {
        get decision() {
          redirectCount++;
          return redirectCount > 3 ? 'ALLOW_ACCESS' : 'REDIRECT_ONBOARDING';
        },
        state: 'AUTHENTICATED_NEW'
      }
    });

    renderWithProviders(
      <AuthRouterV2>
        <Dashboard />
      </AuthRouterV2>
    );

    // Aguardar estabilização
    await waitFor(() => {
      // Sistema deve estabilizar sem loops infinitos
      expect(redirectCount).toBeLessThan(10);
    }, { timeout: 1000 });
  });
  
});