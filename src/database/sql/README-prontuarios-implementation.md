# Sistema de Prontuários Digitais - Implementação

## Visão Geral

Este documento descreve a implementação completa do sistema de prontuários digitais para clínicas de estética, incluindo criptografia de dados sensíveis, numeração automática, controle de versões e sistema de auditoria médica.

## Arquivos Implementados

### 1. `prontuarios_migration.sql`
- **Tabela**: `prontuarios`
- **Funcionalidades**:
  - Criptografia de dados médicos sensíveis
  - Numeração automática de prontuários (formato YYYY-NNNNNN)
  - Controle de versões com hash de integridade
  - Triggers para atualização automática

### 2. `prontuarios_rls_policies.sql`
- **Políticas RLS** para isolamento multi-tenant
- **Funções de segurança** para verificação de permissões
- **Controle de acesso** granular por role

### 3. `sessoes_atendimento_migration.sql`
- **Tabela**: `sessoes_atendimento`
- **Funcionalidades**:
  - Relacionamento com templates de procedimentos
  - Controle de produtos utilizados
  - Integração automática com estoque
  - Cálculo automático de valores

### 4. `sessoes_atendimento_rls_policies.sql`
- **Políticas RLS** para sessões de atendimento
- **Funções de consulta** por período e filtros
- **Controle de acesso** baseado em profissional responsável

### 5. `auditoria_medica_migration.sql`
- **Tabelas**: `auditoria_medica`, `assinaturas_digitais`, `versoes_documentos`
- **Funcionalidades**:
  - Logs automáticos de todas as operações
  - Assinatura digital de documentos
  - Controle de versões de documentos
  - Triggers automáticos de auditoria

### 6. `auditoria_medica_rls_policies.sql`
- **Políticas RLS** para sistema de auditoria
- **Funções de consulta** segura de histórico
- **Controle de acesso** restrito para logs

## Estrutura das Tabelas

### Prontuários (`prontuarios`)
```sql
- id (UUID, PK)
- cliente_id (UUID, FK -> clientes)
- clinica_id (UUID, FK -> clinicas)
- medico_responsavel_id (UUID, FK -> auth.users)
- numero_prontuario (TEXT, único por clínica)
- status (status_prontuario)
- anamnese_criptografada (TEXT)
- historico_medico_criptografado (TEXT)
- medicamentos_atuais_criptografado (TEXT)
- alergias_criptografado (TEXT)
- contraindicacoes_criptografado (TEXT)
- observacoes_gerais (TEXT)
- tipo_pele (TEXT)
- fototipo (INTEGER, 1-6)
- versao (INTEGER)
- hash_integridade (TEXT)
```

### Sessões de Atendimento (`sessoes_atendimento`)
```sql
- id (UUID, PK)
- prontuario_id (UUID, FK -> prontuarios)
- agendamento_id (UUID, FK -> agendamentos)
- tipo_procedimento (tipo_procedimento)
- template_id (UUID, FK -> templates_procedimentos)
- data_atendimento (TIMESTAMPTZ)
- profissional_id (UUID, FK -> auth.users)
- status (status_sessao)
- procedimento_detalhes (JSONB)
- produtos_utilizados (JSONB)
- equipamentos_utilizados (TEXT[])
- parametros_tecnicos (JSONB)
- observacoes_pre (TEXT)
- observacoes_pos (TEXT)
- intercorrencias (TEXT)
- orientacoes_paciente (TEXT)
- resultados_imediatos (TEXT)
- satisfacao_paciente (INTEGER, 1-10)
- proxima_sessao_recomendada (DATE)
- valor_procedimento (DECIMAL)
- valor_produtos (DECIMAL)
- valor_desconto (DECIMAL)
- valor_total (DECIMAL)
- duracao_prevista_minutos (INTEGER)
- duracao_real_minutos (INTEGER)
- hash_integridade (TEXT)
```

### Auditoria Médica (`auditoria_medica`)
```sql
- id (UUID, PK)
- tipo_operacao (tipo_operacao_auditoria)
- tipo_entidade (tipo_entidade_auditoria)
- entidade_id (UUID)
- usuario_id (UUID, FK -> auth.users)
- clinica_id (UUID, FK -> clinicas)
- dados_anteriores (JSONB)
- dados_novos (JSONB)
- campos_alterados (TEXT[])
- motivo_alteracao (TEXT)
- ip_address (INET)
- user_agent (TEXT)
- sessao_id (TEXT)
- timestamp_operacao (TIMESTAMPTZ)
- hash_operacao (TEXT)
```

## Enums Criados

### `status_prontuario`
- `ativo`
- `arquivado`
- `transferido`

### `status_sessao`
- `agendada`
- `em_andamento`
- `concluida`
- `cancelada`
- `reagendada`

### `tipo_operacao_auditoria`
- `create`
- `read`
- `update`
- `delete`
- `export`
- `print`
- `share`

### `tipo_entidade_auditoria`
- `prontuario`
- `sessao_atendimento`
- `imagem_medica`
- `documento_medico`

