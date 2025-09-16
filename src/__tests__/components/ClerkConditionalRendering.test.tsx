/**
 * 🧪 TESTES DE RENDERIZAÇÃO CONDICIONAL CLERK
 * 
 * Testes unitários para verificar comportamento dos componentes
 * SignedIn e SignedOut em diferentes estados de autenticação
 */

import { render, screen, act } from '@testing-library/react';
import { 
  resetMockState, 
  simulateSignIn, 
  simulateSignOut,
  simulateLoading,
  simulateLoadingComplete,
  mockClerkUser,
  createMockClerkUser
} from '../setup/clerk-mocks';

// Componente de teste para renderização condicional
const TestConditionalComponent = () => {
  const { SignedIn, SignedOut } = require('@clerk/clerk-react');
  
  return (
    <div>
      <SignedIn>
        <div data-testid="authenticated-content">
          <h1>Área Autenticada</h1>
          <p>Bem-vindo, usuário logado!</p>
        </div>
      </SignedIn>
      
      <SignedOut>
        <div data-testid="unauthenticated-content">
          <h1>Área Pública</h1>
          <p>Faça login para continuar</p>
        </div>
      </SignedOut>
    </div>
  );
};

// Mock dinâmico do Clerk
let mockIsSignedIn = false;
let mockIsLoaded = true;
let mockUser = null;

jest.mock('@clerk/clerk-react', () => ({
  SignedIn: ({ children }: { children: React.ReactNode }) => (
    mockIsSignedIn ? <div data-testid="signed-in-wrapper">{children}</div> : null
  ),
  SignedOut: ({ children }: { children: React.ReactNode }) => (
    !mockIsSignedIn ? <div data-testid="signed-out-wrapper">{children}</div> : null
  ),
  useAuth: () => ({
    isSignedIn: mockIsSignedIn,
    signOut: jest.fn(),
    getToken: jest.fn(),
  }),
  useUser: () => ({
    isSignedIn: mockIsSignedIn,
    user: mockUser,
    isLoaded: mockIsLoaded,
  }),
}));

describe('Clerk Conditional Rendering', () => {
  beforeEach(() => {
    resetMockState();
    mockIsSignedIn = false;
    mockIsLoaded = true;
    mockUser = null;
  });

  describe('Estado Não Autenticado', () => {
    it('deve mostrar apenas conteúdo SignedOut quando não autenticado', () => {
      mockIsSignedIn = false;
      
      render(<TestConditionalComponent />);
      
      // Deve mostrar conteúdo não autenticado
      expect(screen.getByTestId('unauthenticated-content')).toBeInTheDocument();
      expect(screen.getByText('Área Pública')).toBeInTheDocument();
      expect(screen.getByText('Faça login para continuar')).toBeInTheDocument();
      
      // Não deve mostrar conteúdo autenticado
      expect(screen.queryByTestId('authenticated-content')).not.toBeInTheDocument();
      expect(screen.queryByText('Área Autenticada')).not.toBeInTheDocument();
    });

    it('deve renderizar wrapper SignedOut corretamente', () => {
      mockIsSignedIn = false;
      
      render(<TestConditionalComponent />);
      
      expect(screen.getByTestId('signed-out-wrapper')).toBeInTheDocument();
      expect(screen.queryByTestId('signed-in-wrapper')).not.toBeInTheDocument();
    });
  });

  describe('Estado Autenticado', () => {
    it('deve mostrar apenas conteúdo SignedIn quando autenticado', () => {
      mockIsSignedIn = true;
      mockUser = mockClerkUser;
      
      render(<TestConditionalComponent />);
      
      // Deve mostrar conteúdo autenticado
      expect(screen.getByTestId('authenticated-content')).toBeInTheDocument();
      expect(screen.getByText('Área Autenticada')).toBeInTheDocument();
      expect(screen.getByText('Bem-vindo, usuário logado!')).toBeInTheDocument();
      
      // Não deve mostrar conteúdo não autenticado
      expect(screen.queryByTestId('unauthenticated-content')).not.toBeInTheDocument();
      expect(screen.queryByText('Área Pública')).not.toBeInTheDocument();
    });

    it('deve renderizar wrapper SignedIn corretamente', () => {
      mockIsSignedIn = true;
      mockUser = mockClerkUser;
      
      render(<TestConditionalComponent />);
      
      expect(screen.getByTestId('signed-in-wrapper')).toBeInTheDocument();
      expect(screen.queryByTestId('signed-out-wrapper')).not.toBeInTheDocument();
    });
  });

  describe('Transições de Estado', () => {
    it('deve alternar conteúdo quando estado de autenticação muda', () => {
      // Começar não autenticado
      mockIsSignedIn = false;
      const { rerender } = render(<TestConditionalComponent />);
      
      expect(screen.getByTestId('unauthenticated-content')).toBeInTheDocument();
      expect(screen.queryByTestId('authenticated-content')).not.toBeInTheDocument();
      
      // Simular login
      mockIsSignedIn = true;
      mockUser = mockClerkUser;
      rerender(<TestConditionalComponent />);
      
      expect(screen.getByTestId('authenticated-content')).toBeInTheDocument();
      expect(screen.queryByTestId('unauthenticated-content')).not.toBeInTheDocument();
      
      // Simular logout
      mockIsSignedIn = false;
      mockUser = null;
      rerender(<TestConditionalComponent />);
      
      expect(screen.getByTestId('unauthenticated-content')).toBeInTheDocument();
      expect(screen.queryByTestId('authenticated-content')).not.toBeInTheDocument();
    });
  });

  describe('Estados de Loading', () => {
    it('deve lidar com estado de carregamento', () => {
      mockIsSignedIn = false;
      mockIsLoaded = false;
      
      render(<TestConditionalComponent />);
      
      // Durante o loading, pode mostrar conteúdo baseado no estado atual
      // O comportamento específico depende da implementação do Clerk
      expect(screen.getByTestId('signed-out-wrapper')).toBeInTheDocument();
    });

    it('deve atualizar após carregamento completo', () => {
      mockIsSignedIn = true;
      mockIsLoaded = false;
      mockUser = null;
      
      const { rerender } = render(<TestConditionalComponent />);
      
      // Simular carregamento completo
      mockIsLoaded = true;
      mockUser = mockClerkUser;
      rerender(<TestConditionalComponent />);
      
      expect(screen.getByTestId('authenticated-content')).toBeInTheDocument();
    });
  });
});

