/**
 * 🔐 TIPOS DE AUTENTICAÇÃO
 * 
 * Definições de tipos para sistema de autenticação unificado
 */

export enum UserRole {
  PROPRIETARIA = 'proprietaria',
  GERENTE = 'gerente',
  RECEPCIONISTAS = 'recepcionista',
  SUPER_ADMIN = 'super_admin'
}

export enum Permission {
  VIEW_CLINIC = 'view_clinic',
  EDIT_CLINIC = 'edit_clinic',
  DELETE_CLINIC = 'delete_clinic',
  MANAGE_USERS = 'manage_users',
  VIEW_REPORTS = 'view_reports',
  MANAGE_APPOINTMENTS = 'manage_appointments',
  VIEW_FINANCIAL = 'view_financial',
  EDIT_FINANCIAL = 'edit_financial'
}

export enum TipoProcedimento {
  LIMPEZA_PELE = 'limpeza_pele',
  PEELING = 'peeling',
  HIDRATACAO = 'hidratacao',
  MICROAGULHAMENTO = 'microagulhamento',
  RADIOFREQUENCIA = 'radiofrequencia',
  LASER = 'laser'
}

export enum AuthErrorType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  DATABASE = 'database',
  NETWORK = 'network',
  TIMEOUT = 'timeout'
}

export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  loginAttempts: number;
}

export interface UserProfile {
  id: string;
  email: string;
  nome_completo: string;
  telefone?: string;
  avatar_url?: string;
  primeiro_acesso: boolean;
  onboarding_step?: string;
  onboarding_completed_at?: Date;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

export interface UserRoleData {
  id: string;
  user_id: string;
  role: UserRole;
  clinica_id?: string;
  ativo: boolean;
  criado_em: Date;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: 'Bearer';
}

export interface AuthResult {
  success: boolean;
  user?: User;
  profile?: UserProfile;
  roles?: UserRoleData[];
  tokens?: Tokens;
  clinics?: ClinicAccess[];
  currentClinic?: ClinicAccess;
  error?: string;
}

export interface Clinic {
  id: string;
  name: string;
  ownerId: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  settings: {
    timezone: string;
    currency: string;
    language: string;
    features: string[];
  };
}

export interface ClinicAccess {
  clinic: Clinic;
  role: UserRole;
  permissions: Permission[];
  active: boolean;
}

export interface AuthError {
  type: AuthErrorType;
  message: string;
  code?: string;
  recoverable: boolean;
  retryAfter?: number;
  context?: Record<string, any>;
}

export interface RecoveryStrategy {
  canRecover(error: AuthError): boolean;
  recover(error: AuthError): Promise<boolean>;
  maxAttempts: number;
  backoffMs: number;
}

export interface RecoveryResult {
  success: boolean;
  strategy?: string;
  attemptsUsed?: number;
  error?: string;
  suggestions?: string[];
}

export interface FallbackStrategy {
  action: 'redirect' | 'retry' | 'show_error';
  to?: string;
  message?: string;
  userMessage?: string;
  canRetry?: boolean;
  retryAfter?: number;
}

export interface ErrorStats {
  total: number;
  network: number;
  database: number;
  authentication: number;
  authorization: number;
  validation: number;
  timeout: number;
  mostFrequent: AuthErrorType;
}

export interface ErrorReport {
  totalErrors: number;
  recoverableErrors: number;
  successfulRecoveries: number;
  errorsByType: Record<AuthErrorType, number>;
  timestamp: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  acceptTerms: boolean;
}

export interface OnboardingData {
  profile: {
    nome_completo: string;
    telefone?: string;
    email: string;
  };
  clinic: {
    nome: string;
    endereco: string;
    telefone: string;
    email: string;
  };
  professional: {
    especialidades: string[];
    registro_profissional?: string;
  };
}

export interface TransactionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  clinicId?: string;
}

export interface IntegrityCheck {
  profile: boolean;
  role: boolean;
  clinic: boolean;
  professional: boolean;
  clinicLink: boolean;
  templates: boolean;
  onboardingComplete: boolean;
}

export interface IntegrityResult {
  success: boolean;
  checks: IntegrityCheck;
  missingRelationships?: string[];
  repairSuggestions?: string[];
}

export interface IntegrityReport {
  timestamp: Date;
  userId: string;
  clinicId: string;
  checks: IntegrityCheck;
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    overallStatus: 'PASS' | 'FAIL';
  };
}

export interface ProgressCallback {
  (progress: {
    step: string;
    progress: number;
    message: string;
  }): void;
}