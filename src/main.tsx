import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.tsx";
import "./index.css";
import { getClerkPublishableKey } from "./config/clerk.ts";

/**
 * 🔐 CLERK AUTHENTICATION SETUP
 * 
 * This is the main entry point where we configure Clerk authentication
 * for the entire application. The ClerkProvider wraps the app and provides
 * authentication context to all components.
 */

// Get and validate Clerk configuration on application startup
let publishableKey: string;
try {
  publishableKey = getClerkPublishableKey();
} catch (error) {
  console.error('❌ Clerk Configuration Error:', error);
  // Show user-friendly error message and prevent app from loading if key is missing
  document.getElementById("root")!.innerHTML = `
    <div style="
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      justify-content: center; 
      height: 100vh; 
      font-family: system-ui, -apple-system, sans-serif;
      background: #f8fafc;
      color: #334155;
      text-align: center;
      padding: 2rem;
    ">
      <h1 style="color: #dc2626; margin-bottom: 1rem;">⚠️ Configuration Error</h1>
      <p style="margin-bottom: 1rem; max-width: 500px; line-height: 1.5;">
        ${error instanceof Error ? error.message : 'Unknown configuration error'}
      </p>
      <p style="font-size: 0.875rem; color: #64748b;">
        Please check your environment configuration and restart the application.
      </p>
    </div>
  `;
  throw error;
}

// Initialize React app with Clerk authentication provider
createRoot(document.getElementById("root")!).render(
  <ClerkProvider 
    publishableKey={publishableKey}
    // Redirect URLs for different authentication flows
    afterSignOutUrl="/"              // Landing page after logout
    afterSignInUrl="/dashboard"      // Dashboard after successful login
    afterSignUpUrl="/dashboard"      // Dashboard after successful registration
  >
    <App />
  </ClerkProvider>
);
