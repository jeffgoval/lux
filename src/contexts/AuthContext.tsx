import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { generateAuthDebugReport, logAuthDebugReport } from '@/utils/authDebugger';
import { authCacheManager, AuthState, getAuthCacheStats, clearAuthCache } from '@/utils/authCache';
import { retrySupabaseOperation, retryConfigs, isRetryableError } from '@/utils/retryUtils';
import { errorRecoveryManager, createAuthError, createDataError, ErrorCategory, ErrorSeverity } from '@/utils/errorRecovery';
import { performanceMonitor, timeAsync } from '@/utils/performanceMonitor';

type UserRole = Database['public']['Enums']['user_role_type'];

export interface UserProfile {
  id: string;
  user_id: string;
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
        console.log('Using cached profile data');
        setProfile(cachedProfile.data);
        return !!cachedProfile.data;
      }
    }

    setIsProfileLoading(true);
    
    try {
      // Use retry utility for robust profile fetching with performance monitoring
      const result = await timeAsync('profile-fetch', () => 
        retrySupabaseOperation(
          () => supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle(),
          retryConfigs.critical
        ), 'auth'
      );

      if (result.success && result.data) {
        setProfile(result.data);
        authCacheManager.setProfile(result.data);
        setIsProfileLoading(false);
        console.log(`Profile fetched successfully after ${result.attempts} attempts in ${result.totalTime}ms`);
        return true;
      } else {
        console.log('Profile not found for user:', userId);
        authCacheManager.setProfile(null);

        // Try to fix missing profile if we haven't retried
        if (retryCount < 2) {
          console.log('Attempting to fix missing profile...');
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
      console.error('Error fetching profile after retries:', error);
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
        console.log('Profile not found, attempting to fix missing data...');
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
        console.log('Using cached roles data');
        setRoles(cachedRoles.data);
        return cachedRoles.data.length > 0;
      }
    }

    setIsRolesLoading(true);
    
    try {
      // Use retry utility for robust roles fetching with performance monitoring
      const result = await timeAsync('roles-fetch', () =>
        retrySupabaseOperation(
          () => supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', userId)
            .eq('ativo', true),
          retryConfigs.standard
        ), 'auth'
      );

      if (result.success) {
        const rolesData = result.data || [];
        setRoles(rolesData);
        authCacheManager.setRoles(rolesData);
        setIsRolesLoading(false);
        console.log(`Roles fetched successfully after ${result.attempts} attempts in ${result.totalTime}ms`);

        if (rolesData.length > 0) {
          return true;
        } else {
          console.log('No roles found for user:', userId);

          // Try to fix missing roles if we haven't retried
          if (retryCount < 2) {
            console.log('Attempting to fix missing roles...');
            const fixed = await fixMissingUserData();
            if (fixed && retryCount < 1) {
              return fetchRoles(userId, retryCount + 1, force);
            }
          }
          return false;
        }
      } else {
        console.error('Failed to fetch roles after retries:', result.error);
        authCacheManager.setRoles([], result.error?.message);
        setIsRolesLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
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

  // Sign in function - verifica e cria dados faltantes
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    // Se o login foi bem-sucedido, verificar se tem profile e role
    if (!error && data.user) {
      console.log('Checking user data for:', data.user.email);

      // Aguardar um pouco para o auth state se estabilizar, então verificar/criar dados
      setTimeout(async () => {
        try {
          console.log('SignIn: Checking/creating user data after auth stabilization');
          
          // Verificar profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', data.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Error checking profile:', profileError);
          }

          if (!profile) {
            console.log('SignIn: Creating missing profile for existing user');
            const { error: insertProfileError } = await supabase
              .from('profiles')
              .insert({
                user_id: data.user.id,
                nome_completo: data.user.email?.split('@')[0] || 'Usuário',
                email: data.user.email || '',
                primeiro_acesso: false, // Usuário existente não precisa de onboarding
                ativo: true
              });
              
            if (insertProfileError) {
              console.error('Error creating profile:', insertProfileError);
            } else {
              console.log('SignIn: Profile created successfully');
            }
          } else {
            console.log('SignIn: Profile already exists');
          }

          // Verificar role
          const { data: roles, error: rolesError } = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', data.user.id)
            .eq('ativo', true);

          if (rolesError) {
            console.error('Error checking roles:', rolesError);
          }

          if (!roles || roles.length === 0) {
            console.log('SignIn: Creating missing role for existing user');
            const { error: insertRoleError } = await supabase
              .from('user_roles')
              .insert({
                user_id: data.user.id,
                role: 'proprietaria',
                ativo: true,
                criado_por: data.user.id
              });
              
            if (insertRoleError) {
              console.error('Error creating role:', insertRoleError);
            } else {
              console.log('SignIn: Role created successfully');
            }
          } else {
            console.log('SignIn: Role already exists');
          }

        } catch (checkError) {
          console.error('Error checking/creating user data:', checkError);
        }
      }, 500);
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

  // Function to fix missing user data
  const fixMissingUserData = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      // Import the force setup utility
      const { forceUserSetup } = await import('@/utils/forceUserSetup');

      const result = await forceUserSetup(user);

      if (result.success) {
        console.log('Successfully fixed missing user data:', result);
        return true;
      } else {
        console.error('Failed to fix missing user data:', result.error);

        // Fallback to comprehensive recovery
        const { comprehensiveUserDataRecovery } = await import('@/utils/userDataRecovery');
        const fallbackResult = await comprehensiveUserDataRecovery(user);

        if (fallbackResult.success) {
          console.log('Fallback recovery successful:', fallbackResult);
          return true;
        }

        return false;
      }
    } catch (error) {
      console.error('Error calling force setup:', error);
      return false;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // For new signups, wait a bit for the trigger to complete
          if (event === 'SIGNED_IN') {
            console.log('New user signed up, waiting for profile creation...');
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
              console.warn('Failed to fetch complete user data, attempting fix:', {
                profileSuccess,
                rolesSuccess,
                userId: session.user.id
              });

              // Try to fix missing data
              const fixed = await fixMissingUserData();
              if (fixed) {
                console.log('Successfully fixed missing user data, refetching...');
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
            console.error('Error fetching user data:', error);
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

  // Function to refresh profile after onboarding
  const refreshProfile = async () => {
    if (user) {
      console.log('Refreshing profile and roles for user:', user.email);
      const profileSuccess = await fetchProfile(user.id, 0, true); // Force refresh
      const rolesSuccess = await fetchRoles(user.id, 0, true); // Force refresh

      if (!profileSuccess || !rolesSuccess) {
        console.warn('Failed to refresh complete user data, attempting fix...');
        await fixMissingUserData();
        // Try once more after fixing
        await fetchProfile(user.id, 0, true);
        await fetchRoles(user.id, 0, true);
      }
    }
  };

  // Enhanced refresh function with force option
  const refreshUserData = async (force = false) => {
    if (user) {
      console.log('Refreshing user data:', { force, email: user.email });
      
      if (force) {
        authCacheManager.invalidateAll();
      }

      const profileSuccess = await fetchProfile(user.id, 0, force);
      const rolesSuccess = await fetchRoles(user.id, 0, force);

      if (!profileSuccess || !rolesSuccess) {
        console.warn('Failed to refresh complete user data, attempting fix...');
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