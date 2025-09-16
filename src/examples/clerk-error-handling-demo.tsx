/**
 * Demonstração do sistema de tratamento de erros do Clerk
 * Exemplo de como usar os componentes de error boundary e recovery
 */

import React, { useState } from 'react';
import { ClerkErrorBoundary } from '../components/auth/ClerkErrorBoundary';
import { useClerkErrorHandler } from '../hooks/useClerkErrorHandler';
import { withClerkNetworkRetry } from '../utils/clerk-network-utils';
import { clerkSessionManager } from '../utils/clerk-session-utils';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

// Componente que simula operações que podem falhar
const ClerkOperationDemo: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { handleError, retryOperation, isRecovering, lastError, clearError } = useClerkErrorHandler({
    onError: (error) => {
      console.log('Error handled:', error);
    },
    onRecovery: (error) => {
      console.log('Recovered from error:', error);
    }
  });

  // Simular operação que pode falhar com erro de rede
  const simulateNetworkError = async () => {
    setIsLoading(true);
    try {
      const result = await withClerkNetworkRetry(async () => {
        // Simular falha de rede aleatória
        if (Math.random() < 0.7) {
          const error = new Error('Network connection failed');
          (error as any).clerkError = true;
          (error as any).code = 'network_error';
          throw error;
        }
        return 'Network operation successful!';
      });
      
      setResult(result);
      clearError();
    } catch (error) {
      await handleError(error, { operation: 'simulateNetworkError' });
      setResult('Operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Simular erro de sessão
  const simulateSessionError = async () => {
    setIsLoading(true);
    try {
      const result = await retryOperation(async () => {
        const error = new Error('Session expired');
        (error as any).clerkError = true;
        (error as any).code = 'session_expired';
        throw error;
      }, { operation: 'simulateSessionError' });
      
      setResult(result);
    } catch (error) {
      setResult('Session error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Simular erro de configuração
  const simulateConfigError = () => {
    const error = new Error('Missing publishable key');
    (error as any).clerkError = true;
    (error as any).code = 'clerk_missing_publishable_key';
    throw error;
  };

  // Verificar status da sessão
  const checkSessionStatus = async () => {
    setIsLoading(true);
    try {
      const isValid = await clerkSessionManager.validateSession();
      const sessionState = clerkSessionManager.getSessionState();
      setResult(`Session valid: ${isValid}, Last validated: ${sessionState.lastValidated.toLocaleString()}`);
    } catch (error) {
      setResult('Failed to check session status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Clerk Error Handling Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={simulateNetworkError}
              disabled={isLoading || isRecovering}
              variant="outline"
            >
              {isLoading ? 'Loading...' : 'Simulate Network Error'}
            </Button>
            
            <Button 
              onClick={simulateSessionError}
              disabled={isLoading || isRecovering}
              variant="outline"
            >
              {isRecovering ? 'Recovering...' : 'Simulate Session Error'}
            </Button>
            
            <Button 
              onClick={simulateConfigError}
              disabled={isLoading}
              variant="destructive"
            >
              Simulate Config Error
            </Button>
            
            <Button 
              onClick={checkSessionStatus}
              disabled={isLoading}
              variant="secondary"
            >
              Check Session Status
            </Button>
          </div>
          
          {result && (
            <div className="p-3 bg-gray-100 rounded border">
              <strong>Result:</strong> {result}
            </div>
          )}
          
          {lastError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <strong>Last Error:</strong> {lastError.message}
              <br />
              <strong>Code:</strong> {lastError.clerkCode}
              <br />
              <strong>Recoverable:</strong> {lastError.recoverable ? 'Yes' : 'No'}
              {lastError.recoverable && (
                <Button 
                  onClick={clearError} 
                  size="sm" 
                  variant="outline" 
                  className="ml-2"
                >
                  Clear Error
                </Button>
              )}
            </div>
          )}
          
          {isRecovering && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <strong>Status:</strong> Attempting to recover from error...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Componente principal com error boundary
export const ClerkErrorHandlingDemo: React.FC = () => {
  return (
    <ClerkErrorBoundary
      enableAutoRecovery={true}
      maxAutoRecoveryAttempts={3}
      onError={(error, errorInfo) => {
        console.log('ClerkErrorBoundary caught error:', error, errorInfo);
      }}
    >
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Clerk Error Handling System</h1>
        <ClerkOperationDemo />
        
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Features Demonstrated</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Network Error Recovery:</strong> Automatic retry with exponential backoff</li>
              <li><strong>Session Error Handling:</strong> Automatic session validation and recovery</li>
              <li><strong>Configuration Error Detection:</strong> Critical error handling for missing keys</li>
              <li><strong>User-Friendly Messages:</strong> Contextual error messages and actions</li>
              <li><strong>Error Boundary:</strong> Catches and displays errors gracefully</li>
              <li><strong>Auto Recovery:</strong> Attempts to recover from recoverable errors</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </ClerkErrorBoundary>
  );
};