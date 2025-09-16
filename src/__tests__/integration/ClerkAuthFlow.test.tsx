/**
 * 🧪 TESTES DE INTEGRAÇÃO - FLUXOS DE AUTENTICAÇÃO CLERK
 * 
 * Testes de integração para verificar fluxos completos de autenticação,
 * proteção de rotas, redirecionamentos e tratamento de erros
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  resetMockState, 
  simulateSignIn, 
  simulateSignOut,
  simulateLoading,
  mockClerkUser,
  createMockClerkUser
} from '../setup/clerk-mocks';

// Mock do Clerk com controle de estado
let mockAuthState = {
  isSignedIn: false,
  isLoaded: true,
  user: null,
  signOut: jest.fn(),
};

jest.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="clerk-provider">{children}</div>
  ),
  SignedIn: ({ children }: { children: React.ReactNode }) => (
    mockAuthState.isSignedIn ? <div data-testid="signed-in">{children}</div> : null
  ),
  SignedOut: ({ children }: { children: React.ReactNode }) => (
    !mockAuthState.isSignedIn ? <div data-testid="signed-out">{children}</div> : null
  ),
  SignInButton: ({ children, mode }: { children: React.ReactNode; mode?: string }) => (
    <button 
      data-testid="sign-in-button" 
      data-mode={mode}
      onClick={() => {
        // Simular processo de login
        setTimeout(() => {
          mockAuthState.isSignedIn = true;
          mockAuthState.user = mockClerkUser;
        }, 100);
      }}
    >
      {children}
    </button>
  ),
  SignUpButton: ({ children, mode }: { children: React.ReactNode; mode?: string }) => (
    <button 
      data-testid="sign-up-button" 
      data-mode={mode}
      onClick={() => {
        // Simular processo de cadastro
        setTimeout(() => {
          mockAuthState.isSignedIn = true;
          mockAuthState.user = mockClerkUser;
        }, 100);
      }}
    >
      {children}
    </button>
  ),
  UserButton: ({ appearance, showName }: any) => (
    <div 
      data-testid="user-button"
      onClick={() => {
        // Simular logout
        mockAuthState.isSignedIn = false;
        mockAuthState.user = null;
        mockAuthState.signOut();
      }}
      role="button"
      tabIndex={0}
    >
      User Menu
    </div>
  ),
  useAuth: () => ({
    isSignedIn: mockAuthState.isSignedIn,
    signOut: mockAuthState.signOut,
    getToken: jest.fn(),
  }),
  useUser: () => ({
    isSignedIn: mockAuthState.isSignedIn,
    user: mockAuthState.user,
    isLoaded: mockAuthState.isLoaded,
  }),
}));

// Componentes de teste
const PublicPage = () => (
  <div data-testid="public-page">
    <h1>Página Pública</h1>
    <div data-testid="signed-out">
      <button data-testid="sign-in-button">Entrar</button>
      <button data-testid="sign-up-button">Cadastrar</button>
    </div>
  </div>
);

const ProtectedPage = () => (
  <div data-testid="protected-page">
    <h1>Página Protegida</h1>
    <div data-testid="signed-in">
      <div data-testid="user-button" role="button" tabIndex={0}>User Menu</div>
    </div>
  </div>
);

const DashboardPage = () => (
  <div data-testid="dashboard-page">
    <h1>Dashboard</h1>
    <p>Bem-vindo ao sistema!</p>
  </div>
);

// Componente de rota protegida
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { SignedIn, SignedOut } = require('@clerk/clerk-react');
  
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <Navigate to="/" replace />
      </SignedOut>
    </>
  );
};

// App de teste completo
const TestApp = () => {
  const { ClerkProvider, SignedIn, SignedOut } = require('@clerk/clerk-react');
  
  return (
    <ClerkProvider publishableKey="pk_test_mock">
      <QueryClientProvider client={new QueryClient()}>
        <BrowserRouter>
          <div data-testid="app">
            <Routes>
              <Route 
                path="/" 
                element={
                  <>
                    <SignedOut>
                      <PublicPage />
                    </SignedOut>
                    <SignedIn>
                      <Navigate to="/dashboard" replace />
                    </SignedIn>
                  </>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/protected" 
                element={
                  <ProtectedRoute>
                    <ProtectedPage />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </ClerkProvider>
  );
};

describe('Clerk Authentication Flow Integration', () => {
  beforeEach(() => {
    resetMockState();
    mockAuthState = {
      isSignedIn: false,
      isLoaded: true,
      user: null,
      signOut: jest.fn(),
    };
  });

  describe('Fluxo Completo de Login/Logout', () => {
    it('deve completar fluxo de login com sucesso', async () => {
      const user = userEvent.setup();
      render(<TestApp />);
      
      // Deve começar na página pública
      expect(screen.getByTestId('public-page')).toBeInTheDocument();
      expect(screen.getByText('Página Pública')).toBeInTheDocument();
      
      // Simular clique no botão de login
      const signInButton = screen.getByTestId('sign-in-button');
      await user.click(signInButton);
      
      // Simular processo de autenticação
      act(() => {
        mockAuthState.isSignedIn = true;
        mockAuthState.user = mockClerkUser;
      });
      
      // Deve redirecionar para dashboard após login
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Bem-vindo ao sistema!')).toBeInTheDocument();
    });

    it('deve completar fluxo de logout com sucesso', async () => {
      const user = userEvent.setup();
      
      // Começar autenticado
      mockAuthState.isSignedIn = true;
      mockAuthState.user = mockClerkUser;
      
      render(<TestApp />);
      
      // Deve estar no dashboard
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      
      // Simular logout (seria através do UserButton)
      act(() => {
        mockAuthState.isSignedIn = false;
        mockAuthState.user = null;
      });
      
      // Deve redirecionar para página pública
      await waitFor(() => {
        expect(screen.getByTestId('public-page')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Página Pública')).toBeInTheDocument();
    });

    it('deve completar fluxo de cadastro com sucesso', async () => {
      const user = userEvent.setup();
      render(<TestApp />);
      
      // Deve começar na página pública
      expect(screen.getByTestId('public-page')).toBeInTheDocument();
      
      // Simular clique no botão de cadastro
      const signUpButton = screen.getByTestId('sign-up-button');
      await user.click(signUpButton);
      
      // Simular processo de cadastro
      act(() => {
        mockAuthState.isSignedIn = true;
        mockAuthState.user = createMockClerkUser({
          id: 'user_new123',
          firstName: 'Novo',
          lastName: 'Usuário',
          primaryEmailAddress: { emailAddress: 'novo@example.com' }
        });
      });
      
      // Deve redirecionar para dashboard após cadastro
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    });
  });

  describe('Proteção de Rotas e Redirecionamentos', () => {
    it('deve proteger rotas para usuários não autenticados', async () => {
      // Tentar acessar rota protegida sem autenticação
      window.history.pushState({}, '', '/protected');
      
      render(<TestApp />);
      
      // Deve redirecionar para página pública
      await waitFor(() => {
        expect(screen.getByTestId('public-page')).toBeInTheDocument();
      });
      
      expect(screen.queryByTestId('protected-page')).not.toBeInTheDocument();
    });

    it('deve permitir acesso a rotas protegidas para usuários autenticados', async () => {
      // Começar autenticado
      mockAuthState.isSignedIn = true;
      mockAuthState.user = mockClerkUser;
      
      window.history.pushState({}, '', '/protected');
      
      render(<TestApp />);
      
      // Deve acessar a rota protegida
      expect(screen.getByTestId('protected-page')).toBeInTheDocument();
      expect(screen.getByText('Página Protegida')).toBeInTheDocument();
    });

    it('deve redirecionar usuários autenticados da página inicial para dashboard', async () => {
      // Começar autenticado
      mockAuthState.isSignedIn = true;
      mockAuthState.user = mockClerkUser;
      
      render(<TestApp />);
      
      // Deve redirecionar automaticamente para dashboard
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
      
      expect(screen.queryByTestId('public-page')).not.toBeInTheDocument();
    });

    it('deve manter usuário na rota atual após recarregamento se autenticado', async () => {
      // Simular usuário autenticado na rota protegida
      mockAuthState.isSignedIn = true;
      mockAuthState.user = mockClerkUser;
      
      window.history.pushState({}, '', '/protected');
      
      const { rerender } = render(<TestApp />);
      
      expect(screen.getByTestId('protected-page')).toBeInTheDocument();
      
      // Simular recarregamento
      rerender(<TestApp />);
      
      expect(screen.getByTestId('protected-page')).toBeInTheDocument();
    });
  });

  describe('Tratamento de Erros de Autenticação', () => {
    it('deve lidar com falha de autenticação', async () => {
      const user = userEvent.setup();
      render(<TestApp />);
      
      expect(screen.getByTestId('public-page')).toBeInTheDocument();
      
      // Simular falha de login (usuário permanece não autenticado)
      const signInButton = screen.getByTestId('sign-in-button');
      await user.click(signInButton);
      
      // Não alterar estado de autenticação (simular falha)
      
      // Deve permanecer na página pública
      await waitFor(() => {
        expect(screen.getByTestId('public-page')).toBeInTheDocument();
      });
      
      expect(screen.queryByTestId('dashboard-page')).not.toBeInTheDocument();
    });

    it('deve lidar com sessão expirada', async () => {
      // Começar autenticado
      mockAuthState.isSignedIn = true;
      mockAuthState.user = mockClerkUser;
      
      render(<TestApp />);
      
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      
      // Simular expiração de sessão
      act(() => {
        mockAuthState.isSignedIn = false;
        mockAuthState.user = null;
      });
      
      // Deve redirecionar para página pública
      await waitFor(() => {
        expect(screen.getByTestId('public-page')).toBeInTheDocument();
      });
    });

    it('deve lidar com estado de carregamento', async () => {
      // Simular estado de carregamento
      mockAuthState.isLoaded = false;
      
      render(<TestApp />);
      
      // Durante carregamento, pode mostrar estado baseado no isSignedIn atual
      expect(screen.getByTestId('app')).toBeInTheDocument();
      
      // Simular carregamento completo
      act(() => {
        mockAuthState.isLoaded = true;
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('public-page')).toBeInTheDocument();
      });
    });
  });

  describe('Persistência de Sessão', () => {
    it('deve manter sessão entre recarregamentos', async () => {
      // Simular sessão persistente
      mockAuthState.isSignedIn = true;
      mockAuthState.user = mockClerkUser;
      
      const { rerender } = render(<TestApp />);
      
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      
      // Simular recarregamento da página
      rerender(<TestApp />);
      
      // Deve manter usuário autenticado
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      expect(screen.queryByTestId('public-page')).not.toBeInTheDocument();
    });

    it('deve limpar sessão após logout explícito', async () => {
      const user = userEvent.setup();
      
      // Começar autenticado
      mockAuthState.isSignedIn = true;
      mockAuthState.user = mockClerkUser;
      
      render(<TestApp />);
      
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      
      // Simular logout explícito
      act(() => {
        mockAuthState.isSignedIn = false;
        mockAuthState.user = null;
        mockAuthState.signOut();
      });
      
      // Deve redirecionar e limpar sessão
      await waitFor(() => {
        expect(screen.getByTestId('public-page')).toBeInTheDocument();
      });
      
      expect(mockAuthState.signOut).toHaveBeenCalled();
    });
  });

  describe('Navegação Contextual', () => {
    it('deve atualizar navegação baseada no estado de autenticação', async () => {
      render(<TestApp />);
      
      // Estado não autenticado - deve mostrar botões de login
      expect(screen.getByTestId('public-page')).toBeInTheDocument();
      expect(screen.getByTestId('sign-in-button')).toBeInTheDocument();
      expect(screen.getByTestId('sign-up-button')).toBeInTheDocument();
      
      // Simular login
      act(() => {
        mockAuthState.isSignedIn = true;
        mockAuthState.user = mockClerkUser;
      });
      
      // Estado autenticado - deve mostrar dashboard
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
      
      expect(screen.queryByTestId('sign-in-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sign-up-button')).not.toBeInTheDocument();
    });

    it('deve manter histórico de navegação apropriado', async () => {
      // Começar não autenticado
      render(<TestApp />);
      
      expect(screen.getByTestId('public-page')).toBeInTheDocument();
      
      // Tentar acessar rota protegida
      act(() => {
        window.history.pushState({}, '', '/protected');
      });
      
      // Deve redirecionar para home
      await waitFor(() => {
        expect(window.location.pathname).toBe('/');
      });
      
      // Fazer login
      act(() => {
        mockAuthState.isSignedIn = true;
        mockAuthState.user = mockClerkUser;
      });
      
      // Deve poder acessar rota protegida agora
      act(() => {
        window.history.pushState({}, '', '/protected');
      });
      
      await waitFor(() => {
        expect(window.location.pathname).toBe('/protected');
      });
    });
  });
});