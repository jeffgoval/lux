import { OnboardingState, OnboardingPersistence } from '@/types/onboarding';
import { authLogger } from '@/utils/logger';

const STORAGE_KEY = 'onboarding_state';
const STORAGE_VERSION = '1.0';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface PersistedOnboardingState {
  version: string;
  timestamp: string;
  userId?: string;
  state: OnboardingState;
}

export class OnboardingPersistenceService implements OnboardingPersistence {
  private userId?: string;

  constructor(userId?: string) {
    this.userId = userId;
  }

  async save(state: OnboardingState): Promise<void> {
    try {
      const persistedState: PersistedOnboardingState = {
        version: STORAGE_VERSION,
        timestamp: new Date().toISOString(),
        userId: this.userId,
        state: {
          ...state,
          persistedAt: new Date()
        }
      };

      const serialized = JSON.stringify(persistedState);
      
      // Try localStorage first, fallback to sessionStorage
      try {
        localStorage.setItem(STORAGE_KEY, serialized);
        authLogger.debug('Onboarding state saved to localStorage');
      } catch (localStorageError) {
        sessionStorage.setItem(STORAGE_KEY, serialized);
        authLogger.debug('Onboarding state saved to sessionStorage (localStorage failed)');
      }
    } catch (error) {
      authLogger.error('Failed to save onboarding state:', error);
      throw new Error('Failed to persist onboarding state');
    }
  }

  async load(): Promise<OnboardingState | null> {
    try {
      // Try localStorage first, fallback to sessionStorage
      let serialized: string | null = null;
      
      try {
        serialized = localStorage.getItem(STORAGE_KEY);
      } catch (localStorageError) {
        serialized = sessionStorage.getItem(STORAGE_KEY);
      }

      if (!serialized) {
        authLogger.debug('No persisted onboarding state found');
        return null;
      }

      const persistedState: PersistedOnboardingState = JSON.parse(serialized);

      // Version check
      if (persistedState.version !== STORAGE_VERSION) {
        authLogger.warn('Onboarding state version mismatch, clearing state');
        await this.clear();
        return null;
      }

      // Age check
      const timestamp = new Date(persistedState.timestamp);
      const age = Date.now() - timestamp.getTime();
      
      if (age > MAX_AGE_MS) {
        authLogger.warn('Onboarding state expired, clearing state');
        await this.clear();
        return null;
      }

      // User check (if userId is provided)
      if (this.userId && persistedState.userId !== this.userId) {
        authLogger.warn('Onboarding state belongs to different user, clearing state');
        await this.clear();
        return null;
      }

      // Restore dates
      const state = {
        ...persistedState.state,
        persistedAt: persistedState.state.persistedAt ? new Date(persistedState.state.persistedAt) : undefined
      };

      authLogger.debug('Onboarding state loaded successfully');
      return state;
    } catch (error) {
      authLogger.error('Failed to load onboarding state:', error);
      // Clear corrupted state
      await this.clear();
      return null;
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      authLogger.debug('Onboarding state cleared');
    } catch (error) {
      authLogger.error('Failed to clear onboarding state:', error);
    }
  }

  // Utility methods
  async exists(): Promise<boolean> {
    try {
      const state = await this.load();
      return state !== null;
    } catch {
      return false;
    }
  }

  async getAge(): Promise<number | null> {
    try {
      let serialized: string | null = null;
      
      try {
        serialized = localStorage.getItem(STORAGE_KEY);
      } catch {
        serialized = sessionStorage.getItem(STORAGE_KEY);
      }

      if (!serialized) return null;

      const persistedState: PersistedOnboardingState = JSON.parse(serialized);
      const timestamp = new Date(persistedState.timestamp);
      return Date.now() - timestamp.getTime();
    } catch {
      return null;
    }
  }

  // Static factory method
  static create(userId?: string): OnboardingPersistenceService {
    return new OnboardingPersistenceService(userId);
  }
}

// Default instance
export const onboardingPersistence = OnboardingPersistenceService.create();