# Requirements Document - Completar SaaS de Clínicas de Estética

## Introduction

Este documento define os requisitos para **COMPLETAR** a implementação do sistema SaaS multi-tenant para clínicas de estética. Com base na análise detalhada do código atual, identificamos que temos uma interface sofisticada implementada, mas **ZERO estrutura de banco de dados**. O objetivo é criar toda a infraestrutura de dados e conectar com a interface já desenvolvida para que o sistema funcione completamente.

## Situação Atual Identificada

### ✅ **IMPLEMENTADO (70% do Frontend)**
- Interface completa com componentes premium
- Sistema de autenticação e roteamento
- Serviços inteligentes (SmartSchedulingEngine, VIPSchedulingService, etc.)
- Componentes avançados (AgendaViewPremium, DashboardExecutivo, etc.)
- Tipos TypeScript completos
- Design system sofisticado

### ❌ **FALTANDO (100% do Backend)**
- **CRÍTICO**: Migração do banco está vazia
- **CRÍTICO**: Nenhuma tabela existe no Supabase
- **CRÍTICO**: Dados não podem ser salvos/carregados
- Integrações com APIs externas
- Sistema de notificações funcionais
- Relatórios com dados reais

## Requirements

### Requirement 1 - Estrutura de Banco de Dados Completa

**User Story:** Como desenvolvedor, quero que todas as tabelas necessárias sejam criadas no Supabase, para que o sistema possa armazenar e recuperar dados corretamente.

#### Acceptance Criteria

1. WHEN o sistema é inicializado THEN todas as tabelas fundamentais SHALL existir no banco
2. WHEN um usuário se cadastra THEN o sistema SHALL criar automaticamente um perfil na tabela `profiles`
3. WHEN dados são inseridos THEN o sistema SHALL aplicar RLS policies para isolamento multi-tenant
4. WHEN há relacionamentos THEN o sistema SHALL manter integridade referencial
5. WHEN há consultas THEN o sistema SHALL usar índices otimizados para performance

### Requirement 2 - Sistema de Agendamentos Funcional

**User Story:** Como recepcionista, quero criar agendamentos reais que sejam salvos no banco, para que possa gerenciar a agenda da clínica efetivamente.

#### Acceptance Criteria

1. WHEN um agendamento é criado THEN o sistema SHALL salvar no banco com validações
2. WHEN há conflitos THEN o sistema SHALL detectar usando dados reais do banco
3. WHEN agendamentos são listados THEN o sistema SHALL carregar dados reais da agenda
4. WHEN status é alterado THEN o sistema SHALL atualizar no banco e notificar
5. WHEN há reagendamento THEN o sistema SHALL manter histórico completo

### Requirement 3 - Gestão de Clientes com Dados Reais

**User Story:** Como profissional, quero acessar dados reais dos clientes salvos no banco, para que possa oferecer atendimento personalizado baseado no histórico.

#### Acceptance Criteria

1. WHEN um cliente é cadastrado THEN o sistema SHALL salvar todos os dados no banco
2. WHEN cliente é pesquisado THEN o sistema SHALL retornar dados reais do banco
3. WHEN histórico é acessado THEN o sistema SHALL mostrar procedimentos reais realizados
4. WHEN dados são editados THEN o sistema SHALL atualizar no banco com auditoria
5. WHEN cliente é categorizado THEN o sistema SHALL aplicar regras VIP automaticamente

### Requirement 4 - Sistema de Profissionais Operacional

**User Story:** Como proprietária, quero gerenciar profissionais reais da clínica, para que possa controlar quem tem acesso e suas permissões específicas.

#### Acceptance Criteria

1. WHEN profissional é cadastrado THEN o sistema SHALL criar registro completo no banco
2. WHEN vínculo com clínica é criado THEN o sistema SHALL registrar na tabela de relacionamento
3. WHEN permissões são definidas THEN o sistema SHALL aplicar RLS baseado nos dados
4. WHEN agenda é acessada THEN o sistema SHALL mostrar apenas agendamentos do profissional
5. WHEN profissional é desativado THEN o sistema SHALL manter histórico mas bloquear acesso

