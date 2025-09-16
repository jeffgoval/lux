/**
 * 🌍 CONFIGURAÇÃO DE AMBIENTE
 * 
 * Centraliza o acesso às variáveis de ambiente usando import.meta.env
 * para compatibilidade com Vite
 */

export const env = {
  // Ambiente
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE,

  // Appwrite
  appwrite: {
    endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT,
    projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID,
  },

  // Criptografia
  encryption: {
    masterKey: import.meta.env.VITE_ENCRYPTION_MASTER_KEY,
  },

  // Notificações
  notifications: {
    whatsapp: {
      token: import.meta.env.VITE_META_WHATSAPP_TOKEN,
      phoneNumberId: import.meta.env.VITE_META_PHONE_NUMBER_ID,
    },
    twilio: {
      accountSid: import.meta.env.VITE_TWILIO_ACCOUNT_SID,
      authToken: import.meta.env.VITE_TWILIO_AUTH_TOKEN,
      fromNumber: import.meta.env.VITE_TWILIO_FROM_NUMBER,
    },
    sendgrid: {
      apiKey: import.meta.env.VITE_SENDGRID_API_KEY,
      fromEmail: import.meta.env.VITE_SENDGRID_FROM_EMAIL,
      fromName: import.meta.env.VITE_SENDGRID_FROM_NAME || 'Luxe Flow',
    },
  },

  // JWT (se necessário no cliente)
  jwt: {
    privateKey: import.meta.env.VITE_JWT_PRIVATE_KEY,
    publicKey: import.meta.env.VITE_JWT_PUBLIC_KEY,
  },
} as const;

/**
 * Validar variáveis de ambiente obrigatórias
 */
export function validateEnvironment(): void {
  const required = [
    'VITE_APPWRITE_ENDPOINT',
    'VITE_APPWRITE_PROJECT_ID',
  ];

  const missing = required.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file.'
    );
  }
}

/**
 * Verificar se estamos em ambiente de desenvolvimento
 */
export const isDevelopment = env.isDev;

/**
 * Verificar se estamos em ambiente de produção
 */
export const isProduction = env.isProd;