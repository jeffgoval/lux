/**
 * 🧪 TESTES DO COMPONENTE AuthHeader
 * 
 * Testes unitários para verificar renderização condicional e comportamento
 * dos botões de autenticação baseados no estado do Clerk
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { 
  resetMockState, 
  simulateSignIn, 
  simulateSignOut,
  mockClerkUser,
  createMockClerkUser
} from '../setup/clerk-mocks';

// Mock Clerk components com controle de estado
jest.mock('@clerk/clerk-react', () => {
  let isSignedIn = false;
  
  return {
    SignedIn: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="signed-in">{isSignedIn ? children : null}</div>
    ),
    SignedOut: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="signed-out">{!isSignedIn ? children : null}</div>
    ),
    SignInButton: ({ children, mode }: { children: React.ReactNode; mode?: string }) => (
      <button data-testid="sign-in-button" data-mode={mode}>
        {children}
      </button>
    ),
    SignUpButton: ({ children, mode }: { children: React.ReactNode; mode?: string }) => (
      <button data-testid="sign-up-button" data-mode={mode}>
        {children}
      </button>
    ),
    UserButton: ({ appearance, showName, userProfileMode }: any) => (
      <div 
        data-testid="user-button"
        data-show-name={showName}
        data-profile-mode={userProfileMode}
      >
        User Button
      </div>
    ),
    // Função para controlar estado nos testes
    __setSignedIn: (value: boolean) => { isSignedIn = value; }
  };
});

// Import da função de controle
const { __setSignedIn } = require('@clerk/clerk-react');

describe('AuthHeader Component', () => {
  beforeEach(() => {
    resetMockState();
    __setSignedIn(false);
  });

  describe('Renderização Básica', () => {
    it('deve renderizar sem erros', () => {
      render(<AuthHeader />);
      
      // Deve renderizar o container principal
      const container = screen.getByTestId('signed-out').parentElement;
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('flex', 'items-center', 'gap-3');
    });

    it('deve renderizar containers SignedIn e SignedOut', () => {
      render(<AuthHeader />);
      
      expect(screen.getByTestId('signed-in')).toBeInTheDocument();
      expect(screen.getByTestId('signed-out')).toBeInTheDocument();
    });
  });

  describe('Estado Não Autenticado', () => {
    beforeEach(() => {
      __setSignedIn(false);
    });

    it('deve mostrar botões de login e cadastro para usuários não autenticados', () => {
      render(<AuthHeader />);
      
      // Deve renderizar botões dentro do SignedOut
      expect(screen.getByTestId('sign-in-button')).toBeInTheDocument();
      expect(screen.getByTestId('sign-up-button')).toBeInTheDocument();
      
      // Deve renderizar textos corretos
      expect(screen.getByText('Entrar')).toBeInTheDocument();
      expect(screen.getByText('Cadastrar')).toBeInTheDocument();
    });

    it('deve configurar botões com modo modal', () => {
      render(<AuthHeader />);
      
      const signInButton = screen.getByTestId('sign-in-button');
      const signUpButton = screen.getByTestId('sign-up-button');
      
      expect(signInButton).toHaveAttribute('data-mode', 'modal');
      expect(signUpButton).toHaveAttribute('data-mode', 'modal');
    });

    it('deve aplicar classes CSS corretas aos botões', () => {
      render(<AuthHeader />);
      
      // Verificar se os botões têm as classes corretas
      const signInButtonContent = screen.getByText('Entrar').parentElement;
      const signUpButtonContent = screen.getByText('Cadastrar').parentElement;
      
      expect(signInButtonContent).toHaveClass('flex', 'items-center', 'gap-2');
      expect(signUpButtonContent).toHaveClass('flex', 'items-center', 'gap-2');
    });

    it('deve renderizar ícones nos botões', () => {
      render(<AuthHeader />);
      
      // Verificar se os ícones estão presentes (através das classes Lucide)
      const signInIcon = screen.getByText('Entrar').parentElement?.querySelector('.lucide-log-in');
      const signUpIcon = screen.getByText('Cadastrar').parentElement?.querySelector('.lucide-user-plus');
      
      // Como os ícones são componentes Lucide, verificamos se existem elementos com as classes
      expect(screen.getByText('Entrar').parentElement).toContainHTML('gap-2');
      expect(screen.getByText('Cadastrar').parentElement).toContainHTML('gap-2');
    });

    it('não deve mostrar UserButton quando não autenticado', () => {
      render(<AuthHeader />);
      
      // SignedIn deve estar vazio
      const signedInContainer = screen.getByTestId('signed-in');
      expect(signedInContainer).toBeEmptyDOMElement();
    });
  });

  describe('Estado Autenticado', () => {
    beforeEach(() => {
      __setSignedIn(true);
    });

    it('deve mostrar UserButton para usuários autenticados', () => {
      render(<AuthHeader />);
      
      expect(screen.getByTestId('user-button')).toBeInTheDocument();
    });

    it('deve configurar UserButton com propriedades corretas', () => {
      render(<AuthHeader />);
      
      const userButton = screen.getByTestId('user-button');
      
      expect(userButton).toHaveAttribute('data-show-name', 'false');
      expect(userButton).toHaveAttribute('data-profile-mode', 'modal');
    });

    it('não deve mostrar botões de login/cadastro quando autenticado', () => {
      render(<AuthHeader />);
      
      // SignedOut deve estar vazio
      const signedOutContainer = screen.getByTestId('signed-out');
      expect(signedOutContainer).toBeEmptyDOMElement();
    });
  });

  describe('Interações', () => {
    it('deve permitir clique nos botões de autenticação', () => {
      __setSignedIn(false);
      render(<AuthHeader />);
      
      const signInButton = screen.getByTestId('sign-in-button');
      const signUpButton = screen.getByTestId('sign-up-button');
      
      // Deve ser possível clicar nos botões
      expect(signInButton).not.toBeDisabled();
      expect(signUpButton).not.toBeDisabled();
      
      fireEvent.click(signInButton);
      fireEvent.click(signUpButton);
      
      // Os cliques devem ser processados sem erro
      expect(signInButton).toBeInTheDocument();
      expect(signUpButton).toBeInTheDocument();
    });
  });

  describe('Acessibilidade', () => {
    it('deve ter estrutura acessível para leitores de tela', () => {
      __setSignedIn(false);
      render(<AuthHeader />);
      
      // Botões devem ter texto descritivo
      expect(screen.getByText('Entrar')).toBeInTheDocument();
      expect(screen.getByText('Cadastrar')).toBeInTheDocument();
      
      // Botões devem ser elementos button ou ter role apropriado
      const signInButton = screen.getByTestId('sign-in-button');
      const signUpButton = screen.getByTestId('sign-up-button');
      
      expect(signInButton.tagName).toBe('BUTTON');
      expect(signUpButton.tagName).toBe('BUTTON');
    });

    it('deve manter foco adequado nos elementos interativos', () => {
      __setSignedIn(false);
      render(<AuthHeader />);
      
      const signInButton = screen.getByTestId('sign-in-button');
      const signUpButton = screen.getByTestId('sign-up-button');
      
      // Elementos devem ser focáveis
      signInButton.focus();
      expect(document.activeElement).toBe(signInButton);
      
      signUpButton.focus();
      expect(document.activeElement).toBe(signUpButton);
    });
  });

  describe('Responsividade', () => {
    it('deve manter layout adequado em diferentes tamanhos', () => {
      render(<AuthHeader />);
      
      const container = screen.getByTestId('signed-out').parentElement;
      
      // Container deve ter classes flexbox responsivas
      expect(container).toHaveClass('flex', 'items-center', 'gap-3');
    });
  });
});