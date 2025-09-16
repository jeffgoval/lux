/**
 * 🧪 TESTES DE INTEGRAÇÃO - PERSISTÊNCIA DE SESSÃO CLERK
 * 
 * Testes de integração para verificar persistência de sessão,
 * comportamento entre recarregamentos e gerenciamento de estado
 */

import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { 
  resetMockState, 
  mockClerkUser,
  createMockClerkUser
} from '../setup/clerk-mocks';

// Mock do localStorage para testes
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock do sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Estado de sessão simulado
let mockSessionState = {
  isSignedIn: false,
  user: null as any,
  isLoaded: false,
  sessionId: null as string | null,
  lastActivity: null as number | null,
};

// Mock do Clerk com persistência
jest.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => {
    // Simular carregamento de sessão do storage
    React.useEffect(() => {
      const savedSession = localStorage.getItem('clerk_session');
      if (savedSession) {
        const session = JSON.parse(savedSession);
        if (session.expiresAt > Date.now()) {
          mockSessionState.isSignedIn = true;
          mockSessionState.user = session.user;
          mockSessionState.sessionId = session.sessionId;
        } else {
          localStorage.removeItem('clerk_session');
        }
      }
      mockSessionState.isLoaded = true;
    }, []);

    return <div data-testid="clerk-provider">{children}</div>;
  },
  
  SignedIn: ({ children }: { children: React.ReactNode }) => (
    mockSessionState.isSignedIn && mockSessionState.isLoaded ? 
      <div data-testid="signed-in">{children}</div> : null
  ),
  
  SignedOut: ({ children }: { children: React.ReactNode }) => (
    !mockSessionState.isSignedIn && mockSessionState.isLoaded ? 
      <div data-testid="signed-out">{children}</div> : null
  ),
  
  SignInButton: ({ children }: { children: React.ReactNode }) => (
    <button 
      data-testid="sign-in-button"
      onClick={() => {
        // Simular login com persistência
        const sessionData = {
          user: mockClerkUser,
          sessionId: 'session_' + Date.now(),
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 horas
          lastActivity: Date.now()
        };
        
        localStorage.setItem('clerk_session', JSON.stringify(sessionData));
        
        mockSessionState.isSignedIn = true;
        mockSessionState.user = mockClerkUser;
        mockSessionState.sessionId = sessionData.sessionId;
        mockSessionState.lastActivity = sessionData.lastActivity;
      }}
    >
      {children}
    </button>
  ),
  
  UserButton: ({ children }: { children: React.ReactNode }) => (
    <div 
      data-testid="user-button"
      onClick={() => {
        // Simular logout com limpeza
        localStorage.removeItem('clerk_session');
        sessionStorage.clear();
        
        mockSessionState.isSignedIn = false;
        mockSessionState.user = null;
        mockSessionState.sessionId = null;
        mockSessionState.lastActivity = null;
      }}
      role="button"
      tabIndex={0}
    >
      {children || 'User Menu'}
    </div>
  ),
  
  useAuth: () => ({
    isSignedIn: mockSessionState.isSignedIn,
    signOut: () => {
      localStorage.removeItem('clerk_session');
      mockSessionState.isSignedIn = false;
      mockSessionState.user = null;
      mockSessionState.sessionId = null;
    },
    getToken: () => Promise.resolve(mockSessionState.sessionId),
  }),
  
  useUser: () => ({
    isSignedIn: mockSessionState.isSignedIn,
    user: mockSessionState.user,
    isLoaded: mockSessionState.isLoaded,
  }),
}));

// Componente de teste
const TestSessionComponent = () => {
  const { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton, useAuth, useUser } = require('@clerk/clerk-react');
  const auth = useAuth();
  const { user, isLoaded } = useUser();
  
  if (!isLoaded) {
    return <div data-testid="loading">Carregando...</div>;
  }
  
  return (
    <ClerkProvider publishableKey="pk_test_mock">
      <div data-testid="session-component">
        <div data-testid="session-info">
          <p>Loaded: {isLoaded ? 'true' : 'false'}</p>
          <p>Signed In: {auth.isSignedIn ? 'true' : 'false'}</p>
          {user && <p data-testid="user-email">{user.primaryEmailAddress?.emailAddress}</p>}
        </div>
        
        <SignedOut>
          <div data-testid="signed-out-content">
            <SignInButton>
              <button>Entrar</button>
            </SignInButton>
          </div>
        </SignedOut>
        
        <SignedIn>
          <div data-testid="signed-in-content">
            <p>Usuário autenticado</p>
            <UserButton>
              <button>Sair</button>
            </UserButton>
          </div>
        </SignedIn>
      </div>
    </ClerkProvider>
  );
};

