/**
 * 🔐 CONTEXTO DE AUTENTICAÇÃO UNIFICADO
 * 
 * Substitui todos os contextos de auth existentes com uma implementação
 * robusta, sem race conditions e com tratamento de erros adequado.
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { ComponentStateValidator, StateRecovery, useStateValidation } from '@/utils/stateValidator';
import { handleError } from '@/utils/errorHandler';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

type UserRole = Database['public']['Enums']['user_role_type'];

export interface UserProfile {
  id: string;
  nome_completo: string;
  email: string;
  telefone?: string;
  avatar_url?: string;
  ativo: boolean;
  primeiro_acesso: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface UserRoleContext {
  id: string;
  user_id: string;
  organizacao_id?: string;
  clinica_id?: string;
  role: UserRole;
  ativo: boolean;
  criado_em: string;
  criado_por: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: UserRoleContext[];
  currentRole: UserRole | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  isRolesLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  // Métodos de autenticação
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  
  // Métodos de autorização
  hasRole: (role: UserRole) => boolean;
  getCurrentRole: () => UserRole | null;
  
  // Métodos de dados
  refreshProfile: () => Promise<void>;
  refreshUserData: (force?: boolean) => Promise<void>;
  
  // Estados computados
  isAuthenticated: boolean;
  isOnboardingComplete: boolean;
  
  // Utilitários
  clearError: () => void;
}

// ============================================================================
// ESTADO INICIAL E REDUCER
// ============================================================================

const initialState: AuthState = {
  user: null,
  session: null,
  profile: null,
  roles: [],
  currentRole: null,
  isLoading: true,
  isProfileLoading: false,
  isRolesLoading: false,
  isInitialized: false,
  error: null
};

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_PROFILE_LOADING'; payload: boolean }
  | { type: 'SET_ROLES_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: { user: User; session: Session } | null }
  | { type: 'SET_PROFILE'; payload: UserProfile | null }
  | { type: 'SET_ROLES'; payload: UserRoleContext[] }
  | { type: 'SET_CURRENT_ROLE'; payload: UserRole | null }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'RESET' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_PROFILE_LOADING':
      return { ...state, isProfileLoading: action.payload };
    
    case 'SET_ROLES_LOADING':
      return { ...state, isRolesLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_USER':
      return {
        ...state,
        user: action.payload?.user || null,
        session: action.payload?.session || null,
        isLoading: false,
        error: null
      };
    
    case 'SET_PROFILE':
      return {
        ...state,
        profile: action.payload,
        isProfileLoading: false,
        error: null
      };
    
    case 'SET_ROLES':
      return {
        ...state,
        roles: action.payload,
        currentRole: action.payload[0]?.role || null,
        isRolesLoading: false,
        error: null
      };
    
    case 'SET_CURRENT_ROLE':
      return { ...state, currentRole: action.payload };
    
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };
    
    case 'RESET':
      return { ...initialState, isInitialized: true };
    
    default:
      return state;
  }
}

// ============================================================================
// CONTEXTO E PROVIDER
// ============================================================================

const UnifiedAuthContext = createContext<AuthContextType | undefined>(undefined);

interface UnifiedAuthProviderProps {
  children: ReactNode;
}

export function UnifiedAuthProvider({ children }: UnifiedAuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Validar estado inicial
  const stateValidation = useStateValidation(
    state,
    ComponentStateValidator.validateAuthState,
    { strict: false, logErrors: true, throwOnError: false }
  );

  // Recuperar estado se inválido
  useEffect(() => {
    if (!stateValidation.isValid) {
      const recoveredState = StateRecovery.recoverAuthState(state);
      // Aplicar estado recuperado se necessário
      if (JSON.stringify(recoveredState) !== JSON.stringify(state)) {
        dispatch({ type: 'RESET' });
      }
    }
  }, [stateValidation.isValid, state]);

  // ==========================================================================
  // INICIALIZAÇÃO SEGURA
  // ==========================================================================

  useEffect(() => {
    let isMounted = true;
    let isInitialized = false;

    const initializeAuth = async () => {
      if (isInitialized) return;
      isInitialized = true;

      try {
        // Verificar sessão existente
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (isMounted) {
          if (session?.user && !error) {
            dispatch({ type: 'SET_USER', payload: { user: session.user, session } });
            await loadUserData(session.user.id);
          } else {
            dispatch({ type: 'RESET' });
          }
          dispatch({ type: 'SET_INITIALIZED', payload: true });
        }
      } catch (error) {
        if (isMounted) {
          const appError = handleError(error, { context: 'AuthInitialization' });
          dispatch({ type: 'SET_ERROR', payload: appError.message });
          dispatch({ type: 'SET_INITIALIZED', payload: true });
        }
      }
    };

    initializeAuth();

    // Listener para mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          dispatch({ type: 'SET_USER', payload: { user: session.user, session } });
          await loadUserData(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          dispatch({ type: 'RESET' });
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ==========================================================================
  // MÉTODOS DE DADOS
  // ==========================================================================

  const loadUserData = useCallback(async (userId: string) => {
    try {
      dispatch({ type: 'SET_PROFILE_LOADING', payload: true });
      dispatch({ type: 'SET_ROLES_LOADING', payload: true });

      // Buscar profile e roles em paralelo
      const [profileResult, rolesResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('user_roles').select('*').eq('user_id', userId).eq('ativo', true)
      ]);

      if (profileResult.error) {
        const error = new Error(`Erro ao buscar profile: ${profileResult.error.message}`);
        handleError(error, { context: 'loadUserData', userId });
        throw error;
      }

      if (rolesResult.error) {
        const error = new Error(`Erro ao buscar roles: ${rolesResult.error.message}`);
        handleError(error, { context: 'loadUserData', userId });
        throw error;
      }

      dispatch({ type: 'SET_PROFILE', payload: profileResult.data });
      dispatch({ type: 'SET_ROLES', payload: rolesResult.data || [] });
    } catch (error) {
      const appError = handleError(error, { context: 'loadUserData', userId });
      dispatch({ type: 'SET_ERROR', payload: appError.message });
    }
  }, []);

  // ==========================================================================
  // MÉTODOS DE AUTENTICAÇÃO
  // ==========================================================================

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        return { error };
      }

      if (data.user && data.session) {
        dispatch({ type: 'SET_USER', payload: { user: data.user, session: data.session } });
        await loadUserData(data.user.id);
      }

      return { error: null };
    } catch (error) {
      const appError = handleError(error, { context: 'signIn', email });
      dispatch({ type: 'SET_ERROR', payload: appError.message });
      return { error: { message: appError.message } };
    }
  }, [loadUserData]);

  const signUp = useCallback(async (email: string, password: string, metadata?: any) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) {
        dispatch({ type: 'SET_ERROR', payload: error.message });
        return { error };
      }

      return { error: null };
    } catch (error) {
      const appError = handleError(error, { context: 'signUp', email });
      dispatch({ type: 'SET_ERROR', payload: appError.message });
      return { error: { message: appError.message } };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      dispatch({ type: 'RESET' });
    } catch (error) {
      const appError = handleError(error, { context: 'signOut' });
      dispatch({ type: 'SET_ERROR', payload: appError.message });
    }
  }, []);

  // ==========================================================================
  // MÉTODOS DE AUTORIZAÇÃO
  // ==========================================================================

  const hasRole = useCallback((role: UserRole): boolean => {
    return state.roles.some(r => r.role === role && r.ativo);
  }, [state.roles]);

  const getCurrentRole = useCallback((): UserRole | null => {
    return state.currentRole;
  }, [state.currentRole]);

  // ==========================================================================
  // MÉTODOS DE DADOS
  // ==========================================================================

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    await loadUserData(state.user.id);
  }, [state.user, loadUserData]);

  const refreshUserData = useCallback(async (force = false) => {
    if (!state.user) return;
    await loadUserData(state.user.id);
  }, [state.user, loadUserData]);

  // ==========================================================================
  // UTILITÁRIOS
  // ==========================================================================

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // ==========================================================================
  // ESTADOS COMPUTADOS
  // ==========================================================================

  const isAuthenticated = !!state.user && !!state.session;
  const isOnboardingComplete = state.profile ? !state.profile.primeiro_acesso : false;

  // ==========================================================================
  // VALOR DO CONTEXTO
  // ==========================================================================

  const contextValue: AuthContextType = {
    // Estado
    ...state,
    
    // Métodos de autenticação
    signIn,
    signUp,
    signOut,
    
    // Métodos de autorização
    hasRole,
    getCurrentRole,
    
    // Métodos de dados
    refreshProfile,
    refreshUserData,
    
    // Estados computados
    isAuthenticated,
    isOnboardingComplete,
    
    // Utilitários
    clearError
  };

  return (
    <UnifiedAuthContext.Provider value={contextValue}>
      {children}
    </UnifiedAuthContext.Provider>
  );
}

// ============================================================================
// HOOK PERSONALIZADO
// ============================================================================

export function useUnifiedAuth(): AuthContextType {
  const context = useContext(UnifiedAuthContext);
  
  if (context === undefined) {
    throw new Error('useUnifiedAuth must be used within a UnifiedAuthProvider');
  }
  
  return context;
}

// Hooks de conveniência
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useUnifiedAuth();
  return isAuthenticated;
}

export function useHasRole(role: UserRole): boolean {
  const { hasRole } = useUnifiedAuth();
  return hasRole(role);
}

export function useCurrentUser(): User | null {
  const { user } = useUnifiedAuth();
  return user;
}

export function useCurrentProfile(): UserProfile | null {
  const { profile } = useUnifiedAuth();
  return profile;
}
