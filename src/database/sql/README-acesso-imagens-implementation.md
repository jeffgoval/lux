# Sistema de Controle de Acesso a Imagens Médicas

## Visão Geral

Este documento descreve a implementação completa do sistema de controle de acesso granular para imagens médicas, incluindo políticas de segurança avançadas, auditoria completa e controle de download.

## Arquivos Implementados

### 1. Controle de Acesso Básico
- **`imagens_medicas_rls_policies.sql`**: Políticas RLS fundamentais
- **`imagens_medicas_functions.sql`**: Funções utilitárias básicas
- **`imagem-acesso.service.ts`**: Serviço de controle de acesso
- **`useAcessoImagens.ts`**: Hook React para gerenciamento

### 2. Controle de Acesso Avançado
- **`imagens_medicas_advanced_policies.sql`**: Políticas avançadas de segurança
- **`GerenciadorAcessoImagens.tsx`**: Componente React para UI
- **`useAcessoImagens.ts`**: Hook com funcionalidades avançadas

## Níveis de Controle de Acesso

### 1. Controle Básico (RLS)
```sql
-- Isolamento multi-tenant
-- Verificação de roles
-- Controle de consentimento
-- Auditoria básica
```

### 2. Controle Avançado
```sql
-- Controle por horário
-- Controle por localização (IP)
-- Controle por dispositivo
-- Controle de sessão ativa
-- Controle por tentativas de acesso
```

## Estrutura de Permissões

### Interface de Permissões
```typescript
interface PermissaoAcessoImagem {
  pode_visualizar: boolean;
  pode_baixar: boolean;
  pode_compartilhar: boolean;
  pode_editar_metadados: boolean;
  pode_aprovar: boolean;
  pode_revogar_consentimento: boolean;
  motivo_negacao?: string;
}
```

### Matriz de Permissões por Role

| Ação | Paciente | Recepcionista | Profissional | Admin | Proprietário |
|------|----------|---------------|--------------|-------|--------------|
| Visualizar | ✅* | ✅** | ✅ | ✅ | ✅ |
| Baixar | ✅* | ✅** | ✅ | ✅ | ✅ |
| Compartilhar | ❌ | ❌ | ✅*** | ✅ | ✅ |
| Editar Metadados | ❌ | ❌ | ✅*** | ✅ | ✅ |
| Aprovar | ❌ | ❌ | ❌ | ✅ | ✅ |
| Revogar Consentimento | ✅ | ❌ | ❌ | ✅ | ✅ |

**Legendas:**
- ✅* = Apenas se `visivel_paciente = true` e `consentimento_obtido = true`
- ✅** = Apenas se `aprovada_por IS NOT NULL`
- ✅*** = Apenas se foi o profissional que capturou a imagem

## Políticas de Segurança Avançadas

### 1. Controle por Horário
```sql
-- Acesso permitido apenas das 8h às 22h
-- Exceção para admins (acesso 24h)
-- Exceção para emergências médicas
EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Sao_Paulo') BETWEEN 8 AND 22
```

### 2. Controle por Localização (IP)
```sql
-- IPs locais sempre permitidos
-- IPs da rede da clínica permitidos
-- Usuários com permissão remota
inet_client_addr() << inet '192.168.1.0/24'
```

### 3. Controle por Dispositivo
```sql
-- Dispositivos devem estar registrados
-- Fingerprint único por dispositivo
-- Expiração automática (90 dias)
-- Renovação automática no uso
```

### 4. Controle de Sessão
```sql
-- Sessões ativas obrigatórias
-- Expiração automática (8 horas)
-- Validação por IP
-- Token único por sessão
```

### 5. Controle por Tentativas
```sql
-- Máximo 5 tentativas por hora
-- Bloqueio temporário (30 minutos)
-- Log de todas as tentativas
-- Desbloqueio automático
```

## Auditoria e Logs

### Tipos de Logs Registrados
1. **VISUALIZACAO**: Quando imagem é acessada
2. **DOWNLOAD**: Quando imagem é baixada
3. **CRIACAO**: Quando imagem é adicionada
4. **MODIFICACAO**: Quando metadados são alterados
5. **EXCLUSAO**: Quando imagem é removida
6. **CONSENTIMENTO**: Mudanças de consentimento
7. **APROVACAO**: Aprovações de visibilidade
8. **CONFIGURACAO_VISIBILIDADE**: Mudanças de configuração
9. **REVOGACAO_ACESSO**: Revogação de acesso
10. **ERRO_BACKUP**: Erros no backup

