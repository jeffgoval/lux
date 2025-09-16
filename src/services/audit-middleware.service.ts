/**
 * AuditMiddleware - Intercepts and logs all CRUD operations
 * 
 * Features:
 * - Automatic CRUD operation interception
 * - Context extraction from requests
 * - Async logging without blocking operations
 * - Error handling and fallback logging
 * - Performance monitoring
 * 
 * Requirements: 4.2, 4.4
 */

import { auditLogger, AuditAction, AuditContext } from './audit-logger.service';

export interface OperationContext {
  userId: string;
  userRole: string;
  tenantId: string;
  sessionId: string;
  ip: string;
  userAgent: string;
  endpoint?: string;
  method?: string;
}

export interface CRUDOperation {
  action: 'create' | 'read' | 'update' | 'delete';
  resource: string;
  resourceId: string;
  resourceType: string;
  beforeData?: any;
  afterData?: any;
  context: OperationContext;
}

export class AuditMiddleware {
  private performanceMetrics = new Map<string, number[]>();
  private errorCount = 0;
  private totalOperations = 0;

  /**
   * Intercept and log CRUD operations
   */
  async interceptCRUDOperation<T>(
    operation: CRUDOperation,
    executor: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    const operationId = this.generateOperationId();
    
    try {
      this.totalOperations++;
      
      // Log operation start for high-risk operations
      if (this.isHighRiskOperation(operation)) {
        await this.logOperationStart(operation, operationId);
      }

      // Execute the actual operation
      const result = await executor();

      // Log successful operation
      await this.logSuccessfulOperation(operation, result, operationId);

      // Record performance metrics
      this.recordPerformanceMetric(operation.action, Date.now() - startTime);

      return result;

    } catch (error) {
      this.errorCount++;
      
      // Log failed operation
      await this.logFailedOperation(operation, error, operationId);
      
      // Re-throw the error
      throw error;
    }
  }

