/**
 * 🔄 CLERK REDIRECT UTILITIES
 * 
 * Utilities for handling post-authentication redirects with Clerk
 * Manages destination URLs and provides redirect logic
 */

import React, { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

// Storage keys for redirect URLs
const REDIRECT_URL_KEY = 'clerk_redirect_url';
const LAST_VISITED_KEY = 'clerk_last_visited';

/**
 * Stores the intended destination URL before authentication
 */
export function storeRedirectUrl(url: string): void {
  try {
    sessionStorage.setItem(REDIRECT_URL_KEY, url);
  } catch (error) {
    console.warn('Failed to store redirect URL:', error);
  }
}

/**
 * Retrieves and clears the stored redirect URL
 */
export function getAndClearRedirectUrl(): string | null {
  try {
    const url = sessionStorage.getItem(REDIRECT_URL_KEY);
    if (url) {
      sessionStorage.removeItem(REDIRECT_URL_KEY);
      return url;
    }
  } catch (error) {
    console.warn('Failed to retrieve redirect URL:', error);
  }
  return null;
}

/**
 * Stores the last visited protected route
 */
export function storeLastVisitedUrl(url: string): void {
  try {
    // Only store protected routes (not landing page or auth pages)
    if (url !== '/' && !url.includes('/sign-in') && !url.includes('/sign-up')) {
      sessionStorage.setItem(LAST_VISITED_KEY, url);
    }
  } catch (error) {
    console.warn('Failed to store last visited URL:', error);
  }
}

/**
 * Gets the last visited protected route
 */
export function getLastVisitedUrl(): string | null {
  try {
    return sessionStorage.getItem(LAST_VISITED_KEY);
  } catch (error) {
    console.warn('Failed to retrieve last visited URL:', error);
    return null;
  }
}

/**
 * Clears all stored redirect URLs
 */
export function clearStoredUrls(): void {
  try {
    sessionStorage.removeItem(REDIRECT_URL_KEY);
    sessionStorage.removeItem(LAST_VISITED_KEY);
  } catch (error) {
    console.warn('Failed to clear stored URLs:', error);
  }
}

/**
 * Determines the appropriate redirect URL after successful authentication
 */
export function getPostAuthRedirectUrl(): string {
  // Priority order:
  // 1. Stored redirect URL (where user was trying to go)
  // 2. Last visited protected route
  // 3. Default dashboard
  
  const storedRedirect = getAndClearRedirectUrl();
  if (storedRedirect) {
    return storedRedirect;
  }
  
  const lastVisited = getLastVisitedUrl();
  if (lastVisited) {
    return lastVisited;
  }
  
  return '/dashboard';
}

/**
 * Hook for handling post-authentication redirects
 */
export function usePostAuthRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn, isLoaded } = useAuth();

  // Store current location when user tries to access protected route
  const storeCurrentLocation = useCallback(() => {
    if (location.pathname !== '/') {
      storeRedirectUrl(location.pathname + location.search);
    }
  }, [location.pathname, location.search]);

  // Handle redirect after successful authentication
  const handlePostAuthRedirect = useCallback(() => {
    if (isSignedIn && isLoaded) {
      const redirectUrl = getPostAuthRedirectUrl();
      
      // Only redirect if we're currently on the landing page
      if (location.pathname === '/') {
        navigate(redirectUrl, { replace: true });
      }
    }
  }, [isSignedIn, isLoaded, location.pathname, navigate]);

  // Store last visited protected route
  useEffect(() => {
    if (isSignedIn && location.pathname !== '/') {
      storeLastVisitedUrl(location.pathname);
    }
  }, [isSignedIn, location.pathname]);

  return {
    storeCurrentLocation,
    handlePostAuthRedirect,
    getPostAuthRedirectUrl
  };
}

/**
 * Hook for handling logout redirects
 */
export function useLogoutRedirect() {
  const navigate = useNavigate();

  const handleLogoutRedirect = useCallback(() => {
    // Clear all stored URLs on logout
    clearStoredUrls();
    
    // Redirect to landing page
    navigate('/', { replace: true });
  }, [navigate]);

  return {
    handleLogoutRedirect
  };
}

/**
 * Protected route wrapper that stores redirect URL
 */
export function withRedirectStorage<T extends Record<string, any>>(
  Component: React.ComponentType<T>
): React.ComponentType<T> {
  return function WrappedComponent(props: T) {
    const { storeCurrentLocation } = usePostAuthRedirect();
    const { isSignedIn, isLoaded } = useAuth();

    useEffect(() => {
      // If user is not signed in and trying to access protected route,
      // store the current location for post-auth redirect
      if (isLoaded && !isSignedIn) {
        storeCurrentLocation();
      }
    }, [isSignedIn, isLoaded, storeCurrentLocation]);

    return React.createElement(Component, props);
  };
}