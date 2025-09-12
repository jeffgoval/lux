# Design Document

## Overview

Este documento descreve o design da solução para corrigir completamente o sistema de autenticação e onboarding do SaaS de clínicas estéticas. A solução aborda três problemas principais:

1. **Tabelas faltantes**: Algumas tabelas essenciais não existem ou estão incompletas
2. **Políticas RLS inadequadas**: As políticas de Row Level Security estão bloqueando operações legítimas durante o onboarding
3. **Fluxo de onboarding incompleto**: O processo não consegue finalizar devido aos problemas acima

A solução implementará uma abordagem híbrida que mantém a segurança mas permite o onboarding funcionar corretamente.

## Architecture

### Database Layer
```
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                           │
├─────────────────────────────────────────────────────────────┤
│  Core Tables:                                               │
│  ├── profiles (user basic info)                            │
│  ├── user_roles (user permissions)                         │
│  ├── clinicas (clinic information)                         │
│  ├── profissionais (professional data)                     │
│  └── clinica_profissionais (clinic-professional link)      │
│                                                             │
│  Supporting Tables:                                         │
│  ├── templates_procedimentos (procedure templates)         │
│  └── especialidades_medicas (medical specialties)          │
│                                                             │
│  RLS Policies:                                              │
│  ├── Permissive policies for onboarding                    │
│  ├── Restrictive policies for normal operations            │
│  └── Admin override policies                               │
└─────────────────────────────────────────────────────────────┘
```

### Backend API Layer
```
┌─────────────────────────────────────────────────────────────┐
│                    Backend API Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Authentication Routes:                                     │
│  ├── POST /api/auth/register                               │
│  ├── POST /api/auth/login                                  │
│  ├── GET /api/auth/me                                      │
│  └── POST /api/auth/complete-onboarding                    │
│                                                             │
│  Onboarding Routes:                                         │
│  ├── POST /api/onboarding/create-profile                   │
│  ├── POST /api/onboarding/create-clinic                    │
│  ├── POST /api/onboarding/create-professional              │
│  └── POST /api/onboarding/finalize                         │
│                                                             │
│  Middleware:                                                │
│  ├── Authentication middleware                              │
│  ├── Error handling middleware                              │
│  └── Transaction management                                 │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Database Schema Manager

**Responsabilidade**: Garantir que todas as tabelas necessárias existam com a estrutura correta.

**Interface**:
```sql
-- Function to create all missing tables
CREATE OR REPLACE FUNCTION create_missing_tables()
RETURNS JSONB;

-- Function to verify table integrity
CREATE OR REPLACE FUNCTION verify_table_integrity()
RETURNS JSONB;
```

**Tabelas Essenciais**:
- `profiles`: Informações básicas do usuário
- `user_roles`: Roles e permissões do usuário
- `clinicas`: Dados das clínicas
- `profissionais`: Dados profissionais dos usuários
- `clinica_profissionais`: Relacionamento entre profissionais e clínicas
- `templates_procedimentos`: Templates de procedimentos
- `especialidades_medicas`: Especialidades médicas disponíveis

### 2. RLS Policy Manager

**Responsabilidade**: Configurar políticas RLS que permitam onboarding mas mantenham segurança.

**Interface**:
```sql
-- Function to setup onboarding-friendly policies
CREATE OR REPLACE FUNCTION setup_onboarding_policies()
RETURNS VOID;

-- Function to setup production policies
CREATE OR REPLACE FUNCTION setup_production_policies()
RETURNS VOID;
```

**Estratégia de Políticas**:
- **Onboarding Mode**: Políticas permissivas para novos usuários
- **Production Mode**: Políticas restritivas para operação normal
- **Admin Override**: Políticas especiais para administradores

### 3. Onboarding Service

**Responsabilidade**: Gerenciar o fluxo completo de onboarding em transações atômicas.

**Interface**:
```javascript
class OnboardingService {
  async createUserProfile(userData);
  async createUserRole(userId, role);
  async createClinic(clinicData, ownerId);
  async createProfessional(professionalData, userId);
  async linkProfessionalToClinic(professionalId, clinicId);
  async createDefaultTemplates(clinicId);
  async completeOnboarding(onboardingData);
}
```

### 4. Transaction Manager

**Responsabilidade**: Garantir que todas as operações de onboarding sejam atômicas.

**Interface**:
```javascript
class TransactionManager {
  async executeInTransaction(operations);
  async rollbackOnError(error, context);
  async validateTransactionResult(result);
}
```

## Data Models

### User Profile Model
```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nome_completo TEXT NOT NULL,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### User Roles Model
```sql
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'proprietaria', 'gerente', 'profissionais', 'recepcionistas', 'visitante', 'cliente')),
  clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);
```

