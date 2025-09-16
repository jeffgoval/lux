/**
 * 🧪 TESTE SIMPLES DE AUTENTICAÇÃO
 * 
 * Componente para testar se a autenticação Appwrite está funcionando
 */

import React from 'react';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatErrorForDisplay } from '@/utils/error-display';

export function TestAuth() {
  const {
    user,
    isAuthenticated,
    isInitializing,
    error,
    signIn,
    signOut,
    clearError
  } = useUnifiedAuth();

  const handleTestLogin = async () => {
    try {
      const result = await signIn('test@example.com', 'password123');
      if (result.error) {
        console.error('Login error:', result.error);
      } else {
        console.log('Login successful!');
      }
    } catch (error) {
      console.error('Login exception:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      console.log('Logout successful!');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isInitializing) {
    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>🔄 Inicializando Autenticação</CardTitle>
          <CardDescription>Carregando sistema de autenticação Appwrite...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>🔥 Teste de Autenticação Appwrite</CardTitle>
        <CardDescription>
          Status: {isAuthenticated ? '✅ Autenticado' : '❌ Não autenticado'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">❌ {formatErrorForDisplay(error)}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearError}
              className="mt-2"
            >
              Limpar Erro
            </Button>
          </div>
        )}

        {user && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 text-sm">
              👤 Usuário: {user.email || user.id}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {!isAuthenticated ? (
            <Button onClick={handleTestLogin} className="flex-1">
              🔑 Testar Login
            </Button>
          ) : (
            <Button onClick={handleLogout} variant="outline" className="flex-1">
              🚪 Logout
            </Button>
          )}
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Sistema: Appwrite Auth</p>
          <p>• Contexto: UnifiedAppwriteAuthContext</p>
          <p>• Hook: useUnifiedAuth (compatibilidade)</p>
        </div>
      </CardContent>
    </Card>
  );
}