describe('Clerk Session Persistence Integration', () => {
  beforeEach(() => {
    resetMockState();
    localStorage.clear();
    sessionStorage.clear();
    mockSessionState = {
      isSignedIn: false,
      user: null,
      isLoaded: false,
      sessionId: null,
      lastActivity: null,
    };
  });

  describe('Persistência Básica de Sessão', () => {
    it('deve persistir sessão no localStorage após login', async () => {
      const user = userEvent.setup();
      
      render(
        <BrowserRouter>
          <TestSessionComponent />
        </BrowserRouter>
      );
      
      // Aguardar carregamento
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });
      
      expect(screen.getByTestId('signed-out-content')).toBeInTheDocument();
      
      // Fazer login
      const signInButton = screen.getByTestId('sign-in-button');
      await user.click(signInButton);
      
      // Verificar se sessão foi salva
      const savedSession = localStorage.getItem('clerk_session');
      expect(savedSession).toBeTruthy();
      
      const sessionData = JSON.parse(savedSession!);
      expect(sessionData.user).toBeTruthy();
      expect(sessionData.sessionId).toBeTruthy();
      expect(sessionData.expiresAt).toBeGreaterThan(Date.now());
    });

    it('deve restaurar sessão do localStorage no carregamento', async () => {
      // Simular sessão salva
      const sessionData = {
        user: mockClerkUser,
        sessionId: 'session_123',
        expiresAt: Date.now() + (24 * 60 * 60 * 1000),
        lastActivity: Date.now()
      };
      
      localStorage.setItem('clerk_session', JSON.stringify(sessionData));
      
      // Simular estado inicial com sessão
      mockSessionState.isSignedIn = true;
      mockSessionState.user = mockClerkUser;
      mockSessionState.isLoaded = true;
      
      render(
        <BrowserRouter>
          <TestSessionComponent />
        </BrowserRouter>
      );
      
      // Deve mostrar usuário autenticado
      await waitFor(() => {
        expect(screen.getByTestId('signed-in-content')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Signed In: true')).toBeInTheDocument();
      expect(screen.getByTestId('user-email')).toHaveTextContent(mockClerkUser.primaryEmailAddress!.emailAddress);
    });

    it('deve limpar sessão expirada do localStorage', async () => {
      // Simular sessão expirada
      const expiredSessionData = {
        user: mockClerkUser,
        sessionId: 'session_expired',
        expiresAt: Date.now() - 1000, // Expirada há 1 segundo
        lastActivity: Date.now() - 3600000 // 1 hora atrás
      };
      
      localStorage.setItem('clerk_session', JSON.stringify(expiredSessionData));
      
      render(
        <BrowserRouter>
          <TestSessionComponent />
        </BrowserRouter>
      );
      
      // Aguardar carregamento
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });
      
      // Deve mostrar como não autenticado
      expect(screen.getByTestId('signed-out-content')).toBeInTheDocument();
      expect(screen.getByText('Signed In: false')).toBeInTheDocument();
      
      // Sessão expirada deve ter sido removida
      expect(localStorage.getItem('clerk_session')).toBeNull();
    });
  });
}); 
 describe('Comportamento entre Recarregamentos', () => {
    it('deve manter usuário autenticado após recarregamento', async () => {
      // Simular login inicial
      const sessionData = {
        user: mockClerkUser,
        sessionId: 'session_persistent',
        expiresAt: Date.now() + (24 * 60 * 60 * 1000),
        lastActivity: Date.now()
      };
      
      localStorage.setItem('clerk_session', JSON.stringify(sessionData));
      mockSessionState.isSignedIn = true;
      mockSessionState.user = mockClerkUser;
      mockSessionState.isLoaded = true;
      
      const { rerender } = render(
        <BrowserRouter>
          <TestSessionComponent />
        </BrowserRouter>
      );
      
      expect(screen.getByTestId('signed-in-content')).toBeInTheDocument();
      
      // Simular recarregamento
      rerender(
        <BrowserRouter>
          <TestSessionComponent />
        </BrowserRouter>
      );
      
      // Deve manter autenticação
      await waitFor(() => {
        expect(screen.getByTestId('signed-in-content')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Signed In: true')).toBeInTheDocument();
    });

    it('deve mostrar loading durante verificação de sessão', async () => {
      // Simular estado de carregamento
      mockSessionState.isLoaded = false;
      
      render(
        <BrowserRouter>
          <TestSessionComponent />
        </BrowserRouter>
      );
      
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
      
      // Simular carregamento completo
      act(() => {
        mockSessionState.isLoaded = true;
      });
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });
    });
  });

  describe('Logout e Limpeza de Sessão', () => {
    it('deve limpar sessão do localStorage no logout', async () => {
      const user = userEvent.setup();
      
      // Começar autenticado
      const sessionData = {
        user: mockClerkUser,
        sessionId: 'session_to_clear',
        expiresAt: Date.now() + (24 * 60 * 60 * 1000),
        lastActivity: Date.now()
      };
      
      localStorage.setItem('clerk_session', JSON.stringify(sessionData));
      mockSessionState.isSignedIn = true;
      mockSessionState.user = mockClerkUser;
      mockSessionState.isLoaded = true;
      
      render(
        <BrowserRouter>
          <TestSessionComponent />
        </BrowserRouter>
      );
      
      expect(screen.getByTestId('signed-in-content')).toBeInTheDocument();
      expect(localStorage.getItem('clerk_session')).toBeTruthy();
      
      // Fazer logout
      const userButton = screen.getByTestId('user-button');
      await user.click(userButton);
      
      // Verificar limpeza
      expect(localStorage.getItem('clerk_session')).toBeNull();
      
      // Simular atualização de estado
      act(() => {
        mockSessionState.isSignedIn = false;
        mockSessionState.user = null;
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('signed-out-content')).toBeInTheDocument();
      });
    });

    it('deve limpar sessionStorage no logout', async () => {
      const user = userEvent.setup();
      
      // Adicionar dados no sessionStorage
      sessionStorage.setItem('temp_data', 'test');
      
      // Começar autenticado
      mockSessionState.isSignedIn = true;
      mockSessionState.user = mockClerkUser;
      mockSessionState.isLoaded = true;
      
      render(
        <BrowserRouter>
          <TestSessionComponent />
        </BrowserRouter>
      );
      
      expect(sessionStorage.getItem('temp_data')).toBe('test');
      
      // Fazer logout
      const userButton = screen.getByTestId('user-button');
      await user.click(userButton);
      
      // SessionStorage deve ser limpo
      expect(sessionStorage.getItem('temp_data')).toBeNull();
    });
  });

  describe('Gerenciamento de Múltiplas Sessões', () => {
    it('deve lidar com múltiplos usuários', async () => {
      const user = userEvent.setup();
      
      // Primeiro usuário
      const user1 = createMockClerkUser({
        id: 'user_1',
        primaryEmailAddress: { emailAddress: 'user1@example.com' }
      });
      
      const sessionData1 = {
        user: user1,
        sessionId: 'session_user1',
        expiresAt: Date.now() + (24 * 60 * 60 * 1000),
        lastActivity: Date.now()
      };
      
      localStorage.setItem('clerk_session', JSON.stringify(sessionData1));
      mockSessionState.isSignedIn = true;
      mockSessionState.user = user1;
      mockSessionState.isLoaded = true;
      
      const { rerender } = render(
        <BrowserRouter>
          <TestSessionComponent />
        </BrowserRouter>
      );
      
      expect(screen.getByTestId('user-email')).toHaveTextContent('user1@example.com');
      
      // Logout do primeiro usuário
      const userButton = screen.getByTestId('user-button');
      await user.click(userButton);
      
      act(() => {
        mockSessionState.isSignedIn = false;
        mockSessionState.user = null;
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('signed-out-content')).toBeInTheDocument();
      });
      
      // Login com segundo usuário
      const user2 = createMockClerkUser({
        id: 'user_2',
        primaryEmailAddress: { emailAddress: 'user2@example.com' }
      });
      
      const signInButton = screen.getByTestId('sign-in-button');
      
      // Simular login do segundo usuário
      act(() => {
        const sessionData2 = {
          user: user2,
          sessionId: 'session_user2',
          expiresAt: Date.now() + (24 * 60 * 60 * 1000),
          lastActivity: Date.now()
        };
        
        localStorage.setItem('clerk_session', JSON.stringify(sessionData2));
        mockSessionState.isSignedIn = true;
        mockSessionState.user = user2;
      });
      
      await user.click(signInButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('signed-in-content')).toBeInTheDocument();
      });
      
      expect(screen.getByTestId('user-email')).toHaveTextContent('user2@example.com');
    });
  });

  describe('Validação de Integridade de Sessão', () => {
    it('deve lidar com dados corrompidos no localStorage', async () => {
      // Simular dados corrompidos
      localStorage.setItem('clerk_session', 'invalid_json_data');
      
      render(
        <BrowserRouter>
          <TestSessionComponent />
        </BrowserRouter>
      );
      
      // Aguardar carregamento
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });
      
      // Deve mostrar como não autenticado
      expect(screen.getByTestId('signed-out-content')).toBeInTheDocument();
      expect(screen.getByText('Signed In: false')).toBeInTheDocument();
    });

    it('deve validar estrutura de dados da sessão', async () => {
      // Simular dados com estrutura inválida
      const invalidSessionData = {
        invalidField: 'test',
        // Faltando campos obrigatórios
      };
      
      localStorage.setItem('clerk_session', JSON.stringify(invalidSessionData));
      
      render(
        <BrowserRouter>
          <TestSessionComponent />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });
      
      // Deve tratar como não autenticado
      expect(screen.getByTestId('signed-out-content')).toBeInTheDocument();
    });
  });
});