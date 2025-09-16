/**
 * 🔥 SERVIÇO DE AUTENTICAÇÃO APPWRITE UNIFICADO
 * 
 * Migração completa do Supabase para Appwrite com:
 * - Compatibilidade com sistema de roles existente
 * - Suporte multi-tenant com isolamento
 * - Cache inteligente e otimizações de performance
 * - Sistema de retry e circuit breaker
 * - Auditoria e segurança aprimorada
 */

import { AppwriteException, Query, ID } from 'appwrite';
import { account, databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';
import { EncryptionService } from './encryption.service';
import { AuditLogger } from './audit-logger.service';
import { PermissionManager } from './permission-manager.service';
import { authLogger } from '@/utils/logger';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface UnifiedAuthUser {
  $id: string;
  email: string;
  name: string;
  emailVerification: boolean;
  status: boolean;
  prefs: Record<string, any>;
  registration: string;
  passwordUpdate: string;
}

export interface UserProfile {
  $id: string;
  userId: string;
  tenantId: string;
  nomeCompleto: string;
  email: string;
  telefone?: string;
  avatarUrl?: string;
  primeiroAcesso: boolean;
  onboardingStep?: string;
  onboardingCompletedAt?: Date;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
  // Campos criptografados
  encryptedFields: string[];
  dataHash: string;
}

export interface UserRole {
  $id: string;
  userId: string;
  tenantId: string;
  organizationId?: string;
  clinicId?: string;
  role: 'super_admin' | 'organization_owner' | 'clinic_owner' | 'clinic_manager' | 'professional' | 'receptionist';
  permissions: string[];
  ativo: boolean;
  criadoEm: Date;
  criadoPor: string;
  expiresAt?: Date;
}

export interface Organization {
  $id: string;
  name: string;
  slug: string;
  cnpj?: string; // Encrypted
  plan: 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'suspended' | 'cancelled';
  settingsId?: string;
  metrics: {
    totalClinics: number;
    totalUsers: number;
    storageUsedMB: number;
    lastActivityAt: Date;
  };
  billingInfoEncrypted?: string;
  tenantId: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface Clinic {
  $id: string;
  organizationId: string;
  tenantId: string;
  name: string;
  slug: string;
  type: 'main' | 'branch';
  contact: {
    phone: string;
    whatsapp?: string;
    email: string;
  };
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: [number, number];
  };
  settings: {
    timezone: string;
    defaultAppointmentDuration: number;
    workingHours: Record<string, { start: string; end: string }>;
  };
  operationalStatus: 'active' | 'maintenance' | 'closed';
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface AuthResult {
  success: boolean;
  user?: UnifiedAuthUser;
  profile?: UserProfile;
  roles?: UserRole[];
  organizations?: Organization[];
  clinics?: Clinic[];
  currentTenant?: string;
  session?: any;
  error?: string;
  requiresOnboarding?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenantId?: string; // Para multi-tenant
}

export interface RegisterData {
  email: string;
  password: string;
  nomeCompleto: string;
  telefone?: string;
  tenantId?: string;
  organizationData?: {
    name: string;
    cnpj?: string;
    plan: 'basic' | 'premium' | 'enterprise';
  };
}

// ============================================================================
// CACHE INTELIGENTE COM TTL
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tenantId: string;
}

class TenantAwareCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos

  set<T>(key: string, data: T, tenantId: string, customTtl?: number): void {
    const cacheKey = `${tenantId}:${key}`;
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: customTtl || this.DEFAULT_TTL,
      tenantId
    });
  }

  get<T>(key: string, tenantId: string): T | null {
    const cacheKey = `${tenantId}:${key}`;
    const entry = this.cache.get(cacheKey);
    
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.data;
  }

  invalidate(key: string, tenantId: string): void {
    const cacheKey = `${tenantId}:${key}`;
    this.cache.delete(cacheKey);
  }

  invalidateTenant(tenantId: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tenantId === tenantId) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

// ============================================================================
// CIRCUIT BREAKER PARA RESILIÊNCIA
// ============================================================================

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minuto

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open - service temporarily unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}

// ============================================================================
// RETRY STRATEGY COM BACKOFF EXPONENCIAL
// ============================================================================

class RetryStrategy {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries || !this.isRetryable(error)) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private isRetryable(error: any): boolean {
    if (error instanceof AppwriteException) {
      // Retry em erros de rede ou servidor
      return error.code >= 500 || error.code === 429;
    }
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SERVIÇO PRINCIPAL
// ============================================================================

class UnifiedAppwriteAuthService {
  private cache = new TenantAwareCache();
  private circuitBreaker = new CircuitBreaker();
  private retryStrategy = new RetryStrategy();
  private encryptionService = new EncryptionService();
  private auditLogger = new AuditLogger();
  private permissionManager = new PermissionManager();

