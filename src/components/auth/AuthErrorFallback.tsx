/**
 * Componente de fallback para exibir erros de autenticação
 * Interface de usuário para erros recuperáveis e não recuperáveis
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Home, LogIn } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { AuthError, AuthErrorType } from '../../types/auth-errors';
import { formatErrorForUser } from '../../utils/auth-error-utils';

interface Props {
  error: AuthError;
  isRecovering: boolean;
  onRetry: () => void;
  onReset: () => void;
  showRetryButton: boolean;
  isCritical: boolean;
}

export const AuthErrorFallback: React.FC<Props> = ({
  error,
  isRecovering,
  onRetry,
  onReset,
  showRetryButton,
  isCritical
}) => {
  const getErrorIcon = () => {
    switch (error.type) {
      case AuthErrorType.NETWORK:
        return <RefreshCw className="h-12 w-12 text-orange-500" />;
      case AuthErrorType.AUTHENTICATION:
        return <LogIn className="h-12 w-12 text-blue-500" />;
      case AuthErrorType.AUTHORIZATION:
        return <AlertTriangle className="h-12 w-12 text-red-500" />;
      default:
        return <AlertTriangle className="h-12 w-12 text-yellow-500" />;
    }
  };

  const getErrorTitle = () => {
    switch (error.type) {
      case AuthErrorType.NETWORK:
        return 'Problema de Conexão';
      case AuthErrorType.AUTHENTICATION:
        return 'Erro de Autenticação';
      case AuthErrorType.AUTHORIZATION:
        return 'Acesso Negado';
      case AuthErrorType.DATABASE:
        return 'Erro no Sistema';
      case AuthErrorType.VALIDATION:
        return 'Dados Inválidos';
      case AuthErrorType.TIMEOUT:
        return 'Tempo Esgotado';
      default:
        return 'Erro Inesperado';
    }
  };

  const getActionButtons = () => {
    const buttons = [];

    // Botão de retry para erros recuperáveis
    if (showRetryButton && !isRecovering) {
      buttons.push(
        <Button
          key="retry"
          onClick={onRetry}
          variant="default"
          className="min-w-[120px]"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar Novamente
        </Button>
      );
    }

    // Botão de loading durante recovery
    if (isRecovering) {
      buttons.push(
        <Button
          key="recovering"
          disabled
          variant="default"
          className="min-w-[120px]"
        >
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Recuperando...
        </Button>
      );
    }

    // Botão para voltar ao início
    buttons.push(
      <Button
        key="home"
        onClick={() => {
          onReset();
          window.location.href = '/';
        }}
        variant="outline"
        className="min-w-[120px]"
      >
        <Home className="mr-2 h-4 w-4" />
        Início
      </Button>
    );

    // Para erros de autenticação, botão para login
    if (error.type === AuthErrorType.AUTHENTICATION || error.type === AuthErrorType.AUTHORIZATION) {
      buttons.push(
        <Button
          key="login"
          onClick={() => {
            onReset();
            window.location.href = '/auth';
          }}
          variant="default"
          className="min-w-[120px]"
        >
          <LogIn className="mr-2 h-4 w-4" />
          Fazer Login
        </Button>
      );
    }

    return buttons;
  };

  const getErrorDescription = () => {
    const baseDescription = formatErrorForUser(error);
    
    if (isCritical) {
      return `${baseDescription} Este erro requer atenção imediata.`;
    }

    if (error.recoverable && !isRecovering) {
      return `${baseDescription} Você pode tentar novamente ou voltar ao início.`;
    }

    return baseDescription;
  };

  const getErrorDetails = () => {
    if (process.env.NODE_ENV !== 'development') {
      return null;
    }

    return (
      <details className="mt-4 text-sm text-gray-600">
        <summary className="cursor-pointer font-medium">Detalhes Técnicos</summary>
        <div className="mt-2 p-3 bg-gray-50 rounded border font-mono text-xs">
          <div><strong>Tipo:</strong> {error.type}</div>
          <div><strong>Código:</strong> {error.code || 'N/A'}</div>
          <div><strong>Recuperável:</strong> {error.recoverable ? 'Sim' : 'Não'}</div>
          <div><strong>Tentativas:</strong> {error.attemptCount || 0}</div>
          <div><strong>Timestamp:</strong> {error.timestamp.toISOString()}</div>
          {error.context && (
            <div><strong>Contexto:</strong> {JSON.stringify(error.context, null, 2)}</div>
          )}
        </div>
      </details>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getErrorIcon()}
          </div>
          <CardTitle className="text-xl font-semibold">
            {getErrorTitle()}
          </CardTitle>
          <CardDescription className="text-base">
            {getErrorDescription()}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col gap-3">
            {getActionButtons()}
          </div>
          
          {getErrorDetails()}
          
          {/* Informações de suporte */}
          {isCritical && (
            <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-800">
                <strong>Precisa de ajuda?</strong><br />
                Entre em contato com o suporte técnico informando o código do erro
                e o horário em que ocorreu.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};