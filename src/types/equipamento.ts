export type TipoEquipamento = 
  | 'laser' 
  | 'radiofrequencia' 
  | 'ultrassom' 
  | 'microagulhamento' 
  | 'criotherapia' 
  | 'eletroterapia' 
  | 'luz_pulsada' 
  | 'peeling' 
  | 'massagem' 
  | 'limpeza' 
  | 'outros';

export type StatusEquipamento = 'ativo' | 'manutencao' | 'inativo' | 'calibracao';

export type TipoManutencao = 'preventiva' | 'corretiva' | 'calibracao' | 'limpeza';

export interface FabricanteEquipamento {
  id: string;
  nome: string;
  contato: string;
  telefone: string;
  email: string;
  suporteTecnico: string;
  garantia: number; // meses
}

export interface ManutencaoEquipamento {
  id: string;
  equipamentoId: string;
  tipo: TipoManutencao;
  descricao: string;
  tecnicoResponsavel: string;
  dataAgendada: Date;
  dataRealizada?: Date;
  custo?: number;
  observacoes?: string;
  proximaManutencao?: Date;
  status: 'agendada' | 'realizada' | 'cancelada' | 'pendente';
}

export interface UsoEquipamento {
  id: string;
  equipamentoId: string;
  clienteId: string;
  servicoId: string;
  tempoUso: number; // minutos
  potenciaUtilizada?: number;
  observacoes?: string;
  data: Date;
  responsavel: string;
}

export interface Equipamento {
  id: string;
  nome: string;
  modelo: string;
  numeroSerie: string;
  tipo: TipoEquipamento;
  fabricante: FabricanteEquipamento;
  dataCompra: Date;
  valorCompra: number;
  valorAtual?: number;
  localizacao: string;
  status: StatusEquipamento;
  voltagem?: string;
  potencia?: string;
  frequencia?: string;
  indicacoes?: string[];
  contraindicacoes?: string[];
  protocolos?: string[];
  certificacoes?: string[];
  manuais?: string[];
  imagemUrl?: string;
  horasUso: number;
  manutencoes: ManutencaoEquipamento[];
  usos: UsoEquipamento[];
  proximaManutencao?: Date;
  ultimaCalibracao?: Date;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface EquipamentoMetricas {
  totalEquipamentos: number;
  equipamentosAtivos: number;
  equipamentosManutencao: number;
  gastoManutencaoMensal: number;
  equipamentosMaisUtilizados: {
    equipamento: Equipamento;
    horasUso: number;
  }[];
  proximasManutencoes: ManutencaoEquipamento[];
  alertasManutencao: number;
}

export interface FiltrosEquipamento {
  tipo?: TipoEquipamento;
  fabricante?: string;
  status?: StatusEquipamento;
  localizacao?: string;
  manutencao?: 'pendente' | 'em_dia' | 'atrasada';
  busca?: string;
}