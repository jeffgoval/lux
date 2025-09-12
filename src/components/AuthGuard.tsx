import { ReactNode, useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { Database } from '@/integrations/supabase/types';
import { checkOnboardingStatus, canAccessBasicFeatures } from '@/utils/onboardingUtils';
import { debugUserState } from '@/utils/debugAuth';

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
  const { isAuthenticated, currentRole, isLoading, profile, roles, isProfileLoading, isRolesLoading, fixMissingUserData } = useAuth();
  const { setNavigationError, recordNavigation } = useNavigation();
  const navigate = useNavigate();
  const location = useLocation();

  const [waited, setWaited] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const graceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeouts on unmount - MUST be before any conditional returns
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      if (graceTimeoutRef.current) {
        clearTimeout(graceTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced grace period logic with better state tracking
  useEffect(() => {
    // Clear any existing timeouts
    if (graceTimeoutRef.current) {
      clearTimeout(graceTimeoutRef.current);
    }

    // If user is authenticated and data is still loading or missing
    if (isAuthenticated && (isProfileLoading || isRolesLoading || (!profile && !currentRole))) {
      setWaited(false);

      // Progressive timeout with longer wait for potential data creation
      let graceTime = 1500; // Default

      if (isProfileLoading) {
        graceTime = 2000; // Profile loading
      } else if (isRolesLoading) {
        graceTime = 3000; // Roles loading
      } else if (!profile && !currentRole) {
        // No data at all - might be creating, wait longer
        // Account for the 500ms delay in signIn + additional buffer
        graceTime = 6000;
      }

      console.log(`AuthGuard: Setting grace period of ${graceTime}ms`, {
        isProfileLoading,
        isRolesLoading,
        hasProfile: !!profile,
        hasCurrentRole: !!currentRole
      });

      graceTimeoutRef.current = setTimeout(() => {
        console.log('AuthGuard: Grace period ended, proceeding with available data');
        setWaited(true);
        setHasInitialized(true);
      }, graceTime);
    } else {
      setWaited(true);
      setHasInitialized(true);
    }

    // Always return cleanup function
    return () => {
      if (graceTimeoutRef.current) {
        clearTimeout(graceTimeoutRef.current);
      }
    };
  }, [isAuthenticated, profile, currentRole, isProfileLoading, isRolesLoading]);

  // Fallback timeout to prevent infinite loading
  useEffect(() => {
    if (isAuthenticated && !waited && !hasInitialized) {
      const fallbackTimeout = setTimeout(() => {
        console.warn('AuthGuard: Fallback timeout reached, proceeding with available data');
        setWaited(true);
        setHasInitialized(true);
      }, 5000); // 5 seconds fallback

      return () => clearTimeout(fallbackTimeout);
    }
  }, [isAuthenticated, waited, hasInitialized]);

  // Enhanced navigation logic with better decision making
  useEffect(() => {
    // Clear any existing navigation timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    // Don't make navigation decisions while core auth is loading
    if (isLoading) return;

    // If not authenticated, redirect to auth page
    if (!isAuthenticated) {
      console.log('AuthGuard: User not authenticated, redirecting to auth');
      recordNavigation(redirectTo);
      setNavigationError('User not authenticated');
      navigate(redirectTo, {
        state: { from: location.pathname },
        replace: true
      });
      return;
    }

    // Wait for initialization before making navigation decisions
    if (!hasInitialized) return;

    // Debug user state in development
    if (process.env.NODE_ENV === 'development') {
      debugUserState(isAuthenticated, profile, roles, currentRole, isProfileLoading, isRolesLoading, location.pathname);
    }

    // Handle onboarding flow with improved logic
    if (location.pathname !== '/onboarding') {
      const onboardingStatus = checkOnboardingStatus(profile, roles, isProfileLoading, isRolesLoading);

      // Only redirect to onboarding if we're sure the user needs it
      // Don't redirect if data is still loading or if we're in a grace period
      if (onboardingStatus.needsOnboarding && !onboardingStatus.canSkip && waited) {
        // Additional check: don't redirect if we just finished loading and have no data
        // This could indicate a temporary state during profile creation
        const isTemporaryState = !isProfileLoading && !isRolesLoading && !profile && roles.length === 0;

        if (!isTemporaryState) {
          console.log('AuthGuard: User needs onboarding, redirecting:', {
            reason: onboardingStatus.reason,
            hasProfile: !!profile,
            firstAccess: profile?.primeiro_acesso,
            rolesCount: roles.length,
            waited,
            isTemporaryState
          });
          recordNavigation('/onboarding');
          navigate('/onboarding', { replace: true });
          return;
        } else {
          console.log('AuthGuard: Detected temporary state, not redirecting to onboarding yet');
        }
      }

      // If user can access basic features but route requires roles, handle appropriately
      if (requiredRoles.length > 0 && !currentRole && canAccessBasicFeatures(profile, roles)) {
        console.log('AuthGuard: User can access basic features but route requires roles');
        // Let the role check below handle this
      }
    }

    // Enhanced role checks with better grace period handling
    if (requiredRoles.length > 0) {
      // If roles are still loading, wait
      if (isRolesLoading) {
        console.log('AuthGuard: Roles still loading, waiting...');
        return;
      }

      // If no role after waiting, redirect to unauthorized
      if (!currentRole) {
        if (!waited) {
          console.log('AuthGuard: No role yet, still waiting...');
          return; // Still waiting for roles
        }
        console.log('AuthGuard: No role after waiting, redirecting to unauthorized');
        recordNavigation('/unauthorized');
        setNavigationError('No role assigned');
        navigate('/unauthorized', { replace: true });
        return;
      }

      // Check if user has required role
      if (!requiredRoles.includes(currentRole)) {
        console.log('AuthGuard: User role not sufficient, redirecting to unauthorized:', {
          currentRole,
          requiredRoles
        });
        recordNavigation('/unauthorized');
        setNavigationError(`Insufficient role: ${currentRole} not in ${requiredRoles.join(', ')}`);
        navigate('/unauthorized', { replace: true });
        return;
      }
    }

    // If we reach here, user can access the route
    console.log('AuthGuard: Access granted for route:', location.pathname);
    setNavigationError(undefined); // Clear any previous errors
  }, [
    isAuthenticated,
    currentRole,
    isLoading,
    profile,
    navigate,
    location.pathname,
    redirectTo,
    requiredRoles,
    waited,
    hasInitialized,
    isProfileLoading,
    isRolesLoading,
    recordNavigation,
    setNavigationError,
    fixMissingUserData,
    roles
  ]);

  // Enhanced loading state logic
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show loading during initialization or while critical data is loading
  if (!hasInitialized || (isAuthenticated && (isProfileLoading || (isRolesLoading && requiredRoles.length > 0)))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show loading while waiting for data during grace period
  if (isAuthenticated && !waited && location.pathname !== '/onboarding') {
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

  // Don't render if user needs onboarding
  if (location.pathname !== '/onboarding' && (!profile || profile.primeiro_acesso)) {
    return null;
  }

  // Don't render if role check fails
  if (requiredRoles.length > 0 && (!currentRole || !requiredRoles.includes(currentRole))) {
    return null;
  }

  return <>{children}</>;
}