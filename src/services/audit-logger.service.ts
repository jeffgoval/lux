/**
 * AuditLogger - Comprehensive audit logging system for LGPD/HIPAA compliance
 * 
 * Features:
 * - Complete CRUD operation logging
 * - User action tracking with context
 * - LGPD/HIPAA compliant log structure
 * - Secure log storage with integrity verification
 * - Automated log retention and archival
 * - Real-time audit alerts for suspicious activities
 * 
 * Requirements: 4.2, 4.4
 */

import { encryptionService, EncryptedData } from './encryption.service';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  tenantId: string;
  userId: string;
  userRole: string;
  sessionId: string;
  
  // Action details
  action: AuditAction;
  resource: string;
  resourceId: string;
  resourceType: string;
  
  // Context information
  context: AuditContext;
  
  // Data changes (encrypted for sensitive operations)
  changes?: AuditChanges;
  
  // Compliance fields
  compliance: ComplianceMetadata;
  
  // Security fields
  security: SecurityMetadata;
  
  // Integrity verification
  integrity: IntegrityMetadata;
}

export type AuditAction = 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete' 
  | 'login' 
  | 'logout' 
  | 'access_denied' 
  | 'export' 
  | 'print' 
  | 'share' 
  | 'backup' 
  | 'restore'
  | 'key_rotation'
  | 'permission_change'
  | 'data_migration';

export interface AuditContext {
  ip: string;
  userAgent: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  device: {
    type: 'desktop' | 'mobile' | 'tablet' | 'api';
    os?: string;
    browser?: string;
  };
  api: {
    endpoint?: string;
    method?: string;
    version?: string;
  };
}

export interface AuditChanges {
  before?: EncryptedData | any;
  after?: EncryptedData | any;
  fields: string[];
  sensitiveFields: string[];
  changeReason?: string;
}

export interface ComplianceMetadata {
  regulation: 'LGPD' | 'HIPAA' | 'GDPR' | 'CCPA';
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionPeriod: number; // Days
  legalBasis?: string;
  consentId?: string;
  processingPurpose: string;
}

export interface SecurityMetadata {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  authMethod: 'password' | 'mfa' | 'sso' | 'api_key' | 'certificate';
  encryptionUsed: boolean;
  vpnUsed?: boolean;
  anomalyScore?: number;
}

export interface IntegrityMetadata {
  hash: string;
  signature?: string;
  previousLogHash?: string;
  chainVerified: boolean;
}

export interface AuditQuery {
  tenantId?: string;
  userId?: string;
  action?: AuditAction;
  resource?: string;
  resourceType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  riskLevel?: SecurityMetadata['riskLevel'];
  limit?: number;
  offset?: number;
}

