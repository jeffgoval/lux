import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigation } from '@/contexts/NavigationContext';
import { useAuth } from '@/contexts/AuthContext';

export interface OptimisticNavigationState {
  isNavigating: boolean;
  targetRoute: string | null;
  error: string | null;
  canRollback: boolean;
}

export interface OptimisticNavigationOptions {
  timeout?: number;
  rollbackOnError?: boolean;
  preloadData?: boolean;
  validateAccess?: boolean;
}

const DEFAULT_OPTIONS: OptimisticNavigationOptions = {
  timeout: 5000,
  rollbackOnError: true,
  preloadData: false,
  validateAccess: true
};

export function useOptimisticNavigation(options: OptimisticNavigationOptions = {}) {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };
  const navigate = useNavigate();
  const location = useLocation();
  const { recordNavigation, setNavigationError } = useNavigation();
  const { currentRole, hasRole } = useAuth();
  
  const [state, setState] = useState<OptimisticNavigationState>({
    isNavigating: false,
    targetRoute: null,
    error: null,
    canRollback: false
  });

  const rollbackRoute = useRef<string | null>(null);
  const navigationTimeout = useRef<NodeJS.Timeout | null>(null);

  // Route access validation
  const validateRouteAccess = useCallback((route: string): boolean => {
    if (!finalOptions.validateAccess) return true;

    // Define route permissions (this could be moved to a config file)
    const routePermissions: Record<string, string[]> = {
      '/agendamento': ['super_admin', 'proprietaria', 'gerente', 'recepcionistas'],
      '/clientes': ['super_admin', 'proprietaria', 'gerente', 'profissionais', 'recepcionistas'],
      '/servicos': ['super_admin', 'proprietaria', 'gerente', 'profissionais'],
      '/produtos': ['super_admin', 'proprietaria', 'gerente'],
      '/equipamentos': ['super_admin', 'proprietaria', 'gerente'],
      '/financeiro': ['super_admin', 'proprietaria', 'gerente'],
      '/comunicacao': ['super_admin', 'proprietaria', 'gerente', 'recepcionistas'],
      '/prontuarios': ['super_admin', 'proprietaria', 'gerente', 'profissionais']
    };

    const requiredRoles = routePermissions[route];
    if (!requiredRoles) return true; // No restrictions

    return currentRole ? requiredRoles.includes(currentRole) : false;
  }, [currentRole, finalOptions.validateAccess]);

  // Preload route data
  const preloadRouteData = useCallback(async (route: string): Promise<boolean> => {
    if (!finalOptions.preloadData) return true;

    try {
      // This is where you would implement route-specific data preloading
      // For example, preload user data, menu items, etc.
      console.log(`Preloading data for route: ${route}`);
      
      // Simulate preloading delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('Failed to preload route data:', error);
      return false;
    }
  }, [finalOptions.preloadData]);

  // Optimistic navigation function
  const navigateOptimistically = useCallback(async (
    to: string, 
    navigationOptions?: { replace?: boolean; state?: any }
  ) => {
    // Store current route for potential rollback
    rollbackRoute.current = location.pathname;

    // Validate access before starting navigation
    if (!validateRouteAccess(to)) {
      setState(prev => ({
        ...prev,
        error: 'Access denied to target route',
        canRollback: false
      }));
      setNavigationError(`Access denied to route: ${to}`);
      return false;
    }

    // Start optimistic navigation
    setState({
      isNavigating: true,
      targetRoute: to,
      error: null,
      canRollback: true
    });

    recordNavigation(to);

    try {
      // Preload data if enabled
      if (finalOptions.preloadData) {
        const preloadSuccess = await preloadRouteData(to);
        if (!preloadSuccess) {
          throw new Error('Failed to preload route data');
        }
      }

      // Set timeout for navigation
      if (navigationTimeout.current) {
        clearTimeout(navigationTimeout.current);
      }

      navigationTimeout.current = setTimeout(() => {
        if (state.isNavigating) {
          console.warn('Navigation timeout reached');
          setState(prev => ({
            ...prev,
            error: 'Navigation timeout',
            isNavigating: false
          }));
          
          if (finalOptions.rollbackOnError) {
            rollback();
          }
        }
      }, finalOptions.timeout);

      // Perform the actual navigation
      navigate(to, navigationOptions);

      // Navigation initiated successfully
      return true;

    } catch (error) {
      console.error('Optimistic navigation failed:', error);
      
      setState(prev => ({
        ...prev,
        error: (error as Error).message,
        isNavigating: false
      }));

      setNavigationError((error as Error).message);

      if (finalOptions.rollbackOnError) {
        rollback();
      }

      return false;
    }
  }, [
    location.pathname,
    validateRouteAccess,
    recordNavigation,
    setNavigationError,
    preloadRouteData,
    navigate,
    finalOptions,
    state.isNavigating
  ]);

  // Rollback to previous route
  const rollback = useCallback(() => {
    if (rollbackRoute.current && rollbackRoute.current !== location.pathname) {
      console.log(`Rolling back navigation to: ${rollbackRoute.current}`);
      navigate(rollbackRoute.current, { replace: true });
    }

    setState({
      isNavigating: false,
      targetRoute: null,
      error: null,
      canRollback: false
    });

    if (navigationTimeout.current) {
      clearTimeout(navigationTimeout.current);
      navigationTimeout.current = null;
    }
  }, [location.pathname, navigate]);

  // Complete navigation (called when route actually changes)
  const completeNavigation = useCallback(() => {
    setState({
      isNavigating: false,
      targetRoute: null,
      error: null,
      canRollback: false
    });

    if (navigationTimeout.current) {
      clearTimeout(navigationTimeout.current);
      navigationTimeout.current = null;
    }

    rollbackRoute.current = null;
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  // Enhanced navigate function with optimistic updates
  const optimisticNavigate = useCallback((
    to: string,
    options?: { replace?: boolean; state?: any; optimistic?: boolean }
  ) => {
    const { optimistic = true, ...navOptions } = options || {};

    if (optimistic) {
      return navigateOptimistically(to, navOptions);
    } else {
      recordNavigation(to);
      navigate(to, navOptions);
      return Promise.resolve(true);
    }
  }, [navigateOptimistically, recordNavigation, navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeout.current) {
        clearTimeout(navigationTimeout.current);
      }
    };
  }, []);

  // Auto-complete navigation when location changes
  useEffect(() => {
    if (state.isNavigating && state.targetRoute === location.pathname) {
      completeNavigation();
    }
  }, [location.pathname, state.isNavigating, state.targetRoute, completeNavigation]);

  return {
    state,
    navigate: optimisticNavigate,
    rollback,
    completeNavigation,
    clearError,
    canNavigate: (route: string) => validateRouteAccess(route)
  };
}

// Hook for optimistic state updates during navigation
export function useOptimisticState<T>(initialState: T) {
  const [optimisticState, setOptimisticState] = useState<T>(initialState);
  const [actualState, setActualState] = useState<T>(initialState);
  const [isOptimistic, setIsOptimistic] = useState(false);

  const updateOptimistically = useCallback((newState: T | ((prev: T) => T)) => {
    setIsOptimistic(true);
    setOptimisticState(typeof newState === 'function' ? (newState as (prev: T) => T)(optimisticState) : newState);
  }, [optimisticState]);

  const confirmUpdate = useCallback((confirmedState: T) => {
    setActualState(confirmedState);
    setOptimisticState(confirmedState);
    setIsOptimistic(false);
  }, []);

  const rollbackUpdate = useCallback(() => {
    setOptimisticState(actualState);
    setIsOptimistic(false);
  }, [actualState]);

  return {
    state: optimisticState,
    isOptimistic,
    updateOptimistically,
    confirmUpdate,
    rollbackUpdate
  };
}