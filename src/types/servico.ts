export type CategoriaServico = 'facial' | 'corporal' | 'capilar' | 'estetica_avancada' | 'wellness' | 'masculino';
export type SubcategoriaServico = 'limpeza' | 'rejuvenescimento' | 'manchas' | 'acne' | 'hidratacao' | 'relaxamento' | 'modelagem' | 'depilacao' | 'massagem' | 'drenagem' | 'outro';
export type StatusServico = 'ativo' | 'inativo' | 'sazonal' | 'descontinuado';
export type TipoSessao = 'unica' | 'multiplas' | 'pacote';
export type NivelComplexidade = 'basico' | 'intermediario' | 'avancado' | 'premium';

export interface EquipamentoNecessario {
  nome: string;
  obrigatorio: boolean;
  alternativas?: string[];
}

export interface ProdutoUtilizado {
  nome: string;
  quantidade: string;
  custo: number;
  obrigatorio: boolean;
}

export interface Contraindicacao {
  condicao: string;
  tipo: 'absoluta' | 'relativa';
  observacoes?: string;
}

export interface PrecoVariavel {
  condicao: string;
  valorBase: number;
  valorPromocional?: number;
  validadePromocao?: Date;
}

export interface SessaoTratamento {
  numero: number;
  titulo: string;
  descricao: string;
  duracaoMinutos: number;
  intervaloMinimoDias: number;
  produtosEspecificos?: ProdutoUtilizado[];
}

export interface Tag {
  id: string;
  nome: string;
  cor: string;
  categoria: 'procedimento' | 'publico' | 'sazonalidade' | 'promocional';
}

export interface ServicoImagem {
  id: string;
  url: string;
  tipo: 'antes_depois' | 'procedimento' | 'equipamento' | 'resultado' | 'marketing';
  titulo?: string;
  descricao?: string;
  principal?: boolean;
}

export interface Servico {
  // Identificação
  id: string;
  nome: string;
  nomeTecnico: string;
  codigoInterno: string;
  categoria: CategoriaServico;
  subcategoria: SubcategoriaServico;
  status: StatusServico;
  dataLancamento: Date;
  
  // Descrições
  descricaoComercial: string; // máx 200 chars
  descricaoTecnica: string;
  descricaoDetalhada?: string;
  beneficios: string[];
  indicacoes: string[];
  contraindicacoes: Contraindicacao[];
  
  // Portfolio Visual
  imagemPrincipal?: string;
  galeria: ServicoImagem[];
  videoUrl?: string;
  icone?: string;
  corTema: string;
  
  // Especificações Técnicas
  duracaoPadrao: number; // minutos
  duracaoMinima: number;
  duracaoMaxima: number;
  tempoSetup: number;
  tempoLimpeza: number;
  intervaloBetweenAtendimentos: number;
  
  // Recursos Necessários
  equipamentosNecessarios: EquipamentoNecessario[];
  produtosUtilizados: ProdutoUtilizado[];
  salaRequerida?: string;
  profissionaisHabilitados: string[];
  
  // Tratamento
  tipoSessao: TipoSessao;
  numeroSessoesRecomendadas?: number;
  intervaloEntreSessoes?: number; // dias
  sessoesTratamento?: SessaoTratamento[];
  
  // Precificação
  precoBase: number;
  custoProdutos: number;
  margemLucro: number;
  precoPromocional?: number;
  validadePromocao?: Date;
  precosVariaveis?: PrecoVariavel[];
  
  // Classificação
  nivelComplexidade: NivelComplexidade;
  tags: Tag[];
  idadeMinima?: number;
  generoRecomendado?: 'todos' | 'feminino' | 'masculino';
  
  // Métricas
  popularidade: number; // 0-100
  satisfacaoMedia?: number; // 0-5
  tempoMedioExecucao?: number;
  taxaRecomendacao?: number;
  
  // Sazonalidade
  sazonal: boolean;
  mesesAlta?: number[]; // 1-12
  mesesBaixa?: number[];
  
  // Metadados
  criadoEm: Date;
  atualizadoEm: Date;
  criadoPor: string;
  versao: number;
}

export interface ServicoMetricas {
  totalServicos: number;
  servicosAtivos: number;
  receitaTotal: number;
  margemMedia: number;
  servicoMaisPopular: string;
  crescimentoMensal: number;
}

export interface FiltrosServico {
  categoria?: CategoriaServico[];
  subcategoria?: SubcategoriaServico[];
  status?: StatusServico[];
  faixaPreco?: {
    min: number;
    max: number;
  };
  duracao?: {
    min: number;
    max: number;
  };
  complexidade?: NivelComplexidade[];
  tags?: string[];
  sazonal?: boolean;
  busca?: string;
}

export interface CategoriaInfo {
  id: CategoriaServico;
  nome: string;
  descricao: string;
  cor: string;
  icone: string;
  ativa: boolean;
}