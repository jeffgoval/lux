# Requirements Document

## Introduction

O banco de dados Supabase foi resetado acidentalmente e precisa ser completamente reconstruído. Com base na análise das migrações existentes e arquivos SQL de correção, o sistema é uma plataforma completa para clínicas estéticas que inclui gestão de usuários, organizações, clínicas, prontuários médicos, equipamentos, produtos, e muito mais.

## Requirements

### Requirement 1

**User Story:** Como proprietária de clínica, eu quero que o banco de dados seja reconstruído com todas as tabelas e estruturas necessárias, para que eu possa voltar a usar o sistema normalmente.

#### Acceptance Criteria

1. WHEN o script de reconstrução for executado THEN todas as tabelas principais devem ser criadas (users, profiles, user_roles, organizacoes, clinicas, prontuarios, etc.)
2. WHEN as tabelas forem criadas THEN todos os tipos ENUM necessários devem estar definidos (user_role_type, especialidade_medica, categoria_produto, etc.)
3. WHEN a estrutura for criada THEN todas as políticas RLS (Row Level Security) devem estar configuradas corretamente
4. WHEN o banco for reconstruído THEN todas as funções e triggers necessários devem estar funcionando

### Requirement 2

**User Story:** Como desenvolvedor, eu quero que todas as migrações existentes sejam consolidadas em um script único, para que a reconstrução seja mais eficiente e confiável.

#### Acceptance Criteria

1. WHEN o script de consolidação for criado THEN ele deve incluir todas as estruturas das migrações existentes
2. WHEN o script for executado THEN não deve haver conflitos ou erros de dependência
3. WHEN a reconstrução for concluída THEN o banco deve estar no mesmo estado que estava antes do reset
4. WHEN o sistema for testado THEN todas as funcionalidades principais devem estar operacionais

### Requirement 3

**User Story:** Como usuário do sistema, eu quero que os dados de exemplo sejam restaurados, para que eu possa testar o sistema imediatamente após a reconstrução.

#### Acceptance Criteria

1. WHEN o script de dados for executado THEN organizações e clínicas de exemplo devem ser criadas
2. WHEN os dados forem inseridos THEN produtos, equipamentos e fornecedores de exemplo devem estar disponíveis
3. WHEN a restauração for concluída THEN templates de procedimentos padrão devem estar configurados
4. WHEN o sistema for acessado THEN usuários de teste devem conseguir fazer login e navegar

### Requirement 4

**User Story:** Como administrador do sistema, eu quero que as configurações de storage e buckets sejam recriadas, para que o upload de imagens médicas funcione corretamente.

#### Acceptance Criteria

1. WHEN o storage for configurado THEN o bucket 'imagens-medicas' deve ser criado com as configurações corretas
2. WHEN as políticas de storage forem aplicadas THEN apenas usuários autenticados devem ter acesso às imagens
3. WHEN um usuário fizer upload THEN as imagens devem ser organizadas por pastas de usuário
4. WHEN as imagens forem acessadas THEN as políticas de segurança devem ser respeitadas

### Requirement 5

**User Story:** Como proprietária de clínica, eu quero que o sistema de onboarding funcione corretamente após a reconstrução, para que novos usuários possam se cadastrar e criar suas clínicas.

#### Acceptance Criteria

1. WHEN um novo usuário se cadastrar THEN um perfil deve ser criado automaticamente
2. WHEN o perfil for criado THEN uma role 'proprietaria' deve ser atribuída por padrão
3. WHEN a proprietária criar uma clínica THEN ela deve ter permissões completas sobre a clínica
4. WHEN o onboarding for concluído THEN a função create_clinic_for_onboarding deve funcionar corretamente