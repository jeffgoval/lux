interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'navigation' | 'auth' | 'cache' | 'render' | 'network';
  metadata?: Record<string, any>;
}

interface PerformanceBenchmark {
  name: string;
  target: number; // Target time in milliseconds
  warning: number; // Warning threshold
  critical: number; // Critical threshold
}

interface PerformanceReport {
  timestamp: string;
  metrics: PerformanceMetric[];
  benchmarks: PerformanceBenchmark[];
  summary: {
    totalMetrics: number;
    averageNavigationTime: number;
    cacheHitRate: number;
    errorRate: number;
    slowOperations: PerformanceMetric[];
    recommendations: string[];
  };
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;
  private benchmarks: Map<string, PerformanceBenchmark> = new Map();
  private observers: Map<string, PerformanceObserver> = new Map();

  constructor() {
    this.initializeBenchmarks();
    this.setupPerformanceObservers();
  }

  private initializeBenchmarks() {
    const defaultBenchmarks: PerformanceBenchmark[] = [
      { name: 'navigation', target: 1000, warning: 2000, critical: 5000 },
      { name: 'auth-check', target: 500, warning: 1000, critical: 3000 },
      { name: 'profile-fetch', target: 800, warning: 1500, critical: 4000 },
      { name: 'roles-fetch', target: 600, warning: 1200, critical: 3000 },
      { name: 'cache-read', target: 50, warning: 100, critical: 500 },
      { name: 'cache-write', target: 100, warning: 200, critical: 1000 },
      { name: 'component-render', target: 16, warning: 33, critical: 100 },
      { name: 'route-change', target: 200, warning: 500, critical: 2000 }
    ];

    defaultBenchmarks.forEach(benchmark => {
      this.benchmarks.set(benchmark.name, benchmark);
    });
  }

