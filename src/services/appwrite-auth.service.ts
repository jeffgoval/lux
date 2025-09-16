/**
 * 🔥 SERVIÇO DE AUTENTICAÇÃO APPWRITE
 * 
 * Serviço de autenticação usando Appwrite substituindo o Supabase
 */

import { AppwriteException, Query } from 'appwrite';
import {
  account,
  databases,
  teams,
  DATABASE_ID,
  COLLECTIONS,
  ID
} from '@/lib/appwrite';
import {
  AuthResult,
  LoginCredentials,
  RegisterData,
  AppwriteUser,
  UserProfileDocument,
  UserRoleDocument,
  ClinicaDocument,
  UserRole,
  AppwriteError
} from '@/types/appwrite.types';
import { authLogger } from '@/utils/logger';

export const appwriteAuthService = {
  /**
   * Login com email e senha
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      authLogger.info('Tentando fazer login', { email: credentials.email });
      
      const session = await account.createEmailSession(
        credentials.email,
        credentials.password
      );

      // Buscar dados do usuário
      const user = await account.get();
      
      authLogger.info('Login realizado com sucesso', { userId: user.$id });
      return {
        success: true,
        user,
        session
      };
    } catch (error) {
      const appwriteError = error as AppwriteException;
      authLogger.error('Erro no login', appwriteError);
      
      let errorMessage = 'Erro interno do servidor';
      
      if (appwriteError.code === 401) {
        errorMessage = 'Email ou senha inválidos';
      } else if (appwriteError.code === 429) {
        errorMessage = 'Muitas tentativas de login. Tente novamente em alguns minutos';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  },

  /**
   * Registro de novo usuário
   */
  async register(data: RegisterData): Promise<AuthResult> {
    try {
      authLogger.info('Tentando registrar usuário', { email: data.email });
      
      // Criar conta no Appwrite
      const user = await account.create(
        ID.unique(),
        data.email,
        data.password,
        data.nome_completo
      );

      // Criar sessão automaticamente após registro
      const session = await account.createEmailSession(
        data.email,
        data.password
      );

      // Criar profile do usuário na collection
      await this.createUserProfile(user, data);

      authLogger.info('Registro realizado com sucesso', { userId: user.$id });
      return {
        success: true,
        user,
        session
      };
    } catch (error) {
      const appwriteError = error as AppwriteException;
      authLogger.error('Erro no registro', appwriteError);
      
      let errorMessage = 'Erro interno do servidor';
      
      if (appwriteError.code === 409) {
        errorMessage = 'Email já está em uso';
      } else if (appwriteError.code === 400) {
        errorMessage = 'Dados inválidos';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  },

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      authLogger.info('Fazendo logout');
      await account.deleteSession('current');
      authLogger.info('Logout realizado com sucesso');
    } catch (error) {
      authLogger.error('Erro no logout', error);
      throw error;
    }
  },

  /**
   * Refresh da sessão atual
   */
  async refreshSession(): Promise<AuthResult> {
    try {
      authLogger.info('Renovando sessão');
      
      const session = await account.getSession('current');
      const user = await account.get();
      
      authLogger.info('Sessão renovada com sucesso');
      return {
        success: true,
        user,
        session
      };
    } catch (error) {
      const appwriteError = error as AppwriteException;
      authLogger.error('Erro ao renovar sessão', appwriteError);
      
      return {
        success: false,
        error: 'Sessão expirada'
      };
    }
  },

  /**
   * Obter usuário atual
   */
  async getCurrentUser(): Promise<AppwriteUser | null> {
    try {
      const user = await account.get();
      return user;
    } catch {
      return null;
    }
  },

  /**
   * Obter profile completo do usuário
   */
  async getUserProfile(userId: string): Promise<UserProfileDocument | null> {
    try {
      const profiles = await databases.listDocuments<UserProfileDocument>(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        [Query.equal('user_id', userId)]
      );

      return profiles.documents[0] || null;
    } catch (error) {
      authLogger.error('Erro ao buscar profile do usuário', error);
      return null;
    }
  },

  /**
   * Obter roles do usuário
   */
  async getUserRoles(userId: string): Promise<UserRoleDocument[]> {
    try {
      const roles = await databases.listDocuments<UserRoleDocument>(
        DATABASE_ID,
        COLLECTIONS.USER_ROLES,
        [
          Query.equal('user_id', userId),
          Query.equal('ativo', true)
        ]
      );

      return roles.documents;
    } catch (error) {
      authLogger.error('Erro ao buscar roles do usuário', error);
      return [];
    }
  },

  /**
   * Obter clínicas disponíveis para o usuário
   */
  async getUserClinics(userId: string): Promise<ClinicaDocument[]> {
    try {
      // Primeiro, buscar as roles do usuário para saber quais clínicas ele tem acesso
      const userRoles = await this.getUserRoles(userId);
      
      if (userRoles.length === 0) {
        return [];
      }

      // Se é super admin, retornar todas as clínicas
      const isSuperAdmin = userRoles.some(role => role.role === 'super_admin');
      if (isSuperAdmin) {
        const allClinics = await databases.listDocuments<ClinicaDocument>(
          DATABASE_ID,
          COLLECTIONS.CLINICAS,
          [Query.equal('ativo', true)]
        );
        return allClinics.documents;
      }

      // Senão, buscar apenas as clínicas específicas
      const clinicIds = userRoles
        .filter(role => role.clinica_id)
        .map(role => role.clinica_id!);

      if (clinicIds.length === 0) {
        return [];
      }

      const clinics = await databases.listDocuments<ClinicaDocument>(
        DATABASE_ID,
        COLLECTIONS.CLINICAS,
        [
          Query.equal('$id', clinicIds),
          Query.equal('ativo', true)
        ]
      );

      return clinics.documents;
    } catch (error) {
      authLogger.error('Erro ao buscar clínicas do usuário', error);
      return [];
    }
  },

  /**
   * Trocar clínica atual
   */
  async switchClinic(clinicId: string): Promise<boolean> {
    try {
      authLogger.info('Trocando clínica', { clinicId });
      
      // Verificar se a clínica existe e está ativa
      const clinic = await databases.getDocument<ClinicaDocument>(
        DATABASE_ID,
        COLLECTIONS.CLINICAS,
        clinicId
      );

      if (!clinic.ativo) {
        authLogger.warn('Tentativa de trocar para clínica inativa', { clinicId });
        return false;
      }

      // Atualizar preferências do usuário
      await account.updatePrefs({
        current_clinic_id: clinicId
      });

      authLogger.info('Clínica trocada com sucesso', { clinicId });
      return true;
    } catch (error) {
      authLogger.error('Erro ao trocar clínica', error);
      return false;
    }
  },

  /**
   * Criar profile do usuário após registro
   */
  async createUserProfile(user: AppwriteUser, registerData: RegisterData): Promise<UserProfileDocument> {
    try {
      const profileData = {
        user_id: user.$id,
        nome_completo: registerData.nome_completo,
        email: user.email,
        ativo: true,
        primeiro_acesso: true
      };

      const profile = await databases.createDocument<UserProfileDocument>(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        ID.unique(),
        profileData
      );

      // Criar role inicial do usuário
      await databases.createDocument<UserRoleDocument>(
        DATABASE_ID,
        COLLECTIONS.USER_ROLES,
        ID.unique(),
        {
          user_id: user.$id,
          role: registerData.tipo_usuario,
          ativo: true,
          criado_por: user.$id
        }
      );

      return profile;
    } catch (error) {
      authLogger.error('Erro ao criar profile do usuário', error);
      throw error;
    }
  },

  /**
   * Verificar se usuário tem permissão específica
   */
  async hasPermission(userId: string, permission: string, clinicId?: string): Promise<boolean> {
    try {
      const roles = await this.getUserRoles(userId);
      
      // Super admin tem todas as permissões
      if (roles.some(role => role.role === 'super_admin')) {
        return true;
      }

      // Verificar permissões específicas baseadas nos roles
      // Esta lógica pode ser expandida conforme necessário
      return roles.length > 0;
    } catch (error) {
      authLogger.error('Erro ao verificar permissões', error);
      return false;
    }
  }
};