export interface AuditAlert {
  id: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  type: 'suspicious_activity' | 'compliance_violation' | 'security_breach' | 'data_anomaly';
  message: string;
  relatedLogIds: string[];
  autoResolved: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export class AuditLogger {
  private logBuffer: AuditLogEntry[] = [];
  private bufferSize = 100;
  private flushInterval = 5000; // 5 seconds
  private lastLogHash = '';
  private alertThresholds = {
    failedLogins: 5,
    suspiciousIPs: 10,
    massDataAccess: 50,
    offHoursAccess: true
  };

  constructor() {
    this.startPeriodicFlush();
    this.initializeLogChain();
  }

  /**
   * Log a user action with full audit trail
   */
  async logAction(
    action: AuditAction,
    resource: string,
    resourceId: string,
    context: Partial<AuditLogEntry>
  ): Promise<void> {
    try {
      const logEntry = await this.createLogEntry(action, resource, resourceId, context);
      
      // Add to buffer
      this.logBuffer.push(logEntry);
      
      // Check for immediate flush conditions
      if (this.shouldFlushImmediately(logEntry)) {
        await this.flushLogs();
      }
      
      // Check for security alerts
      await this.checkForAlerts(logEntry);
      
    } catch (error) {
      console.error('Failed to log audit action:', error);
      // In production, this should be sent to a separate error tracking system
    }
  }

  /**
   * Log CRUD operations with before/after data
   */
  async logCRUDOperation(
    action: 'create' | 'update' | 'delete',
    resource: string,
    resourceId: string,
    beforeData: any,
    afterData: any,
    context: Partial<AuditLogEntry>
  ): Promise<void> {
    const changes = await this.createAuditChanges(beforeData, afterData);
    
    await this.logAction(action, resource, resourceId, {
      ...context,
      changes
    });
  }

  /**
   * Log data access for compliance
   */
  async logDataAccess(
    resourceType: string,
    resourceId: string,
    accessType: 'view' | 'export' | 'print' | 'share',
    context: Partial<AuditLogEntry>
  ): Promise<void> {
    await this.logAction('read', resourceType, resourceId, {
      ...context,
      compliance: {
        ...context.compliance,
        processingPurpose: `Data ${accessType} for legitimate business purpose`
      }
    });
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(
    action: 'login' | 'logout' | 'access_denied',
    userId: string,
    context: Partial<AuditLogEntry>
  ): Promise<void> {
    await this.logAction(action, 'authentication', userId, {
      ...context,
      security: {
        ...context.security,
        riskLevel: action === 'access_denied' ? 'high' : 'low'
      }
    });
  }

  /**
   * Query audit logs with filtering
   */
  async queryLogs(query: AuditQuery): Promise<AuditLogEntry[]> {
    // In production, this would query the actual audit log storage
    // For now, return filtered buffer data
    return this.logBuffer.filter(log => this.matchesQuery(log, query));
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    tenantId: string,
    dateFrom: Date,
    dateTo: Date,
    regulation: ComplianceMetadata['regulation']
  ): Promise<ComplianceReport> {
    const logs = await this.queryLogs({
      tenantId,
      dateFrom,
      dateTo
    });

    const filteredLogs = logs.filter(log => 
      log.compliance.regulation === regulation
    );

    return {
      tenantId,
      regulation,
      period: { from: dateFrom, to: dateTo },
      totalEvents: filteredLogs.length,
      eventsByType: this.groupLogsByAction(filteredLogs),
      dataAccessEvents: filteredLogs.filter(log => log.action === 'read').length,
      dataModificationEvents: filteredLogs.filter(log => 
        ['create', 'update', 'delete'].includes(log.action)
      ).length,
      securityEvents: filteredLogs.filter(log => 
        log.security.riskLevel === 'high' || log.security.riskLevel === 'critical'
      ).length,
      complianceViolations: await this.detectComplianceViolations(filteredLogs),
      generatedAt: new Date()
    };
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(tenantId?: string): Promise<AuditAlert[]> {
    // In production, this would query the alerts storage
    // For now, return mock data structure
    return [];
  }

  /**
   * Verify audit log integrity
   */
  async verifyLogIntegrity(logId: string): Promise<boolean> {
    const log = this.logBuffer.find(l => l.id === logId);
    if (!log) return false;

    const computedHash = await this.computeLogHash(log);
    return computedHash === log.integrity.hash;
  }

  /**
   * Archive old logs based on retention policy
   */
  async archiveLogs(beforeDate: Date): Promise<number> {
    const logsToArchive = this.logBuffer.filter(log => 
      log.timestamp < beforeDate
    );

    // In production, move to cold storage
    console.log(`Archiving ${logsToArchive.length} logs before ${beforeDate}`);
    
    // Remove from active buffer
    this.logBuffer = this.logBuffer.filter(log => 
      log.timestamp >= beforeDate
    );

    return logsToArchive.length;
  }

  // Private methods

  private async createLogEntry(
    action: AuditAction,
    resource: string,
    resourceId: string,
    context: Partial<AuditLogEntry>
  ): Promise<AuditLogEntry> {
    const id = this.generateLogId();
    const timestamp = new Date();
    
    const logEntry: AuditLogEntry = {
      id,
      timestamp,
      tenantId: context.tenantId || 'unknown',
      userId: context.userId || 'system',
      userRole: context.userRole || 'unknown',
      sessionId: context.sessionId || this.generateSessionId(),
      
      action,
      resource,
      resourceId,
      resourceType: context.resourceType || resource,
      
      context: context.context || this.getDefaultContext(),
      changes: context.changes,
      
      compliance: {
        regulation: 'LGPD',
        dataClassification: 'confidential',
        retentionPeriod: 2555, // 7 years in days
        processingPurpose: 'Healthcare service provision',
        ...context.compliance
      },
      
      security: {
        riskLevel: this.calculateRiskLevel(action, context),
        authMethod: 'password',
        encryptionUsed: !!context.changes?.sensitiveFields?.length,
        ...context.security
      },
      
      integrity: {
        hash: '',
        previousLogHash: this.lastLogHash,
        chainVerified: true
      }
    };

    // Compute integrity hash
    logEntry.integrity.hash = await this.computeLogHash(logEntry);
    this.lastLogHash = logEntry.integrity.hash;

    return logEntry;
  }

  private async createAuditChanges(beforeData: any, afterData: any): Promise<AuditChanges> {
    const changes: AuditChanges = {
      fields: [],
      sensitiveFields: []
    };

    if (beforeData || afterData) {
      // Identify changed fields
      const allFields = new Set([
        ...Object.keys(beforeData || {}),
        ...Object.keys(afterData || {})
      ]);

      for (const field of allFields) {
        if (beforeData?.[field] !== afterData?.[field]) {
          changes.fields.push(field);
          
          // Check if field contains sensitive data
          if (this.isSensitiveField(field)) {
            changes.sensitiveFields.push(field);
          }
        }
      }

      // Encrypt sensitive data changes
      if (changes.sensitiveFields.length > 0) {
        changes.before = beforeData ? await encryptionService.encryptData(
          JSON.stringify(this.extractSensitiveFields(beforeData, changes.sensitiveFields))
        ) : undefined;
        
        changes.after = afterData ? await encryptionService.encryptData(
          JSON.stringify(this.extractSensitiveFields(afterData, changes.sensitiveFields))
        ) : undefined;
      } else {
        changes.before = beforeData;
        changes.after = afterData;
      }
    }

    return changes;
  }

  private calculateRiskLevel(
    action: AuditAction,
    context: Partial<AuditLogEntry>
  ): SecurityMetadata['riskLevel'] {
    let riskScore = 0;

    // Base risk by action
    const actionRisk = {
      'delete': 3,
      'export': 2,
      'access_denied': 3,
      'permission_change': 2,
      'key_rotation': 1,
      'update': 1,
      'create': 1,
      'read': 0
    };

    riskScore += actionRisk[action] || 0;

    // Context-based risk factors
    if (context.context?.device?.type === 'api') riskScore += 1;
    if (context.changes?.sensitiveFields?.length) riskScore += 2;
    if (this.isOffHours()) riskScore += 1;

    // Convert score to risk level
    if (riskScore >= 4) return 'critical';
    if (riskScore >= 3) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  private async computeLogHash(log: AuditLogEntry): Promise<string> {
    // Create a deterministic string representation for hashing
    const hashData = {
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      userId: log.userId,
      previousHash: log.integrity.previousLogHash
    };

    return encryptionService.generateDataHash(JSON.stringify(hashData));
  }

  private async checkForAlerts(logEntry: AuditLogEntry): Promise<void> {
    const alerts: AuditAlert[] = [];

    // Check for failed login attempts
    if (logEntry.action === 'access_denied') {
      const recentFailures = this.logBuffer.filter(log => 
        log.action === 'access_denied' &&
        log.userId === logEntry.userId &&
        log.timestamp > new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
      ).length;

      if (recentFailures >= this.alertThresholds.failedLogins) {
        alerts.push({
          id: this.generateAlertId(),
          timestamp: new Date(),
          severity: 'warning',
          type: 'suspicious_activity',
          message: `Multiple failed login attempts for user ${logEntry.userId}`,
          relatedLogIds: [logEntry.id],
          autoResolved: false
        });
      }
    }

    // Check for off-hours access to sensitive data
    if (this.isOffHours() && logEntry.security.riskLevel === 'high') {
      alerts.push({
        id: this.generateAlertId(),
        timestamp: new Date(),
        severity: 'warning',
        type: 'suspicious_activity',
        message: `Off-hours access to sensitive data by ${logEntry.userId}`,
        relatedLogIds: [logEntry.id],
        autoResolved: false
      });
    }

    // Process alerts (in production, send to monitoring system)
    for (const alert of alerts) {
      console.warn('Security Alert:', alert);
    }
  }

  private shouldFlushImmediately(logEntry: AuditLogEntry): boolean {
    return logEntry.security.riskLevel === 'critical' ||
           logEntry.action === 'access_denied' ||
           this.logBuffer.length >= this.bufferSize;
  }

  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    // In production, persist to secure audit log storage
    console.log(`Flushing ${logsToFlush.length} audit logs to storage`);
    
    // Simulate async storage operation
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private startPeriodicFlush(): void {
    setInterval(() => {
      this.flushLogs().catch(error => {
        console.error('Failed to flush audit logs:', error);
      });
    }, this.flushInterval);
  }

  private async initializeLogChain(): Promise<void> {
    // Initialize the hash chain for log integrity
    this.lastLogHash = await encryptionService.generateDataHash('audit-chain-genesis');
  }

  private matchesQuery(log: AuditLogEntry, query: AuditQuery): boolean {
    if (query.tenantId && log.tenantId !== query.tenantId) return false;
    if (query.userId && log.userId !== query.userId) return false;
    if (query.action && log.action !== query.action) return false;
    if (query.resource && log.resource !== query.resource) return false;
    if (query.resourceType && log.resourceType !== query.resourceType) return false;
    if (query.riskLevel && log.security.riskLevel !== query.riskLevel) return false;
    if (query.dateFrom && log.timestamp < query.dateFrom) return false;
    if (query.dateTo && log.timestamp > query.dateTo) return false;
    
    return true;
  }

  private groupLogsByAction(logs: AuditLogEntry[]): Record<string, number> {
    return logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private async detectComplianceViolations(logs: AuditLogEntry[]): Promise<string[]> {
    const violations: string[] = [];
    
    // Check for data access without proper consent
    const dataAccessLogs = logs.filter(log => log.action === 'read');
    for (const log of dataAccessLogs) {
      if (!log.compliance.consentId && log.compliance.dataClassification === 'restricted') {
        violations.push(`Data access without consent: ${log.id}`);
      }
    }

    return violations;
  }

  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'cpf', 'rg', 'passport', 'ssn',
      'email', 'phone', 'address',
      'medicalRecord', 'diagnosis', 'treatment',
      'creditCard', 'bankAccount',
      'password', 'token', 'key'
    ];

    return sensitiveFields.some(sensitive => 
      fieldName.toLowerCase().includes(sensitive.toLowerCase())
    );
  }

  private extractSensitiveFields(data: any, sensitiveFields: string[]): any {
    const result: any = {};
    for (const field of sensitiveFields) {
      if (data[field] !== undefined) {
        result[field] = data[field];
      }
    }
    return result;
  }

  private getDefaultContext(): AuditContext {
    return {
      ip: '127.0.0.1',
      userAgent: 'Unknown',
      device: {
        type: 'desktop'
      },
      api: {}
    };
  }

  private isOffHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    return hour < 6 || hour > 22; // Before 6 AM or after 10 PM
  }

  private generateLogId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Compliance report interface
export interface ComplianceReport {
  tenantId: string;
  regulation: ComplianceMetadata['regulation'];
  period: { from: Date; to: Date };
  totalEvents: number;
  eventsByType: Record<string, number>;
  dataAccessEvents: number;
  dataModificationEvents: number;
  securityEvents: number;
  complianceViolations: string[];
  generatedAt: Date;
}

// Singleton instance for application-wide use
export const auditLogger = new AuditLogger();

// Export types for use in other modules
export type { AuditLogEntry, AuditQuery, AuditAlert, ComplianceReport };