# Implementation Plan

- [x] 1. Corrigir trigger handle_new_user() no Supabase


  - Criar nova migração para corrigir o trigger de criação automática de usuários
  - Adicionar tratamento de erros robusto no trigger
  - Garantir criação consistente de perfil e role inicial
  - Adicionar logs para debugging do processo de criação
  - _Requirements: 1.1, 1.2_

- [x] 2. Atualizar políticas RLS para permitir operações de cadastro


  - Criar política para permitir usuários criarem seus próprios perfis
  - Criar política para permitir proprietárias criarem clínicas independentes
  - Criar política para permitir usuários atualizarem seus próprios user_roles
  - Verificar e corrigir políticas existentes que podem estar bloqueando operações
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Melhorar AuthContext para lidar com estados transitórios


  - Adicionar retry logic para buscar perfil e roles após cadastro
  - Implementar função para verificar se onboarding foi completado
  - Melhorar tratamento de estados de loading durante transições
  - Adicionar refresh automático após operações críticas de cadastro
  - _Requirements: 2.1, 2.2_

- [x] 4. Aprimorar tratamento de erros no OnboardingWizard


  - Adicionar verificação de sessão antes de operações críticas
  - Implementar tratamento específico para diferentes tipos de erro do Supabase
  - Adicionar retry automático para operações falhadas
  - Melhorar mensagens de feedback para usuários sobre erros específicos
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5. Implementar função de recuperação de dados faltantes


  - Criar função para detectar e criar perfil faltante
  - Criar função para detectar e criar role faltante
  - Implementar verificação automática durante login
  - Adicionar fallback para casos onde dados não foram criados automaticamente
  - _Requirements: 1.1, 1.2_

- [x] 6. Adicionar validação de sessão no processo de onboarding


  - Verificar se usuário está autenticado antes de cada etapa
  - Implementar redirecionamento para login se sessão for perdida
  - Adicionar preservação de progresso do onboarding em caso de perda de sessão
  - Garantir que primeiro_acesso seja atualizado apenas após conclusão completa
  - _Requirements: 2.3, 2.4_

- [x] 7. Criar função utilitária para debugging de problemas de cadastro


  - Implementar função para verificar estado completo do usuário
  - Adicionar logs detalhados para rastrear problemas de cadastro
  - Criar função para validar integridade dos dados do usuário
  - Implementar relatório de diagnóstico para problemas de autenticação
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 8. Corrigir erro de schema PGRST204 - proprietaria_id não encontrada




  - Verificar se a coluna proprietaria_id existe na tabela clinicas
  - Criar migração para adicionar a coluna se não existir
  - Atualizar cache do schema do Supabase
  - Corrigir código do OnboardingWizard para lidar com clínicas independentes
  - _Requirements: 3.2, 3.3_

- [ ] 9. Testar fluxo completo de cadastro e onboarding
  - Testar cadastro de novo usuário do início ao fim
  - Testar recuperação de erros durante o processo
  - Testar comportamento com diferentes tipos de falha de rede
  - Validar que todos os dados são criados corretamente
  - _Requirements: 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_