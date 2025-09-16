/**
 * Fundamental Enums for Sistema Completo de Clínicas de Estética
 * These types correspond to the PostgreSQL enums defined in the database
 * Requirements: 1.1, 2.1, 3.1, 6.1
 */

// Tipos de procedimentos estéticos
export enum TipoProcedimento {
  BOTOX_TOXINA = 'botox_toxina',
  PREENCHIMENTO = 'preenchimento',
  HARMONIZACAO_FACIAL = 'harmonizacao_facial',
  LASER_IPL = 'laser_ipl',
  PEELING = 'peeling',
  TRATAMENTO_CORPORAL = 'tratamento_corporal',
  SKINCARE_AVANCADO = 'skincare_avancado',
  MICROAGULHAMENTO = 'microagulhamento',
  RADIOFREQUENCIA = 'radiofrequencia',
  CRIOLIPOLISE = 'criolipólise',
  LIMPEZA_PELE = 'limpeza_pele',
  HIDRATACAO_FACIAL = 'hidratacao_facial',
  MASSAGEM_MODELADORA = 'massagem_modeladora',
  DRENAGEM_LINFATICA = 'drenagem_linfatica',
  CARBOXITERAPIA = 'carboxiterapia',
  MESOTERAPIA = 'mesoterapia',
  OUTRO = 'outro'
}

// Especialidades médicas e profissionais
export enum EspecialidadeMedica {
  DERMATOLOGIA = 'dermatologia',
  CIRURGIA_PLASTICA = 'cirurgia_plastica',
  MEDICINA_ESTETICA = 'medicina_estetica',
  FISIOTERAPIA_DERMATOFUNCIONAL = 'fisioterapia_dermatofuncional',
  BIOMEDICINA_ESTETICA = 'biomedicina_estetica',
  ENFERMAGEM_ESTETICA = 'enfermagem_estetica',
  ESTETICISTA = 'esteticista',
  COSMETOLOGIA = 'cosmetologia',
  TERAPIA_CAPILAR = 'terapia_capilar',
  PODOLOGIA = 'podologia',
  OUTRO = 'outro'
}

// Categorias de produtos para estoque
export enum CategoriaProduto {
  CREMES = 'cremes',
  SERUNS = 'seruns',
  DESCARTAVEIS = 'descartaveis',
  ANESTESICOS = 'anestesicos',
  LIMPEZA = 'limpeza',
  EQUIPAMENTOS_CONSUMO = 'equipamentos_consumo',
  MEDICAMENTOS = 'medicamentos',
  COSMETICOS = 'cosmeticos',
  SUPLEMENTOS = 'suplementos',
  INJETAVEIS = 'injetaveis',
  MATERIAIS_CIRURGICOS = 'materiais_cirurgicos',
  PRODUTOS_POS_PROCEDIMENTO = 'produtos_pos_procedimento',
  PRODUTOS_MANUTENCAO = 'produtos_manutencao',
  ACESSORIOS = 'acessorios'
}

// Status de produtos no estoque
export enum StatusProduto {
  DISPONIVEL = 'disponivel',
  BAIXO_ESTOQUE = 'baixo_estoque',
  VENCIDO = 'vencido',
  DESCONTINUADO = 'descontinuado',
  EM_FALTA = 'em_falta',
  RESERVADO = 'reservado',
  BLOQUEADO = 'bloqueado'
}

// Tipos de movimentação de estoque
export enum TipoMovimentacao {
  ENTRADA = 'entrada',
  SAIDA = 'saida',
  AJUSTE = 'ajuste',
  VENCIMENTO = 'vencimento',
  PERDA = 'perda',
  TRANSFERENCIA = 'transferencia',
  DEVOLUCAO = 'devolucao',
  CONSUMO_PROCEDIMENTO = 'consumo_procedimento'
}

// Unidades de medida para produtos
export enum UnidadeMedida {
  ML = 'ml',
  G = 'g',
  KG = 'kg',
  UNIDADE = 'unidade',
  CAIXA = 'caixa',
  FRASCO = 'frasco',
  TUBO = 'tubo',
  AMPOLA = 'ampola',
  SERINGA = 'seringa',
  LITRO = 'litro',
  METRO = 'metro',
  PAR = 'par'
}

// Status de prontuários médicos
export enum StatusProntuario {
  ATIVO = 'ativo',
  ARQUIVADO = 'arquivado',
  TRANSFERIDO = 'transferido',
  SUSPENSO = 'suspenso'
}

// Tipos de imagens médicas
export enum TipoImagem {
  ANTES = 'antes',
  DURANTE = 'durante',
  DEPOIS = 'depois',
  EVOLUCAO = 'evolucao',
  COMPLICACAO = 'complicacao',
  REFERENCIA = 'referencia'
}

