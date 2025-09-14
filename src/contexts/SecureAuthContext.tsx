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
import { AUTH_CONFIG } from '@/config/auth.config';
import { supabase } from '@/lib/supabase';
import { authLogger } from '@/utils/logger';

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
        error: null
      };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isLoading: false,
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
        isLoading: false
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
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

      if (result.success) {
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
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  const refreshAuth = useCallback(async (): Promise<boolean> => {
    try {
      // Verificar se há usuário autenticado no Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        dispatch({ type: 'LOGOUT' });
        return false;
      }

      // Buscar profile e roles em paralelo
      const [profileResult, rolesResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('user_roles').select('*').eq('user_id', user.id).eq('ativo', true)
      ]);

      if (profileResult.error) {
        authLogger.error('Erro ao buscar profile:', profileResult.error);
        dispatch({ type: 'LOGOUT' });
        return false;
      }

      const profile = profileResult.data;
      const roles = rolesResult.data || [];

      // Atualizar estado com dados completos
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user,
          profile: {
            id: profile.id,
            email: profile.email,
            nome_completo: profile.nome_completo,
            telefone: profile.telefone,
            primeiro_acesso: profile.primeiro_acesso,
            ativo: profile.ativo,
            criado_em: new Date(profile.criado_em),
            atualizado_em: profile.atualizado_em ? new Date(profile.atualizado_em) : undefined
          },
          roles: roles.map(role => ({
            id: role.id,
            role: role.role,
            clinica_id: role.clinica_id,
            ativo: role.ativo
          })),
          tokens: null, // Supabase gerencia tokens internamente
          currentClinic: null,
          clinics: []
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
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', state.user.id)
        .single();

      if (error) throw error;

      if (profile) {
        // Usar um action específico para atualizar apenas o profile
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: state.user,
            profile: {
              id: profile.id,
              email: profile.email,
              nome_completo: profile.nome_completo,
              telefone: profile.telefone,
              primeiro_acesso: profile.primeiro_acesso,
              ativo: profile.ativo,
              criado_em: new Date(profile.criado_em),
              atualizado_em: profile.atualizado_em ? new Date(profile.atualizado_em) : undefined
            },
            roles: state.roles, // Manter roles existentes
            tokens: state.tokens,
            currentClinic: state.currentClinic,
            clinics: state.availableClinics
          }
        });
      }
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
  const context = useContext(SecureAuthContext);
  
  if (context === undefined) {
    throw new Error('useSecureAuth must be used within a SecureAuthProvider');
  }
  
  return context;
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
