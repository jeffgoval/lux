/**
 * Tipos específicos para erros do Clerk Authentication
 * Extensão do sistema de erros existente para suportar Clerk
 */

import { AuthError, AuthErrorType } from './auth-errors';

export enum ClerkErrorType {
  CLERK_NETWORK = 'clerk_network',
  CLERK_AUTHENTICATION = 'clerk_authentication', 
  CLERK_AUTHORIZATION = 'clerk_authorization',
  CLERK_CONFIGURATION = 'clerk_configuration',
  CLERK_SESSION = 'clerk_session',
  CLERK_VALIDATION = 'clerk_validation'
}

export interface ClerkError extends AuthError {
  clerkCode?: string;
  clerkMessage?: string;
  isClerkError: true;
}

export interface ClerkErrorContext {
  operation?: string;
  userId?: string;
  sessionId?: string;
  publishableKey?: string;
  component?: string;
}

// Mapeamento de códigos de erro do Clerk para tipos internos
export const CLERK_ERROR_CODES = {
  // Erros de configuração
  'clerk_missing_publishable_key': ClerkErrorType.CLERK_CONFIGURATION,
  'clerk_invalid_publishable_key': ClerkErrorType.CLERK_CONFIGURATION,
  
  // Erros de autenticação
  'form_identifier_not_found': ClerkErrorType.CLERK_AUTHENTICATION,
  'form_password_incorrect': ClerkErrorType.CLERK_AUTHENTICATION,
  'form_identifier_exists': ClerkErrorType.CLERK_AUTHENTICATION,
  'session_token_invalid': ClerkErrorType.CLERK_AUTHENTICATION,
  
  // Erros de autorização
  'authorization_invalid': ClerkErrorType.CLERK_AUTHORIZATION,
  'forbidden': ClerkErrorType.CLERK_AUTHORIZATION,
  
  // Erros de sessão
  'session_expired': ClerkErrorType.CLERK_SESSION,
  'session_not_found': ClerkErrorType.CLERK_SESSION,
  
  // Erros de validação
  'form_param_format_invalid': ClerkErrorType.CLERK_VALIDATION,
  'form_param_nil': ClerkErrorType.CLERK_VALIDATION,
  
  // Erros de rede
  'network_error': ClerkErrorType.CLERK_NETWORK,
  'timeout_error': ClerkErrorType.CLERK_NETWORK
} as const;

// Mensagens user-friendly para erros do Clerk
export const CLERK_ERROR_MESSAGES = {
  [ClerkErrorType.CLERK_CONFIGURATION]: 'Erro de configuração do sistema de autenticação',
  [ClerkErrorType.CLERK_AUTHENTICATION]: 'Erro de autenticação. Verifique suas credenciais',
  [ClerkErrorType.CLERK_AUTHORIZATION]: 'Acesso negado. Você não tem permissão para esta ação',
  [ClerkErrorType.CLERK_SESSION]: 'Sua sessão expirou. Faça login novamente',
  [ClerkErrorType.CLERK_VALIDATION]: 'Dados inválidos. Verifique as informações fornecidas',
  [ClerkErrorType.CLERK_NETWORK]: 'Erro de conexão. Verifique sua internet'
} as const;