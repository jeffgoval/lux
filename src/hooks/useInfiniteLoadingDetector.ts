import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface InfiniteLoadingDetectorOptions {
  maxDuration?: number; // Maximum loading duration in ms
  warningDuration?: number; // Show warning after this duration
  onInfiniteLoading?: () => void; // Callback when infinite loading is detected
  onWarning?: () => void; // Callback when warning threshold is reached
  autoRecover?: boolean; // Automatically attempt recovery
}

export function useInfiniteLoadingDetector(
  isLoading: boolean,
  options: InfiniteLoadingDetectorOptions = {}
) {
  const {
    maxDuration = 15000, // 15 seconds
    warningDuration = 8000, // 8 seconds
    onInfiniteLoading,
    onWarning,
    autoRecover = true
  } = options;

  const [hasWarned, setHasWarned] = useState(false);
  const [hasDetectedInfinite, setHasDetectedInfinite] = useState(false);
  const [loadingDuration, setLoadingDuration] = useState(0);
  
  const startTimeRef = useRef<number | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = () => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Reset state when loading stops
  useEffect(() => {
    if (!isLoading) {
      cleanup();
      startTimeRef.current = null;
      setHasWarned(false);
      setHasDetectedInfinite(false);
      setLoadingDuration(0);
      return;
    }

    // Start tracking when loading begins
    if (isLoading && !startTimeRef.current) {
      startTimeRef.current = Date.now();
      setHasWarned(false);
      setHasDetectedInfinite(false);

      // Update duration every second
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setLoadingDuration(Date.now() - startTimeRef.current);
        }
      }, 1000);

      // Set warning timeout
      warningTimeoutRef.current = setTimeout(() => {
        if (isLoading && !hasWarned) {
          console.warn(`Loading taking longer than expected: ${warningDuration}ms`);
          setHasWarned(true);
          onWarning?.();
          
          if (autoRecover) {
            toast.warning('Carregamento demorado', {
              description: 'A página está demorando para carregar. Isso pode indicar um problema.',
              action: {
                label: 'Recarregar',
                onClick: () => window.location.reload()
              }
            });
          }
        }
      }, warningDuration);

      // Set maximum timeout
      maxTimeoutRef.current = setTimeout(() => {
        if (isLoading && !hasDetectedInfinite) {
          console.error(`Infinite loading detected after ${maxDuration}ms`);
          setHasDetectedInfinite(true);
          onInfiniteLoading?.();
          
          if (autoRecover) {
            toast.error('Loading infinito detectado', {
              description: 'A página não conseguiu carregar. Tente recarregar ou voltar ao dashboard.',
              action: {
                label: 'Recarregar',
                onClick: () => window.location.reload()
              },
              duration: 10000
            });
          }
        }
      }, maxDuration);
    }

    return cleanup;
  }, [isLoading, hasWarned, hasDetectedInfinite, warningDuration, maxDuration, onWarning, onInfiniteLoading, autoRecover]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  return {
    hasWarned,
    hasDetectedInfinite,
    loadingDuration,
    forceStop: () => {
      cleanup();
      setHasDetectedInfinite(true);
      onInfiniteLoading?.();
    }
  };
}

// Hook specifically for page-level loading detection
export function usePageLoadingDetector(isLoading: boolean) {
  return useInfiniteLoadingDetector(isLoading, {
    maxDuration: 12000, // 12 seconds for page loads
    warningDuration: 6000, // 6 seconds warning
    autoRecover: true,
    onInfiniteLoading: () => {
      console.error('Page loading timeout detected');
      
      // Log current state for debugging
      console.log('Current URL:', window.location.href);
      console.log('Loading state:', isLoading);
      console.log('User agent:', navigator.userAgent);
      
      // Attempt recovery
      setTimeout(() => {
        if (window.location.pathname === '/') {
          window.location.href = '/dashboard';
        } else {
          window.location.reload();
        }
      }, 2000);
    },
    onWarning: () => {
      console.warn('Page loading taking longer than expected');
    }
  });
}

// Hook for auth-specific loading detection
export function useAuthLoadingDetector(isLoading: boolean) {
  return useInfiniteLoadingDetector(isLoading, {
    maxDuration: 10000, // 10 seconds for auth
    warningDuration: 5000, // 5 seconds warning
    autoRecover: true,
    onInfiniteLoading: () => {
      console.error('Auth loading timeout detected');
      
      // Clear auth cache and redirect
      try {
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();
      } catch (error) {
        console.error('Error clearing auth storage:', error);
      }
      
      setTimeout(() => {
        window.location.href = '/auth';
      }, 1000);
    }
  });
}