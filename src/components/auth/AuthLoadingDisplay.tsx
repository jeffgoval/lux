/**
 * 🔄 DISPLAY DE LOADING E ERRO PARA AUTENTICAÇÃO
 * 
 * Componente integrado que mostra estados granulares de loading
 * e erros com feedback claro e acionável
 */

import React from 'react';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { EnhancedLoading, LoadingOverlay, ConnectionStatus } from '@/components/ui/enhanced-loading';
import { EnhancedError, useErrorHandler } from '@/components/ui/enhanced-error';
import { OnboardingProgress, useOnboardingProgress } from '@/components/ui/onboarding-progress';
import type { LoadingState } from '@/components/ui/enhanced-loading';
import type { ErrorType } from '@/components/ui/enhanced-error';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface AuthLoadingDisplayProps {
  showOverlay?: boolean;
  showProgress?: boolean;
  onRetry?: () => void;
  onGoHome?: () => void;
  className?: string;
}

interface AuthErrorDisplayProps {
  onRetry?: () => void;
  onGoHome?: () => void;
  onDismiss?: () => void;
  className?: string;
}

// ============================================================================
// COMPONENTE DE LOADING PARA AUTH
// ============================================================================

export function AuthLoadingDisplay({
  showOverlay = false,
  showProgress = false,
  onRetry,
  onGoHome,
  className
}: AuthLoadingDisplayProps) {
  const {
    isLoading,
    isProfileLoading,
    isRolesLoading,
    isOnboardingLoading,
    isAuthenticated,
    profile
  } = useUnifiedAuth();

  // Determinar estado de loading atual
  const getLoadingState = (): LoadingState => {
    if (isOnboardingLoading) return 'onboarding_loading';
    if (isProfileLoading) return 'profile_loading';
    if (isRolesLoading) return 'roles_loading';
    if (isLoading) return 'loading';
    return 'idle';
  };

  // Determinar mensagem baseada no estado
  const getLoadingMessage = (state: LoadingState): string => {
    switch (state) {
      case 'loading':
        return 'Verificando autenticação...';
      case 'profile_loading':
        return 'Carregando seu perfil...';
      case 'roles_loading':
        return 'Verificando permissões...';
      case 'onboarding_loading':
        return 'Configurando sua conta...';
      default:
        return 'Carregando...';
    }
  };

  const loadingState = getLoadingState();
  const message = getLoadingMessage(loadingState);

  // Calcular progresso para onboarding
  const onboardingProgress = isOnboardingLoading ? 65 : 0;

  // Se não há loading, não renderizar
  if (loadingState === 'idle') {
    return null;
  }

  // Renderizar overlay se solicitado
  if (showOverlay) {
    return (
      <>
        <ConnectionStatus />
        <LoadingOverlay
          isVisible={true}
          state={loadingState}
          message={message}
        />
      </>
    );
  }

  // Renderizar loading inline
  return (
    <div className={className}>
      <ConnectionStatus />
      <EnhancedLoading
        state={loadingState}
        message={message}
        timeout={30000}
        onTimeout={onRetry}
        onRetry={onRetry}
        size="lg"
        showProgress={loadingState === 'onboarding_loading'}
        progress={onboardingProgress}
      />
    </div>
  );
}

// ============================================================================
// COMPONENTE DE ERRO PARA AUTH
// ============================================================================

export function AuthErrorDisplay({
  onRetry,
  onGoHome,
  onDismiss,
  className
}: AuthErrorDisplayProps) {
  const { error, clearError } = useUnifiedAuth();

  if (!error) return null;

  // Mapear erro de string para ErrorInfo
  const mapStringErrorToErrorInfo = (errorString: string) => {
    // Detectar tipo de erro baseado na mensagem
    let type: ErrorType = 'generic';
    
    if (errorString.toLowerCase().includes('auth') || 
        errorString.toLowerCase().includes('login') ||
        errorString.toLowerCase().includes('credenciais')) {
      type = 'authentication';
    } else if (errorString.toLowerCase().includes('permiss') ||
               errorString.toLowerCase().includes('acesso')) {
      type = 'authorization';
    } else if (errorString.toLowerCase().includes('rede') ||
               errorString.toLowerCase().includes('conexão') ||
               errorString.toLowerCase().includes('network')) {
      type = 'network';
    } else if (errorString.toLowerCase().includes('timeout') ||
               errorString.toLowerCase().includes('tempo')) {
      type = 'timeout';
    } else if (errorString.toLowerCase().includes('dados') ||
               errorString.toLowerCase().includes('validação')) {
      type = 'validation';
    } else if (errorString.toLowerCase().includes('banco') ||
               errorString.toLowerCase().includes('database')) {
      type = 'database';
    }

    return {
      type,
      message: errorString,
      recoverable: true,
      timestamp: new Date(),
      retryAfter: type === 'network' || type === 'timeout' ? 5000 : undefined
    };
  };

  const errorInfo = mapStringErrorToErrorInfo(error);

  const handleRetry = () => {
    clearError();
    onRetry?.();
  };

  const handleDismiss = () => {
    clearError();
    onDismiss?.();
  };

  return (
    <div className={className}>
      <EnhancedError
        error={errorInfo}
        onRetry={handleRetry}
        onDismiss={handleDismiss}
        onGoHome={onGoHome}
        showDetails={true}
        autoRetry={errorInfo.type === 'network' || errorInfo.type === 'timeout'}
        maxRetries={3}
      />
    </div>
  );
}

