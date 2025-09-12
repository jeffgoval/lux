import { UserProfile, UserRoleContext } from '@/contexts/AuthContext';
import { performanceMonitor } from './performanceMonitor';

export interface AuthCacheEntry<T> {
  data: T;
  timestamp: number;
  isStale: boolean;
  error?: string;
}

export interface AuthCache {
  profile: AuthCacheEntry<UserProfile | null>;
  roles: AuthCacheEntry<UserRoleContext[]>;
  permissions: AuthCacheEntry<string[]>;
  ttl: number; // Time to live in milliseconds
}

export interface AuthState {
  isReady: boolean;
  hasValidSession: boolean;
  hasProfile: boolean;
  hasRoles: boolean;
  needsOnboarding: boolean;
}

// Default TTL: 5 minutes for profile, 10 minutes for roles
const DEFAULT_PROFILE_TTL = 5 * 60 * 1000;
const DEFAULT_ROLES_TTL = 10 * 60 * 1000;
const DEFAULT_PERMISSIONS_TTL = 15 * 60 * 1000;

export class AuthCacheManager {
  private cache: Partial<AuthCache> = {};
  private readonly profileTTL: number;
  private readonly rolesTTL: number;
  private readonly permissionsTTL: number;

  constructor(
    profileTTL = DEFAULT_PROFILE_TTL,
    rolesTTL = DEFAULT_ROLES_TTL,
    permissionsTTL = DEFAULT_PERMISSIONS_TTL
  ) {
    this.profileTTL = profileTTL;
    this.rolesTTL = rolesTTL;
    this.permissionsTTL = permissionsTTL;
  }

  // Profile cache methods
  setProfile(profile: UserProfile | null, error?: string): void {
    const startTime = performance.now();
    this.cache.profile = {
      data: profile,
      timestamp: Date.now(),
      isStale: false,
      error
    };
    performanceMonitor.recordCacheOperation('write', 'profile', performance.now() - startTime);
  }

  getProfile(): AuthCacheEntry<UserProfile | null> | null {
    const startTime = performance.now();
    const entry = this.cache.profile;
    
    if (!entry) {
      performanceMonitor.recordCacheOperation('miss', 'profile', performance.now() - startTime);
      return null;
    }

    const isStale = Date.now() - entry.timestamp > this.profileTTL;
    const result = {
      ...entry,
      isStale
    };

    performanceMonitor.recordCacheOperation(isStale ? 'miss' : 'hit', 'profile', performance.now() - startTime);
    return result;
  }

  // Roles cache methods
  setRoles(roles: UserRoleContext[], error?: string): void {
    const startTime = performance.now();
    this.cache.roles = {
      data: roles,
      timestamp: Date.now(),
      isStale: false,
      error
    };
    performanceMonitor.recordCacheOperation('write', 'roles', performance.now() - startTime);
  }

  getRoles(): AuthCacheEntry<UserRoleContext[]> | null {
    const startTime = performance.now();
    const entry = this.cache.roles;
    
    if (!entry) {
      performanceMonitor.recordCacheOperation('miss', 'roles', performance.now() - startTime);
      return null;
    }

    const isStale = Date.now() - entry.timestamp > this.rolesTTL;
    const result = {
      ...entry,
      isStale
    };

    performanceMonitor.recordCacheOperation(isStale ? 'miss' : 'hit', 'roles', performance.now() - startTime);
    return result;
  }

  // Permissions cache methods
  setPermissions(permissions: string[], error?: string): void {
    this.cache.permissions = {
      data: permissions,
      timestamp: Date.now(),
      isStale: false,
      error
    };
  }

  getPermissions(): AuthCacheEntry<string[]> | null {
    const entry = this.cache.permissions;
    if (!entry) return null;

    const isStale = Date.now() - entry.timestamp > this.permissionsTTL;
    return {
      ...entry,
      isStale
    };
  }

  // Cache management methods
  invalidateProfile(): void {
    if (this.cache.profile) {
      this.cache.profile.isStale = true;
    }
  }

  invalidateRoles(): void {
    if (this.cache.roles) {
      this.cache.roles.isStale = true;
    }
  }

  invalidatePermissions(): void {
    if (this.cache.permissions) {
      this.cache.permissions.isStale = true;
    }
  }

  invalidateAll(): void {
    this.invalidateProfile();
    this.invalidateRoles();
    this.invalidatePermissions();
  }

  clearAll(): void {
    this.cache = {};
  }

  // Utility methods
  isProfileFresh(): boolean {
    const entry = this.getProfile();
    return entry ? !entry.isStale : false;
  }

  isRolesFresh(): boolean {
    const entry = this.getRoles();
    return entry ? !entry.isStale : false;
  }

  isPermissionsFresh(): boolean {
    const entry = this.getPermissions();
    return entry ? !entry.isStale : false;
  }

  // Get cache statistics
  getCacheStats(): {
    profileCached: boolean;
    profileFresh: boolean;
    rolesCached: boolean;
    rolesFresh: boolean;
    permissionsCached: boolean;
    permissionsFresh: boolean;
  } {
    return {
      profileCached: !!this.cache.profile,
      profileFresh: this.isProfileFresh(),
      rolesCached: !!this.cache.roles,
      rolesFresh: this.isRolesFresh(),
      permissionsCached: !!this.cache.permissions,
      permissionsFresh: this.isPermissionsFresh()
    };
  }

  // Generate auth state from cache
  getAuthState(isAuthenticated: boolean): AuthState {
    const profileEntry = this.getProfile();
    const rolesEntry = this.getRoles();

    const hasProfile = !!(profileEntry?.data);
    const hasRoles = !!(rolesEntry?.data && rolesEntry.data.length > 0);
    const needsOnboarding = hasProfile ? profileEntry!.data!.primeiro_acesso : true;

    return {
      isReady: isAuthenticated && hasProfile,
      hasValidSession: isAuthenticated,
      hasProfile,
      hasRoles,
      needsOnboarding
    };
  }
}

// Singleton instance
export const authCacheManager = new AuthCacheManager();

// Helper functions for easier usage
export const getCachedProfile = () => authCacheManager.getProfile();
export const getCachedRoles = () => authCacheManager.getRoles();
export const getCachedPermissions = () => authCacheManager.getPermissions();
export const invalidateAuthCache = () => authCacheManager.invalidateAll();
export const clearAuthCache = () => authCacheManager.clearAll();
export const getAuthCacheStats = () => authCacheManager.getCacheStats();