describe('Clerk Authentication Buttons Conditional Rendering', () => {
  // Componente de teste para botões
  const TestAuthButtons = () => {
    const { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } = require('@clerk/clerk-react');
    
    return (
      <div>
        <SignedOut>
          <SignInButton mode="modal">
            <button data-testid="sign-in-btn">Entrar</button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button data-testid="sign-up-btn">Cadastrar</button>
          </SignUpButton>
        </SignedOut>
        
        <SignedIn>
          <UserButton data-testid="user-btn" />
        </SignedIn>
      </div>
    );
  };

  beforeEach(() => {
    mockIsSignedIn = false;
    mockIsLoaded = true;
    mockUser = null;
  });

  it('deve mostrar botões de login/cadastro quando não autenticado', () => {
    mockIsSignedIn = false;
    
    render(<TestAuthButtons />);
    
    expect(screen.getByTestId('sign-in-btn')).toBeInTheDocument();
    expect(screen.getByTestId('sign-up-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('user-btn')).not.toBeInTheDocument();
  });

  it('deve mostrar UserButton quando autenticado', () => {
    mockIsSignedIn = true;
    mockUser = mockClerkUser;
    
    render(<TestAuthButtons />);
    
    expect(screen.getByTestId('user-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('sign-in-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sign-up-btn')).not.toBeInTheDocument();
  });
});

describe('Nested Conditional Rendering', () => {
  // Componente com renderização condicional aninhada
  const TestNestedConditional = () => {
    const { SignedIn, SignedOut } = require('@clerk/clerk-react');
    
    return (
      <div>
        <SignedOut>
          <div data-testid="public-header">Header Público</div>
          <div data-testid="public-content">
            <SignedOut>
              <div data-testid="nested-public">Conteúdo Aninhado Público</div>
            </SignedOut>
          </div>
        </SignedOut>
        
        <SignedIn>
          <div data-testid="private-header">Header Privado</div>
          <div data-testid="private-content">
            <SignedIn>
              <div data-testid="nested-private">Conteúdo Aninhado Privado</div>
            </SignedIn>
          </div>
        </SignedIn>
      </div>
    );
  };

  it('deve lidar com componentes condicionais aninhados corretamente', () => {
    mockIsSignedIn = false;
    
    render(<TestNestedConditional />);
    
    expect(screen.getByTestId('public-header')).toBeInTheDocument();
    expect(screen.getByTestId('public-content')).toBeInTheDocument();
    expect(screen.getByTestId('nested-public')).toBeInTheDocument();
    
    expect(screen.queryByTestId('private-header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('private-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nested-private')).not.toBeInTheDocument();
  });

  it('deve alternar componentes aninhados quando estado muda', () => {
    mockIsSignedIn = false;
    const { rerender } = render(<TestNestedConditional />);
    
    expect(screen.getByTestId('nested-public')).toBeInTheDocument();
    expect(screen.queryByTestId('nested-private')).not.toBeInTheDocument();
    
    mockIsSignedIn = true;
    mockUser = mockClerkUser;
    rerender(<TestNestedConditional />);
    
    expect(screen.getByTestId('nested-private')).toBeInTheDocument();
    expect(screen.queryByTestId('nested-public')).not.toBeInTheDocument();
  });
});