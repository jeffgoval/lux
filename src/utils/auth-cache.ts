/**
 * 🚀 SISTEMA DE CACHE INTELIGENTE PARA AUTENTICAÇÃO
 * 
 * Cache otimizado com TTL reduzido, invalidação automática,
 * deduplicação de requests e métricas de performance
 */

import React from 'react';
import { UserProfile, UserRoleData } from '@/types/auth.types';
import { authLogger } from '@/utils/logger';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  invalidations: number;
  totalRequests: number;
  hitRate: number;
  lastReset: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

type CacheKey = 'profile' | 'roles' | 'clinics' | 'permissions';

// ============================================================================
// CONFIGURAÇÃO DO CACHE
// ============================================================================

const CACHE_CONFIG = {
  // TTL reduzido de 10 para 5 minutos conforme requisito
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutos em ms
  
  // TTL específico por tipo de dados
  PROFILE_TTL: 5 * 60 * 1000,   // 5 minutos
  ROLES_TTL: 3 * 60 * 1000,     // 3 minutos (mais dinâmico)
  CLINICS_TTL: 10 * 60 * 1000,  // 10 minutos (menos dinâmico)
  PERMISSIONS_TTL: 5 * 60 * 1000, // 5 minutos
  
  // Timeout para deduplicação
  DEDUP_TIMEOUT: 30 * 1000, // 30 segundos
  
  // Intervalo para limpeza automática
  CLEANUP_INTERVAL: 60 * 1000, // 1 minuto
} as const;

// ============================================================================
// CLASSE DO CACHE INTELIGENTE
// ============================================================================

class AuthCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    invalidations: 0,
    totalRequests: 0,
    hitRate: 0,
    lastReset: Date.now()
  };
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
    this.logCacheMetrics();
  }

  // ==========================================================================
  // MÉTODOS PRINCIPAIS DO CACHE
  // ==========================================================================

  /**
   * Busca dados do cache ou executa função se não encontrado
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = CACHE_CONFIG.DEFAULT_TTL
  ): Promise<T> {
    this.metrics.totalRequests++;

    // Verificar se há request pendente (deduplicação)
    const pendingRequest = this.pendingRequests.get(key);
    if (pendingRequest) {
      // Verificar se o request não expirou
      if (Date.now() - pendingRequest.timestamp < CACHE_CONFIG.DEDUP_TIMEOUT) {
        authLogger.debug(`Cache: Deduplicating request for key: ${key}`);
        return pendingRequest.promise;
      } else {
        // Request expirado, remover
        this.pendingRequests.delete(key);
      }
    }

    // Verificar cache
    const cached = this.cache.get(key);
    if (cached && this.isValid(cached)) {
      this.metrics.hits++;
      this.updateHitRate();
      authLogger.debug(`Cache: Hit for key: ${key}`);
      return cached.data;
    }

    // Cache miss - buscar dados
    this.metrics.misses++;
    this.updateHitRate();
    authLogger.debug(`Cache: Miss for key: ${key}`);

    // Criar promise e adicionar aos requests pendentes
    const promise = fetcher();
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    });

    try {
      const data = await promise;
      
      // Armazenar no cache
      this.set(key, data, ttl);
      
      // Remover dos requests pendentes
      this.pendingRequests.delete(key);
      
      return data;
    } catch (error) {
      // Remover dos requests pendentes em caso de erro
      this.pendingRequests.delete(key);
      throw error;
    }
  }

  /**
   * Armazena dados no cache
   */
  set<T>(key: string, data: T, ttl: number = CACHE_CONFIG.DEFAULT_TTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key
    };

    this.cache.set(key, entry);
    authLogger.debug(`Cache: Set key: ${key}, TTL: ${ttl}ms`);
  }

  /**
   * Invalida entrada específica do cache
   */
  invalidate(key: string): void {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.metrics.invalidations++;
      authLogger.debug(`Cache: Invalidated key: ${key}`);
    }
  }

  /**
   * Invalida múltiplas entradas por padrão
   */
  invalidatePattern(pattern: RegExp): void {
    let invalidatedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }
    
    this.metrics.invalidations += invalidatedCount;
    authLogger.debug(`Cache: Invalidated ${invalidatedCount} keys matching pattern: ${pattern}`);
  }

  /**
   * Invalida todo o cache de um usuário
   */
  invalidateUser(userId: string): void {
    this.invalidatePattern(new RegExp(`^${userId}:`));
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.pendingRequests.clear();
    this.metrics.invalidations += size;
    authLogger.debug(`Cache: Cleared all entries (${size} items)`);
  }

  // ==========================================================================
  // MÉTODOS ESPECÍFICOS PARA AUTH
  // ==========================================================================

  /**
   * Cache para profile do usuário
   */
  async getProfile(userId: string, fetcher: () => Promise<UserProfile>): Promise<UserProfile> {
    return this.get(`${userId}:profile`, fetcher, CACHE_CONFIG.PROFILE_TTL);
  }

  /**
   * Cache para roles do usuário
   */
  async getRoles(userId: string, fetcher: () => Promise<UserRoleData[]>): Promise<UserRoleData[]> {
    return this.get(`${userId}:roles`, fetcher, CACHE_CONFIG.ROLES_TTL);
  }

  /**
   * Cache para clínicas do usuário
   */
  async getClinics(userId: string, fetcher: () => Promise<any[]>): Promise<any[]> {
    return this.get(`${userId}:clinics`, fetcher, CACHE_CONFIG.CLINICS_TTL);
  }

  /**
   * Cache para permissões do usuário
   */
  async getPermissions(userId: string, roleId: string, fetcher: () => Promise<string[]>): Promise<string[]> {
    return this.get(`${userId}:${roleId}:permissions`, fetcher, CACHE_CONFIG.PERMISSIONS_TTL);
  }

  // ==========================================================================
  // INVALIDAÇÃO INTELIGENTE
  // ==========================================================================

  /**
   * Invalida cache quando dados de auth mudam
   */
  onAuthStateChange(userId: string, event: 'login' | 'logout' | 'profile_update' | 'role_change'): void {
    switch (event) {
      case 'logout':
        this.invalidateUser(userId);
        break;
        
      case 'profile_update':
        this.invalidate(`${userId}:profile`);
        break;
        
      case 'role_change':
        this.invalidate(`${userId}:roles`);
        this.invalidatePattern(new RegExp(`^${userId}:.*:permissions`));
        break;
        
      case 'login':
        // Não invalidar no login para aproveitar cache existente
        break;
    }
    
    authLogger.debug(`Cache: Handled auth state change: ${event} for user: ${userId}`);
  }

  // ==========================================================================
  // MÉTRICAS E MONITORAMENTO
  // ==========================================================================

  /**
   * Retorna métricas atuais do cache
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reseta métricas
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      totalRequests: 0,
      hitRate: 0,
      lastReset: Date.now()
    };
    authLogger.debug('Cache: Metrics reset');
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats() {
    return {
      size: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      metrics: this.getMetrics(),
      oldestEntry: this.getOldestEntry(),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  // ==========================================================================
  // MÉTODOS PRIVADOS
  // ==========================================================================

  private isValid(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private updateHitRate(): void {
    if (this.metrics.totalRequests > 0) {
      this.metrics.hitRate = (this.metrics.hits / this.metrics.totalRequests) * 100;
    }
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, CACHE_CONFIG.CLEANUP_INTERVAL);
  }

  private cleanup(): void {
    let removedCount = 0;
    const now = Date.now();

    // Limpar entradas expiradas do cache
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    // Limpar requests pendentes expirados
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > CACHE_CONFIG.DEDUP_TIMEOUT) {
        this.pendingRequests.delete(key);
      }
    }

    if (removedCount > 0) {
      authLogger.debug(`Cache: Cleanup removed ${removedCount} expired entries`);
    }
  }

  private getOldestEntry(): { key: string; age: number } | null {
    let oldest: { key: string; age: number } | null = null;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (!oldest || age > oldest.age) {
        oldest = { key, age };
      }
    }

    return oldest;
  }

  private estimateMemoryUsage(): number {
    // Estimativa simples baseada no número de entradas
    // Em produção, poderia usar uma biblioteca mais precisa
    return this.cache.size * 1024; // ~1KB por entrada (estimativa)
  }

  private logCacheMetrics(): void {
    // Log métricas a cada 5 minutos
    setInterval(() => {
      const stats = this.getStats();
      authLogger.info('Cache Stats:', {
        size: stats.size,
        hitRate: `${stats.metrics.hitRate.toFixed(2)}%`,
        totalRequests: stats.metrics.totalRequests,
        memoryUsage: `${(stats.memoryUsage / 1024).toFixed(2)}KB`
      });
    }, 5 * 60 * 1000);
  }

  /**
   * Cleanup quando a instância é destruída
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// ============================================================================
// INSTÂNCIA SINGLETON
// ============================================================================

export const authCache = new AuthCache();

// Cleanup automático quando a página é fechada
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    authCache.destroy();
  });
}

// ============================================================================
// HOOKS PARA REACT
// ============================================================================

/**
 * Hook para acessar métricas do cache
 */
export function useCacheMetrics(): CacheMetrics {
  const [metrics, setMetrics] = React.useState(authCache.getMetrics());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(authCache.getMetrics());
    }, 1000); // Atualizar a cada segundo

    return () => clearInterval(interval);
  }, []);

  return metrics;
}

/**
 * Hook para invalidar cache
 */
export function useCacheInvalidation() {
  return {
    invalidateUser: (userId: string) => authCache.invalidateUser(userId),
    invalidateProfile: (userId: string) => authCache.invalidate(`${userId}:profile`),
    invalidateRoles: (userId: string) => authCache.invalidate(`${userId}:roles`),
    clear: () => authCache.clear()
  };
}