  // ==========================================================================
  // AUTENTICAÇÃO PRINCIPAL
  // ==========================================================================

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    return this.circuitBreaker.execute(async () => {
      return this.retryStrategy.executeWithRetry(async () => {
        try {
          authLogger.info('Iniciando login', { email: credentials.email });

          // Criar sessão no Appwrite
          const session = await account.createEmailSession(
            credentials.email,
            credentials.password
          );

          // Buscar usuário
          const user = await account.get();

          // Determinar tenant (multi-tenant)
          const tenantId = credentials.tenantId || await this.determineTenant(user.$id);

          // Buscar dados completos do usuário
          const authData = await this.loadCompleteUserData(user.$id, tenantId);

          // Registrar login na auditoria
          await this.auditLogger.logAuthEvent(
            user.$id,
            'login',
            {
              tenantId,
              success: true,
              metadata: {
                email: credentials.email,
                sessionId: session.$id
              }
            }
          );

          authLogger.info('Login realizado com sucesso', { 
            userId: user.$id, 
            tenantId 
          });

          return {
            success: true,
            user,
            session,
            currentTenant: tenantId,
            ...authData
          };

        } catch (error) {
          const appwriteError = error as AppwriteException;
          
          // Registrar falha na auditoria
          await this.auditLogger.logAuthEvent(
            null,
            'login',
            {
              tenantId: credentials.tenantId || 'unknown',
              success: false,
              error: appwriteError.message,
              metadata: {
                email: credentials.email,
                errorCode: appwriteError.code
              }
            }
          );

          authLogger.error('Erro no login', appwriteError);

          return {
            success: false,
            error: this.mapAppwriteError(appwriteError)
          };
        }
      });
    });
  }

  async register(data: RegisterData): Promise<AuthResult> {
    return this.circuitBreaker.execute(async () => {
      return this.retryStrategy.executeWithRetry(async () => {
        try {
          authLogger.info('Iniciando registro', { email: data.email });

          // Gerar tenant ID se não fornecido
          const tenantId = data.tenantId || ID.unique();

          // Criar conta no Appwrite
          const user = await account.create(
            ID.unique(),
            data.email,
            data.password,
            data.nomeCompleto
          );

          // Criar sessão automaticamente
          const session = await account.createEmailSession(
            data.email,
            data.password
          );

          // Criar dados do usuário em transação
          const authData = await this.createUserData(user, data, tenantId);

          // Registrar registro na auditoria
          await this.auditLogger.logAuthEvent(
            user.$id,
            'register',
            {
              tenantId,
              success: true,
              metadata: {
                email: data.email,
                hasOrganization: !!data.organizationData
              }
            }
          );

          authLogger.info('Registro realizado com sucesso', { 
            userId: user.$id, 
            tenantId 
          });

          return {
            success: true,
            user,
            session,
            currentTenant: tenantId,
            requiresOnboarding: true,
            ...authData
          };

        } catch (error) {
          const appwriteError = error as AppwriteException;
          
          await this.auditLogger.logAuthEvent(
            null,
            'register',
            {
              tenantId: data.tenantId || 'unknown',
              success: false,
              error: appwriteError.message,
              metadata: {
                email: data.email,
                errorCode: appwriteError.code
              }
            }
          );

          authLogger.error('Erro no registro', appwriteError);

          return {
            success: false,
            error: this.mapAppwriteError(appwriteError)
          };
        }
      });
    });
  }

  async logout(): Promise<void> {
    // Usar mock em desenvolvimento se necessário
    if (appwriteDevMockService.shouldUseMock()) {
      return appwriteDevMockService.mockLogout();
    }

    try {
      const user = await account.get();
      const tenantId = await this.determineTenant(user.$id);

      // Invalidar cache do usuário
      this.cache.invalidateTenant(tenantId);

      // Registrar logout na auditoria
      await this.auditLogger.logAuthEvent(
        user.$id,
        'logout',
        {
          tenantId,
          success: true
        }
      );

      // Deletar sessão
      await account.deleteSession('current');

      authLogger.info('Logout realizado com sucesso', { userId: user.$id });
    } catch (error) {
      authLogger.error('Erro no logout', error);
      throw error;
    }
  }

  // ==========================================================================
  // GESTÃO DE DADOS DO USUÁRIO
  // ==========================================================================

