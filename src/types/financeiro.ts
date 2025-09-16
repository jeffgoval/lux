// =====================================================
// TIPOS TYPESCRIPT - SISTEMA FINANCEIRO
// =====================================================
// Define tipos para o sistema financeiro completo
// com cálculo automático de receitas e comissões
// =====================================================

// Enums do sistema financeiro
export type TipoTransacao = 
  | 'receita'
  | 'despesa'
  | 'comissao'
  | 'desconto'
  | 'estorno'
  | 'ajuste';

export type CategoriaDespesa = 
  | 'produtos'
  | 'equipamentos'
  | 'marketing'
  | 'pessoal'
  | 'aluguel'
  | 'utilidades'
  | 'manutencao'
  | 'impostos'
  | 'seguros'
  | 'consultoria'
  | 'outros';

export type StatusTransacao = 
  | 'pendente'
  | 'confirmada'
  | 'cancelada'
  | 'estornada';

export type FormaPagamento = 
  | 'dinheiro'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'pix'
  | 'transferencia'
  | 'boleto'
  | 'cheque'
  | 'parcelado';

// =====================================================
// INTERFACES PRINCIPAIS
// =====================================================

export interface TransacaoFinanceira {
  id: string;
  clinica_id: string;
  
  // Dados da transação
  tipo: TipoTransacao;
  categoria_despesa?: CategoriaDespesa;
  descricao: string;
  valor: number;
  data_transacao: string;
  data_vencimento?: string;
  
  // Forma de pagamento
  forma_pagamento?: FormaPagamento;
  parcelas?: number;
  parcela_atual?: number;
  
  // Status e controle
  status: StatusTransacao;
  observacoes?: string;
  
  // Relacionamentos
  sessao_atendimento_id?: string;
  produto_id?: string;
  profissional_id?: string;
  cliente_id?: string;
  
  // Dados de comissão
  percentual_comissao?: number;
  valor_comissao?: number;
  comissao_paga?: boolean;
  data_pagamento_comissao?: string;
  
  // Auditoria
  criado_em: string;
  atualizado_em: string;
  criado_por: string;
  atualizado_por?: string;
}

export interface MetaFinanceira {
  id: string;
  clinica_id: string;
  
  // Período da meta
  ano: number;
  mes?: number;
  
  // Valores das metas
  meta_receita: number;
  meta_despesas?: number;
  meta_lucro?: number;
  meta_atendimentos?: number;
  
  // Controle
  ativo: boolean;
  observacoes?: string;
  
  // Auditoria
  criado_em: string;
  criado_por: string;
}

export interface ComissaoProfissional {
  id: string;
  clinica_id: string;
  profissional_id: string;
  
  // Configuração de comissão
  servico_id?: string;
  percentual_comissao: number;
  valor_fixo_comissao?: number;
  
  // Condições
  valor_minimo_procedimento?: number;
  data_inicio: string;
  data_fim?: string;
  
  // Controle
  ativo: boolean;
  observacoes?: string;
  
  // Auditoria
  criado_em: string;
  criado_por: string;
}

// =====================================================
// INTERFACES PARA CÁLCULOS E RELATÓRIOS
// =====================================================

export interface CalculoComissao {
  percentual: number;
  valor_comissao: number;
  configuracao_id?: string;
}

export interface ResumoFinanceiro {
  total_receitas: number;
  total_despesas: number;
  total_comissoes: number;
  lucro_bruto: number;
  lucro_liquido: number;
  total_atendimentos: number;
  ticket_medio: number;
  comissoes_pagas: number;
  comissoes_pendentes: number;
}

export interface ComparacaoMetas {
  meta_receita: number;
  receita_atual: number;
  percentual_receita: number;
  meta_despesas: number;
  despesas_atual: number;
  percentual_despesas: number;
  meta_lucro: number;
  lucro_atual: number;
  percentual_lucro: number;
  meta_atendimentos: number;
  atendimentos_atual: number;
  percentual_atendimentos: number;
}

export interface ResumoFinanceiroBasico {
  clinica_id: string;
  mes_ano: string;
  total_receitas: number;
  total_despesas: number;
  total_atendimentos: number;
  ticket_medio: number;
}

export interface ComissaoPendente {
  clinica_id: string;
  profissional_id: string;
  profissional_nome: string;
  total_comissoes_pendentes: number;
  valor_total_pendente: number;
  data_mais_antiga: string;
  data_mais_recente: string;
}

export interface DespesaPorCategoria {
  clinica_id: string;
  categoria_despesa: CategoriaDespesa;
  mes_ano: string;
  total_transacoes: number;
  valor_total: number;
  valor_medio: number;
}

// =====================================================
// INTERFACES PARA FORMULÁRIOS
// =====================================================

export interface CriarTransacaoFinanceiraData {
  tipo: TipoTransacao;
  categoria_despesa?: CategoriaDespesa;
  descricao: string;
  valor: number;
  data_transacao?: string;
  data_vencimento?: string;
  forma_pagamento?: FormaPagamento;
  parcelas?: number;
  observacoes?: string;
  sessao_atendimento_id?: string;
  produto_id?: string;
  profissional_id?: string;
  cliente_id?: string;
}

export interface CriarMetaFinanceiraData {
  ano: number;
  mes?: number;
  meta_receita: number;
  meta_despesas?: number;
  meta_lucro?: number;
  meta_atendimentos?: number;
  observacoes?: string;
}

