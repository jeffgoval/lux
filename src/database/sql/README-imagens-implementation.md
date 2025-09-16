# Implementação do Sistema de Imagens Médicas

## Visão Geral

Este documento descreve a implementação completa do sistema de imagens médicas para o SaaS de clínicas de estética. O sistema oferece armazenamento seguro, controle de acesso granular, watermark automático e auditoria completa.

## Arquivos Implementados

### 1. `imagens_medicas_migration.sql`
- **Tabela principal**: `imagens_medicas`
- **Enums**: `status_processamento_imagem`, `qualidade_imagem`
- **Funções utilitárias**: Geração de nomes únicos, cálculo de hash, watermark automático
- **Triggers**: Atualização automática de metadados e processamento

### 2. `imagens_medicas_rls_policies.sql`
- **Políticas RLS**: Controle de acesso multi-tenant
- **Auditoria**: Log automático de todos os acessos
- **Verificação de integridade**: Função para diagnóstico de problemas

### 3. `imagens_medicas_functions.sql`
- **CRUD seguro**: Funções para criação, aprovação e listagem
- **Consentimento**: Gestão de consentimento do paciente
- **Backup**: Sistema de backup automatizado
- **Relatórios**: Análise de uso e métricas

## Estrutura da Tabela

```sql
CREATE TABLE public.imagens_medicas (
    id UUID PRIMARY KEY,
    sessao_id UUID NOT NULL REFERENCES sessoes_atendimento(id),
    tipo_imagem tipo_imagem NOT NULL, -- 'antes', 'durante', 'depois', 'evolucao'
    
    -- Armazenamento seguro
    url_storage TEXT NOT NULL,
    nome_arquivo_storage TEXT NOT NULL,
    hash_arquivo TEXT NOT NULL,
    
    -- Controle de acesso
    visivel_paciente BOOLEAN DEFAULT false,
    consentimento_obtido BOOLEAN DEFAULT false,
    
    -- Watermark e segurança
    watermark_aplicado BOOLEAN DEFAULT false,
    criptografada BOOLEAN DEFAULT false,
    
    -- Auditoria
    capturada_por UUID NOT NULL,
    aprovada_por UUID,
    
    -- Timestamps e metadados
    capturada_em TIMESTAMPTZ DEFAULT now(),
    -- ... outros campos
);
```

## Funcionalidades Principais

### 1. Armazenamento Seguro
- **Nomes únicos**: Geração automática de nomes únicos para evitar conflitos
- **Hash de integridade**: SHA-256 para verificação de integridade
- **Criptografia**: Suporte para criptografia de imagens sensíveis
- **Backup automático**: Sistema de backup com controle de integridade

### 2. Controle de Acesso Granular
- **Multi-tenant**: Isolamento rigoroso entre clínicas
- **Baseado em roles**: Diferentes permissões por tipo de usuário
- **Consentimento do paciente**: Controle específico para visualização pelo paciente
- **Auditoria completa**: Log de todos os acessos e modificações

### 3. Watermark Automático
- **Aplicação automática**: Watermark aplicado automaticamente após upload
- **Informações contextuais**: Nome da clínica, data/hora, "CONFIDENCIAL"
- **Processamento assíncrono**: Fila de processamento para não bloquear uploads
- **Retry automático**: Tentativas automáticas em caso de falha

### 4. Gestão de Consentimento
- **Consentimento explícito**: Paciente deve autorizar visualização
- **Rastreamento temporal**: Data e hora do consentimento
- **Revogação**: Possibilidade de revogar consentimento
- **Auditoria**: Log completo de mudanças de consentimento

## Políticas de Segurança (RLS)

### Para Profissionais
```sql
-- Podem ver imagens das sessões que realizaram ou da sua clínica
USING (
    public.verificar_acesso_imagem(id, auth.uid())
    AND EXISTS (
        SELECT 1 FROM sessoes_atendimento s
        JOIN prontuarios p ON p.id = s.prontuario_id
        JOIN user_roles ur ON ur.clinica_id = p.clinica_id
        WHERE s.id = sessao_id AND ur.user_id = auth.uid()
    )
)
```

### Para Pacientes
```sql
-- Podem ver apenas suas próprias imagens quando autorizadas
USING (
    EXISTS (
        SELECT 1 FROM sessoes_atendimento s
        JOIN prontuarios p ON p.id = s.prontuario_id
        JOIN clientes c ON c.id = p.cliente_id
        WHERE s.id = sessao_id AND c.user_id = auth.uid()
    )
    AND visivel_paciente = true
    AND consentimento_obtido = true
)
```

## Funções Principais

### 1. `criar_imagem_medica()`
Cria nova imagem com validações completas:
- Verificação de permissões
- Validação de tipo MIME
- Limite de tamanho (50MB)
- Geração de nome único
- Log de auditoria