  private async loadCompleteUserData(userId: string, tenantId: string): Promise<Partial<AuthResult>> {
    // Verificar cache primeiro
    const cacheKey = `user_data_${userId}`;
    const cached = this.cache.get<Partial<AuthResult>>(cacheKey, tenantId);
    if (cached) {
      return cached;
    }

    try {
      // Buscar dados em paralelo para otimizar performance
      const [profile, roles, organizations, clinics] = await Promise.all([
        this.getUserProfile(userId, tenantId),
        this.getUserRoles(userId, tenantId),
        this.getUserOrganizations(userId, tenantId),
        this.getUserClinics(userId, tenantId)
      ]);

      const result = {
        profile: profile || undefined,
        roles,
        organizations,
        clinics
      };

      // Cache por 5 minutos
      this.cache.set(cacheKey, result, tenantId, 5 * 60 * 1000);

      return result;
    } catch (error) {
      authLogger.error('Erro ao carregar dados do usuário', error);
      throw error;
    }
  }

  private async getUserProfile(userId: string, tenantId: string): Promise<UserProfile | null> {
    try {
      const profiles = await databases.listDocuments<UserProfile>(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        [
          Query.equal('userId', userId),
          Query.equal('tenantId', tenantId),
          Query.equal('ativo', true)
        ]
      );

      const profile = profiles.documents[0] || null;
      
      if (profile && profile.encryptedFields.length > 0) {
        // Descriptografar campos sensíveis
        const decryptedProfile = await this.decryptProfileFields(profile);
        return decryptedProfile;
      }

      return profile;
    } catch (error) {
      authLogger.error('Erro ao buscar profile', error);
      return null;
    }
  }

  private async getUserRoles(userId: string, tenantId: string): Promise<UserRole[]> {
    try {
      const roles = await databases.listDocuments<UserRole>(
        DATABASE_ID,
        COLLECTIONS.USER_ROLES,
        [
          Query.equal('userId', userId),
          Query.equal('tenantId', tenantId),
          Query.equal('ativo', true),
          Query.orderDesc('criadoEm')
        ]
      );

      return roles.documents;
    } catch (error) {
      authLogger.error('Erro ao buscar roles', error);
      return [];
    }
  }

  private async getUserOrganizations(userId: string, tenantId: string): Promise<Organization[]> {
    try {
      // Buscar organizações onde o usuário tem acesso
      const userRoles = await this.getUserRoles(userId, tenantId);
      const organizationIds = userRoles
        .filter(role => role.organizationId)
        .map(role => role.organizationId!);

      if (organizationIds.length === 0) {
        return [];
      }

      const organizations = await databases.listDocuments<Organization>(
        DATABASE_ID,
        COLLECTIONS.ORGANIZACOES,
        [
          Query.equal('$id', organizationIds),
          Query.equal('tenantId', tenantId),
          Query.equal('status', 'active')
        ]
      );

      return organizations.documents;
    } catch (error) {
      authLogger.error('Erro ao buscar organizações', error);
      return [];
    }
  }

  private async getUserClinics(userId: string, tenantId: string): Promise<Clinic[]> {
    try {
      const userRoles = await this.getUserRoles(userId, tenantId);
      
      // Super admin vê todas as clínicas do tenant
      const isSuperAdmin = userRoles.some(role => role.role === 'super_admin');
      
      if (isSuperAdmin) {
        const allClinics = await databases.listDocuments<Clinic>(
          DATABASE_ID,
          COLLECTIONS.CLINICAS,
          [
            Query.equal('tenantId', tenantId),
            Query.equal('operationalStatus', 'active')
          ]
        );
        return allClinics.documents;
      }

      // Usuários normais veem apenas suas clínicas
      const clinicIds = userRoles
        .filter(role => role.clinicId)
        .map(role => role.clinicId!);

      if (clinicIds.length === 0) {
        return [];
      }

      const clinics = await databases.listDocuments<Clinic>(
        DATABASE_ID,
        COLLECTIONS.CLINICAS,
        [
          Query.equal('$id', clinicIds),
          Query.equal('tenantId', tenantId),
          Query.equal('operationalStatus', 'active')
        ]
      );

      return clinics.documents;
    } catch (error) {
      authLogger.error('Erro ao buscar clínicas', error);
      return [];
    }
  }

  // ==========================================================================
  // MULTI-TENANT SUPPORT
  // ==========================================================================

