/**
 * ClientePremium - Data Model Avançado para Clientes VIP
 * Sistema sofisticado de categorização e gestão de clientes premium
 */

// =====================================================
// INTERFACES PRINCIPAIS
// =====================================================

export interface ClientePremium {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cpf?: string;
  dataNascimento?: Date;
  genero?: 'masculino' | 'feminino' | 'outro' | 'nao_informado';
  
  // Categorização Premium
  categoria: ClienteCategoria;
  nivelVip: NivelVip;
  pontuacaoFidelidade: number;
  statusAtivo: boolean;
  
  // Dados de Contato Avançados
  endereco?: EnderecoCompleto;
  contatosAdicionais?: ContatoAdicional[];
  preferenciasContato: PreferenciasContato;
  
  // Histórico e Métricas
  historicoFinanceiro: HistoricoFinanceiro;
  historicoAgendamentos: HistoricoAgendamentos;
  metricas: MetricasCliente;
  
  // Preferências Personalizadas
  preferencias: PreferenciasPersonalizadas;
  restricoesMedicas?: RestricoesMedicas;
  observacoesMedicas?: string;
  
  // Programa de Fidelidade
  programaFidelidade?: ProgramaFidelidade;
  beneficiosAtivos: BeneficioAtivo[];
  
  // Dados de Relacionamento
  indicadoPor?: string; // ID do cliente que indicou
  clientesIndicados: string[]; // IDs dos clientes indicados
  relacionamentos?: RelacionamentoCliente[];
  
  // Metadados
  tags: string[];
  observacoesInternas?: string;
  criadoEm: Date;
  atualizadoEm: Date;
  criadoPor: string;
  ultimaInteracao?: Date;
  proximoContato?: Date;
}

// =====================================================
// ENUMS E TIPOS
// =====================================================

export enum ClienteCategoria {
  REGULAR = 'regular',
  VIP = 'vip',
  PREMIUM = 'premium',
  CORPORATIVO = 'corporativo',
  INFLUENCER = 'influencer'
}

export enum NivelVip {
  BRONZE = 'bronze',
  PRATA = 'prata',
  OURO = 'ouro',
  PLATINA = 'platina',
  DIAMANTE = 'diamante'
}

export enum StatusFidelidade {
  ATIVO = 'ativo',
  INATIVO = 'inativo',
  SUSPENSO = 'suspenso',
  EXPIRADO = 'expirado'
}

// =====================================================
// INTERFACES DE APOIO
// =====================================================

export interface EnderecoCompleto {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais: string;
  coordenadas?: {
    latitude: number;
    longitude: number;
  };
}

export interface ContatoAdicional {
  id: string;
  tipo: 'telefone' | 'email' | 'whatsapp' | 'telegram' | 'instagram';
  valor: string;
  principal: boolean;
  verificado: boolean;
  observacoes?: string;
}

export interface PreferenciasContato {
  canalPreferido: 'whatsapp' | 'sms' | 'email' | 'telefone';
  horarioPreferido: {
    inicio: string; // HH:mm
    fim: string; // HH:mm
  };
  diasSemana: number[]; // 0-6 (domingo-sábado)
  receberPromocoes: boolean;
  receberLembretes: boolean;
  receberNovidades: boolean;
  frequenciaContato: 'baixa' | 'media' | 'alta';
}

export interface HistoricoFinanceiro {
  totalGasto: number;
  gastoMedio: number;
  ultimoGasto: number;
  dataUltimoGasto?: Date;
  ticketMedio: number;
  totalDesconto: number;
  metodoPagamentoPreferido?: string;
  limiteCreditoDisponivel?: number;
  statusPagamento: 'em_dia' | 'pendente' | 'inadimplente';
  faturasPendentes: number;
  valorPendente: number;
}

export interface HistoricoAgendamentos {
  totalAgendamentos: number;
  agendamentosFinalizados: number;
  agendamentosCancelados: number;
  agendamentosNaoCompareceu: number;
  taxaComparecimento: number;
  servicosMaisRealizados: ServicoFrequencia[];
  profissionalPreferido?: string;
  horarioPreferido?: string;
  intervaloMedioEntreVisitas: number; // em dias
  ultimoAgendamento?: Date;
  proximoAgendamento?: Date;
}

