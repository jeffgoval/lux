# Sistema Financeiro - Implementação Completa

## Visão Geral

Este documento descreve a implementação completa do sistema financeiro para clínicas de estética, incluindo cálculo automático de receitas, sistema de comissionamento e controle de gastos por categoria.

## Estrutura do Sistema

### 1. Tabelas Principais

#### `transacoes_financeiras`
- **Propósito**: Registra todas as transações financeiras do sistema
- **Características**:
  - Suporte a receitas, despesas, comissões, descontos, estornos e ajustes
  - Cálculo automático de comissões
  - Controle de parcelamento
  - Auditoria completa
  - Relacionamento com sessões, produtos, profissionais e clientes

#### `metas_financeiras`
- **Propósito**: Define metas financeiras por clínica e período
- **Características**:
  - Metas mensais ou anuais
  - Controle de receitas, despesas, lucro e atendimentos
  - Comparação automática com performance atual

#### `comissoes_profissionais`
- **Propósito**: Configuração de comissões por profissional e serviço
- **Características**:
  - Comissão percentual ou valor fixo
  - Configuração específica por serviço ou geral
  - Condições de valor mínimo
  - Controle de período de validade

### 2. Enums Implementados

```sql
-- Tipos de transação
tipo_transacao: 'receita', 'despesa', 'comissao', 'desconto', 'estorno', 'ajuste'

-- Categorias de despesa
categoria_despesa: 'produtos', 'equipamentos', 'marketing', 'pessoal', 'aluguel', 
                   'utilidades', 'manutencao', 'impostos', 'seguros', 'consultoria', 'outros'

-- Status de transação
status_transacao: 'pendente', 'confirmada', 'cancelada', 'estornada'

-- Formas de pagamento
forma_pagamento: 'dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 
                 'transferencia', 'boleto', 'cheque', 'parcelado'
```

## Funcionalidades Automáticas

### 1. Cálculo Automático de Receitas

**Função**: `registrar_receita_sessao(p_sessao_id UUID)`

- Registra automaticamente a receita quando uma sessão é criada
- Calcula e registra comissão do profissional
- Evita duplicação de registros
- Trigger automático na tabela `sessoes_atendimento`

### 2. Sistema de Comissionamento

**Função**: `calcular_comissao_profissional()`

- Busca configuração específica por serviço primeiro
- Fallback para configuração geral do profissional
- Suporte a comissão percentual ou valor fixo
- Verificação de valor mínimo do procedimento
- Controle de período de validade

### 3. Controle de Gastos por Categoria

**Função**: `registrar_gasto_produto()`

- Registra automaticamente gastos quando produtos são utilizados
- Categorização automática por tipo de produto
- Relacionamento com sessões de atendimento
- Trigger automático na tabela `movimentacoes_estoque`

## Relatórios e Consultas

### 1. Resumo Financeiro

**Função**: `obter_resumo_financeiro()`

Retorna:
- Total de receitas
- Total de despesas
- Total de comissões
- Lucro bruto e líquido
- Total de atendimentos
- Ticket médio
- Comissões pagas e pendentes

### 2. Comparação com Metas

**Função**: `comparar_com_metas()`

Compara performance atual com metas definidas:
- Percentual de atingimento de receitas
- Controle de despesas vs meta
- Performance de lucro
- Quantidade de atendimentos

### 3. Views Seguras

#### `resumo_financeiro_basico`
- Resumo mensal sem detalhes sensíveis
- Métricas básicas de performance
- Evolução temporal

#### `comissoes_pendentes`
- Lista de comissões não pagas por profissional
- Valores totais pendentes
- Datas de referência

#### `despesas_por_categoria`
- Despesas agrupadas por categoria
- Análise temporal
- Valores médios e totais

## Segurança e RLS

### Políticas Implementadas

1. **Isolamento Multi-tenant**: Todas as consultas filtradas por `clinica_id`
2. **Controle por Role**: 
   - Proprietárias e gerentes: acesso total
   - Profissionais: apenas suas comissões
   - Financeiro: acesso a relatórios
3. **Auditoria Completa**: Logs de todas as operações críticas

### Funções de Verificação

- `user_can_access_financial_data()`: Verifica acesso a dados financeiros
- `user_can_manage_financial_data()`: Verifica permissão de gestão
- `user_can_view_own_commissions()`: Verifica acesso a próprias comissões

## Automações e Triggers

### 1. Trigger de Receita Automática

```sql
CREATE TRIGGER trigger_auto_receita_sessao
    AFTER INSERT ON sessoes_atendimento
    FOR EACH ROW
    EXECUTE FUNCTION trigger_registrar_receita_sessao();
```

