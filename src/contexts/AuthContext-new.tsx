// AuthContext NOVO - sem Supabase, sem RLS, sem dor de cabeça!
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient, User, LoginData, RegisterData } from '@/services/api-client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (credentials: LoginData) => Promise<{ error: string | null }>;
  signUp: (userData: RegisterData) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (role: string) => boolean;
  getCurrentRole: () => string | null;
  currentRole: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar autenticação no carregamento
  useEffect(() => {
    const checkAuth = async () => {
      if (apiClient.isAuthenticated()) {
        try {
          const response = await apiClient.getCurrentUser();
          if (response.success && response.data) {
            setUser(response.data.user);
          } else {
            // Token inválido, limpar
            apiClient.clearToken();
          }
        } catch (error) {
          console.error('Erro ao verificar autenticação:', error);
          apiClient.clearToken();
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const signIn = async (credentials: LoginData) => {
    try {
      const response = await apiClient.login(credentials);
      
      if (response.success && response.data) {
        setUser(response.data.user);
        return { error: null };
      } else {
        return { error: response.error || 'Erro no login' };
      }
    } catch (error) {
      return { error: 'Erro de conexão' };
    }
  };

  const signUp = async (userData: RegisterData) => {
    try {
      const response = await apiClient.register(userData);
      
      if (response.success) {
        return { error: null };
      } else {
        return { error: response.error || 'Erro no cadastro' };
      }
    } catch (error) {
      return { error: 'Erro de conexão' };
    }
  };

  const signOut = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      setUser(null);
    }
  };

  const refreshProfile = async () => {
    if (apiClient.isAuthenticated()) {
      try {
        const response = await apiClient.getCurrentUser();
        if (response.success && response.data) {
          setUser(response.data.user);
        }
      } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
      }
    }
  };

  const hasRole = (role: string): boolean => {
    if (!user?.roles) return false;
    return user.roles.some(userRole => userRole.role === role && userRole.ativo);
  };

  const getCurrentRole = (): string | null => {
    if (!user?.roles) return null;

    const roleOrder = [
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

  const value = {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    hasRole,
    getCurrentRole,
    currentRole
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