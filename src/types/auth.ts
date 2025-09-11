import { Database } from '@/integrations/supabase/types';

// Define types based on available enums, using fallbacks for missing ones
export type UserRole = 'super_admin' | 'proprietaria' | 'gerente' | 'profissionais' | 'recepcionistas' | 'visitante' | 'cliente';
export type PlanoType = 'basico' | 'premium' | 'enterprise';
export type StatusConvite = 'pendente' | 'aceito' | 'recusado' | 'expirado';

export interface UserProfile {
  id: string;
  user_id: string;
  nome_completo: string;
  email: string;
  telefone?: string;
  avatar_url?: string;
  ativo: boolean;
  primeiro_acesso: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Organizacao {
  id: string;
  nome: string;
  cnpj?: string;
  plano: PlanoType;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  criado_por: string;
  configuracoes: Record<string, any>;
}

export interface Clinica {
  id: string;
  organizacao_id: string;
  nome: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  criado_por: string;
  configuracoes: Record<string, any>;
}

export interface UserRoleContext {
  id: string;
  user_id: string;
  organizacao_id?: string;
  clinica_id?: string;
  role: UserRole;
  ativo: boolean;
  criado_em: string;
  criado_por: string;
}

export interface Convite {
  id: string;
  email: string;
  role: UserRole;
  organizacao_id?: string;
  clinica_id?: string;
  status: StatusConvite;
  token: string;
  expires_at: string;
  criado_por: string;
  criado_em: string;
  aceito_em?: string;
  aceito_por?: string;
}

export interface ProfissionalEspecialidade {
  id: string;
  user_id: string;
  especialidade: string;
  certificacao?: string;
  ativo: boolean;
  criado_em: string;
}

// Permissions constants
export const ROLE_PERMISSIONS = {
  super_admin: {
    label: 'Super Admin',
    canManageOrganizations: true,
    canManageClinics: true,
    canManageUsers: true,
    canAccessAllData: true,
    canManageSystem: true
  },
  proprietaria: {
    label: 'Proprietária',
    canManageOrganizations: false,
    canManageClinics: true,
    canManageUsers: true,
    canAccessAllData: true,
    canManageSystem: false
  },
  gerente: {
    label: 'Gerente',
    canManageOrganizations: false,
    canManageClinics: false,
    canManageUsers: true,
    canAccessAllData: true,
    canManageSystem: false
  },
  profissionais: {
    label: 'Profissional',
    canManageOrganizations: false,
    canManageClinics: false,
    canManageUsers: false,
    canAccessAllData: false,
    canManageSystem: false
  },
  recepcionistas: {
    label: 'Recepcionista',
    canManageOrganizations: false,
    canManageClinics: false,
    canManageUsers: false,
    canAccessAllData: false,
    canManageSystem: false
  },
  visitante: {
    label: 'Visitante',
    canManageOrganizations: false,
    canManageClinics: false,
    canManageUsers: false,
    canAccessAllData: false,
    canManageSystem: false
  }
} as const;