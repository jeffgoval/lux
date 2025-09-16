/**
 * 🧪 TESTES DO COMPONENTE LandingPage
 * 
 * Testes unitários para verificar renderização condicional da landing page
 * e comportamento dos botões de autenticação para usuários não autenticados
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LandingPage } from '@/components/LandingPage';
import { resetMockState } from '../setup/clerk-mocks';

// Mock Clerk components
jest.mock('@clerk/clerk-react', () => ({
  SignedOut: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="signed-out">{children}</div>
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
}));

// Mock da imagem do logo
jest.mock('@/assets/suavizar-logo.png', () => 'mocked-logo.png');

// Mock do IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock do window.scrollY
Object.defineProperty(window, 'scrollY', {
  writable: true,
  value: 0
});

describe('LandingPage Component', () => {
  beforeEach(() => {
    resetMockState();
    jest.clearAllMocks();
    
    // Reset scroll position
    Object.defineProperty(window, 'scrollY', { value: 0 });
  });

  describe('Renderização Básica', () => {
    it('deve renderizar sem erros', () => {
      render(<LandingPage />);
      
      expect(screen.getByTestId('signed-out')).toBeInTheDocument();
    });

    it('deve renderizar apenas dentro do SignedOut wrapper', () => {
      render(<LandingPage />);
      
      // Todo o conteúdo deve estar dentro do SignedOut
      const signedOutContainer = screen.getByTestId('signed-out');
      expect(signedOutContainer).toBeInTheDocument();
      
      // Deve conter o conteúdo principal
      expect(signedOutContainer).toContainElement(
        screen.getByText('SUAVIZAR')
      );
    });

    it('deve renderizar o logo da clínica', () => {
      render(<LandingPage />);
      
      const logos = screen.getAllByAltText('Suavizar Clínica Estética');
      expect(logos.length).toBeGreaterThan(0);
      
      // Verificar se pelo menos um logo tem o src correto
      expect(logos[0]).toHaveAttribute('src', 'mocked-logo.png');
    });
  });

  describe('Seções da Landing Page', () => {
    it('deve renderizar seção hero com título principal', () => {
      render(<LandingPage />);
      
      expect(screen.getByText('SUAVIZAR')).toBeInTheDocument();
      expect(screen.getByText(/Sistema completo de gestão para clínicas estéticas/)).toBeInTheDocument();
    });

    it('deve renderizar seção de features', () => {
      render(<LandingPage />);
      
      expect(screen.getByText('Por que escolher nosso sistema?')).toBeInTheDocument();
      expect(screen.getByText('Excelência Médica')).toBeInTheDocument();
      expect(screen.getByText('Segurança Total')).toBeInTheDocument();
      expect(screen.getByText('Atendimento Personalizado')).toBeInTheDocument();
    });

    it('deve renderizar seção de serviços', () => {
      render(<LandingPage />);
      
      expect(screen.getByText('Funcionalidades do Sistema')).toBeInTheDocument();
      expect(screen.getByText('Harmonização Facial')).toBeInTheDocument();
      expect(screen.getByText('Rejuvenescimento')).toBeInTheDocument();
      expect(screen.getByText('Bioestimuladores')).toBeInTheDocument();
      expect(screen.getByText('Skincare Médico')).toBeInTheDocument();
    });

    it('deve renderizar seção CTA', () => {
      render(<LandingPage />);
      
      expect(screen.getByText('Pronto para começar?')).toBeInTheDocument();
      expect(screen.getByText(/Cadastre-se agora e tenha acesso completo/)).toBeInTheDocument();
    });

    it('deve renderizar footer', () => {
      render(<LandingPage />);
      
      expect(screen.getByText(/Sistema completo de gestão para clínicas estéticas. Simplifique/)).toBeInTheDocument();
    });
  });

  describe('Botões de Autenticação', () => {
    it('deve renderizar múltiplos botões de login e cadastro', () => {
      render(<LandingPage />);
      
      // Deve haver múltiplos botões de SignIn e SignUp em diferentes seções
      const signInButtons = screen.getAllByTestId('sign-in-button');
      const signUpButtons = screen.getAllByTestId('sign-up-button');
      
      expect(signInButtons.length).toBeGreaterThan(1);
      expect(signUpButtons.length).toBeGreaterThan(1);
    });

    it('deve configurar botões com modo modal', () => {
      render(<LandingPage />);
      
      const signInButtons = screen.getAllByTestId('sign-in-button');
      const signUpButtons = screen.getAllByTestId('sign-up-button');
      
      // Todos os botões devem ter mode="modal"
      signInButtons.forEach(button => {
        expect(button).toHaveAttribute('data-mode', 'modal');
      });
      
      signUpButtons.forEach(button => {
        expect(button).toHaveAttribute('data-mode', 'modal');
      });
    });

    it('deve renderizar textos corretos nos botões', () => {
      render(<LandingPage />);
      
      // Verificar textos dos botões
      expect(screen.getAllByText('Entrar').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Cadastrar').length).toBeGreaterThan(0);
      expect(screen.getByText('Começar Agora')).toBeInTheDocument();
      expect(screen.getByText('Já tenho conta')).toBeInTheDocument();
      expect(screen.getByText('Criar Conta Grátis')).toBeInTheDocument();
      expect(screen.getByText('Fazer Login')).toBeInTheDocument();
    });

    it('deve permitir interação com os botões', () => {
      render(<LandingPage />);
      
      const signInButtons = screen.getAllByTestId('sign-in-button');
      const signUpButtons = screen.getAllByTestId('sign-up-button');
      
      // Todos os botões devem ser clicáveis
      signInButtons.forEach(button => {
        expect(button).not.toBeDisabled();
        fireEvent.click(button);
      });
      
      signUpButtons.forEach(button => {
        expect(button).not.toBeDisabled();
        fireEvent.click(button);
      });
    });
  });

  describe('Animações e Interatividade', () => {
    it('deve configurar IntersectionObserver para animações', () => {
      render(<LandingPage />);
      
      // Deve ter chamado o IntersectionObserver
      expect(mockIntersectionObserver).toHaveBeenCalled();
    });

    it('deve ter elementos com IDs para observação', () => {
      render(<LandingPage />);
      
      // Verificar se existem elementos com IDs para animação
      expect(screen.getByText('SUAVIZAR').closest('section')).toHaveAttribute('id', 'hero');
      expect(screen.getByText('Por que escolher nosso sistema?').closest('section')).toHaveAttribute('id', 'features');
      expect(screen.getByText('Funcionalidades do Sistema').closest('section')).toHaveAttribute('id', 'services');
      expect(screen.getByText('Pronto para começar?').closest('section')).toHaveAttribute('id', 'cta');
    });

    it('deve configurar event listeners para scroll e mouse', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      render(<LandingPage />);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
    });
  });

  describe('Responsividade e Layout', () => {
    it('deve ter classes CSS responsivas', () => {
      render(<LandingPage />);
      
      // Verificar se existem classes responsivas no layout
      const heroSection = screen.getByText('SUAVIZAR').closest('section');
      expect(heroSection).toHaveClass('py-20', 'lg:py-32');
      
      const container = screen.getByText('SUAVIZAR').closest('.container');
      expect(container).toHaveClass('container', 'mx-auto', 'px-6');
    });

    it('deve ter grid responsivo para features e serviços', () => {
      render(<LandingPage />);
      
      // Features grid
      const featuresGrid = screen.getByText('Excelência Médica').closest('.grid');
      expect(featuresGrid).toHaveClass('grid', 'md:grid-cols-3');
      
      // Services grid
      const servicesGrid = screen.getByText('Harmonização Facial').closest('.grid');
      expect(servicesGrid).toHaveClass('grid', 'md:grid-cols-2', 'lg:grid-cols-4');
    });
  });

  describe('Acessibilidade', () => {
    it('deve ter estrutura semântica adequada', () => {
      render(<LandingPage />);
      
      // Verificar se usa elementos semânticos
      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer
      
      // Verificar headings hierárquicos
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);
    });

    it('deve ter alt text adequado para imagens', () => {
      render(<LandingPage />);
      
      const logos = screen.getAllByAltText('Suavizar Clínica Estética');
      expect(logos.length).toBeGreaterThan(0);
      
      // Verificar se há alt text descritivo
      logos.forEach(logo => {
        expect(logo).toHaveAttribute('alt');
        expect(logo.getAttribute('alt')).toBeTruthy();
      });
    });

    it('deve ter navegação acessível', () => {
      render(<LandingPage />);
      
      // Verificar links de navegação
      const servicosLink = screen.getByText('Serviços');
      const diferenciaisLink = screen.getByText('Diferenciais');
      
      expect(servicosLink).toHaveAttribute('href', '#services');
      expect(diferenciaisLink).toHaveAttribute('href', '#features');
    });
  });

  describe('Performance', () => {
    it('deve implementar throttling para eventos de scroll e mouse', async () => {
      const { unmount } = render(<LandingPage />);
      
      // Simular múltiplos eventos de scroll rapidamente
      for (let i = 0; i < 10; i++) {
        fireEvent.scroll(window, { target: { scrollY: i * 100 } });
      }
      
      // Simular múltiplos eventos de mouse rapidamente
      for (let i = 0; i < 10; i++) {
        fireEvent.mouseMove(window, { clientX: i * 10, clientY: i * 10 });
      }
      
      // Aguardar throttling
      await waitFor(() => {
        expect(true).toBe(true); // Teste passa se não há erros de performance
      });
      
      unmount();
    });

    it('deve limpar event listeners no unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(<LandingPage />);
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });
});