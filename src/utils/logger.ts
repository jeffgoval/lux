/**
 * 📝 LOGGER UTILITY
 * 
 * Simple logger for development and production
 */

// Verificar se estamos em ambiente de teste
const isTestEnvironment = typeof jest !== 'undefined';

export const logger = {
  info: (message: string, data?: any) => {
    if (isTestEnvironment) {
      // Em testes, usar jest.fn() se disponível
      return;
    }
    console.info('ℹ️', message, data);
  },
  error: (message: string, data?: any) => {
    if (isTestEnvironment) {
      return;
    }
    console.error('❌', message, data);
  },
  warn: (message: string, data?: any) => {
    if (isTestEnvironment) {
      return;
    }
    console.warn('⚠️', message, data);
  },
  debug: (message: string, data?: any) => {
    if (isTestEnvironment) {
      return;
    }
    if (import.meta.env.DEV) {
      console.debug('🐛', message, data);
    }
  }
};

// Função para logs críticos
export const criticalLog = (message: string, data?: any) => {
  console.error('🚨 CRITICAL:', message, data);
  logger.error(message, data);
};

// Alias para compatibilidade com auth services
export const authLogger = logger;