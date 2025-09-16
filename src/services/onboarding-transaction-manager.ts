import { v4 as uuidv4 } from 'uuid';
import { authLogger } from '@/utils/logger';
import {
  OnboardingTransaction,
  OnboardingTransactionResult,
  OnboardingOperationContext,
  OnboardingOperationType
} from '@/types/onboarding-transaction';
import { OnboardingData } from '@/types/onboarding';
import {
  CreateProfileOperation,
  CreateRoleOperation,
  CreateClinicOperation,
  UpdateRoleWithClinicOperation,
  CreateProfessionalOperation,
  LinkProfessionalToClinicOperation,
  CreateTemplateOperation,
  MarkOnboardingCompleteOperation
} from './onboarding-operations';

export class OnboardingTransactionManager implements OnboardingTransaction {
  private transactionId: string;
  private userId: string;
  private data: OnboardingData;
  private executedOperations: string[] = [];
  private rollbackData: Record<string, any> = {};
  private completed: boolean = false;

  constructor(userId: string, data: OnboardingData) {
    this.transactionId = uuidv4();
    this.userId = userId;
    this.data = data;
  }

  private createContext(): OnboardingOperationContext {
    return {
      userId: this.userId,
      data: this.data,
      transactionId: this.transactionId,
      executedOperations: [...this.executedOperations],
      rollbackData: { ...this.rollbackData }
    };
  }

