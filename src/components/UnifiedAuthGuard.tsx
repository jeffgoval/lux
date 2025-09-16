/**
 * 🚫 GUARD DESATIVADO - SEM AUTENTICAÇÃO
 * 
 * Guards que sempre permitem acesso a todas as rotas
 * Sistema de autenticação foi desativado
 */

import React, { ReactNode } from 'react';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role_type'];

interface UnifiedAuthGuardProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
  allowOnboarding?: boolean;
  fallback?: ReactNode;
  redirectTo?: string;
}

// Guard principal - sempre permite acesso
export function UnifiedAuthGuard({
  children
}: UnifiedAuthGuardProps) {
  // Sem autenticação - sempre renderiza os children
  return <>{children}</>;
}

// Guard para roles específicas - sempre permite
export function RequireRole({ 
  children, 
  roles 
}: { 
  children: ReactNode; 
  roles: UserRole[] 
}) {
  // Sem autenticação - sempre renderiza os children
  return <>{children}</>;
}

// Guard para onboarding - sempre permite
export function RequireOnboarding({ children }: { children: ReactNode }) {
  // Sem autenticação - sempre renderiza os children
  return <>{children}</>;
}

// Exports para compatibilidade
export { UnifiedAuthGuard as AuthGuard };
export { RequireRole as RoleGuard };
export { RequireOnboarding as OnboardingGuard };