  private setupPerformanceObservers() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      // Navigation timing observer
      const navObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric('page-load', navEntry.loadEventEnd - navEntry.fetchStart, 'navigation', {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              domInteractive: navEntry.domInteractive - navEntry.fetchStart,
              type: navEntry.type
            });
          }
        });
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', navObserver);

      // Resource timing observer
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.recordMetric(`resource-${this.getResourceType(resourceEntry.name)}`, 
              resourceEntry.responseEnd - resourceEntry.fetchStart, 'network', {
              name: resourceEntry.name,
              size: resourceEntry.transferSize,
              cached: resourceEntry.transferSize === 0
            });
          }
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', resourceObserver);

      // Measure observer for custom metrics
      const measureObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'measure') {
            this.recordMetric(entry.name, entry.duration, 'render', {
              startTime: entry.startTime
            });
          }
        });
      });
      measureObserver.observe({ entryTypes: ['measure'] });
      this.observers.set('measure', measureObserver);

    } catch (error) {

    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'style';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) return 'image';
    if (url.includes('/api/') || url.includes('supabase')) return 'api';
    return 'other';
  }

  recordMetric(
    name: string, 
    value: number, 
    category: PerformanceMetric['category'], 
    metadata?: Record<string, any>
  ) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      category,
      metadata
    };

    this.metrics.unshift(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(0, this.maxMetrics);
    }

    // Log slow operations in development
    if (import.meta.env.DEV) {
      const benchmark = this.benchmarks.get(name);
      if (benchmark && value > benchmark.warning) {

      }
    }
  }

  // Timing utilities
  startTiming(name: string): () => void {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, 'render');
    };
  }

  timeAsync<T>(name: string, fn: () => Promise<T>, category: PerformanceMetric['category'] = 'render'): Promise<T> {
    const startTime = performance.now();
    return fn().finally(() => {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, category);
    });
  }

  timeSync<T>(name: string, fn: () => T, category: PerformanceMetric['category'] = 'render'): T {
    const startTime = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, category);
    }
  }

  // Navigation timing
  recordNavigationStart(route: string) {
    this.recordMetric('navigation-start', 0, 'navigation', { route, type: 'start' });
  }

  recordNavigationEnd(route: string, startTime: number) {
    const duration = performance.now() - startTime;
    this.recordMetric('navigation', duration, 'navigation', { route, type: 'complete' });
  }

  // Auth timing
  recordAuthOperation(operation: string, duration: number, success: boolean) {
    this.recordMetric(`auth-${operation}`, duration, 'auth', { success });
  }

  // Cache timing
  recordCacheOperation(operation: 'read' | 'write' | 'hit' | 'miss', key: string, duration: number) {
    this.recordMetric(`cache-${operation}`, duration, 'cache', { key });
  }

  // Analysis methods
  getMetrics(category?: PerformanceMetric['category'], limit?: number): PerformanceMetric[] {
    let filtered = category ? this.metrics.filter(m => m.category === category) : this.metrics;
    return limit ? filtered.slice(0, limit) : filtered;
  }

  getAverageTime(metricName: string, timeWindow?: number): number {
    const cutoff = timeWindow ? Date.now() - timeWindow : 0;
    const relevantMetrics = this.metrics.filter(m => 
      m.name === metricName && m.timestamp > cutoff
    );

    if (relevantMetrics.length === 0) return 0;

    const total = relevantMetrics.reduce((sum, m) => sum + m.value, 0);
    return total / relevantMetrics.length;
  }

  getSlowOperations(threshold?: number): PerformanceMetric[] {
    return this.metrics.filter(metric => {
      const benchmark = this.benchmarks.get(metric.name);
      const limit = threshold || benchmark?.warning || 1000;
      return metric.value > limit;
    }).slice(0, 20); // Top 20 slow operations
  }

  getCacheHitRate(): number {
    const cacheMetrics = this.getMetrics('cache');
    const hits = cacheMetrics.filter(m => m.name === 'cache-hit').length;
    const total = cacheMetrics.filter(m => m.name.includes('cache-')).length;
    return total > 0 ? (hits / total) * 100 : 0;
  }

  generateReport(): PerformanceReport {
    const navigationMetrics = this.getMetrics('navigation');
    const averageNavigationTime = this.getAverageTime('navigation');
    const cacheHitRate = this.getCacheHitRate();
    const slowOperations = this.getSlowOperations();

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (averageNavigationTime > 2000) {
      recommendations.push('Navigation is slow. Consider optimizing route loading and data fetching.');
    }
    
    if (cacheHitRate < 50) {
      recommendations.push('Cache hit rate is low. Review caching strategy and TTL settings.');
    }
    
    if (slowOperations.length > 10) {
      recommendations.push('Multiple slow operations detected. Review performance bottlenecks.');
    }

    const authMetrics = this.getMetrics('auth');
    const errorRate = authMetrics.filter(m => m.metadata?.success === false).length / Math.max(authMetrics.length, 1);
    
    if (errorRate > 0.1) {
      recommendations.push('High authentication error rate detected. Check auth system stability.');
    }

    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics.slice(0, 100), // Recent metrics
      benchmarks: Array.from(this.benchmarks.values()),
      summary: {
        totalMetrics: this.metrics.length,
        averageNavigationTime: Math.round(averageNavigationTime),
        cacheHitRate: Math.round(cacheHitRate),
        errorRate: Math.round(errorRate * 100),
        slowOperations,
        recommendations
      }
    };
  }

  // Cleanup
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.metrics = [];
  }

  // Memory usage monitoring
  getMemoryUsage(): { used: number; total: number; limit: number } | null {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) // MB
      };
    }
    return null;
  }

  // Performance marks for custom timing
  mark(name: string) {
    if ('mark' in performance) {
      performance.mark(name);
    }
  }

  measure(name: string, startMark: string, endMark?: string) {
    if ('measure' in performance) {
      try {
        performance.measure(name, startMark, endMark);
      } catch (error) {

      }
    }
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Utility functions
export const recordMetric = (name: string, value: number, category: PerformanceMetric['category'], metadata?: Record<string, any>) =>
  performanceMonitor.recordMetric(name, value, category, metadata);

export const timeAsync = <T>(name: string, fn: () => Promise<T>, category?: PerformanceMetric['category']) =>
  performanceMonitor.timeAsync(name, fn, category);

export const timeSync = <T>(name: string, fn: () => T, category?: PerformanceMetric['category']) =>
  performanceMonitor.timeSync(name, fn, category);

export const startTiming = (name: string) => performanceMonitor.startTiming(name);

export const getPerformanceReport = () => performanceMonitor.generateReport();

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const recordNavigation = (route: string, duration: number) => {
    performanceMonitor.recordNavigationEnd(route, performance.now() - duration);
  };

  const recordRender = (componentName: string, duration: number) => {
    performanceMonitor.recordMetric(`render-${componentName}`, duration, 'render');
  };

  const startTimer = (name: string) => performanceMonitor.startTiming(name);

  return {
    recordNavigation,
    recordRender,
    startTimer,
    getReport: () => performanceMonitor.generateReport(),
    getMemoryUsage: () => performanceMonitor.getMemoryUsage()
  };
}

// Development helper
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).performanceMonitor = {
    monitor: performanceMonitor,
    getReport: getPerformanceReport,
    recordMetric,
    timeAsync,
    timeSync
  };

  // Log performance report every 30 seconds in development
  setInterval(() => {
    const report = getPerformanceReport();
    if (report.summary.totalMetrics > 10) {

      if (report.summary.recommendations.length > 0) {

      }
    }
  }, 30000);
}
