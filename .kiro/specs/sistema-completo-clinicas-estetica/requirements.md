# Requirements Document - Sistema Completo de Clínicas de Estética

## Introduction

Este documento define os requisitos para completar a implementação do sistema SaaS multi-tenant para clínicas de estética. Com base na análise do código atual e do PRD fornecido, identificamos lacunas críticas na estrutura do banco de dados que impedem o funcionamento completo do sistema. O objetivo é criar todas as tabelas faltantes e suas integrações para que o sistema funcione perfeitamente conforme especificado no PRD.

## Requirements

### Requirement 1 - Estrutura de Profissionais

**User Story:** Como proprietária de clínica, quero gerenciar informações detalhadas dos profissionais, para que possa organizar adequadamente minha equipe e suas especialidades.

#### Acceptance Criteria

1. WHEN um usuário se cadastra como profissional THEN o sistema SHALL criar automaticamente um registro na tabela `profissionais`
2. WHEN um profissional é vinculado a uma clínica THEN o sistema SHALL criar um registro na tabela `clinica_profissionais` 
3. IF um profissional tem especialidades THEN o sistema SHALL armazenar essas especialidades usando o enum `especialidade_medica`
4. WHEN um profissional é desativado THEN o sistema SHALL manter o histórico mas marcar como inativo
5. IF um profissional trabalha em múltiplas clínicas THEN o sistema SHALL permitir múltiplos vínculos ativos

### Requirement 2 - Templates de Procedimentos

**User Story:** Como profissional de estética, quero usar templates padronizados para procedimentos, para que possa manter consistência e agilizar o atendimento.

#### Acceptance Criteria

1. WHEN uma clínica é criada THEN o sistema SHALL criar templates básicos de procedimentos automaticamente
2. WHEN um template é criado THEN o sistema SHALL validar os campos obrigatórios e opcionais
3. IF um template é público THEN o sistema SHALL permitir que outras clínicas o utilizem
4. WHEN um procedimento é realizado THEN o sistema SHALL usar o template correspondente
5. IF um template é modificado THEN o sistema SHALL manter versionamento para auditoria

### Requirement 3 - Gestão de Produtos e Estoque

**User Story:** Como gerente de clínica, quero controlar o estoque de produtos, para que possa gerenciar custos e evitar falta de materiais.

#### Acceptance Criteria

1. WHEN um produto é cadastrado THEN o sistema SHALL validar informações obrigatórias (nome, categoria, fornecedor)
2. WHEN o estoque atinge o mínimo THEN o sistema SHALL gerar alerta automático
3. IF um produto está próximo do vencimento THEN o sistema SHALL notificar com antecedência
4. WHEN um produto é usado em procedimento THEN o sistema SHALL decrementar automaticamente do estoque
5. IF há movimentação de estoque THEN o sistema SHALL registrar na auditoria com responsável

### Requirement 4 - Sistema de Agendamentos

**User Story:** Como recepcionista, quero gerenciar agendamentos de forma inteligente, para que possa otimizar a agenda e evitar conflitos.

#### Acceptance Criteria

1. WHEN um agendamento é criado THEN o sistema SHALL verificar disponibilidade do profissional
2. WHEN há conflito de horário THEN o sistema SHALL sugerir horários alternativos
3. IF um cliente cancela THEN o sistema SHALL liberar o horário e notificar lista de espera
4. WHEN um agendamento é confirmado THEN o sistema SHALL enviar notificações automáticas
5. IF há reagendamento THEN o sistema SHALL manter histórico completo

### Requirement 5 - Gestão de Clientes

**User Story:** Como profissional, quero acessar informações completas dos clientes, para que possa oferecer atendimento personalizado e seguro.

#### Acceptance Criteria

1. WHEN um cliente é cadastrado THEN o sistema SHALL validar dados obrigatórios (nome, contato)
2. WHEN há histórico médico THEN o sistema SHALL criptografar informações sensíveis
3. IF cliente tem alergias THEN o sistema SHALL destacar em todos os atendimentos
4. WHEN cliente retorna THEN o sistema SHALL mostrar histórico completo de procedimentos
5. IF há consentimentos THEN o sistema SHALL verificar validade antes de procedimentos

### Requirement 6 - Sistema de Prontuários Digitais

**User Story:** Como médico responsável, quero manter prontuários digitais seguros, para que possa cumprir regulamentações e garantir qualidade do atendimento.

#### Acceptance Criteria

1. WHEN um prontuário é criado THEN o sistema SHALL criptografar dados médicos sensíveis
2. WHEN há acesso ao prontuário THEN o sistema SHALL registrar na auditoria médica
3. IF há imagens médicas THEN o sistema SHALL aplicar watermark e controlar acesso
4. WHEN há assinatura digital THEN o sistema SHALL validar integridade do documento
5. IF há modificação THEN o sistema SHALL manter versionamento completo

### Requirement 7 - Relatórios Financeiros

**User Story:** Como proprietária, quero visualizar relatórios financeiros detalhados, para que possa tomar decisões estratégicas baseadas em dados.

#### Acceptance Criteria

1. WHEN há vendas THEN o sistema SHALL calcular automaticamente receitas e comissões
2. WHEN há gastos THEN o sistema SHALL categorizar e incluir nos relatórios
3. IF há metas definidas THEN o sistema SHALL comparar performance atual
4. WHEN período é selecionado THEN o sistema SHALL gerar relatórios customizados
5. IF há múltiplas clínicas THEN o sistema SHALL consolidar dados por organização

### Requirement 8 - Integrações e Automações

**User Story:** Como usuário do sistema, quero que as comunicações sejam automatizadas, para que possa focar no atendimento ao cliente.

#### Acceptance Criteria

1. WHEN agendamento é criado THEN o sistema SHALL enviar confirmação via WhatsApp/SMS
2. WHEN há lembretes THEN o sistema SHALL enviar 24h antes do procedimento
3. IF há cancelamento THEN o sistema SHALL notificar automaticamente
4. WHEN há aniversário THEN o sistema SHALL enviar mensagem personalizada
5. IF há promoções THEN o sistema SHALL segmentar e enviar para público-alvo

### Requirement 9 - Multi-tenant e Segurança

**User Story:** Como super admin, quero garantir isolamento completo entre clínicas, para que dados sejam protegidos e o sistema seja escalável.

#### Acceptance Criteria

1. WHEN usuário acessa dados THEN o sistema SHALL aplicar RLS baseado no contexto da clínica
2. WHEN há tentativa de acesso não autorizado THEN o sistema SHALL bloquear e registrar
3. IF há backup THEN o sistema SHALL criptografar dados sensíveis
4. WHEN há auditoria THEN o sistema SHALL rastrear todas as operações críticas
5. IF há migração THEN o sistema SHALL manter integridade referencial

### Requirement 10 - Dashboard e Métricas

**User Story:** Como usuário do sistema, quero visualizar métricas relevantes no dashboard, para que possa monitorar performance e tomar decisões rápidas.

#### Acceptance Criteria

1. WHEN usuário acessa dashboard THEN o sistema SHALL mostrar métricas do seu contexto (clínica/organização)
2. WHEN há alertas THEN o sistema SHALL destacar itens que precisam atenção
3. IF há metas THEN o sistema SHALL mostrar progresso visual
4. WHEN período é alterado THEN o sistema SHALL atualizar métricas dinamicamente
5. IF há drill-down THEN o sistema SHALL permitir navegação para detalhes