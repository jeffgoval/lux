/**
 * Mensagens de erro específicas para diferentes cenários do Clerk
 * Fornece mensagens user-friendly e ações recomendadas
 */

import { ClerkError, ClerkErrorType } from '../types/clerk-errors';

interface ErrorMessageConfig {
  title: string;
  message: string;
  action?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  recoverable: boolean;
  userActions?: string[];
}

// Mensagens específicas por código de erro do Clerk
const CLERK_ERROR_MESSAGE_MAP: Record<string, ErrorMessageConfig> = {
  // Erros de sessão
  'session_expired': {
    title: 'Sessão Expirada',
    message: 'Sua sessão expirou por segurança. Faça login novamente para continuar usando o sistema.',
    action: 'Fazer login novamente',
    severity: 'warning',
    recoverable: false,
    userActions: ['Clique em "Fazer Login"', 'Digite suas credenciais', 'Continue de onde parou']
  },

  'session_not_found': {
    title: 'Sessão Não Encontrada',
    message: 'Não foi possível encontrar sua sessão ativa. Isso pode acontecer se você não usou o sistema por muito tempo.',
    action: 'Iniciar nova sessão',
    severity: 'info',
    recoverable: false,
    userActions: ['Clique em "Fazer Login"', 'Digite suas credenciais']
  },

  'session_token_invalid': {
    title: 'Token de Sessão Inválido',
    message: 'Seu token de autenticação está inválido ou corrompido. Por segurança, você precisa fazer login novamente.',
    action: 'Fazer login novamente',
    severity: 'warning',
    recoverable: false,
    userActions: ['Clique em "Fazer Login"', 'Digite suas credenciais']
  },

  // Erros de autenticação
  'form_identifier_not_found': {
    title: 'Usuário Não Encontrado',
    message: 'Não encontramos uma conta com esse email. Verifique se digitou corretamente ou crie uma nova conta.',
    action: 'Verificar email ou criar conta',
    severity: 'info',
    recoverable: false,
    userActions: ['Verifique se o email está correto', 'Clique em "Criar Conta" se não tem uma conta']
  },

  'form_password_incorrect': {
    title: 'Senha Incorreta',
    message: 'A senha digitada está incorreta. Tente novamente ou redefina sua senha se não lembrar.',
    action: 'Tentar novamente ou redefinir senha',
    severity: 'warning',
    recoverable: false,
    userActions: ['Digite a senha correta', 'Clique em "Esqueci minha senha" se necessário']
  },

  'form_identifier_exists': {
    title: 'Conta Já Existe',
    message: 'Já existe uma conta com esse email. Faça login ou use um email diferente para criar uma nova conta.',
    action: 'Fazer login ou usar email diferente',
    severity: 'info',
    recoverable: false,
    userActions: ['Clique em "Fazer Login" se já tem conta', 'Use um email diferente para criar nova conta']
  },

  // Erros de rede
  'network_error': {
    title: 'Erro de Conexão',
    message: 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.',
    action: 'Verificar conexão e tentar novamente',
    severity: 'warning',
    recoverable: true,
    userActions: ['Verifique sua conexão com a internet', 'Tente novamente em alguns segundos']
  },

  'timeout_error': {
    title: 'Tempo Limite Excedido',
    message: 'A operação demorou muito para responder. Isso pode ser devido a uma conexão lenta ou problemas no servidor.',
    action: 'Tentar novamente',
    severity: 'warning',
    recoverable: true,
    userActions: ['Aguarde alguns segundos', 'Tente novamente', 'Verifique sua conexão']
  },

  // Erros de configuração
  'clerk_missing_publishable_key': {
    title: 'Configuração Ausente',
    message: 'O sistema não está configurado corretamente. A chave de autenticação está ausente.',
    action: 'Contatar suporte técnico',
    severity: 'critical',
    recoverable: false,
    userActions: ['Entre em contato com o suporte técnico', 'Informe o código do erro']
  },

  'clerk_invalid_publishable_key': {
    title: 'Configuração Inválida',
    message: 'O sistema não está configurado corretamente. A chave de autenticação é inválida.',
    action: 'Contatar suporte técnico',
    severity: 'critical',
    recoverable: false,
    userActions: ['Entre em contato com o suporte técnico', 'Informe o código do erro']
  },

  // Erros de validação
  'form_param_format_invalid': {
    title: 'Formato Inválido',
    message: 'Alguns dados fornecidos estão em formato inválido. Verifique as informações e tente novamente.',
    action: 'Corrigir dados e tentar novamente',
    severity: 'warning',
    recoverable: false,
    userActions: ['Verifique se o email está no formato correto', 'Verifique se a senha atende aos requisitos']
  },

  'form_param_nil': {
    title: 'Campos Obrigatórios',
    message: 'Alguns campos obrigatórios não foram preenchidos. Complete todas as informações necessárias.',
    action: 'Preencher campos obrigatórios',
    severity: 'info',
    recoverable: false,
    userActions: ['Preencha todos os campos obrigatórios', 'Verifique se não há campos vazios']
  }
};