export interface CriarComissaoProfissionalData {
  profissional_id: string;
  servico_id?: string;
  percentual_comissao?: number;
  valor_fixo_comissao?: number;
  valor_minimo_procedimento?: number;
  data_inicio?: string;
  data_fim?: string;
  observacoes?: string;
}

// =====================================================
// INTERFACES PARA FILTROS E CONSULTAS
// =====================================================

export interface FiltroTransacaoFinanceira {
  tipo?: TipoTransacao[];
  categoria_despesa?: CategoriaDespesa[];
  status?: StatusTransacao[];
  data_inicio?: string;
  data_fim?: string;
  profissional_id?: string;
  cliente_id?: string;
  valor_minimo?: number;
  valor_maximo?: number;
}

export interface FiltroResumoFinanceiro {
  data_inicio: string;
  data_fim: string;
  profissional_id?: string;
  categoria_despesa?: CategoriaDespesa[];
}

// =====================================================
// INTERFACES PARA DASHBOARD
// =====================================================

export interface MetricaFinanceira {
  label: string;
  valor: number;
  variacao?: number;
  variacao_percentual?: number;
  meta?: number;
  percentual_meta?: number;
  formato: 'moeda' | 'numero' | 'percentual';
  cor?: 'success' | 'warning' | 'error' | 'info';
}

export interface DashboardFinanceiro {
  periodo: {
    inicio: string;
    fim: string;
  };
  metricas_principais: {
    receita_total: MetricaFinanceira;
    despesa_total: MetricaFinanceira;
    lucro_liquido: MetricaFinanceira;
    ticket_medio: MetricaFinanceira;
    total_atendimentos: MetricaFinanceira;
  };
  comissoes: {
    total_pendente: number;
    total_pago: number;
    profissionais_pendentes: number;
  };
  despesas_por_categoria: DespesaPorCategoria[];
  evolucao_mensal: ResumoFinanceiroBasico[];
}

// =====================================================
// TIPOS PARA HOOKS E SERVIÇOS
// =====================================================

export interface UseFinanceiroOptions {
  clinica_id: string;
  auto_refresh?: boolean;
  refresh_interval?: number;
}

export interface UseFinanceiroReturn {
  // Estados
  transacoes: TransacaoFinanceira[];
  metas: MetaFinanceira[];
  comissoes: ComissaoProfissional[];
  resumo: ResumoFinanceiro | null;
  dashboard: DashboardFinanceiro | null;
  loading: boolean;
  error: string | null;
  
  // Ações
  criarTransacao: (data: CriarTransacaoFinanceiraData) => Promise<TransacaoFinanceira>;
  atualizarTransacao: (id: string, data: Partial<TransacaoFinanceira>) => Promise<TransacaoFinanceira>;
  excluirTransacao: (id: string) => Promise<void>;
  
  criarMeta: (data: CriarMetaFinanceiraData) => Promise<MetaFinanceira>;
  atualizarMeta: (id: string, data: Partial<MetaFinanceira>) => Promise<MetaFinanceira>;
  
  criarComissao: (data: CriarComissaoProfissionalData) => Promise<ComissaoProfissional>;
  atualizarComissao: (id: string, data: Partial<ComissaoProfissional>) => Promise<ComissaoProfissional>;
  
  // Consultas
  obterResumo: (data_inicio: string, data_fim: string) => Promise<ResumoFinanceiro>;
  compararComMetas: (ano: number, mes: number) => Promise<ComparacaoMetas>;
  calcularComissao: (profissional_id: string, servico_id: string, valor: number) => Promise<CalculoComissao>;
  
  // Utilitários
  refresh: () => Promise<void>;
  filtrarTransacoes: (filtros: FiltroTransacaoFinanceira) => TransacaoFinanceira[];
}

// =====================================================
// CONSTANTES E UTILITÁRIOS
// =====================================================

export const TIPOS_TRANSACAO: { value: TipoTransacao; label: string }[] = [
  { value: 'receita', label: 'Receita' },
  { value: 'despesa', label: 'Despesa' },
  { value: 'comissao', label: 'Comissão' },
  { value: 'desconto', label: 'Desconto' },
  { value: 'estorno', label: 'Estorno' },
  { value: 'ajuste', label: 'Ajuste' }
];

export const CATEGORIAS_DESPESA: { value: CategoriaDespesa; label: string }[] = [
  { value: 'produtos', label: 'Produtos' },
  { value: 'equipamentos', label: 'Equipamentos' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'pessoal', label: 'Pessoal' },
  { value: 'aluguel', label: 'Aluguel' },
  { value: 'utilidades', label: 'Utilidades' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'impostos', label: 'Impostos' },
  { value: 'seguros', label: 'Seguros' },
  { value: 'consultoria', label: 'Consultoria' },
  { value: 'outros', label: 'Outros' }
];

export const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string }[] = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'pix', label: 'PIX' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'parcelado', label: 'Parcelado' }
];

export const STATUS_TRANSACAO: { value: StatusTransacao; label: string; color: string }[] = [
  { value: 'pendente', label: 'Pendente', color: 'warning' },
  { value: 'confirmada', label: 'Confirmada', color: 'success' },
  { value: 'cancelada', label: 'Cancelada', color: 'error' },
  { value: 'estornada', label: 'Estornada', color: 'info' }
];

// Utilitários para formatação
export const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

export const formatarPercentual = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  }).format(valor / 100);
};

export const calcularVariacaoPercentual = (atual: number, anterior: number): number => {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return ((atual - anterior) / anterior) * 100;
};