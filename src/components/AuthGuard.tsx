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

  // Additional timeout to prevent infinite loading
  useEffect(() => {
    if (isAuthenticated && !waited) {
      const fallbackTimeout = setTimeout(() => {
        setWaited(true);
      }, 3000); // 3 seconds fallback
      
      return () => clearTimeout(fallbackTimeout);
    }
  }, [isAuthenticated, waited]);

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
    // Redirect if user has no profile OR if profile is marked as first access
    if (location.pathname !== '/onboarding') {
      if (!profile || profile.primeiro_acesso) {
        console.log('Redirecting to onboarding - no profile or first access:', { profile });
        navigate('/onboarding', { replace: true });
        return;
      }
      
      // Also redirect if user has no roles (indicates incomplete setup)
      if (profile && !currentRole && waited) {
        navigate('/onboarding', { replace: true });
        return;
      }
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
  // But only for a limited time to prevent infinite loading
  if (isAuthenticated && !currentRole && location.pathname !== '/onboarding' && !waited) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If we've waited long enough but still no role, and user is not on onboarding
  if (isAuthenticated && !currentRole && location.pathname !== '/onboarding' && waited) {
    if (profile?.primeiro_acesso) {
      navigate('/onboarding', { replace: true });
      return null;
    } else {
      // Only redirect to unauthorized if this route actually requires roles
      if (requiredRoles.length > 0) {
        navigate('/unauthorized', { replace: true });
        return null;
      }
      // For routes without role requirements (like dashboard), allow access even without roles
    }
  }

  // Show nothing while redirecting
  if (!isAuthenticated) {
    return null;
  }
  
  // For routes with role requirements, check if user has the required role
  if (requiredRoles.length > 0 && (!currentRole || !requiredRoles.includes(currentRole))) {
    return null;
  }

  return <>{children}</>;
}