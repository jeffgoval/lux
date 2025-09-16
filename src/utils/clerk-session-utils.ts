/**
 * Utilitários para gerenciamento de sessão específicos do Clerk
 * Implementa detecção e recovery de erros de sessão
 */

import { ClerkError } from '../types/clerk-errors';
import { clerkErrorRecovery } from '../services/clerk-error-recovery';

interface SessionState {
  isValid: boolean;
  lastValidated: Date;
  expiresAt?: Date;
  userId?: string;
  sessionId?: string;
}

interface SessionRecoveryOptions {
  autoSignOut?: boolean;
  redirectToSignIn?: boolean;
  showNotification?: boolean;
  maxRecoveryAttempts?: number;
}

class ClerkSessionManager {
  private sessionState: SessionState = {
    isValid: false,
    lastValidated: new Date()
  };

  private recoveryAttempts = 0;
  private maxRecoveryAttempts = 2;
  private sessionCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Inicia o monitoramento automático da sessão
   */
  startSessionMonitoring(intervalMs: number = 60000): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }

    this.sessionCheckInterval = setInterval(() => {
      this.validateSession().catch(error => {
        console.warn('Session validation failed:', error);
      });
    }, intervalMs);
  }

  /**
   * Para o monitoramento da sessão
   */
  stopSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  /**
   * Valida se a sessão atual está válida
   */
  async validateSession(): Promise<boolean> {
    try {
      // Verificar se temos uma sessão válida através do Clerk
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const sessionData = await response.json();
        this.updateSessionState({
          isValid: true,
          lastValidated: new Date(),
          expiresAt: sessionData.expiresAt ? new Date(sessionData.expiresAt) : undefined,
          userId: sessionData.userId,
          sessionId: sessionData.sessionId
        });
        this.recoveryAttempts = 0;
        return true;
      } else {
        this.updateSessionState({
          isValid: false,
          lastValidated: new Date()
        });
        return false;
      }
    } catch (error) {
      this.updateSessionState({
        isValid: false,
        lastValidated: new Date()
      });
      return false;
    }
  }

  /**
   * Tenta recuperar de um erro de sessão
   */
  async recoverFromSessionError(
    error: ClerkError,
    options: SessionRecoveryOptions = {}
  ): Promise<{ success: boolean; action?: string }> {
    const {
      autoSignOut = true,
      redirectToSignIn = true,
      showNotification = true,
      maxRecoveryAttempts = this.maxRecoveryAttempts
    } = options;

    // Verificar se já excedeu o número máximo de tentativas
    if (this.recoveryAttempts >= maxRecoveryAttempts) {
      return this.handleSessionRecoveryFailure(autoSignOut, redirectToSignIn);
    }

    this.recoveryAttempts++;

    try {
      switch (error.clerkCode) {
        case 'session_expired':
          return this.handleSessionExpired(autoSignOut, redirectToSignIn, showNotification);
          
        case 'session_not_found':
          return this.handleSessionNotFound(autoSignOut, redirectToSignIn, showNotification);
          
        case 'session_token_invalid':
          return this.handleInvalidSessionToken(autoSignOut, redirectToSignIn, showNotification);
          
        default:
          return this.handleGenericSessionError(error, autoSignOut, redirectToSignIn);
      }
    } catch (recoveryError) {
      console.error('Session recovery failed:', recoveryError);
      return this.handleSessionRecoveryFailure(autoSignOut, redirectToSignIn);
    }
  }

  /**
   * Executa uma operação com verificação automática de sessão
   */
  async withSessionValidation<T>(
    operation: () => Promise<T>,
    options: SessionRecoveryOptions = {}
  ): Promise<T> {
    try {
      // Verificar se a sessão está válida antes da operação
      const isValid = await this.validateSession();
      
      if (!isValid) {
        throw clerkErrorRecovery.classifyClerkError(
          new Error('Session validation failed'),
          { source: 'withSessionValidation' }
        );
      }

      return await operation();
      
    } catch (error) {
      const clerkError = clerkErrorRecovery.classifyClerkError(error);
      
      // Se é erro de sessão, tentar recovery
      if (this.isSessionError(clerkError)) {
        const recoveryResult = await this.recoverFromSessionError(clerkError, options);
        
        if (!recoveryResult.success) {
          throw clerkError;
        }
        
        // Se recovery foi bem-sucedido, tentar a operação novamente
        return await operation();
      }
      
      throw clerkError;
    }
  }

  /**
   * Obtém o estado atual da sessão
   */
  getSessionState(): SessionState {
    return { ...this.sessionState };
  }

  /**
   * Força uma atualização do estado da sessão
   */
  async refreshSessionState(): Promise<SessionState> {
    await this.validateSession();
    return this.getSessionState();
  }

  private updateSessionState(newState: Partial<SessionState>): void {
    this.sessionState = {
      ...this.sessionState,
      ...newState
    };
  }

  private async handleSessionExpired(
    autoSignOut: boolean,
    redirectToSignIn: boolean,
    showNotification: boolean
  ): Promise<{ success: boolean; action?: string }> {
    if (showNotification) {
      this.showSessionExpiredNotification();
    }

    if (autoSignOut) {
      await this.performSignOut();
      
      if (redirectToSignIn) {
        this.redirectToSignIn();
        return { success: true, action: 'redirected_to_signin' };
      }
      
      return { success: true, action: 'signed_out' };
    }

    return { success: false, action: 'session_expired' };
  }

  private async handleSessionNotFound(
    autoSignOut: boolean,
    redirectToSignIn: boolean,
    showNotification: boolean
  ): Promise<{ success: boolean; action?: string }> {
    if (showNotification) {
      this.showSessionNotFoundNotification();
    }

    if (redirectToSignIn) {
      this.redirectToSignIn();
      return { success: true, action: 'redirected_to_signin' };
    }

    return { success: false, action: 'session_not_found' };
  }

  private async handleInvalidSessionToken(
    autoSignOut: boolean,
    redirectToSignIn: boolean,
    showNotification: boolean
  ): Promise<{ success: boolean; action?: string }> {
    if (showNotification) {
      this.showInvalidTokenNotification();
    }

    if (autoSignOut) {
      await this.performSignOut();
    }

    if (redirectToSignIn) {
      this.redirectToSignIn();
      return { success: true, action: 'redirected_to_signin' };
    }

    return { success: true, action: 'signed_out' };
  }

  private async handleGenericSessionError(
    error: ClerkError,
    autoSignOut: boolean,
    redirectToSignIn: boolean
  ): Promise<{ success: boolean; action?: string }> {
    console.warn('Generic session error:', error);

    if (autoSignOut) {
      await this.performSignOut();
      
      if (redirectToSignIn) {
        this.redirectToSignIn();
        return { success: true, action: 'redirected_to_signin' };
      }
      
      return { success: true, action: 'signed_out' };
    }

    return { success: false, action: 'generic_session_error' };
  }

  private async handleSessionRecoveryFailure(
    autoSignOut: boolean,
    redirectToSignIn: boolean
  ): Promise<{ success: boolean; action?: string }> {
    console.error('Session recovery failed after maximum attempts');

    if (autoSignOut) {
      await this.performSignOut();
    }

    if (redirectToSignIn) {
      this.redirectToSignIn();
      return { success: false, action: 'redirected_to_signin' };
    }

    return { success: false, action: 'recovery_failed' };
  }

  private isSessionError(error: ClerkError): boolean {
    return (
      error.clerkCode === 'session_expired' ||
      error.clerkCode === 'session_not_found' ||
      error.clerkCode === 'session_token_invalid' ||
      error.message.toLowerCase().includes('session')
    );
  }

  private async performSignOut(): Promise<void> {
    try {
      // Tentar fazer signOut através do Clerk
      if (window.Clerk) {
        await window.Clerk.signOut();
      }
    } catch (error) {
      console.warn('Failed to sign out through Clerk:', error);
    }

    // Limpar estado local
    this.updateSessionState({
      isValid: false,
      lastValidated: new Date(),
      expiresAt: undefined,
      userId: undefined,
      sessionId: undefined
    });
  }

  private redirectToSignIn(): void {
    // Salvar URL atual para redirecionamento após login
    const currentUrl = window.location.href;
    sessionStorage.setItem('clerk_redirect_url', currentUrl);
    
    // Redirecionar para página de login
    window.location.href = '/sign-in';
  }

  private showSessionExpiredNotification(): void {
    // Implementar notificação user-friendly
    console.warn('Session expired - user should be notified');
  }

  private showSessionNotFoundNotification(): void {
    console.warn('Session not found - user should be notified');
  }

  private showInvalidTokenNotification(): void {
    console.warn('Invalid session token - user should be notified');
  }
}

// Instância singleton
export const clerkSessionManager = new ClerkSessionManager();

// Função utilitária para uso direto
export async function withClerkSessionValidation<T>(
  operation: () => Promise<T>,
  options?: SessionRecoveryOptions
): Promise<T> {
  return clerkSessionManager.withSessionValidation(operation, options);
}

// Declaração global para o Clerk
declare global {
  interface Window {
    Clerk?: {
      signOut: () => Promise<void>;
      session?: any;
      user?: any;
    };
  }
}