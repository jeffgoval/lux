import { Transacao, Receita, Despesa, Recebimento, FluxoCaixa, MetaFinanceira, ResumoFinanceiro, AnaliseRentabilidade } from '@/types/financeiro';

export const receitasMock: Receita[] = [
  {
    id: 'rec-001',
    tipo: 'receita',
    descricao: 'Limpeza de Pele Profunda',
    valor: 180.00,
    data: '2024-01-15',
    categoria: 'servicos',
    formaPagamento: 'cartao_credito',
    status: 'confirmada',
    clienteId: 'cli-001',
    servicoId: 'srv-001',
    profissionalId: 'prof-001',
    comissao: 36.00,
    numeroParcelas: 2,
    parcelaAtual: 1
  },
  {
    id: 'rec-002',
    tipo: 'receita',
    descricao: 'Tratamento Anti-idade',
    valor: 450.00,
    data: '2024-01-16',
    categoria: 'servicos',
    formaPagamento: 'pix',
    status: 'confirmada',
    clienteId: 'cli-002',
    servicoId: 'srv-002',
    profissionalId: 'prof-002',
    comissao: 67.50
  },
  {
    id: 'rec-003',
    tipo: 'receita',
    descricao: 'Pacote Rejuvenescimento - 3 sessões',
    valor: 1200.00,
    data: '2024-01-17',
    categoria: 'pacotes',
    formaPagamento: 'parcelado',
    status: 'confirmada',
    clienteId: 'cli-003',
    servicoId: 'srv-003',
    profissionalId: 'prof-001',
    comissao: 180.00,
    numeroParcelas: 4,
    totalSessoes: 3,
    sessaoNumero: 1
  }
];

export const despesasMock: Despesa[] = [
  {
    id: 'desp-001',
    tipo: 'despesa',
    descricao: 'Compra de produtos para tratamento',
    valor: 850.00,
    data: '2024-01-10',
    categoria: 'produtos',
    formaPagamento: 'transferencia',
    status: 'confirmada',
    fornecedorId: 'forn-001',
    observacoes: 'Estoque mensal de séruns e cremes'
  },
  {
    id: 'desp-002',
    tipo: 'despesa',
    descricao: 'Salário Janeiro - Recepcionista',
    valor: 1800.00,
    data: '2024-01-05',
    categoria: 'salarios',
    formaPagamento: 'transferencia',
    status: 'confirmada',
    centroCusto: 'administrativo'
  },
  {
    id: 'desp-003',
    tipo: 'despesa',
    descricao: 'Aluguel Janeiro',
    valor: 3500.00,
    data: '2024-01-01',
    categoria: 'aluguel',
    formaPagamento: 'transferencia',
    status: 'confirmada',
    centroCusto: 'fixo'
  },
  {
    id: 'desp-004',
    tipo: 'despesa',
    descricao: 'Campanha Instagram',
    valor: 500.00,
    data: '2024-01-12',
    categoria: 'marketing',
    formaPagamento: 'cartao_credito',
    status: 'confirmada',
    centroCusto: 'marketing'
  }
];

export const recebimentosMock: Recebimento[] = [
  {
    id: 'rcb-001',
    transacaoId: 'rec-001',
    valor: 90.00,
    dataVencimento: '2024-01-15',
    dataRecebimento: '2024-01-15',
    status: 'recebido',
    formaPagamento: 'cartao_credito'
  },
  {
    id: 'rcb-002',
    transacaoId: 'rec-001',
    valor: 90.00,
    dataVencimento: '2024-02-15',
    status: 'pendente',
    formaPagamento: 'cartao_credito'
  },
  {
    id: 'rcb-003',
    transacaoId: 'rec-003',
    valor: 300.00,
    dataVencimento: '2024-01-17',
    dataRecebimento: '2024-01-17',
    status: 'recebido',
    formaPagamento: 'parcelado'
  }
];

export const fluxoCaixaMock: FluxoCaixa[] = [
  {
    id: 'fc-001',
    data: '2024-01-01',
    saldoInicial: 5000.00,
    entradas: 1830.00,
    saidas: 3500.00,
    saldoFinal: 3330.00
  },
  {
    id: 'fc-002',
    data: '2024-01-02',
    saldoInicial: 3330.00,
    entradas: 0.00,
    saidas: 0.00,
    saldoFinal: 3330.00
  },
  {
    id: 'fc-003',
    data: '2024-01-15',
    saldoInicial: 3330.00,
    entradas: 630.00,
    saidas: 1800.00,
    saldoFinal: 2160.00
  }
];

export const metasFinanceirasMock: MetaFinanceira[] = [
  {
    id: 'meta-001',
    tipo: 'receita',
    periodo: 'mensal',
    valor: 15000.00,
    dataInicio: '2024-01-01',
    dataFim: '2024-01-31',
    ativo: true
  },
  {
    id: 'meta-002',
    tipo: 'lucro',
    periodo: 'mensal',
    valor: 8000.00,
    dataInicio: '2024-01-01',
    dataFim: '2024-01-31',
    ativo: true
  },
  {
    id: 'meta-003',
    tipo: 'ticket_medio',
    periodo: 'mensal',
    valor: 300.00,
    dataInicio: '2024-01-01',
    dataFim: '2024-01-31',
    profissionalId: 'prof-001',
    ativo: true
  }
];

export const resumoFinanceiroMock: ResumoFinanceiro = {
  periodo: 'Janeiro 2024',
  receitas: {
    total: 8450.00,
    servicos: 6850.00,
    produtos: 800.00,
    pacotes: 800.00
  },
  despesas: {
    total: 6650.00,
    produtos: 850.00,
    salarios: 3600.00,
    operacionais: 2200.00
  },
  lucro: 1800.00,
  margemLucro: 21.3,
  ticketMedio: 316.67,
  contasReceber: 2100.00,
  contasPagar: 1200.00
};

export const analiseRentabilidadeMock: AnaliseRentabilidade[] = [
  {
    servicoId: 'srv-001',
    nomeServico: 'Limpeza de Pele Profunda',
    receitaTotal: 1800.00,
    custoTotal: 420.00,
    custoProdutos: 180.00,
    custoTempo: 240.00,
    margemBruta: 1380.00,
    margemLiquida: 76.7,
    quantidadeRealizada: 10,
    ticketMedio: 180.00
  },
  {
    servicoId: 'srv-002',
    nomeServico: 'Tratamento Anti-idade',
    receitaTotal: 2250.00,
    custoTotal: 750.00,
    custoProdutos: 450.00,
    custoTempo: 300.00,
    margemBruta: 1500.00,
    margemLiquida: 66.7,
    quantidadeRealizada: 5,
    ticketMedio: 450.00
  },
  {
    servicoId: 'srv-003',
    nomeServico: 'Peeling Químico',
    receitaTotal: 3200.00,
    custoTotal: 960.00,
    custoProdutos: 640.00,
    custoTempo: 320.00,
    margemBruta: 2240.00,
    margemLiquida: 70.0,
    quantidadeRealizada: 8,
    ticketMedio: 400.00
  }
];