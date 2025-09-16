# Requirements Document

## Introduction

O sistema de autenticação e onboarding do SaaS de clínicas estéticas apresenta falhas sistêmicas críticas que impedem novos usuários de completarem o processo de cadastro. Após análise completa do código, foram identificados múltiplos problemas: race conditions entre contextos de autenticação, loops infinitos de redirecionamento, políticas RLS inadequadas, tabelas faltantes no banco de dados, e conflitos entre diferentes guards de autenticação. Esta spec define os requisitos para uma solução completa e definitiva desses problemas.

## Requirements

### Requirement 1: Estrutura Completa e Consistente do Banco de Dados

**User Story:** Como desenvolvedor, eu quero que todas as tabelas necessárias para o funcionamento do sistema estejam criadas e configuradas corretamente, para que o processo de onboarding funcione sem erros de tabelas faltantes.

#### Acceptance Criteria

1. WHEN o sistema é inicializado THEN a tabela `clinica_profissionais` SHALL estar criada com todas as colunas necessárias
2. WHEN o sistema é inicializado THEN a tabela `templates_procedimentos` SHALL estar criada com enum `tipo_procedimento`
3. WHEN o sistema é inicializado THEN a tabela `profissionais` SHALL estar criada com estrutura adequada
4. WHEN as tabelas são criadas THEN todas as foreign keys e constraints SHALL estar configuradas corretamente
5. WHEN as tabelas são criadas THEN os índices apropriados SHALL ser criados para performance

### Requirement 2: Políticas RLS Funcionais para Todo o Fluxo de Onboarding

**User Story:** Como usuário novo, eu quero completar o processo de onboarding sem erros de permissão RLS, para que eu possa começar a usar o sistema imediatamente após o cadastro.

#### Acceptance Criteria

1. WHEN um usuário tenta criar seu primeiro role 'proprietaria' THEN o sistema SHALL permitir a criação sem violações de RLS
2. WHEN um usuário tenta criar sua primeira clínica THEN o sistema SHALL permitir a criação sem violações de RLS
3. WHEN um usuário tenta criar seu perfil profissional THEN o sistema SHALL permitir a criação sem violações de RLS
4. WHEN um usuário tenta vincular-se à clínica na tabela clinica_profissionais THEN o sistema SHALL permitir a criação sem violações de RLS
5. WHEN um template de procedimento é criado THEN o sistema SHALL permitir a criação sem violações de RLS
6. WHEN um usuário atualiza seu user_role com clinica_id THEN o sistema SHALL permitir a atualização sem violações de RLS

### Requirement 3: Sistema de Autenticação Unificado e Determinístico

**User Story:** Como usuário, eu quero que o sistema de autenticação seja consistente e previsível, para que eu não seja redirecionado em loops infinitos ou tenha experiências inconsistentes.

#### Acceptance Criteria

1. WHEN existe apenas um contexto de autenticação ativo THEN não SHALL haver conflitos entre AuthContext e SecureAuthContext
2. WHEN existe apenas um guard de autenticação THEN não SHALL haver conflitos entre múltiplos guards
3. WHEN um usuário faz login THEN o sistema SHALL usar uma única fonte de verdade para estado de autenticação
4. WHEN um usuário navega entre páginas THEN o sistema SHALL manter estado consistente sem race conditions
5. WHEN ocorrem verificações de autenticação THEN o sistema SHALL usar lógica determinística sem timeouts excessivos

### Requirement 4: Fluxo de Onboarding Robusto e Completo

**User Story:** Como usuário, eu quero completar todo o processo de onboarding em uma única sessão sem falhas, para que eu possa acessar todas as funcionalidades do sistema imediatamente após o cadastro.

#### Acceptance Criteria

