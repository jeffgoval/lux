/**
 * Setup de testes para Jest + Testing Library
 */

import '@testing-library/jest-dom';

// Mock de environment variables necessárias
process.env.REACT_APP_AUTH_V2_ENABLED = 'true';
process.env.VITE_CLERK_PUBLISHABLE_KEY = 'pk_test_mock_key_for_testing';

// Global mocks para performance
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn()
  }
});

// Mock do IntersectionObserver para testes de componentes com animações
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}));

// Mock do ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock de window.matchMedia para testes responsivos
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock de window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true
});

// Mock console warnings em testes (reduz noise)
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args: any[]) => {
  if (args[0]?.includes('React Router')) return;
  if (args[0]?.includes('act()')) return;
  if (args[0]?.includes('Warning: ReactDOM.render')) return;
  originalWarn.apply(console, args);
};

console.error = (...args: any[]) => {
  if (args[0]?.includes('Warning: ReactDOM.render')) return;
  if (args[0]?.includes('Warning: An invalid form control')) return;
  originalError.apply(console, args);
};

// Cleanup automático para evitar vazamentos de memória
afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
  
  // Limpar event listeners
  document.removeEventListener = jest.fn();
  window.removeEventListener = jest.fn();
});

// Setup global para testes assíncronos
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});