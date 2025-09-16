import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { performanceMonitor } from '@/utils/performanceMonitor';

export interface NavigationState {
  currentPath: string;
  previousPath: string;
  isLoading: boolean;
  error?: string;
  retryCount: number;
  lastSuccessfulNavigation: string;
  navigationHistory: string[];
}

export interface NavigationStateManager {
  currentRoute: string;
  previousRoute: string;
  navigationHistory: string[];
  isNavigating: boolean;
  navigationState: NavigationState;
  
  // Authentication-aware properties
  isAuthenticated: boolean;
  isAuthLoaded: boolean;
  
  setNavigating: (navigating: boolean) => void;
  recordNavigation: (route: string) => void;
  canNavigateBack: () => boolean;
  clearHistory: () => void;
  setNavigationError: (error: string | undefined) => void;
  retryNavigation: () => void;
  getNavigationStats: () => NavigationStats;
  
  // Authentication-aware methods
  canAccessRoute: (route: string) => boolean;
  getAccessibleRoutes: () => string[];
}

export interface NavigationStats {
  totalNavigations: number;
  successfulNavigations: number;
  failedNavigations: number;
  averageNavigationTime: number;
  mostVisitedRoutes: { route: string; count: number }[];
}

interface NavigationContextType extends NavigationStateManager {}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

const MAX_HISTORY_SIZE = 50;
const MAX_RETRY_COUNT = 3;

