import { supabase } from '@/integrations/supabase/client';
import { generateAuthDebugReport } from './authDebugger';
import { getAuthCacheStats } from './authCache';
import { errorRecoveryManager } from './errorRecovery';

export interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: any;
  timestamp: string;
}

export interface SystemHealthReport {
  overallStatus: 'healthy' | 'warning' | 'error';
  timestamp: string;
  checks: HealthCheckResult[];
  summary: {
    healthy: number;
    warning: number;
    error: number;
    total: number;
  };
}

class HealthCheckManager {
  private checks: Map<string, () => Promise<HealthCheckResult>> = new Map();

  constructor() {
    this.registerDefaultChecks();
  }

  private registerDefaultChecks() {
    // Supabase connection check
    this.registerCheck('supabase-connection', async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        
        if (error) {
          return {
            component: 'supabase-connection',
            status: 'error',
            message: `Database connection failed: ${error.message}`,
            details: { error: error.code },
            timestamp: new Date().toISOString()
          };
        }

        return {
          component: 'supabase-connection',
          status: 'healthy',
          message: 'Database connection is working',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        return {
          component: 'supabase-connection',
          status: 'error',
          message: `Connection test failed: ${(error as Error).message}`,
          timestamp: new Date().toISOString()
        };
      }
    });

    // Authentication system check
    this.registerCheck('auth-system', async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          return {
            component: 'auth-system',
            status: 'warning',
            message: `Auth session check failed: ${error.message}`,
            details: { error: error.message },
            timestamp: new Date().toISOString()
          };
        }

