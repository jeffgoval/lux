# Implementation Plan

- [x] 1. Preparar estrutura completa do banco de dados





  - Criar script SQL consolidado com todas as tabelas faltantes
  - Implementar políticas RLS permissivas para onboarding
  - Criar índices necessários para performance
  - Verificar integridade referencial de todas as tabelas
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2. Implementar sistema de autenticação unificado





  - [x] 2.1 Criar UnifiedAuthContext substituindo contextos conflitantes


    - Implementar estado unificado com onboardingStatus determinístico
    - Criar interface AuthState com estados granulares (isInitializing, isProfileLoading, isOnboardingLoading)
    - Implementar lógica de transições de estado sem race conditions
    - Adicionar sistema de cache otimizado com TTL de 5 minutos
    - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.3_

  - [x] 2.2 Criar UnifiedAuthGuard substituindo guards conflitantes

    - Implementar lógica determinística de decisão (ALLOW/REDIRECT/LOADING/ERROR)
    - Criar mapeamento de rotas públicas vs protegidas
    - Implementar verificação de onboarding sem loops infinitos
    - Adicionar timeout de segurança para evitar loading infinito
    - _Requirements: 3.1, 3.4, 5.1, 5.4_

  - [x] 2.3 Remover contextos e guards conflitantes


    - Remover AuthContext.tsx (legacy)
    - Remover AuthGuard.tsx, FastAuthGuard.tsx, SimpleAuthGuard.tsx
    - Atualizar todas as importações para usar UnifiedAuthContext
    - Atualizar App.tsx para usar apenas UnifiedAuthGuard
    - _Requirements: 3.1, 3.2, 5.1_
-

- [x] 3. Implementar sistema robusto de tratamento de erros




  - [x] 3.1 Criar sistema de classificação e recovery de erros


    - Implementar enum AuthErrorType (authentication, authorization, validation, database, network, timeout)
    - Criar interface AuthError com informações de recovery
    - Implementar RecoveryStrategy para cada tipo de erro
    - Adicionar sistema de retry com backoff exponencial
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 5.5_

  - [x] 3.2 Implementar error boundaries para auth


    - Criar AuthErrorBoundary com fallbacks apropriados
    - Implementar recovery automático para erros recuperáveis
    - Adicionar logging estruturado de erros
    - Criar interface de usuário para erros não recuperáveis
    - _Requirements: 7.1, 7.4, 6.4_



- [x] 4. Refatorar OnboardingWizard para operações atômicas






  - [x] 4.1 Implementar state machine para onboarding


    - Criar enum OnboardingStep com todos os passos
    - Implementar OnboardingState com validação granular
    - Adicionar controle de navegação entre steps
    - Implementar persistência de estado durante o processo
    - _Requirements: 4.1, 4.7, 4.8, 6.3_

  - [x] 4.2 Criar sistema de operações atômicas


    - Implementar OnboardingTransaction com rollback capability
    - Criar método createProfile() com validação
    - Criar método createRole() com verificação de duplicatas
    - Criar método createClinic() retornando clinicId
    - _Requirements: 4.1, 4.2, 4.3, 8.1, 8.2_

  - [x] 4.3 Implementar operações de vinculação profissional


    - Criar método updateRoleWithClinic() para atualizar user_roles
    - Criar método createProfessional() com tratamento de duplicatas
    - Criar método linkProfessionalToClinic() para tabela clinica_profissionais
    - Adicionar validação de integridade referencial
    - _Requirements: 4.4, 4.5, 8.3, 8.5_

  - [x] 4.4 Implementar criação de templates e finalização






    - Criar método createTemplate() com validação de tipos
    - Criar método markOnboardingComplete() atualizando primeiro_acesso
    - Implementar verificação final de integridade dos dados
    - Adicionar redirecionamento determinístico para dashboard
    - _Requirements: 4.6, 4.7, 4.8, 8.4, 8.6_
- [x] 5. Otimizar performance do sistema de autenticação