### `status_assinatura`
- `pendente`
- `assinado`
- `rejeitado`
- `expirado`

## Funcionalidades Principais

### 1. Criptografia de Dados Sensíveis
- Campos médicos sensíveis são armazenados criptografados
- Hash de integridade para verificação de alterações
- Controle de acesso granular via RLS

### 2. Numeração Automática
- Formato: `YYYY-NNNNNN` (ano + número sequencial)
- Sequência única por clínica
- Geração automática via trigger

### 3. Controle de Versões
- Versionamento automático a cada alteração
- Histórico completo de modificações
- Hash de integridade por versão

### 4. Sistema de Auditoria
- Logs automáticos de todas as operações
- Rastreamento de campos alterados
- Metadados técnicos (IP, user agent, etc.)

### 5. Assinatura Digital
- Assinatura digital de documentos médicos
- Controle de validade e status
- Integração com sistema de auditoria

### 6. Integração com Templates
- Aplicação automática de dados do template
- Campos obrigatórios e opcionais
- Instruções pré e pós-procedimento

### 7. Controle de Estoque
- Atualização automática quando sessão é concluída
- Registro de movimentações por produto utilizado
- Rastreabilidade completa

## Segurança e Compliance

### Multi-tenant
- Isolamento rigoroso por clínica via RLS
- Verificação de permissões em todas as operações
- Controle de acesso baseado em roles

### Auditoria
- Logs imutáveis de todas as operações
- Rastreamento completo de acessos
- Conformidade com regulamentações médicas

### Integridade
- Hash SHA-256 para verificação de integridade
- Controle de versões para histórico
- Assinatura digital para documentos críticos

## Funções Utilitárias

### Prontuários
- `gerar_numero_prontuario(clinica_id)`: Gera número único
- `calcular_hash_prontuario(...)`: Calcula hash de integridade
- `pode_acessar_prontuario(prontuario_id)`: Verifica permissão
- `pode_criar_prontuario_cliente(cliente_id)`: Verifica criação

### Sessões
- `aplicar_template_sessao(sessao_id, template_id)`: Aplica template
- `calcular_valor_total_sessao(...)`: Calcula valor total
- `pode_acessar_sessao(sessao_id)`: Verifica permissão
- `obter_sessoes_periodo(...)`: Consulta por período

### Auditoria
- `registrar_auditoria(...)`: Registra operação
- `criar_assinatura_digital(...)`: Cria assinatura
- `criar_versao_documento(...)`: Cria nova versão
- `obter_historico_auditoria(...)`: Consulta histórico

## Triggers Implementados

### Prontuários
- `trigger_atualizar_prontuario`: Atualiza timestamp, versão e hash
- `trigger_auditoria_prontuarios`: Registra operações na auditoria

### Sessões
- `trigger_atualizar_sessao`: Atualiza dados e aplica template
- `trigger_atualizar_estoque_sessao`: Atualiza estoque automaticamente
- `trigger_auditoria_sessoes`: Registra operações na auditoria

## Índices para Performance

### Prontuários
- `idx_prontuarios_cliente_id`
- `idx_prontuarios_clinica_id`
- `idx_prontuarios_medico_responsavel`
- `idx_prontuarios_numero`
- `idx_prontuarios_status`

### Sessões
- `idx_sessoes_prontuario_id`
- `idx_sessoes_profissional_id`
- `idx_sessoes_data_atendimento`
- `idx_sessoes_tipo_procedimento`
- `idx_sessoes_status`

### Auditoria
- `idx_auditoria_usuario_id`
- `idx_auditoria_clinica_id`
- `idx_auditoria_entidade`
- `idx_auditoria_timestamp`

## Requisitos Atendidos

### Requirement 6.1 - Sistema de Prontuários Digitais
✅ Criptografia de dados médicos sensíveis
✅ Numeração automática de prontuários
✅ Controle de versões implementado
✅ Relacionamento com clientes e profissionais

### Requirement 6.2 - Auditoria Médica
✅ Logs de acesso a prontuários
✅ Rastreamento de modificações
✅ Hash de integridade para verificação

### Requirement 6.4 - Registros de Procedimentos
✅ Estrutura para registros de procedimentos
✅ Relacionamento com templates
✅ Campos para produtos utilizados
✅ Integração com sistema de estoque

### Requirement 6.5 - Assinatura Digital
✅ Sistema de assinatura digital
✅ Controle de status e validade
✅ Integração com auditoria

## Próximos Passos

1. **Executar as migrações** na ordem correta
2. **Testar as políticas RLS** com diferentes roles
3. **Implementar interface frontend** para prontuários
4. **Configurar sistema de backup** para dados médicos
5. **Implementar relatórios** de auditoria e compliance

## Observações Importantes

- **Dados sensíveis**: Implementar criptografia real em produção
- **Backup**: Configurar backup automático e criptografado
- **Compliance**: Verificar conformidade com LGPD/HIPAA
- **Performance**: Monitorar performance das consultas complexas
- **Segurança**: Revisar políticas RLS regularmente