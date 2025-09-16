/**
 * 🏢 SERVIÇO DE ISOLAMENTO MULTI-TENANT APPWRITE
 * 
 * Garante isolamento completo entre tenants no Appwrite
 * com validação de acesso e auditoria
 */

import { Query } from 'appwrite';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite';
import { unifiedAppwriteAuthService } from './unified-appwrite-auth.service';
import { AuditLogger } from './audit-logger.service';
import { authLogger } from '@/utils/logger';

export interface TenantContext {
  tenantId: string;
  userId: string;
  organizationId?: string;
  clinicId?: string;
}

export interface TenantValidationResult {
  isValid: boolean;
  tenantId: string;
  hasAccess: boolean;
  violations: string[];
}

export class AppwriteTenantIsolationService {
  private auditLogger = new AuditLogger();

  /**
   * Validar contexto de tenant para operação
   */
  async validateTenantContext(
    userId: string,
    requestedTenantId: string,
    operation: string,
    resourceId?: string
  ): Promise<TenantValidationResult> {
    const violations: string[] = [];
    
    try {
      // Verificar se usuário tem acesso ao tenant
      const hasAccess = await this.verifyTenantAccess(userId, requestedTenantId);
      
      if (!hasAccess) {
        violations.push(`User ${userId} does not have access to tenant ${requestedTenantId}`);
      }

      // Verificar se recurso pertence ao tenant (se especificado)
      if (resourceId && hasAccess) {
        const resourceBelongsToTenant = await this.verifyResourceTenant(
          resourceId,
          requestedTenantId
        );
        
        if (!resourceBelongsToTenant) {
          violations.push(`Resource ${resourceId} does not belong to tenant ${requestedTenantId}`);
        }
      }

      // Registrar tentativa de acesso
      await this.auditLogger.logTenantAccess(
        userId,
        requestedTenantId,
        operation,
        {
          resourceId,
          hasAccess: violations.length === 0,
          violations
        }
      );

      return {
        isValid: violations.length === 0,
        tenantId: requestedTenantId,
        hasAccess,
        violations
      };

    } catch (error) {
      authLogger.error('Erro na validação de tenant', error);
      
      violations.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        isValid: false,
        tenantId: requestedTenantId,
        hasAccess: false,
        violations
      };
    }
  }

  /**
   * Criar query com filtro de tenant automático
   */
  createTenantQuery(tenantId: string, additionalQueries: string[] = []): string[] {
    return [
      Query.equal('tenantId', tenantId),
      ...additionalQueries
    ];
  }

  /**
   * Verificar se usuário tem acesso ao tenant
   */
  async verifyTenantAccess(userId: string, tenantId: string): Promise<boolean> {
    try {
      const userRoles = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USER_ROLES,
        [
          Query.equal('userId', userId),
          Query.equal('tenantId', tenantId),
          Query.equal('ativo', true)
        ]
      );

      return userRoles.documents.length > 0;
    } catch (error) {
      authLogger.error('Erro ao verificar acesso ao tenant', error);
      return false;
    }
  }

  /**
   * Verificar se recurso pertence ao tenant
   */
  async verifyResourceTenant(resourceId: string, tenantId: string): Promise<boolean> {
    try {
      // Verificar em todas as collections principais
      const collections = [
        COLLECTIONS.PROFILES,
        COLLECTIONS.ORGANIZACOES,
        COLLECTIONS.CLINICAS,
        COLLECTIONS.AGENDAMENTOS,
        COLLECTIONS.PRONTUARIOS
      ];

      for (const collectionId of collections) {
        try {
          const document = await databases.getDocument(
            DATABASE_ID,
            collectionId,
            resourceId
          );

          // Verificar se documento tem tenantId e se corresponde
          if (document.tenantId) {
            return document.tenantId === tenantId;
          }
        } catch (error) {
          // Documento não encontrado nesta collection, continuar
          continue;
        }
      }

      // Se não encontrou em nenhuma collection, assumir que não pertence
      return false;
    } catch (error) {
      authLogger.error('Erro ao verificar tenant do recurso', error);
      return false;
    }
  }

  /**
   * Obter contexto de tenant do usuário atual
   */
  async getCurrentTenantContext(): Promise<TenantContext | null> {
    try {
      const user = await unifiedAppwriteAuthService.getCurrentUser();
      if (!user) {
        return null;
      }

      const authResult = await unifiedAppwriteAuthService.refreshSession();
      if (!authResult.success || !authResult.currentTenant) {
        return null;
      }

      const currentRole = authResult.roles?.[0];
      
      return {
        tenantId: authResult.currentTenant,
        userId: user.$id,
        organizationId: currentRole?.organizationId,
        clinicId: currentRole?.clinicId
      };
    } catch (error) {
      authLogger.error('Erro ao obter contexto de tenant', error);
      return null;
    }
  }

  /**
   * Trocar tenant com validação de segurança
   */
  async switchTenantSecure(userId: string, newTenantId: string): Promise<boolean> {
    try {
      // Validar acesso ao novo tenant
      const validation = await this.validateTenantContext(
        userId,
        newTenantId,
        'switch_tenant'
      );

      if (!validation.isValid) {
        authLogger.warn('Tentativa de troca de tenant negada', {
          userId,
          newTenantId,
          violations: validation.violations
        });
        return false;
      }

      // Executar troca
      const success = await unifiedAppwriteAuthService.switchTenant(newTenantId);

      if (success) {
        authLogger.info('Tenant trocado com sucesso', {
          userId,
          newTenantId
        });
      }

      return success;
    } catch (error) {
      authLogger.error('Erro na troca segura de tenant', error);
      return false;
    }
  }

  /**
   * Listar tenants acessíveis pelo usuário
   */
  async getAccessibleTenants(userId: string): Promise<string[]> {
    try {
      const userRoles = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USER_ROLES,
        [
          Query.equal('userId', userId),
          Query.equal('ativo', true)
        ]
      );

      // Extrair tenants únicos
      const tenantIds = new Set<string>();
      userRoles.documents.forEach(role => {
        if (role.tenantId) {
          tenantIds.add(role.tenantId);
        }
      });

      return Array.from(tenantIds);
    } catch (error) {
      authLogger.error('Erro ao buscar tenants acessíveis', error);
      return [];
    }
  }

  /**
   * Validar integridade de isolamento de tenant
   */
  async validateTenantIntegrity(tenantId: string): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Verificar se há dados órfãos (sem tenantId)
      const collections = [
        COLLECTIONS.PROFILES,
        COLLECTIONS.ORGANIZACOES,
        COLLECTIONS.CLINICAS
      ];

      for (const collectionId of collections) {
        try {
          const orphanedDocs = await databases.listDocuments(
            DATABASE_ID,
            collectionId,
            [
              Query.isNull('tenantId'),
              Query.limit(1)
            ]
          );

          if (orphanedDocs.documents.length > 0) {
            issues.push(`Found orphaned documents in ${collectionId} without tenantId`);
          }
        } catch (error) {
          issues.push(`Error checking ${collectionId}: ${error}`);
        }
      }

      // Verificar referências cruzadas entre tenants
      await this.validateCrossTenanReferences(tenantId, issues);

      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      authLogger.error('Erro na validação de integridade', error);
      return {
        isValid: false,
        issues: [`Validation error: ${error}`]
      };
    }
  }

  private async validateCrossTenanReferences(
    tenantId: string,
    issues: string[]
  ): Promise<void> {
    try {
      // Verificar se agendamentos referenciam pacientes de outros tenants
      const appointments = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.AGENDAMENTOS,
        [
          Query.equal('tenantId', tenantId),
          Query.limit(100)
        ]
      );

      for (const appointment of appointments.documents) {
        if (appointment.patientId) {
          try {
            const patient = await databases.getDocument(
              DATABASE_ID,
              'patients', // Assumindo que existe collection de pacientes
              appointment.patientId
            );

            if (patient.tenantId !== tenantId) {
              issues.push(
                `Appointment ${appointment.$id} references patient from different tenant`
              );
            }
          } catch (error) {
            // Paciente não encontrado - referência órfã
            issues.push(`Appointment ${appointment.$id} references non-existent patient`);
          }
        }
      }
    } catch (error) {
      issues.push(`Error validating cross-tenant references: ${error}`);
    }
  }
}

export const appwriteTenantIsolationService = new AppwriteTenantIsolationService();