import { 
  Template, 
  AgenteIA, 
  Conversa, 
  Mensagem, 
  TriggerAutomatico, 
  Campanha, 
  IntegracaoCanal, 
  MetricaComunicacao 
} from "@/types/comunicacao";

// Templates Mock
export const templatesMock: Template[] = [
  {
    id: "1",
    nome: "Confirmação Agendamento",
    tipo: "confirmacao",
    categoria: "Agendamento",
    assunto: "Confirmação do seu agendamento",
    conteudo: "Olá [NOME]! ✨\nConfirmamos seu agendamento para [PROCEDIMENTO] no dia [DATA] às [HORA] com [PROFISSIONAL].\n📍 Local: [ENDERECO]\n💰 Investimento: [VALOR]\n\nLembre-se dos cuidados pré-procedimento que enviamos por email.\nQualquer dúvida, estou aqui! 😊\n\nAtt,\nEquipe [CLINICA]",
    campos_dinamicos: ["NOME", "PROCEDIMENTO", "DATA", "HORA", "PROFISSIONAL", "ENDERECO", "VALOR", "CLINICA"],
    canal: ["whatsapp", "sms"],
    ativo: true,
    tags: ["confirmacao", "agendamento", "pre-procedimento"],
    created_at: new Date("2024-01-15"),
    updated_at: new Date("2024-01-20")
  },
  {
    id: "2", 
    nome: "Lembrete 24h",
    tipo: "lembrete",
    categoria: "Lembretes",
    assunto: "Seu procedimento é amanhã!",
    conteudo: "Oi [NOME]! 💕\nLembro que amanhã você tem [PROCEDIMENTO] às [HORA]!\n\n🌟 Dicas importantes:\n• Chegue 15min antes\n• Venha sem maquiagem\n• Traga documento com foto\n\nMal podemos esperar para te deixar ainda mais radiante! ✨\nNos vemos amanhã!\n\n[PROFISSIONAL]",
    campos_dinamicos: ["NOME", "PROCEDIMENTO", "HORA", "PROFISSIONAL"],
    canal: ["whatsapp", "email"],
    ativo: true,
    tags: ["lembrete", "24h", "cuidados"],
    created_at: new Date("2024-01-15"),
    updated_at: new Date("2024-01-20")
  },
  {
    id: "3",
    nome: "Check-in Pós-Procedimento",
    tipo: "pos_atendimento",
    categoria: "Follow-up",
    conteudo: "Oi [NOME]! 🌸\nComo você está se sentindo após seu [PROCEDIMENTO] de hoje?\n\nSe tiver qualquer dúvida sobre os cuidados, é só me chamar! Estou aqui para te acompanhar em todo o processo.\n\nO resultado vai ficar lindo! 💖\n\nBeijinhos,\n[PROFISSIONAL]",
    campos_dinamicos: ["NOME", "PROCEDIMENTO", "PROFISSIONAL"],
    canal: ["whatsapp"],
    ativo: true,
    tags: ["pos-atendimento", "checkin", "cuidados"],
    created_at: new Date("2024-01-15"),
    updated_at: new Date("2024-01-20")
  },
  {
    id: "4",
    nome: "Reativação Cliente Inativo",
    tipo: "comercial", 
    categoria: "Reativação",
    assunto: "Sentimos sua falta!",
    conteudo: "[NOME], sentimos sua falta! 💔\n\nFaz [TEMPO_AUSENCIA] que não nos vemos... Como anda sua rotina de cuidados?\n\nTenho uma novidade especial para você: [OFERTA_PERSONALIZADA]\n\nQue tal agendar um papo para colocarmos a conversa em dia? 😉\n\nBeijão,\nEquipe [CLINICA]",
    campos_dinamicos: ["NOME", "TEMPO_AUSENCIA", "OFERTA_PERSONALIZADA", "CLINICA"],
    canal: ["whatsapp", "email"],
    ativo: true,
    tags: ["reativacao", "inativo", "oferta"],
    created_at: new Date("2024-01-15"),
    updated_at: new Date("2024-01-20")
  },
  {
    id: "5",
    nome: "Aniversário",
    tipo: "relacionamento",
    categoria: "Datas Especiais",
    assunto: "Parabéns! 🎉",
    conteudo: "🎉 Parabéns, [NOME]! 🎉\n\nHoje é seu dia especial e queremos celebrar com você!\n\nComo presente, temos um desconto especial de [DESCONTO] em qualquer procedimento até o final do mês.\n\nQue tal se presentear com aquele tratamento que você tanto deseja? ✨\n\nFelicidades! 💕\nEquipe [CLINICA]",
    campos_dinamicos: ["NOME", "DESCONTO", "CLINICA"],
    canal: ["whatsapp", "email", "instagram"],
    ativo: true,
    tags: ["aniversario", "desconto", "promocao"],
    created_at: new Date("2024-01-15"),
    updated_at: new Date("2024-01-20")
  }
];

