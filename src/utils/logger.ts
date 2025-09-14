/**
 * 🪵 SISTEMA DE LOGGING SEGURO
 * 
 * Sistema de logging que remove automaticamente logs em produção
 * e fornece diferentes níveis de log.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  enableInProduction: boolean;
  prefix?: string;
}

class Logger {
  private config: LoggerConfig;
  private isDevelopment: boolean;

  constructor(config: LoggerConfig = { level: 'info', enableInProduction: false }) {
    this.config = config;
    this.isDevelopment = import.meta.env.DEV;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDevelopment && !this.config.enableInProduction) {
      return false;
    }

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): [string, ...any[]] {
    const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
    const timestamp = new Date().toISOString();
    const formattedMessage = `${prefix} ${timestamp} [${level.toUpperCase()}] ${message}`;
    
    return [formattedMessage, ...args];
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(...this.formatMessage('debug', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(...this.formatMessage('info', message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...this.formatMessage('warn', message, ...args));
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(...this.formatMessage('error', message, ...args));
    }
  }

  // Método para logs que devem aparecer apenas em desenvolvimento
  dev(message: string, ...args: any[]): void {
    if (this.isDevelopment) {
      console.log(`[DEV] ${message}`, ...args);
    }
  }

  // Método para logs críticos que devem aparecer sempre
  critical(message: string, ...args: any[]): void {
    console.error(`[CRITICAL] ${message}`, ...args);
  }
}

// Instâncias pré-configuradas
export const logger = new Logger({
  level: import.meta.env.DEV ? 'debug' : 'error',
  enableInProduction: false
});

export const authLogger = new Logger({
  level: import.meta.env.DEV ? 'debug' : 'warn',
  enableInProduction: false,
  prefix: 'AUTH'
});

export const dbLogger = new Logger({
  level: import.meta.env.DEV ? 'debug' : 'warn',
  enableInProduction: false,
  prefix: 'DB'
});

export const uiLogger = new Logger({
  level: import.meta.env.DEV ? 'debug' : 'error',
  enableInProduction: false,
  prefix: 'UI'
});

// Função para substituir console.log em produção
export function createSafeLogger(prefix?: string): Logger {
  return new Logger({
    level: import.meta.env.DEV ? 'debug' : 'error',
    enableInProduction: false,
    prefix
  });
}

// Função para logs de debug que só aparecem em desenvolvimento
export function devLog(message: string, ...args: any[]): void {
  if (import.meta.env.DEV) {
    console.log(`[DEV] ${message}`, ...args);
  }
}

// Função para logs críticos que sempre aparecem
export function criticalLog(message: string, ...args: any[]): void {
  console.error(`[CRITICAL] ${message}`, ...args);
}
