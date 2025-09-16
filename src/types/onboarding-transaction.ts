import { OnboardingData } from './onboarding';

export interface OnboardingTransactionResult {
  success: boolean;
  data?: any;
  error?: string;
  rollbackData?: any;
}

export interface OnboardingTransaction {
  // Core operations
  createProfile(): Promise<OnboardingTransactionResult>;
  createRole(): Promise<OnboardingTransactionResult>;
  createClinic(): Promise<OnboardingTransactionResult & { clinicId?: string }>;
  updateRoleWithClinic(clinicId: string): Promise<OnboardingTransactionResult>;
  createProfessional(): Promise<OnboardingTransactionResult>;
  linkProfessionalToClinic(clinicId: string): Promise<OnboardingTransactionResult>;
  
  // Rollback capability
  rollback(): Promise<void>;
  
  // Transaction state
  isCompleted(): boolean;
  getExecutedOperations(): string[];
  getTransactionId(): string;
}

export interface OnboardingOperationContext {
  userId: string;
  data: OnboardingData;
  transactionId: string;
  executedOperations: string[];
  rollbackData: Record<string, any>;
}

export interface OnboardingOperationResult {
  success: boolean;
  data?: any;
  error?: string;
  operationId: string;
  rollbackInfo?: any;
}

export enum OnboardingOperationType {
  CREATE_PROFILE = 'create_profile',
  CREATE_ROLE = 'create_role', 
  CREATE_CLINIC = 'create_clinic',
  UPDATE_ROLE_WITH_CLINIC = 'update_role_with_clinic',
  CREATE_PROFESSIONAL = 'create_professional',
  LINK_PROFESSIONAL_TO_CLINIC = 'link_professional_to_clinic',
  CREATE_TEMPLATE = 'create_template',
  MARK_ONBOARDING_COMPLETE = 'mark_onboarding_complete'
}

export interface OnboardingOperation {
  type: OnboardingOperationType;
  execute(context: OnboardingOperationContext): Promise<OnboardingOperationResult>;
  rollback(context: OnboardingOperationContext, rollbackInfo: any): Promise<void>;
  validate(context: OnboardingOperationContext): Promise<boolean>;
}