  private async executeOperation(
    operation: any,
    operationType: OnboardingOperationType
  ): Promise<OnboardingTransactionResult> {
    if (this.completed) {
      return {
        success: false,
        error: 'Transaction already completed'
      };
    }

    const context = this.createContext();
    
    try {
      // Validate operation
      const isValid = await operation.validate(context);
      if (!isValid) {
        throw new Error(`Operation validation failed: ${operationType}`);
      }

      // Execute operation
      const result = await operation.execute(context);
      
      if (result.success) {
        // Store rollback data
        if (result.rollbackInfo) {
          this.rollbackData[result.operationId] = result.rollbackInfo;
        }
        
        // Track executed operation
        this.executedOperations.push(result.operationId);
        
        authLogger.debug(`Operation ${operationType} completed successfully`, {
          transactionId: this.transactionId,
          operationId: result.operationId
        });
      }

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        rollbackData: result.rollbackInfo
      };
    } catch (error) {
      authLogger.error(`Operation ${operationType} failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createProfile(): Promise<OnboardingTransactionResult> {
    const operation = new CreateProfileOperation();
    return this.executeOperation(operation, OnboardingOperationType.CREATE_PROFILE);
  }

  async createRole(): Promise<OnboardingTransactionResult> {
    const operation = new CreateRoleOperation();
    return this.executeOperation(operation, OnboardingOperationType.CREATE_ROLE);
  }

  async createClinic(): Promise<OnboardingTransactionResult & { clinicId?: string }> {
    const operation = new CreateClinicOperation();
    const result = await this.executeOperation(operation, OnboardingOperationType.CREATE_CLINIC);
    
    return {
      ...result,
      clinicId: result.data?.clinicId
    };
  }

  async updateRoleWithClinic(clinicId: string): Promise<OnboardingTransactionResult> {
    const operation = new UpdateRoleWithClinicOperation(clinicId);
    return this.executeOperation(operation, OnboardingOperationType.UPDATE_ROLE_WITH_CLINIC);
  }

  async createProfessional(): Promise<OnboardingTransactionResult> {
    const operation = new CreateProfessionalOperation();
    return this.executeOperation(operation, OnboardingOperationType.CREATE_PROFESSIONAL);
  }

  async linkProfessionalToClinic(clinicId: string): Promise<OnboardingTransactionResult> {
    const operation = new LinkProfessionalToClinicOperation(clinicId);
    return this.executeOperation(operation, OnboardingOperationType.LINK_PROFESSIONAL_TO_CLINIC);
  }

  async createTemplate(): Promise<OnboardingTransactionResult> {
    const operation = new CreateTemplateOperation();
    return this.executeOperation(operation, OnboardingOperationType.CREATE_TEMPLATE);
  }

  async markOnboardingComplete(): Promise<OnboardingTransactionResult> {
    const operation = new MarkOnboardingCompleteOperation();
    return this.executeOperation(operation, OnboardingOperationType.MARK_ONBOARDING_COMPLETE);
  }

  async rollback(): Promise<void> {
    if (this.executedOperations.length === 0) {
      authLogger.debug('No operations to rollback');
      return;
    }

    authLogger.warn(`Rolling back transaction ${this.transactionId}`, {
      operationsToRollback: this.executedOperations.length
    });

    const context = this.createContext();
    
    // Rollback operations in reverse order
    const operationsToRollback = [...this.executedOperations].reverse();
    
    for (const operationId of operationsToRollback) {
      try {
        const rollbackInfo = this.rollbackData[operationId];
        
        // Determine operation type from operationId
        const operationType = operationId.split('_')[0] as OnboardingOperationType;
        
        let operation;
        switch (operationType) {
          case OnboardingOperationType.CREATE_PROFILE:
            operation = new CreateProfileOperation();
            break;
          case OnboardingOperationType.CREATE_ROLE:
            operation = new CreateRoleOperation();
            break;
          case OnboardingOperationType.CREATE_CLINIC:
            operation = new CreateClinicOperation();
            break;
          case OnboardingOperationType.UPDATE_ROLE_WITH_CLINIC:
            // Need clinic ID for rollback, get from rollback info
            const clinicId = rollbackInfo?.clinicId || '';
            operation = new UpdateRoleWithClinicOperation(clinicId);
            break;
          case OnboardingOperationType.CREATE_PROFESSIONAL:
            operation = new CreateProfessionalOperation();
            break;
          case OnboardingOperationType.LINK_PROFESSIONAL_TO_CLINIC:
            // Need clinic ID for rollback, get from rollback info
            const linkClinicId = rollbackInfo?.clinicId || '';
            operation = new LinkProfessionalToClinicOperation(linkClinicId);
            break;
          case OnboardingOperationType.CREATE_TEMPLATE:
            operation = new CreateTemplateOperation();
            break;
          case OnboardingOperationType.MARK_ONBOARDING_COMPLETE:
            operation = new MarkOnboardingCompleteOperation();
            break;
          default:
            authLogger.error(`Unknown operation type for rollback: ${operationType}`);
            continue;
        }

        await operation.rollback(context, rollbackInfo);
        authLogger.debug(`Rolled back operation: ${operationId}`);
      } catch (error) {
        authLogger.error(`Failed to rollback operation ${operationId}:`, error);
        // Continue with other rollbacks even if one fails
      }
    }

    // Clear transaction state
    this.executedOperations = [];
    this.rollbackData = {};
    this.completed = true;

    authLogger.info(`Transaction ${this.transactionId} rolled back`);
  }

  isCompleted(): boolean {
    return this.completed;
  }

  getExecutedOperations(): string[] {
    return [...this.executedOperations];
  }

  getTransactionId(): string {
    return this.transactionId;
  }

  // Mark transaction as completed (prevents further operations)
  markCompleted(): void {
    this.completed = true;
    authLogger.info(`Transaction ${this.transactionId} marked as completed`);
  }

  // Get transaction summary
  getSummary(): {
    transactionId: string;
    userId: string;
    executedOperations: string[];
    completed: boolean;
    hasRollbackData: boolean;
  } {
    return {
      transactionId: this.transactionId,
      userId: this.userId,
      executedOperations: [...this.executedOperations],
      completed: this.completed,
      hasRollbackData: Object.keys(this.rollbackData).length > 0
    };
  }
}

// Factory function for creating transactions
export function createOnboardingTransaction(
  userId: string, 
  data: OnboardingData
): OnboardingTransactionManager {
  return new OnboardingTransactionManager(userId, data);
}