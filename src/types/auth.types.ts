/**
 * 🔐 TIPOS DE AUTENTICAÇÃO - SISTEMA SEGURO V2
 * 
 * Definições de tipos para máxima type safety e segurança
 */

// ============================================================================
// ENUMS E CONSTANTES
// ============================================================================

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  PROPRIETARIA = 'proprietaria',
  GERENTE = 'gerente',
  PROFISSIONAIS = 'profissionais',
  RECEPCIONISTAS = 'recepcionistas',
  VISITANTE = 'visitante',
  CLIENTE = 'cliente'
}

export enum Permission {
  // Clínica
  CREATE_CLINIC = 'create_clinic',
  VIEW_CLINIC = 'view_clinic',
  EDIT_CLINIC = 'edit_clinic',
  DELETE_CLINIC = 'delete_clinic',
  
  // Usuários
  INVITE_USER = 'invite_user',
  MANAGE_USERS = 'manage_users',
  VIEW_USERS = 'view_users',
  
  // Prontuários
  CREATE_MEDICAL_RECORD = 'create_medical_record',
  VIEW_MEDICAL_RECORD = 'view_medical_record',
  EDIT_MEDICAL_RECORD = 'edit_medical_record',
  DELETE_MEDICAL_RECORD = 'delete_medical_record',
  
  // Financeiro
  VIEW_FINANCIAL = 'view_financial',
  MANAGE_FINANCIAL = 'manage_financial',
  
  // Relatórios
  VIEW_REPORTS = 'view_reports',
  EXPORT_DATA = 'export_data',
  
  // Sistema
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  MANAGE_SYSTEM = 'manage_system'
}

export enum AuthEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  TOKEN_REFRESH = 'token_refresh',
  PASSWORD_CHANGE = 'password_change',
  PERMISSION_DENIED = 'permission_denied',
  CLINIC_SWITCH = 'clinic_switch',
  ACCOUNT_LOCKED = 'account_locked'
}

// ============================================================================
// INTERFACES PRINCIPAIS
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
}

export interface Clinic {
  id: string;
  name: string;
  cnpj?: string;
  ownerId: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  settings: ClinicSettings;
}

export interface ClinicSettings {
  timezone: string;
  currency: string;
  language: string;
  features: string[];
  branding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export interface UserClinicRole {
  id: string;
  userId: string;
  clinicId: string;
  role: UserRole;
  permissions: Permission[];
  active: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// AUTENTICAÇÃO E AUTORIZAÇÃO
// ============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  clinicId?: string; // Para login direto em clínica específica
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  acceptTerms: boolean;
  clinicName?: string; // Para registro com clínica
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: 'Bearer';
}

export interface AuthResult {
  success: boolean;
  user?: User;
  profile?: UserProfile;
  roles?: UserRoleContext[];
  tokens?: AuthTokens;
  clinics?: UserClinicAccess[];
  currentClinic?: UserClinicAccess;
  error?: string;
  requiresEmailVerification?: boolean;
  requiresOnboarding?: boolean;
}

export interface UserClinicAccess {
  clinic: Clinic;
  role: UserRole;
  permissions: Permission[];
  active: boolean;
  expiresAt?: Date;
}

// ============================================================================
// CONTEXTO DE AUTENTICAÇÃO
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  nome_completo: string;
  telefone?: string;
  primeiro_acesso: boolean;
  ativo: boolean;
  criado_em: Date;
  atualizado_em?: Date;
}

export interface UserRoleContext {
  role: UserRole;
  clinica_id?: string;
  ativo: boolean;
}

export interface AuthState {
  // Estado básico
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;

  // Compatibilidade com sistema antigo
  profile: UserProfile | null;
  roles: UserRoleContext[];
  currentRole: UserRole | null;
  isProfileLoading: boolean;
  isRolesLoading: boolean;

  // Multi-tenant
  currentClinic: UserClinicAccess | null;
  availableClinics: UserClinicAccess[];

  // Tokens
  tokens: AuthTokens | null;

  // Estado de UI
  isInitialized: boolean;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  // Métodos de autenticação
  login: (credentials: LoginCredentials) => Promise<AuthResult>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<AuthResult>;
  refreshAuth: () => Promise<boolean>;

  // Multi-tenant
  switchClinic: (clinicId: string) => Promise<boolean>;

  // Autorização
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;

  // Compatibilidade com sistema antigo
  refreshProfile: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  getCurrentRole: () => UserRole | null;
  isOnboardingComplete: boolean;

  // Utilitários
  clearError: () => void;
  isTokenExpired: () => boolean;
}

// ============================================================================
// AUDITORIA E LOGS
// ============================================================================

export interface AuthAuditLog {
  id: string;
  userId?: string;
  clinicId?: string;
  eventType: AuthEventType;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

// ============================================================================
// VALIDAÇÃO E SEGURANÇA
// ============================================================================

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very_strong';
}

export interface SecurityContext {
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  clinicId?: string;
  permissions: Permission[];
  rateLimitRemaining: number;
}

// ============================================================================
// UTILITÁRIOS DE TIPO
// ============================================================================

export type AuthAction = 
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: AuthResult }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_SUCCESS'; payload: AuthTokens }
  | { type: 'SWITCH_CLINIC'; payload: UserClinicAccess }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

export type ProtectedRouteProps = {
  children: React.ReactNode;
  requiredPermissions?: Permission[];
  requiredRoles?: UserRole[];
  fallback?: React.ReactNode;
  requireAll?: boolean; // Se true, requer TODAS as permissões/roles
};

// ============================================================================
// GUARDS DE TIPO
// ============================================================================

export function isValidUserRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

export function isValidPermission(permission: string): permission is Permission {
  return Object.values(Permission).includes(permission as Permission);
}

export function hasValidTokens(tokens: AuthTokens | null): tokens is AuthTokens {
  return tokens !== null && 
         tokens.accessToken.length > 0 && 
         tokens.expiresAt > new Date();
}