1. WHEN o usuário completa o formulário de onboarding THEN o sistema SHALL criar/atualizar o profile do usuário
2. WHEN o profile é criado THEN o sistema SHALL criar o role 'proprietaria' para o usuário
3. WHEN o role é criado THEN o sistema SHALL criar a clínica com os dados fornecidos
4. WHEN a clínica é criada THEN o sistema SHALL criar o registro profissional do usuário
5. WHEN o registro profissional é criado THEN o sistema SHALL vincular o profissional à clínica na tabela clinica_profissionais
6. WHEN todos os registros são criados THEN o sistema SHALL criar templates básicos de procedimentos
7. WHEN o processo é concluído THEN o sistema SHALL marcar primeiro_acesso como false
8. WHEN o onboarding é finalizado THEN o usuário SHALL ser redirecionado para o dashboard principal sem loops

### Requirement 5: Eliminação de Race Conditions e Loops Infinitos

**User Story:** Como usuário, eu quero que o sistema responda de forma rápida e consistente, para que eu não fique preso em telas de carregamento ou loops de redirecionamento.

#### Acceptance Criteria

1. WHEN múltiplos componentes tentam modificar estado de auth THEN apenas um SHALL ter controle exclusivo
2. WHEN ocorrem verificações de autenticação THEN o sistema SHALL usar cache inteligente para evitar requisições desnecessárias
3. WHEN há mudanças de estado THEN o sistema SHALL propagar mudanças de forma coordenada
4. WHEN ocorrem timeouts THEN o sistema SHALL ter fallbacks determinísticos
5. WHEN há problemas temporários THEN o sistema SHALL implementar retry com backoff sem causar loops

### Requirement 6: Performance e Experiência do Usuário Otimizadas

**User Story:** Como usuário, eu quero que o sistema seja rápido e responsivo, para que minha experiência seja fluida durante todo o processo de cadastro e uso.

#### Acceptance Criteria

1. WHEN um usuário faz login THEN o tempo total SHALL ser menor que 3 segundos
2. WHEN ocorrem verificações de autenticação THEN o sistema SHALL usar no máximo 2 consultas ao banco
3. WHEN há carregamento de dados THEN o sistema SHALL mostrar indicadores de progresso apropriados
4. WHEN ocorrem erros THEN o sistema SHALL mostrar mensagens claras e acionáveis
5. WHEN há operações assíncronas THEN o sistema SHALL coordenar execução para evitar conflitos

### Requirement 7: Tratamento de Erros Robusto e Recuperação Automática

**User Story:** Como usuário, eu quero receber feedback claro sobre qualquer problema e ter o sistema tentando se recuperar automaticamente, para que eu possa resolver problemas rapidamente ou o sistema se corrija sozinho.

#### Acceptance Criteria

1. WHEN ocorre um erro durante o onboarding THEN o sistema SHALL exibir uma mensagem de erro clara e específica
2. WHEN um usuário já possui dados cadastrados THEN o sistema SHALL tratar adequadamente tentativas de duplicação
3. WHEN há falha em uma etapa do onboarding THEN o sistema SHALL permitir retry sem perder dados já salvos
4. WHEN há problemas de conectividade THEN o sistema SHALL implementar retry automático com backoff
5. WHEN dados estão inconsistentes THEN o sistema SHALL tentar recuperação automática antes de falhar

### Requirement 8: Validação de Integridade dos Dados

**User Story:** Como administrador do sistema, eu quero garantir que todos os dados criados durante o onboarding estejam íntegros e consistentes, para manter a qualidade dos dados no sistema.

#### Acceptance Criteria

1. WHEN um usuário é criado THEN o sistema SHALL validar que o email é único e válido
2. WHEN uma clínica é criada THEN o sistema SHALL validar que os dados obrigatórios estão presentes
3. WHEN um profissional é vinculado a uma clínica THEN o sistema SHALL validar que ambos existem e estão ativos
4. WHEN templates são criados THEN o sistema SHALL validar que os tipos de procedimento são válidos
5. WHEN qualquer registro é criado THEN o sistema SHALL garantir que as foreign keys são válidas
6. WHEN o onboarding é concluído THEN o sistema SHALL verificar que todos os dados necessários foram criados corretamente