### 2. `obter_consentimento_imagem()`
Gerencia consentimento do paciente:
- Verificação de autorização
- Atualização de status
- Log de mudanças
- Timestamp de consentimento

### 3. `aplicar_watermark_imagem()`
Aplica watermark automático:
- Busca informações da clínica
- Constrói texto contextual
- Atualiza status de processamento
- Marca como concluído

### 4. `verificar_acesso_imagem()`
Verifica permissões de acesso:
- Identifica tipo de usuário
- Aplica regras específicas
- Considera consentimento
- Retorna boolean de autorização

## Auditoria e Compliance

### Log Automático
Todos os acessos são registrados automaticamente:
- **Visualização**: Quando imagem é acessada
- **Criação**: Quando nova imagem é adicionada
- **Modificação**: Quando metadados são alterados
- **Exclusão**: Quando imagem é removida

### Dados Registrados
- Usuário que realizou a ação
- IP de origem
- User-Agent do navegador
- Timestamp da ação
- Contexto adicional (tipo de imagem, região corporal, etc.)

### Verificação de Integridade
Função `verificar_integridade_imagens()` identifica:
- Imagens sem hash de integridade
- Watermarks não aplicados
- Falhas de processamento
- Referências órfãs

## Backup e Arquivamento

### Sistema de Backup
- **Automático**: Backup programado de imagens
- **Incremental**: Apenas imagens não processadas
- **Verificação**: Controle de integridade dos backups
- **Relatórios**: Status e estatísticas de backup

### Arquivamento por Tempo
- **Retenção configurável**: Padrão de 7 anos
- **Arquivamento automático**: Processo batch
- **Preservação de auditoria**: Logs mantidos mesmo após arquivamento
- **Compliance LGPD**: Suporte ao direito ao esquecimento

## Relatórios e Métricas

### Relatório de Uso
Função `relatorio_uso_imagens()` fornece:
- Total de imagens por período
- Distribuição por tipo (antes/depois/durante/evolução)
- Tamanho total em MB
- Status de processamento
- Regiões corporais mais fotografadas

### Métricas de Segurança
- Imagens com watermark aplicado
- Imagens visíveis para pacientes
- Consentimentos obtidos
- Falhas de processamento

## Integração com Frontend

### Upload de Imagens
1. Frontend faz upload para Supabase Storage
2. Chama `criar_imagem_medica()` com metadados
3. Sistema processa watermark automaticamente
4. Notifica conclusão via webhook/polling

### Visualização
1. Frontend lista imagens via `listar_imagens_sessao()`
2. RLS filtra automaticamente por permissões
3. URLs são geradas com tokens de acesso temporário
4. Log de visualização é registrado automaticamente

### Consentimento
1. Interface específica para obter consentimento
2. Chama `obter_consentimento_imagem()`
3. Atualiza visibilidade em tempo real
4. Notifica paciente sobre mudanças

## Considerações de Performance

### Índices Otimizados
- `idx_imagens_sessao_tipo`: Consultas por sessão e tipo
- `idx_imagens_palavras_chave`: Busca por GIN index
- `idx_imagens_hash_arquivo`: Verificação de duplicatas

### Processamento Assíncrono
- Watermark aplicado em background
- Fila de processamento com retry
- Não bloqueia upload inicial

### Cache e CDN
- URLs de storage com cache headers
- Thumbnails gerados automaticamente
- CDN para distribuição global

## Segurança e Compliance

### LGPD/HIPAA
- Criptografia de dados sensíveis
- Auditoria completa de acessos
- Direito ao esquecimento implementado
- Consentimento explícito e rastreável

### Proteção de Dados
- Watermark obrigatório
- Controle de acesso granular
- Backup criptografado
- Logs de auditoria imutáveis

## Próximos Passos

1. **Implementar processamento de imagem**: Redimensionamento, compressão
2. **Integração com IA**: Análise automática de resultados
3. **Comparação automática**: Algoritmos para comparar antes/depois
4. **Notificações**: Alertas para consentimentos pendentes
5. **Dashboard**: Métricas visuais de uso de imagens

## Comandos de Execução

Para aplicar as migrações:

```sql
-- 1. Executar migração principal
\i src/database/sql/imagens_medicas_migration.sql

-- 2. Aplicar políticas RLS
\i src/database/sql/imagens_medicas_rls_policies.sql

-- 3. Criar funções utilitárias
\i src/database/sql/imagens_medicas_functions.sql
```

## Testes Recomendados

1. **Teste de upload**: Verificar criação de imagem com metadados
2. **Teste de acesso**: Validar RLS para diferentes tipos de usuário
3. **Teste de watermark**: Confirmar aplicação automática
4. **Teste de consentimento**: Verificar fluxo completo
5. **Teste de backup**: Validar processo de backup
6. **Teste de auditoria**: Confirmar logs de acesso
7. **Teste de integridade**: Executar verificação de problemas