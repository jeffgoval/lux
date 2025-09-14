# Plano de Migração: Supabase → DigitalOcean

## Fase 1: Infraestrutura (1-2 dias)

### 1.1 DigitalOcean Setup
- [ ] Criar conta DigitalOcean
- [ ] Configurar Managed PostgreSQL Database
- [ ] Setup App Platform ou Droplets
- [ ] Configurar domínio e SSL

### 1.2 Database Migration
```sql
-- Exportar schema do Supabase
pg_dump --schema-only supabase_db > schema.sql

-- Importar no DigitalOcean
psql -h your-db-host -U username -d database < schema.sql
```

### 1.3 Environment Setup
```env
# .env.production
DATABASE_URL=postgresql://user:pass@db-host:25060/db
JWT_SECRET=your-jwt-secret
REDIS_URL=redis://redis-host:25061
```

## Fase 2: Backend Development (3-5 dias)

### 2.1 API Structure
```
backend/
├── src/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
├── prisma/
│   └── schema.prisma
└── package.json
```

### 2.2 Core Services
- [ ] Authentication service
- [ ] User management
- [ ] Clinic management
- [ ] Medical records
- [ ] File upload service

## Fase 3: Frontend Adaptation (2-3 dias)

### 3.1 API Client
```typescript
// services/api.ts
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  async request(endpoint: string, options?: RequestInit) {
    // Implementation
  }

  // Auth methods
  async login(credentials: LoginData) { }
  async logout() { }
  
  // Resource methods
  async getClinicas() { }
  async createClinica(data: ClinicaData) { }
}
```

### 3.2 Context Updates
```typescript
// contexts/AuthContext.tsx - Updated for custom API
const AuthProvider = ({ children }) => {
  // Replace Supabase calls with API calls
};
```

## Fase 4: Testing & Deployment (1-2 dias)

### 4.1 Testing Checklist
- [ ] Authentication flow
- [ ] CRUD operations
- [ ] File uploads
- [ ] Role-based access
- [ ] Data integrity

### 4.2 Deployment
- [ ] Backend deployment
- [ ] Frontend deployment
- [ ] Database migration
- [ ] DNS configuration

## Estimativa Total: 7-12 dias