/**
 * Componente de fallback específico para erros do Clerk
 * Interface de usuário otimizada para diferentes tipos de erro do Clerk
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Home, LogIn, Settings, Wifi, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ClerkError, ClerkErrorType } from '../../types/clerk-errors';
import { 
  getClerkErrorMessage, 
  shouldShowClerkRetryButton, 
  isClerkErrorCritical,
  getClerkErrorUserActions 
} from '../../utils/clerk-error-messages';

interface Props {
  error: ClerkError;
  isRecovering: boolean;
  onRetry: () => void;
  onReset: () => void;
}

export const ClerkErrorFallback: React.FC<Props> = ({
  error,
  isRecovering,
  onRetry,
  onReset
}) => {
  const getErrorIcon = () => {
    if (error.clerkCode) {
      switch (error.clerkCode) {
        case 'session_expired':
        case 'session_not_found':
          return <LogIn className="h-12 w-12 text-blue-500" />;
        case 'network_error':
        case 'timeout_error':
          return <Wifi className="h-12 w-12 text-orange-500" />;
        case 'clerk_missing_publishable_key':
        case 'clerk_invalid_publishable_key':
          return <Settings className="h-12 w-12 text-red-500" />;
        case 'form_identifier_not_found':
        case 'form_password_incorrect':
          return <Shield className="h-12 w-12 text-yellow-500" />;
        default:
          return <AlertTriangle className="h-12 w-12 text-gray-500" />;
      }
    }

    // Fallback baseado no tipo
    switch (error.type) {
      case 'authentication':
        return <LogIn className="h-12 w-12 text-blue-500" />;
      case 'network':
        return <Wifi className="h-12 w-12 text-orange-500" />;
      case 'validation':
        return <Settings className="h-12 w-12 text-red-500" />;
      default:
        return <AlertTriangle className="h-12 w-12 text-gray-500" />;
    }
  };

  const errorConfig = getClerkErrorMessage(error);
  const isCritical = isClerkErrorCritical(error);
  const showRetryButton = shouldShowClerkRetryButton(error);
  const userActions = getClerkErrorUserActions(error);

  const getErrorTitle = () => {
    return errorConfig.title;
  };

  const getErrorDescription = () => {
    return errorConfig.message;
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
          className="min-w-[140px]"
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
          className="min-w-[140px]"
        >
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Recuperando...
        </Button>
      );
    }

    // Botões específicos baseados no tipo de erro
    if (error.clerkCode === 'session_expired' || error.clerkCode === 'session_not_found') {
      buttons.push(
        <Button
          key="login"
          onClick={() => {
            onReset();
            window.location.reload(); // Recarregar para iniciar novo fluxo de auth
          }}
          variant="default"
          className="min-w-[140px]"
        >
          <LogIn className="mr-2 h-4 w-4" />
          Fazer Login
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
        className="min-w-[140px]"
      >
        <Home className="mr-2 h-4 w-4" />
        Página Inicial
      </Button>
    );

    return buttons;
  };

  const getErrorDetails = () => {
    if (process.env.NODE_ENV !== 'development') {
      return null;
    }

    return (
      <details className="mt-4 text-sm text-gray-600">
        <summary className="cursor-pointer font-medium">Detalhes Técnicos (Dev)</summary>
        <div className="mt-2 p-3 bg-gray-50 rounded border font-mono text-xs">
          <div><strong>Clerk Code:</strong> {error.clerkCode || 'N/A'}</div>
          <div><strong>Type:</strong> {error.type}</div>
          <div><strong>Recoverable:</strong> {error.recoverable ? 'Sim' : 'Não'}</div>
          <div><strong>Retry After:</strong> {error.retryAfter ? `${error.retryAfter}ms` : 'N/A'}</div>
          <div><strong>Timestamp:</strong> {error.timestamp.toISOString()}</div>
          {error.clerkMessage && (
            <div><strong>Clerk Message:</strong> {error.clerkMessage}</div>
          )}
          {error.context && (
            <div><strong>Context:</strong> {JSON.stringify(error.context, null, 2)}</div>
          )}
        </div>
      </details>
    );
  };

  const getSupportInfo = () => {
    if (!isCritical && userActions.length === 0) {
      return null;
    }

    return (
      <div className={`mt-6 p-3 border rounded ${
        isCritical 
          ? 'bg-red-50 border-red-200' 
          : 'bg-blue-50 border-blue-200'
      }`}>
        <p className={`text-sm ${
          isCritical ? 'text-red-800' : 'text-blue-800'
        }`}>
          <strong>{isCritical ? 'Precisa de ajuda?' : 'O que fazer:'}</strong><br />
          {isCritical ? (
            <>
              Entre em contato com o suporte técnico informando o código do erro
              e o horário em que ocorreu.
            </>
          ) : (
            userActions.length > 0 && (
              <ul className="mt-2 list-disc list-inside">
                {userActions.map((action, index) => (
                  <li key={index} className="text-sm">{action}</li>
                ))}
              </ul>
            )
          )}
        </p>
        {error.clerkCode && (
          <p className={`text-xs mt-2 font-mono ${
            isCritical ? 'text-red-600' : 'text-blue-600'
          }`}>
            Código: {error.clerkCode}
          </p>
        )}
      </div>
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
          {getSupportInfo()}
        </CardContent>
      </Card>
    </div>
  );
};