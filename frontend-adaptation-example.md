# Frontend Adaptation para DigitalOcean

## Principais Mudanças Necessárias

### 1. API Client Service
```typescript
// services/api.ts
class ApiClient {
  private baseURL = process.env.VITE_API_URL || 'http://localhost:8000/api';
  private token: string | null = localStorage.getItem('auth_token');

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Auth methods
  async login(email: string, password: string) {
    const data = await this.request<{user: any, token: string}>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    this.token = data.token;
    localStorage.setItem('auth_token', data.token);
    return data;
  }

  async logout() {
    this.token = null;
    localStorage.removeItem('auth_token');
    await this.request('/auth/logout', { method: 'POST' });
  }

  // Resource methods
  async getClinicas() {
    return this.request<Clinica[]>('/clinicas');
  }

  async createClinica(data: Partial<Clinica>) {
    return this.request<Clinica>('/clinicas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getClientes() {
    return this.request<Cliente[]>('/clientes');
  }

  // File upload
  async uploadFile(file: File, type: 'avatar' | 'medical') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return this.request<{url: string}>('/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // Remove Content-Type for FormData
    });
  }
}

export const apiClient = new ApiClient();
```

### 2. Updated Auth Context
```typescript
// contexts/AuthContext.tsx
import { apiClient } from '@/services/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Replace Supabase auth with API calls
  const signIn = async (email: string, password: string) => {
    try {
      const { user, token } = await apiClient.login(email, password);
      setUser(user);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await apiClient.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Check auth status on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const user = await apiClient.request('/auth/me');
          setUser(user);
        } catch (error) {
          localStorage.removeItem('auth_token');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      signIn,
      signOut,
      // ... other methods
    }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### 3. Updated Hooks
```typescript
// hooks/useClinica.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';

export function useClinicas() {
  return useQuery({
    queryKey: ['clinicas'],
    queryFn: () => apiClient.getClinicas(),
  });
}

export function useCreateClinica() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<Clinica>) => apiClient.createClinica(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinicas'] });
    },
  });
}
```

### 4. Environment Variables
```env
# .env.local
VITE_API_URL=https://your-api.digitalocean.app/api
VITE_UPLOAD_URL=https://your-spaces.digitaloceanspaces.com
```

## Arquivos que Precisam ser Modificados

### Principais:
- `src/contexts/AuthContext.tsx` - Substituir Supabase auth
- `src/components/OnboardingWizard.tsx` - Usar API calls
- `src/hooks/useClinica.ts` - Substituir queries Supabase
- `src/hooks/useRoles.ts` - Usar API para roles
- Todos os componentes que fazem queries diretas

### Novos Arquivos:
- `src/services/api.ts` - Cliente API
- `src/types/api.ts` - Tipos da API
- `src/utils/auth.ts` - Utilitários de auth