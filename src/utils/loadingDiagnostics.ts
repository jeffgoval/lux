/**
 * Diagnostics utility to help identify loading issues
 */

interface LoadingDiagnostic {
  timestamp: string;
  component: string;
  state: string;
  duration: number;
  context: Record<string, any>;
}

interface DiagnosticReport {
  totalDiagnostics: number;
  longLoadings: LoadingDiagnostic[];
  infiniteLoadings: LoadingDiagnostic[];
  averageLoadingTime: number;
  recommendations: string[];
}

class LoadingDiagnostics {
  private diagnostics: LoadingDiagnostic[] = [];
  private readonly MAX_DIAGNOSTICS = 100;
  private readonly LONG_LOADING_THRESHOLD = 5000; // 5 seconds
  private readonly INFINITE_LOADING_THRESHOLD = 15000; // 15 seconds

  recordLoading(component: string, state: string, duration: number, context: Record<string, any> = {}) {
    const diagnostic: LoadingDiagnostic = {
      timestamp: new Date().toISOString(),
      component,
      state,
      duration,
      context: {
        ...context,
        url: window.location.href,
        userAgent: navigator.userAgent.substring(0, 100) // Truncate for storage
      }
    };

    this.diagnostics.unshift(diagnostic);

    // Keep only recent diagnostics
    if (this.diagnostics.length > this.MAX_DIAGNOSTICS) {
      this.diagnostics = this.diagnostics.slice(0, this.MAX_DIAGNOSTICS);
    }

    // Log warnings for problematic loadings
    if (duration > this.INFINITE_LOADING_THRESHOLD) {
      console.error(`🚨 Infinite loading detected in ${component}:`, diagnostic);
    } else if (duration > this.LONG_LOADING_THRESHOLD) {
      console.warn(`⚠️ Long loading detected in ${component}:`, diagnostic);
    }
  }

  generateReport(): DiagnosticReport {
    const longLoadings = this.diagnostics.filter(d => d.duration > this.LONG_LOADING_THRESHOLD);
    const infiniteLoadings = this.diagnostics.filter(d => d.duration > this.INFINITE_LOADING_THRESHOLD);
    
    const totalDuration = this.diagnostics.reduce((sum, d) => sum + d.duration, 0);
    const averageLoadingTime = this.diagnostics.length > 0 ? totalDuration / this.diagnostics.length : 0;

    const recommendations: string[] = [];

    // Generate recommendations based on patterns
    if (infiniteLoadings.length > 0) {
      recommendations.push('Infinite loading detected. Check network connectivity and auth state.');
    }

    if (longLoadings.length > this.diagnostics.length * 0.3) {
      recommendations.push('High percentage of slow loadings. Consider optimizing data fetching.');
    }

    const authLoadings = this.diagnostics.filter(d => d.component.toLowerCase().includes('auth'));
    if (authLoadings.length > 5) {
      recommendations.push('Frequent auth loadings detected. Check auth cache and session management.');
    }

    const profileLoadings = this.diagnostics.filter(d => d.context.isProfileLoading);
    if (profileLoadings.length > 3) {
      recommendations.push('Multiple profile loading issues. Check profile data integrity.');
    }

    return {
      totalDiagnostics: this.diagnostics.length,
      longLoadings: longLoadings.slice(0, 10), // Top 10
      infiniteLoadings,
      averageLoadingTime: Math.round(averageLoadingTime),
      recommendations
    };
  }

  clearDiagnostics() {
    this.diagnostics = [];
  }

  exportDiagnostics(): string {
    const report = this.generateReport();
    return JSON.stringify({
      report,
      diagnostics: this.diagnostics.slice(0, 20), // Last 20 diagnostics
      timestamp: new Date().toISOString(),
      url: window.location.href
    }, null, 2);
  }

  // Check for common loading issues
  checkForCommonIssues(): string[] {
    const issues: string[] = [];
    
    // Check for auth loops
    const recentAuthLoadings = this.diagnostics
      .filter(d => d.component.includes('Auth') && Date.now() - new Date(d.timestamp).getTime() < 60000)
      .length;
    
    if (recentAuthLoadings > 3) {
      issues.push('Possible auth loading loop detected');
    }

    // Check for profile loading issues
    const profileIssues = this.diagnostics.filter(d => 
      d.context.isProfileLoading && d.duration > 8000
    );
    
    if (profileIssues.length > 0) {
      issues.push('Profile loading taking too long');
    }

    // Check for role loading issues
    const roleIssues = this.diagnostics.filter(d => 
      d.context.isRolesLoading && d.duration > 6000
    );
    
    if (roleIssues.length > 0) {
      issues.push('Role loading taking too long');
    }

    return issues;
  }
}

// Singleton instance
export const loadingDiagnostics = new LoadingDiagnostics();

// Utility functions
export const recordLoadingDiagnostic = (
  component: string, 
  state: string, 
  duration: number, 
  context?: Record<string, any>
) => {
  loadingDiagnostics.recordLoading(component, state, duration, context);
};

export const getLoadingReport = () => loadingDiagnostics.generateReport();

export const exportLoadingDiagnostics = () => loadingDiagnostics.exportDiagnostics();

export const checkLoadingIssues = () => loadingDiagnostics.checkForCommonIssues();

// React hook for automatic diagnostics
export function useLoadingDiagnostics(component: string) {
  const recordLoading = (state: string, duration: number, context?: Record<string, any>) => {
    recordLoadingDiagnostic(component, state, duration, context);
  };

  const checkIssues = () => checkLoadingIssues();

  return {
    recordLoading,
    checkIssues,
    getReport: getLoadingReport,
    exportDiagnostics: exportLoadingDiagnostics
  };
}

// Development helper
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).loadingDiagnostics = {
    diagnostics: loadingDiagnostics,
    getReport: getLoadingReport,
    export: exportLoadingDiagnostics,
    checkIssues: checkLoadingIssues,
    clear: () => loadingDiagnostics.clearDiagnostics()
  };

  // Auto-check for issues every 30 seconds in development
  setInterval(() => {
    const issues = checkLoadingIssues();
    if (issues.length > 0) {
      console.warn('🔍 Loading issues detected:', issues);
    }
  }, 30000);
}