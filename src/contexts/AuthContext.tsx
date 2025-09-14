import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { authCacheManager, AuthState, getAuthCacheStats, clearAuthCache } from '@/utils/authCache';
import { retrySupabaseOperation, retryConfigs, isRetryableError } from '@/utils/retryUtils';
import { errorRecoveryManager, createAuthError, createDataError, ErrorCategory, ErrorSeverity } from '@/utils/errorRecovery';
import { performanceMonitor, timeAsync } from '@/utils/performanceMonitor';

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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: UserRoleContext[];
  currentRole: UserRole | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  isRolesLoading: boolean;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  getCurrentRole: () => UserRole | null;
  refreshProfile: () => Promise<void>;
  refreshUserData: (force?: boolean) => Promise<void>;
  clearAuthCache: () => void;
  getAuthState: () => AuthState;
  isAuthenticated: boolean;
  isOnboardingComplete: boolean;
  fixMissingUserData: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRoleContext[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isRolesLoading, setIsRolesLoading] = useState(false);

  // Initialize error recovery with auth-specific actions
  useEffect(() => {
    errorRecoveryManager.injectAuthRecovery(
      async () => {
        try {
          await refreshUserData(true);
          return true;
        } catch {
          return false;
        }
      },
      fixMissingUserData
    );
  }, []);

  // Fetch user profile with enhanced retry logic, loading state, and caching
  const fetchProfile = async (userId: string, retryCount = 0, force = false): Promise<boolean> => {
    // Check cache first unless forced refresh
    if (!force) {
      const cachedProfile = authCacheManager.getProfile();
      if (cachedProfile && !cachedProfile.isStale) {

        setProfile(cachedProfile.data);
        return !!cachedProfile.data;
      }
    }

    setIsProfileLoading(true);
    
    try {
      // Simple profile fetch without excessive timeouts
      const result = await retrySupabaseOperation(
        () => supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        { maxAttempts: 2, baseDelay: 500, timeout: 3000 }
      );

      if (result.success && result.data) {
        setProfile(result.data);
        authCacheManager.setProfile(result.data);
        setIsProfileLoading(false);

        return true;
      } else {

        authCacheManager.setProfile(null);

        // Try to fix missing profile if we haven't retried
        if (retryCount < 2) {

          const fixed = await fixMissingUserData();
          if (fixed && retryCount < 1) {
            setIsProfileLoading(false);
            return fetchProfile(userId, retryCount + 1, force);
          }
        }
        setIsProfileLoading(false);
        return false;
      }
    } catch (error) {

      authCacheManager.setProfile(null, (error as Error).message);
      
      // Create error for recovery system
      const appError = createDataError(
        'Failed to fetch user profile',
        { userId, currentRoute: window.location.pathname },
        error as Error
      );
      
      // Attempt automatic recovery
      const recovered = await errorRecoveryManager.attemptRecovery(appError);
      if (recovered && retryCount < 1) {
        setIsProfileLoading(false);
        return fetchProfile(userId, retryCount + 1, force);
      }
      
      // If it's a "not found" error and we haven't tried to fix it, try once
      if ((error as Error).message.includes('PGRST116') && retryCount < 2) {

        const fixed = await fixMissingUserData();
        if (fixed && retryCount < 1) {
          setIsProfileLoading(false);
          return fetchProfile(userId, retryCount + 1, force);
        }
      }
      
      setIsProfileLoading(false);
      return false;
    }
  };

  // Fetch user roles with enhanced retry logic, loading state, and caching
  const fetchRoles = async (userId: string, retryCount = 0, force = false): Promise<boolean> => {
    // Check cache first unless forced refresh
    if (!force) {
      const cachedRoles = authCacheManager.getRoles();
      if (cachedRoles && !cachedRoles.isStale) {

        setRoles(cachedRoles.data);
        return cachedRoles.data.length > 0;
      }
    }

    setIsRolesLoading(true);
    
    try {
      // Simple roles fetch without excessive timeouts
      const result = await retrySupabaseOperation(
        () => supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', userId)
          .eq('ativo', true),
        { maxAttempts: 2, baseDelay: 500, timeout: 3000 }
      );

      if (result.success) {
        const rolesData = result.data || [];
        setRoles(rolesData);
        authCacheManager.setRoles(rolesData);
        setIsRolesLoading(false);

        if (rolesData.length > 0) {
          return true;
        } else {

          // Try to fix missing roles if we haven't retried
          if (retryCount < 2) {

            const fixed = await fixMissingUserData();
            if (fixed && retryCount < 1) {
              return fetchRoles(userId, retryCount + 1, force);
            }
          }
          return false;
        }
      } else {

        authCacheManager.setRoles([], result.error?.message);
        setIsRolesLoading(false);
        return false;
      }
    } catch (error) {

      authCacheManager.setRoles([], (error as Error).message);
      
      // Create error for recovery system
      const appError = createDataError(
        'Failed to fetch user roles',
        { userId, currentRoute: window.location.pathname },
        error as Error
      );
      
      // Attempt automatic recovery
      await errorRecoveryManager.attemptRecovery(appError);
      
      setIsRolesLoading(false);
      return false;
    }
  };

  // Sign up function - apenas cria o usuário, dados serão criados no onboarding
  const signUp = async (email: string, password: string, metadata?: any) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    return { error };
  };

  // Sign in function - SIMPLES, sem criação automática de dados
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    // Log do login para debug
    if (!error && data.user) {

    }

    return { error };
  };

  // Sign out function with cache clearing
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setIsProfileLoading(false);
    setIsRolesLoading(false);
    clearAuthCache();
  };

  // Check if user has specific role
  const hasRole = (role: UserRole): boolean => {
    return roles.some(userRole => userRole.role === role);
  };

  // Get current highest priority role
  const getCurrentRole = (): UserRole | null => {
    if (!roles.length) return null;

    const roleOrder: UserRole[] = [
      'super_admin',
      'proprietaria',
      'gerente',
      'profissionais',
      'recepcionistas',
      'visitante',
      'cliente'
    ];

    for (const role of roleOrder) {
      if (hasRole(role)) return role;
    }

    return null;
  };

  const currentRole = getCurrentRole();
  const isAuthenticated = !!user;
  const isOnboardingComplete = profile ? !profile.primeiro_acesso : false;

  // REMOVIDO: Auto-recovery que pulava onboarding
  // Agora usuários devem completar o onboarding obrigatoriamente

  // Function to fix missing user data
  const fixMissingUserData = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      // Import the force setup utility
      const { forceUserSetup } = await import('@/utils/forceUserSetup');

      const result = await forceUserSetup(user);

      if (result.success) {

        return true;
      } else {

        // Fallback to comprehensive recovery
        const { comprehensiveUserDataRecovery } = await import('@/utils/userDataRecovery');
        const fallbackResult = await comprehensiveUserDataRecovery(user);

        if (fallbackResult.success) {

          return true;
        }

        return false;
      }
    } catch (error) {

      return false;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // For new signups, wait a bit for the trigger to complete
          if (event === 'SIGNED_IN') {

            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          // Fetch additional user data with retry logic and timeout
          try {
            const profilePromise = fetchProfile(session.user.id, 0, false);
            const rolesPromise = fetchRoles(session.user.id, 0, false);

            // Add timeout to prevent hanging
            const timeoutPromise = new Promise<boolean>((resolve) => {
              setTimeout(() => {
                resolve(false);
              }, 5000); // 5 second timeout
            });

            const [profileSuccess, rolesSuccess] = await Promise.race([
              Promise.all([profilePromise, rolesPromise]),
              timeoutPromise.then(() => [false, false])
            ]);

            // If either failed, try to fix missing data immediately
            if (!profileSuccess || !rolesSuccess) {

              // Try to fix missing data
              const fixed = await fixMissingUserData();
              if (fixed) {

                // Retry fetching after fix
                await fetchProfile(session.user.id, 0, true);
                await fetchRoles(session.user.id, 0, true);
              }

              // Generate debug report in development
              if (process.env.NODE_ENV === 'development') {
                generateAuthDebugReport(session.user).then(logAuthDebugReport);
              }
            }
          } catch (error) {

          }
        } else {
          setProfile(null);
          setRoles([]);
          setIsProfileLoading(false);
          setIsRolesLoading(false);
        }

        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id, 0, false);
        await fetchRoles(session.user.id, 0, false);
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // REMOVIDO: Auto-heal de primeiro_acesso
  // Agora onboarding é sempre obrigatório para novos usuários

  // Function to refresh profile after onboarding
  const refreshProfile = async () => {
    if (user) {
      // Verificar sessão antes de atualizar
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!session || sessionError) {
        return;
      }
      
      // LIMPAR TODO O CACHE antes de buscar novamente
      authCacheManager.clearAll();
      
      // Forçar refresh completo
      const profileSuccess = await fetchProfile(user.id, 0, true); // Force refresh
      const rolesSuccess = await fetchRoles(user.id, 0, true); // Force refresh

      if (!profileSuccess || !rolesSuccess) {
        await fixMissingUserData();
        await fetchProfile(user.id, 0, true);
        await fetchRoles(user.id, 0, true);
      }
    }
  };

  // Enhanced refresh function with force option
  const refreshUserData = async (force = false) => {
    if (user) {

      if (force) {
        authCacheManager.invalidateAll();
      }

      const profileSuccess = await fetchProfile(user.id, 0, force);
      const rolesSuccess = await fetchRoles(user.id, 0, force);

      if (!profileSuccess || !rolesSuccess) {

        await fixMissingUserData();
        // Try once more after fixing
        await fetchProfile(user.id, 0, true);
        await fetchRoles(user.id, 0, true);
      }
    }
  };

  // Function to clear auth cache
  const clearAuthCacheHandler = () => {
    authCacheManager.clearAll();
  };

  // Function to get current auth state
  const getAuthState = (): AuthState => {
    return authCacheManager.getAuthState(isAuthenticated);
  };

  const value = {
    user,
    session,
    profile,
    roles,
    currentRole,
    isLoading,
    isProfileLoading,
    isRolesLoading,
    signUp,
    signIn,
    signOut,
    hasRole,
    getCurrentRole,
    refreshProfile,
    refreshUserData,
    clearAuthCache: clearAuthCacheHandler,
    getAuthState,
    isAuthenticated,
    isOnboardingComplete,
    fixMissingUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