export interface ServicoFrequencia {
  servicoId: string;
  servicoNome: string;
  quantidade: number;
  ultimaRealizacao?: Date;
  valorMedio: number;
}

export interface MetricasCliente {
  nps: number; // Net Promoter Score
  satisfacaoMedia: number; // 1-5
  avaliacoes: AvaliacaoCliente[];
  reclamacoes: ReclamacaoCliente[];
  elogios: ElogioCliente[];
  indicacoes: number;
  tempoComoCliente: number; // em dias
  frequenciaVisitas: 'baixa' | 'media' | 'alta';
  tendenciaGastos: 'crescente' | 'estavel' | 'decrescente';
  riscoCancelamento: 'baixo' | 'medio' | 'alto';
  valorVitalicio: number; // CLV - Customer Lifetime Value
}

export interface AvaliacaoCliente {
  id: string;
  agendamentoId: string;
  nota: number; // 1-5
  comentario?: string;
  data: Date;
  respondida: boolean;
  respostaEmpresa?: string;
}

export interface ReclamacaoCliente {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  gravidade: 'baixa' | 'media' | 'alta' | 'critica';
  status: 'aberta' | 'em_andamento' | 'resolvida' | 'fechada';
  data: Date;
  resolvidaEm?: Date;
  resolvidoPor?: string;
  solucao?: string;
  satisfacaoResolucao?: number;
}

export interface ElogioCliente {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  data: Date;
  profissionalMencionado?: string;
  servicoMencionado?: string;
  compartilhado: boolean;
}

export interface PreferenciasPersonalizadas {
  profissionaisPreferidos: string[];
  profissionaisEvitados: string[];
  salasPreferidas: string[];
  horariosPreferidos: HorarioPreferencia[];
  servicosInteresse: string[];
  servicosEvitados: string[];
  temperaturaAmbiente?: number;
  musicaPreferida?: string;
  aromaTerapia?: string;
  bebidaPreferida?: string;
  observacoesEspeciais?: string;
}

export interface HorarioPreferencia {
  diaSemana: number; // 0-6
  horaInicio: string; // HH:mm
  horaFim: string; // HH:mm
  prioridade: number; // 1-10
}

export interface RestricoesMedicas {
  alergias: Alergia[];
  medicamentos: MedicamentoUso[];
  condicoesMedicas: CondicaoMedica[];
  restricoesGerais: string[];
  contraIndicacoes: string[];
  cuidadosEspeciais: string[];
  ultimaAtualizacao: Date;
  validadoMedico: boolean;
  medicoResponsavel?: string;
}

export interface Alergia {
  substancia: string;
  gravidade: 'leve' | 'moderada' | 'grave';
  reacao: string;
  dataIdentificacao?: Date;
  observacoes?: string;
}

export interface MedicamentoUso {
  nome: string;
  dosagem: string;
  frequencia: string;
  inicioUso?: Date;
  fimUso?: Date;
  prescritoPor?: string;
  observacoes?: string;
}

export interface CondicaoMedica {
  nome: string;
  gravidade: 'leve' | 'moderada' | 'grave';
  status: 'ativa' | 'controlada' | 'curada';
  dataDiagnostico?: Date;
  tratamentoAtual?: string;
  observacoes?: string;
}

export interface ProgramaFidelidade {
  id: string;
  nome: string;
  nivel: NivelVip;
  pontos: number;
  pontosVitalicio: number;
  dataIngresso: Date;
  dataExpiracao?: Date;
  status: StatusFidelidade;
  beneficiosDisponiveis: BeneficioDisponivel[];
  historicoResgates: HistoricoResgate[];
  proximaPromocao?: Date;
  metaProximoNivel?: {
    nivel: NivelVip;
    pontosNecessarios: number;
    beneficiosAdicionais: string[];
  };
}

