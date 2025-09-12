# Design Document

## Overview

A reconstrução do banco de dados Supabase será realizada através de um script SQL consolidado que recria toda a estrutura do sistema de clínicas estéticas. O design foca em consolidar as 80+ migrações existentes em um script único e eficiente, garantindo que todas as dependências sejam respeitadas e que o sistema funcione corretamente após a reconstrução.

## Architecture

### Database Structure Layers

1. **Foundation Layer**: Tipos ENUM, extensões e configurações básicas
2. **Core Tables Layer**: Tabelas principais (users, profiles, organizacoes, clinicas)
3. **Business Logic Layer**: Tabelas de negócio (prontuarios, produtos, equipamentos)
4. **Security Layer**: Políticas RLS, funções de segurança e triggers
5. **Data Layer**: Dados de exemplo e configurações iniciais

### Key Components

- **Authentication System**: Integração com Supabase Auth
- **Multi-tenancy**: Suporte a organizações e clínicas independentes
- **Medical Records**: Sistema completo de prontuários médicos
- **Inventory Management**: Gestão de produtos e equipamentos
- **Image Storage**: Sistema seguro para imagens médicas
- **Audit System**: Rastreamento completo de operações

## Components and Interfaces

### 1. User Management System

**Tables:**
- `auth.users` (Supabase managed)
- `public.profiles` - Perfis de usuário
- `public.user_roles` - Sistema de roles e permissões

**Key Functions:**
- `handle_new_user()` - Criação automática de perfil e role
- `user_has_role()` - Verificação de permissões
- `get_user_role_in_context()` - Role contextual por organização/clínica

### 2. Organization & Clinic Management

**Tables:**
- `public.organizacoes` - Organizações (grupos de clínicas)
- `public.clinicas` - Clínicas individuais
- `public.profissionais` - Profissionais das clínicas
- `public.profissionais_especialidades` - Especialidades dos profissionais

**Key Functions:**
- `create_clinic_for_onboarding()` - Criação de clínica durante onboarding

### 3. Medical Records System

**Tables:**
- `public.prontuarios` - Prontuários médicos principais
- `public.sessoes_atendimento` - Sessões de atendimento
- `public.imagens_medicas` - Imagens médicas seguras
- `public.consentimentos_digitais` - Consentimentos digitais
- `public.templates_procedimentos` - Templates de procedimentos

**Key Functions:**
- `gerar_numero_prontuario()` - Geração automática de números
- `log_auditoria()` - Auditoria automática de operações

### 4. Inventory & Equipment Management

**Tables:**
- `public.produtos` - Produtos e insumos
- `public.fornecedores` - Fornecedores
- `public.movimentacao_estoque` - Movimentações de estoque
- `public.equipamentos` - Equipamentos médicos
- `public.manutencoes_equipamento` - Manutenções
- `public.uso_equipamentos` - Registro de uso

### 5. Storage System

**Buckets:**
- `imagens-medicas` - Armazenamento seguro de imagens médicas

**Policies:**
- Acesso restrito por usuário
- Organização por pastas de usuário
- Controle de tipos de arquivo e tamanho

## Data Models

### Core Enums

```sql
-- User roles with hierarchy
CREATE TYPE user_role_type AS ENUM (
  'super_admin',
  'proprietaria', 
  'gerente',
  'profissionais',
  'recepcionistas',
  'visitante'
);

-- Medical specialties
CREATE TYPE especialidade_medica AS ENUM (
  'dermatologia',
  'cirurgia_plastica'
);

-- Aesthetic specialties
CREATE TYPE especialidade_estetica AS ENUM (
  'esteticista',
  'micropigmentacao',
  'design_sobrancelhas',
  -- ... outros
);

-- Procedure types
CREATE TYPE tipo_procedimento AS ENUM (
  'botox_toxina',
  'preenchimento',
  'harmonizacao_facial',
  'laser_ipl',
  'peeling',
  'tratamento_corporal',
  'consulta',
  'avaliacao'
);
```

### Key Relationships

- Users → Profiles (1:1)
- Users → UserRoles (1:N)
- Organizations → Clinics (1:N)
- Clinics → Professionals (1:N)
- Patients → MedicalRecords (1:N)
- MedicalRecords → Sessions (1:N)
- Sessions → MedicalImages (1:N)

## Error Handling

### Database Level
- Constraints para integridade referencial
- Check constraints para validação de dados
- Triggers para auditoria automática

### Application Level
- Políticas RLS para controle de acesso
- Funções SECURITY DEFINER para operações críticas
- Tratamento de exceções em funções PL/pgSQL

### Recovery Mechanisms
- Backup automático de dados críticos
- Versionamento de prontuários médicos
- Log de auditoria para rastreabilidade

## Testing Strategy

### Database Testing
1. **Structure Validation**: Verificar se todas as tabelas foram criadas
2. **Constraint Testing**: Testar integridade referencial
3. **RLS Policy Testing**: Verificar políticas de segurança
4. **Function Testing**: Testar todas as funções críticas

### Integration Testing
1. **Auth Flow**: Testar criação automática de perfil/role
2. **Onboarding Flow**: Testar criação de clínica
3. **CRUD Operations**: Testar operações básicas em todas as tabelas
4. **Storage Testing**: Testar upload e acesso a imagens

### Performance Testing
1. **Query Performance**: Verificar índices e performance de consultas
2. **Concurrent Access**: Testar acesso simultâneo
3. **Large Dataset**: Testar com volume de dados realista

## Implementation Phases

### Phase 1: Foundation Setup
- Criar tipos ENUM
- Configurar extensões necessárias
- Criar tabelas base (profiles, user_roles)

### Phase 2: Core Business Tables
- Criar organizações e clínicas
- Implementar sistema de prontuários
- Configurar produtos e equipamentos

### Phase 3: Security & Functions
- Implementar políticas RLS
- Criar funções de negócio
- Configurar triggers de auditoria

### Phase 4: Storage & Data
- Configurar buckets de storage
- Inserir dados de exemplo
- Configurar templates padrão

### Phase 5: Validation & Testing
- Executar testes de validação
- Verificar funcionalidades críticas
- Documentar resultados