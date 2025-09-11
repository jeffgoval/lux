export type CategoriaProduto = 
  | 'cremes' 
  | 'seruns' 
  | 'descartaveis' 
  | 'anestesicos' 
  | 'limpeza' 
  | 'equipamentos_consumo' 
  | 'medicamentos' 
  | 'cosmeticos' 
  | 'suplementos';

export type StatusProduto = 'disponivel' | 'baixo_estoque' | 'vencido' | 'descontinuado';

export type UnidadeMedida = 'ml' | 'g' | 'unidade' | 'caixa' | 'frasco' | 'tubo' | 'ampola';

export interface Fornecedor {
  id: string;
  nome: string;
  contato: string;
  telefone: string;
  email: string;
  prazoEntrega: number; // dias
  avaliacao: 'excelente' | 'bom' | 'regular' | 'ruim';
  observacoes?: string;
}

export interface MovimentacaoProduto {
  id: string;
  produtoId: string;
  tipo: 'entrada' | 'saida' | 'ajuste' | 'vencimento';
  quantidade: number;
  valor?: number;
  motivo?: string;
  responsavel: string;
  data: Date;
  clienteId?: string;
  servicoId?: string;
  lote?: string;
}

export interface Produto {
  id: string;
  nome: string;
  marca: string;
  categoria: CategoriaProduto;
  fornecedor: Fornecedor;
  precoCusto: number;
  precoVenda?: number;
  quantidade: number;
  unidadeMedida: UnidadeMedida;
  estoqueMinimo: number;
  estoqueMaximo: number;
  dataVencimento: Date;
  lote?: string;
  codigoBarras?: string;
  localizacao?: string;
  status: StatusProduto;
  descricao?: string;
  indicacoes?: string[];
  contraindicacoes?: string[];
  modoUso?: string;
  composicao?: string;
  registroAnvisa?: string;
  imagemUrl?: string;
  movimentacoes: MovimentacaoProduto[];
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface ProdutoMetricas {
  totalProdutos: number;
  valorTotalEstoque: number;
  produtosBaixoEstoque: number;
  produtosVencendo: number;
  produtosVencidos: number;
  gastoMensal: number;
  economiaMensal: number;
  produtosMaisUtilizados: {
    produto: Produto;
    quantidade: number;
  }[];
  categoriasMaisGastas: {
    categoria: CategoriaProduto;
    valor: number;
  }[];
}

export interface FiltrosProduto {
  categoria?: CategoriaProduto;
  fornecedor?: string;
  status?: StatusProduto;
  vencimento?: 'proximos' | 'vencidos' | 'todos';
  estoque?: 'baixo' | 'normal' | 'alto' | 'todos';
  busca?: string;
}