export function NavigationProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();
  
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentPath: location.pathname,
    previousPath: '',
    isLoading: false,
    retryCount: 0,
    lastSuccessfulNavigation: location.pathname,
    navigationHistory: [location.pathname]
  });

  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationStats, setNavigationStats] = useState<{
    totalNavigations: number;
    successfulNavigations: number;
    failedNavigations: number;
    navigationTimes: number[];
    routeCounts: Record<string, number>;
  }>({
    totalNavigations: 0,
    successfulNavigations: 0,
    failedNavigations: 0,
    navigationTimes: [],
    routeCounts: {}
  });

  // Track route changes with authentication awareness
  useEffect(() => {
    const newPath = location.pathname;
    
    // Only track navigation for authenticated users or public routes
    const isPublicRoute = newPath === '/' || newPath.includes('/sign-in') || newPath.includes('/sign-up');
    const shouldTrackNavigation = isSignedIn || isPublicRoute;
    
    if (!shouldTrackNavigation && isLoaded) {
      // Don't track navigation for unauthenticated users on protected routes
      return;
    }
    
    setNavigationState(prev => {
      const newHistory = [...prev.navigationHistory];
      
      // Only add to history if it's a different route and should be tracked
      if (newPath !== prev.currentPath && shouldTrackNavigation) {
        newHistory.push(newPath);
        
        // Limit history size
        if (newHistory.length > MAX_HISTORY_SIZE) {
          newHistory.shift();
        }
      }

      return {
        ...prev,
        previousPath: prev.currentPath,
        currentPath: newPath,
        navigationHistory: shouldTrackNavigation ? newHistory : prev.navigationHistory,
        lastSuccessfulNavigation: shouldTrackNavigation ? newPath : prev.lastSuccessfulNavigation,
        retryCount: 0, // Reset retry count on successful navigation
        error: undefined // Clear any previous errors
      };
    });

    // Update stats only for tracked navigation
    if (shouldTrackNavigation) {
      setNavigationStats(prev => ({
        ...prev,
        totalNavigations: prev.totalNavigations + 1,
        successfulNavigations: prev.successfulNavigations + 1,
        routeCounts: {
          ...prev.routeCounts,
          [newPath]: (prev.routeCounts[newPath] || 0) + 1
        }
      }));
    }

    // Clear navigating state
    setIsNavigating(false);
  }, [location.pathname, isSignedIn, isLoaded]);

  const setNavigating = (navigating: boolean) => {
    setIsNavigating(navigating);
    setNavigationState(prev => ({
      ...prev,
      isLoading: navigating
    }));
  };

  const recordNavigation = (route: string) => {
    const startTime = performance.now();
    
    setNavigating(true);
    
    // Record navigation start in performance monitor
    performanceMonitor.recordNavigationStart(route);
    
    // Record navigation attempt
    setNavigationStats(prev => ({
      ...prev,
      totalNavigations: prev.totalNavigations + 1
    }));

    // Set a timeout to measure navigation time
    setTimeout(() => {
      const navigationTime = performance.now() - startTime;
      
      // Record in performance monitor
      performanceMonitor.recordNavigationEnd(route, startTime);
      
      setNavigationStats(prev => ({
        ...prev,
        navigationTimes: [...prev.navigationTimes.slice(-19), navigationTime] // Keep last 20 times
      }));
    }, 100);
  };

  const canNavigateBack = (): boolean => {
    return navigationState.navigationHistory.length > 1;
  };

  const clearHistory = () => {
    setNavigationState(prev => ({
      ...prev,
      navigationHistory: [prev.currentPath],
      previousPath: ''
    }));
  };

  const setNavigationError = (error: string | undefined) => {
    setNavigationState(prev => ({
      ...prev,
      error,
      isLoading: false
    }));

    if (error) {
      setNavigationStats(prev => ({
        ...prev,
        failedNavigations: prev.failedNavigations + 1
      }));
    }

    setIsNavigating(false);
  };

  const retryNavigation = () => {
    setNavigationState(prev => {
      if (prev.retryCount >= MAX_RETRY_COUNT) {

        return prev;
      }

      const newRetryCount = prev.retryCount + 1;

      // Try to navigate to the last successful route
      setTimeout(() => {
        navigate(prev.lastSuccessfulNavigation, { replace: true });
      }, 1000 * newRetryCount); // Exponential backoff

      return {
        ...prev,
        retryCount: newRetryCount,
        isLoading: true,
        error: undefined
      };
    });

    setIsNavigating(true);
  };

  const getNavigationStats = (): NavigationStats => {
    const averageNavigationTime = navigationStats.navigationTimes.length > 0
      ? navigationStats.navigationTimes.reduce((a, b) => a + b, 0) / navigationStats.navigationTimes.length
      : 0;

    const mostVisitedRoutes = Object.entries(navigationStats.routeCounts)
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalNavigations: navigationStats.totalNavigations,
      successfulNavigations: navigationStats.successfulNavigations,
      failedNavigations: navigationStats.failedNavigations,
      averageNavigationTime,
      mostVisitedRoutes
    };
  };

  // Authentication-aware route access control
  const canAccessRoute = (route: string): boolean => {
    // Public routes that don't require authentication
    const publicRoutes = ['/', '/sign-in', '/sign-up'];
    
    if (publicRoutes.includes(route)) {
      return true;
    }
    
    // Protected routes require authentication
    return isSignedIn;
  };

  const getAccessibleRoutes = (): string[] => {
    const allRoutes = [
      '/',
      '/dashboard',
      '/agendamento',
      '/clientes',
      '/servicos',
      '/produtos',
      '/equipamentos',
      '/financeiro',
      '/comunicacao',
      '/prontuarios',
      '/executivo',
      '/alertas',
      '/perfil'
    ];
    
    return allRoutes.filter(route => canAccessRoute(route));
  };

  const value: NavigationContextType = {
    currentRoute: navigationState.currentPath,
    previousRoute: navigationState.previousPath,
    navigationHistory: navigationState.navigationHistory,
    isNavigating,
    navigationState,
    
    // Authentication state
    isAuthenticated: isSignedIn,
    isAuthLoaded: isLoaded,
    
    setNavigating,
    recordNavigation,
    canNavigateBack,
    clearHistory,
    setNavigationError,
    retryNavigation,
    getNavigationStats,
    
    // Authentication-aware methods
    canAccessRoute,
    getAccessibleRoutes
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

// Hook for navigation with automatic state management
export function useNavigationWithState() {
  const navigation = useNavigation();
  const navigate = useNavigate();

  const navigateWithState = (to: string, options?: { replace?: boolean }) => {
    navigation.recordNavigation(to);
    navigate(to, options);
  };

  const navigateBack = () => {
    if (navigation.canNavigateBack()) {
      const previousRoute = navigation.navigationHistory[navigation.navigationHistory.length - 2];
      navigateWithState(previousRoute, { replace: true });
    }
  };

  return {
    ...navigation,
    navigate: navigateWithState,
    navigateBack
  };
}

// Development helper
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).navigationDebug = {
    getStats: () => {
      // This will be populated when the context is used

    }
  };
}