### Dados Registrados em Cada Log
```sql
CREATE TABLE auditoria_medica (
    id UUID PRIMARY KEY,
    tabela_afetada TEXT, -- 'imagens_medicas'
    operacao TEXT, -- Tipo do log acima
    registro_id UUID, -- ID da imagem
    usuario_id UUID, -- Quem fez a ação
    ip_address TEXT, -- IP de origem
    user_agent TEXT, -- Navegador/dispositivo
    contexto_adicional JSONB, -- Dados específicos
    criado_em TIMESTAMPTZ -- Timestamp
);
```

## URLs Temporárias

### Geração de URLs Seguras
```typescript
// Gerar URL para visualização (1 hora)
const url = await gerarUrlTemporaria(imagemId, 3600, false);

// Gerar URL para download (1 hora)
const url = await gerarUrlTemporaria(imagemId, 3600, true);
```

### Características das URLs
- **Assinadas**: Criptograficamente seguras
- **Temporárias**: Expiração automática
- **Rastreáveis**: Log de geração e uso
- **Específicas**: Visualização vs Download
- **Revogáveis**: Podem ser invalidadas

## Configuração de Visibilidade

### Interface de Configuração
```typescript
interface ConfiguracaoVisibilidade {
  visivel_paciente: boolean;
  visivel_outros_profissionais: boolean;
  requer_aprovacao_admin: boolean;
  permite_download_paciente: boolean;
  watermark_obrigatorio: boolean;
}
```

### Fluxo de Aprovação
1. **Upload**: Imagem criada como não visível
2. **Processamento**: Watermark aplicado automaticamente
3. **Aprovação**: Admin configura visibilidade
4. **Consentimento**: Paciente autoriza visualização
5. **Acesso**: Imagem disponível conforme configuração

## Tabelas de Controle

### 1. Dispositivos Autorizados
```sql
CREATE TABLE dispositivos_autorizados (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    device_fingerprint TEXT NOT NULL,
    device_name TEXT,
    device_type TEXT, -- 'desktop', 'mobile', 'tablet'
    ativo BOOLEAN DEFAULT true,
    data_expiracao TIMESTAMPTZ DEFAULT (now() + INTERVAL '90 days')
);
```

### 2. Sessões de Usuário
```sql
CREATE TABLE sessoes_usuario (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    session_token TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    data_expiracao TIMESTAMPTZ DEFAULT (now() + INTERVAL '8 hours')
);
```

### 3. Tentativas de Acesso
```sql
CREATE TABLE tentativas_acesso (
    id UUID PRIMARY KEY,
    user_id UUID,
    ip_address TEXT NOT NULL,
    sucesso BOOLEAN NOT NULL,
    motivo_falha TEXT,
    tentativas_anteriores INTEGER DEFAULT 0,
    bloqueado_ate TIMESTAMPTZ
);
```

## Funções Utilitárias

### 1. Verificação de Permissões
```sql
-- Verifica todas as permissões de um usuário para uma imagem
SELECT * FROM verificar_acesso_imagem(imagem_id, user_id);
```

### 2. Políticas Avançadas
```sql
-- Verifica todas as políticas avançadas
SELECT * FROM verificar_politicas_avancadas_imagem(imagem_id);
```

### 3. Registro de Tentativas
```sql
-- Registra tentativa de acesso (sucesso/falha)
SELECT registrar_tentativa_acesso(true, null);
```

### 4. Limpeza de Dados
```sql
-- Remove dados antigos para manutenção
SELECT limpar_dados_acesso_antigos();
```

## Integração com Frontend

### Hook de Acesso
```typescript
const {
  permissoes,
  podeVisualizar,
  podeBaixar,
  verificarPermissoes,
  gerarUrlTemporaria,
  configurarVisibilidade
} = useAcessoImagens({ imagemId });
```

### Componente de Gerenciamento
```typescript
<GerenciadorAcessoImagens 
  imagem={imagem}
  onPermissoesAtualizadas={() => recarregarImagens()}
/>
```

## Relatórios de Acesso

### Relatório Consolidado
```typescript
const relatorio = await gerarRelatorioAcessos(
  clinicaId,
  dataInicio,
  dataFim
);

// Retorna:
{
  total_acessos: number,
  acessos_por_usuario: Record<string, number>,
  acessos_por_acao: Record<string, number>,
  imagens_mais_acessadas: Array<{imagem_id, total_acessos}>,
  horarios_pico: Record<string, number>
}
```

### Métricas Disponíveis
- Total de acessos por período
- Acessos por usuário
- Acessos por tipo de ação
- Imagens mais acessadas
- Horários de pico de acesso
- Tentativas de acesso negadas
- Dispositivos mais utilizados

## Compliance e Segurança

### LGPD/HIPAA
- **Consentimento explícito**: Rastreável e revogável
- **Auditoria completa**: Todos os acessos registrados
- **Direito ao esquecimento**: Remoção de dados
- **Portabilidade**: Exportação de dados
- **Minimização**: Acesso apenas ao necessário

