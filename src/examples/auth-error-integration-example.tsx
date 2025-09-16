/**
 * Exemplo de integração completa do sistema de tratamento de erros
 * Demonstra como usar todos os componentes e hooks juntos
 */

import React from 'react';
import { 
  AuthErrorBoundary,
  withAuthErrorHandling,
  useAuthErrorHandler,
  AuthErrorProvider,
  useErrorReporter
} from '../components/auth';

// Exemplo 1: Componente com error boundary manual
const ComponentWithManualErrorBoundary: React.FC = () => {
  const { executeWithErrorHandling, error, isRecovering, recoverFromError } = useAuthErrorHandler();

  const handleLogin = async () => {
    const { data, error } = await executeWithErrorHandling(
      async () => {
        // Simular operação de login que pode falhar
        throw new Error('Credenciais inválidas');
      },
      'login',
      { userId: 'user123' }
    );

    if (error) {
      console.log('Login failed:', error);
    } else {
      console.log('Login successful:', data);
    }
  };

  return (
    <div>
      <h2>Login Manual</h2>
      <button onClick={handleLogin} disabled={isRecovering}>
        {isRecovering ? 'Tentando...' : 'Fazer Login'}
      </button>
      
      {error && (
        <div className="error-display">
          <p>Erro: {error.message}</p>
          {error.recoverable && (
            <button onClick={recoverFromError}>
              Tentar Recuperar
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Exemplo 2: Componente com HOC
const ComponentWithHOC: React.FC = () => {
  const reportError = useErrorReporter();

  const simulateError = () => {
    try {
      throw new Error('Erro simulado para demonstração');
    } catch (error) {
      reportError(error, { component: 'ComponentWithHOC' });
    }
  };

  return (
    <div>
      <h2>Componente com HOC</h2>
      <button onClick={simulateError}>
        Simular Erro
      </button>
    </div>
  );
};

const ComponentWithHOCWrapped = withAuthErrorHandling(ComponentWithHOC, {
  enableAutoRecovery: true,
  maxAutoRecoveryAttempts: 3
});

// Exemplo 3: Aplicação completa com provider
const ExampleApp: React.FC = () => {
  return (
    <AuthErrorProvider enableGlobalRecovery={true}>
      <div className="app">
        <h1>Sistema de Tratamento de Erros - Exemplo</h1>
        
        {/* Componente com error boundary manual */}
        <AuthErrorBoundary enableAutoRecovery={true}>
          <ComponentWithManualErrorBoundary />
        </AuthErrorBoundary>

        {/* Componente com HOC */}
        <ComponentWithHOCWrapped />

        {/* Componente que pode gerar erro crítico */}
        <AuthErrorBoundary 
          enableAutoRecovery={false}
          onError={(error, errorInfo) => {
            console.log('Critical error caught:', error, errorInfo);
          }}
        >
          <CriticalComponent />
        </AuthErrorBoundary>
      </div>
    </AuthErrorProvider>
  );
};

// Componente que pode gerar erros críticos
const CriticalComponent: React.FC = () => {
  const [shouldError, setShouldError] = React.useState(false);

  if (shouldError) {
    throw new Error('Erro crítico do sistema');
  }

  return (
    <div>
      <h2>Componente Crítico</h2>
      <button onClick={() => setShouldError(true)}>
        Gerar Erro Crítico
      </button>
    </div>
  );
};

export default ExampleApp;

// Exemplo de uso em contexto real (App.tsx)
export const AppWithErrorHandling: React.FC = () => {
  return (
    <AuthErrorProvider 
      enableGlobalRecovery={true}
      maxErrorHistory={20}
    >
      <AuthErrorBoundary
        enableAutoRecovery={true}
        maxAutoRecoveryAttempts={3}
        onError={(error, errorInfo) => {
          // Enviar erro para serviço de monitoramento
          console.error('App-level error:', error, errorInfo);
        }}
      >
        {/* Sua aplicação aqui */}
        <div>Conteúdo da aplicação</div>
      </AuthErrorBoundary>
    </AuthErrorProvider>
  );
};