// ============================================================================
// COMPONENTE COMBINADO DE AUTH STATUS
// ============================================================================

interface AuthStatusDisplayProps {
  showOverlay?: boolean;
  showOnboardingProgress?: boolean;
  onRetry?: () => void;
  onGoHome?: () => void;
  className?: string;
}

export function AuthStatusDisplay({
  showOverlay = false,
  showOnboardingProgress = false,
  onRetry,
  onGoHome,
  className
}: AuthStatusDisplayProps) {
  const { 
    isAuthenticated, 
    profile, 
    error,
    isLoading,
    isProfileLoading,
    isOnboardingLoading
  } = useUnifiedAuth();

  const { steps, setCurrentStep, completeStep, setStepLoading } = useOnboardingProgress();

  // Atualizar progresso do onboarding baseado no estado
  React.useEffect(() => {
    if (isOnboardingLoading) {
      setStepLoading('configuration');
    } else if (isAuthenticated && profile && !profile.primeiro_acesso) {
      completeStep('completion');
    }
  }, [isOnboardingLoading, isAuthenticated, profile]);

  // Mostrar erro se houver
  if (error) {
    return (
      <AuthErrorDisplay
        onRetry={onRetry}
        onGoHome={onGoHome}
        className={className}
      />
    );
  }

  // Mostrar loading se houver
  const hasAnyLoading = isLoading || isProfileLoading || isRolesLoading || isOnboardingLoading;
  
  if (hasAnyLoading) {
    return (
      <div className={className}>
        <AuthLoadingDisplay
          showOverlay={showOverlay}
          showProgress={isOnboardingLoading}
          onRetry={onRetry}
          onGoHome={onGoHome}
        />
        
        {/* Mostrar progresso do onboarding se solicitado */}
        {showOnboardingProgress && isOnboardingLoading && (
          <div className="mt-6">
            <OnboardingProgress
              currentStep="configuration"
              steps={steps}
              compact={true}
              showEstimatedTime={false}
            />
          </div>
        )}
      </div>
    );
  }

  // Se chegou aqui, não há loading nem erro
  return null;
}

// ============================================================================
// HOOK PARA GERENCIAR STATUS DE AUTH
// ============================================================================

export function useAuthStatus() {
  const auth = useUnifiedAuth();
  const { error, handleError, clearError } = useErrorHandler();

  const isLoading = auth.isLoading || auth.isProfileLoading || auth.isRolesLoading || auth.isOnboardingLoading;
  const hasError = !!auth.error || !!error;

  const retry = async () => {
    clearError();
    auth.clearError();
    
    try {
      await auth.refreshAuth();
    } catch (err: any) {
      handleError({
        type: 'generic',
        message: err.message || 'Erro ao tentar novamente',
        recoverable: true
      });
    }
  };

  const getLoadingMessage = () => {
    if (auth.isOnboardingLoading) return 'Configurando sua conta...';
    if (auth.isProfileLoading) return 'Carregando perfil...';
    if (auth.isRolesLoading) return 'Verificando permissões...';
    if (auth.isLoading) return 'Verificando autenticação...';
    return '';
  };

  const getLoadingProgress = () => {
    if (auth.isOnboardingLoading) return 75;
    if (auth.isRolesLoading) return 50;
    if (auth.isProfileLoading) return 25;
    return 0;
  };

  return {
    isLoading,
    hasError,
    error: auth.error || error,
    retry,
    getLoadingMessage,
    getLoadingProgress,
    isAuthenticated: auth.isAuthenticated,
    needsOnboarding: auth.profile?.primeiro_acesso ?? false
  };
}