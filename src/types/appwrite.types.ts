/**
 * 🔥 TIPOS APPWRITE
 * 
 * Tipos TypeScript para integração com Appwrite, substituindo os tipos do Supabase
 */

import { Models } from 'appwrite';

// ============================================================================
// TIPOS BASE DO APPWRITE
// ============================================================================

export type AppwriteUser = Models.User<Models.Preferences>;
export type AppwriteSession = Models.Session;
export type AppwriteDocument<T = {}> = Models.Document & T;
export type AppwriteDocumentList<T = {}> = Models.DocumentList<AppwriteDocument<T>>;

// ============================================================================
// TIPOS DE DADOS DO SISTEMA
// ============================================================================

// User Profile Document
export interface UserProfileDocument extends AppwriteDocument {
  user_id: string;
  nome_completo: string;
  email: string;
  telefone?: string;
  avatar_url?: string;
  ativo: boolean;
  primeiro_acesso: boolean;
  preferences?: Record<string, any>;
}

// Organização Document
export interface OrganizacaoDocument extends AppwriteDocument {
  nome: string;
  cnpj?: string;
  plano: 'basico' | 'premium' | 'enterprise';
  ativo: boolean;
  criado_por: string;
  configuracoes: Record<string, any>;
}

// Clínica Document
export interface ClinicaDocument extends AppwriteDocument {
  organizacao_id: string;
  nome: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  ativo: boolean;
  criado_por: string;
  configuracoes: Record<string, any>;
}

// User Role Context Document
export interface UserRoleDocument extends AppwriteDocument {
  user_id: string;
  organizacao_id?: string;
  clinica_id?: string;
  role: UserRole;
  ativo: boolean;
  criado_por: string;
}

// Convite Document
export interface ConviteDocument extends AppwriteDocument {
  email: string;
  role: UserRole;
  organizacao_id?: string;
  clinica_id?: string;
  status: StatusConvite;
  token: string;
  expires_at: string;
  criado_por: string;
  aceito_em?: string;
  aceito_por?: string;
}

// Profissional Especialidade Document
export interface ProfissionalEspecialidadeDocument extends AppwriteDocument {
  user_id: string;
  especialidade: string;
  certificacao?: string;
  ativo: boolean;
}

// ============================================================================
// ENUMS E CONSTANTES
// ============================================================================

export type UserRole = 
  | 'super_admin' 
  | 'proprietaria' 
  | 'gerente' 
  | 'profissionais' 
  | 'recepcionistas' 
  | 'visitante' 
  | 'cliente';

export type PlanoType = 'basico' | 'premium' | 'enterprise';
export type StatusConvite = 'pendente' | 'aceito' | 'recusado' | 'expirado';

// ============================================================================
// TIPOS DE AUTENTICAÇÃO
// ============================================================================

export interface AuthResult {
  success: boolean;
  user?: AppwriteUser;
  session?: AppwriteSession;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  nome_completo: string;
  tipo_usuario: UserRole;
}

// ============================================================================
// TIPOS DE CONTEXTO E ESTADO
// ============================================================================

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AppwriteUser | null;
  profile: UserProfileDocument | null;
  roles: UserRoleDocument[];
  currentRole: UserRole | null;
  isProfileLoading: boolean;
  isRolesLoading: boolean;
  isOnboardingLoading: boolean;
  currentClinic: ClinicaDocument | null;
  availableClinics: ClinicaDocument[];
  isInitialized: boolean;
  error: string | null;
}

export type AuthAction =
  | { type: 'LOGIN_START' }
  | { 
      type: 'LOGIN_SUCCESS'; 
      payload: {
        user?: AppwriteUser;
        profile?: UserProfileDocument;
        roles?: UserRoleDocument[];
        currentClinic?: ClinicaDocument;
        clinics?: ClinicaDocument[];
      }
    }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_SUCCESS'; payload: AppwriteSession }
  | { type: 'SWITCH_CLINIC'; payload: ClinicaDocument }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_PROFILE_LOADING'; payload: boolean }
  | { type: 'SET_ROLES_LOADING'; payload: boolean }
  | { type: 'SET_ONBOARDING_LOADING'; payload: boolean };

export interface AuthContextValue {
  // Estado
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AppwriteUser | null;
  profile: UserProfileDocument | null;
  roles: UserRoleDocument[];
  currentRole: UserRole | null;
  currentClinic: ClinicaDocument | null;
  availableClinics: ClinicaDocument[];
  isInitialized: boolean;
  error: string | null;

  // Métodos
  login: (credentials: LoginCredentials) => Promise<AuthResult>;
  register: (data: RegisterData) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<AuthResult | null>;
  switchClinic: (clinicId: string) => Promise<boolean>;
  clearError: () => void;
  
  // Estados de loading granulares
  isProfileLoading: boolean;
  isRolesLoading: boolean;
  isOnboardingLoading: boolean;
}

// ============================================================================
// TIPOS DE PERMISSÕES
// ============================================================================

export interface Permission {
  action: string;
  resource: string;
  condition?: Record<string, any>;
}

export interface UserClinicAccess {
  clinicId: string;
  role: UserRole;
  permissions: Permission[];
}

// ============================================================================
// TIPOS DE ERRO
// ============================================================================

export interface AppwriteError extends Error {
  code?: number;
  type?: string;
  response?: {
    message?: string;
    code?: number;
    type?: string;
  };
}

// ============================================================================
// UTILITÁRIOS DE TIPO
// ============================================================================

export type WithId<T> = T & { $id: string };
export type WithTimestamps<T> = T & {
  $createdAt: string;
  $updatedAt: string;
};

export type CreateDocumentInput<T> = Omit<T, '$id' | '$createdAt' | '$updatedAt' | '$permissions'>;
export type UpdateDocumentInput<T> = Partial<CreateDocumentInput<T>>;