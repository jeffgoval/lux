import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import { checkOnboardingStatus } from '@/utils/onboardingUtils';

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
  const { isAuthenticated, currentRole, isLoading, profile, roles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only check auth after initial loading is complete
    if (isLoading) return;

    // Not authenticated - redirect to auth
    if (!isAuthenticated) {
      navigate(redirectTo, {
        state: { from: location.pathname },
        replace: true
      });
      return;
    }

    // Authenticated but no profile yet - wait a bit more
    if (!profile) {
      return;
    }

    // Check onboarding only if not already on onboarding page
    if (location.pathname !== '/onboarding') {
      const onboardingStatus = checkOnboardingStatus(profile, roles, false, false);
      
      if (onboardingStatus.needsOnboarding && !onboardingStatus.canSkip) {
        navigate('/onboarding', { replace: true });
        return;
      }
    }

    // Check role requirements - be more permissive
    if (requiredRoles.length > 0) {
      // If no current role but user has profile and it's not first access, allow access
      // The role might be loading or there might be a temporary issue
      if (!currentRole && profile && !profile.primeiro_acesso) {
        console.log('AuthGuard: No role but user has valid profile, allowing access');
        return;
      }

      // If has role but not in required roles, redirect
      if (currentRole && !requiredRoles.includes(currentRole)) {
        navigate('/unauthorized', { replace: true });
        return;
      }

      // If no role and first access, let onboarding handle it
      if (!currentRole && profile?.primeiro_acesso) {
        return;
      }

      // If no role and no profile, redirect to unauthorized
      if (!currentRole && !profile) {
        navigate('/unauthorized', { replace: true });
        return;
      }
    }

  }, [isAuthenticated, isLoading, profile, roles, currentRole, location.pathname, requiredRoles, navigate, redirectTo]);

  // Show simple loading only during initial auth check
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render anything while redirecting
  if (!isAuthenticated) {
    return null;
  }

  // Render children for authenticated users
  return <>{children}</>;
}