### Clinic Model
```sql
CREATE TABLE IF NOT EXISTS public.clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  endereco JSONB,
  telefone_principal TEXT,
  email_contato TEXT,
  horario_funcionamento JSONB,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### Professional Model
```sql
CREATE TABLE IF NOT EXISTS public.profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registro_profissional TEXT NOT NULL,
  especialidades TEXT[],
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT profissionais_unique_user UNIQUE (user_id)
);
```

### Clinic-Professional Relationship Model
```sql
CREATE TABLE IF NOT EXISTS public.clinica_profissionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cargo TEXT NOT NULL DEFAULT 'Profissional',
  especialidades TEXT[],
  pode_criar_prontuarios BOOLEAN DEFAULT false,
  pode_editar_prontuarios BOOLEAN DEFAULT false,
  pode_visualizar_financeiro BOOLEAN DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clinica_id, user_id)
);
```

## Error Handling

### Error Categories

1. **Database Errors**
   - Missing tables
   - Constraint violations
   - Connection failures

2. **RLS Policy Errors**
   - Permission denied
   - Policy violations
   - Role conflicts

3. **Business Logic Errors**
   - Duplicate registrations
   - Invalid data
   - Workflow violations

### Error Handling Strategy

```javascript
class ErrorHandler {
  static handleDatabaseError(error) {
    if (error.code === '42P01') { // Table doesn't exist
      return { type: 'MISSING_TABLE', action: 'CREATE_TABLES' };
    }
    if (error.code === '42501') { // RLS violation
      return { type: 'RLS_VIOLATION', action: 'ADJUST_POLICIES' };
    }
    return { type: 'UNKNOWN_DB_ERROR', action: 'LOG_AND_RETRY' };
  }

  static handleBusinessError(error) {
    if (error.constraint === 'unique_email') {
      return { type: 'DUPLICATE_EMAIL', action: 'SUGGEST_LOGIN' };
    }
    return { type: 'BUSINESS_RULE_VIOLATION', action: 'VALIDATE_INPUT' };
  }
}
```

### Retry Logic

```javascript
class RetryManager {
  static async withRetry(operation, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
```

## Testing Strategy

### Unit Tests

1. **Database Schema Tests**
   - Verify all tables exist
   - Validate constraints and relationships
   - Test data integrity

2. **RLS Policy Tests**
   - Test onboarding permissions
   - Verify security restrictions
   - Test admin overrides

3. **Service Layer Tests**
   - Test onboarding flow
   - Validate error handling
   - Test transaction rollbacks

### Integration Tests

1. **End-to-End Onboarding Tests**
   - Complete user registration flow
   - Clinic creation and setup
   - Professional profile creation
   - Template initialization

2. **Error Recovery Tests**
   - Database connection failures
   - Partial transaction failures
   - RLS policy violations

### Performance Tests

1. **Database Performance**
   - Query execution times
   - Index effectiveness
   - Connection pooling

2. **API Performance**
   - Response times
   - Concurrent user handling
   - Memory usage

## Implementation Phases

### Phase 1: Database Foundation
1. Create all missing tables
2. Setup basic RLS policies
3. Create necessary indexes
4. Implement audit logging

### Phase 2: Onboarding Service
1. Implement onboarding API endpoints
2. Add transaction management
3. Implement error handling
4. Add retry logic

### Phase 3: Security Hardening
1. Implement production RLS policies
2. Add input validation
3. Implement rate limiting
4. Add security monitoring

### Phase 4: Testing and Validation
1. Comprehensive testing suite
2. Performance optimization
3. Security audit
4. Documentation completion

## Security Considerations

### Authentication
- JWT token validation
- Password hashing with bcrypt
- Session management
- Token expiration handling

### Authorization
- Role-based access control
- Resource-level permissions
- RLS policy enforcement
- Admin privilege separation

### Data Protection
- Input sanitization
- SQL injection prevention
- XSS protection
- Data encryption at rest

### Audit and Monitoring
- User action logging
- Security event monitoring
- Performance metrics
- Error tracking