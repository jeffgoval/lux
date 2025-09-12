# Requirements Document

## Introduction

Este documento define os requisitos para corrigir completamente o sistema de autenticação e onboarding do SaaS de clínicas estéticas. O problema principal é que quando o usuário chega ao final do processo de onboarding e clica no botão "Finalizar", ocorrem erros relacionados a tabelas faltantes ou políticas RLS inadequadas, impedindo a conclusão do cadastro.

## Requirements

### Requirement 1: Estrutura Completa do Banco de Dados

**User Story:** Como desenvolvedor, eu quero que todas as tabelas necessárias para o funcionamento do sistema estejam criadas e configuradas corretamente, para que o processo de onboarding funcione sem erros.

#### Acceptance Criteria

1. WHEN o sistema é inicializado THEN todas as tabelas essenciais (profiles, user_roles, clinicas, profissionais, clinica_profissionais, templates_procedimentos) SHALL estar criadas
2. WHEN uma tabela é criada THEN ela SHALL ter todas as colunas, constraints e relacionamentos necessários
3. WHEN as tabelas são criadas THEN os índices apropriados SHALL ser criados para performance
4. WHEN as tabelas são criadas THEN os triggers de atualização de timestamp SHALL ser configurados

### Requirement 2: Políticas RLS Funcionais para Onboarding

**User Story:** Como usuário novo, eu quero completar o processo de onboarding sem erros de permissão, para que eu possa começar a usar o sistema imediatamente.

#### Acceptance Criteria

1. WHEN um usuário tenta criar seu primeiro role THEN o sistema SHALL permitir a criação sem violações de RLS
2. WHEN um usuário tenta criar sua primeira clínica THEN o sistema SHALL permitir a criação sem violações de RLS
3. WHEN um usuário tenta criar seu perfil profissional THEN o sistema SHALL permitir a criação sem violações de RLS
4. WHEN um usuário tenta vincular-se à clínica criada THEN o sistema SHALL permitir a criação do relacionamento na tabela clinica_profissionais
5. WHEN um template de procedimento é criado THEN o sistema SHALL permitir a criação sem violações de RLS

### Requirement 3: Fluxo de Onboarding Completo

**User Story:** Como usuário, eu quero completar todo o processo de onboarding em uma única sessão, para que eu possa acessar todas as funcionalidades do sistema imediatamente após o cadastro.

#### Acceptance Criteria

1. WHEN o usuário completa o formulário de onboarding THEN o sistema SHALL criar o profile do usuário
2. WHEN o profile é criado THEN o sistema SHALL criar o role 'proprietaria' para o usuário
3. WHEN o role é criado THEN o sistema SHALL criar a clínica com os dados fornecidos
4. WHEN a clínica é criada THEN o sistema SHALL criar o registro profissional do usuário
5. WHEN o registro profissional é criado THEN o sistema SHALL vincular o profissional à clínica na tabela clinica_profissionais
6. WHEN todos os registros são criados THEN o sistema SHALL criar templates básicos de procedimentos
7. WHEN o processo é concluído THEN o usuário SHALL ser redirecionado para o dashboard principal

### Requirement 4: Tratamento de Erros e Validações

**User Story:** Como usuário, eu quero receber mensagens claras sobre qualquer problema durante o onboarding, para que eu possa corrigir os dados se necessário.

#### Acceptance Criteria

1. WHEN ocorre um erro durante o onboarding THEN o sistema SHALL exibir uma mensagem de erro clara e específica
2. WHEN um usuário já possui dados cadastrados THEN o sistema SHALL tratar adequadamente tentativas de duplicação
3. WHEN há falha em uma etapa do onboarding THEN o sistema SHALL permitir retry sem perder dados já salvos
4. WHEN há problemas de conectividade THEN o sistema SHALL implementar retry automático com backoff

### Requirement 5: Validação de Integridade dos Dados

**User Story:** Como administrador do sistema, eu quero garantir que todos os dados criados durante o onboarding estejam íntegros e consistentes, para manter a qualidade dos dados no sistema.

#### Acceptance Criteria

1. WHEN um usuário é criado THEN o sistema SHALL validar que o email é único e válido
2. WHEN uma clínica é criada THEN o sistema SHALL validar que os dados obrigatórios estão presentes
3. WHEN um profissional é vinculado a uma clínica THEN o sistema SHALL validar que ambos existem e estão ativos
4. WHEN templates são criados THEN o sistema SHALL validar que os tipos de procedimento são válidos
5. WHEN qualquer registro é criado THEN o sistema SHALL garantir que as foreign keys são válidas