/**
 * 🎯 HOOK DE AUTH OTIMIZADO V2
 * 
 * Substitui o hook useAuth atual com:
 * - Single-flight pattern para eliminar race conditions
 * - Estados determinísticos
 * - Performance otimizada
 * - Zero loops infinitos
 */

import { useContext, useMemo, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSecureAuth } from '@/contexts/SecureAuthContext';
import { determineAuthRoute, measureAuthDecisionPerformance } from '@/utils/auth-decision-engine';
import { AuthStateContext, AUTH_V2_ENABLED } from '@/types/auth-state';
import { authFlightManager } from '@/utils/single-flight-manager';

/**
 * Hook principal - interface compatível com useAuth atual
 */
export function useOptimizedAuth() {
  const location = useLocation();
  const legacyAuth = useSecureAuth(); // Mantém compatibilidade
  
  // Se feature flag não estiver ativa, usar sistema legado
  if (!AUTH_V2_ENABLED) {
    return legacyAuth;
  }

  // Usar novo sistema otimizado
  return useNewAuthSystem();
}

/**
 * 🚀 Sistema de auth completamente novo
 */
function useNewAuthSystem() {
  const location = useLocation();
  const legacyAuth = useSecureAuth();
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // Construir contexto para decisão
  const authContext: AuthStateContext = useMemo(() => ({
    hasValidToken: !!legacyAuth.session?.access_token,
    user: legacyAuth.user ? {
      id: legacyAuth.user.id,
      email: legacyAuth.user.email || ''
    } : null,
    profile: legacyAuth.profile ? {
      id: legacyAuth.profile.id,
      primeiro_acesso: legacyAuth.profile.primeiro_acesso,
      nome_completo: legacyAuth.profile.nome_completo,
      email: legacyAuth.profile.email,
      ativo: legacyAuth.profile.ativo
    } : null,
    roles: legacyAuth.roles.map(role => ({
      role: role.role,
      ativo: role.ativo,
      clinica_id: role.clinica_id
    })),
    currentPath: location.pathname
  }), [legacyAuth.session, legacyAuth.user, legacyAuth.profile, legacyAuth.roles, location.pathname]);

  // Decisão de roteamento com performance monitoring
  const authDecision = useMemo(() => {
    if (!authContext.hasValidToken && !authContext.user) {
      return {
        state: 'ANONYMOUS' as const,
        decision: 'REDIRECT_AUTH' as const,
        reason: 'No token or user',
        redirectPath: '/auth'
      };
    }

    return measureAuthDecisionPerformance(authContext);
  }, [authContext]);

  // Compatibilidade com interface atual
  const optimizedAuthState = useMemo(() => ({
    // Dados principais
    user: legacyAuth.user,
    session: legacyAuth.session,
    profile: legacyAuth.profile,
    roles: legacyAuth.roles,
    currentRole: legacyAuth.currentRole,
    
    // Estados computados
    isAuthenticated: authDecision.state !== 'ANONYMOUS',
    isLoading: legacyAuth.isLoading && !isOptimizing, // Reduz loading desnecessário
    isProfileLoading: legacyAuth.isProfileLoading,
    isRolesLoading: legacyAuth.isRolesLoading,
    isOnboardingComplete: authDecision.state === 'AUTHENTICATED_EXISTING',
    
    // Métodos (mantém compatibilidade)
    signIn: legacyAuth.signIn,
    signUp: legacyAuth.signUp,
    signOut: legacyAuth.signOut,
    hasRole: legacyAuth.hasRole,
    getCurrentRole: legacyAuth.getCurrentRole,
    refreshProfile: createOptimizedRefresh(legacyAuth.refreshProfile),
    refreshUserData: createOptimizedRefresh(legacyAuth.refreshUserData),
    clearAuthCache: legacyAuth.clearAuthCache,
    getAuthState: legacyAuth.getAuthState,
    fixMissingUserData: legacyAuth.fixMissingUserData,
    
    // Novos métodos V2
    authDecision,
    flightStatus: authFlightManager.getAuthFlightStatus()
  }), [legacyAuth, authDecision, isOptimizing]);

  // Log de performance em desenvolvimento
  useEffect(() => {
    if (import.meta.env.DEV && authDecision.performanceMs) {
      if (authDecision.performanceMs > 2) {

      } else {

      }
    }
  }, [authDecision.performanceMs]);

  return optimizedAuthState;
}

/**
 * 🔄 Funções otimizadas de refresh com single-flight
 */
function createOptimizedRefresh(originalRefresh: () => Promise<void>) {
  return async () => {
    const refreshFn = async () => {
      await originalRefresh();
      return true;
    };

    try {
      await authFlightManager.flightManager.execute(
        'refresh:profile', 
        refreshFn, 
        3000
      );
    } catch (error) {

      throw error;
    }
  };
}

/**
 * 🎯 Hook específico para decisão de roteamento
 */
export function useAuthRoute() {
  const { authDecision } = useOptimizedAuth();
  return authDecision;
}

/**
 * 🔍 Hook para diagnóstico de auth
 */
export function useAuthDiagnostics() {
  const location = useLocation();
  const legacyAuth = useSecureAuth();
  
  const context: AuthStateContext = useMemo(() => ({
    hasValidToken: !!legacyAuth.session?.access_token,
    user: legacyAuth.user ? {
      id: legacyAuth.user.id,
      email: legacyAuth.user.email || ''
    } : null,
    profile: legacyAuth.profile ? {
      id: legacyAuth.profile.id,
      primeiro_acesso: legacyAuth.profile.primeiro_acesso,
      nome_completo: legacyAuth.profile.nome_completo,
      email: legacyAuth.profile.email,
      ativo: legacyAuth.profile.ativo
    } : null,
    roles: legacyAuth.roles.map(role => ({
      role: role.role,
      ativo: role.ativo,
      clinica_id: role.clinica_id
    })),
    currentPath: location.pathname
  }), [legacyAuth, location.pathname]);

  return useMemo(() => {
    const authDecision = measureAuthDecisionPerformance(context);
    const flightStatus = authFlightManager.getAuthFlightStatus();
    
    return {
      ...authDecision,
      flightStatus,
      isOptimized: AUTH_V2_ENABLED,
      context
    };
  }, [context]);
}

/**
 * 🛡️ Hook para controle de loading otimizado
 */
export function useOptimizedLoading() {
  const [forceTimeout, setForceTimeout] = useState(false);
  const auth = useOptimizedAuth();
  
  // Timeout agressivo para prevenir loading infinito
  useEffect(() => {
    if (auth.isLoading) {
      const timeout = setTimeout(() => {

        setForceTimeout(true);
      }, 3000); // 3 segundos máximo
      
      return () => clearTimeout(timeout);
    } else {
      setForceTimeout(false);
    }
  }, [auth.isLoading]);
  
  return {
    isLoading: auth.isLoading && !forceTimeout,
    isForceTimeout: forceTimeout,
    authState: auth.authDecision.state
  };
}

/**
 * 🚨 Hook para emergências - cancela todos os flights
 */
export function useAuthEmergencyControls() {
  return {
    cancelAllFlights: () => {

      authFlightManager.cancelAllAuthFlights();
    },
    
    forceRefresh: () => {

      window.location.reload();
    },
    
    forceDashboard: () => {

      window.location.href = '/dashboard';
    },
    
    forceLogout: () => {

      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/auth';
    }
  };
}