// Agentes IA Mock
export const agentesMock: AgenteIA[] = [
  {
    id: "sophie",
    nome: "Sophie",
    tipo: "sophie",
    descricao: "Agente especializada em captação e conversão de leads",
    personalidade: {
      tom: "profissional_caloroso",
      estilo: "consultiva_elegante", 
      emoji_uso: "moderado",
      linguagem: "formal_acessivel"
    },
    objetivos: [
      "Qualificar leads",
      "Agendar consultas",
      "Responder dúvidas",
      "Converter interesse em vendas"
    ],
    configuracoes: {
      resposta_automatica: true,
      escalation_humano: true,
      threshold_escalation: 7,
      horario_ativo: {
        inicio: "08:00",
        fim: "20:00",
        dias_semana: [1, 2, 3, 4, 5, 6]
      }
    },
    metricas: {
      conversas_iniciadas: 342,
      taxa_resposta: 94.5,
      taxa_conversao: 28.3,
      satisfacao_media: 8.7,
      handoff_rate: 12.1
    },
    ativo: true
  },
  {
    id: "luna",
    nome: "Luna", 
    tipo: "luna",
    descricao: "Agente especializada em relacionamento e retenção",
    personalidade: {
      tom: "intimista_cuidadosa",
      estilo: "conselheira_amiga",
      emoji_uso: "alto",
      linguagem: "informal_carinhosa"
    },
    objetivos: [
      "Monitorar satisfação",
      "Identificar oportunidades",
      "Prevenir churn", 
      "Maximizar LTV"
    ],
    configuracoes: {
      resposta_automatica: true,
      escalation_humano: true,
      threshold_escalation: 6,
      horario_ativo: {
        inicio: "07:00",
        fim: "22:00", 
        dias_semana: [1, 2, 3, 4, 5, 6, 0]
      }
    },
    metricas: {
      conversas_iniciadas: 156,
      taxa_resposta: 89.2,
      taxa_conversao: 35.7,
      satisfacao_media: 9.1,
      handoff_rate: 8.3
    },
    ativo: true
  }
];

// Conversas Mock
export const conversasMock: Conversa[] = [
  {
    id: "1",
    cliente_id: "1",
    agente_id: "sophie",
    canal: "whatsapp",
    status: "ativa",
    contexto: "Lead interessado em harmonização facial",
    tags: ["lead_quente", "primeira_vez", "harmonizacao"],
    prioridade: "alta",
    created_at: new Date("2024-01-20T10:30:00"),
    updated_at: new Date("2024-01-20T11:15:00"),
    ultima_interacao: new Date("2024-01-20T11:15:00")
  },
  {
    id: "2",
    cliente_id: "2", 
    agente_id: "luna",
    canal: "whatsapp",
    status: "finalizada",
    contexto: "Follow-up pós limpeza de pele",
    tags: ["pos_atendimento", "satisfacao", "fidelizacao"],
    prioridade: "media",
    created_at: new Date("2024-01-19T14:20:00"),
    updated_at: new Date("2024-01-19T14:45:00"),
    ultima_interacao: new Date("2024-01-19T14:45:00")
  }
];

// Mensagens Mock
export const mensagensMock: Mensagem[] = [
  {
    id: "1",
    conversa_id: "1",
    remetente: "agente_ia",
    remetente_id: "sophie",
    conteudo: "Olá! Obrigada pelo interesse em nossos tratamentos! Vi que você estava interessada em harmonização facial. Como posso te ajudar? ✨",
    template_id: undefined,
    canal: "whatsapp",
    status: "lida",
    metadata: {
      entregue_em: new Date("2024-01-20T10:31:00"),
      lida_em: new Date("2024-01-20T10:32:00")
    },
    created_at: new Date("2024-01-20T10:30:00")
  },
  {
    id: "2",
    conversa_id: "1", 
    remetente: "cliente",
    conteudo: "Oi! Gostaria de saber mais sobre preenchimento labial",
    canal: "whatsapp",
    status: "lida",
    metadata: {
      entregue_em: new Date("2024-01-20T10:35:00"),
      lida_em: new Date("2024-01-20T10:35:00")
    },
    created_at: new Date("2024-01-20T10:34:00")
  }
];

// Triggers Automáticos Mock
export const triggersMock: TriggerAutomatico[] = [
  {
    id: "1",
    nome: "Lembrete 24h Antes",
    descricao: "Envia lembrete automático 24h antes do agendamento",
    tipo: "tempo",
    condicoes: [
      {
        campo: "agendamento.data",
        operador: "igual",
        valor: "24_horas_antes"
      }
    ],
    acoes: [
      {
        tipo: "enviar_template",
        template_id: "2",
        canal: "whatsapp",
        delay_minutos: 0
      }
    ],
    ativo: true,
    created_at: new Date("2024-01-10")
  },
  {
    id: "2",
    nome: "Cliente Inativo 45 dias",
    descricao: "Detecta cliente sem atendimento há 45 dias",
    tipo: "comportamento",
    condicoes: [
      {
        campo: "ultimo_atendimento",
        operador: "maior",
        valor: 45
      }
    ],
    acoes: [
      {
        tipo: "enviar_template",
        template_id: "4",
        canal: "whatsapp",
        delay_minutos: 0
      }
    ],
    ativo: true,
    created_at: new Date("2024-01-10")
  }
];

