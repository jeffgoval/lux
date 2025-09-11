export type TipoTemplate = 'confirmacao' | 'lembrete' | 'pos_atendimento' | 'comercial' | 'relacionamento';
export type CanalComunicacao = 'whatsapp' | 'instagram' | 'email' | 'sms' | 'site';
export type StatusMensagem = 'pendente' | 'enviada' | 'entregue' | 'lida' | 'respondida' | 'erro';
export type TipoAgente = 'sophie' | 'luna';
export type StatusCampanha = 'ativa' | 'pausada' | 'finalizada' | 'rascunho';

export interface TemplatePersonalizacao {
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  procedimento?: string;
  data?: string;
  hora?: string;
  profissional?: string;
  valor?: string;
  clinica?: string;
  endereco?: string;
  historico?: string;
  pontos?: number;
  desconto?: string;
  tempo_ausencia?: string;
  oferta_personalizada?: string;
  proxima_data?: string;
}

export interface Template {
  id: string;
  nome: string;
  tipo: TipoTemplate;
  categoria: string;
  assunto?: string;
  conteudo: string;
  campos_dinamicos: string[];
  canal: CanalComunicacao[];
  ativo: boolean;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

export interface AgenteIA {
  id: string;
  nome: string;
  tipo: TipoAgente;
  descricao: string;
  personalidade: {
    tom: string;
    estilo: string;
    emoji_uso: 'baixo' | 'moderado' | 'alto';
    linguagem: string;
  };
  objetivos: string[];
  configuracoes: {
    resposta_automatica: boolean;
    escalation_humano: boolean;
    threshold_escalation: number;
    horario_ativo: {
      inicio: string;
      fim: string;
      dias_semana: number[];
    };
  };
  metricas: {
    conversas_iniciadas: number;
    taxa_resposta: number;
    taxa_conversao: number;
    satisfacao_media: number;
    handoff_rate: number;
  };
  ativo: boolean;
}

export interface Conversa {
  id: string;
  cliente_id: string;
  agente_id?: string;
  agente_humano_id?: string;
  canal: CanalComunicacao;
  status: 'ativa' | 'pausada' | 'finalizada' | 'transferida';
  contexto: string;
  tags: string[];
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  created_at: Date;
  updated_at: Date;
  ultima_interacao: Date;
}

export interface Mensagem {
  id: string;
  conversa_id: string;
  remetente: 'cliente' | 'agente_ia' | 'humano';
  remetente_id?: string;
  conteudo: string;
  template_id?: string;
  canal: CanalComunicacao;
  status: StatusMensagem;
  metadata: {
    lida_em?: Date;
    entregue_em?: Date;
    erro_motivo?: string;
    anexos?: string[];
  };
  created_at: Date;
}

export interface TriggerAutomatico {
  id: string;
  nome: string;
  descricao: string;
  tipo: 'tempo' | 'evento' | 'comportamento' | 'data';
  condicoes: {
    campo: string;
    operador: 'igual' | 'diferente' | 'maior' | 'menor' | 'contem' | 'nao_contem';
    valor: any;
  }[];
  acoes: {
    tipo: 'enviar_template' | 'criar_tarefa' | 'escalation' | 'tag_cliente';
    template_id?: string;
    canal?: CanalComunicacao;
    delay_minutos?: number;
  }[];
  ativo: boolean;
  created_at: Date;
}

export interface Campanha {
  id: string;
  nome: string;
  descricao: string;
  tipo: 'promocional' | 'educativa' | 'retencao' | 'reativacao';
  template_id: string;
  segmentacao: {
    categorias_cliente?: string[];
    tags?: string[];
    ultimo_atendimento?: {
      inicio: Date;
      fim: Date;
    };
    ltv?: {
      min: number;
      max: number;
    };
  };
  agendamento: {
    inicio: Date;
    fim?: Date;
    horario_inicio: string;
    horario_fim: string;
    dias_semana: number[];
  };
  canal: CanalComunicacao;
  status: StatusCampanha;
  metricas: {
    enviados: number;
    entregues: number;
    lidos: number;
    respondidos: number;
    conversoes: number;
    taxa_abertura: number;
    taxa_conversao: number;
  };
  created_at: Date;
}

export interface IntegracaoCanal {
  id: string;
  canal: CanalComunicacao;
  nome: string;
  configuracao: {
    api_key?: string;
    webhook_url?: string;
    numero_telefone?: string;
    conta_id?: string;
    ativo: boolean;
    webhook_verificado: boolean;
  };
  status: 'conectado' | 'desconectado' | 'erro' | 'configurando';
  ultima_sincronizacao?: Date;
  mensagens_mes: number;
  limite_mensal?: number;
}

export interface MetricaComunicacao {
  periodo: {
    inicio: Date;
    fim: Date;
  };
  mensagens: {
    total_enviadas: number;
    total_entregues: number;
    total_lidas: number;
    total_respondidas: number;
    taxa_entrega: number;
    taxa_abertura: number;
    taxa_resposta: number;
  };
  conversas: {
    total_iniciadas: number;
    media_duracao_minutos: number;
    taxa_resolucao_ia: number;
    taxa_escalation: number;
    satisfacao_media: number;
  };
  conversoes: {
    leads_gerados: number;
    agendamentos_realizados: number;
    vendas_fechadas: number;
    receita_gerada: number;
    roi_campanha: number;
  };
  canais: {
    [key in CanalComunicacao]: {
      mensagens: number;
      conversoes: number;
      taxa_engajamento: number;
    };
  };
}

export interface FiltrosComunicacao {
  periodo?: {
    inicio: Date;
    fim: Date;
  };
  canal?: CanalComunicacao[];
  status?: StatusMensagem[];
  agente?: string[];
  cliente_id?: string;
  template_tipo?: TipoTemplate[];
  busca?: string;
}