### 2. Trigger de Gasto Automático

```sql
CREATE TRIGGER trigger_auto_gasto_produto
    AFTER INSERT ON movimentacoes_estoque
    FOR EACH ROW
    EXECUTE FUNCTION trigger_registrar_gasto_movimentacao();
```

## Integração Frontend

### Hook React: `useFinanceiro`

Funcionalidades:
- Estados reativo para transações, metas e comissões
- Dashboard financeiro completo
- Operações CRUD com loading states
- Filtros e consultas avançadas
- Auto-refresh configurável

### Serviço: `FinanceiroService`

Métodos principais:
- `listarTransacoes()`: Lista com filtros avançados
- `criarTransacao()`: Criação com validação
- `calcularComissao()`: Cálculo em tempo real
- `obterResumoFinanceiro()`: Relatórios completos
- `compararComMetas()`: Análise de performance

### Tipos TypeScript

Interface completa com:
- Tipos para todas as entidades
- Enums tipados
- Interfaces para formulários
- Tipos para dashboard e métricas
- Utilitários de formatação

## Casos de Uso

### 1. Registro Automático de Receita

```typescript
// Quando uma sessão é criada, a receita é registrada automaticamente
const sessao = await criarSessao({
  cliente_id: 'uuid',
  profissional_id: 'uuid',
  valor_total: 500.00
});
// Trigger automático registra receita e calcula comissão
```

### 2. Configuração de Comissão

```typescript
// Configurar comissão específica para um serviço
await criarComissao({
  profissional_id: 'uuid',
  servico_id: 'uuid',
  percentual_comissao: 30.00,
  valor_minimo_procedimento: 200.00
});
```

### 3. Controle de Gastos

```typescript
// Uso de produto registra gasto automaticamente
await registrarMovimentacaoEstoque({
  produto_id: 'uuid',
  tipo_movimentacao: 'saida',
  quantidade: 2,
  sessao_atendimento_id: 'uuid'
});
// Trigger automático registra despesa
```

### 4. Dashboard Financeiro

```typescript
const { dashboard, loading } = useFinanceiro({
  clinica_id: 'uuid',
  auto_refresh: true
});

// Dashboard inclui:
// - Métricas principais com variação
// - Comparação com metas
// - Comissões pendentes
// - Despesas por categoria
// - Evolução mensal
```

## Manutenção e Monitoramento

### Verificação de Integridade

```typescript
const integridade = await FinanceiroService.verificarIntegridadeFinanceira(clinica_id);
// Retorna:
// - Sessões sem receita registrada
// - Receitas sem sessão
// - Comissões inconsistentes
```

### Logs e Auditoria

- Todas as transações têm auditoria completa
- Logs de acesso a dados sensíveis
- Rastreamento de modificações
- Controle de versões

## Performance

### Índices Otimizados

- `idx_transacoes_clinica_data`: Consultas por clínica e período
- `idx_transacoes_profissional`: Consultas por profissional
- `idx_transacoes_comissao_pendente`: Comissões pendentes
- Views materializadas para relatórios complexos

### Consultas Eficientes

- Uso de CTEs para cálculos complexos
- Agregações otimizadas
- Filtros por índices
- Paginação implementada

## Próximos Passos

1. **Implementar componentes React** para interface financeira
2. **Criar relatórios PDF** para exportação
3. **Integrar com APIs de pagamento** (PIX, cartões)
4. **Implementar alertas automáticos** para metas
5. **Criar dashboard executivo** com métricas avançadas

## Arquivos Relacionados

- `financeiro_migration.sql`: Estrutura das tabelas
- `financeiro_functions.sql`: Funções de cálculo e automação
- `financeiro_rls_policies.sql`: Políticas de segurança
- `financeiro.ts`: Tipos TypeScript
- `financeiro.service.ts`: Serviço de integração
- `useFinanceiro.ts`: Hook React

## Conclusão

O sistema financeiro implementado oferece:

✅ **Automação Completa**: Receitas e gastos registrados automaticamente
✅ **Comissionamento Flexível**: Configuração por profissional e serviço
✅ **Controle de Gastos**: Categorização e rastreamento detalhado
✅ **Relatórios Avançados**: Dashboard completo com métricas
✅ **Segurança Multi-tenant**: Isolamento rigoroso entre clínicas
✅ **Performance Otimizada**: Índices e consultas eficientes
✅ **Integração Frontend**: Hook e serviços prontos para uso

O sistema está pronto para uso em produção e atende todos os requisitos especificados no PRD.