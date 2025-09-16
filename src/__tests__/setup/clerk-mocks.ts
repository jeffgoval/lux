/**
 * 🧪 CLERK MOCKS SETUP
 * 
 * Configuração centralizada de mocks para @clerk/clerk-react
 * Usado em todos os testes que envolvem componentes Clerk
 */

import { jest } from '@jest/globals';

// Tipos para os mocks
export interface MockClerkUser {
  id: string;
  firstName?: string;
  lastName?: string;
  primaryEmailAddress?: {
    emailAddress: string;
  };
  primaryPhoneNumber?: {
    phoneNumber: string;
  };
  imageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MockClerkAuth {
  isSignedIn: boolean;
  signOut: jest.MockedFunction<() => Promise<void>>;
  getToken: jest.MockedFunction<() => Promise<string | null>>;
}

export interface MockClerkUser {
  isSignedIn: boolean;
  user: MockClerkUser | null;
  isLoaded: boolean;
}

// Estado global dos mocks
let mockAuthState: MockClerkAuth = {
  isSignedIn: false,
  signOut: jest.fn(),
  getToken: jest.fn(),
};

let mockUserState: MockClerkUser = {
  isSignedIn: false,
  user: null,
  isLoaded: true,
};

// Funções para controlar o estado dos mocks
export const setMockAuthState = (state: Partial<MockClerkAuth>) => {
  mockAuthState = { ...mockAuthState, ...state };
};

export const setMockUserState = (state: Partial<MockClerkUser>) => {
  mockUserState = { ...mockUserState, ...state };
};

export const resetMockState = () => {
  mockAuthState = {
    isSignedIn: false,
    signOut: jest.fn(),
    getToken: jest.fn(),
  };
  
  mockUserState = {
    isSignedIn: false,
    user: null,
    isLoaded: true,
  };
};

// Mock do usuário padrão para testes
export const mockClerkUser: MockClerkUser = {
  id: 'user_test123',
  firstName: 'João',
  lastName: 'Silva',
  primaryEmailAddress: {
    emailAddress: 'joao.silva@example.com'
  },
  primaryPhoneNumber: {
    phoneNumber: '+5511999999999'
  },
  imageUrl: 'https://example.com/avatar.jpg',
  createdAt: new Date('2023-01-01T00:00:00Z'),
  updatedAt: new Date('2023-01-02T00:00:00Z'),
};

// Mock factory para diferentes cenários
export const createMockClerkUser = (overrides: Partial<MockClerkUser> = {}): MockClerkUser => ({
  ...mockClerkUser,
  ...overrides,
});

// Componentes mock do Clerk
export const mockClerkComponents = {
  ClerkProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="clerk-provider">{children}</div>
  ),
  
  SignedIn: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="signed-in">{mockAuthState.isSignedIn ? children : null}</div>
  ),
  
  SignedOut: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="signed-out">{!mockAuthState.isSignedIn ? children : null}</div>
  ),
  
  SignInButton: ({ children, mode }: { children: React.ReactNode; mode?: string }) => (
    <div data-testid="sign-in-button" data-mode={mode}>
      {children}
    </div>
  ),
  
  SignUpButton: ({ children, mode }: { children: React.ReactNode; mode?: string }) => (
    <div data-testid="sign-up-button" data-mode={mode}>
      {children}
    </div>
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
};

// Hooks mock do Clerk
export const mockClerkHooks = {
  useAuth: () => mockAuthState,
  useUser: () => mockUserState,
};

// Setup completo do mock
export const setupClerkMocks = () => {
  jest.mock('@clerk/clerk-react', () => ({
    ...mockClerkComponents,
    ...mockClerkHooks,
  }));
};

// Helpers para testes
export const simulateSignIn = (user: MockClerkUser = mockClerkUser) => {
  setMockAuthState({ isSignedIn: true });
  setMockUserState({ 
    isSignedIn: true, 
    user,
    isLoaded: true 
  });
};

export const simulateSignOut = () => {
  setMockAuthState({ isSignedIn: false });
  setMockUserState({ 
    isSignedIn: false, 
    user: null,
    isLoaded: true 
  });
};

export const simulateLoading = () => {
  setMockUserState({ isLoaded: false });
};

export const simulateLoadingComplete = () => {
  setMockUserState({ isLoaded: true });
};