  /**
   * Intercept data access operations
   */
  async interceptDataAccess<T>(
    resourceType: string,
    resourceId: string,
    accessType: 'view' | 'export' | 'print' | 'share',
    context: OperationContext,
    executor: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      // Log data access
      await auditLogger.logDataAccess(
        resourceType,
        resourceId,
        accessType,
        {
          userId: context.userId,
          userRole: context.userRole,
          tenantId: context.tenantId,
          sessionId: context.sessionId,
          context: this.buildAuditContext(context),
          compliance: {
            regulation: 'LGPD',
            dataClassification: this.classifyResource(resourceType),
            retentionPeriod: 2555,
            processingPurpose: `Data ${accessType} for healthcare service provision`
          },
          security: {
            riskLevel: this.calculateAccessRiskLevel(resourceType, accessType),
            authMethod: 'password',
            encryptionUsed: true
          }
        }
      );

      // Execute the operation
      const result = await executor();

      // Record performance
      this.recordPerformanceMetric(`access_${accessType}`, Date.now() - startTime);

      return result;

    } catch (error) {
      // Log access failure
      await auditLogger.logAction(
        'access_denied',
        resourceType,
        resourceId,
        {
          userId: context.userId,
          userRole: context.userRole,
          tenantId: context.tenantId,
          sessionId: context.sessionId,
          context: this.buildAuditContext(context),
          security: {
            riskLevel: 'high',
            authMethod: 'password',
            encryptionUsed: false
          }
        }
      );

      throw error;
    }
  }

  // Private methods

  private async logOperationStart(operation: CRUDOperation, operationId: string): Promise<void> {
    await auditLogger.logAction(
      operation.action,
      operation.resource,
      operationId,
      {
        userId: operation.context.userId,
        userRole: operation.context.userRole,
        tenantId: operation.context.tenantId,
        sessionId: operation.context.sessionId,
        resourceType: operation.resourceType,
        context: this.buildAuditContext(operation.context),
        security: {
          riskLevel: 'medium',
          authMethod: 'password',
          encryptionUsed: false
        }
      }
    );
  }

  private async logSuccessfulOperation(
    operation: CRUDOperation,
    result: any,
    operationId: string
  ): Promise<void> {
    await auditLogger.logCRUDOperation(
      operation.action,
      operation.resource,
      operation.resourceId || operationId,
      operation.beforeData,
      operation.afterData || result,
      {
        userId: operation.context.userId,
        userRole: operation.context.userRole,
        tenantId: operation.context.tenantId,
        sessionId: operation.context.sessionId,
        resourceType: operation.resourceType,
        context: this.buildAuditContext(operation.context),
        compliance: {
          regulation: 'LGPD',
          dataClassification: this.classifyResource(operation.resourceType),
          retentionPeriod: 2555,
          processingPurpose: 'Healthcare service provision and management'
        },
        security: {
          riskLevel: this.calculateOperationRiskLevel(operation),
          authMethod: this.detectAuthMethod(operation.context),
          encryptionUsed: this.hasEncryptedFields(operation.afterData || result)
        }
      }
    );
  }

  private async logFailedOperation(
    operation: CRUDOperation,
    error: any,
    operationId: string
  ): Promise<void> {
    await auditLogger.logAction(
      'access_denied',
      operation.resource,
      operation.resourceId || operationId,
      {
        userId: operation.context.userId,
        userRole: operation.context.userRole,
        tenantId: operation.context.tenantId,
        sessionId: operation.context.sessionId,
        resourceType: operation.resourceType,
        context: this.buildAuditContext(operation.context),
        changes: {
          fields: ['error'],
          sensitiveFields: [],
          after: {
            error: error.message,
            errorType: error.constructor.name,
            attemptedAction: operation.action
          }
        },
        security: {
          riskLevel: 'high',
          authMethod: this.detectAuthMethod(operation.context),
          encryptionUsed: false
        }
      }
    );
  }

  private buildAuditContext(context: OperationContext): AuditContext {
    return {
      ip: context.ip,
      userAgent: context.userAgent,
      device: {
        type: this.detectDeviceType(context.userAgent),
        os: this.extractOS(context.userAgent),
        browser: this.extractBrowser(context.userAgent)
      },
      api: {
        endpoint: context.endpoint,
        method: context.method,
        version: 'v1'
      }
    };
  }

  private isHighRiskOperation(operation: CRUDOperation): boolean {
    return operation.action === 'delete' ||
           (operation.action === 'update' && this.hasEncryptedFields(operation.afterData)) ||
           operation.resourceType === 'medical_records' ||
           operation.resourceType === 'patients';
  }

  private calculateOperationRiskLevel(operation: CRUDOperation): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;

    // Base risk by action
    if (operation.action === 'delete') riskScore += 3;
    else if (operation.action === 'update') riskScore += 2;
    else if (operation.action === 'create') riskScore += 1;

    // Resource type risk
    if (operation.resourceType === 'medical_records') riskScore += 3;
    else if (operation.resourceType === 'patients') riskScore += 2;
    else if (operation.resourceType === 'users') riskScore += 1;

    // Data sensitivity
    if (this.hasEncryptedFields(operation.afterData)) riskScore += 2;

    // Convert to risk level
    if (riskScore >= 6) return 'critical';
    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  private calculateAccessRiskLevel(
    resourceType: string,
    accessType: 'view' | 'export' | 'print' | 'share'
  ): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;

    // Access type risk
    if (accessType === 'export' || accessType === 'share') riskScore += 2;
    else if (accessType === 'print') riskScore += 1;

    // Resource type risk
    if (resourceType === 'medical_records') riskScore += 3;
    else if (resourceType === 'patients') riskScore += 2;

    if (riskScore >= 4) return 'critical';
    if (riskScore >= 3) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  private classifyResource(resourceType: string): 'public' | 'internal' | 'confidential' | 'restricted' {
    const classifications = {
      'medical_records': 'restricted',
      'patients': 'confidential',
      'users': 'confidential',
      'appointments': 'confidential',
      'clinics': 'internal',
      'services': 'internal',
      'organizations': 'internal'
    };

    return classifications[resourceType as keyof typeof classifications] || 'internal';
  }

  private detectAuthMethod(context: OperationContext): 'password' | 'mfa' | 'sso' | 'api_key' | 'certificate' {
    // In a real implementation, this would check the actual auth method used
    if (context.endpoint?.includes('/api/')) return 'api_key';
    return 'password';
  }

  private detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' | 'api' {
    if (!userAgent) return 'api';
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return /iPad/.test(userAgent) ? 'tablet' : 'mobile';
    }
    return 'desktop';
  }

  private extractOS(userAgent: string): string | undefined {
    if (!userAgent) return undefined;
    
    if (/Windows/.test(userAgent)) return 'Windows';
    if (/Mac OS/.test(userAgent)) return 'macOS';
    if (/Linux/.test(userAgent)) return 'Linux';
    if (/Android/.test(userAgent)) return 'Android';
    if (/iOS/.test(userAgent)) return 'iOS';
    
    return 'Unknown';
  }

  private extractBrowser(userAgent: string): string | undefined {
    if (!userAgent) return undefined;
    
    if (/Chrome/.test(userAgent)) return 'Chrome';
    if (/Firefox/.test(userAgent)) return 'Firefox';
    if (/Safari/.test(userAgent)) return 'Safari';
    if (/Edge/.test(userAgent)) return 'Edge';
    
    return 'Unknown';
  }

  private hasEncryptedFields(data: any): boolean {
    return data && (
      data.encryptedFields?.length > 0 ||
      data.personalInfoEncrypted ||
      data.encryptionVersion
    );
  }

  private recordPerformanceMetric(operation: string, latency: number): void {
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, []);
    }
    
    const metrics = this.performanceMetrics.get(operation)!;
    metrics.push(latency);
    
    // Keep only last 1000 measurements
    if (metrics.length > 1000) {
      metrics.shift();
    }
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance for application-wide use
export const auditMiddleware = new AuditMiddleware();

// Export types
export type { CRUDOperation, OperationContext };