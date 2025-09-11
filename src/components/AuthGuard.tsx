import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role_type'];

interface AuthGuardProps {
  children: ReactNode;
  requiredRoles?: UserRole[];
  redirectTo?: string;
}

export function AuthGuard({ 
  children, 
  requiredRoles = [], 
  redirectTo = '/auth' 
}: AuthGuardProps) {
  const { isAuthenticated, currentRole, isLoading, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [waited, setWaited] = useState(false);

  // Grace period to hydrate profile/roles after auth events
  useEffect(() => {
    if (isAuthenticated && !profile && !currentRole) {
      setWaited(false);
      const t = setTimeout(() => setWaited(true), 1200);
      return () => clearTimeout(t);
    } else {
      setWaited(true);
    }
  }, [isAuthenticated, profile, currentRole]);

  useEffect(() => {
    if (isLoading) return;

    // If not authenticated, redirect to auth page
    if (!isAuthenticated) {
      navigate(redirectTo, { 
        state: { from: location.pathname },
        replace: true 
      });
      return;
    }

    // If user is on first access, redirect to onboarding
    if (profile?.primeiro_acesso && location.pathname !== '/onboarding') {
      navigate('/onboarding', { replace: true });
      return;
    }

    // Role checks with small grace period for hydration
    if (requiredRoles.length > 0) {
      if (!currentRole) {
        if (!waited) return; // wait briefly for roles
        navigate('/unauthorized', { replace: true });
        return;
      }
      if (!requiredRoles.includes(currentRole)) {
        navigate('/unauthorized', { replace: true });
        return;
      }
    } else {
      // For routes without explicit role requirements, allow access even if role is not yet resolved
      // This prevents unnecessary "acesso negado" screens during hydration or when user has no role
    }
  }, [isAuthenticated, currentRole, isLoading, profile, navigate, location.pathname, redirectTo, requiredRoles]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  // During hydration, show spinner to avoid flashing dashboard without menus
  if (isAuthenticated && !currentRole && location.pathname !== '/onboarding' && !waited) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!isAuthenticated || (requiredRoles.length > 0 && (!currentRole || !requiredRoles.includes(currentRole)))) {
    return null;
  }

  return <>{children}</>;
}