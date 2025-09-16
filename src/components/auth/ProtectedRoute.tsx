/**
 * 🔒 PROTECTED ROUTE COMPONENT
 * 
 * Wrapper component for protected routes that handles redirect URL storage
 * and ensures proper authentication flow
 */

import { SignedIn } from "@clerk/clerk-react";
import { withRedirectStorage } from "@/utils/clerk-redirects";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRouteBase({ children }: ProtectedRouteProps) {
  return (
    <SignedIn>
      {children}
    </SignedIn>
  );
}

// Export the component wrapped with redirect storage functionality
export const ProtectedRoute = withRedirectStorage(ProtectedRouteBase);