/**
 * 🧠 MOTOR DE DECISÃO DE AUTENTICAÇÃO
 * 
 * Algoritmo determinístico que elimina race conditions e loops infinitos.
 * Execução linear, sem operações assíncronas ou timeouts.
 */

import {
  AuthState,
  AuthStateContext,
  RouteDecision,
  AUTH_DECISION_RULES,
  STATE_TO_ROUTE_DECISION,
  PUBLIC_ROUTES,
  ROLE_PROTECTED_ROUTES
} from '@/types/auth-state';

/**
 * 🎯 FUNÇÃO PRINCIPAL DE DECISÃO
 * 
 * CRÍTICO: Esta função deve ser:
 * - Pura (sem side effects)
 * - Determinística (mesmo input = mesmo output)
 * - Síncrona (sem awaits)
 * - Rápida (< 10ms)
 */
export function determineAuthRoute(context: AuthStateContext): {
  state: AuthState;
  decision: RouteDecision;
  reason: string;
  redirectPath?: string;
} {
  // ETAPA 1: Determinar estado atual do usuário
  const currentState = determineAuthState(context);
  
  // ETAPA 2: Aplicar regras de roteamento baseadas no estado
  const decision = applyRoutingRules(currentState, context);
  
  return {
    state: currentState,
    decision: decision.action,
    reason: decision.reason,
    redirectPath: decision.redirectPath
  };
}

/**
 * 🔍 DETERMINAÇÃO DE ESTADO
 * 
 * Usa short-circuit evaluation para máxima performance.
 * Ordem das verificações é CRÍTICA - não alterar!
 */
function determineAuthState(ctx: AuthStateContext): AuthState {
  // REGRA 1: Token inválido = ANONYMOUS
  if (AUTH_DECISION_RULES.INVALID_TOKEN(ctx)) {
    return 'ANONYMOUS';
  }
  
  // REGRA 2: Profile inexistente = ANONYMOUS (força re-login)
  if (AUTH_DECISION_RULES.MISSING_PROFILE(ctx)) {
    return 'ANONYMOUS';
  }
  
  // REGRA 3: Onboarding em andamento
  if (AUTH_DECISION_RULES.ONBOARDING_IN_PROGRESS(ctx)) {
    return 'ONBOARDING_IN_PROGRESS';
  }
  
  // REGRA 4: Precisa de onboarding
  if (AUTH_DECISION_RULES.NEEDS_ONBOARDING(ctx)) {
    return 'AUTHENTICATED_NEW';
  }
  
  // REGRA 5: Usuário existente válido
  if (AUTH_DECISION_RULES.VALID_EXISTING_USER(ctx)) {
    return 'AUTHENTICATED_EXISTING';
  }
  
  // FALLBACK: Estado de erro (não deveria chegar aqui)

  return 'ERROR_STATE';
}

/**
 * 📍 APLICAÇÃO DE REGRAS DE ROTEAMENTO
 */
function applyRoutingRules(state: AuthState, ctx: AuthStateContext): {
  action: RouteDecision;
  reason: string;
  redirectPath?: string;
} {
  const currentPath = ctx.currentPath;
  
  // Verificar se é rota pública
  if (isPublicRoute(currentPath)) {
    return {
      action: 'ALLOW_ACCESS',
      reason: `Rota pública: ${currentPath}`
    };
  }
  
  // Aplicar decisão baseada no estado
  switch (state) {
    case 'ANONYMOUS':
      return {
        action: 'REDIRECT_AUTH',
        reason: 'Usuário não autenticado',
        redirectPath: '/auth'
      };
      
    case 'AUTHENTICATED_NEW':
      if (currentPath === '/onboarding') {
        return {
          action: 'ALLOW_ACCESS',
          reason: 'Usuário novo acessando onboarding'
        };
      }
      return {
        action: 'REDIRECT_ONBOARDING',
        reason: 'Usuário precisa completar onboarding',
        redirectPath: '/onboarding'
      };
      
    case 'ONBOARDING_IN_PROGRESS':
      if (currentPath === '/onboarding') {
        return {
          action: 'ALLOW_ACCESS',
          reason: 'Onboarding em progresso'
        };
      }
      return {
        action: 'REDIRECT_ONBOARDING',
        reason: 'Redirecionando para completar onboarding',
        redirectPath: '/onboarding'
      };
      
    case 'AUTHENTICATED_EXISTING':
      // Verificar permissões para rotas protegidas
      if (isRoleProtectedRoute(currentPath)) {
        if (hasRequiredRole(ctx)) {
          return {
            action: 'ALLOW_ACCESS',
            reason: 'Usuário autorizado para rota protegida'
          };
        } else {
          return {
            action: 'DENY_ACCESS',
            reason: 'Usuário não tem permissão para esta rota',
            redirectPath: '/unauthorized'
          };
        }
      }
      
      return {
        action: 'ALLOW_ACCESS',
        reason: 'Usuário existente com acesso liberado'
      };
      
    case 'ERROR_STATE':
    default:
      return {
        action: 'REDIRECT_DASHBOARD',
        reason: 'Estado de erro - redirecionando para dashboard',
        redirectPath: '/dashboard'
      };
  }
}

/**
 * 🔒 VERIFICAÇÕES DE PERMISSÃO
 */
function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(route => 
    path === route || path.startsWith(route + '/')
  );
}

function isRoleProtectedRoute(path: string): boolean {
  return ROLE_PROTECTED_ROUTES.some(route =>
    path.startsWith(route)
  );
}

function hasRequiredRole(ctx: AuthStateContext): boolean {
  // Para esta implementação, qualquer role ativo é suficiente
  // TODO: Implementar verificação granular de roles por rota
  return ctx.roles.some(role => role.ativo === true);
}

/**
 * 🧪 HELPER DE TESTE
 * 
 * Cria contexto de teste para validações
 */
export function createTestContext(overrides: Partial<AuthStateContext>): AuthStateContext {
  return {
    hasValidToken: false,
    user: null,
    profile: null,
    roles: [],
    currentPath: '/',
    ...overrides
  };
}

/**
 * 📊 DIAGNÓSTICO DE ESTADO
 * 
 * Útil para debugging e monitoramento
 */
export function diagnoseAuthState(context: AuthStateContext) {
  const result = determineAuthRoute(context);
  
  return {
    ...result,
    diagnostics: {
      hasToken: context.hasValidToken,
      hasUser: !!context.user,
      hasProfile: !!context.profile,
      profileFirstAccess: context.profile?.primeiro_acesso,
      profileActive: context.profile?.ativo,
      rolesCount: context.roles.length,
      activeRoles: context.roles.filter(r => r.ativo).length,
      currentPath: context.currentPath,
      isPublicRoute: isPublicRoute(context.currentPath),
      isProtectedRoute: isRoleProtectedRoute(context.currentPath),
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * 🚀 PERFORMANCE MONITOR
 * 
 * Mede performance da decisão de roteamento
 */
export function measureAuthDecisionPerformance(context: AuthStateContext) {
  const start = performance.now();
  const result = determineAuthRoute(context);
  const duration = performance.now() - start;
  
  // Log se demorar mais que 5ms (algo está errado)
  if (duration > 5) {

  }
  
  return {
    ...result,
    performanceMs: duration
  };
}
