import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { generateAuthDebugReport, logAuthDebugReport } from '@/utils/authDebugger';

type UserRole = Database['public']['Enums']['user_role_type'];

interface UserProfile {
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

interface UserRoleContext {
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
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  getCurrentRole: () => UserRole | null;
  refreshProfile: () => Promise<void>;
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

  // Fetch user profile with retry logic
  const fetchProfile = async (userId: string, retryCount = 0): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        
        // If profile doesn't exist and we haven't retried too many times, try to fix it
        if (error.code === 'PGRST116' && retryCount < 2) {
          console.log('Profile not found, attempting to fix missing data...');
          const fixed = await fixMissingUserData();
          if (fixed && retryCount < 1) {
            return fetchProfile(userId, retryCount + 1);
          }
        }
        return false;
      }

      if (data) {
        setProfile(data);
        return true;
      } else {
        console.log('Profile not found for user:', userId);
        
        // Try to fix missing profile if we haven't retried
        if (retryCount < 2) {
          console.log('Attempting to fix missing profile...');
          const fixed = await fixMissingUserData();
          if (fixed && retryCount < 1) {
            return fetchProfile(userId, retryCount + 1);
          }
        }
        return false;
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      return false;
    }
  };

  // Fetch user roles with retry logic
  const fetchRoles = async (userId: string, retryCount = 0): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('ativo', true);

      if (error) {
        console.error('Error fetching roles:', error);
        return false;
      }

      if (data && data.length > 0) {
        setRoles(data);
        return true;
      } else {
        console.log('No roles found for user:', userId);
        
        // Try to fix missing roles if we haven't retried
        if (retryCount < 2) {
          console.log('Attempting to fix missing roles...');
          const fixed = await fixMissingUserData();
          if (fixed && retryCount < 1) {
            return fetchRoles(userId, retryCount + 1);
          }
        }
        return false;
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      return false;
    }
  };

  // Sign up function - redireciona para onboarding
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

  // Sign in function
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  // Sign out function
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
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
      // Import the recovery utility
      const { comprehensiveUserDataRecovery } = await import('@/utils/userDataRecovery');
      
      const result = await comprehensiveUserDataRecovery(user);
      
      if (result.success) {
        console.log('Successfully fixed missing user data:', result);
        return true;
      } else {
        console.error('Failed to fix missing user data:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error calling comprehensive recovery:', error);
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
            const profilePromise = fetchProfile(session.user.id);
            const rolesPromise = fetchRoles(session.user.id);
            
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
            
            // If either failed, log for debugging
            if (!profileSuccess || !rolesSuccess) {
              console.warn('Failed to fetch complete user data:', {
                profileSuccess,
                rolesSuccess,
                userId: session.user.id
              });
              
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
        }
        
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
        await fetchRoles(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Function to refresh profile after onboarding
  const refreshProfile = async () => {
    if (user) {
      console.log('Refreshing profile and roles for user:', user.email);
      const profileSuccess = await fetchProfile(user.id);
      const rolesSuccess = await fetchRoles(user.id);
      
      if (!profileSuccess || !rolesSuccess) {
        console.warn('Failed to refresh complete user data, attempting fix...');
        await fixMissingUserData();
        // Try once more after fixing
        await fetchProfile(user.id);
        await fetchRoles(user.id);
      }
    }
  };

  const value = {
    user,
    session,
    profile,
    roles,
    currentRole,
    isLoading,
    signUp,
    signIn,
    signOut,
    hasRole,
    getCurrentRole,
    refreshProfile,
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