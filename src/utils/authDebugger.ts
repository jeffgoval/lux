import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { checkUserDataStatus, validateUserDataIntegrity } from './userDataRecovery';
import { getAuthCacheStats } from './authCache';
import { errorRecoveryManager } from './errorRecovery';

export interface AuthDebugReport {
  timestamp: string;
  userId: string;
  userEmail: string;
  sessionStatus: {
    hasSession: boolean;
    sessionValid: boolean;
    expiresAt?: string;
    error?: string;
  };
  profileStatus: {
    exists: boolean;
    data?: any;
    error?: string;
  };
  roleStatus: {
    exists: boolean;
    count: number;
    data?: any[];
    error?: string;
  };
  clinicStatus: {
    hasAccess: boolean;
    count: number;
    data?: any[];
    error?: string;
  };
  organizationStatus: {
    hasAccess: boolean;
    count: number;
    data?: any[];
    error?: string;
  };
  cacheStatus: {
    profileCached: boolean;
    profileFresh: boolean;
    rolesCached: boolean;
    rolesFresh: boolean;
    permissionsCached: boolean;
    permissionsFresh: boolean;
  };
  navigationStatus: {
    currentRoute: string;
    previousRoute?: string;
    isNavigating: boolean;
    navigationHistory: string[];
  };
  errorStatus: {
    totalErrors: number;
    recentErrors: any[];
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
  };
  integrity: {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  };
  performance: {
    memoryUsage?: any;
    navigationTiming?: any;
    cacheHitRate: number;
  };
  summary: {
    overallStatus: 'healthy' | 'warning' | 'error';
    criticalIssues: string[];
    nextSteps: string[];
  };
}

/**
 * Generate a comprehensive debug report for authentication issues
 */
export async function generateAuthDebugReport(user?: User): Promise<AuthDebugReport> {
  const timestamp = new Date().toISOString();
  
  // Get current user if not provided
  if (!user) {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    user = currentUser;
  }

  if (!user) {
    return {
      timestamp,
      userId: 'unknown',
      userEmail: 'unknown',
      sessionStatus: {
        hasSession: false,
        sessionValid: false,
        error: 'No user found'
      },
      profileStatus: { exists: false, error: 'No user' },
      roleStatus: { exists: false, count: 0, error: 'No user' },
      clinicStatus: { hasAccess: false, count: 0, error: 'No user' },
      organizationStatus: { hasAccess: false, count: 0, error: 'No user' },
      integrity: {
        isValid: false,
        issues: ['No authenticated user'],
        recommendations: ['User needs to log in']
      },
      summary: {
        overallStatus: 'error',
        criticalIssues: ['No authenticated user'],
        nextSteps: ['Redirect to login page']
      }
    };
  }

  const userId = user.id;
  const userEmail = user.email || 'unknown';

  // Check session status
  const sessionStatus = await checkSessionStatus();
  
  // Check profile status
  const profileStatus = await checkProfileStatus(userId);
  
  // Check role status
  const roleStatus = await checkRoleStatus(userId);
  
  // Check clinic access
  const clinicStatus = await checkClinicAccess(userId);
  
  // Check organization access
  const organizationStatus = await checkOrganizationAccess(userId);
  
  // Get cache status
  const cacheStatus = getAuthCacheStats();
  
  // Get navigation status
  const navigationStatus = getNavigationStatus();
  
  // Get error status
  const errorStatus = getErrorStatus();
  
  // Get performance metrics
  const performance = getPerformanceMetrics();
  
  // Validate data integrity
  const integrity = await validateUserDataIntegrity(userId);
  
  // Generate summary
  const summary = generateSummary({
    sessionStatus,
    profileStatus,
    roleStatus,
    clinicStatus,
    organizationStatus,
    cacheStatus,
    navigationStatus,
    errorStatus,
    integrity,
    performance
  });

  return {
    timestamp,
    userId,
    userEmail,
    sessionStatus,
    profileStatus,
    roleStatus,
    clinicStatus,
    organizationStatus,
    cacheStatus,
    navigationStatus,
    errorStatus,
    integrity,
    performance,
    summary
  };
}

async function checkSessionStatus() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    return {
      hasSession: !!session,
      sessionValid: !!session && !error,
      expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : undefined,
      error: error?.message
    };
  } catch (error: any) {
    return {
      hasSession: false,
      sessionValid: false,
      error: error.message
    };
  }
}

async function checkProfileStatus(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    return {
      exists: !!data,
      data,
      error: error?.message
    };
  } catch (error: any) {
    return {
      exists: false,
      error: error.message
    };
  }
}

async function checkRoleStatus(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId);

    return {
      exists: !!(data && data.length > 0),
      count: data?.length || 0,
      data,
      error: error?.message
    };
  } catch (error: any) {
    return {
      exists: false,
      count: 0,
      error: error.message
    };
  }
}

async function checkClinicAccess(userId: string) {
  try {
    const { data, error } = await supabase
      .from('clinicas')
      .select('*');

    return {
      hasAccess: !!(data && data.length > 0),
      count: data?.length || 0,
      data,
      error: error?.message
    };
  } catch (error: any) {
    return {
      hasAccess: false,
      count: 0,
      error: error.message
    };
  }
}

async function checkOrganizationAccess(userId: string) {
  try {
    // Organizations table no longer exists
    return {
      hasAccess: false,
      count: 0,
      data: null,
      error: null
    };
  } catch (error: any) {
    return {
      hasAccess: false,
      count: 0,
      error: error.message
    };
  }
}