export interface BeneficioDisponivel {
  id: string;
  nome: string;
  descricao: string;
  tipo: 'desconto' | 'servico_gratuito' | 'upgrade' | 'prioridade' | 'brinde';
  valor: number;
  custoEmPontos: number;
  validoAte?: Date;
  limitePorMes?: number;
  condicoes?: string[];
}

export interface BeneficioAtivo {
  beneficioId: string;
  nome: string;
  tipo: string;
  valor: number;
  dataAtivacao: Date;
  dataExpiracao?: Date;
  usosRestantes?: number;
  condicoes?: string[];
  status: 'ativo' | 'usado' | 'expirado';
}

export interface HistoricoResgate {
  id: string;
  beneficioId: string;
  beneficioNome: string;
  pontosUtilizados: number;
  valorEconomizado: number;
  dataResgate: Date;
  agendamentoId?: string;
  observacoes?: string;
}

export interface RelacionamentoCliente {
  clienteId: string;
  clienteNome: string;
  tipoRelacionamento: 'familiar' | 'amigo' | 'colega' | 'parceiro' | 'dependente';
  permissaoAgendamento: boolean;
  permissaoInformacoes: boolean;
  observacoes?: string;
  criadoEm: Date;
}

// =====================================================
// INTERFACES PARA OPERAÇÕES
// =====================================================

export interface ClientePremiumCreate {
  nome: string;
  email: string;
  telefone: string;
  categoria?: ClienteCategoria;
  endereco?: Partial<EnderecoCompleto>;
  preferenciasContato?: Partial<PreferenciasContato>;
  observacoes?: string;
  tags?: string[];
}

export interface ClientePremiumUpdate {
  id: string;
  dados: Partial<ClientePremium>;
  atualizadoPor: string;
  motivoAtualizacao?: string;
}

export interface ClientePremiumFilter {
  categoria?: ClienteCategoria[];
  nivelVip?: NivelVip[];
  statusAtivo?: boolean;
  gastoMinimo?: number;
  gastoMaximo?: number;
  ultimaVisitaApos?: Date;
  ultimaVisitaAntes?: Date;
  tags?: string[];
  cidade?: string;
  estado?: string;
  riscoCancelamento?: string[];
  temAniversarioEm?: number; // mês (1-12)
  search?: string;
  ordenarPor?: 'nome' | 'categoria' | 'gastoTotal' | 'ultimaVisita' | 'pontuacaoFidelidade';
  ordem?: 'asc' | 'desc';
  limite?: number;
  offset?: number;
}

export interface ClientePremiumStats {
  totalClientes: number;
  distribuicaoPorCategoria: Record<ClienteCategoria, number>;
  distribuicaoPorNivel: Record<NivelVip, number>;
  ticketMedioGeral: number;
  satisfacaoMedia: number;
  taxaRetencao: number;
  clientesAtivos: number;
  clientesInativos: number;
  receitaTotal: number;
  receitaMedia: number;
  crescimentoMensal: number;
}

// =====================================================
// UTILITÁRIOS E HELPERS
// =====================================================

export class ClientePremiumUtils {
  static calcularNivelVip(pontuacaoFidelidade: number, gastoTotal: number): NivelVip {
    if (gastoTotal >= 50000 || pontuacaoFidelidade >= 10000) return NivelVip.DIAMANTE;
    if (gastoTotal >= 25000 || pontuacaoFidelidade >= 5000) return NivelVip.PLATINA;
    if (gastoTotal >= 10000 || pontuacaoFidelidade >= 2500) return NivelVip.OURO;
    if (gastoTotal >= 5000 || pontuacaoFidelidade >= 1000) return NivelVip.PRATA;
    return NivelVip.BRONZE;
  }

  static calcularRiscoCancelamento(cliente: ClientePremium): 'baixo' | 'medio' | 'alto' {
    const diasSemVisita = cliente.ultimaInteracao 
      ? Math.floor((Date.now() - cliente.ultimaInteracao.getTime()) / (1000 * 60 * 60 * 24))
      : 365;
    
    const taxaComparecimento = cliente.historicoAgendamentos.taxaComparecimento;
    const satisfacao = cliente.metricas.satisfacaoMedia;

    if (diasSemVisita > 180 || taxaComparecimento < 0.7 || satisfacao < 3) {
      return 'alto';
    } else if (diasSemVisita > 90 || taxaComparecimento < 0.85 || satisfacao < 4) {
      return 'medio';
    }
    return 'baixo';
  }

