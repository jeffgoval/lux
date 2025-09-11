export type TipoProcedimento = 
  | 'botox_toxina'
  | 'preenchimento'
  | 'harmonizacao_facial'
  | 'laser_ipl'
  | 'peeling'
  | 'tratamento_corporal'
  | 'skincare_avancado'
  | 'outro';

export type NivelAcessoMedico = 
  | 'medico'
  | 'enfermeiro'
  | 'esteticista'
  | 'recepcionista'
  | 'admin';

export type StatusProntuario = 
  | 'ativo'
  | 'arquivado'
  | 'transferido';

export type TipoConsentimento = 
  | 'procedimento'
  | 'anestesia'
  | 'imagem'
  | 'dados_pessoais';

export type TipoImagem = 
  | 'antes'
  | 'durante'
  | 'depois'
  | 'evolucao';

export type TipoAcesso = 
  | 'visualizacao'
  | 'edicao'
  | 'impressao'
  | 'exportacao';

// Interfaces principais
export interface Prontuario {
  id: string;
  cliente_id: string;
  medico_responsavel_id: string;
  numero_prontuario: string;
  status: StatusProntuario;
  
  // Dados médicos criptografados
  anamnese_criptografada?: string;
  historico_medico_criptografado?: string;
  medicamentos_atuais_criptografado?: string;
  alergias_criptografado?: string;
  contraindicacoes_criptografado?: string;
  
  // Metadados de auditoria
  criado_em: string;
  atualizado_em: string;
  criado_por: string;
  atualizado_por: string;
  versao: number;
  hash_integridade: string;
}

export interface SessaoAtendimento {
  id: string;
  prontuario_id: string;
  tipo_procedimento: TipoProcedimento;
  data_atendimento: string;
  profissional_id: string;
  
  // Dados do procedimento
  procedimento_detalhes: Record<string, any>;
  produtos_utilizados?: Record<string, any>;
  equipamentos_utilizados?: Record<string, any>;
  parametros_tecnicos?: Record<string, any>;
  
  // Observações médicas
  observacoes_pre?: string;
  observacoes_pos?: string;
  intercorrencias?: string;
  orientacoes_paciente?: string;
  
  // Resultados e evolução
  resultados_imediatos?: string;
  satisfacao_paciente?: number; // 1-10
  proxima_sessao_recomendada?: string;
  
  // Auditoria
  criado_em: string;
  criado_por: string;
  hash_integridade: string;
}

export interface ImagemMedica {
  id: string;
  sessao_id: string;
  tipo_imagem: TipoImagem;
  
  // Dados da imagem criptografados
  url_criptografada: string;
  nome_arquivo_original: string;
  tamanho_bytes: number;
  mime_type: string;
  resolucao?: string;
  
  // Metadados médicos
  regiao_corporal: string;
  angulo_captura?: string;
  condicoes_iluminacao?: string;
  observacoes_imagem?: string;
  
  // Controle de acesso
  visivel_paciente: boolean;
  watermark_aplicado: boolean;
  
  // Auditoria
  capturada_em: string;
  capturada_por: string;
  hash_imagem: string;
}

export interface ConsentimentoDigital {
  id: string;
  prontuario_id: string;
  tipo_consentimento: TipoConsentimento;
  
  // Dados do consentimento
  titulo: string;
  conteudo_documento: string;
  versao_documento: string;
  
  // Assinatura digital
  assinatura_digital: string;
  hash_documento: string;
  timestamp_assinatura: string;
  ip_assinatura: string;
  
  // Validade
  data_inicio: string;
  data_expiracao?: string;
  ativo: boolean;
  
  // Auditoria
  criado_em: string;
  criado_por: string;
}

export interface TemplateProcedimento {
  id: string;
  tipo_procedimento: TipoProcedimento;
  nome_template: string;
  
  // Estrutura do template
  campos_obrigatorios: Record<string, any>;
  campos_opcionais?: Record<string, any>;
  validacoes?: Record<string, any>;
  valores_padrao?: Record<string, any>;
  
  // Configuração
  ativo: boolean;
  personalizavel: boolean;
  criado_por?: string;
  
  // Auditoria
  criado_em: string;
  atualizado_em: string;
}

export interface AuditoriaMedica {
  id: string;
  tabela_origem: string;
  registro_id: string;
  operacao: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';
  
  // Dados da operação
  dados_anteriores?: Record<string, any>;
  dados_novos?: Record<string, any>;
  usuario_id: string;
  ip_origem: string;
  user_agent?: string;
  
  // Contexto médico
  justificativa?: string;
  nivel_criticidade: string;
  
  // Timestamp
  executado_em: string;
}

export interface AcessoProntuario {
  id: string;
  prontuario_id: string;
  usuario_id: string;
  tipo_acesso: TipoAcesso;
  
  // Detalhes do acesso
  secoes_acessadas?: string[];
  duracao_acesso?: string;
  ip_acesso: string;
  dispositivo?: string;
  
  // Justificativa (obrigatória para alguns acessos)
  justificativa_clinica?: string;
  
  // Timestamp
  iniciado_em: string;
  finalizado_em?: string;
}

// Interfaces para formulários e UX
export interface FormularioProcedimento {
  tipo_procedimento: TipoProcedimento;
  dados_procedimento: Record<string, any>;
  observacoes_pre?: string;
  observacoes_pos?: string;
  produtos_utilizados?: Array<{
    produto: string;
    quantidade: number;
    lote?: string;
  }>;
  equipamentos_utilizados?: string[];
  parametros_tecnicos?: Record<string, any>;
}

export interface NovoConsentimento {
  tipo_consentimento: TipoConsentimento;
  titulo: string;
  conteudo_documento: string;
  data_expiracao?: string;
}

// Interfaces para relatórios e métricas
export interface MetricasProntuario {
  total_prontuarios: number;
  prontuarios_ativos: number;
  sessoes_ultimo_mes: number;
  satisfacao_media: number;
  procedimentos_mais_realizados: Array<{
    tipo: TipoProcedimento;
    quantidade: number;
  }>;
}

export interface FiltrosProntuario {
  cliente_id?: string;
  medico_responsavel_id?: string;
  status?: StatusProntuario[];
  tipo_procedimento?: TipoProcedimento[];
  data_inicio?: string;
  data_fim?: string;
  busca?: string;
}

// Interfaces para segurança e compliance
export interface ConfiguracaoSeguranca {
  criptografia_habilitada: boolean;
  backup_automatico: boolean;
  auditoria_completa: boolean;
  retencao_dados_dias: number;
  watermark_obrigatorio: boolean;
  assinatura_digital_obrigatoria: boolean;
}

export interface RelatorioCompliance {
  periodo: {
    inicio: string;
    fim: string;
  };
  total_acessos: number;
  acessos_nao_autorizados: number;
  modificacoes_prontuarios: number;
  consentimentos_vencidos: number;
  backup_status: 'ok' | 'atrasado' | 'falhou';
  conformidade_lgpd: boolean;
}