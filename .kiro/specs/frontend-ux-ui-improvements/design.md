# Design Document

## Overview

Este documento detalha o design técnico para implementar melhorias completas de UX/UI no SaaS de clínica estética. O sistema atual possui várias funcionalidades parcialmente implementadas, botões sem ação, modais não funcionais e inconsistências de interface. O objetivo é transformar o sistema em uma aplicação totalmente funcional, consistente e profissional.

## Architecture

### Frontend Architecture
```
src/
├── components/           # Componentes reutilizáveis
│   ├── ui/              # Componentes base (shadcn/ui)
│   ├── forms/           # Formulários específicos
│   ├── modals/          # Modais funcionais
│   ├── tables/          # Tabelas com CRUD
│   └── charts/          # Gráficos e visualizações
├── pages/               # Páginas principais
├── hooks/               # Custom hooks
├── services/            # Serviços de API
├── utils/               # Utilitários
└── types/               # Definições de tipos
```

### State Management
- **React Query**: Para cache e sincronização de dados
- **Zustand**: Para estado global da aplicação
- **React Hook Form**: Para gerenciamento de formulários
- **Zod**: Para validação de schemas

## Components and Interfaces

### 1. Sistema de Notificações
```typescript
interface NotificationSystem {
  showNotification(type: 'success' | 'error' | 'warning' | 'info', message: string): void
  showToast(message: string, options?: ToastOptions): void
  showAlert(title: string, description: string, type: AlertType): void
}
```

### 2. Componentes de Formulário Aprimorados
```typescript
interface FormComponent<T> {
  data?: T
  onSubmit: (data: T) => Promise<void>
  onCancel: () => void
  validation: ZodSchema<T>
  loading?: boolean
}

// Formulários específicos
- ClienteForm: Cadastro/edição completa de clientes
- AgendamentoForm: Criação/edição de agendamentos
- ProdutoForm: Gestão de produtos e estoque
- ServicoForm: Cadastro de serviços
- EquipamentoForm: Gestão de equipamentos
```

### 3. Sistema de Modais Funcionais
```typescript
interface ModalManager {
  openModal(type: ModalType, props?: any): void
  closeModal(): void
  confirmAction(message: string): Promise<boolean>
}

// Modais implementados
- NovoClienteModal: Funcional com validação
- NovoAgendamentoModal: Com verificação de conflitos
- EditarServicoModal: Edição completa
- ConfirmacaoModal: Para ações críticas
- ImagemModal: Visualização de imagens médicas
```

### 4. Tabelas com CRUD Completo
```typescript
interface DataTable<T> {
  data: T[]
  columns: ColumnDef<T>[]
  onEdit: (item: T) => void
  onDelete: (id: string) => void
  onView: (item: T) => void
  pagination: PaginationConfig
  filters: FilterConfig
  sorting: SortingConfig
}
```

### 5. Sistema de Filtros e Busca
```typescript
interface FilterSystem {
  searchTerm: string
  filters: Record<string, any>
  dateRange: DateRange
  applyFilters(): void
  clearFilters(): void
  saveFilterPreset(name: string): void
}
```

## Data Models

### 1. Cliente Completo
```typescript
interface Cliente {
  id: string
  nome: string
  email: string
  telefone: string
  cpf?: string
  dataNascimento?: Date
  endereco: Endereco
  categoria: 'vip' | 'premium' | 'regular'
  tags: Tag[]
  historico: HistoricoCliente[]
  observacoes?: string
  consentimentos: Consentimento[]
  criadoEm: Date
  atualizadoEm: Date
}
```

### 2. Agendamento Funcional
```typescript
interface Agendamento {
  id: string
  clienteId: string
  servicoId: string
  medicoId: string
  dataHora: Date
  duracao: number
  status: 'agendado' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado'
  observacoes?: string
  valor: number
  formaPagamento?: string
  criadoEm: Date
  atualizadoEm: Date
}
```

