/**
 * Utilitários para tratamento de erros de rede específicos do Clerk
 * Implementa retry logic e detecção de problemas de conectividade
 */

import { ClerkError } from '../types/clerk-errors';
import { clerkErrorRecovery } from '../services/clerk-error-recovery';

interface NetworkRetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  timeout?: number;
}

interface NetworkStatus {
  isOnline: boolean;
  lastChecked: Date;
  consecutiveFailures: number;
}

class ClerkNetworkManager {
  private networkStatus: NetworkStatus = {
    isOnline: navigator.onLine,
    lastChecked: new Date(),
    consecutiveFailures: 0
  };

  private retryQueue: Array<{
    operation: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    context: Record<string, any>;
  }> = [];

  private isProcessingQueue = false;

  constructor() {
    // Monitorar mudanças na conectividade
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  /**
   * Executa uma operação com retry automático para erros de rede
   */
  async withNetworkRetry<T>(
    operation: () => Promise<T>,
    context: Record<string, any> = {},
    options: NetworkRetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
      timeout = 30000
    } = options;

    let lastError: ClerkError | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Verificar conectividade antes da tentativa
        if (!this.networkStatus.isOnline) {
          await this.waitForConnection(timeout);
        }

        // Executar operação com timeout
        const result = await this.executeWithTimeout(operation, timeout);
        
        // Reset contador de falhas em caso de sucesso
        this.networkStatus.consecutiveFailures = 0;
        
        return result;

      } catch (error) {
        const clerkError = clerkErrorRecovery.classifyClerkError(error, {
          ...context,
          attempt,
          maxRetries,
          networkStatus: this.networkStatus
        });

        lastError = clerkError;
        this.networkStatus.consecutiveFailures++;

        // Se não é erro de rede ou é a última tentativa, falhar imediatamente
        if (!this.isNetworkError(clerkError) || attempt === maxRetries) {
          throw clerkError;
        }

        // Calcular delay com backoff exponencial
        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt - 1),
          maxDelay
        );

        console.warn(`Clerk network error (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, clerkError);
        
        await this.delay(delay);
      }
    }

    throw lastError || new Error('Network retry failed');
  }

  /**
   * Adiciona uma operação à fila para execução quando a rede voltar
   */
  async queueForRetry<T>(
    operation: () => Promise<T>,
    context: Record<string, any> = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.retryQueue.push({
        operation,
        resolve,
        reject,
        context
      });

      if (!this.isProcessingQueue) {
        this.processRetryQueue();
      }
    });
  }

  /**
   * Verifica se a conexão com os serviços do Clerk está funcionando
   */
  async checkClerkConnectivity(): Promise<boolean> {
    try {
      // Tentar uma operação simples do Clerk (verificar se a API está acessível)
      const response = await fetch('https://api.clerk.dev/v1/health', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });

      const isHealthy = response.ok;
      this.networkStatus.isOnline = isHealthy;
      this.networkStatus.lastChecked = new Date();

      return isHealthy;
    } catch (error) {
      this.networkStatus.isOnline = false;
      this.networkStatus.lastChecked = new Date();
      return false;
    }
  }

  /**
   * Obtém o status atual da rede
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(clerkErrorRecovery.classifyClerkError(
            new Error('Operation timeout'),
            { timeout, source: 'ClerkNetworkManager' }
          ));
        }, timeout);
      })
    ]);
  }

  private async waitForConnection(timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (!this.networkStatus.isOnline && (Date.now() - startTime) < timeout) {
      await this.delay(1000);
      await this.checkClerkConnectivity();
    }

    if (!this.networkStatus.isOnline) {
      throw clerkErrorRecovery.classifyClerkError(
        new Error('Network connection timeout'),
        { timeout, source: 'waitForConnection' }
      );
    }
  }

  private async processRetryQueue(): Promise<void> {
    if (this.isProcessingQueue || this.retryQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.retryQueue.length > 0) {
      if (!this.networkStatus.isOnline) {
        await this.waitForConnection(30000); // Aguardar até 30s pela conexão
      }

      const item = this.retryQueue.shift();
      if (!item) continue;

      try {
        const result = await this.withNetworkRetry(
          item.operation,
          item.context
        );
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }

    this.isProcessingQueue = false;
  }

  private handleOnline(): void {
    console.log('Network connection restored');
    this.networkStatus.isOnline = true;
    this.networkStatus.lastChecked = new Date();
    this.networkStatus.consecutiveFailures = 0;

    // Processar fila de retry
    if (this.retryQueue.length > 0) {
      this.processRetryQueue();
    }
  }

  private handleOffline(): void {
    console.warn('Network connection lost');
    this.networkStatus.isOnline = false;
    this.networkStatus.lastChecked = new Date();
  }

  private isNetworkError(error: ClerkError): boolean {
    return (
      error.clerkCode === 'network_error' ||
      error.clerkCode === 'timeout_error' ||
      error.type === 'network' ||
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('timeout') ||
      error.message.toLowerCase().includes('fetch')
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instância singleton
export const clerkNetworkManager = new ClerkNetworkManager();

// Função utilitária para uso direto
export async function withClerkNetworkRetry<T>(
  operation: () => Promise<T>,
  context?: Record<string, any>,
  options?: NetworkRetryOptions
): Promise<T> {
  return clerkNetworkManager.withNetworkRetry(operation, context, options);
}

// Hook para monitorar status da rede
export function useClerkNetworkStatus() {
  return clerkNetworkManager.getNetworkStatus();
}