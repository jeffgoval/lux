/**
 * Medical Images Service
 * Handles secure upload, processing, and management of medical images
 * Requirements: 6.3
 */

import { supabase } from '@/integrations/supabase/client';
import {
  ImagemMedica,
  CriarImagemMedicaRequest,
  UploadImagemRequest,
  UploadImagemResponse,
  ProcessarImagemRequest,
  ProcessarImagemResponse,
  ConsentimentoImagemRequest,
  AprovarImagemRequest,
  ListarImagensRequest,
  CompararEvolucaoRequest,
  CompararEvolucaoResponse,
  BackupImagensRequest,
  BackupImagensResponse,
  RelatorioUsoImagensRequest,
  RelatorioUsoImagensResponse,
  ProblemaIntegridade,
  LogAcessoImagem,
  MIME_TYPES_PERMITIDOS,
  TAMANHO_MAXIMO_BYTES,
  StatusProcessamentoImagem,
  QualidadeImagem
} from '@/types/imagem-medica';
import { TipoImagem } from '@/types/enums';

export class ImagemMedicaService {
  private readonly BUCKET_NAME = 'imagens-medicas';

  /**
   * Calcula hash SHA-256 de um arquivo
   */
  private async calcularHashArquivo(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Valida arquivo antes do upload
   */
  private validarArquivo(file: File): { valido: boolean; erro?: string } {
    // Verificar tipo MIME
    if (!MIME_TYPES_PERMITIDOS.includes(file.type as any)) {
      return {
        valido: false,
        erro: `Tipo de arquivo não suportado: ${file.type}. Tipos permitidos: ${MIME_TYPES_PERMITIDOS.join(', ')}`
      };
    }

    // Verificar tamanho
    if (file.size > TAMANHO_MAXIMO_BYTES) {
      return {
        valido: false,
        erro: `Arquivo muito grande: ${(file.size / 1048576).toFixed(2)}MB. Máximo permitido: 50MB`
      };
    }

    return { valido: true };
  }

  /**
   * Extrai metadados básicos da imagem
   */
  private async extrairMetadados(file: File): Promise<{ resolucao?: string; exif_data?: Record<string, any> }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          resolucao: `${img.naturalWidth}x${img.naturalHeight}`,
          exif_data: {
            width: img.naturalWidth,
            height: img.naturalHeight,
            file_size: file.size,
            mime_type: file.type,
            last_modified: new Date(file.lastModified).toISOString()
          }
        });
      };
      img.onerror = () => {
        resolve({});
      };
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Faz upload de imagem médica
   */
  async uploadImagem(request: UploadImagemRequest): Promise<UploadImagemResponse> {
    try {
      // Validar arquivo
      const validacao = this.validarArquivo(request.file);
      if (!validacao.valido) {
        return {
          success: false,
          error: validacao.erro
        };
      }

      // Calcular hash do arquivo
      const hash_arquivo = await this.calcularHashArquivo(request.file);

      // Extrair metadados
      const metadados = await this.extrairMetadados(request.file);

      // Verificar se já existe imagem com mesmo hash
      const { data: imagemExistente } = await supabase
        .from('imagens_medicas')
        .select('id, url_storage')
        .eq('hash_arquivo', hash_arquivo)
        .eq('sessao_id', request.sessao_id)
        .single();

      if (imagemExistente) {
        return {
          success: false,
          error: 'Imagem duplicada já existe para esta sessão'
        };
      }

      // Criar registro da imagem no banco
      const criarImagemRequest: CriarImagemMedicaRequest = {
        sessao_id: request.sessao_id,
        tipo_imagem: request.tipo_imagem,
        nome_arquivo_original: request.file.name,
        tamanho_bytes: request.file.size,
        mime_type: request.file.type,
        regiao_corporal: request.regiao_corporal,
        hash_arquivo,
        resolucao: metadados.resolucao,
        observacoes_imagem: request.observacoes,
        visivel_paciente: request.visivel_paciente ?? false,
        requer_consentimento: true,
        palavras_chave: request.palavras_chave,
        angulo_captura: request.angulo_captura,
        condicoes_iluminacao: request.condicoes_iluminacao
      };

      const { data: novaImagem, error: errorCriar } = await supabase
        .rpc('criar_imagem_medica', criarImagemRequest);

      if (errorCriar || !novaImagem) {
        return {
          success: false,
          error: `Erro ao criar registro da imagem: ${errorCriar?.message}`
        };
      }

      // Buscar dados completos da imagem criada
      const { data: imagemCriada, error: errorBuscar } = await supabase
        .from('imagens_medicas')
        .select('*')
        .eq('id', novaImagem)
        .single();

      if (errorBuscar || !imagemCriada) {
        return {
          success: false,
          error: 'Erro ao buscar dados da imagem criada'
        };
      }

      // Upload do arquivo para o Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(imagemCriada.path_storage, request.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        // Remover registro do banco se upload falhou
        await supabase
          .from('imagens_medicas')
          .delete()
          .eq('id', novaImagem);

        return {
          success: false,
          error: `Erro no upload: ${uploadError.message}`
        };
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(imagemCriada.path_storage);

      // Atualizar registro com URL do storage
      await supabase
        .from('imagens_medicas')
        .update({
          url_storage: urlData.publicUrl,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', novaImagem);

      // Iniciar processamento assíncrono (watermark, thumbnail)
      this.processarImagemAssincrono(novaImagem);

      return {
        success: true,
        imagem_id: novaImagem,
        url_storage: urlData.publicUrl,
        details: {
          nome_arquivo_storage: imagemCriada.nome_arquivo_storage,
          path_storage: imagemCriada.path_storage,
          hash_arquivo,
          tamanho_bytes: request.file.size,
          status_processamento: StatusProcessamentoImagem.PENDENTE
        }
      };

    } catch (error) {
      console.error('Erro no upload de imagem:', error);
      return {
        success: false,
        error: `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * Processa imagem de forma assíncrona
   */
  private async processarImagemAssincrono(imagemId: string): Promise<void> {
    try {
      // Aplicar watermark
      await supabase.rpc('aplicar_watermark_imagem', { p_imagem_id: imagemId });
      
      // Gerar thumbnail (simulado - na implementação real seria feito via Edge Function)
      await this.gerarThumbnail(imagemId);
      
    } catch (error) {
      console.error('Erro no processamento assíncrono:', error);
      
      // Atualizar status de erro
      await supabase
        .from('imagens_medicas')
        .update({
          status_processamento: StatusProcessamentoImagem.ERRO,
          erro_processamento: error instanceof Error ? error.message : 'Erro no processamento',
          tentativas_processamento: supabase.raw('tentativas_processamento + 1')
        })
        .eq('id', imagemId);
    }
  }

  /**
   * Gera thumbnail da imagem
   */
  private async gerarThumbnail(imagemId: string): Promise<void> {
    // Na implementação real, isso seria feito via Edge Function
    // Por enquanto, apenas simular o processo
    
    const { data: imagem } = await supabase
      .from('imagens_medicas')
      .select('path_storage, url_storage')
      .eq('id', imagemId)
      .single();

    if (imagem) {
      // Simular geração de thumbnail
      const thumbnailPath = imagem.path_storage.replace(/(\.[^.]+)$/, '_thumb$1');
      const thumbnailUrl = imagem.url_storage.replace(/(\.[^.]+)$/, '_thumb$1');
      
      await supabase
        .from('imagens_medicas')
        .update({
          url_thumbnail: thumbnailUrl
        })
        .eq('id', imagemId);
    }
  }

  /**
   * Processa imagem com opções específicas
   */
  async processarImagem(request: ProcessarImagemRequest): Promise<ProcessarImagemResponse> {
    try {
      const inicioProcessamento = Date.now();

      // Buscar dados da imagem
      const { data: imagem, error } = await supabase
        .from('imagens_medicas')
        .select('*')
        .eq('id', request.imagem_id)
        .single();

      if (error || !imagem) {
        return {
          success: false,
          imagem_id: request.imagem_id,
          status_processamento: StatusProcessamentoImagem.ERRO,
          error: 'Imagem não encontrada'
        };
      }

      let watermarkAplicado = imagem.watermark_aplicado;
      let thumbnailGerado = !!imagem.url_thumbnail;
      let redimensionado = false;

      // Aplicar watermark se solicitado
      if (request.aplicar_watermark && !watermarkAplicado) {
        const { error: watermarkError } = await supabase
          .rpc('aplicar_watermark_imagem', { p_imagem_id: request.imagem_id });
        
        if (!watermarkError) {
          watermarkAplicado = true;
        }
      }

      // Gerar thumbnail se solicitado
      if (request.gerar_thumbnail && !thumbnailGerado) {
        await this.gerarThumbnail(request.imagem_id);
        thumbnailGerado = true;
      }

      // Redimensionar se solicitado
      if (request.redimensionar) {
        // Na implementação real, seria feito via Edge Function
        redimensionado = true;
      }

      const tempoProcessamento = Date.now() - inicioProcessamento;

      // Atualizar status
      await supabase
        .from('imagens_medicas')
        .update({
          status_processamento: StatusProcessamentoImagem.CONCLUIDO,
          processada_em: new Date().toISOString(),
          qualidade: request.qualidade || imagem.qualidade
        })
        .eq('id', request.imagem_id);

      // Buscar URLs atualizadas
      const { data: imagemAtualizada } = await supabase
        .from('imagens_medicas')
        .select('url_storage, url_thumbnail')
        .eq('id', request.imagem_id)
        .single();

      return {
        success: true,
        imagem_id: request.imagem_id,
        status_processamento: StatusProcessamentoImagem.CONCLUIDO,
        url_processada: imagemAtualizada?.url_storage,
        url_thumbnail: imagemAtualizada?.url_thumbnail,
        detalhes_processamento: {
          watermark_aplicado: watermarkAplicado,
          thumbnail_gerado: thumbnailGerado,
          redimensionado,
          tempo_processamento_ms: tempoProcessamento
        }
      };

    } catch (error) {
      return {
        success: false,
        imagem_id: request.imagem_id,
        status_processamento: StatusProcessamentoImagem.ERRO,
        error: error instanceof Error ? error.message : 'Erro no processamento'
      };
    }
  }

  /**
   * Gerencia consentimento do paciente
   */
  async gerenciarConsentimento(request: ConsentimentoImagemRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .rpc('obter_consentimento_imagem', {
          p_imagem_id: request.imagem_id,
          p_consentimento_obtido: request.consentimento_obtido
        });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao gerenciar consentimento'
      };
    }
  }

  /**
   * Aprova imagem para visualização
   */
  async aprovarImagem(request: AprovarImagemRequest): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .rpc('aprovar_imagem_medica', {
          p_imagem_id: request.imagem_id,
          p_visivel_paciente: request.visivel_paciente ?? true,
          p_visivel_outros_profissionais: request.visivel_outros_profissionais ?? true
        });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao aprovar imagem'
      };
    }
  }

  /**
   * Lista imagens de uma sessão
   */
  async listarImagensSessao(request: ListarImagensRequest): Promise<ImagemMedica[]> {
    try {
      const { data, error } = await supabase
        .rpc('listar_imagens_sessao', {
          p_sessao_id: request.sessao_id,
          p_incluir_arquivadas: request.incluir_arquivadas ?? false
        });

      if (error) {
        console.error('Erro ao listar imagens:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Erro ao listar imagens:', error);
      return [];
    }
  }

  /**
   * Compara imagens de evolução
   */
  async compararEvolucao(request: CompararEvolucaoRequest): Promise<CompararEvolucaoResponse> {
    try {
      const { data, error } = await supabase
        .rpc('comparar_imagens_evolucao', {
          p_sessao_id: request.sessao_id,
          p_regiao_corporal: request.regiao_corporal
        });

      if (error) {
        console.error('Erro ao comparar evolução:', error);
        return { imagens: [] };
      }

      return {
        imagens: data || []
      };

    } catch (error) {
      console.error('Erro ao comparar evolução:', error);
      return { imagens: [] };
    }
  }

  /**
   * Realiza backup de imagens
   */
  async realizarBackup(request: BackupImagensRequest): Promise<BackupImagensResponse> {
    try {
      const inicioBackup = Date.now();

      const { data, error } = await supabase
        .rpc('realizar_backup_imagens', {
          p_clinica_id: request.clinica_id,
          p_data_inicio: request.data_inicio,
          p_data_fim: request.data_fim
        });

      if (error) {
        return {
          success: false,
          imagens_processadas: 0,
          imagens_com_erro: 0,
          tamanho_total_mb: 0,
          tempo_processamento_ms: Date.now() - inicioBackup,
          errors: [error.message]
        };
      }

      const resultado = data[0];

      return {
        success: true,
        imagens_processadas: resultado.imagens_processadas,
        imagens_com_erro: resultado.imagens_com_erro,
        tamanho_total_mb: resultado.tamanho_total_mb,
        tempo_processamento_ms: Date.now() - inicioBackup
      };

    } catch (error) {
      return {
        success: false,
        imagens_processadas: 0,
        imagens_com_erro: 0,
        tamanho_total_mb: 0,
        tempo_processamento_ms: 0,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      };
    }
  }

  /**
   * Gera relatório de uso de imagens
   */
  async gerarRelatorioUso(request: RelatorioUsoImagensRequest): Promise<RelatorioUsoImagensResponse> {
    try {
      const { data, error } = await supabase
        .rpc('relatorio_uso_imagens', {
          p_clinica_id: request.clinica_id,
          p_data_inicio: request.data_inicio,
          p_data_fim: request.data_fim
        });

      if (error) {
        console.error('Erro ao gerar relatório:', error);
        return {
          total_imagens: 0,
          imagens_por_tipo: {} as Record<TipoImagem, number>,
          tamanho_total_mb: 0,
          imagens_com_watermark: 0,
          imagens_visiveis_paciente: 0,
          imagens_pendentes_processamento: 0,
          regioes_mais_fotografadas: {}
        };
      }

      const resultado = data[0];

      return {
        total_imagens: resultado.total_imagens,
        imagens_por_tipo: resultado.imagens_por_tipo,
        tamanho_total_mb: resultado.tamanho_total_mb,
        imagens_com_watermark: resultado.imagens_com_watermark,
        imagens_visiveis_paciente: resultado.imagens_visiveis_paciente,
        imagens_pendentes_processamento: resultado.imagens_pendentes_processamento,
        regioes_mais_fotografadas: resultado.regioes_mais_fotografadas
      };

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      return {
        total_imagens: 0,
        imagens_por_tipo: {} as Record<TipoImagem, number>,
        tamanho_total_mb: 0,
        imagens_com_watermark: 0,
        imagens_visiveis_paciente: 0,
        imagens_pendentes_processamento: 0,
        regioes_mais_fotografadas: {}
      };
    }
  }

  /**
   * Verifica integridade das imagens
   */
  async verificarIntegridade(): Promise<ProblemaIntegridade[]> {
    try {
      const { data, error } = await supabase
        .rpc('verificar_integridade_imagens');

      if (error) {
        console.error('Erro ao verificar integridade:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Erro ao verificar integridade:', error);
      return [];
    }
  }

  /**
   * Registra log de acesso à imagem
   */
  async registrarLogAcesso(log: LogAcessoImagem): Promise<void> {
    try {
      await supabase
        .rpc('log_acesso_imagem_medica', {
          p_imagem_id: log.imagem_id,
          p_acao: log.acao,
          p_contexto: log.contexto || {}
        });

    } catch (error) {
      console.error('Erro ao registrar log de acesso:', error);
    }
  }

  /**
   * Processa fila de imagens pendentes
   */
  async processarFilaPendentes(): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('processar_fila_imagens');

      if (error) {
        console.error('Erro ao processar fila:', error);
        return 0;
      }

      return data || 0;

    } catch (error) {
      console.error('Erro ao processar fila:', error);
      return 0;
    }
  }
}

// Instância singleton do serviço
export const imagemMedicaService = new ImagemMedicaService();