  private async determineTenant(userId: string): Promise<string> {
    try {
      // Buscar tenant do usuário nas preferências
      const user = await account.get();
      if (user.prefs?.tenantId) {
        return user.prefs.tenantId;
      }

      // Buscar tenant do primeiro role do usuário
      const roles = await databases.listDocuments<UserRole>(
        DATABASE_ID,
        COLLECTIONS.USER_ROLES,
        [
          Query.equal('userId', userId),
          Query.equal('ativo', true),
          Query.limit(1)
        ]
      );

      if (roles.documents.length > 0) {
        return roles.documents[0].tenantId;
      }

      // Fallback: criar novo tenant
      const newTenantId = ID.unique();
      await account.updatePrefs({ tenantId: newTenantId });
      return newTenantId;
    } catch (error) {
      authLogger.error('Erro ao determinar tenant', error);
      return ID.unique();
    }
  }

  async switchTenant(tenantId: string): Promise<boolean> {
    try {
      const user = await account.get();
      
      // Verificar se o usuário tem acesso ao tenant
      const hasAccess = await this.verifyTenantAccess(user.$id, tenantId);
      if (!hasAccess) {
        throw new Error('Acesso negado ao tenant');
      }

      // Atualizar preferências
      await account.updatePrefs({ 
        ...user.prefs, 
        tenantId 
      });

      // Invalidar cache do tenant anterior
      this.cache.clear();

      // Registrar troca na auditoria
      await this.auditLogger.logAuthEvent(
        user.$id,
        'switch_tenant',
        {
          tenantId,
          success: true
        }
      );

      authLogger.info('Tenant trocado com sucesso', { 
        userId: user.$id, 
        tenantId 
      });

      return true;
    } catch (error) {
      authLogger.error('Erro ao trocar tenant', error);
      return false;
    }
  }

  private async verifyTenantAccess(userId: string, tenantId: string): Promise<boolean> {
    try {
      const roles = await databases.listDocuments<UserRole>(
        DATABASE_ID,
        COLLECTIONS.USER_ROLES,
        [
          Query.equal('userId', userId),
          Query.equal('tenantId', tenantId),
          Query.equal('ativo', true)
        ]
      );

      return roles.documents.length > 0;
    } catch (error) {
      authLogger.error('Erro ao verificar acesso ao tenant', error);
      return false;
    }
  }

  // ==========================================================================
  // AUTORIZAÇÃO E PERMISSÕES
  // ==========================================================================

  async hasPermission(userId: string, permission: string, tenantId: string, resourceId?: string): Promise<boolean> {
    try {
      return await this.permissionManager.checkPermission(userId, permission, {
        tenantId,
        resourceId
      });
    } catch (error) {
      authLogger.error('Erro ao verificar permissão', error);
      return false;
    }
  }

  async getUserPermissions(userId: string, tenantId: string): Promise<string[]> {
    try {
      const roles = await this.getUserRoles(userId, tenantId);
      const allPermissions = new Set<string>();

      for (const role of roles) {
        role.permissions.forEach(permission => allPermissions.add(permission));
      }

      return Array.from(allPermissions);
    } catch (error) {
      authLogger.error('Erro ao buscar permissões do usuário', error);
      return [];
    }
  }

  // ==========================================================================
  // UTILITÁRIOS PRIVADOS
  // ==========================================================================

  private async createUserData(user: UnifiedAuthUser, data: RegisterData, tenantId: string): Promise<Partial<AuthResult>> {
    try {
      // Criar profile
      const profileData: Partial<UserProfile> = {
        userId: user.$id,
        tenantId,
        nomeCompleto: data.nomeCompleto,
        email: data.email,
        telefone: data.telefone,
        primeiroAcesso: true,
        ativo: true,
        encryptedFields: data.telefone ? ['telefone'] : [],
        dataHash: await this.generateDataHash({ nomeCompleto: data.nomeCompleto, email: data.email })
      };

      // Criptografar campos sensíveis
      if (data.telefone) {
        profileData.telefone = await this.encryptionService.encryptData(data.telefone);
      }

      const profile = await databases.createDocument<UserProfile>(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        ID.unique(),
        profileData
      );

      // Criar organização se fornecida
      let organization: Organization | undefined;
      if (data.organizationData) {
        const orgData: Partial<Organization> = {
          name: data.organizationData.name,
          slug: this.generateSlug(data.organizationData.name),
          plan: data.organizationData.plan,
          status: 'active',
          tenantId,
          metrics: {
            totalClinics: 0,
            totalUsers: 1,
            storageUsedMB: 0,
            lastActivityAt: new Date()
          }
        };

        if (data.organizationData.cnpj) {
          orgData.cnpj = await this.encryptionService.encryptData(data.organizationData.cnpj);
        }

        organization = await databases.createDocument<Organization>(
          DATABASE_ID,
          COLLECTIONS.ORGANIZACOES,
          ID.unique(),
          orgData
        );
      }

      // Criar role inicial
      const roleData: Partial<UserRole> = {
        userId: user.$id,
        tenantId,
        organizationId: organization?.$id,
        role: organization ? 'organization_owner' : 'professional',
        permissions: await this.getDefaultPermissions(organization ? 'organization_owner' : 'professional'),
        ativo: true,
        criadoPor: user.$id
      };

      const role = await databases.createDocument<UserRole>(
        DATABASE_ID,
        COLLECTIONS.USER_ROLES,
        ID.unique(),
        roleData
      );

      return {
        profile,
        roles: [role],
        organizations: organization ? [organization] : [],
        clinics: []
      };
    } catch (error) {
      authLogger.error('Erro ao criar dados do usuário', error);
      throw error;
    }
  }

