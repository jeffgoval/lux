/**
 * Types for Medical Images System
 * Requirements: 6.3, 6.4
 */

import { TipoImagem } from './enums';

// Status de processamento de imagem
export enum StatusProcessamentoImagem {
  PENDENTE = 'pendente',
  PROCESSANDO = 'processando',
  CONCLUIDO = 'concluido',
  ERRO = 'erro',
  REJEITADO = 'rejeitado'
}

// Qualidade de imagem
export enum QualidadeImagem {
  BAIXA = 'baixa',
  MEDIA = 'media',
  ALTA = 'alta',
  ORIGINAL = 'original'
}

// Interface principal para imagem médica
export interface ImagemMedica {
  id: string;
  sessao_id: string;
  tipo_imagem: TipoImagem;
  
  // Dados de armazenamento
  url_storage: string;
  url_thumbnail?: string;
  nome_arquivo_original: string;
  nome_arquivo_storage: string;
  tamanho_bytes: number;
  mime_type: string;
  resolucao?: string;
  qualidade: QualidadeImagem;
  
  // Metadados médicos
  regiao_corporal: string;
  angulo_captura?: string;
  condicoes_iluminacao?: string;
  observacoes_imagem?: string;
  palavras_chave?: string[];
  
  // Controle de acesso
  visivel_paciente: boolean;
  visivel_outros_profissionais: boolean;
  requer_consentimento: boolean;
  consentimento_obtido: boolean;
  data_consentimento?: string;
  
  // Watermark e segurança
  watermark_aplicado: boolean;
  watermark_texto?: string;
  criptografada: boolean;
  chave_criptografia?: string;
  
  // Status de processamento
  status_processamento: StatusProcessamentoImagem;
  erro_processamento?: string;
  tentativas_processamento: number;
  
  // Metadados técnicos
  exif_data?: Record<string, any>;
  hash_arquivo: string;
  versao_processamento: number;
  
  // Auditoria
  capturada_em: string;
  processada_em?: string;
  capturada_por: string;
  aprovada_por?: string;
  data_aprovacao?: string;
  
  // Armazenamento e backup
  bucket_storage: string;
  path_storage: string;
  backup_realizado: boolean;
  backup_url?: string;
  data_backup?: string;
  
  // Retenção
  data_expiracao?: string;
  arquivada: boolean;
  data_arquivamento?: string;
  motivo_arquivamento?: string;
  
  // Timestamps
  criado_em: string;
  atualizado_em: string;
}

// Interface para criação de imagem
export interface CriarImagemMedicaRequest {
  sessao_id: string;
  tipo_imagem: TipoImagem;
  nome_arquivo_original: string;
  tamanho_bytes: number;
  mime_type: string;
  regiao_corporal: string;
  hash_arquivo: string;
  resolucao?: string;
  observacoes_imagem?: string;
  visivel_paciente?: boolean;
  requer_consentimento?: boolean;
  palavras_chave?: string[];
  angulo_captura?: string;
  condicoes_iluminacao?: string;
}

// Interface para upload de arquivo
export interface UploadImagemRequest {
  file: File;
  sessao_id: string;
  tipo_imagem: TipoImagem;
  regiao_corporal: string;
  observacoes?: string;
  visivel_paciente?: boolean;
  palavras_chave?: string[];
  angulo_captura?: string;
  condicoes_iluminacao?: string;
}

// Interface para resposta de upload
export interface UploadImagemResponse {
  success: boolean;
  imagem_id?: string;
  url_storage?: string;
  url_thumbnail?: string;
  error?: string;
  details?: {
    nome_arquivo_storage: string;
    path_storage: string;
    hash_arquivo: string;
    tamanho_bytes: number;
    status_processamento: StatusProcessamentoImagem;
  };
}

// Interface para processamento de imagem
export interface ProcessarImagemRequest {
  imagem_id: string;
  aplicar_watermark?: boolean;
  gerar_thumbnail?: boolean;
  redimensionar?: {
    largura: number;
    altura: number;
    manter_proporcao: boolean;
  };
  qualidade?: QualidadeImagem;
}

// Interface para resposta de processamento
export interface ProcessarImagemResponse {
  success: boolean;
  imagem_id: string;
  status_processamento: StatusProcessamentoImagem;
  url_processada?: string;
  url_thumbnail?: string;
  error?: string;
  detalhes_processamento?: {
    watermark_aplicado: boolean;
    thumbnail_gerado: boolean;
    redimensionado: boolean;
    tempo_processamento_ms: number;
  };
}

