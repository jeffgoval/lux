// Cliente API SIMPLES - substitui o Supabase
// SEM RLS, SEM COMPLICAÇÃO!

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  nome_completo: string;
  telefone?: string;
}

interface User {
  id: string;
  email: string;
  nome_completo: string;
  telefone?: string;
  roles: Array<{
    role: string;
    clinica_id?: string;
    ativo: boolean;
  }>;
}

interface Clinica {
  id: string;
  nome: string;
  cnpj?: string;
  endereco?: any;
  telefone?: string;
  email?: string;
  horario_funcionamento?: any;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    this.token = localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  // ========== AUTH ==========
  
  async login(credentials: LoginData): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data) {
      this.token = response.data.token;
      localStorage.setItem('auth_token', response.data.token);
    }

    return response;
  }

  async register(userData: RegisterData): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout(): Promise<void> {
    if (this.token) {
      await this.request('/auth/logout', { method: 'POST' });
    }
    
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/auth/me');
  }

  // ========== USERS ==========
  
  async getUserProfile(): Promise<ApiResponse<User>> {
    return this.request<User>('/users/profile');
  }

  async updateUserProfile(data: { nome_completo: string; telefone?: string }): Promise<ApiResponse<User>> {
    return this.request<User>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ========== CLINICAS ==========
  
  async getClinicas(): Promise<ApiResponse<Clinica[]>> {
    return this.request<Clinica[]>('/clinicas');
  }

  async getClinica(id: string): Promise<ApiResponse<Clinica>> {
    return this.request<Clinica>(`/clinicas/${id}`);
  }

  async createClinica(data: Partial<Clinica>): Promise<ApiResponse<Clinica>> {
    return this.request<Clinica>('/clinicas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClinica(id: string, data: Partial<Clinica>): Promise<ApiResponse<Clinica>> {
    return this.request<Clinica>(`/clinicas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ========== HELPERS ==========
  
  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }
}

// Instância singleton
export const apiClient = new ApiClient();

// Tipos exportados
export type { User, Clinica, LoginData, RegisterData, ApiResponse };
