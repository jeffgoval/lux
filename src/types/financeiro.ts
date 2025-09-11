export type StatusTransacao = 'pendente' | 'confirmada' | 'cancelada' | 'estornada';
export type TipoTransacao = 'receita' | 'despesa';
export type FormaPagamento = 'dinheiro' | 'cartao_debito' | 'cartao_credito' | 'pix' | 'transferencia' | 'parcelado';
export type CategoriaReceita = 'servicos' | 'produtos' | 'pacotes' | 'consultoria' | 'outros';
export type CategoriaDespesa = 'produtos' | 'salarios' | 'aluguel' | 'marketing' | 'equipamentos' | 'impostos' | 'manutencao' | 'outros';
export type StatusRecebimento = 'pendente' | 'recebido' | 'vencido' | 'cancelado';

export interface Transacao {
  id: string;
  tipo: TipoTransacao;
  descricao: string;
  valor: number;
  data: string;
  categoria: CategoriaReceita | CategoriaDespesa;
  formaPagamento: FormaPagamento;
  status: StatusTransacao;
  clienteId?: string;
  servicoId?: string;
  profissionalId?: string;
  observacoes?: string;
  comprovante?: string;
  numeroParcelas?: number;
  parcelaAtual?: number;
  dataVencimento?: string;
  comissao?: number;
  desconto?: number;
}

export interface Receita extends Transacao {
  tipo: 'receita';
  categoria: CategoriaReceita;
  clienteId: string;
  servicoId?: string;
  pacoteId?: string;
  sessaoNumero?: number;
  totalSessoes?: number;
}

export interface Despesa extends Transacao {
  tipo: 'despesa';
  categoria: CategoriaDespesa;
  fornecedorId?: string;
  centroCusto?: string;
  produtoId?: string;
  equipamentoId?: string;
}

export interface Recebimento {
  id: string;
  transacaoId: string;
  valor: number;
  dataVencimento: string;
  dataRecebimento?: string;
  status: StatusRecebimento;
  formaPagamento: FormaPagamento;
  juros?: number;
  multa?: number;
  desconto?: number;
  observacoes?: string;
}

export interface FluxoCaixa {
  id: string;
  data: string;
  saldoInicial: number;
  entradas: number;
  saidas: number;
  saldoFinal: number;
  projecao?: boolean;
}

export interface MetaFinanceira {
  id: string;
  tipo: 'receita' | 'lucro' | 'ticket_medio';
  periodo: 'mensal' | 'trimestral' | 'anual';
  valor: number;
  dataInicio: string;
  dataFim: string;
  profissionalId?: string;
  categoria?: string;
  ativo: boolean;
}

export interface Comissao {
  id: string;
  profissionalId: string;
  transacaoId: string;
  percentual: number;
  valor: number;
  dataPagamento?: string;
  status: 'pendente' | 'paga' | 'cancelada';
}

export interface ResumoFinanceiro {
  periodo: string;
  receitas: {
    total: number;
    servicos: number;
    produtos: number;
    pacotes: number;
  };
  despesas: {
    total: number;
    produtos: number;
    salarios: number;
    operacionais: number;
  };
  lucro: number;
  margemLucro: number;
  ticketMedio: number;
  contasReceber: number;
  contasPagar: number;
}

export interface AnaliseRentabilidade {
  servicoId: string;
  nomeServico: string;
  receitaTotal: number;
  custoTotal: number;
  custoProdutos: number;
  custoTempo: number;
  margemBruta: number;
  margemLiquida: number;
  quantidadeRealizada: number;
  ticketMedio: number;
}

export interface FiltrosFinanceiro {
  dataInicio?: string;
  dataFim?: string;
  tipo?: TipoTransacao;
  categoria?: CategoriaReceita | CategoriaDespesa;
  status?: StatusTransacao;
  formaPagamento?: FormaPagamento;
  clienteId?: string;
  profissionalId?: string;
  valorMin?: number;
  valorMax?: number;
}