import { render, screen } from '@testing-library/react';
import { AuthHeader } from '@/components/auth/AuthHeader';

// Mock Clerk components
jest.mock('@clerk/clerk-react', () => ({
  SignedIn: ({ children }: { children: React.ReactNode }) => <div data-testid="signed-in">{children}</div>,
  SignedOut: ({ children }: { children: React.ReactNode }) => <div data-testid="signed-out">{children}</div>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <div data-testid="sign-in-button">{children}</div>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <div data-testid="sign-up-button">{children}</div>,
  UserButton: () => <div data-testid="user-button">User Button</div>,
}));

describe('AuthHeader', () => {
  it('renders without crashing', () => {
    render(<AuthHeader />);
    
    // Should render both SignedIn and SignedOut containers
    expect(screen.getByTestId('signed-in')).toBeInTheDocument();
    expect(screen.getByTestId('signed-out')).toBeInTheDocument();
  });

  it('renders sign in and sign up buttons for unauthenticated users', () => {
    render(<AuthHeader />);
    
    // Should render sign in and sign up buttons within SignedOut
    expect(screen.getByTestId('sign-in-button')).toBeInTheDocument();
    expect(screen.getByTestId('sign-up-button')).toBeInTheDocument();
    
    // Should render buttons with correct text
    expect(screen.getByText('Entrar')).toBeInTheDocument();
    expect(screen.getByText('Cadastrar')).toBeInTheDocument();
  });

  it('renders user button for authenticated users', () => {
    render(<AuthHeader />);
    
    // Should render UserButton within SignedIn
    expect(screen.getByTestId('user-button')).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    render(<AuthHeader />);
    
    // Check if the main container has correct classes
    const container = screen.getByTestId('signed-out').parentElement;
    expect(container).toHaveClass('flex', 'items-center', 'gap-3');
  });
});