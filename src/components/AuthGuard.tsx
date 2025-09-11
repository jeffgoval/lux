import { ReactNode, useEffect } from 'react';
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
  const { isAuthenticated, currentRole, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

    // If specific roles are required, check if user has any of them
    if (requiredRoles.length > 0 && currentRole) {
      const hasRequiredRole = requiredRoles.includes(currentRole);
      if (!hasRequiredRole) {
        navigate('/unauthorized', { replace: true });
        return;
      }
    }
  }, [isAuthenticated, currentRole, isLoading, navigate, location.pathname, redirectTo, requiredRoles]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!isAuthenticated || (requiredRoles.length > 0 && !requiredRoles.includes(currentRole!))) {
    return null;
  }

  return <>{children}</>;
}