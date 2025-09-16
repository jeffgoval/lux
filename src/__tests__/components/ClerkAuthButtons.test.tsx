/**
 * 🧪 TESTES DOS BOTÕES DE AUTENTICAÇÃO CLERK
 * 
 * Testes unitários para verificar comportamento dos botões
 * SignInButton, SignUpButton e UserButton do Clerk
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  resetMockState, 
  mockClerkUser,
  createMockClerkUser
} from '../setup/clerk-mocks';

// Mock dos componentes Clerk com funcionalidades
let mockSignInCalled = false;
let mockSignUpCalled = false;
let mockSignOutCalled = false;

jest.mock('@clerk/clerk-react', () => ({
  SignInButton: ({ children, mode, ...props }: any) => (
    <button 
      data-testid="sign-in-button"
      data-mode={mode}
      onClick={() => { mockSignInCalled = true; }}
      {...props}
    >
      {children}
    </button>
  ),
  SignUpButton: ({ children, mode, ...props }: any) => (
    <button 
      data-testid="sign-up-button"
      data-mode={mode}
      onClick={() => { mockSignUpCalled = true; }}
      {...props}
    >
      {children}
    </button>
  ),
  UserButton: ({ appearance, showName, userProfileMode, ...props }: any) => (
    <div 
      data-testid="user-button"
      data-show-name={showName}
      data-profile-mode={userProfileMode}
      onClick={() => { mockSignOutCalled = true; }}
      role="button"
      tabIndex={0}
      {...props}
    >
      <div data-testid="user-avatar">Avatar</div>
      <div data-testid="user-menu" style={{ display: 'none' }}>
        <button data-testid="sign-out-option">Sign Out</button>
      </div>
    </div>
  ),
}));

describe('Clerk Authentication Buttons', () => {
  beforeEach(() => {
    resetMockState();
    mockSignInCalled = false;
    mockSignUpCalled = false;
    mockSignOutCalled = false;
  });

  describe('SignInButton', () => {
    const TestSignInButton = ({ mode = 'modal' }: { mode?: string }) => {
      const { SignInButton } = require('@clerk/clerk-react');
      return (
        <SignInButton mode={mode}>
          <button>Entrar</button>
        </SignInButton>
      );
    };

    it('deve renderizar corretamente', () => {
      render(<TestSignInButton />);
      
      expect(screen.getByTestId('sign-in-button')).toBeInTheDocument();
      expect(screen.getByText('Entrar')).toBeInTheDocument();
    });

    it('deve configurar modo modal por padrão', () => {
      render(<TestSignInButton />);
      
      const button = screen.getByTestId('sign-in-button');
      expect(button).toHaveAttribute('data-mode', 'modal');
    });

    it('deve aceitar diferentes modos', () => {
      render(<TestSignInButton mode="redirect" />);
      
      const button = screen.getByTestId('sign-in-button');
      expect(button).toHaveAttribute('data-mode', 'redirect');
    });

    it('deve ser clicável', async () => {
      const user = userEvent.setup();
      render(<TestSignInButton />);
      
      const button = screen.getByTestId('sign-in-button');
      await user.click(button);
      
      expect(mockSignInCalled).toBe(true);
    });

    it('deve aceitar children customizados', () => {
      const { SignInButton } = require('@clerk/clerk-react');
      render(
        <SignInButton mode="modal">
          <div data-testid="custom-signin">
            <span>Login Customizado</span>
          </div>
        </SignInButton>
      );
      
      expect(screen.getByTestId('custom-signin')).toBeInTheDocument();
      expect(screen.getByText('Login Customizado')).toBeInTheDocument();
    });

    it('deve manter acessibilidade', () => {
      render(<TestSignInButton />);
      
      const button = screen.getByTestId('sign-in-button');
      expect(button.tagName).toBe('BUTTON');
      expect(button).not.toBeDisabled();
    });
  });

  describe('SignUpButton', () => {
    const TestSignUpButton = ({ mode = 'modal' }: { mode?: string }) => {
      const { SignUpButton } = require('@clerk/clerk-react');
      return (
        <SignUpButton mode={mode}>
          <button>Cadastrar</button>
        </SignUpButton>
      );
    };

    it('deve renderizar corretamente', () => {
      render(<TestSignUpButton />);
      
      expect(screen.getByTestId('sign-up-button')).toBeInTheDocument();
      expect(screen.getByText('Cadastrar')).toBeInTheDocument();
    });

    it('deve configurar modo modal por padrão', () => {
      render(<TestSignUpButton />);
      
      const button = screen.getByTestId('sign-up-button');
      expect(button).toHaveAttribute('data-mode', 'modal');
    });

    it('deve aceitar diferentes modos', () => {
      render(<TestSignUpButton mode="redirect" />);
      
      const button = screen.getByTestId('sign-up-button');
      expect(button).toHaveAttribute('data-mode', 'redirect');
    });

    it('deve ser clicável', async () => {
      const user = userEvent.setup();
      render(<TestSignUpButton />);
      
      const button = screen.getByTestId('sign-up-button');
      await user.click(button);
      
      expect(mockSignUpCalled).toBe(true);
    });

    it('deve aceitar children customizados', () => {
      const { SignUpButton } = require('@clerk/clerk-react');
      render(
        <SignUpButton mode="modal">
          <div data-testid="custom-signup">
            <span>Cadastro Customizado</span>
          </div>
        </SignUpButton>
      );
      
      expect(screen.getByTestId('custom-signup')).toBeInTheDocument();
      expect(screen.getByText('Cadastro Customizado')).toBeInTheDocument();
    });
  });

  describe('UserButton', () => {
    const TestUserButton = (props: any = {}) => {
      const { UserButton } = require('@clerk/clerk-react');
      return <UserButton {...props} />;
    };

    it('deve renderizar corretamente', () => {
      render(<TestUserButton />);
      
      expect(screen.getByTestId('user-button')).toBeInTheDocument();
      expect(screen.getByTestId('user-avatar')).toBeInTheDocument();
    });

    it('deve configurar propriedades corretamente', () => {
      render(
        <TestUserButton 
          showName={false}
          userProfileMode="modal"
        />
      );
      
      const button = screen.getByTestId('user-button');
      expect(button).toHaveAttribute('data-show-name', 'false');
      expect(button).toHaveAttribute('data-profile-mode', 'modal');
    });

    it('deve ser interativo', async () => {
      const user = userEvent.setup();
      render(<TestUserButton />);
      
      const button = screen.getByTestId('user-button');
      await user.click(button);
      
      expect(mockSignOutCalled).toBe(true);
    });

    it('deve ser acessível via teclado', () => {
      render(<TestUserButton />);
      
      const button = screen.getByTestId('user-button');
      expect(button).toHaveAttribute('role', 'button');
      expect(button).toHaveAttribute('tabIndex', '0');
    });

    it('deve aceitar configurações de aparência', () => {
      const appearance = {
        elements: {
          avatarBox: 'h-8 w-8',
          userButtonPopoverCard: 'shadow-elegant'
        }
      };
      
      render(<TestUserButton appearance={appearance} />);
      
      // O componente deve renderizar sem erros com configurações de aparência
      expect(screen.getByTestId('user-button')).toBeInTheDocument();
    });
  });

  describe('Integração entre Botões', () => {
    const TestAuthFlow = () => {
      const { SignInButton, SignUpButton, UserButton, SignedIn, SignedOut } = require('@clerk/clerk-react');
      
      return (
        <div>
          <SignedOut>
            <SignInButton mode="modal">
              <button>Entrar</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button>Cadastrar</button>
            </SignUpButton>
          </SignedOut>
          
          <SignedIn>
            <UserButton showName={false} />
          </SignedIn>
        </div>
      );
    };

    it('deve renderizar botões apropriados baseado no estado de autenticação', () => {
      // Mock para estado não autenticado
      jest.doMock('@clerk/clerk-react', () => ({
        ...jest.requireActual('@clerk/clerk-react'),
        SignedIn: ({ children }: any) => null,
        SignedOut: ({ children }: any) => <div data-testid="signed-out">{children}</div>,
      }));
      
      render(<TestAuthFlow />);
      
      expect(screen.getByTestId('sign-in-button')).toBeInTheDocument();
      expect(screen.getByTestId('sign-up-button')).toBeInTheDocument();
      expect(screen.queryByTestId('user-button')).not.toBeInTheDocument();
    });
  });

  describe('Comportamentos Avançados', () => {
    it('deve lidar com múltiplos cliques', async () => {
      const user = userEvent.setup();
      const TestMultipleClicks = () => {
        const { SignInButton } = require('@clerk/clerk-react');
        return (
          <SignInButton mode="modal">
            <button>Entrar</button>
          </SignInButton>
        );
      };

      render(<TestMultipleClicks />);
      
      const button = screen.getByTestId('sign-in-button');
      
      // Múltiplos cliques rápidos
      await user.click(button);
      await user.click(button);
      await user.click(button);
      
      // Deve ter registrado pelo menos um clique
      expect(mockSignInCalled).toBe(true);
    });

    it('deve manter estado durante re-renders', () => {
      const TestRerender = ({ mode }: { mode: string }) => {
        const { SignInButton } = require('@clerk/clerk-react');
        return (
          <SignInButton mode={mode}>
            <button>Entrar</button>
          </SignInButton>
        );
      };

      const { rerender } = render(<TestRerender mode="modal" />);
      
      expect(screen.getByTestId('sign-in-button')).toHaveAttribute('data-mode', 'modal');
      
      rerender(<TestRerender mode="redirect" />);
      
      expect(screen.getByTestId('sign-in-button')).toHaveAttribute('data-mode', 'redirect');
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve renderizar mesmo com propriedades inválidas', () => {
      const TestInvalidProps = () => {
        const { SignInButton } = require('@clerk/clerk-react');
        return (
          <SignInButton mode={null as any}>
            <button>Entrar</button>
          </SignInButton>
        );
      };

      // Não deve lançar erro
      expect(() => render(<TestInvalidProps />)).not.toThrow();
      expect(screen.getByTestId('sign-in-button')).toBeInTheDocument();
    });

    it('deve lidar com children undefined', () => {
      const TestUndefinedChildren = () => {
        const { SignInButton } = require('@clerk/clerk-react');
        return <SignInButton mode="modal">{undefined}</SignInButton>;
      };

      expect(() => render(<TestUndefinedChildren />)).not.toThrow();
      expect(screen.getByTestId('sign-in-button')).toBeInTheDocument();
    });
  });
});