export type TipoPele = 'oleosa' | 'seca' | 'mista' | 'sensivel';
export type PerfilConsumo = 'conservador' | 'moderado' | 'inovador';
export type SensibilidadePreco = 'alta' | 'media' | 'baixa';
export type CategoriaCliente = 'vip' | 'ativo' | 'risco' | 'novo' | 'sazonal' | 'indicador';
export type PreferenciasContato = 'email' | 'sms' | 'whatsapp' | 'ligacao';
export type PreferencaHorario = 'manha' | 'tarde' | 'noite';

export interface Endereco {
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface RedesSociais {
  instagram?: string;
  facebook?: string;
}

export interface Alergia {
  tipo: string;
  descricao: string;
  gravidade: 'leve' | 'moderada' | 'grave';
}

export interface CondicaoMedica {
  nome: string;
  descricao?: string;
  controlada: boolean;
}

export interface CirurgiaPrevia {
  nome: string;
  data: Date;
  tipo: 'estetica' | 'nao_estetica';
}

export interface Tag {
  id: string;
  nome: string;
  cor: string;
  categoria: 'comportamental' | 'preferencia' | 'comercial' | 'personalizada';
}

export interface AtendimentoHistorico {
  id: string;
  data: Date;
  profissional: string;
  procedimentos: string[];
  produtos: string[];
  valor: number;
  formaPagamento: string;
  satisfacao?: number;
  observacoes?: string;
  recomendacoes?: string[];
  fotos?: {
    antes: string[];
    depois: string[];
  };
}

export interface Cliente {
  // Dados Básicos
  id: string;
  nome: string;
  cpf: string;
  rg: string;
  dataNascimento: Date;
  foto?: string;
  
  // Contatos
  telefone: string;
  whatsapp?: string;
  email: string;
  endereco: Endereco;
  redesSociais?: RedesSociais;
  preferenciasContato: PreferenciasContato[];
  
  // Origem e Aquisição
  comoNosConheceu: string;
  dataRegistro: Date;
  
  // Perfil Estético/Médico
  tipoPele: TipoPele;
  alergias: Alergia[];
  condicoesMedicas: CondicaoMedica[];
  medicamentos: string[];
  cirurgiasPrevia: CirurgiaPrevia[];
  objetivosEsteticos: string[];
  contraindicacoes: string[];
  
  // Análise Comportamental
  perfilConsumo: PerfilConsumo;
  sensibilidadePreco: SensibilidadePreco;
  frequenciaIdeal: number; // dias
  sazonalidade: string[];
  preferencasHorario: PreferencaHorario[];
  profissionaisPreferidos: string[];
  
  // Segmentação
  categoria: CategoriaCliente;
  tags: Tag[];
  
  // Métricas
  ltv: number; // Lifetime Value
  frequencia: number;
  ultimoAtendimento?: Date;
  proximoAgendamento?: Date;
  nps?: number;
  
  // Histórico
  historico: AtendimentoHistorico[];
}

export interface ClienteMetricas {
  totalClientes: number;
  ltvMedio: number;
  taxaRetencao: number;
  npsMedio: number;
  novosMes: number;
  crescimento: number;
}

export interface FiltrosCliente {
  categoria?: CategoriaCliente[];
  tags?: string[];
  ultimoAtendimento?: {
    inicio: Date;
    fim: Date;
  };
  ltv?: {
    min: number;
    max: number;
  };
  profissionalPreferido?: string[];
  busca?: string;
}