- [ ] 5. Otimizar performance do sistema de autenticação


  - [x] 5.1 Implementar cache inteligente otimizado



    - Reduzir TTL do cache de 10 para 5 minutos
    - Implementar invalidação de cache em mudanças de estado
    - Criar sistema de deduplicação de requests
    - Adicionar métricas de hit/miss do cache
    - _Requirements: 6.1, 6.2, 5.2_

  - [x] 5.2 Otimizar consultas ao banco de dados


    - Reduzir número de consultas por login para máximo 2
    - Implementar batch operations para operações relacionadas
    - Adicionar índices otimizados para queries frequentes
    - Implementar lazy loading para dados não críticos
    - _Requirements: 6.1, 6.2, 8.5_

  - [x] 5.3 Implementar indicadores de progresso e feedback


    - Adicionar loading states granulares (profile, roles, onboarding)
    - Criar componentes de loading com timeout visual
    - Implementar progress bar para onboarding
    - Adicionar mensagens de erro claras e acionáveis
    - _Requirements: 6.3, 6.4, 7.1_
-


- [x] 6. Implementar validação completa de integridade



  - [x] 6.1 Criar sistema de validação de dados


    - Implementar validação de email único e formato
    - Criar validação de dados obrigatórios para clínicas
    - Implementar verificação de foreign keys válidas
    - Adicionar validação de tipos de procedimento
    - _Requirements: 8.1, 8.2, 8.4, 8.5_

  - [x] 6.2 Implementar verificação de consistência pós-onboarding


    - Criar função de verificação de dados completos
    - Implementar check de relacionamentos criados
    - Adicionar validação de estado final do usuário
    - Criar relatório de integridade para debugging
    - _Requirements: 8.6, 8.3, 8.5_


- [x] 7. Atualizar rotas e navegação da aplicação



  - [x] 7.1 Atualizar App.tsx com sistema unificado


    - Remover múltiplos providers conflitantes
    - Implementar apenas UnifiedAuthProvider
    - Atualizar todas as rotas para usar UnifiedAuthGuard
    - Adicionar feature flag para rollback rápido
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 7.2 Atualizar componentes que usam auth


    - Atualizar todos os useAuth() para useUnifiedAuth()
    - Corrigir importações de contextos removidos
    - Atualizar lógica de verificação de roles
    - Testar navegação entre todas as páginas protegidas
    - _Requirements: 3.4, 5.4_

- [ ] 8. Implementar testes abrangentes




  - [ ] 8.1 Criar testes unitários para sistema de auth



    - Testar transições de estado do UnifiedAuthContext
    - Testar lógica de decisão do UnifiedAuthGuard
    - Testar sistema de recovery de erros
    - Testar operações atômicas do onboarding
    - _Requirements: 3.3, 5.1, 7.3, 4.8_

  - [ ] 8.2 Criar testes de integração para fluxo completo
    - Testar fluxo completo de signup até dashboard
    - Testar cenários de erro e recovery
    - Testar performance com timeouts simulados
    - Testar integridade de dados pós-onboarding
    - _Requirements: 4.8, 6.1, 7.4, 8.6_

- [ ] 9. Executar migração e deploy seguro
  - [ ] 9.1 Executar preparação do banco de dados
    - Aplicar script SQL consolidado no Supabase
    - Verificar criação de todas as tabelas
    - Testar políticas RLS com usuário de teste
    - Validar performance das consultas otimizadas
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 9.2 Deploy com feature flag e monitoramento
    - Implementar feature flag para ativação gradual
    - Deploy do código com sistema unificado
    - Monitorar métricas de erro e performance
    - Validar funcionamento com usuários reais
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 9.3 Validação final e cleanup
    - Remover código legacy após validação
    - Atualizar documentação do sistema
    - Criar guia de troubleshooting
    - Implementar alertas para problemas futuros
    - _Requirements: 7.1, 7.2, 7.3, 7.4_