// Campanhas Mock
export const campanhasMock: Campanha[] = [
  {
    id: "1",
    nome: "Promoção Verão 2024",
    descricao: "Campanha promocional para tratamentos corporais no verão",
    tipo: "promocional",
    template_id: "5",
    segmentacao: {
      categorias_cliente: ["ativo", "vip"],
      tags: ["corporal", "verao"]
    },
    agendamento: {
      inicio: new Date("2024-12-01"),
      fim: new Date("2024-02-28"),
      horario_inicio: "09:00",
      horario_fim: "18:00",
      dias_semana: [1, 2, 3, 4, 5]
    },
    canal: "whatsapp",
    status: "ativa",
    metricas: {
      enviados: 450,
      entregues: 445,
      lidos: 312,
      respondidos: 89,
      conversoes: 23,
      taxa_abertura: 70.1,
      taxa_conversao: 25.8
    },
    created_at: new Date("2024-11-15")
  },
  {
    id: "2",
    nome: "Reativação Q1 2024",
    descricao: "Campanha para reativar clientes inativos",
    tipo: "reativacao",
    template_id: "4",
    segmentacao: {
      categorias_cliente: ["risco"],
      ultimo_atendimento: {
        inicio: new Date("2023-10-01"),
        fim: new Date("2023-12-31")
      }
    },
    agendamento: {
      inicio: new Date("2024-01-08"),
      fim: new Date("2024-01-31"),
      horario_inicio: "10:00",
      horario_fim: "17:00",
      dias_semana: [2, 3, 4]
    },
    canal: "email",
    status: "finalizada",
    metricas: {
      enviados: 180,
      entregues: 175,
      lidos: 94,
      respondidos: 28,
      conversoes: 12,
      taxa_abertura: 53.7,
      taxa_conversao: 42.9
    },
    created_at: new Date("2024-01-05")
  }
];

// Integrações Mock
export const integracoesMock: IntegracaoCanal[] = [
  {
    id: "1",
    canal: "whatsapp",
    nome: "WhatsApp Business API",
    configuracao: {
      numero_telefone: "+5511999887766",
      ativo: true,
      webhook_verificado: true
    },
    status: "conectado",
    ultima_sincronizacao: new Date("2024-01-20T08:00:00"),
    mensagens_mes: 1247,
    limite_mensal: 10000
  },
  {
    id: "2", 
    canal: "instagram",
    nome: "Instagram Business",
    configuracao: {
      conta_id: "@clinicaestetica",
      ativo: true,
      webhook_verificado: true
    },
    status: "conectado",
    ultima_sincronizacao: new Date("2024-01-20T07:30:00"),
    mensagens_mes: 342,
    limite_mensal: 5000
  },
  {
    id: "3",
    canal: "email",
    nome: "SendGrid Email",
    configuracao: {
      ativo: true,
      webhook_verificado: true
    },
    status: "conectado", 
    ultima_sincronizacao: new Date("2024-01-20T06:00:00"),
    mensagens_mes: 2891,
    limite_mensal: 50000
  }
];

// Métricas Mock
export const metricasComunicacaoMock: MetricaComunicacao = {
  periodo: {
    inicio: new Date("2024-01-01"),
    fim: new Date("2024-01-31")
  },
  mensagens: {
    total_enviadas: 4832,
    total_entregues: 4756,
    total_lidas: 3421,
    total_respondidas: 1247,
    taxa_entrega: 98.4,
    taxa_abertura: 71.9,
    taxa_resposta: 36.4
  },
  conversas: {
    total_iniciadas: 498,
    media_duracao_minutos: 8.5,
    taxa_resolucao_ia: 87.3,
    taxa_escalation: 12.7,
    satisfacao_media: 8.9
  },
  conversoes: {
    leads_gerados: 156,
    agendamentos_realizados: 89,
    vendas_fechadas: 67,
    receita_gerada: 45680.00,
    roi_campanha: 342.5
  },
  canais: {
    whatsapp: {
      mensagens: 1247,
      conversoes: 23,
      taxa_engajamento: 78.2
    },
    instagram: {
      mensagens: 342,
      conversoes: 8,
      taxa_engajamento: 65.4
    },
    email: {
      mensagens: 2891,
      conversoes: 32,
      taxa_engajamento: 45.7
    },
    sms: {
      mensagens: 352,
      conversoes: 4,
      taxa_engajamento: 82.1
    },
    site: {
      mensagens: 0,
      conversoes: 0,
      taxa_engajamento: 0
    }
  }
};