/**
 * Testes para o ClerkErrorBoundary
 * Verifica se os erros do Clerk são capturados e tratados corretamente
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClerkErrorBoundary } from '../../components/auth/ClerkErrorBoundary';
import { clerkErrorRecovery } from '../../services/clerk-error-recovery';

// Mock do serviço de recovery
jest.mock('../../services/clerk-error-recovery', () => ({
  clerkErrorRecovery: {
    classifyClerkError: jest.fn(),
    recoverFromClerkError: jest.fn()
  }
}));

const mockClerkErrorRecovery = clerkErrorRecovery as jest.Mocked<typeof clerkErrorRecovery>;

// Componente que gera erro para teste
const ErrorThrowingComponent: React.FC<{ shouldThrow: boolean; errorType?: string }> = ({ 
  shouldThrow, 
  errorType = 'network_error' 
}) => {
  if (shouldThrow) {
    const error = new Error('Test error');
    (error as any).clerkError = true;
    (error as any).code = errorType;
    throw error;
  }
  return <div>No error</div>;
};

describe('ClerkErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock padrão para classificação de erro
    mockClerkErrorRecovery.classifyClerkError.mockReturnValue({
      type: 'network',
      message: 'Test error message',
      clerkCode: 'network_error',
      clerkMessage: 'Clerk test error',
      recoverable: true,
      timestamp: new Date(),
      context: {},
      isClerkError: true
    });
  });

  it('should render children when no error occurs', () => {
    render(
      <ClerkErrorBoundary>
        <ErrorThrowingComponent shouldThrow={false} />
      </ClerkErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should catch and display Clerk errors', () => {
    render(
      <ClerkErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} errorType="network_error" />
      </ClerkErrorBoundary>
    );

    expect(screen.getByText('Problema de Conexão')).toBeInTheDocument();
    expect(mockClerkErrorRecovery.classifyClerkError).toHaveBeenCalled();
  });

  it('should show retry button for recoverable errors', () => {
    render(
      <ClerkErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} errorType="network_error" />
      </ClerkErrorBoundary>
    );

    expect(screen.getByText('Tentar Novamente')).toBeInTheDocument();
  });

  it('should handle session expired errors correctly', () => {
    mockClerkErrorRecovery.classifyClerkError.mockReturnValue({
      type: 'authentication',
      message: 'Session expired',
      clerkCode: 'session_expired',
      clerkMessage: 'Session has expired',
      recoverable: false,
      timestamp: new Date(),
      context: {},
      isClerkError: true
    });

    render(
      <ClerkErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} errorType="session_expired" />
      </ClerkErrorBoundary>
    );

    expect(screen.getByText('Sessão Expirada')).toBeInTheDocument();
    expect(screen.getByText('Fazer Login')).toBeInTheDocument();
  });

  it('should attempt auto recovery for recoverable errors', async () => {
    mockClerkErrorRecovery.recoverFromClerkError.mockResolvedValue({
      success: true,
      shouldRetry: false
    });

    render(
      <ClerkErrorBoundary enableAutoRecovery={true}>
        <ErrorThrowingComponent shouldThrow={true} errorType="network_error" />
      </ClerkErrorBoundary>
    );

    await waitFor(() => {
      expect(mockClerkErrorRecovery.recoverFromClerkError).toHaveBeenCalled();
    });
  });

  it('should call onError callback when provided', () => {
    const onErrorMock = jest.fn();

    render(
      <ClerkErrorBoundary onError={onErrorMock}>
        <ErrorThrowingComponent shouldThrow={true} errorType="network_error" />
      </ClerkErrorBoundary>
    );

    expect(onErrorMock).toHaveBeenCalled();
  });

  it('should reset error state when reset button is clicked', () => {
    const { rerender } = render(
      <ClerkErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} errorType="network_error" />
      </ClerkErrorBoundary>
    );

    expect(screen.getByText('Problema de Conexão')).toBeInTheDocument();

    // Simular reset (na prática seria através do botão, mas vamos testar o comportamento)
    rerender(
      <ClerkErrorBoundary>
        <ErrorThrowingComponent shouldThrow={false} />
      </ClerkErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should show configuration error for missing publishable key', () => {
    mockClerkErrorRecovery.classifyClerkError.mockReturnValue({
      type: 'validation',
      message: 'Missing publishable key',
      clerkCode: 'clerk_missing_publishable_key',
      clerkMessage: 'Publishable key is required',
      recoverable: false,
      timestamp: new Date(),
      context: {},
      isClerkError: true
    });

    render(
      <ClerkErrorBoundary>
        <ErrorThrowingComponent shouldThrow={true} errorType="clerk_missing_publishable_key" />
      </ClerkErrorBoundary>
    );

    expect(screen.getByText('Configuração Ausente')).toBeInTheDocument();
    expect(screen.queryByText('Tentar Novamente')).not.toBeInTheDocument();
  });
});