### 3. Transação Financeira
```typescript
interface TransacaoFinanceira {
  id: string
  tipo: 'receita' | 'despesa'
  categoria: string
  descricao: string
  valor: number
  data: Date
  formaPagamento: string
  status: 'pendente' | 'pago' | 'vencido'
  agendamentoId?: string
  observacoes?: string
}
```

## Error Handling

### 1. Sistema de Tratamento de Erros
```typescript
interface ErrorHandler {
  handleApiError(error: ApiError): void
  handleValidationError(errors: ValidationError[]): void
  handleNetworkError(): void
  showErrorBoundary(error: Error): void
}
```

### 2. Validação de Formulários
```typescript
// Schemas Zod para validação
const clienteSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  telefone: z.string().min(10, "Telefone inválido"),
  // ... outros campos
})
```

### 3. Estados de Loading e Erro
```typescript
interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}
```

## Testing Strategy

### 1. Testes de Componentes
- **React Testing Library**: Para testes de componentes
- **Jest**: Para testes unitários
- **MSW**: Para mock de APIs

### 2. Testes de Integração
- **Cypress**: Para testes E2E
- **Testing Library User Events**: Para simulação de interações

### 3. Testes de Acessibilidade
- **axe-core**: Para verificação de acessibilidade
- **jest-axe**: Para testes automatizados de a11y

## Implementation Plan

### Fase 1: Infraestrutura Base
1. **Sistema de Notificações**
   - Implementar toast notifications
   - Sistema de alertas
   - Feedback visual consistente

2. **Gerenciamento de Estado**
   - Configurar React Query
   - Implementar Zustand stores
   - Cache strategies

### Fase 2: Componentes Fundamentais
1. **Formulários Funcionais**
   - Implementar validação com Zod
   - React Hook Form integration
   - Feedback de erro consistente

2. **Modais Completos**
   - Todos os modais funcionais
   - Validação adequada
   - Estados de loading

### Fase 3: Funcionalidades CRUD
1. **Gestão de Clientes**
   - CRUD completo
   - Filtros funcionais
   - Histórico detalhado

2. **Sistema de Agendamentos**
   - Calendário funcional
   - Verificação de conflitos
   - Notificações automáticas

### Fase 4: Módulos Avançados
1. **Gestão Financeira**
   - Transações reais
   - Relatórios funcionais
   - Dashboards interativos

2. **Comunicação e Marketing**
   - Templates funcionais
   - Campanhas ativas
   - Métricas reais

### Fase 5: Otimizações e Polimento
1. **Performance**
   - Lazy loading
   - Virtualização de listas
   - Otimização de imagens

2. **Responsividade**
   - Mobile-first design
   - Breakpoints consistentes
   - Touch interactions

## Technical Decisions

### 1. Arquitetura de Componentes
- **Compound Components**: Para componentes complexos
- **Render Props**: Para lógica reutilizável
- **Custom Hooks**: Para estado compartilhado

### 2. Padrões de Design
- **Design System**: Baseado em shadcn/ui
- **Tokens de Design**: Para consistência visual
- **Atomic Design**: Para organização de componentes

### 3. Performance Optimizations
- **React.memo**: Para componentes pesados
- **useMemo/useCallback**: Para otimizações específicas
- **Code Splitting**: Para carregamento otimizado

### 4. Acessibilidade
- **ARIA Labels**: Para todos os componentes interativos
- **Keyboard Navigation**: Suporte completo
- **Screen Reader**: Compatibilidade total

## Security Considerations

### 1. Validação de Dados
- **Client-side**: Validação com Zod
- **Server-side**: Validação duplicada no backend
- **Sanitização**: Limpeza de inputs

### 2. Autenticação e Autorização
- **Role-based Access**: Controle por roles
- **Protected Routes**: Rotas protegidas
- **Session Management**: Gerenciamento seguro

### 3. Dados Sensíveis
- **Masking**: Mascaramento de dados sensíveis
- **Encryption**: Criptografia quando necessário
- **Audit Trail**: Log de ações importantes