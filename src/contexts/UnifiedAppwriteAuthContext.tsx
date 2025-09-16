/**
 * 🔥 CONTEXTO DE AUTENTICAÇÃO APPWRITE UNIFICADO
 * 
 * Context que substitui completamente o Supabase por Appwrite com:
 * - Compatibilidade total com sistema de roles existente
 * - Suporte multi-tenant com isolamento completo
 * - Estados granulares de loading
 * - Cache inteligente e otimizações
 * - Sistema de retry e recuperação de erros
 */

import { createContext, useContext, useReducer, useEffect, useCallback, ReactNode, useRef } from 'react';
import { 
  unifiedAppwriteAuthService,
  UnifiedAuthUser,
  UserProfile,
  UserRole,
  Organization,
  Clinic,
  AuthResult,
  LoginCredentials,
  RegisterData
} from '@/services/unified-appwrite-auth.service';
import { authLogger } from '@/utils/logger';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface AuthState {
  // Core authentication
  user: UnifiedAuthUser | null;
  profile: UserProfile | null;
  roles: UserRole[];
  organizations: Organization[];
  clinics: Clinic[];
  currentRole: UserRole | null;
  currentOrganization: Organization | null;
  currentClinic: Clinic | null;
  currentTenant: string | null;
  
  // Estados de loading granulares
  isInitializing: boolean;
  isAuthenticating: boolean;
  isProfileLoading: boolean;
  isRolesLoading: boolean;
  isOrganizationsLoading: boolean;
  isClinicsLoading: boolean;
  
  // Estados gerais
  isInitialized: boolean;
  isAuthenticated: boolean;
  error: string | null;
  canRetry: boolean;
  
  // Onboarding
  requiresOnboarding: boolean;
  onboardingStep: string | null;
}

interface AuthContextType extends AuthState {
  // Métodos de autenticação
  login: (credentials: LoginCredentials) => Promise<AuthResult>;
  register: (data: RegisterData) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  
  // Multi-tenant
  switchTenant: (tenantId: string) => Promise<boolean>;
  switchOrganization: (organizationId: string) => Promise<boolean>;
  switchClinic: (clinicId: string) => Promise<boolean>;
  
  // Autorização
  hasPermission: (permission: string, resourceId?: string) => Promise<boolean>;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  
  // Compatibilidade com sistema existente
  getCurrentRole: () => string | null;
  isOnboardingComplete: boolean;
  
  // Utilitários
  clearError: () => void;
  retry: () => Promise<void>;
  