### Requirement 5 - Catálogo de Serviços Funcional

**User Story:** Como gerente, quero gerenciar serviços reais oferecidos pela clínica, para que possa controlar preços e disponibilidade.

#### Acceptance Criteria

1. WHEN serviço é criado THEN o sistema SHALL salvar com todas as especificações no banco
2. WHEN preço é alterado THEN o sistema SHALL manter histórico de alterações
3. WHEN serviço é usado em agendamento THEN o sistema SHALL aplicar preço atual
4. WHEN relatórios são gerados THEN o sistema SHALL usar dados reais de serviços
5. WHEN serviço é desativado THEN o sistema SHALL impedir novos agendamentos

### Requirement 6 - Sistema de Produtos e Estoque

**User Story:** Como gerente, quero controlar estoque real de produtos, para que possa evitar falta de materiais e controlar custos.

#### Acceptance Criteria

1. WHEN produto é cadastrado THEN o sistema SHALL salvar no banco com controle de estoque
2. WHEN produto é usado THEN o sistema SHALL decrementar estoque automaticamente
3. WHEN estoque está baixo THEN o sistema SHALL gerar alertas reais
4. WHEN movimentação ocorre THEN o sistema SHALL registrar na auditoria
5. WHEN relatório é solicitado THEN o sistema SHALL mostrar dados reais de estoque

### Requirement 7 - Prontuários Digitais Seguros

**User Story:** Como médico, quero criar prontuários digitais reais, para que possa manter histórico médico seguro dos pacientes.

#### Acceptance Criteria

1. WHEN prontuário é criado THEN o sistema SHALL criptografar dados sensíveis no banco
2. WHEN acesso é feito THEN o sistema SHALL registrar na auditoria médica
3. WHEN dados são alterados THEN o sistema SHALL manter versionamento
4. WHEN imagens são anexadas THEN o sistema SHALL armazenar com segurança
5. WHEN relatório médico é gerado THEN o sistema SHALL usar dados reais do prontuário

### Requirement 8 - Dashboard com Métricas Reais

**User Story:** Como proprietária, quero visualizar métricas reais da clínica, para que possa tomar decisões baseadas em dados verdadeiros.

#### Acceptance Criteria

1. WHEN dashboard é acessado THEN o sistema SHALL mostrar métricas calculadas dos dados reais
2. WHEN período é selecionado THEN o sistema SHALL filtrar dados reais do banco
3. WHEN há alertas THEN o sistema SHALL mostrar problemas reais identificados
4. WHEN relatório é exportado THEN o sistema SHALL usar dados reais do banco
5. WHEN comparação é feita THEN o sistema SHALL usar histórico real armazenado

### Requirement 9 - Sistema de Notificações Operacional

**User Story:** Como usuário do sistema, quero receber notificações reais, para que possa ser informado sobre eventos importantes.

#### Acceptance Criteria

1. WHEN evento ocorre THEN o sistema SHALL enviar notificação real via WhatsApp/SMS/Email
2. WHEN agendamento é criado THEN o sistema SHALL enviar confirmação automática
3. WHEN lembrete é devido THEN o sistema SHALL enviar no horário correto
4. WHEN há cancelamento THEN o sistema SHALL notificar todas as partes envolvidas
5. WHEN há erro THEN o sistema SHALL tentar reenvio e registrar falhas

### Requirement 10 - Integrações Funcionais

**User Story:** Como usuário do sistema, quero que as integrações funcionem corretamente, para que possa processar pagamentos e comunicações automaticamente.

#### Acceptance Criteria

1. WHEN pagamento é processado THEN o sistema SHALL integrar com gateway real
2. WHEN backup é necessário THEN o sistema SHALL executar backup automático
3. WHEN relatório é gerado THEN o sistema SHALL usar dados reais para cálculos
4. WHEN API é chamada THEN o sistema SHALL tratar erros e timeouts adequadamente
5. WHEN integração falha THEN o sistema SHALL registrar erro e tentar recuperação