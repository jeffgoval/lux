/**
 * 🔐 CONTEXTO DE AUTENTICAÇÃO SEGURO V2
 * 
 * Context otimizado que elimina race conditions e loops infinitos
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import {
  AuthState,
  AuthContextValue,
  AuthAction,
  LoginCredentials,
  RegisterData,
  AuthResult,
  UserRole,
  Permission,
  UserClinicAccess,
  UserProfile,
  UserRoleContext
} from '@/types/auth.types';
import { authService } from '@/services/auth.service';
import { optimizedAuthService } from '@/services/optimized-auth.service';
import { AUTH_CONFIG } from '@/config/auth.config';
import { supabase } from '@/integrations/supabase/client';
import { authLogger } from '@/utils/logger';
import { authCache } from '@/utils/auth-cache';

// ============================================================================
// ESTADO INICIAL E REDUCER
// ============================================================================

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  profile: null,
  roles: [],
  currentRole: null,
  isProfileLoading: false,
  isRolesLoading: false,
  isOnboardingLoading: false, // Novo estado granular
  currentClinic: null,
  availableClinics: [],
  tokens: null,
  isInitialized: false,
  error: null
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        isProfileLoading: true,
        isRolesLoading: true,
        error: null
      };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isProfileLoading: false,
        isRolesLoading: false,
        isOnboardingLoading: false,
        isAuthenticated: true,
        user: action.payload.user || null,
        profile: action.payload.profile || null,
        roles: action.payload.roles || [],
        currentRole: action.payload.roles?.[0]?.role || null,
        tokens: action.payload.tokens || null,
        currentClinic: action.payload.currentClinic || null,
        availableClinics: action.payload.clinics || [],
        error: null
      };

    case 'LOGIN_FAILURE':
      return {
        ...state,
        isLoading: false,
        isProfileLoading: false,
        isRolesLoading: false,
        isOnboardingLoading: false,
        isAuthenticated: false,
        user: null,
        profile: null,
        roles: [],
        currentRole: null,
        tokens: null,
        currentClinic: null,
        availableClinics: [],
        error: action.payload
      };

    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false,
        isInitialized: true
      };

    case 'REFRESH_SUCCESS':
      return {
        ...state,
        tokens: action.payload,
        error: null
      };

    case 'SWITCH_CLINIC':
      return {
        ...state,
        currentClinic: action.payload
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
        isProfileLoading: false,
        isRolesLoading: false,
        isOnboardingLoading: false
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };

    case 'SET_PROFILE_LOADING':
      return {
        ...state,
        isProfileLoading: action.payload
      };

    case 'SET_ROLES_LOADING':
      return {
        ...state,
        isRolesLoading: action.payload
      };

    case 'SET_ONBOARDING_LOADING':
      return {
        ...state,
        isOnboardingLoading: action.payload
      };

    default:
      return state;
  }
}

// ============================================================================
// CONTEXTO E PROVIDER
// ============================================================================

const SecureAuthContext = createContext<AuthContextValue | undefined>(undefined);

interface SecureAuthProviderProps {
  children: React.ReactNode;
}

export function SecureAuthProvider({ children }: SecureAuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ==========================================================================
  // INICIALIZAÇÃO SEGURA
  // ==========================================================================

  useEffect(() => {
    let isMounted = true;
    let isInitialized = false;

    const initializeAuth = async () => {
      if (isInitialized) return; // Prevenir múltiplas inicializações
      isInitialized = true;

      try {
        // Usar Supabase diretamente para verificar autenticação
        const { data: { user }, error } = await supabase.auth.getUser();

        if (isMounted) {
          if (user && !error) {
            // Usuário autenticado - buscar dados completos
            const authResult = await refreshAuth();
            if (!authResult) {
              dispatch({ type: 'LOGOUT' });
            }
          } else {
            // Usuário não autenticado - estado inicial limpo
            dispatch({ type: 'LOGOUT' });
          }
        }
      } catch (error) {
        authLogger.error('Auth initialization error:', error);
        if (isMounted) {
          dispatch({ type: 'LOGOUT' });
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []); // Dependência vazia para executar apenas uma vez

  // ==========================================================================
  // MÉTODOS DE AUTENTICAÇÃO
  // ==========================================================================

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResult> => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const result = await authService.login(credentials);

      if (result.success && result.user) {
        // Notificar cache sobre login (não invalida para aproveitar cache existente)
        authCache.onAuthStateChange(result.user.id, 'login');
        dispatch({ type: 'LOGIN_SUCCESS', payload: result });
      } else {
        dispatch({ type: 'LOGIN_FAILURE', payload: result.error || 'Login failed' });
      }

      return result;
    } catch (error) {
      const errorMessage = AUTH_CONFIG.ERROR_MESSAGES.GENERIC_ERROR;
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<AuthResult> => {
    dispatch({ type: 'LOGIN_START' });

    try {
      // Usar Supabase Auth diretamente
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            nome_completo: data.name || data.email.split('@')[0]
          }
        }
      });

      if (authError) {
        dispatch({ type: 'LOGIN_FAILURE', payload: authError.message });
        return {
          success: false,
          error: authError.message
        };
      }

      if (authData.user) {
        // Aguardar um pouco para o trigger executar
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Buscar profile e roles criados pelo trigger
        const [profileResult, rolesResult] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', authData.user.id).single(),
          supabase.from('user_roles').select('*').eq('user_id', authData.user.id)
        ]);

        const profile = profileResult.data ? {
          id: profileResult.data.id,
          email: profileResult.data.email,
          nome_completo: profileResult.data.nome_completo,
          telefone: profileResult.data.telefone,
          primeiro_acesso: profileResult.data.primeiro_acesso,
          ativo: profileResult.data.ativo,
          criado_em: new Date(profileResult.data.criado_em),
          atualizado_em: profileResult.data.atualizado_em ? new Date(profileResult.data.atualizado_em) : undefined
        } : null;

        const roles = rolesResult.data?.map(role => ({
          role: role.role as UserRole,
          clinica_id: role.clinica_id,
          ativo: role.ativo
        })) || [];

        const user = {
          id: authData.user.id,
          email: authData.user.email || '',
          name: data.name || data.email.split('@')[0],
          isEmailVerified: authData.user.email_confirmed_at !== null,
          createdAt: new Date(authData.user.created_at),
          lastLoginAt: new Date()
        };

        dispatch({ type: 'LOGIN_SUCCESS', payload: {
          success: true,
          user,
          profile,
          roles,
          tokens: {
            accessToken: authData.session?.access_token || '',
            refreshToken: authData.session?.refresh_token || '',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos
            tokenType: 'Bearer' as const
          }
        }});

        return {
          success: true,
          user,
          profile,
          roles
        };
      }

      dispatch({ type: 'LOGIN_FAILURE', payload: 'Falha no cadastro' });
      return {
        success: false,
        error: 'Falha no cadastro'
      };
    } catch (error) {
      const errorMessage = 'Erro inesperado no cadastro';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });

      return {
        success: false,
        error: errorMessage
      };
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    const currentUserId = state.user?.id;
    
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Limpar cache do usuário
      if (currentUserId) {
        authCache.onAuthStateChange(currentUserId, 'logout');
      }
      dispatch({ type: 'LOGOUT' });
    }
  }, [state.user?.id]);

  const refreshAuth = useCallback(async (): Promise<boolean> => {
    try {
      // Verificar se há usuário autenticado no Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        dispatch({ type: 'LOGOUT' });
        return false;
      }

      // Usar serviço otimizado com cache inteligente (máximo 2 queries)
      const authData = await authCache.get(
        `${user.id}:complete_auth`,
        () => optimizedAuthService.getCompleteAuthData(user.id),
        5 * 60 * 1000 // 5 minutos TTL
      );

      if (!authData) {
        dispatch({ type: 'LOGOUT' });
        return false;
      }

      // Atualizar estado com dados completos
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: authData.user,
          profile: authData.profile,
          roles: authData.roles,
          tokens: null, // Supabase gerencia tokens internamente
          currentClinic: null,
          clinics: authData.clinics
        }
      });

      return true;
    } catch (error) {
      authLogger.error('Auth refresh error:', error);
      dispatch({ type: 'LOGOUT' });
      return false;
    }
  }, []); // Dependência vazia para evitar loops

  // ==========================================================================
  // MÉTODOS MULTI-TENANT
  // ==========================================================================

  const switchClinic = useCallback(async (clinicId: string): Promise<boolean> => {
    try {
      const success = await authService.switchClinic(clinicId);
      
      if (success) {
        const newCurrentClinic = state.availableClinics.find(
          clinic => clinic.clinic.id === clinicId
        );
        
        if (newCurrentClinic) {
          dispatch({ type: 'SWITCH_CLINIC', payload: newCurrentClinic });
        }
      }

      return success;
    } catch (error) {
      authLogger.error('Clinic switch error:', error);
      return false;
    }
  }, [state.availableClinics]);

  // ==========================================================================
  // MÉTODOS DE AUTORIZAÇÃO
  // ==========================================================================

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!state.isAuthenticated || !state.currentClinic) {
      return false;
    }

    return state.currentClinic.permissions.includes(permission);
  }, [state.isAuthenticated, state.currentClinic]);

  const hasRole = useCallback((role: UserRole): boolean => {
    if (!state.isAuthenticated || !state.currentClinic) {
      return false;
    }

    return state.currentClinic.role === role;
  }, [state.isAuthenticated, state.currentClinic]);

  const hasAnyRole = useCallback((roles: UserRole[]): boolean => {
    if (!state.isAuthenticated || !state.currentClinic) {
      return false;
    }

    return roles.includes(state.currentClinic.role);
  }, [state.isAuthenticated, state.currentClinic]);

  // ==========================================================================
  // MÉTODOS UTILITÁRIOS
  // ==========================================================================

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const isTokenExpired = useCallback((): boolean => {
    if (!state.tokens) return true;
    return new Date(state.tokens.expiresAt) <= new Date();
  }, [state.tokens]);

  // ==========================================================================
  // AUTO-REFRESH DE TOKENS
  // ==========================================================================

  useEffect(() => {
    if (!state.isAuthenticated || !state.tokens) return;

    const refreshInterval = setInterval(async () => {
      // Refresh 5 minutos antes de expirar
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
      const tokenExpiresAt = new Date(state.tokens!.expiresAt);

      if (tokenExpiresAt <= fiveMinutesFromNow) {
        await refreshAuth();
      }
    }, 60 * 1000); // Verificar a cada minuto

    return () => clearInterval(refreshInterval);
  }, [state.isAuthenticated, state.tokens, refreshAuth]);

  // ==========================================================================
  // FUNÇÕES DE COMPATIBILIDADE COM SISTEMA ANTIGO
  // ==========================================================================

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!state.user) return;

    try {
      // Invalidar cache do profile e buscar dados atualizados
      authCache.onAuthStateChange(state.user.id, 'profile_update');
      
      const profile = await authCache.getProfile(state.user.id, async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', state.user!.id)
          .single();

        if (error) throw error;
        return {
          id: data.id,
          email: data.email,
          nome_completo: data.nome_completo,
          telefone: data.telefone,
          primeiro_acesso: data.primeiro_acesso,
          ativo: data.ativo,
          criado_em: new Date(data.criado_em),
          atualizado_em: data.atualizado_em ? new Date(data.atualizado_em) : undefined
        };
      });

      // Atualizar estado com profile atualizado
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: state.user,
          profile,
          roles: state.roles, // Manter roles existentes
          tokens: state.tokens,
          currentClinic: state.currentClinic,
          clinics: state.availableClinics
        }
      });
    } catch (error) {
      authLogger.error('Erro ao buscar profile:', error);
    }
  }, [state.user, state.roles, state.tokens, state.currentClinic, state.availableClinics]);

  const refreshUserData = useCallback(async (): Promise<void> => {
    await refreshProfile();
  }, [refreshProfile]);

  const getCurrentRole = useCallback((): UserRole | null => {
    return state.currentRole;
  }, [state.currentRole]);

  const isOnboardingComplete = state.profile ? !state.profile.primeiro_acesso : false;

  // ==========================================================================
  // VALOR DO CONTEXTO
  // ==========================================================================

  const contextValue: AuthContextValue = {
    // Estado
    ...state,
    
    // Métodos de autenticação
    login,
    logout,
    register,
    refreshAuth,
    
    // Multi-tenant
    switchClinic,
    
    // Autorização
    hasPermission,
    hasRole,
    hasAnyRole,

    // Compatibilidade com sistema antigo
    refreshProfile,
    refreshUserData,
    getCurrentRole,
    isOnboardingComplete,

    // Utilitários
    clearError,
    isTokenExpired
  };

  return (
    <SecureAuthContext.Provider value={contextValue}>
      {children}
    </SecureAuthContext.Provider>
  );
}

// ============================================================================
// HOOK PERSONALIZADO
// ============================================================================

export function useSecureAuth(): AuthContextValue {
  // Sistema de autenticação foi desativado - retornar dados padrão
  return {
    // Estados sempre "autenticado"
    user: {
      id: 'system-user',
      email: 'sistema@clinica.com',
      user_metadata: { nome_completo: 'Usuário do Sistema' },
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString()
    },
    session: {
      access_token: 'no-auth-token',
      refresh_token: 'no-auth-refresh',
      expires_in: 999999999,
      token_type: 'Bearer',
      user: {
        id: 'system-user',
        email: 'sistema@clinica.com',
        user_metadata: { nome_completo: 'Usuário do Sistema' },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString()
      }
    },
    profile: {
      id: 'system-profile',
      nome_completo: 'Usuário do Sistema',
      email: 'sistema@clinica.com',
      ativo: true,
      primeiro_acesso: false,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString()
    },
    roles: [{
      id: 'system-role',
      user_id: 'system-user',
      role: 'super_admin' as any,
      ativo: true,
      criado_em: new Date().toISOString(),
      criado_por: 'system'
    }],
    currentRole: 'super_admin' as any,
    onboardingStatus: 'completed' as any,
    
    // Loading states sempre false
    isInitializing: false,
    isProfileLoading: false,
    isOnboardingLoading: false,
    
    // Estados gerais
    isInitialized: true,
    isAuthenticated: true,
    isOnboardingComplete: true,
    error: null,
    canRetry: false,
    
    // Métodos que sempre retornam sucesso
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => {},
    hasRole: () => true,
    hasPermission: () => true,
    getCurrentRole: () => 'super_admin',
    switchClinic: async () => true,
    refreshProfile: async () => {},
    refreshUserData: async () => {},
    clearError: () => {},
    retry: async () => {}
  } as any;
}

// Hook para verificação rápida de autenticação
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useSecureAuth();
  return isAuthenticated;
}

// Hook para verificação de permissões
export function useHasPermission(permission: Permission): boolean {
  const { hasPermission } = useSecureAuth();
  return hasPermission(permission);
}

// Hook para verificação de roles
export function useHasRole(role: UserRole): boolean {
  const { hasRole } = useSecureAuth();
  return hasRole(role);
}
