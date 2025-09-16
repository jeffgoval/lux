/**
 * 🚫 CONTEXTO SEM AUTENTICAÇÃO
 * 
 * Substitui o sistema de autenticação por um contexto que sempre
 * retorna "autenticado" com dados padrão do sistema
 */

import React, { createContext, useContext, ReactNode } from 'react';

// Tipos compatíveis com o sistema existente
interface NoAuthUser {
  id: string;
  email: string;
  user_metadata?: any;
  app_metadata?: any;
  aud: string;
  created_at: string;
  updated_at?: string;
}

interface NoAuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: NoAuthUser;
}

interface NoAuthProfile {
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

interface NoAuthRole {
  id: string;
  user_id: string;
  organizacao_id?: string;
  clinica_id?: string;
  role: string;
  ativo: boolean;
  criado_em: string;
  criado_por: string;
}

type OnboardingStatus = 'completed'; // Sempre completo

interface NoAuthContextType {
  // Estados sempre "autenticado"
  user: NoAuthUser;
  session: NoAuthSession;
  profile: NoAuthProfile;
  roles: NoAuthRole[];
  currentRole: string;
  onboardingStatus: OnboardingStatus;
  
  // Loading states sempre false
  isInitializing: false;
  isProfileLoading: false;
  isOnboardingLoading: false;
  
  // Estados gerais
  isInitialized: true;
  isAuthenticated: true;
  isOnboardingComplete: true;
  error: null;
  canRetry: false;
  
  // Métodos que sempre retornam sucesso
  signIn: (email: string, password: string) => Promise<{ error: null }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: null }>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  getCurrentRole: () => string;
  refreshProfile: () => Promise<void>;
  refreshUserData: (force?: boolean) => Promise<void>;
  clearError: () => void;
  retry: () => Promise<void>;
}

// Dados padrão do sistema (usuário fictício)
const DEFAULT_USER: NoAuthUser = {
  id: 'system-user',
  email: 'sistema@clinica.com',
  user_metadata: {
    nome_completo: 'Usuário do Sistema'
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const DEFAULT_SESSION: NoAuthSession = {
  access_token: 'no-auth-token',
  refresh_token: 'no-auth-refresh',
  expires_in: 999999999,
  token_type: 'Bearer',
  user: DEFAULT_USER
};

const DEFAULT_PROFILE: NoAuthProfile = {
  id: 'system-profile',
  nome_completo: 'Usuário do Sistema',
  email: 'sistema@clinica.com',
  ativo: true,
  primeiro_acesso: false,
  criado_em: new Date().toISOString(),
  atualizado_em: new Date().toISOString()
};

const DEFAULT_ROLES: NoAuthRole[] = [{
  id: 'system-role',
  user_id: 'system-user',
  role: 'super_admin',
  ativo: true,
  criado_em: new Date().toISOString(),
  criado_por: 'system'
}];

// Contexto
const NoAuthContext = createContext<NoAuthContextType | undefined>(undefined);

// Provider
interface NoAuthProviderProps {
  children: ReactNode;
}

export function NoAuthProvider({ children }: NoAuthProviderProps) {
  const contextValue: NoAuthContextType = {
    // Estados sempre "autenticado"
    user: DEFAULT_USER,
    session: DEFAULT_SESSION,
    profile: DEFAULT_PROFILE,
    roles: DEFAULT_ROLES,
    currentRole: 'super_admin',
    onboardingStatus: 'completed',
    
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
    hasRole: () => true, // Sempre tem qualquer role
    getCurrentRole: () => 'super_admin',
    refreshProfile: async () => {},
    refreshUserData: async () => {},
    clearError: () => {},
    retry: async () => {}
  };

  return (
    <NoAuthContext.Provider value={contextValue}>
      {children}
    </NoAuthContext.Provider>
  );
}

// Hook
export function useNoAuth(): NoAuthContextType {
  const context = useContext(NoAuthContext);
  
  if (context === undefined) {
    throw new Error('useNoAuth must be used within a NoAuthProvider');
  }
  
  return context;
}

// Hook de compatibilidade com nome antigo
export const useUnifiedAuth = useNoAuth;