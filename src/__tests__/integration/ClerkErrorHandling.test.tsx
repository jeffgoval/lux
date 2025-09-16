/**
 * 🧪 TESTES DE INTEGRAÇÃO - TRATAMENTO DE ERROS CLERK
 * 
 * Testes de integração para verificar tratamento de erros de autenticação,
 * recuperação de falhas e comportamento em cenários de erro
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { 
  resetMockState, 
  mockClerkUser
} from '../setup/clerk-mocks';

// Mock do Clerk com simulação de erros
let mockErrorState = {
  hasError: false,
  errorType: null as string | null,
  isLoaded: true,
  isSignedIn: false,
  user: null,
};

jest.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => {
    if (mockErrorState.hasError && mockErrorState.errorType === 'provider_error') {
      throw new Error('ClerkProvider initialization failed');
    }
    return <div data-testid="clerk-provider">{children}</div>;
  },
  
  SignedIn: ({ children }: { children: React.ReactNode }) => {
    if (mockErrorState.hasError && mockErrorState.errorType === 'auth_check_error') {
      throw new Error('Authentication check failed');
    }
    return mockErrorState.isSignedIn ? <div data-testid="signed-in">{children}</div> : null;
  },
  
  SignedOut: ({ children }: { children: React.ReactNode }) => {
    return !mockErrorState.isSignedIn ? <div data-testid="signed-out">{children}</div> : null;
  },
  
  SignInButton: ({ children, mode }: { children: React.ReactNode; mode?: string }) => (
    <button 
      data-testid="sign-in-button"
      onClick={() => {
        if (mockErrorState.hasError && mockErrorState.errorType === 'signin_error') {
          throw new Error('Sign in failed');
        }
        mockErrorState.isSignedIn = true;
        mockErrorState.user = mockClerkUser;
      }}
    >
      {children}
    </button>
  ),
  
  useAuth: () => {
    if (mockErrorState.hasError && mockErrorState.errorType === 'hook_error') {
      throw new Error('useAuth hook failed');
    }
    return {
      isSignedIn: mockErrorState.isSignedIn,
      signOut: jest.fn(),
      getToken: jest.fn(),
    };
  },
  
  useUser: () => {
    if (mockErrorState.hasError && mockErrorState.errorType === 'user_hook_error') {
      throw new Error('useUser hook failed');
    }
    return {
      isSignedIn: mockErrorState.isSignedIn,
      user: mockErrorState.user,
      isLoaded: mockErrorState.isLoaded,
    };
  },
}));

// Componente de teste com error boundary
class TestErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-boundary">
          <h2>Erro de Autenticação</h2>
          <p data-testid="error-message">{this.state.error?.message}</p>
          <button 
            data-testid="retry-button"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Componente de teste
const TestAuthComponent = () => {
  const { ClerkProvider, SignedIn, SignedOut, SignInButton, useAuth } = require('@clerk/clerk-react');
  
  try {
    const auth = useAuth();
    
    return (
      <ClerkProvider publishableKey="pk_test_mock">
        <div data-testid="auth-component">
          <SignedOut>
            <div data-testid="signed-out-content">
              <SignInButton mode="modal">
                <button>Entrar</button>
              </SignInButton>
            </div>
          </SignedOut>
          
          <SignedIn>
            <div data-testid="signed-in-content">
              <p>Usuário autenticado</p>
            </div>
          </SignedIn>
        </div>
      </ClerkProvider>
    );
  } catch (error) {
    throw error;
  }
};

describe('Clerk Error Handling Integration', () => {
  beforeEach(() => {
    resetMockState();
    mockErrorState = {
      hasError: false,
      errorType: null,
      isLoaded: true,
      isSignedIn: false,
      user: null,
    };
  });

  describe('Erros de Inicialização', () => {
    it('deve capturar erros do ClerkProvider', async () => {
      const onError = jest.fn();
      mockErrorState.hasError = true;
      mockErrorState.errorType = 'provider_error';
      
      render(
        <BrowserRouter>
          <TestErrorBoundary onError={onError}>
            <TestAuthComponent />
          </TestErrorBoundary>
        </BrowserRouter>
      );
      
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByText('Erro de Autenticação')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('ClerkProvider initialization failed');
      expect(onError).toHaveBeenCalled();
    });

    it('deve permitir retry após erro de inicialização', async () => {
      const user = userEvent.setup();
      mockErrorState.hasError = true;
      mockErrorState.errorType = 'provider_error';
      
      render(
        <BrowserRouter>
          <TestErrorBoundary>
            <TestAuthComponent />
          </TestErrorBoundary>
        </BrowserRouter>
      );
      
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      
      // Limpar erro e tentar novamente
      mockErrorState.hasError = false;
      mockErrorState.errorType = null;
      
      const retryButton = screen.getByTestId('retry-button');
      await user.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-component')).toBeInTheDocument();
      });
    });
  });
}); 
 describe('Erros de Hooks', () => {
    it('deve capturar erros do useAuth hook', async () => {
      const onError = jest.fn();
      mockErrorState.hasError = true;
      mockErrorState.errorType = 'hook_error';
      
      render(
        <BrowserRouter>
          <TestErrorBoundary onError={onError}>
            <TestAuthComponent />
          </TestErrorBoundary>
        </BrowserRouter>
      );
      
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('useAuth hook failed');
      expect(onError).toHaveBeenCalled();
    });

    it('deve capturar erros do useUser hook', async () => {
      const onError = jest.fn();
      mockErrorState.hasError = true;
      mockErrorState.errorType = 'user_hook_error';
      
      render(
        <BrowserRouter>
          <TestErrorBoundary onError={onError}>
            <TestAuthComponent />
          </TestErrorBoundary>
        </BrowserRouter>
      );
      
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('useUser hook failed');
    });
  });

  describe('Erros de Autenticação', () => {
    it('deve capturar erros durante sign-in', async () => {
      const user = userEvent.setup();
      const onError = jest.fn();
      
      render(
        <BrowserRouter>
          <TestErrorBoundary onError={onError}>
            <TestAuthComponent />
          </TestErrorBoundary>
        </BrowserRouter>
      );
      
      expect(screen.getByTestId('signed-out-content')).toBeInTheDocument();
      
      // Configurar erro de sign-in
      mockErrorState.hasError = true;
      mockErrorState.errorType = 'signin_error';
      
      const signInButton = screen.getByTestId('sign-in-button');
      await user.click(signInButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });
      
      expect(screen.getByTestId('error-message')).toHaveTextContent('Sign in failed');
    });

    it('deve capturar erros de verificação de autenticação', async () => {
      const onError = jest.fn();
      mockErrorState.hasError = true;
      mockErrorState.errorType = 'auth_check_error';
      
      render(
        <BrowserRouter>
          <TestErrorBoundary onError={onError}>
            <TestAuthComponent />
          </TestErrorBoundary>
        </BrowserRouter>
      );
      
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('Authentication check failed');
    });
  });

  describe('Recuperação de Erros', () => {
    it('deve permitir recuperação após múltiplos erros', async () => {
      const user = userEvent.setup();
      
      // Primeiro erro
      mockErrorState.hasError = true;
      mockErrorState.errorType = 'provider_error';
      
      const { rerender } = render(
        <BrowserRouter>
          <TestErrorBoundary>
            <TestAuthComponent />
          </TestErrorBoundary>
        </BrowserRouter>
      );
      
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      
      // Tentar recuperar mas com outro erro
      mockErrorState.errorType = 'hook_error';
      
      const retryButton = screen.getByTestId('retry-button');
      await user.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      });
      
      expect(screen.getByTestId('error-message')).toHaveTextContent('useAuth hook failed');
      
      // Finalmente recuperar com sucesso
      mockErrorState.hasError = false;
      mockErrorState.errorType = null;
      
      await user.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-component')).toBeInTheDocument();
      });
    });

    it('deve manter estado de erro até recuperação explícita', async () => {
      mockErrorState.hasError = true;
      mockErrorState.errorType = 'provider_error';
      
      const { rerender } = render(
        <BrowserRouter>
          <TestErrorBoundary>
            <TestAuthComponent />
          </TestErrorBoundary>
        </BrowserRouter>
      );
      
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      
      // Re-render sem limpar erro
      rerender(
        <BrowserRouter>
          <TestErrorBoundary>
            <TestAuthComponent />
          </TestErrorBoundary>
        </BrowserRouter>
      );
      
      // Deve manter estado de erro
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    });
  });

  describe('Estados de Loading com Erros', () => {
    it('deve lidar com erros durante carregamento', async () => {
      const onError = jest.fn();
      mockErrorState.isLoaded = false;
      mockErrorState.hasError = true;
      mockErrorState.errorType = 'hook_error';
      
      render(
        <BrowserRouter>
          <TestErrorBoundary onError={onError}>
            <TestAuthComponent />
          </TestErrorBoundary>
        </BrowserRouter>
      );
      
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(onError).toHaveBeenCalled();
    });

    it('deve recuperar após carregamento com erro', async () => {
      const user = userEvent.setup();
      mockErrorState.isLoaded = false;
      mockErrorState.hasError = true;
      mockErrorState.errorType = 'user_hook_error';
      
      render(
        <BrowserRouter>
          <TestErrorBoundary>
            <TestAuthComponent />
          </TestErrorBoundary>
        </BrowserRouter>
      );
      
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      
      // Simular carregamento completo sem erro
      mockErrorState.isLoaded = true;
      mockErrorState.hasError = false;
      mockErrorState.errorType = null;
      
      const retryButton = screen.getByTestId('retry-button');
      await user.click(retryButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('auth-component')).toBeInTheDocument();
      });
    });
  });
});