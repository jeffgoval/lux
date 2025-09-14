/**
 * 🎯 ESTADOS DE AUTENTICAÇÃO DETERMINÍSTICOS
 * 
 * Sistema redesenhado para eliminar race conditions e loops infinitos.
 * Cada estado é mutuamente exclusivo e bem definido.
 */

export type AuthState = 
  | 'ANONYMOUS'           // Não autenticado
  | 'AUTHENTICATED_NEW'   // Autenticado, primeiro acesso (precisa onboarding)
  | 'AUTHENTICATED_EXISTING' // Autenticado, usuário existente
  | 'ONBOARDING_IN_PROGRESS' // Em processo de onboarding
  | 'ERROR_STATE'         // Estado de erro (fallback)

export type RouteDecision = 
  | 'REDIRECT_AUTH'       // → /auth
  | 'REDIRECT_ONBOARDING' // → /onboarding  
  | 'ALLOW_ACCESS'        // → rota solicitada
  | 'REDIRECT_DASHBOARD'  // → /dashboard (fallback seguro)
  | 'DENY_ACCESS'         // → /unauthorized

/**
 * Critérios concretos para identificar cada estado
 */
export interface AuthStateContext {
  // Supabase Auth
  hasValidToken: boolean;
  user: {
    id: string;
    email: string;
  } | null;
  
  // Profile data
  profile: {
    id: string;
    primeiro_acesso: boolean;
    nome_completo: string;
    email: string;
    ativo: boolean;
  } | null;
  
  // Roles context
  roles: Array<{
    role: string;
    ativo: boolean;
    clinica_id?: string;
  }>;
  
  // Current route context
  currentPath: string;
  requestedPath?: string;
}

/**
 * Regras de decisão de roteamento
 * 
 * IMPORTANTE: Ordem das verificações é crítica!
 * Não alterar sem análise de impacto.
 */
export const AUTH_DECISION_RULES = {
  /**
   * REGRA 1: Token inválido → Login obrigatório
   */
  INVALID_TOKEN: (ctx: AuthStateContext): boolean => {
    return !ctx.hasValidToken || !ctx.user;
  },

  /**
   * REGRA 2: Profile inexistente → Login obrigatório  
   * (Evita estados intermediários problemáticos)
   */
  MISSING_PROFILE: (ctx: AuthStateContext): boolean => {
    return ctx.hasValidToken && ctx.user && !ctx.profile;
  },

  /**
   * REGRA 3: Primeiro acesso → Onboarding obrigatório
   */
  NEEDS_ONBOARDING: (ctx: AuthStateContext): boolean => {
    return ctx.profile?.primeiro_acesso === true;
  },

  /**
   * REGRA 4: Em processo de onboarding → Permitir apenas onboarding
   */
  ONBOARDING_IN_PROGRESS: (ctx: AuthStateContext): boolean => {
    return ctx.currentPath === '/onboarding' && ctx.profile?.primeiro_acesso === true;
  },

  /**
   * REGRA 5: Usuário válido existente → Acesso liberado
   */
  VALID_EXISTING_USER: (ctx: AuthStateContext): boolean => {
    return ctx.profile?.primeiro_acesso === false && 
           ctx.profile?.ativo === true;
  }
};

/**
 * Estados de transição válidos
 * 
 * Diagrama de estados:
 * 
 * ANONYMOUS 
 *    ↓ (login)
 * AUTHENTICATED_NEW 
 *    ↓ (onboarding)
 * ONBOARDING_IN_PROGRESS
 *    ↓ (complete)
 * AUTHENTICATED_EXISTING
 * 
 * ERROR_STATE ← (fallback de qualquer estado com problema)
 */
export const VALID_TRANSITIONS: Record<AuthState, AuthState[]> = {
  'ANONYMOUS': ['AUTHENTICATED_NEW', 'AUTHENTICATED_EXISTING', 'ERROR_STATE'],
  'AUTHENTICATED_NEW': ['ONBOARDING_IN_PROGRESS', 'AUTHENTICATED_EXISTING', 'ERROR_STATE', 'ANONYMOUS'],
  'ONBOARDING_IN_PROGRESS': ['AUTHENTICATED_EXISTING', 'ERROR_STATE', 'ANONYMOUS'],
  'AUTHENTICATED_EXISTING': ['ANONYMOUS', 'ERROR_STATE'],
  'ERROR_STATE': ['ANONYMOUS']
};

/**
 * Mapeamento de estados para decisões de rota
 */
export const STATE_TO_ROUTE_DECISION: Record<AuthState, RouteDecision> = {
  'ANONYMOUS': 'REDIRECT_AUTH',
  'AUTHENTICATED_NEW': 'REDIRECT_ONBOARDING', 
  'AUTHENTICATED_EXISTING': 'ALLOW_ACCESS',
  'ONBOARDING_IN_PROGRESS': 'ALLOW_ACCESS', // Permite apenas se já estiver em onboarding
  'ERROR_STATE': 'REDIRECT_DASHBOARD' // Fallback seguro
};

/**
 * Rotas que não precisam de autenticação
 */
export const PUBLIC_ROUTES = [
  '/',
  '/auth', 
  '/unauthorized',
  '/404'
];

/**
 * Rotas que exigem roles específicas
 */
export const ROLE_PROTECTED_ROUTES = [
  '/agendamento',
  '/clientes', 
  '/servicos',
  '/produtos',
  '/equipamentos',
  '/financeiro',
  '/comunicacao',
  '/prontuarios',
  '/executivo',
  '/alertas'
];

/**
 * Feature flag para habilitar novo sistema
 */
export const AUTH_V2_ENABLED = import.meta.env.VITE_AUTH_V2_ENABLED === 'true' || 
  (typeof window !== 'undefined' && window.localStorage?.getItem('AUTH_V2_ENABLED') === 'true');
