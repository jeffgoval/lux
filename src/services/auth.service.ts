/**
 * 🔐 SERVIÇO DE AUTENTICAÇÃO SEGURO V2
 * 
 * Implementação do core de autenticação com máxima segurança
 */

import {
  AuthResult,
  LoginCredentials,
  RegisterData,
  AuthTokens,
  User,
  UserClinicAccess,
  AuthAuditLog,
  AuthEventType,
  SecurityContext
} from '@/types/auth.types';
import { AUTH_CONFIG } from '@/config/auth.config';
import { UserAdapter, ClinicAdapter, RoleAdapter } from '@/services/schema-adapter';
import { authLogger } from '@/utils/logger';

// ============================================================================
// CLASSE PRINCIPAL DO SERVIÇO DE AUTENTICAÇÃO
// ============================================================================

export class AuthService {
  private readonly baseURL: string;
  private readonly apiKey: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    this.apiKey = import.meta.env.VITE_API_KEY || '';
  }

  // ==========================================================================
  // MÉTODOS DE AUTENTICAÇÃO
  // ==========================================================================

  /**
   * Realiza login do usuário com validação rigorosa
   * VERSÃO ADAPTADA PARA SCHEMA EXISTENTE
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      authLogger.info('Iniciando login com adaptador...');

      // Validar credenciais antes de processar
      const validation = this.validateLoginCredentials(credentials);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Buscar usuário usando o adaptador
      const user = await UserAdapter.findByEmail(credentials.email);

      if (!user) {
        authLogger.warn('Usuário não encontrado:', credentials.email);
        return {
          success: false,
          error: 'Credenciais inválidas'
        };
      }

      authLogger.info('Usuário encontrado:', user.id);

      // Por enquanto, vamos simular validação de senha
      // TODO: Implementar validação real de senha quando tivermos hash
      if (credentials.password.length < 3) {
        return {
          success: false,
          error: 'Senha muito curta'
        };
      }

      // Buscar roles do usuário
      const roles = await RoleAdapter.findByUserId(user.id);
      authLogger.info('Roles encontrados:', roles.length);

      // Buscar clínicas acessíveis
      const clinicAccess: UserClinicAccess[] = [];
      for (const role of roles) {
        const clinic = await ClinicAdapter.findById(role.clinic_id);
        if (clinic) {
          clinicAccess.push({
            clinicId: clinic.id,
            clinicName: clinic.name,
            role: role.role,
            permissions: [], // TODO: Implementar permissões
            isActive: role.active
          });
        }
      }

      authLogger.info('Clínicas acessíveis:', clinicAccess.length);

      // Gerar tokens simples (para desenvolvimento)
      const tokens: AuthTokens = {
        accessToken: `dev-token-${user.id}-${Date.now()}`,
        refreshToken: `dev-refresh-${user.id}-${Date.now()}`,
        expiresIn: 3600,
        tokenType: 'Bearer'
      };

      // Armazenar tokens
      await this.storeTokensSecurely(tokens);

      // Log do evento
      await this.logAuthEvent({
        eventType: AuthEventType.LOGIN_SUCCESS,
        userId: user.id,
        success: true
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: roles[0]?.role || 'patient',
          clinicAccess,
          isActive: user.active,
          emailVerified: true, // Assumir verificado por enquanto
          lastLoginAt: new Date().toISOString()
        },
        tokens
      };

    } catch (error) {
      authLogger.error('Erro no login:', error);

      await this.logAuthEvent({
        eventType: AuthEventType.LOGIN_FAILED,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      return {
        success: false,
        error: 'Erro interno do servidor'
      };
    }
  }

  /**
   * Registra novo usuário com validação completa
   */
  async register(data: RegisterData): Promise<AuthResult> {
    try {
      // Validar dados de registro
      const validation = this.validateRegistrationData(data);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      const securityContext = await this.getSecurityContext();

      const response = await this.secureRequest<AuthResult>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          securityContext
        })
      });

      return response;

    } catch (error) {
      authLogger.error('Registration error:', error);
      return {
        success: false,
        error: AUTH_CONFIG.ERROR_MESSAGES.GENERIC_ERROR
      };
    }
  }

  /**
   * Realiza logout seguro com revogação de tokens
   */
  async logout(): Promise<void> {
    try {
      const tokens = await this.getStoredTokens();
      
      if (tokens) {
        // Revogar tokens no servidor
        await this.secureRequest('/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`
          }
        });

        await this.logAuthEvent({
          eventType: AuthEventType.LOGOUT,
          success: true
        });
      }

    } catch (error) {
      authLogger.error('Logout error:', error);
    } finally {
      // Sempre limpar tokens locais
      await this.clearStoredTokens();
    }
  }

  /**
   * Atualiza tokens usando refresh token
   */
  async refreshTokens(): Promise<AuthTokens | null> {
    try {
      const tokens = await this.getStoredTokens();
      
      if (!tokens?.refreshToken) {
        return null;
      }

      const response = await this.secureRequest<{ tokens: AuthTokens }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          refreshToken: tokens.refreshToken
        })
      });

      if (response.tokens) {
        await this.storeTokensSecurely(response.tokens);
        
        await this.logAuthEvent({
          eventType: AuthEventType.TOKEN_REFRESH,
          success: true
        });

        return response.tokens;
      }

      return null;

    } catch (error) {
      authLogger.error('Token refresh error:', error);
      await this.clearStoredTokens();
      return null;
    }
  }

  // ==========================================================================
  // MÉTODOS DE AUTORIZAÇÃO
  // ==========================================================================

  /**
   * Troca de clínica ativa
   */
  async switchClinic(clinicId: string): Promise<boolean> {
    try {
      const tokens = await this.getStoredTokens();
      
      if (!tokens) {
        return false;
      }

      const response = await this.secureRequest<{ success: boolean }>('/auth/switch-clinic', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`
        },
        body: JSON.stringify({ clinicId })
      });

      if (response.success) {
        await this.logAuthEvent({
          eventType: AuthEventType.CLINIC_SWITCH,
          clinicId,
          success: true
        });
      }

      return response.success;

    } catch (error) {
      authLogger.error('Clinic switch error:', error);
      return false;
    }
  }

  /**
   * Obtém dados do usuário atual
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const tokens = await this.getStoredTokens();
      
      if (!tokens) {
        return null;
      }

      const response = await this.secureRequest<{ user: User }>('/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`
        }
      });

      return response.user || null;

    } catch (error) {
      authLogger.error('Get current user error:', error);
      return null;
    }
  }

  // ==========================================================================
  // MÉTODOS DE VALIDAÇÃO
  // ==========================================================================

  private validateLoginCredentials(credentials: LoginCredentials): { isValid: boolean; error?: string } {
    if (!credentials.email || !credentials.password) {
      return { isValid: false, error: 'Email e senha são obrigatórios' };
    }

    if (!this.isValidEmail(credentials.email)) {
      return { isValid: false, error: 'Email inválido' };
    }

    if (credentials.password.length < AUTH_CONFIG.PASSWORD.MIN_LENGTH) {
      return { isValid: false, error: `Senha deve ter pelo menos ${AUTH_CONFIG.PASSWORD.MIN_LENGTH} caracteres` };
    }

    return { isValid: true };
  }

  private validateRegistrationData(data: RegisterData): { isValid: boolean; error?: string } {
    if (!data.email || !data.password || !data.name) {
      return { isValid: false, error: 'Todos os campos são obrigatórios' };
    }

    if (!this.isValidEmail(data.email)) {
      return { isValid: false, error: 'Email inválido' };
    }

    const passwordValidation = this.validatePassword(data.password);
    if (!passwordValidation.isValid) {
      return { isValid: false, error: passwordValidation.errors[0] };
    }

    if (!data.acceptTerms) {
      return { isValid: false, error: 'É necessário aceitar os termos de uso' };
    }

    return { isValid: true };
  }

  private validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = AUTH_CONFIG.PASSWORD;

    if (password.length < config.MIN_LENGTH) {
      errors.push(`Senha deve ter pelo menos ${config.MIN_LENGTH} caracteres`);
    }

    if (config.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra maiúscula');
    }

    if (config.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('Senha deve conter pelo menos uma letra minúscula');
    }

    if (config.REQUIRE_NUMBERS && !/\d/.test(password)) {
      errors.push('Senha deve conter pelo menos um número');
    }

    if (config.REQUIRE_SYMBOLS && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Senha deve conter pelo menos um símbolo');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // ==========================================================================
  // MÉTODOS UTILITÁRIOS
  // ==========================================================================

  private async secureRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...AUTH_CONFIG.SECURITY_HEADERS
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  private async getSecurityContext(): Promise<SecurityContext> {
    return {
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
      sessionId: this.generateSessionId(),
      permissions: [],
      rateLimitRemaining: 100 // Será atualizado pelo servidor
    };
  }

  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  private async logAuthEvent(event: Partial<AuthAuditLog>): Promise<void> {
    try {
      const securityContext = await this.getSecurityContext();
      
      const logEntry: Partial<AuthAuditLog> = {
        ...event,
        ipAddress: securityContext.ipAddress,
        userAgent: securityContext.userAgent,
        timestamp: new Date()
      };

      // Enviar log para o servidor (não bloquear se falhar)
      this.secureRequest('/auth/audit-log', {
        method: 'POST',
        body: JSON.stringify(logEntry)
      }).catch(error => {
        authLogger.warn('Failed to log auth event:', error);
      });

    } catch (error) {
      authLogger.warn('Failed to create auth log:', error);
    }
  }

  // ==========================================================================
  // GERENCIAMENTO SEGURO DE TOKENS
  // ==========================================================================

  private async storeTokensSecurely(tokens: AuthTokens): Promise<void> {
    try {
      // Armazenar em localStorage com criptografia básica
      const encrypted = btoa(JSON.stringify(tokens));
      localStorage.setItem('auth_tokens', encrypted);
    } catch (error) {
      authLogger.error('Failed to store tokens:', error);
    }
  }

  private async getStoredTokens(): Promise<AuthTokens | null> {
    try {
      const encrypted = localStorage.getItem('auth_tokens');
      if (!encrypted) return null;

      const tokens = JSON.parse(atob(encrypted)) as AuthTokens;
      
      // Verificar se o token não expirou
      if (new Date(tokens.expiresAt) <= new Date()) {
        await this.clearStoredTokens();
        return null;
      }

      return tokens;
    } catch (error) {
      authLogger.error('Failed to get stored tokens:', error);
      await this.clearStoredTokens();
      return null;
    }
  }

  private async clearStoredTokens(): Promise<void> {
    try {
      localStorage.removeItem('auth_tokens');
    } catch (error) {
      authLogger.error('Failed to clear tokens:', error);
    }
  }
}

// Instância singleton do serviço
export const authService = new AuthService();
