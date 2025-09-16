/**
 * 🔐 SERVIÇO DE AUTENTICAÇÃO MIGRADO PARA APPWRITE
 * 
 * Serviço de autenticação que usa Appwrite mantendo compatibilidade
 * com a interface existente para facilitar a migração
 */

import { AuthResult, LoginCredentials, RegisterData } from '@/types/auth.types';
import { unifiedAppwriteAuthService } from './unified-appwrite-auth.service';
import { authLogger } from '@/utils/logger';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      authLogger.info('Tentando fazer login via Appwrite', { email: credentials.email });
      
      const result = await unifiedAppwriteAuthService.login(credentials);

      if (result.success) {
        authLogger.info('Login realizado com sucesso via Appwrite');
        
        // Mapear para interface compatível
        return {
          success: true,
          user: result.user ? {
            id: result.user.$id,
            email: result.user.email,
            name: result.user.name,
            emailVerified: result.user.emailVerification,
            active: result.user.status,
            createdAt: new Date(result.user.registration),
            updatedAt: new Date(result.user.passwordUpdate),
            loginAttempts: 0
          } : undefined,
          profile: result.profile ? {
            id: result.profile.$id,
            email: result.profile.email,
            nome_completo: result.profile.nomeCompleto,
            telefone: result.profile.telefone,
            avatar_url: result.profile.avatarUrl,
            primeiro_acesso: result.profile.primeiroAcesso,
            onboarding_step: result.profile.onboardingStep,
            onboarding_completed_at: result.profile.onboardingCompletedAt,
            ativo: result.profile.ativo,
            criado_em: result.profile.criadoEm,
            atualizado_em: result.profile.atualizadoEm
          } : undefined,
          roles: result.roles?.map(role => ({
            id: role.$id,
            user_id: role.userId,
            role: role.role as any,
            clinica_id: role.clinicId,
            ativo: role.ativo,
            criado_em: role.criadoEm
          })),
          clinics: result.clinics?.map(clinic => ({
            clinic: {
              id: clinic.$id,
              name: clinic.name,
              ownerId: '', // Será preenchido conforme necessário
              active: clinic.operationalStatus === 'active',
              createdAt: clinic.criadoEm,
              updatedAt: clinic.atualizadoEm,
              settings: {
                timezone: clinic.settings.timezone,
                currency: 'BRL',
                language: 'pt-BR',
                features: []
              }
            },
            role: result.roles?.[0]?.role as any || 'professional',
            permissions: [],
            active: true
          })),
          currentClinic: result.clinics?.[0] ? {
            clinic: {
              id: result.clinics[0].$id,
              name: result.clinics[0].name,
              ownerId: '',
              active: result.clinics[0].operationalStatus === 'active',
              createdAt: result.clinics[0].criadoEm,
              updatedAt: result.clinics[0].atualizadoEm,
              settings: {
                timezone: result.clinics[0].settings.timezone,
                currency: 'BRL',
                language: 'pt-BR',
                features: []
              }
            },
            role: result.roles?.[0]?.role as any || 'professional',
            permissions: [],
            active: true
          } : undefined
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      authLogger.error('Erro inesperado no login', error);
      return { 
        success: false, 
        error: 'Erro interno do servidor' 
      };
    }
  },

  async logout(): Promise<void> {
    try {
      authLogger.info('Fazendo logout via Appwrite');
      await unifiedAppwriteAuthService.logout();
      authLogger.info('Logout realizado com sucesso via Appwrite');
    } catch (error) {
      authLogger.error('Erro no logout', error);
      throw error;
    }
  },

  async register(data: RegisterData): Promise<AuthResult> {
    try {
      authLogger.info('Tentando registrar usuário via Appwrite', { email: data.email });
      
      const result = await unifiedAppwriteAuthService.register({
        email: data.email,
        password: data.password,
        nomeCompleto: data.name
      });

      if (result.success) {
        authLogger.info('Registro realizado com sucesso via Appwrite');
        
        // Mapear para interface compatível
        return {
          success: true,
          user: result.user ? {
            id: result.user.$id,
            email: result.user.email,
            name: result.user.name,
            emailVerified: result.user.emailVerification,
            active: result.user.status,
            createdAt: new Date(result.user.registration),
            updatedAt: new Date(result.user.passwordUpdate),
            loginAttempts: 0
          } : undefined,
          profile: result.profile ? {
            id: result.profile.$id,
            email: result.profile.email,
            nome_completo: result.profile.nomeCompleto,
            telefone: result.profile.telefone,
            avatar_url: result.profile.avatarUrl,
            primeiro_acesso: result.profile.primeiroAcesso,
            onboarding_step: result.profile.onboardingStep,
            onboarding_completed_at: result.profile.onboardingCompletedAt,
            ativo: result.profile.ativo,
            criado_em: result.profile.criadoEm,
            atualizado_em: result.profile.atualizadoEm
          } : undefined
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      authLogger.error('Erro inesperado no registro', error);
      return { 
        success: false, 
        error: 'Erro interno do servidor' 
      };
    }
  },

  async refreshTokens(): Promise<AuthResult> {
    try {
      authLogger.info('Renovando sessão via Appwrite');
      
      const result = await unifiedAppwriteAuthService.refreshSession();

      if (result.success) {
        authLogger.info('Sessão renovada com sucesso via Appwrite');
        return {
          success: true,
          user: result.user ? {
            id: result.user.$id,
            email: result.user.email,
            name: result.user.name,
            emailVerified: result.user.emailVerification,
            active: result.user.status,
            createdAt: new Date(result.user.registration),
            updatedAt: new Date(result.user.passwordUpdate),
            loginAttempts: 0
          } : undefined
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      authLogger.error('Erro inesperado ao renovar sessão', error);
      return { 
        success: false, 
        error: 'Erro interno do servidor' 
      };
    }
  },

  async switchClinic(clinicId: string): Promise<boolean> {
    try {
      authLogger.info('Trocando clínica via Appwrite', { clinicId });
      
      const success = await unifiedAppwriteAuthService.switchClinic(clinicId);
      
      if (success) {
        authLogger.info('Clínica trocada com sucesso via Appwrite');
      }
      
      return success;
    } catch (error) {
      authLogger.error('Erro ao trocar clínica', error);
      return false;
    }
  }
};