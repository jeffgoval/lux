/**
 * Higher-Order Component para adicionar tratamento de erros de autenticação
 * Wrapper que adiciona error boundary e recovery automático
 */

import React, { ComponentType } from 'react';
import { AuthErrorBoundary } from './AuthErrorBoundary';
import { AuthError } from '../../types/auth-errors';

interface WithAuthErrorHandlingOptions {
  enableAutoRecovery?: boolean;
  maxAutoRecoveryAttempts?: number;
  fallback?: React.ComponentType<{ error: AuthError; retry: () => void; reset: () => void }>;
  onError?: (error: AuthError, errorInfo: React.ErrorInfo) => void;
}

export function withAuthErrorHandling<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithAuthErrorHandlingOptions = {}
) {
  const WithAuthErrorHandlingComponent = (props: P) => {
    return (
      <AuthErrorBoundary
        enableAutoRecovery={options.enableAutoRecovery}
        maxAutoRecoveryAttempts={options.maxAutoRecoveryAttempts}
        fallback={options.fallback}
        onError={options.onError}
      >
        <WrappedComponent {...props} />
      </AuthErrorBoundary>
    );
  };

  WithAuthErrorHandlingComponent.displayName = 
    `withAuthErrorHandling(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithAuthErrorHandlingComponent;
}

// Versões pré-configuradas para casos comuns
export const withAuthErrorHandlingStrict = <P extends object>(
  WrappedComponent: ComponentType<P>
) => withAuthErrorHandling(WrappedComponent, {
  enableAutoRecovery: false,
  maxAutoRecoveryAttempts: 0
});

export const withAuthErrorHandlingAggressive = <P extends object>(
  WrappedComponent: ComponentType<P>
) => withAuthErrorHandling(WrappedComponent, {
  enableAutoRecovery: true,
  maxAutoRecoveryAttempts: 5
});

export const withAuthErrorHandlingDefault = <P extends object>(
  WrappedComponent: ComponentType<P>
) => withAuthErrorHandling(WrappedComponent, {
  enableAutoRecovery: true,
  maxAutoRecoveryAttempts: 3
});