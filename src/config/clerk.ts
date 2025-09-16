/**
 * Clerk Configuration and Validation
 * 
 * This module handles the configuration and validation of Clerk authentication
 * environment variables to ensure proper setup.
 */

/**
 * Validates that the Clerk publishable key is properly configured
 * @throws Error if the publishable key is missing or invalid
 */
export function validateClerkConfiguration(): void {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  
  if (!publishableKey) {
    throw new Error(
      'VITE_CLERK_PUBLISHABLE_KEY is missing from environment variables. ' +
      'Please add it to your .env.local file.'
    );
  }
  
  if (!publishableKey.startsWith('pk_')) {
    throw new Error(
      'VITE_CLERK_PUBLISHABLE_KEY appears to be invalid. ' +
      'Clerk publishable keys should start with "pk_".'
    );
  }
  
  console.log('✅ Clerk configuration validated successfully');
}

/**
 * Gets the Clerk publishable key from environment variables
 * @returns The publishable key
 * @throws Error if the key is not configured properly
 */
export function getClerkPublishableKey(): string {
  validateClerkConfiguration();
  return import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
}