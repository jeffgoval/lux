import { ReactNode } from 'react';
import { useSecureAuth } from '@/contexts/SecureAuthContext';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role_type'];

interface SimpleAuthGuardProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
  allowOnboarding?: boolean;
}

/**
 * VERSÃO ULTRA SIMPLIFICADA - SEM REDIRECIONAMENTOS
 * Para parar o loop infinito
 */
export function SimpleAuthGuard({
  children,
  requiredRoles = [],
  allowOnboarding = false
}: SimpleAuthGuardProps) {
  const { user, profile, isLoading, isAuthenticated } = useSecureAuth();


  // 1. Loading inicial
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-4">Carregando...</p>
      </div>
    );
  }

  // 2. Não autenticado -> Mostrar mensagem
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Não autenticado</h2>
          <p>Por favor, faça login.</p>
          <button 
            onClick={() => window.location.href = '/auth'}
            className="mt-4 px-4 py-2 bg-primary text-white rounded"
          >
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  // 3. Sem profile -> Mostrar mensagem
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Profile não encontrado</h2>
          <p>Usuário: {user?.email}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-white rounded"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }

  // 4. Primeiro acesso -> Mostrar mensagem
  if (profile.primeiro_acesso === true && window.location.pathname !== '/onboarding') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Primeiro Acesso</h2>
          <p>Complete seu onboarding para continuar.</p>
          <button 
            onClick={() => window.location.href = '/onboarding'}
            className="mt-4 px-4 py-2 bg-primary text-white rounded"
          >
            Completar Onboarding
          </button>
        </div>
      </div>
    );
  }

  // 5. Tudo OK - permitir acesso
  return <>{children}</>;
}
