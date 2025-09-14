/**
 * Setup de testes para Jest + Testing Library
 */

import '@testing-library/jest-dom';

// Mock de environment variables necessárias
process.env.REACT_APP_AUTH_V2_ENABLED = 'true';

// Global mocks para performance
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn()
  }
});

// Mock console warnings em testes (reduz noise)
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (args[0]?.includes('React Router')) return;
  if (args[0]?.includes('act()')) return;
  originalWarn.apply(console, args);
};

// Cleanup automático para evitar vazamentos de memória
afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
});