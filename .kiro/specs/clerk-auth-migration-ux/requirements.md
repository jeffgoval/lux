# Requirements Document

## Introduction

Este documento define os requisitos para a migração completa do sistema de autenticação do Supabase para o Clerk, incluindo o redesign da UX/UI da landing page e fluxo de onboarding. O objetivo é criar uma experiência fluida para donas de clínicas estéticas que desejam testar o sistema de gestão, com formulários personalizados em português e processo de onboarding otimizado.

## Requirements

### Requirement 1: Landing Page Redesign

**User Story:** Como dona de clínica estética interessada no sistema, eu quero uma landing page clara e atrativa, para que eu possa entender os benefícios e facilmente me cadastrar no sistema.

#### Acceptance Criteria

1. WHEN uma visitante acessa a landing page THEN o sistema SHALL exibir uma seção hero com call-to-action claro para "Teste Grátis" ou "Começar Agora"
2. WHEN uma visitante visualiza a landing page THEN o sistema SHALL apresentar benefícios específicos para gestão de clínicas estéticas
3. WHEN uma visitante clica no botão principal de CTA THEN o sistema SHALL direcioná-la para o formulário de cadastro do Clerk
4. WHEN um usuário já cadastrado acessa a landing page THEN o sistema SHALL exibir um botão "Entrar" no header para acesso direto ao dashboard
5. IF uma visitante rola a página THEN o sistema SHALL manter o header fixo com botões de ação visíveis

### Requirement 2: Formulários Clerk Personalizados

**User Story:** Como dona de clínica que está se cadastrando, eu quero formulários em português com design personalizado, para que eu tenha uma experiência consistente com a marca do sistema.

#### Acceptance Criteria

1. WHEN uma usuária acessa o formulário de cadastro THEN o sistema SHALL exibir todos os textos em português brasileiro
2. WHEN uma usuária preenche o formulário THEN o sistema SHALL usar o design system da aplicação (cores, tipografia, espaçamentos)
3. WHEN uma usuária se cadastra THEN o sistema SHALL permitir cadastro de "organização" representando sua clínica
4. WHEN uma usuária completa o cadastro THEN o sistema SHALL automaticamente atribuir a role "dono_clinica"
5. IF uma usuária comete erro no formulário THEN o sistema SHALL exibir mensagens de erro em português
6. WHEN uma usuária faz login THEN o sistema SHALL usar formulário personalizado em português

### Requirement 3: Fluxo de Onboarding Simplificado

**User Story:** Como nova usuária que acabou de se cadastrar, eu quero ser direcionada diretamente para o dashboard, para que eu possa começar a testar o sistema imediatamente.

#### Acceptance Criteria

1. WHEN uma usuária completa o cadastro pela primeira vez THEN o sistema SHALL redirecioná-la diretamente para o dashboard
2. WHEN uma usuária acessa o dashboard pela primeira vez THEN o sistema SHALL exibir um tour rápido das funcionalidades principais
3. WHEN uma usuária está no dashboard THEN o sistema SHALL permitir acesso a todas as funcionalidades sem restrições
4. IF uma usuária não completou dados da clínica THEN o sistema SHALL sugerir completar o perfil mas não bloquear o acesso
5. WHEN uma usuária explora o sistema THEN o sistema SHALL manter dados de exemplo para demonstração

### Requirement 4: Sistema de Convites para Profissionais

**User Story:** Como dona de clínica já cadastrada, eu quero convidar outros profissionais da minha clínica, para que eles também possam usar o sistema.

#### Acceptance Criteria

1. WHEN uma dona de clínica acessa a área de usuários THEN o sistema SHALL exibir opção "Convidar Profissional"
2. WHEN uma dona de clínica envia convite THEN o sistema SHALL usar o sistema de convites do Clerk
3. WHEN um profissional recebe convite THEN o sistema SHALL permitir cadastro com role "profissional" automaticamente
4. WHEN um profissional aceita convite THEN o sistema SHALL vinculá-lo à organização/clínica correta
5. IF um convite expira THEN o sistema SHALL permitir reenvio do convite

### Requirement 5: Remoção do Sistema de Auth Anterior

**User Story:** Como desenvolvedor, eu quero remover completamente o sistema de autenticação anterior, para que o código fique limpo e sem dependências desnecessárias.

#### Acceptance Criteria

1. WHEN o sistema é executado THEN o sistema SHALL usar exclusivamente o Clerk para autenticação
2. WHEN o código é analisado THEN o sistema SHALL NOT conter referências ao Supabase auth
3. WHEN o código é analisado THEN o sistema SHALL NOT conter componentes de auth customizados antigos
4. WHEN o código é analisado THEN o sistema SHALL NOT conter páginas de login/cadastro customizadas antigas
5. IF existem dependências não utilizadas THEN o sistema SHALL ter essas dependências removidas do package.json

### Requirement 6: Configuração de Roles no Clerk

**User Story:** Como administrador do sistema, eu quero que novos usuários recebam automaticamente a role correta, para que o controle de acesso funcione adequadamente.

#### Acceptance Criteria

1. WHEN uma usuária se cadastra como primeira vez THEN o sistema SHALL atribuir role "dono_clinica" automaticamente
2. WHEN um profissional aceita convite THEN o sistema SHALL atribuir role "profissional" automaticamente
3. WHEN um usuário faz login THEN o sistema SHALL verificar e aplicar as permissões baseadas na role
4. WHEN um usuário acessa funcionalidades THEN o sistema SHALL respeitar as permissões da role
5. IF um usuário não tem role definida THEN o sistema SHALL atribuir role padrão "profissional"

### Requirement 7: Integração com Dashboard Existente

**User Story:** Como usuária autenticada, eu quero que o dashboard continue funcionando normalmente, para que eu possa usar todas as funcionalidades do sistema.

#### Acceptance Criteria

1. WHEN uma usuária faz login THEN o sistema SHALL redirecioná-la para o dashboard existente
2. WHEN uma usuária navega no sistema THEN o sistema SHALL manter todas as funcionalidades atuais
3. WHEN uma usuária acessa dados THEN o sistema SHALL filtrar dados por organização/clínica
4. WHEN uma usuária faz logout THEN o sistema SHALL redirecioná-la para a landing page
5. IF uma usuária não está autenticada THEN o sistema SHALL bloquear acesso às páginas protegidas

### Requirement 8: Responsividade e Performance

**User Story:** Como usuária que acessa de diferentes dispositivos, eu quero que a experiência seja consistente e rápida, para que eu possa usar o sistema de qualquer lugar.

#### Acceptance Criteria

1. WHEN uma usuária acessa de mobile THEN o sistema SHALL exibir interface otimizada para dispositivos móveis
2. WHEN uma usuária carrega páginas THEN o sistema SHALL carregar em menos de 2 segundos
3. WHEN uma usuária navega entre páginas THEN o sistema SHALL manter estado de autenticação sem recarregar
4. WHEN uma usuária perde conexão THEN o sistema SHALL exibir mensagem apropriada e tentar reconectar
5. IF uma usuária usa tablet THEN o sistema SHALL adaptar layout para telas médias