# Requirements Document

## Introduction

Durante o processo de cadastro de novos usuários, o sistema está solicitando login novamente antes mesmo de finalizar o cadastro. Após análise do código e das migrações do Supabase, identifiquei que o problema está relacionado ao fluxo de autenticação e criação automática de perfis e roles. O sistema precisa ser corrigido para permitir que usuários completem o processo de cadastro sem interrupções.

## Requirements

### Requirement 1

**User Story:** Como um novo usuário, eu quero conseguir completar todo o processo de cadastro sem ser solicitado a fazer login novamente, para que eu possa acessar o sistema normalmente.

#### Acceptance Criteria

1. WHEN um usuário se cadastra THEN o sistema SHALL criar automaticamente o perfil do usuário na tabela `profiles`
2. WHEN um usuário se cadastra THEN o sistema SHALL criar automaticamente um role 'proprietaria' na tabela `user_roles`
3. WHEN um usuário completa o cadastro THEN o sistema SHALL redirecionar para o onboarding sem solicitar novo login
4. WHEN um usuário está no processo de onboarding THEN o sistema SHALL manter a sessão ativa durante todo o processo

### Requirement 2

**User Story:** Como um usuário que está completando o onboarding, eu quero que o sistema mantenha minha sessão ativa durante todo o processo, para que eu não precise fazer login novamente.

#### Acceptance Criteria

1. WHEN um usuário está no onboarding THEN o sistema SHALL manter a sessão do Supabase ativa
2. WHEN um usuário completa uma etapa do onboarding THEN o sistema SHALL preservar o estado de autenticação
3. IF ocorrer um erro durante o onboarding THEN o sistema SHALL manter o usuário logado e mostrar mensagem de erro apropriada
4. WHEN o onboarding é finalizado THEN o sistema SHALL atualizar o campo `primeiro_acesso` para false

### Requirement 3

**User Story:** Como desenvolvedor, eu quero que o sistema tenha políticas RLS (Row Level Security) adequadas para permitir que novos usuários criem seus dados iniciais, para que o processo de cadastro funcione corretamente.

#### Acceptance Criteria

1. WHEN um novo usuário é criado THEN as políticas RLS SHALL permitir a criação do perfil
2. WHEN um usuário com role 'proprietaria' cria uma clínica THEN as políticas RLS SHALL permitir a inserção
3. WHEN um usuário atualiza seu próprio user_role com clinica_id THEN as políticas RLS SHALL permitir a atualização
4. WHEN um usuário cria dados durante o onboarding THEN todas as operações SHALL ser permitidas pelas políticas RLS

### Requirement 4

**User Story:** Como um usuário, eu quero receber feedback claro sobre erros durante o cadastro, para que eu possa entender e resolver problemas rapidamente.

#### Acceptance Criteria

1. WHEN ocorre um erro de permissão THEN o sistema SHALL mostrar mensagem específica sobre permissões
2. WHEN ocorre um erro de dados duplicados THEN o sistema SHALL mostrar mensagem específica sobre duplicação
3. WHEN ocorre um erro de conexão THEN o sistema SHALL mostrar mensagem específica sobre conectividade
4. WHEN ocorre qualquer erro THEN o sistema SHALL manter o usuário logado e permitir nova tentativa