  private async decryptProfileFields(profile: UserProfile): Promise<UserProfile> {
    const decryptedProfile = { ...profile };

    for (const field of profile.encryptedFields) {
      if (profile[field as keyof UserProfile]) {
        try {
          const encryptedData = profile[field as keyof UserProfile] as any;
          const decryptedValue = await this.encryptionService.decryptData(encryptedData);
          (decryptedProfile as any)[field] = decryptedValue;
        } catch (error) {
          authLogger.warn(`Erro ao descriptografar campo ${field}`, error);
        }
      }
    }

    return decryptedProfile;
  }

  private async generateDataHash(data: any): Promise<string> {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async getDefaultPermissions(role: string): Promise<string[]> {
    const permissionMap: Record<string, string[]> = {
      'super_admin': ['*'],
      'organization_owner': [
        'organization:read',
        'organization:write',
        'organization:delete',
        'clinic:read',
        'clinic:write',
        'clinic:delete',
        'user:read',
        'user:write',
        'user:delete',
        'financial:read',
        'financial:write'
      ],
      'clinic_owner': [
        'clinic:read',
        'clinic:write',
        'user:read',
        'user:write',
        'appointment:read',
        'appointment:write',
        'patient:read',
        'patient:write',
        'financial:read'
      ],
      'clinic_manager': [
        'clinic:read',
        'user:read',
        'appointment:read',
        'appointment:write',
        'patient:read',
        'patient:write'
      ],
      'professional': [
        'appointment:read',
        'appointment:write',
        'patient:read',
        'patient:write',
        'medical_record:read',
        'medical_record:write'
      ],
      'receptionist': [
        'appointment:read',
        'appointment:write',
        'patient:read',
        'patient:write'
      ]
    };

    return permissionMap[role] || [];
  }

  private mapAppwriteError(error: AppwriteException): string {
    const errorMap: Record<number, string> = {
      400: 'Dados inválidos',
      401: 'Email ou senha inválidos',
      409: 'Email já está em uso',
      429: 'Muitas tentativas. Tente novamente em alguns minutos',
      500: 'Erro interno do servidor',
      503: 'Serviço temporariamente indisponível'
    };

    return errorMap[error.code] || 'Erro inesperado';
  }

  // ==========================================================================
  // MÉTODOS PÚBLICOS PARA COMPATIBILIDADE
  // ==========================================================================

  async getCurrentUser(): Promise<UnifiedAuthUser | null> {
    // Usar mock em desenvolvimento se necessário
    if (appwriteDevMockService.shouldUseMock()) {
      try {
        return await appwriteDevMockService.mockGetCurrentUser();
      } catch {
        return null;
      }
    }

    try {
      return await account.get();
    } catch {
      return null;
    }
  }

  async refreshSession(): Promise<AuthResult> {
    // Usar mock em desenvolvimento se necessário
    if (appwriteDevMockService.shouldUseMock()) {
      return appwriteDevMockService.mockRefreshSession();
    }

    try {
      const user = await account.get();
      const tenantId = await this.determineTenant(user.$id);
      
      // Invalidar cache para forçar reload
      this.cache.invalidate(`user_data_${user.$id}`, tenantId);
      
      const authData = await this.loadCompleteUserData(user.$id, tenantId);

      return {
        success: true,
        user,
        currentTenant: tenantId,
        ...authData
      };
    } catch (error) {
      authLogger.error('Erro ao renovar sessão', error);
      return {
        success: false,
        error: 'Sessão expirada'
      };
    }
  }
}

// ============================================================================
// INSTÂNCIA SINGLETON
// ============================================================================

export const unifiedAppwriteAuthService = new UnifiedAppwriteAuthService();