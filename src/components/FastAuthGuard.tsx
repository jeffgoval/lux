import { ReactNode, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import { checkOnboardingStatus } from '@/utils/onboardingUtils';

type UserRole = Database['public']['Enums']['user_role_type'];

interface FastAuthGuardProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
  redirectTo?: string;
}

/**
 * AuthGuard otimizado que evita loadings desnecessários
 * - Renderiza imediatamente quando possível
 * - Usa cache agressivo para decisões rápidas
 * - Só mostra loading em casos extremos
 */
export function FastAuthGuard({
  children,
  requiredRoles = [],
  redirectTo = '/auth'
}: FastAuthGuardProps) {
  const { isAuthenticated, currentRole, isLoading, profile, roles, isProfileLoading, isRolesLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Decisão rápida baseada no estado atual
  const authDecision = useMemo(() => {
    // Se ainda está carregando auth inicial, aguardar
    if (isLoading) {
      return { action: 'loading', reason: 'initial-auth' };
    }

    // Se não autenticado, redirecionar imediatamente
    if (!isAuthenticated) {
      return { action: 'redirect', to: redirectTo, reason: 'not-authenticated' };
    }

    // Se autenticado mas sem dados, permitir acesso (dados virão depois)
    if (!profile || roles.length === 0) {
      // Para rotas que não exigem roles específicas, permitir
      if (requiredRoles.length === 0) {
        return { action: 'allow', reason: 'no-roles-required' };
      }
      
      // Para rotas básicas, permitir mesmo sem roles completas
      const basicRoutes = ['/dashboard', '/perfil', '/onboarding'];
      if (basicRoutes.some(route => location.pathname.startsWith(route))) {
        return { action: 'allow', reason: 'basic-route' };
      }
      
      // Para outras rotas, aguardar um pouco mas não muito
      return { action: 'allow-with-warning', reason: 'missing-data' };
    }

    // Verificar onboarding usando util centralizada
    const onboarding = checkOnboardingStatus(profile, roles, !!isProfileLoading, !!isRolesLoading);
    if (location.pathname !== '/onboarding' && onboarding.needsOnboarding && !onboarding.canSkip) {
      return { action: 'redirect', to: '/onboarding', reason: `needs-onboarding:${onboarding.reason}` };
    }

    // Verificar roles apenas se necessário
    if (requiredRoles.length > 0) {
      if (!currentRole) {
        return { action: 'redirect', to: '/unauthorized', reason: 'no-role' };
      }
      
      if (!requiredRoles.includes(currentRole)) {
        return { action: 'redirect', to: '/unauthorized', reason: 'insufficient-role' };
      }
    }

    return { action: 'allow', reason: 'authorized' };
  }, [isAuthenticated, isLoading, profile, roles, currentRole, requiredRoles, location.pathname, redirectTo, isProfileLoading, isRolesLoading]);

  // Executar ação baseada na decisão
  useMemo(() => {
    if (authDecision.action === 'redirect') {
      // Usar setTimeout para evitar problemas de renderização
      setTimeout(() => {
        navigate(authDecision.to!, { 
          replace: true,
          state: { from: location.pathname, reason: authDecision.reason }
        });
      }, 0);
    }
  }, [authDecision, navigate, location.pathname]);

  // Renderização baseada na decisão
  switch (authDecision.action) {
    case 'loading':
      // Só mostrar loading para auth inicial, e por pouco tempo
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </div>
      );

    case 'redirect':
      // Não renderizar nada durante redirecionamento
      return null;

    case 'allow-with-warning':
      // Permitir acesso mas com aviso discreto no console
      console.warn(`FastAuthGuard: Allowing access with incomplete data - ${authDecision.reason}`);
      return <>{children}</>;

    case 'allow':
    default:
      // Acesso liberado
      return <>{children}</>;
  }
}
