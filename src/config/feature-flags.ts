/**
 * 🚩 FEATURE FLAGS SYSTEM
 * 
 * Sistema de feature flags para controlar rollback rápido
 * e ativação gradual de funcionalidades.
 */

interface FeatureFlags {
  // Auth system flags
  USE_UNIFIED_AUTH: boolean;
  USE_LEGACY_AUTH_FALLBACK: boolean;
  
  // Performance flags
  ENABLE_AUTH_CACHE: boolean;
  ENABLE_PERFORMANCE_MONITORING: boolean;
  
  // Debug flags
  ENABLE_AUTH_DEBUG: boolean;
  ENABLE_DETAILED_LOGGING: boolean;
}

// Default feature flags
const DEFAULT_FLAGS: FeatureFlags = {
  // Auth system - unified by default
  USE_UNIFIED_AUTH: true,
  USE_LEGACY_AUTH_FALLBACK: false,
  
  // Performance - enabled by default
  ENABLE_AUTH_CACHE: true,
  ENABLE_PERFORMANCE_MONITORING: true,
  
  // Debug - only in development
  ENABLE_AUTH_DEBUG: import.meta.env.DEV || false,
  ENABLE_DETAILED_LOGGING: import.meta.env.DEV || false,
};

// Environment overrides
const ENV_OVERRIDES: Partial<FeatureFlags> = {
  // Override from environment variables
  USE_UNIFIED_AUTH: import.meta.env.VITE_USE_UNIFIED_AUTH !== 'false',
  USE_LEGACY_AUTH_FALLBACK: import.meta.env.VITE_USE_LEGACY_AUTH_FALLBACK === 'true',
  ENABLE_AUTH_CACHE: import.meta.env.VITE_ENABLE_AUTH_CACHE !== 'false',
  ENABLE_PERFORMANCE_MONITORING: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING !== 'false',
  ENABLE_AUTH_DEBUG: import.meta.env.VITE_ENABLE_AUTH_DEBUG === 'true',
  ENABLE_DETAILED_LOGGING: import.meta.env.VITE_ENABLE_DETAILED_LOGGING === 'true',
};

// Final feature flags with environment overrides
export const FEATURE_FLAGS: FeatureFlags = {
  ...DEFAULT_FLAGS,
  ...ENV_OVERRIDES,
};

// Utility functions
export const isFeatureEnabled = (flag: keyof FeatureFlags): boolean => {
  return FEATURE_FLAGS[flag];
};

export const getFeatureFlag = <K extends keyof FeatureFlags>(flag: K): FeatureFlags[K] => {
  return FEATURE_FLAGS[flag];
};

// Debug helper
export const logFeatureFlags = (): void => {
  if (FEATURE_FLAGS.ENABLE_DETAILED_LOGGING) {
    console.log('🚩 Feature Flags:', FEATURE_FLAGS);
  }
};

// Runtime flag updates (for emergency rollback)
export const updateFeatureFlag = <K extends keyof FeatureFlags>(
  flag: K, 
  value: FeatureFlags[K]
): void => {
  (FEATURE_FLAGS as any)[flag] = value;
  
  if (FEATURE_FLAGS.ENABLE_DETAILED_LOGGING) {
    console.log(`🚩 Feature flag updated: ${flag} = ${value}`);
  }
};

// Emergency rollback function
export const emergencyRollbackToLegacyAuth = (): void => {
  console.warn('🚨 EMERGENCY ROLLBACK: Switching to legacy auth system');
  
  updateFeatureFlag('USE_UNIFIED_AUTH', false);
  updateFeatureFlag('USE_LEGACY_AUTH_FALLBACK', true);
  
  // Force page reload to apply changes
  window.location.reload();
};

// Health check for feature flags
export const validateFeatureFlags = (): boolean => {
  try {
    // Validate that conflicting flags are not both enabled
    if (FEATURE_FLAGS.USE_UNIFIED_AUTH && FEATURE_FLAGS.USE_LEGACY_AUTH_FALLBACK) {
      console.warn('⚠️ Warning: Both unified and legacy auth flags are enabled');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Feature flags validation failed:', error);
    return false;
  }
};

// Initialize feature flags
logFeatureFlags();
validateFeatureFlags();