function getNavigationStatus() {
  try {
    // Try to get navigation context if available
    const currentRoute = window.location.pathname;
    return {
      currentRoute,
      previousRoute: document.referrer ? new URL(document.referrer).pathname : undefined,
      isNavigating: false, // Will be updated by navigation context
      navigationHistory: [currentRoute]
    };
  } catch (error) {
    return {
      currentRoute: 'unknown',
      isNavigating: false,
      navigationHistory: []
    };
  }
}

function getErrorStatus() {
  try {
    const errorReport = errorRecoveryManager.generateErrorReport();
    return {
      totalErrors: errorReport.totalErrors,
      recentErrors: errorReport.recentErrors,
      errorsByCategory: errorReport.errorsByCategory,
      errorsBySeverity: errorReport.errorsBySeverity
    };
  } catch (error) {
    return {
      totalErrors: 0,
      recentErrors: [],
      errorsByCategory: {},
      errorsBySeverity: {}
    };
  }
}

function getPerformanceMetrics() {
  try {
    const performance: any = {
      cacheHitRate: 0
    };

    // Get memory usage if available
    if ('memory' in performance && (performance as any).memory) {
      performance.memoryUsage = {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      };
    }

    // Get navigation timing if available
    if ('getEntriesByType' in performance) {
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const entry = navigationEntries[0];
        performance.navigationTiming = {
          domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
          loadComplete: entry.loadEventEnd - entry.loadEventStart,
          totalTime: entry.loadEventEnd - entry.fetchStart
        };
      }
    }

    // Calculate cache hit rate from cache stats
    const cacheStats = getAuthCacheStats();
    const totalCacheChecks = Object.values(cacheStats).filter(Boolean).length;
    const freshCacheHits = [cacheStats.profileFresh, cacheStats.rolesFresh, cacheStats.permissionsFresh].filter(Boolean).length;
    performance.cacheHitRate = totalCacheChecks > 0 ? (freshCacheHits / totalCacheChecks) * 100 : 0;

    return performance;
  } catch (error) {
    return {
      cacheHitRate: 0
    };
  }
}

function generateSummary(checks: any) {
  const criticalIssues: string[] = [];
  const nextSteps: string[] = [];
  
  // Check for critical issues
  if (!checks.sessionStatus.sessionValid) {
    criticalIssues.push('Invalid or expired session');
    nextSteps.push('User needs to log in again');
  }
  
  if (!checks.profileStatus.exists) {
    criticalIssues.push('Profile not found');
    nextSteps.push('Run user data recovery');
  }
  
  if (!checks.roleStatus.exists) {
    criticalIssues.push('No roles assigned');
    nextSteps.push('Run user data recovery');
  }
  
  if (checks.profileStatus.exists && checks.profileStatus.data?.primeiro_acesso) {
    nextSteps.push('Complete onboarding process');
  }

  // Check cache issues
  if (!checks.cacheStatus.profileFresh && checks.cacheStatus.profileCached) {
    nextSteps.push('Refresh profile cache');
  }

  if (!checks.cacheStatus.rolesFresh && checks.cacheStatus.rolesCached) {
    nextSteps.push('Refresh roles cache');
  }

  // Check error issues
  if (checks.errorStatus.totalErrors > 10) {
    criticalIssues.push('High error count detected');
    nextSteps.push('Review error logs and fix underlying issues');
  }

  // Check performance issues
  if (checks.performance.cacheHitRate < 50) {
    nextSteps.push('Optimize cache usage for better performance');
  }
  
  // Determine overall status
  let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';
  
  if (criticalIssues.length > 0) {
    overallStatus = 'error';
  } else if (!checks.integrity.isValid || checks.errorStatus.totalErrors > 5) {
    overallStatus = 'warning';
  }
  
  return {
    overallStatus,
    criticalIssues,
    nextSteps
  };
}

/**
 * Log debug report to console in a formatted way
 */
export function logAuthDebugReport(report: AuthDebugReport) {
  console.group(`🔍 Auth Debug Report - ${report.userEmail} (${report.summary.overallStatus.toUpperCase()})`);
  
  console.log('📊 Summary:', {
    status: report.summary.overallStatus,
    criticalIssues: report.summary.criticalIssues,
    nextSteps: report.summary.nextSteps
  });
  
  console.log('🔐 Session:', report.sessionStatus);
  console.log('👤 Profile:', report.profileStatus);
  console.log('🎭 Roles:', report.roleStatus);
  console.log('🏥 Clinics:', report.clinicStatus);
  console.log('🏢 Organizations:', report.organizationStatus);
  console.log('💾 Cache:', report.cacheStatus);
  console.log('🧭 Navigation:', report.navigationStatus);
  console.log('❌ Errors:', report.errorStatus);
  console.log('⚡ Performance:', report.performance);
  console.log('✅ Integrity:', report.integrity);
  
  console.groupEnd();
}

/**
 * Export debug report as downloadable JSON
 */
export function exportAuthDebugReport(report: AuthDebugReport) {
  const dataStr = JSON.stringify(report, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `auth-debug-${report.userId}-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Quick health check function for development
 */
export async function quickAuthHealthCheck(): Promise<boolean> {
  try {
    const report = await generateAuthDebugReport();
    const isHealthy = report.summary.overallStatus === 'healthy';
    
    if (!isHealthy) {
      console.warn('⚠️ Auth health check failed:', report.summary.criticalIssues);
      logAuthDebugReport(report);
    } else {
      console.log('✅ Auth health check passed');
    }
    
    return isHealthy;
  } catch (error) {
    console.error('❌ Auth health check error:', error);
    return false;
  }
}

// Development helper: Add to window object for easy access in dev tools
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).authDebugger = {
    generateReport: generateAuthDebugReport,
    logReport: logAuthDebugReport,
    exportReport: exportAuthDebugReport,
    healthCheck: quickAuthHealthCheck
  };
}