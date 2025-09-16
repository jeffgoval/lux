/**
 * 🔐 CONTEXTO DE AUTENTICAÇÃO UNIFICADO V2
 * 
 * Substitui todos os contextos de auth existentes com uma implementação
 * robusta, determinística e sem race conditions.
 * 
 * Features:
 * - Estado unificado com onboardingStatus determinístico
 * - Estados granulares de loading (isInitializing, isProfileLoading, isOnboardingLoading)
 * - Lógica de transições de estado sem race conditions
 * - Sistema de cache otimizado com TTL de 5 minutos
 * - Tratamento robusto de erros com recovery automático
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

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

// Estados granulares conforme especificação
type OnboardingStatus = 'not_started' | 'in_progress' | 'completed';

interface AuthState {
  // Core authentication
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: UserRoleContext[];
  currentRole: UserRole | null;
  
  // Onboarding state determinístico
  onboardingStatus: OnboardingStatus;
  
  // Loading states granulares
  isInitializing: boolean;
  isProfileLoading: boolean;
  isOnboardingLoading: boolean;
  
  // Estado geral
  isInitialized: boolean;
  error: string | null;
  canRetry: boolean;
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
  retry: () => Promise<void>;
}

// ============================================================================
// CACHE SYSTEM COM TTL DE 5 MINUTOS
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class AuthCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutos

  set<T>(key: string, data: T, customTtl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: customTtl || this.TTL
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

const authCache = new AuthCache();

// ============================================================================
// ESTADO INICIAL E REDUCER
// ============================================================================

const initialState: AuthState = {
  // Core authentication
  user: null,
  session: null,
  profile: null,
  roles: [],
  currentRole: null,
  
  // Onboarding state determinístico
  onboardingStatus: 'not_started',
  
  // Loading states granulares
  isInitializing: true,
  isProfileLoading: false,
  isOnboardingLoading: false,
  
  // Estado geral
  isInitialized: false,
  error: null,
  canRetry: false
};

type AuthAction =
  | { type: 'SET_INITIALIZING'; payload: boolean }
  | { type: 'SET_PROFILE_LOADING'; payload: boolean }
  | { type: 'SET_ONBOARDING_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: { error: string | null; canRetry: boolean } }
  | { type: 'SET_USER'; payload: { user: User; session: Session } | null }
  | { type: 'SET_PROFILE'; payload: UserProfile | null }
  | { type: 'SET_ROLES'; payload: UserRoleContext[] }
  | { type: 'SET_ONBOARDING_STATUS'; payload: OnboardingStatus }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'RESET' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_INITIALIZING':
      return { ...state, isInitializing: action.payload };
    
    case 'SET_PROFILE_LOADING':
      return { ...state, isProfileLoading: action.payload };
    
    case 'SET_ONBOARDING_LOADING':
      return { ...state, isOnboardingLoading: action.payload };
    
    case 'SET_ERROR':
      return { 
        ...state, 
        error: action.payload.error,
        canRetry: action.payload.canRetry,
        isInitializing: false,
        isProfileLoading: false,
        isOnboardingLoading: false
      };
    
    case 'SET_USER':
      const userData = action.payload;
      return {
        ...state,
        user: userData?.user || null,
        session: userData?.session || null,
        isInitializing: false,
        error: null,
        canRetry: false
      };
    
    case 'SET_PROFILE':
      const profile = action.payload;
      const newOnboardingStatus: OnboardingStatus = profile 
        ? (profile.primeiro_acesso ? 'in_progress' : 'completed')
        : 'not_started';
      
      return {
        ...state,
        profile,
        onboardingStatus: newOnboardingStatus,
        isProfileLoading: false,
        error: null,
        canRetry: false
      };
    
    case 'SET_ROLES':
      const roles = action.payload;
      return {
        ...state,
        roles,
        currentRole: roles[0]?.role || null,
        error: null,
        canRetry: false
      };
    
    case 'SET_ONBOARDING_STATUS':
      return { ...state, onboardingStatus: action.payload };
    
    case 'SET_INITIALIZED':
      return { 
        ...state, 
        isInitialized: action.payload,
        isInitializing: false
      };
    
    case 'RESET':
      authCache.clear();
      return { 
        ...initialState, 
        isInitialized: true,
        isInitializing: false
      };
    
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
  const initializationRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ==========================================================================
  // INICIALIZAÇÃO SEGURA E DETERMINÍSTICA
  // ==========================================================================

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      // Prevenir múltiplas inicializações
      if (initializationRef.current) return;
      initializationRef.current = true;

      try {
        dispatch({ type: 'SET_INITIALIZING', payload: true });

        // Verificar sessão existente com timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Session check timeout')), 5000);
        });

        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]);
        
        if (!isMounted) return;

        if (session?.user && !error) {
          dispatch({ type: 'SET_USER', payload: { user: session.user, session } });
          await loadUserData(session.user.id);
        } else {
          dispatch({ type: 'RESET' });
        }
        
        dispatch({ type: 'SET_INITIALIZED', payload: true });
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) {
          dispatch({ 
            type: 'SET_ERROR', 
            payload: { 
              error: 'Erro na inicialização da autenticação', 
              canRetry: true 
            }
          });
          dispatch({ type: 'SET_INITIALIZED', payload: true });
        }
      }
    };

    initializeAuth();

    // Listener para mudanças de auth - com debounce para evitar race conditions
    let authChangeTimeout: NodeJS.Timeout | null = null;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        // Debounce para evitar múltiplas execuções
        if (authChangeTimeout) {
          clearTimeout(authChangeTimeout);
        }

        authChangeTimeout = setTimeout(async () => {
          try {
            if (event === 'SIGNED_IN' && session?.user) {
              dispatch({ type: 'SET_USER', payload: { user: session.user, session } });
              await loadUserData(session.user.id);
            } else if (event === 'SIGNED_OUT') {
              dispatch({ type: 'RESET' });
            }
          } catch (error) {
            console.error('Auth state change error:', error);
            if (isMounted) {
              dispatch({ 
                type: 'SET_ERROR', 
                payload: { 
                  error: 'Erro na mudança de estado de autenticação', 
                  canRetry: true 
                }
              });
            }
          }
        }, 100); // 100ms debounce
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (authChangeTimeout) {
        clearTimeout(authChangeTimeout);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // ==========================================================================
  // MÉTODOS DE DADOS COM CACHE E RETRY
  // ==========================================================================

  const loadUserData = useCallback(async (userId: string, force = false) => {
    try {
      // Verificar cache primeiro, a menos que seja forçado
      if (!force) {
        const cachedProfile = authCache.get<UserProfile>(`profile_${userId}`);
        const cachedRoles = authCache.get<UserRoleContext[]>(`roles_${userId}`);
        
        if (cachedProfile && cachedRoles) {
          dispatch({ type: 'SET_PROFILE', payload: cachedProfile });
          dispatch({ type: 'SET_ROLES', payload: cachedRoles });
          return;
        }
      }

      dispatch({ type: 'SET_PROFILE_LOADING', payload: true });

      // Buscar profile e roles em paralelo com timeout
      const profilePromise = supabase
        .from('profissionais')
        .select('*')
        .eq('user_id', userId)
        .single();

      const rolesPromise = supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('ativo', true);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Data load timeout')), 10000);
      });

      const [profileResult, rolesResult] = await Promise.race([
        Promise.all([profilePromise, rolesPromise]),
        timeoutPromise
      ]);

      if (profileResult.error) {
        throw new Error(`Erro ao buscar profile: ${profileResult.error.message}`);
      }

      if (rolesResult.error) {
        throw new Error(`Erro ao buscar roles: ${rolesResult.error.message}`);
      }

      const profile = profileResult.data;
      const roles = rolesResult.data || [];

      // Atualizar cache
      authCache.set(`profile_${userId}`, profile);
      authCache.set(`roles_${userId}`, roles);

      // Atualizar estado
      dispatch({ type: 'SET_PROFILE', payload: profile });
      dispatch({ type: 'SET_ROLES', payload: roles });

    } catch (error) {
      console.error('Load user data error:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: { 
          error: error instanceof Error ? error.message : 'Erro ao carregar dados do usuário',
          canRetry: true
        }
      });
    }
  }, []);

  // ==========================================================================
  // MÉTODOS DE AUTENTICAÇÃO COM RETRY E TIMEOUT
  // ==========================================================================

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      dispatch({ type: 'SET_INITIALIZING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: { error: null, canRetry: false } });

      // Timeout para login
      const loginPromise = supabase.auth.signInWithPassword({
        email,
        password
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Login timeout')), 15000);
      });

      const { data, error } = await Promise.race([loginPromise, timeoutPromise]);

      if (error) {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: { 
            error: error.message, 
            canRetry: true 
          }
        });
        return { error };
      }

      if (data.user && data.session) {
        dispatch({ type: 'SET_USER', payload: { user: data.user, session: data.session } });
        
        // Aguardar um pouco para triggers do banco executarem
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await loadUserData(data.user.id, true); // Force refresh
      }

      return { error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro no login';
      dispatch({ 
        type: 'SET_ERROR', 
        payload: { 
          error: errorMessage, 
          canRetry: true 
        }
      });
      return { error: { message: errorMessage } };
    }
  }, [loadUserData]);

  const signUp = useCallback(async (email: string, password: string, metadata?: any) => {
    try {
      dispatch({ type: 'SET_INITIALIZING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: { error: null, canRetry: false } });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: { 
            error: error.message, 
            canRetry: true 
          }
        });
        return { error };
      }

      // Para signup, não carregamos dados imediatamente
      // O usuário será redirecionado para onboarding
      dispatch({ type: 'SET_INITIALIZING', payload: false });
      
      return { error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro no cadastro';
      dispatch({ 
        type: 'SET_ERROR', 
        payload: { 
          error: errorMessage, 
          canRetry: true 
        }
      });
      return { error: { message: errorMessage } };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      dispatch({ type: 'RESET' });
    } catch (error) {
      console.error('Sign out error:', error);
      // Mesmo com erro, limpar estado local
      dispatch({ type: 'RESET' });
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
  // MÉTODOS DE DADOS COM INVALIDAÇÃO DE CACHE
  // ==========================================================================

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    
    // Invalidar cache antes de recarregar
    authCache.invalidate(`profile_${state.user.id}`);
    authCache.invalidate(`roles_${state.user.id}`);
    
    await loadUserData(state.user.id, true);
  }, [state.user, loadUserData]);

  const refreshUserData = useCallback(async (force = false) => {
    if (!state.user) return;
    
    if (force) {
      authCache.invalidate(`profile_${state.user.id}`);
      authCache.invalidate(`roles_${state.user.id}`);
    }
    
    await loadUserData(state.user.id, force);
  }, [state.user, loadUserData]);

  // ==========================================================================
  // SISTEMA DE RETRY COM BACKOFF
  // ==========================================================================

  const retry = useCallback(async () => {
    if (!state.canRetry) return;

    try {
      dispatch({ type: 'SET_ERROR', payload: { error: null, canRetry: false } });
      
      if (state.user) {
        // Retry carregamento de dados
        await loadUserData(state.user.id, true);
      } else {
        // Retry inicialização
        initializationRef.current = false;
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          dispatch({ type: 'SET_USER', payload: { user: session.user, session } });
          await loadUserData(session.user.id, true);
        }
      }
    } catch (error) {
      console.error('Retry error:', error);
      
      // Implementar backoff exponencial
      const backoffDelay = Math.min(1000 * Math.pow(2, 1), 10000); // Max 10s
      
      retryTimeoutRef.current = setTimeout(() => {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: { 
            error: 'Falha na tentativa de recuperação. Tente novamente.', 
            canRetry: true 
          }
        });
      }, backoffDelay);
    }
  }, [state.canRetry, state.user, loadUserData]);

  // ==========================================================================
  // UTILITÁRIOS
  // ==========================================================================

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: { error: null, canRetry: false } });
  }, []);

  // ==========================================================================
  // ESTADOS COMPUTADOS
  // ==========================================================================

  const isAuthenticated = !!state.user && !!state.session;
  const isOnboardingComplete = state.onboardingStatus === 'completed';

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
    clearError,
    retry
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
