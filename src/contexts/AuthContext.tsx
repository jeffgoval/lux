import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRoleContext[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(data);
      } else {
        console.log('Profile not found for user:', userId);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  // Fetch user roles - simplificado para role único
  const fetchRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('ativo', true);

      if (error) {
        console.error('Error fetching roles:', error);
        return;
      }

      if (data && data.length > 0) {
        setRoles(data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  // Sign up function - redireciona para onboarding
  const signUp = async (email: string, password: string, metadata?: any) => {
    const redirectUrl = `${window.location.origin}/onboarding`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
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

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch additional user data
          fetchProfile(session.user.id);
          fetchRoles(session.user.id);
        } else {
          setProfile(null);
          setRoles([]);
        }
        
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRoles(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Function to refresh profile after onboarding
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
      await fetchRoles(user.id);
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
    isAuthenticated
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