// Mensagens genéricas por tipo de erro
const GENERIC_ERROR_MESSAGES: Record<ClerkErrorType, ErrorMessageConfig> = {
  [ClerkErrorType.CLERK_AUTHENTICATION]: {
    title: 'Erro de Autenticação',
    message: 'Ocorreu um problema durante a autenticação. Verifique suas credenciais e tente novamente.',
    action: 'Verificar credenciais',
    severity: 'warning',
    recoverable: false,
    userActions: ['Verifique email e senha', 'Tente fazer login novamente']
  },

  [ClerkErrorType.CLERK_AUTHORIZATION]: {
    title: 'Acesso Negado',
    message: 'Você não tem permissão para acessar este recurso. Entre em contato com o administrador se necessário.',
    action: 'Contatar administrador',
    severity: 'error',
    recoverable: false,
    userActions: ['Verifique se tem as permissões necessárias', 'Entre em contato com o administrador']
  },

  [ClerkErrorType.CLERK_NETWORK]: {
    title: 'Problema de Conexão',
    message: 'Não foi possível conectar ao servidor de autenticação. Verifique sua internet e tente novamente.',
    action: 'Verificar conexão',
    severity: 'warning',
    recoverable: true,
    userActions: ['Verifique sua conexão com a internet', 'Tente novamente em alguns momentos']
  },

  [ClerkErrorType.CLERK_SESSION]: {
    title: 'Problema de Sessão',
    message: 'Ocorreu um problema com sua sessão. Faça login novamente para continuar.',
    action: 'Fazer login novamente',
    severity: 'warning',
    recoverable: false,
    userActions: ['Faça login novamente', 'Suas informações serão preservadas']
  },

  [ClerkErrorType.CLERK_CONFIGURATION]: {
    title: 'Erro de Configuração',
    message: 'O sistema não está configurado corretamente. Entre em contato com o suporte técnico.',
    action: 'Contatar suporte',
    severity: 'critical',
    recoverable: false,
    userActions: ['Entre em contato com o suporte técnico', 'Informe detalhes do erro']
  },

  [ClerkErrorType.CLERK_VALIDATION]: {
    title: 'Dados Inválidos',
    message: 'Alguns dados fornecidos são inválidos. Verifique as informações e tente novamente.',
    action: 'Corrigir dados',
    severity: 'info',
    recoverable: false,
    userActions: ['Verifique todos os campos', 'Corrija informações inválidas']
  }
};

/**
 * Obtém a configuração de mensagem para um erro do Clerk
 */
export function getClerkErrorMessage(error: ClerkError): ErrorMessageConfig {
  // Tentar encontrar mensagem específica pelo código
  if (error.clerkCode && CLERK_ERROR_MESSAGE_MAP[error.clerkCode]) {
    return CLERK_ERROR_MESSAGE_MAP[error.clerkCode];
  }

  // Mapear tipo do Clerk para tipo genérico
  const clerkType = mapAuthTypeToClerkType(error.type);
  
  // Usar mensagem genérica baseada no tipo
  if (GENERIC_ERROR_MESSAGES[clerkType]) {
    return GENERIC_ERROR_MESSAGES[clerkType];
  }

  // Fallback para erro genérico
  return {
    title: 'Erro Inesperado',
    message: error.message || 'Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.',
    action: 'Tentar novamente',
    severity: 'error',
    recoverable: error.recoverable,
    userActions: ['Tente novamente', 'Entre em contato com o suporte se o problema persistir']
  };
}

/**
 * Gera uma mensagem de erro formatada para exibição ao usuário
 */
export function formatClerkErrorForUser(error: ClerkError): string {
  const config = getClerkErrorMessage(error);
  
  let message = config.message;
  
  if (config.action) {
    message += ` ${config.action}.`;
  }
  
  return message;
}

/**
 * Verifica se um erro é crítico e requer atenção imediata
 */
export function isClerkErrorCritical(error: ClerkError): boolean {
  const config = getClerkErrorMessage(error);
  return config.severity === 'critical';
}

/**
 * Obtém ações recomendadas para o usuário
 */
export function getClerkErrorUserActions(error: ClerkError): string[] {
  const config = getClerkErrorMessage(error);
  return config.userActions || [];
}

/**
 * Verifica se deve mostrar botão de retry
 */
export function shouldShowClerkRetryButton(error: ClerkError): boolean {
  const config = getClerkErrorMessage(error);
  return config.recoverable && config.severity !== 'critical';
}

// Função auxiliar para mapear tipos
function mapAuthTypeToClerkType(authType: string): ClerkErrorType {
  switch (authType) {
    case 'authentication':
      return ClerkErrorType.CLERK_AUTHENTICATION;
    case 'authorization':
      return ClerkErrorType.CLERK_AUTHORIZATION;
    case 'network':
      return ClerkErrorType.CLERK_NETWORK;
    case 'validation':
      return ClerkErrorType.CLERK_VALIDATION;
    case 'database':
      return ClerkErrorType.CLERK_CONFIGURATION;
    case 'timeout':
      return ClerkErrorType.CLERK_NETWORK;
    default:
      return ClerkErrorType.CLERK_NETWORK;
  }
}