  static calcularValorVitalicio(cliente: ClientePremium): number {
    const gastoMedio = cliente.historicoFinanceiro.gastoMedio;
    const frequenciaAnual = 365 / cliente.historicoAgendamentos.intervaloMedioEntreVisitas;
    const tempoComoClienteAnos = cliente.metricas.tempoComoCliente / 365;
    const expectativaVidaCliente = Math.max(5, 10 - tempoComoClienteAnos); // Estimativa

    return gastoMedio * frequenciaAnual * expectativaVidaCliente;
  }

  static gerarRecomendacoes(cliente: ClientePremium): string[] {
    const recomendacoes: string[] = [];

    // Baseado no risco de cancelamento
    const risco = this.calcularRiscoCancelamento(cliente);
    if (risco === 'alto') {
      recomendacoes.push('Cliente com alto risco de cancelamento - agendar contato proativo');
    }

    // Baseado na satisfação
    if (cliente.metricas.satisfacaoMedia < 4) {
      recomendacoes.push('Satisfação abaixo da média - investigar pontos de melhoria');
    }

    // Baseado no tempo sem visita
    const diasSemVisita = cliente.ultimaInteracao 
      ? Math.floor((Date.now() - cliente.ultimaInteracao.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    if (diasSemVisita > 60) {
      recomendacoes.push('Cliente há mais de 60 dias sem visita - oferecer promoção especial');
    }

    // Baseado no nível VIP
    if (cliente.categoria === ClienteCategoria.VIP && cliente.nivelVip === NivelVip.BRONZE) {
      recomendacoes.push('Cliente VIP com nível baixo - oportunidade de upgrade');
    }

    return recomendacoes;
  }

  static formatarCategoria(categoria: ClienteCategoria): string {
    const labels = {
      [ClienteCategoria.REGULAR]: 'Regular',
      [ClienteCategoria.VIP]: 'VIP',
      [ClienteCategoria.PREMIUM]: 'Premium',
      [ClienteCategoria.CORPORATIVO]: 'Corporativo',
      [ClienteCategoria.INFLUENCER]: 'Influencer'
    };
    return labels[categoria];
  }

  static formatarNivelVip(nivel: NivelVip): string {
    const labels = {
      [NivelVip.BRONZE]: 'Bronze',
      [NivelVip.PRATA]: 'Prata',
      [NivelVip.OURO]: 'Ouro',
      [NivelVip.PLATINA]: 'Platina',
      [NivelVip.DIAMANTE]: 'Diamante'
    };
    return labels[nivel];
  }

  static getCorCategoria(categoria: ClienteCategoria): string {
    const cores = {
      [ClienteCategoria.REGULAR]: 'bg-gray-100 text-gray-800',
      [ClienteCategoria.VIP]: 'bg-yellow-100 text-yellow-800',
      [ClienteCategoria.PREMIUM]: 'bg-purple-100 text-purple-800',
      [ClienteCategoria.CORPORATIVO]: 'bg-blue-100 text-blue-800',
      [ClienteCategoria.INFLUENCER]: 'bg-pink-100 text-pink-800'
    };
    return cores[categoria];
  }

  static getCorNivelVip(nivel: NivelVip): string {
    const cores = {
      [NivelVip.BRONZE]: 'bg-orange-100 text-orange-800',
      [NivelVip.PRATA]: 'bg-gray-100 text-gray-800',
      [NivelVip.OURO]: 'bg-yellow-100 text-yellow-800',
      [NivelVip.PLATINA]: 'bg-slate-100 text-slate-800',
      [NivelVip.DIAMANTE]: 'bg-blue-100 text-blue-800'
    };
    return cores[nivel];
  }
}

export default ClientePremium;