### Segurança Técnica
- **Criptografia**: Dados sensíveis criptografados
- **Watermark**: Proteção contra uso indevido
- **URLs assinadas**: Acesso controlado temporariamente
- **Rate limiting**: Proteção contra ataques
- **Detecção de anomalias**: Alertas automáticos

## Configuração e Deployment

### Variáveis de Ambiente
```env
# Configurações de segurança
IMAGEM_ACESSO_HORARIO_INICIO=8
IMAGEM_ACESSO_HORARIO_FIM=22
IMAGEM_SESSAO_DURACAO_HORAS=8
IMAGEM_DISPOSITIVO_EXPIRACAO_DIAS=90
IMAGEM_MAX_TENTATIVAS_HORA=5
IMAGEM_BLOQUEIO_MINUTOS=30

# Rede da clínica
IMAGEM_REDE_CLINICA_CIDR=192.168.1.0/24
```

### Scripts de Manutenção
```sql
-- Executar diariamente
SELECT limpar_dados_acesso_antigos();

-- Executar semanalmente
SELECT arquivar_imagens_antigas();

-- Executar mensalmente
SELECT verificar_integridade_imagens();
```

## Monitoramento e Alertas

### Alertas Automáticos
1. **Tentativas de acesso suspeitas**: Muitas tentativas falhadas
2. **Acesso fora do horário**: Acesso não autorizado
3. **Dispositivo não reconhecido**: Primeiro acesso
4. **IP suspeito**: Acesso de localização incomum
5. **Download em massa**: Muitos downloads em pouco tempo

### Métricas de Monitoramento
- Taxa de sucesso de acessos
- Tempo médio de resposta
- Número de dispositivos ativos
- Distribuição de acessos por horário
- Uso de URLs temporárias

## Testes Recomendados

### 1. Testes de Permissão
```typescript
// Testar cada role com diferentes cenários
test('Paciente pode ver apenas suas imagens aprovadas', async () => {
  const permissoes = await verificarPermissoes(imagemId, pacienteId);
  expect(permissoes.pode_visualizar).toBe(true);
  expect(permissoes.pode_baixar).toBe(true);
});
```

### 2. Testes de Segurança
```typescript
// Testar políticas avançadas
test('Acesso negado fora do horário', async () => {
  // Simular acesso às 2h da manhã
  const resultado = await tentarAcesso(imagemId, '02:00');
  expect(resultado.sucesso).toBe(false);
});
```

### 3. Testes de Auditoria
```typescript
// Verificar se logs são criados
test('Log de acesso é registrado', async () => {
  await visualizarImagem(imagemId);
  const logs = await buscarLogs(imagemId);
  expect(logs).toContainEqual(
    expect.objectContaining({ acao: 'VISUALIZACAO' })
  );
});
```

## Troubleshooting

### Problemas Comuns

1. **"Acesso negado sem motivo aparente"**
   - Verificar se usuário tem role ativa na clínica
   - Verificar se imagem tem consentimento obtido
   - Verificar políticas avançadas (horário, IP, dispositivo)

2. **"URL temporária não funciona"**
   - Verificar se URL não expirou
   - Verificar permissões de download
   - Verificar se arquivo existe no storage

3. **"Logs não aparecem"**
   - Verificar se trigger de auditoria está ativo
   - Verificar permissões na tabela auditoria_medica
   - Verificar se função de log não está falhando

### Comandos de Diagnóstico
```sql
-- Verificar permissões de um usuário
SELECT * FROM verificar_acesso_imagem('imagem-id', 'user-id');

-- Verificar políticas avançadas
SELECT * FROM verificar_politicas_avancadas_imagem('imagem-id');

-- Verificar logs recentes
SELECT * FROM auditoria_medica 
WHERE tabela_afetada = 'imagens_medicas' 
ORDER BY criado_em DESC LIMIT 10;

-- Verificar tentativas bloqueadas
SELECT * FROM tentativas_acesso 
WHERE bloqueado_ate > now();
```

## Roadmap Futuro

### Funcionalidades Planejadas
1. **Biometria**: Autenticação por impressão digital
2. **Geolocalização**: Controle por GPS
3. **IA de Segurança**: Detecção de comportamento anômalo
4. **Blockchain**: Auditoria imutável
5. **Zero Trust**: Verificação contínua de identidade

### Melhorias de Performance
1. **Cache de permissões**: Redis para permissões frequentes
2. **CDN para imagens**: Distribuição global
3. **Compressão inteligente**: Redução de tamanho
4. **Lazy loading**: Carregamento sob demanda
5. **Prefetch**: Antecipação de acessos