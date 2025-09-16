/**
 * 🔥 CONTEXTO DE AUTENTICAÇÃO APPWRITE
 * 
 * Context de autenticação usando Appwrite, substituindo o Supabase
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { client } from '@/lib/appwrite';
import { appwriteAuthService } from '@/services/appwrite-auth.service';
import {
  AuthState,
  AuthContextValue,
  AuthAction,
  LoginCredentials,
  RegisterData,
  AuthResult,
  AppwriteUser,
  UserProfileDocument,
  UserRoleDocument,
  ClinicaDocument,
  UserRole
} from '@/types/appwrite.types';
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
  isOnboardingLoading: false,
  currentClinic: null,
  availableClinics: [],
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
        currentClinic: action.payload.currentClinic || null,
        availableClinics: action.payload.clinics || [],
        error: null,
        isInitialized: true
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
        currentClinic: null,
        availableClinics: [],
        error: action.payload,
        isInitialized: true
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

const AppwriteAuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AppwriteAuthProviderProps {
  children: React.ReactNode;
}

export function AppwriteAuthProvider({ children }: AppwriteAuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

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
        // Verificar se há sessão ativa
        const user = await appwriteAuthService.getCurrentUser();
        
        if (isMounted) {
          if (user) {
            // Usuário autenticado - buscar dados completos
            await loadUserData(user);
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

    // Subscribe para mudanças na conta
    const unsubscribe = client.subscribe('account', (response) => {
      authLogger.info('Account event received:', response);
      
      if (response.events.includes('account.sessions.*.delete')) {
        // Logout detectado
        dispatch({ type: 'LOGOUT' });
      }
    });

    initializeAuth();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // ==========================================================================
  // CARREGAR DADOS DO USUÁRIO
  // ==========================================================================

  const loadUserData = async (user: AppwriteUser): Promise<void> => {
    try {
      dispatch({ type: 'LOGIN_START' });

      // Buscar profile
      const profile = await appwriteAuthService.getUserProfile(user.$id);
      
      // Buscar roles
      const roles = await appwriteAuthService.getUserRoles(user.$id);
      
      // Buscar clínicas disponíveis
      const clinics = await appwriteAuthService.getUserClinics(user.$id);
      
      // Determinar clínica atual
      let currentClinic: ClinicaDocument | null = null;
      if (user.prefs?.current_clinic_id && clinics.length > 0) {
        currentClinic = clinics.find(c => c.$id === user.prefs.current_clinic_id) || clinics[0];
      } else if (clinics.length > 0) {
        currentClinic = clinics[0];
      }

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user,
          profile,
          roles,
          currentClinic,
          clinics
        }
      });
    } catch (error) {
      authLogger.error('Error loading user data:', error);
      dispatch({ type: 'LOGIN_FAILURE', payload: 'Erro ao carregar dados do usuário' });
    }
  };

  // ==========================================================================
  // MÉTODOS DE AUTENTICAÇÃO
  // ==========================================================================

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResult> => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const result = await appwriteAuthService.login(credentials);
      
      if (result.success && result.user) {
        await loadUserData(result.user);
        return result;
      } else {
        dispatch({ type: 'LOGIN_FAILURE', payload: result.error || 'Erro no login' });
        return result;
      }
    } catch (error) {
      authLogger.error('Login error:', error);
      const errorMessage = 'Erro inesperado no login';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<AuthResult> => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const result = await appwriteAuthService.register(data);
      
      if (result.success && result.user) {
        await loadUserData(result.user);
        return result;
      } else {
        dispatch({ type: 'LOGIN_FAILURE', payload: result.error || 'Erro no registro' });
        return result;
      }
    } catch (error) {
      authLogger.error('Register error:', error);
      const errorMessage = 'Erro inesperado no registro';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await appwriteAuthService.logout();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      authLogger.error('Logout error:', error);
      // Mesmo com erro, limpar o estado local
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  const refreshAuth = useCallback(async (): Promise<AuthResult | null> => {
    try {
      const result = await appwriteAuthService.refreshSession();
      
      if (result.success && result.user) {
        await loadUserData(result.user);
        dispatch({ type: 'REFRESH_SUCCESS', payload: result.session! });
        return result;
      } else {
        dispatch({ type: 'LOGOUT' });
        return null;
      }
    } catch (error) {
      authLogger.error('Refresh auth error:', error);
      dispatch({ type: 'LOGOUT' });
      return null;
    }
  }, []);

  const switchClinic = useCallback(async (clinicId: string): Promise<boolean> => {
    try {
      const success = await appwriteAuthService.switchClinic(clinicId);
      
      if (success) {
        const clinic = state.availableClinics.find(c => c.$id === clinicId);
        if (clinic) {
          dispatch({ type: 'SWITCH_CLINIC', payload: clinic });
        }
      }
      
      return success;
    } catch (error) {
      authLogger.error('Switch clinic error:', error);
      return false;
    }
  }, [state.availableClinics]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // ==========================================================================
  // CONTEXT VALUE
  // ==========================================================================

  const contextValue: AuthContextValue = {
    // Estado
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    user: state.user,
    profile: state.profile,
    roles: state.roles,
    currentRole: state.currentRole,
    currentClinic: state.currentClinic,
    availableClinics: state.availableClinics,
    isInitialized: state.isInitialized,
    error: state.error,

    // Métodos
    login,
    register,
    logout,
    refreshAuth,
    switchClinic,
    clearError,

    // Estados de loading granulares
    isProfileLoading: state.isProfileLoading,
    isRolesLoading: state.isRolesLoading,
    isOnboardingLoading: state.isOnboardingLoading
  };

  return (
    <AppwriteAuthContext.Provider value={contextValue}>
      {children}
    </AppwriteAuthContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useAppwriteAuth() {
  const context = useContext(AppwriteAuthContext);
  if (context === undefined) {
    throw new Error('useAppwriteAuth must be used within an AppwriteAuthProvider');
  }
  return context;
}

export { AppwriteAuthContext };