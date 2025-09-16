/**
 * Centralized loading state manager to prevent infinite loading states
 */

interface LoadingState {
    [key: string]: {
        isLoading: boolean;
        startTime: number;
        timeout?: NodeJS.Timeout;
    };
}

class LoadingManager {
    private states: LoadingState = {};
    private readonly MAX_LOADING_TIME = 10000; // 10 seconds max
    private readonly CLEANUP_INTERVAL = 30000; // Clean up every 30 seconds

    constructor() {
        // Periodic cleanup of stale loading states
        setInterval(() => {
            this.cleanupStaleStates();
        }, this.CLEANUP_INTERVAL);
    }

    startLoading(key: string, maxTime?: number): void {
        const timeout = maxTime || this.MAX_LOADING_TIME;

        // Clear existing timeout if any
        if (this.states[key]?.timeout) {
            clearTimeout(this.states[key].timeout);
        }

        this.states[key] = {
            isLoading: true,
            startTime: Date.now(),
            timeout: setTimeout(() => {

                this.stopLoading(key);
            }, timeout)
        };

    }

    stopLoading(key: string): void {
        if (this.states[key]) {
            if (this.states[key].timeout) {
                clearTimeout(this.states[key].timeout);
            }

            const duration = Date.now() - this.states[key].startTime;

            delete this.states[key];
        }
    }

    isLoading(key: string): boolean {
        return this.states[key]?.isLoading || false;
    }

    getLoadingDuration(key: string): number {
        if (!this.states[key]) return 0;
        return Date.now() - this.states[key].startTime;
    }

    forceStopAll(): void {

        Object.keys(this.states).forEach(key => {
            this.stopLoading(key);
        });
    }

    private cleanupStaleStates(): void {
        const now = Date.now();
        const staleKeys = Object.keys(this.states).filter(key => {
            const state = this.states[key];
            return now - state.startTime > this.MAX_LOADING_TIME * 2; // Double the max time
        });

        staleKeys.forEach(key => {

            this.stopLoading(key);
        });
    }

    getActiveLoadings(): string[] {
        return Object.keys(this.states);
    }

    getLoadingStats(): { [key: string]: { duration: number; isLoading: boolean } } {
        const stats: { [key: string]: { duration: number; isLoading: boolean } } = {};

        Object.keys(this.states).forEach(key => {
            stats[key] = {
                duration: this.getLoadingDuration(key),
                isLoading: this.isLoading(key)
            };
        });

        return stats;
    }
}

// Singleton instance
export const loadingManager = new LoadingManager();

// React hook for loading management
export function useLoadingManager() {
    const startLoading = (key: string, maxTime?: number) => {
        loadingManager.startLoading(key, maxTime);
    };

    const stopLoading = (key: string) => {
        loadingManager.stopLoading(key);
    };

    const isLoading = (key: string) => {
        return loadingManager.isLoading(key);
    };

    return {
        startLoading,
        stopLoading,
        isLoading,
        forceStopAll: () => loadingManager.forceStopAll(),
        getStats: () => loadingManager.getLoadingStats()
    };
}

// Development helper
if (typeof window !== 'undefined' && import.meta.env.DEV) {
    (window as any).loadingManager = {
        manager: loadingManager,
        getStats: () => loadingManager.getLoadingStats(),
        forceStopAll: () => loadingManager.forceStopAll(),
        getActive: () => loadingManager.getActiveLoadings()
    };
}
