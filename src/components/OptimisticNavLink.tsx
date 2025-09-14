import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useOptimisticNavigation } from '@/hooks/useOptimisticNavigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptimisticNavLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  title?: string;
  onClick?: (e: React.MouseEvent) => void;
  optimistic?: boolean;
  preloadData?: boolean;
  showLoadingState?: boolean;
}

export function OptimisticNavLink({
  to,
  children,
  className = '',
  activeClassName = '',
  title,
  onClick,
  optimistic = true,
  preloadData = false,
  showLoadingState = true,
  ...props
}: OptimisticNavLinkProps) {
  const location = useLocation();
  const { state, navigate, canNavigate, clearError } = useOptimisticNavigation({
    preloadData,
    validateAccess: true,
    rollbackOnError: true
  });

  const [isHovered, setIsHovered] = useState(false);
  const [preloadStarted, setPreloadStarted] = useState(false);

  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
  const isTargetRoute = state.targetRoute === to;
  const isNavigatingToThis = state.isNavigating && isTargetRoute;

  // Handle click with optimistic navigation
  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // Call custom onClick if provided
    if (onClick) {
      onClick(e);
    }

    // Check if user can navigate to this route
    if (!canNavigate(to)) {

      return;
    }

    // Clear any previous errors
    if (state.error) {
      clearError();
    }

    // Use optimistic navigation if enabled
    if (optimistic) {
      await navigate(to, { optimistic: true });
    } else {
      await navigate(to, { optimistic: false });
    }
  };

  // Preload on hover (if enabled)
  useEffect(() => {
    if (isHovered && preloadData && !preloadStarted && !isActive) {
      setPreloadStarted(true);
      // Trigger preload by attempting navigation with dry run
      // This would be implemented in the useOptimisticNavigation hook

    }
  }, [isHovered, preloadData, preloadStarted, isActive, to]);

  // Determine the visual state
  const getVisualState = () => {
    if (isActive) return 'active';
    if (isNavigatingToThis) return 'loading';
    if (state.error && isTargetRoute) return 'error';
    return 'default';
  };

  const visualState = getVisualState();

  // Build className based on state
  const linkClassName = cn(
    className,
    {
      [activeClassName]: isActive,
      'opacity-75 pointer-events-none': isNavigatingToThis && showLoadingState,
      'text-destructive': visualState === 'error'
    }
  );

  return (
    <NavLink
      to={to}
      className={linkClassName}
      title={title}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      <div className="flex items-center gap-2 w-full">
        {children}
        
        {/* Loading indicator */}
        {showLoadingState && isNavigatingToThis && (
          <Loader2 className="h-3 w-3 animate-spin ml-auto flex-shrink-0" />
        )}
        
        {/* Error indicator */}
        {visualState === 'error' && (
          <AlertCircle className="h-3 w-3 text-destructive ml-auto flex-shrink-0" />
        )}
      </div>
      
      {/* Error tooltip */}
      {visualState === 'error' && state.error && (
        <div className="absolute z-50 px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded shadow-lg -top-8 left-0 whitespace-nowrap">
          {state.error}
        </div>
      )}
    </NavLink>
  );
}

// Higher-order component for wrapping existing NavLinks
export function withOptimisticNavigation<P extends object>(
  Component: React.ComponentType<P & { to: string; onClick?: (e: React.MouseEvent) => void }>
) {
  return function OptimisticComponent(props: P & { 
    to: string; 
    optimistic?: boolean;
    preloadData?: boolean;
  }) {
    const { optimistic = true, preloadData = false, ...componentProps } = props;
    const { navigate, canNavigate } = useOptimisticNavigation({
      preloadData,
      validateAccess: true
    });

    const handleOptimisticClick = async (e: React.MouseEvent) => {
      e.preventDefault();
      
      if (!canNavigate(props.to)) {

        return;
      }

      await navigate(props.to, { optimistic });
    };

    return (
      <Component
        {...(componentProps as P & { to: string; onClick?: (e: React.MouseEvent) => void })}
        onClick={handleOptimisticClick}
      />
    );
  };
}

// Utility component for navigation loading states
export function NavigationLoadingIndicator() {
  const { state } = useOptimisticNavigation();

  if (!state.isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-primary/20">
      <div className="h-full bg-primary animate-pulse" style={{ width: '30%' }} />
    </div>
  );
}

// Hook for components that need to react to navigation state
export function useNavigationState() {
  const { state } = useOptimisticNavigation();
  const location = useLocation();

  return {
    isNavigating: state.isNavigating,
    targetRoute: state.targetRoute,
    currentRoute: location.pathname,
    navigationError: state.error,
    canRollback: state.canRollback
  };
}
