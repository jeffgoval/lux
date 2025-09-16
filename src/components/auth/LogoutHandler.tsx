/**
 * 🚪 LOGOUT HANDLER COMPONENT
 * 
 * Component that handles logout redirects and cleanup
 */

import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useLogoutRedirect } from '@/utils/clerk-redirects';

export function LogoutHandler() {
  const { isSignedIn, isLoaded } = useAuth();
  const { handleLogoutRedirect } = useLogoutRedirect();

  useEffect(() => {
    // If user is loaded and not signed in, handle logout redirect
    if (isLoaded && !isSignedIn) {
      handleLogoutRedirect();
    }
  }, [isSignedIn, isLoaded, handleLogoutRedirect]);

  return null; // This component doesn't render anything
}