// Interface para consentimento
export interface ConsentimentoImagemRequest {
  imagem_id: string;
  consentimento_obtido: boolean;
}

// Interface para aprovação
export interface AprovarImagemRequest {
  imagem_id: string;
  visivel_paciente?: boolean;
  visivel_outros_profissionais?: boolean;
}

// Interface para listagem de imagens
export interface ListarImagensRequest {
  sessao_id: string;
  incluir_arquivadas?: boolean;
  tipo_imagem?: TipoImagem;
  regiao_corporal?: string;
}

// Interface para comparação de evolução
export interface CompararEvolucaoRequest {
  sessao_id: string;
  regiao_corporal: string;
}

// Interface para resultado de comparação
export interface CompararEvolucaoResponse {
  imagens: Array<{
    tipo_imagem: TipoImagem;
    imagem_id: string;
    url_storage: string;
    capturada_em: string;
    observacoes?: string;
  }>;
}

// Interface para backup
export interface BackupImagensRequest {
  clinica_id?: string;
  data_inicio?: string;
  data_fim?: string;
}

// Interface para resposta de backup
export interface BackupImagensResponse {
  success: boolean;
  imagens_processadas: number;
  imagens_com_erro: number;
  tamanho_total_mb: number;
  tempo_processamento_ms: number;
  errors?: string[];
}

// Interface para relatório de uso
export interface RelatorioUsoImagensRequest {
  clinica_id: string;
  data_inicio?: string;
  data_fim?: string;
}

// Interface para resposta de relatório
export interface RelatorioUsoImagensResponse {
  total_imagens: number;
  imagens_por_tipo: Record<TipoImagem, number>;
  tamanho_total_mb: number;
  imagens_com_watermark: number;
  imagens_visiveis_paciente: number;
  imagens_pendentes_processamento: number;
  regioes_mais_fotografadas: Record<string, number>;
}

// Interface para verificação de integridade
export interface ProblemaIntegridade {
  imagem_id: string;
  problema: string;
  severidade: 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';
  sugestao_correcao: string;
}

// Interface para configurações de upload
export interface ConfiguracoesUpload {
  tamanho_maximo_mb: number;
  tipos_mime_permitidos: string[];
  aplicar_watermark_automatico: boolean;
  gerar_thumbnail_automatico: boolean;
  qualidade_padrao: QualidadeImagem;
  requer_consentimento_padrao: boolean;
  visivel_paciente_padrao: boolean;
}

// Interface para metadados EXIF
export interface ExifData {
  make?: string;
  model?: string;
  datetime?: string;
  orientation?: number;
  x_resolution?: number;
  y_resolution?: number;
  resolution_unit?: number;
  software?: string;
  color_space?: number;
  pixel_x_dimension?: number;
  pixel_y_dimension?: number;
  [key: string]: any;
}

// Interface para log de acesso
export interface LogAcessoImagem {
  imagem_id: string;
  acao: 'VISUALIZACAO' | 'CRIACAO' | 'MODIFICACAO' | 'EXCLUSAO' | 'CONSENTIMENTO' | 'APROVACAO';
  contexto?: Record<string, any>;
}

// Type guards
export const isImagemMedica = (obj: any): obj is ImagemMedica => {
  return obj && typeof obj.id === 'string' && typeof obj.sessao_id === 'string';
};

export const isUploadImagemRequest = (obj: any): obj is UploadImagemRequest => {
  return obj && obj.file instanceof File && typeof obj.sessao_id === 'string';
};

// Constantes
export const MIME_TYPES_PERMITIDOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff'
] as const;

export const TAMANHO_MAXIMO_BYTES = 52428800; // 50MB

export const CONFIGURACOES_PADRAO: ConfiguracoesUpload = {
  tamanho_maximo_mb: 50,
  tipos_mime_permitidos: [...MIME_TYPES_PERMITIDOS],
  aplicar_watermark_automatico: true,
  gerar_thumbnail_automatico: true,
  qualidade_padrao: QualidadeImagem.ALTA,
  requer_consentimento_padrao: true,
  visivel_paciente_padrao: false
};

export type StatusProcessamentoImagemType = keyof typeof StatusProcessamentoImagem;
export type QualidadeImagemType = keyof typeof QualidadeImagem;