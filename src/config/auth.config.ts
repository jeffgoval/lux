/**
 * 🔐 CONFIGURAÇÃO DE SEGURANÇA - SISTEMA DE AUTENTICAÇÃO V2
 * 
 * Configurações centralizadas para máxima segurança em ambiente multi-tenant
 */

export const AUTH_CONFIG = {
  // JWT Configuration
  JWT: {
    ACCESS_TOKEN_EXPIRY: '15m',      // Token de acesso expira em 15 minutos
    REFRESH_TOKEN_EXPIRY: '7d',      // Refresh token expira em 7 dias
    ALGORITHM: 'RS256',              // Algoritmo de assinatura assimétrica
    ISSUER: 'luxe-flow-auth',        // Emissor dos tokens
    AUDIENCE: 'luxe-flow-app',       // Audiência dos tokens
  },

  // Password Security
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: true,
    BCRYPT_ROUNDS: 12,               // Rounds do bcrypt para hash
    MAX_LOGIN_ATTEMPTS: 5,           // Máximo de tentativas de login
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutos de bloqueio
  },

  // Rate Limiting
  RATE_LIMIT: {
    LOGIN_ATTEMPTS: {
      WINDOW_MS: 15 * 60 * 1000,     // 15 minutos
      MAX_ATTEMPTS: 5,               // 5 tentativas por janela
    },
    API_REQUESTS: {
      WINDOW_MS: 60 * 1000,          // 1 minuto
      MAX_REQUESTS: 100,             // 100 requests por minuto
    },
    PASSWORD_RESET: {
      WINDOW_MS: 60 * 60 * 1000,     // 1 hora
      MAX_ATTEMPTS: 3,               // 3 tentativas por hora
    },
  },

  // Session Management
  SESSION: {
    COOKIE_NAME: 'luxe_auth_session',
    COOKIE_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 dias
    COOKIE_SECURE: import.meta.env.PROD,
    COOKIE_HTTP_ONLY: true,
    COOKIE_SAME_SITE: 'strict' as const,
  },

  // Multi-tenant Security
  TENANT: {
    MAX_CLINICS_PER_USER: 10,        // Máximo de clínicas por usuário
    CLINIC_SWITCH_COOLDOWN: 5 * 1000, // 5 segundos entre trocas
    REQUIRE_EXPLICIT_CONSENT: true,   // Requer consentimento explícito
  },

  // Audit and Compliance
  AUDIT: {
    LOG_ALL_AUTH_EVENTS: true,
    LOG_FAILED_ATTEMPTS: true,
    LOG_PERMISSION_CHECKS: true,
    RETENTION_DAYS: 90,              // Manter logs por 90 dias
  },

  // Security Headers
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
  },

  // Environment-specific overrides
  DEVELOPMENT: {
    JWT_ACCESS_TOKEN_EXPIRY: '1h',   // Tokens mais longos em dev
    BCRYPT_ROUNDS: 8,                // Menos rounds em dev para performance
    RATE_LIMIT_DISABLED: false,      // Manter rate limiting mesmo em dev
  },

  // Error Messages (não expor detalhes internos)
  ERROR_MESSAGES: {
    INVALID_CREDENTIALS: 'Credenciais inválidas',
    ACCOUNT_LOCKED: 'Conta temporariamente bloqueada',
    TOKEN_EXPIRED: 'Sessão expirada',
    INSUFFICIENT_PERMISSIONS: 'Permissões insuficientes',
    TENANT_ACCESS_DENIED: 'Acesso negado a esta clínica',
    GENERIC_ERROR: 'Erro interno do servidor',
  },
} as const;

// Validação de configuração em runtime
export function validateAuthConfig(): void {
  const requiredEnvVars = [
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
    'DATABASE_URL',
    'REDIS_URL',
  ];

  const missing = requiredEnvVars.filter(envVar => !import.meta.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validar chaves JWT
  if (!import.meta.env.VITE_JWT_PRIVATE_KEY?.includes('BEGIN PRIVATE KEY')) {
    throw new Error('Invalid JWT_PRIVATE_KEY format');
  }

  if (!import.meta.env.VITE_JWT_PUBLIC_KEY?.includes('BEGIN PUBLIC KEY')) {
    throw new Error('Invalid JWT_PUBLIC_KEY format');
  }
}

// Configuração específica por ambiente
export function getEnvironmentConfig() {
  const isDevelopment = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;

  return {
    ...AUTH_CONFIG,
    ...(isDevelopment && AUTH_CONFIG.DEVELOPMENT),
    IS_DEVELOPMENT: isDevelopment,
    IS_PRODUCTION: isProduction,
  };
}

export type AuthConfig = typeof AUTH_CONFIG;