        const hasSession = !!session;
        return {
          component: 'auth-system',
          status: 'healthy',
          message: hasSession ? 'User is authenticated' : 'Auth system is working (no active session)',
          details: { hasSession, userId: session?.user?.id },
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        return {
          component: 'auth-system',
          status: 'error',
          message: `Auth system check failed: ${(error as Error).message}`,
          timestamp: new Date().toISOString()
        };
      }
    });

    // Cache system check
    this.registerCheck('cache-system', async () => {
      try {
        const cacheStats = getAuthCacheStats();
        const totalCached = Object.values(cacheStats).filter(Boolean).length;
        const freshItems = [cacheStats.profileFresh, cacheStats.rolesFresh, cacheStats.permissionsFresh].filter(Boolean).length;
        const hitRate = totalCached > 0 ? (freshItems / totalCached) * 100 : 0;

        let status: 'healthy' | 'warning' | 'error' = 'healthy';
        let message = 'Cache system is working optimally';

        if (hitRate < 30) {
          status = 'warning';
          message = 'Cache hit rate is low, consider optimizing cache usage';
        } else if (hitRate < 10) {
          status = 'error';
          message = 'Cache system is not working effectively';
        }

        return {
          component: 'cache-system',
          status,
          message,
          details: { cacheStats, hitRate: Math.round(hitRate) },
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        return {
          component: 'cache-system',
          status: 'error',
          message: `Cache system check failed: ${(error as Error).message}`,
          timestamp: new Date().toISOString()
        };
      }
    });

    // Error recovery system check
    this.registerCheck('error-recovery', async () => {
      try {
        const errorReport = errorRecoveryManager.generateErrorReport();
        
        let status: 'healthy' | 'warning' | 'error' = 'healthy';
        let message = 'Error recovery system is working';

        if (errorReport.totalErrors > 20) {
          status = 'error';
          message = 'High error count detected, system may be unstable';
        } else if (errorReport.totalErrors > 10) {
          status = 'warning';
          message = 'Moderate error count detected';
        }

        return {
          component: 'error-recovery',
          status,
          message,
          details: {
            totalErrors: errorReport.totalErrors,
            errorsByCategory: errorReport.errorsByCategory,
            recentErrorsCount: errorReport.recentErrors.length
          },
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        return {
          component: 'error-recovery',
          status: 'error',
          message: `Error recovery check failed: ${(error as Error).message}`,
          timestamp: new Date().toISOString()
        };
      }
    });

    // Memory usage check
    this.registerCheck('memory-usage', async () => {
      try {
        if ('memory' in performance && (performance as any).memory) {
          const memory = (performance as any).memory;
          const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
          const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
          const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
          const usagePercent = (usedMB / limitMB) * 100;

          let status: 'healthy' | 'warning' | 'error' = 'healthy';
          let message = `Memory usage is normal (${usedMB}MB used)`;

          if (usagePercent > 80) {
            status = 'error';
            message = `High memory usage detected (${usedMB}MB/${limitMB}MB)`;
          } else if (usagePercent > 60) {
            status = 'warning';
            message = `Moderate memory usage (${usedMB}MB/${limitMB}MB)`;
          }

          return {
            component: 'memory-usage',
            status,
            message,
            details: { usedMB, totalMB, limitMB, usagePercent: Math.round(usagePercent) },
            timestamp: new Date().toISOString()
          };
        } else {
          return {
            component: 'memory-usage',
            status: 'warning',
            message: 'Memory usage monitoring not available in this browser',
            timestamp: new Date().toISOString()
          };
        }
      } catch (error) {
        return {
          component: 'memory-usage',
          status: 'error',
          message: `Memory check failed: ${(error as Error).message}`,
          timestamp: new Date().toISOString()
        };
      }
    });

    // Local storage check
    this.registerCheck('local-storage', async () => {
      try {
        const testKey = 'health-check-test';
        const testValue = 'test-value';
        
        localStorage.setItem(testKey, testValue);
        const retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);

        if (retrieved !== testValue) {
          return {
            component: 'local-storage',
            status: 'error',
            message: 'Local storage is not working correctly',
            timestamp: new Date().toISOString()
          };
        }

        // Check storage usage
        let usedSpace = 0;
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            usedSpace += localStorage[key].length + key.length;
          }
        }

        const usedKB = Math.round(usedSpace / 1024);
        const maxKB = 5120; // Typical 5MB limit
        const usagePercent = (usedKB / maxKB) * 100;

        let status: 'healthy' | 'warning' | 'error' = 'healthy';
        let message = `Local storage is working (${usedKB}KB used)`;

        if (usagePercent > 80) {
          status = 'warning';
          message = `Local storage usage is high (${usedKB}KB)`;
        }

        return {
          component: 'local-storage',
          status,
          message,
          details: { usedKB, usagePercent: Math.round(usagePercent) },
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        return {
          component: 'local-storage',
          status: 'error',
          message: `Local storage check failed: ${(error as Error).message}`,
          timestamp: new Date().toISOString()
        };
      }
    });
  }

  registerCheck(name: string, checkFunction: () => Promise<HealthCheckResult>) {
    this.checks.set(name, checkFunction);
  }

  async runCheck(name: string): Promise<HealthCheckResult | null> {
    const checkFunction = this.checks.get(name);
    if (!checkFunction) {
      return null;
    }

    try {
      return await checkFunction();
    } catch (error) {
      return {
        component: name,
        status: 'error',
        message: `Health check failed: ${(error as Error).message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async runAllChecks(): Promise<SystemHealthReport> {
    const timestamp = new Date().toISOString();
    const checks: HealthCheckResult[] = [];

    // Run all checks in parallel
    const checkPromises = Array.from(this.checks.keys()).map(name => this.runCheck(name));
    const results = await Promise.all(checkPromises);

    // Filter out null results and add to checks array
    results.forEach(result => {
      if (result) {
        checks.push(result);
      }
    });

    // Calculate summary
    const summary = {
      healthy: checks.filter(c => c.status === 'healthy').length,
      warning: checks.filter(c => c.status === 'warning').length,
      error: checks.filter(c => c.status === 'error').length,
      total: checks.length
    };

    // Determine overall status
    let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    if (summary.error > 0) {
      overallStatus = 'error';
    } else if (summary.warning > 0) {
      overallStatus = 'warning';
    }

    return {
      overallStatus,
      timestamp,
      checks,
      summary
    };
  }

  async runQuickHealthCheck(): Promise<boolean> {
    try {
      const report = await this.runAllChecks();
      return report.overallStatus !== 'error';
    } catch (error) {
      console.error('Quick health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const healthCheckManager = new HealthCheckManager();

// Utility functions
export const runSystemHealthCheck = () => healthCheckManager.runAllChecks();
export const runQuickHealthCheck = () => healthCheckManager.runQuickHealthCheck();
export const runSpecificHealthCheck = (name: string) => healthCheckManager.runCheck(name);

// Auto health check on app start (development only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Run health check after a short delay to allow app to initialize
  setTimeout(async () => {
    try {
      const report = await runSystemHealthCheck();
      console.log('🏥 System Health Check:', report);
      
      if (report.overallStatus === 'error') {
        console.warn('⚠️ System health issues detected:', report.checks.filter(c => c.status === 'error'));
      }
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }, 3000);

  // Add to window for manual access
  (window as any).healthCheck = {
    runAll: runSystemHealthCheck,
    runQuick: runQuickHealthCheck,
    runSpecific: runSpecificHealthCheck,
    manager: healthCheckManager
  };
}