// Status de agendamentos
export enum StatusAgendamento {
  AGENDADO = 'agendado',
  CONFIRMADO = 'confirmado',
  EM_ANDAMENTO = 'em_andamento',
  CONCLUIDO = 'concluido',
  CANCELADO = 'cancelado',
  REAGENDADO = 'reagendado',
  FALTA = 'falta',
  EM_ESPERA = 'em_espera'
}

// Prioridade de agendamentos
export enum PrioridadeAgendamento {
  BAIXA = 'baixa',
  NORMAL = 'normal',
  ALTA = 'alta',
  URGENTE = 'urgente',
  VIP = 'vip'
}

// Tipos de notificação
export enum TipoNotificacao {
  LEMBRETE_AGENDAMENTO = 'lembrete_agendamento',
  CONFIRMACAO_AGENDAMENTO = 'confirmacao_agendamento',
  CANCELAMENTO = 'cancelamento',
  REAGENDAMENTO = 'reagendamento',
  PROMOCAO = 'promocao',
  ANIVERSARIO = 'aniversario',
  POS_PROCEDIMENTO = 'pos_procedimento',
  ESTOQUE_BAIXO = 'estoque_baixo',
  PRODUTO_VENCENDO = 'produto_vencendo',
  SISTEMA = 'sistema'
}

// Status de notificações
export enum StatusNotificacao {
  PENDENTE = 'pendente',
  ENVIADA = 'enviada',
  ENTREGUE = 'entregue',
  LIDA = 'lida',
  FALHOU = 'falhou',
  CANCELADA = 'cancelada'
}

// Canais de comunicação
export enum CanalComunicacao {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  EMAIL = 'email',
  PUSH_NOTIFICATION = 'push_notification',
  TELEFONE = 'telefone',
  SISTEMA = 'sistema'
}

// Tipos de relatório financeiro
export enum TipoRelatorio {
  RECEITAS = 'receitas',
  DESPESAS = 'despesas',
  COMISSOES = 'comissoes',
  PRODUTOS = 'produtos',
  PROCEDIMENTOS = 'procedimentos',
  CLIENTES = 'clientes',
  PROFISSIONAIS = 'profissionais',
  CONSOLIDADO = 'consolidado'
}

// Período de relatórios
export enum PeriodoRelatorio {
  DIARIO = 'diario',
  SEMANAL = 'semanal',
  MENSAL = 'mensal',
  TRIMESTRAL = 'trimestral',
  SEMESTRAL = 'semestral',
  ANUAL = 'anual',
  PERSONALIZADO = 'personalizado'
}

// Métodos de pagamento
export enum MetodoPagamento {
  DINHEIRO = 'dinheiro',
  CARTAO_CREDITO = 'cartao_credito',
  CARTAO_DEBITO = 'cartao_debito',
  PIX = 'pix',
  TRANSFERENCIA = 'transferencia',
  BOLETO = 'boleto',
  FINANCIAMENTO = 'financiamento',
  CORTESIA = 'cortesia'
}

// Status de pagamento
export enum StatusPagamento {
  PENDENTE = 'pendente',
  PAGO = 'pago',
  PARCIAL = 'parcial',
  VENCIDO = 'vencido',
  CANCELADO = 'cancelado',
  ESTORNADO = 'estornado'
}

// Type unions para facilitar o uso
export type TipoProcedimentoType = keyof typeof TipoProcedimento;
export type EspecialidadeMedicaType = keyof typeof EspecialidadeMedica;
export type CategoriaProdutoType = keyof typeof CategoriaProduto;
export type StatusProdutoType = keyof typeof StatusProduto;
export type TipoMovimentacaoType = keyof typeof TipoMovimentacao;
export type UnidadeMedidaType = keyof typeof UnidadeMedida;
export type StatusProntuarioType = keyof typeof StatusProntuario;
export type TipoImagemType = keyof typeof TipoImagem;
export type StatusAgendamentoType = keyof typeof StatusAgendamento;
export type PrioridadeAgendamentoType = keyof typeof PrioridadeAgendamento;
export type TipoNotificacaoType = keyof typeof TipoNotificacao;
export type StatusNotificacaoType = keyof typeof StatusNotificacao;
export type CanalComunicacaoType = keyof typeof CanalComunicacao;
export type TipoRelatorioType = keyof typeof TipoRelatorio;
export type PeriodoRelatorioType = keyof typeof PeriodoRelatorio;
export type MetodoPagamentoType = keyof typeof MetodoPagamento;
export type StatusPagamentoType = keyof typeof StatusPagamento;