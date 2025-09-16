/**
 * 🔄 POST-AUTHENTICATION REDIRECT HANDLER
 * 
 * Component that handles redirects after successful authentication
 * Automatically redirects users to their intended destination
 */

import { useEffect } from 'react';
import { usePostAuthRedirect } from '@/utils/clerk-redirects';

interface PostAuthRedirectHandlerProps {
  children: React.ReactNode;
}

export function PostAuthRedirectHandler({ children }: PostAuthRedirectHandlerProps) {
  const { handlePostAuthRedirect } = usePostAuthRedirect();

  useEffect(() => {
    // Handle redirect after authentication state is loaded
    handlePostAuthRedirect();
  }, [handlePostAuthRedirect]);

  return <>{children}</>;
}