  // Métodos legados para compatibilidade
  refreshProfile: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

// ============================================================================
// ESTADO INICIAL E REDUCER
// ============================================================================

const initialState: AuthState = {
  // Core authentication
  user: null,
  profile: null,
  roles: [],
  organizations: [],
  clinics: [],
  currentRole: null,
  currentOrganization: null,
  currentClinic: null,
  currentTenant: null,
  
  // Estados de loading granulares
  isInitializing: true,
  isAuthenticating: false,
  isProfileLoading: false,
  isRolesLoading: false,
  isOrganizationsLoading: false,
  isClinicsLoading: false,
  
  // Estados gerais
  isInitialized: false,
  isAuthenticated: false,
  error: null,
  canRetry: false,
  
  // Onboarding
  requiresOnboarding: false,
  onboardingStep: null
};

type AuthAction =
  | { type: 'SET_INITIALIZING'; payload: boolean }
  | { type: 'SET_AUTHENTICATING'; payload: boolean }
  | { type: 'SET_PROFILE_LOADING'; payload: boolean }
  | { type: 'SET_ROLES_LOADING'; payload: boolean }
  | { type: 'SET_ORGANIZATIONS_LOADING'; payload: boolean }
  | { type: 'SET_CLINICS_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: { error: string | null; canRetry: boolean } }
  | { type: 'SET_AUTH_SUCCESS'; payload: AuthResult }
  | { type: 'SET_CURRENT_TENANT'; payload: string }
  | { type: 'SET_CURRENT_ORGANIZATION'; payload: Organization | null }
  | { type: 'SET_CURRENT_CLINIC'; payload: Clinic | null }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'RESET' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_INITIALIZING':
      return { ...state, isInitializing: action.payload };
    
    case 'SET_AUTHENTICATING':
      return { ...state, isAuthenticating: action.payload };
    
    case 'SET_PROFILE_LOADING':
      return { ...state, isProfileLoading: action.payload };
    
    case 'SET_ROLES_LOADING':
      return { ...state, isRolesLoading: action.payload };
    
    case 'SET_ORGANIZATIONS_LOADING':
      return { ...state, isOrganizationsLoading: action.payload };
    
    case 'SET_CLINICS_LOADING':
      return { ...state, isClinicsLoading: action.payload };
    
    case 'SET_ERROR':
      return { 
        ...state, 
        error: action.payload.error,
        canRetry: action.payload.canRetry,
        isInitializing: false,
        isAuthenticating: false,
        isProfileLoading: false,
        isRolesLoading: false,
        isOrganizationsLoading: false,
        isClinicsLoading: false
      };
    
    case 'SET_AUTH_SUCCESS':
      const authData = action.payload;
      return {
        ...state,
        user: authData.user || null,
        profile: authData.profile || null,
        roles: authData.roles || [],
        organizations: authData.organizations || [],
        clinics: authData.clinics || [],
        currentRole: authData.roles?.[0] || null,
        currentOrganization: authData.organizations?.[0] || null,
        currentClinic: authData.clinics?.[0] || null,
        currentTenant: authData.currentTenant || null,
        isAuthenticated: !!authData.user,
        requiresOnboarding: authData.requiresOnboarding || false,
        onboardingStep: authData.profile?.onboardingStep || null,
        error: null,
        canRetry: false,
        isInitializing: false,
        isAuthenticating: false,
        isProfileLoading: false,
        isRolesLoading: false,
        isOrganizationsLoading: false,
        isClinicsLoading: false
      };
    
    case 'SET_CURRENT_TENANT':
      return { ...state, currentTenant: action.payload };
    
    case 'SET_CURRENT_ORGANIZATION':
      return { ...state, currentOrganization: action.payload };
    
    case 'SET_CURRENT_CLINIC':
      return { ...state, currentClinic: action.payload };
    
    case 'SET_INITIALIZED':
      return { 
        ...state, 
        isInitialized: action.payload,
        isInitializing: false
      };
    
    case 'RESET':
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

const UnifiedAppwriteAuthContext = createContext<AuthContextType | undefined>(undefined);

interface UnifiedAppwriteAuthProviderProps {
  children: ReactNode;
}

export function UnifiedAppwriteAuthProvider({ children }: UnifiedAppwriteAuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const initializationRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ==========================================================================
  // INICIALIZAÇÃO SEGURA
  // ==========================================================================

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      // Prevenir múltiplas inicializações
      if (initializationRef.current) return;
      initializationRef.current = true;

      try {
        dispatch({ type: 'SET_INITIALIZING', payload: true });

        // Verificar se há usuário logado
        const user = await unifiedAppwriteAuthService.getCurrentUser();
        
        if (!isMounted) return;

        if (user) {
          // Usuário logado - carregar dados completos
          const authResult = await unifiedAppwriteAuthService.refreshSession();
          
          if (authResult.success) {
            dispatch({ type: 'SET_AUTH_SUCCESS', payload: authResult });
          } else {
            dispatch({ type: 'RESET' });
          }
        } else {
          // Usuário não logado
          dispatch({ type: 'RESET' });
        }
        
        dispatch({ type: 'SET_INITIALIZED', payload: true });
      } catch (error) {
        authLogger.error('Erro na inicialização da autenticação', error);
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

    return () => {
      isMounted = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // ==========================================================================
  // MÉTODOS DE AUTENTICAÇÃO
  // ==========================================================================

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResult> => {
    try {
      dispatch({ type: 'SET_AUTHENTICATING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: { error: null, canRetry: false } });

      const result = await unifiedAppwriteAuthService.login(credentials);

      if (result.success) {
        dispatch({ type: 'SET_AUTH_SUCCESS', payload: result });
      } else {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: { 
            error: result.error || 'Erro no login', 
            canRetry: true 
          }
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro inesperado no login';
      dispatch({ 
        type: 'SET_ERROR', 
        payload: { 
          error: errorMessage, 
          canRetry: true 
        }
      });
      return { success: false, error: errorMessage };
    }
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<AuthResult> => {
    try {
      dispatch({ type: 'SET_AUTHENTICATING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: { error: null, canRetry: false } });

      const result = await unifiedAppwriteAuthService.register(data);

      if (result.success) {
        dispatch({ type: 'SET_AUTH_SUCCESS', payload: result });
      } else {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: { 
            error: result.error || 'Erro no registro', 
            canRetry: true 
          }
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro inesperado no registro';
      dispatch({ 
        type: 'SET_ERROR', 
        payload: { 
          error: errorMessage, 
          canRetry: true 
        }
      });
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await unifiedAppwriteAuthService.logout();
      dispatch({ type: 'RESET' });
    } catch (error) {
      authLogger.error('Erro no logout', error);
      // Mesmo com erro, limpar estado local
      dispatch({ type: 'RESET' });
    }
  }, []);

  const refreshAuth = useCallback(async (): Promise<void> => {
    try {
      const result = await unifiedAppwriteAuthService.refreshSession();
      
      if (result.success) {
        dispatch({ type: 'SET_AUTH_SUCCESS', payload: result });
      } else {
        dispatch({ type: 'RESET' });
      }
    } catch (error) {
      authLogger.error('Erro ao renovar autenticação', error);
      dispatch({ type: 'RESET' });
    }
  }, []);

  // ==========================================================================
  // MULTI-TENANT
  // ==========================================================================

  const switchTenant = useCallback(async (tenantId: string): Promise<boolean> => {
    try {
      const success = await unifiedAppwriteAuthService.switchTenant(tenantId);
      
      if (success) {
        dispatch({ type: 'SET_CURRENT_TENANT', payload: tenantId });
        // Recarregar dados do novo tenant
        await refreshAuth();
      }
      
      return success;
    } catch (error) {
      authLogger.error('Erro ao trocar tenant', error);
      return false;
    }
  }, [refreshAuth]);

  const switchOrganization = useCallback(async (organizationId: string): Promise<boolean> => {
    try {
      const organization = state.organizations.find(org => org.$id === organizationId);
      
      if (organization) {
        dispatch({ type: 'SET_CURRENT_ORGANIZATION', payload: organization });
        
        // Filtrar clínicas da organização selecionada
        const organizationClinics = state.clinics.filter(
          clinic => clinic.organizationId === organizationId
        );
        
        // Selecionar primeira clínica da organização
        if (organizationClinics.length > 0) {
          dispatch({ type: 'SET_CURRENT_CLINIC', payload: organizationClinics[0] });
        } else {
          dispatch({ type: 'SET_CURRENT_CLINIC', payload: null });
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      authLogger.error('Erro ao trocar organização', error);
      return false;
    }
  }, [state.organizations, state.clinics]);

  const switchClinic = useCallback(async (clinicId: string): Promise<boolean> => {
    try {
      const clinic = state.clinics.find(c => c.$id === clinicId);
      
      if (clinic) {
        dispatch({ type: 'SET_CURRENT_CLINIC', payload: clinic });
        
        // Atualizar organização se necessário
        if (clinic.organizationId !== state.currentOrganization?.$id) {
          const organization = state.organizations.find(
            org => org.$id === clinic.organizationId
          );
          dispatch({ type: 'SET_CURRENT_ORGANIZATION', payload: organization || null });
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      authLogger.error('Erro ao trocar clínica', error);
      return false;
    }
  }, [state.clinics, state.organizations, state.currentOrganization]);

  // ==========================================================================
  // AUTORIZAÇÃO
  // ==========================================================================

  const hasPermission = useCallback(async (permission: string, resourceId?: string): Promise<boolean> => {
    if (!state.user || !state.currentTenant) {
      return false;
    }

    try {
      return await unifiedAppwriteAuthService.hasPermission(
        state.user.$id,
        permission,
        state.currentTenant,
        resourceId
      );
    } catch (error) {
      authLogger.error('Erro ao verificar permissão', error);
      return false;
    }
  }, [state.user, state.currentTenant]);

  const hasRole = useCallback((role: string): boolean => {
    return state.roles.some(r => r.role === role && r.ativo);
  }, [state.roles]);

  const hasAnyRole = useCallback((roles: string[]): boolean => {
    return state.roles.some(r => roles.includes(r.role) && r.ativo);
  }, [state.roles]);

  const getCurrentRole = useCallback((): string | null => {
    return state.currentRole?.role || null;
  }, [state.currentRole]);

  // ==========================================================================
  // SISTEMA DE RETRY
  // ==========================================================================

  const retry = useCallback(async (): Promise<void> => {
    if (!state.canRetry) return;

    try {
      dispatch({ type: 'SET_ERROR', payload: { error: null, canRetry: false } });
      
      if (state.user) {
        // Retry carregamento de dados
        await refreshAuth();
      } else {
        // Retry inicialização
        initializationRef.current = false;
        const user = await unifiedAppwriteAuthService.getCurrentUser();
        
        if (user) {
          const authResult = await unifiedAppwriteAuthService.refreshSession();
          if (authResult.success) {
            dispatch({ type: 'SET_AUTH_SUCCESS', payload: authResult });
          }
        }
      }
    } catch (error) {
      authLogger.error('Erro no retry', error);
      
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
  }, [state.canRetry, state.user, refreshAuth]);

  // ==========================================================================
  // UTILITÁRIOS
  // ==========================================================================

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: { error: null, canRetry: false } });
  }, []);

  // ==========================================================================
  // MÉTODOS LEGADOS PARA COMPATIBILIDADE
  // ==========================================================================

  const refreshProfile = useCallback(async (): Promise<void> => {
    await refreshAuth();
  }, [refreshAuth]);

  const refreshUserData = useCallback(async (): Promise<void> => {
    await refreshAuth();
  }, [refreshAuth]);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: any }> => {
    const result = await login({ email, password });
    return { error: result.success ? null : { message: result.error } };
  }, [login]);

  const signUp = useCallback(async (email: string, password: string, metadata?: any): Promise<{ error: any }> => {
    const result = await register({
      email,
      password,
      nomeCompleto: metadata?.nome_completo || email.split('@')[0],
      telefone: metadata?.telefone
    });
    return { error: result.success ? null : { message: result.error } };
  }, [register]);

  const signOut = useCallback(async (): Promise<void> => {
    await logout();
  }, [logout]);

  // ==========================================================================
  // ESTADOS COMPUTADOS
  // ==========================================================================

  const isOnboardingComplete = !state.requiresOnboarding && state.profile && !state.profile.primeiroAcesso;

  // ==========================================================================
  // VALOR DO CONTEXTO
  // ==========================================================================

  const contextValue: AuthContextType = {
    // Estado
    ...state,
    
    // Métodos de autenticação
    login,
    register,
    logout,
    refreshAuth,
    
    // Multi-tenant
    switchTenant,
    switchOrganization,
    switchClinic,
    
    // Autorização
    hasPermission,
    hasRole,
    hasAnyRole,
    
    // Compatibilidade
    getCurrentRole,
    isOnboardingComplete,
    
    // Utilitários
    clearError,
    retry,
    
    // Métodos legados
    refreshProfile,
    refreshUserData,
    signIn,
    signUp,
    signOut
  };

  return (
    <UnifiedAppwriteAuthContext.Provider value={contextValue}>
      {children}
    </UnifiedAppwriteAuthContext.Provider>
  );
}

// ============================================================================
// HOOK PERSONALIZADO
// ============================================================================

export function useUnifiedAppwriteAuth(): AuthContextType {
  const context = useContext(UnifiedAppwriteAuthContext);
  
  if (context === undefined) {
    throw new Error('useUnifiedAppwriteAuth must be used within a UnifiedAppwriteAuthProvider');
  }
  
  return context;
}

// Hooks de conveniência
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useUnifiedAppwriteAuth();
  return isAuthenticated;
}

export function useHasRole(role: string): boolean {
  const { hasRole } = useUnifiedAppwriteAuth();
  return hasRole(role);
}

export function useCurrentUser(): UnifiedAuthUser | null {
  const { user } = useUnifiedAppwriteAuth();
  return user;
}

export function useCurrentProfile(): UserProfile | null {
  const { profile } = useUnifiedAppwriteAuth();
  return profile;
}

export function useCurrentTenant(): string | null {
  const { currentTenant } = useUnifiedAppwriteAuth();
  return currentTenant;
}

export function useCurrentOrganization(): Organization | null {
  const { currentOrganization } = useUnifiedAppwriteAuth();
  return currentOrganization;
}

export function useCurrentClinic(): Clinic | null {
  const { currentClinic } = useUnifiedAppwriteAuth();
  return currentClinic;
}