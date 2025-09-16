/**
 * React Hook for Medical Images Management
 * Provides easy-to-use interface for medical image operations
 * Requirements: 6.3
 */

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { imagemMedicaService } from '@/services/imagem-medica.service';
import {
  ImagemMedica,
  UploadImagemRequest,
  UploadImagemResponse,
  ProcessarImagemRequest,
  ConsentimentoImagemRequest,
  AprovarImagemRequest,
  ListarImagensRequest,
  CompararEvolucaoRequest,
  CompararEvolucaoResponse,
  RelatorioUsoImagensRequest,
  RelatorioUsoImagensResponse,
  ProblemaIntegridade,
  StatusProcessamentoImagem
} from '@/types/imagem-medica';
import { TipoImagem } from '@/types/enums';

interface UseImagensMedicasOptions {
  sessaoId?: string;
  autoLoad?: boolean;
  incluirArquivadas?: boolean;
}

interface UseImagensMedicasReturn {
  // Estado
  imagens: ImagemMedica[];
  loading: boolean;
  uploading: boolean;
  processing: boolean;
  error: string | null;
  
  // Ações de upload
  uploadImagem: (request: UploadImagemRequest) => Promise<UploadImagemResponse>;
  uploadMultiplasImagens: (requests: UploadImagemRequest[]) => Promise<UploadImagemResponse[]>;
  
  // Ações de processamento
  processarImagem: (request: ProcessarImagemRequest) => Promise<boolean>;
  processarFilaPendentes: () => Promise<number>;
  
  // Ações de consentimento e aprovação
  gerenciarConsentimento: (imagemId: string, consentimento: boolean) => Promise<boolean>;
  aprovarImagem: (imagemId: string, visibilidade?: { paciente?: boolean; profissionais?: boolean }) => Promise<boolean>;
  
  // Ações de listagem e busca
  carregarImagens: (sessaoId?: string) => Promise<void>;
  recarregarImagens: () => Promise<void>;
  filtrarImagens: (filtros: { tipo?: TipoImagem; regiao?: string; status?: StatusProcessamentoImagem }) => ImagemMedica[];
  
  // Comparação e análise
  compararEvolucao: (request: CompararEvolucaoRequest) => Promise<CompararEvolucaoResponse>;
  
  // Relatórios e métricas
  gerarRelatorio: (request: RelatorioUsoImagensRequest) => Promise<RelatorioUsoImagensResponse>;
  verificarIntegridade: () => Promise<ProblemaIntegridade[]>;
  
  // Utilitários
  obterImagemPorId: (id: string) => ImagemMedica | undefined;
  obterImagensPorTipo: (tipo: TipoImagem) => ImagemMedica[];
  obterImagensPorRegiao: (regiao: string) => ImagemMedica[];
  calcularEstatisticas: () => {
    total: number;
    porTipo: Record<TipoImagem, number>;
    comWatermark: number;
    visiveisPaciente: number;
    pendentesProcessamento: number;
  };
}

export const useImagensMedicas = (options: UseImagensMedicasOptions = {}): UseImagensMedicasReturn => {
  const { sessaoId, autoLoad = true, incluirArquivadas = false } = options;
  const { toast } = useToast();

  // Estado
  const [imagens, setImagens] = useState<ImagemMedica[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar imagens automaticamente
  useEffect(() => {
    if (autoLoad && sessaoId) {
      carregarImagens(sessaoId);
    }
  }, [sessaoId, autoLoad, incluirArquivadas]);

  /**
   * Carrega imagens de uma sessão
   */
  const carregarImagens = useCallback(async (targetSessaoId?: string) => {
    const id = targetSessaoId || sessaoId;
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const request: ListarImagensRequest = {
        sessao_id: id,
        incluir_arquivadas: incluirArquivadas
      };

      const imagensCarregadas = await imagemMedicaService.listarImagensSessao(request);
      setImagens(imagensCarregadas);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar imagens';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [sessaoId, incluirArquivadas, toast]);

  /**
   * Recarrega imagens
   */
  const recarregarImagens = useCallback(async () => {
    await carregarImagens();
  }, [carregarImagens]);

  /**
   * Upload de uma imagem
   */
  const uploadImagem = useCallback(async (request: UploadImagemRequest): Promise<UploadImagemResponse> => {
    setUploading(true);
    setError(null);

    try {
      const response = await imagemMedicaService.uploadImagem(request);

      if (response.success) {
        toast({
          title: 'Sucesso',
          description: 'Imagem enviada com sucesso. Processamento iniciado.',
        });

        // Recarregar imagens se for da sessão atual
        if (request.sessao_id === sessaoId) {
          await carregarImagens();
        }
      } else {
        toast({
          title: 'Erro no Upload',
          description: response.error || 'Erro desconhecido',
          variant: 'destructive'
        });
      }

      return response;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro no upload';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setUploading(false);
    }
  }, [sessaoId, toast, carregarImagens]);

  /**
   * Upload de múltiplas imagens
   */
  const uploadMultiplasImagens = useCallback(async (requests: UploadImagemRequest[]): Promise<UploadImagemResponse[]> => {
    setUploading(true);
    setError(null);

    const responses: UploadImagemResponse[] = [];
    let sucessos = 0;
    let erros = 0;

    try {
      for (const request of requests) {
        const response = await imagemMedicaService.uploadImagem(request);
        responses.push(response);

        if (response.success) {
          sucessos++;
        } else {
          erros++;
        }
      }

      // Mostrar resultado consolidado
      if (sucessos > 0 && erros === 0) {
        toast({
          title: 'Sucesso',
          description: `${sucessos} imagens enviadas com sucesso`,
        });
      } else if (sucessos > 0 && erros > 0) {
        toast({
          title: 'Parcialmente Concluído',
          description: `${sucessos} imagens enviadas, ${erros} falharam`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Erro',
          description: `Falha no envio de todas as ${erros} imagens`,
          variant: 'destructive'
        });
      }

      // Recarregar imagens se alguma foi da sessão atual
      if (requests.some(r => r.sessao_id === sessaoId)) {
        await carregarImagens();
      }

      return responses;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro no upload múltiplo';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });

      return responses;
    } finally {
      setUploading(false);
    }
  }, [sessaoId, toast, carregarImagens]);

  /**
   * Processa uma imagem
   */
  const processarImagem = useCallback(async (request: ProcessarImagemRequest): Promise<boolean> => {
    setProcessing(true);

    try {
      const response = await imagemMedicaService.processarImagem(request);

      if (response.success) {
        toast({
          title: 'Processamento Concluído',
          description: 'Imagem processada com sucesso',
        });

        // Atualizar imagem na lista local
        setImagens(prev => prev.map(img => 
          img.id === request.imagem_id 
            ? { ...img, status_processamento: response.status_processamento }
            : img
        ));

        return true;
      } else {
        toast({
          title: 'Erro no Processamento',
          description: response.error || 'Erro desconhecido',
          variant: 'destructive'
        });
        return false;
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro no processamento';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    } finally {
      setProcessing(false);
    }
  }, [toast]);

  /**
   * Processa fila de imagens pendentes
   */
  const processarFilaPendentes = useCallback(async (): Promise<number> => {
    setProcessing(true);

    try {
      const processadas = await imagemMedicaService.processarFilaPendentes();

      if (processadas > 0) {
        toast({
          title: 'Processamento Concluído',
          description: `${processadas} imagens processadas`,
        });

        // Recarregar imagens
        await carregarImagens();
      }

      return processadas;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro no processamento da fila';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return 0;
    } finally {
      setProcessing(false);
    }
  }, [toast, carregarImagens]);

  /**
   * Gerencia consentimento do paciente
   */
  const gerenciarConsentimento = useCallback(async (imagemId: string, consentimento: boolean): Promise<boolean> => {
    try {
      const request: ConsentimentoImagemRequest = {
        imagem_id: imagemId,
        consentimento_obtido: consentimento
      };

      const response = await imagemMedicaService.gerenciarConsentimento(request);

      if (response.success) {
        toast({
          title: 'Consentimento Atualizado',
          description: consentimento ? 'Consentimento obtido' : 'Consentimento revogado',
        });

        // Atualizar imagem na lista local
        setImagens(prev => prev.map(img => 
          img.id === imagemId 
            ? { 
                ...img, 
                consentimento_obtido: consentimento,
                data_consentimento: consentimento ? new Date().toISOString() : undefined
              }
            : img
        ));

        return true;
      } else {
        toast({
          title: 'Erro',
          description: response.error || 'Erro ao atualizar consentimento',
          variant: 'destructive'
        });
        return false;
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerenciar consentimento';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  /**
   * Aprova imagem para visualização
   */
  const aprovarImagem = useCallback(async (
    imagemId: string, 
    visibilidade?: { paciente?: boolean; profissionais?: boolean }
  ): Promise<boolean> => {
    try {
      const request: AprovarImagemRequest = {
        imagem_id: imagemId,
        visivel_paciente: visibilidade?.paciente,
        visivel_outros_profissionais: visibilidade?.profissionais
      };

      const response = await imagemMedicaService.aprovarImagem(request);

      if (response.success) {
        toast({
          title: 'Imagem Aprovada',
          description: 'Configurações de visibilidade atualizadas',
        });

        // Atualizar imagem na lista local
        setImagens(prev => prev.map(img => 
          img.id === imagemId 
            ? { 
                ...img, 
                visivel_paciente: visibilidade?.paciente ?? img.visivel_paciente,
                visivel_outros_profissionais: visibilidade?.profissionais ?? img.visivel_outros_profissionais,
                data_aprovacao: new Date().toISOString()
              }
            : img
        ));

        return true;
      } else {
        toast({
          title: 'Erro',
          description: response.error || 'Erro ao aprovar imagem',
          variant: 'destructive'
        });
        return false;
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao aprovar imagem';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  /**
   * Filtra imagens por critérios
   */
  const filtrarImagens = useCallback((filtros: { 
    tipo?: TipoImagem; 
    regiao?: string; 
    status?: StatusProcessamentoImagem 
  }): ImagemMedica[] => {
    return imagens.filter(imagem => {
      if (filtros.tipo && imagem.tipo_imagem !== filtros.tipo) return false;
      if (filtros.regiao && imagem.regiao_corporal !== filtros.regiao) return false;
      if (filtros.status && imagem.status_processamento !== filtros.status) return false;
      return true;
    });
  }, [imagens]);

  /**
   * Compara imagens de evolução
   */
  const compararEvolucao = useCallback(async (request: CompararEvolucaoRequest): Promise<CompararEvolucaoResponse> => {
    try {
      return await imagemMedicaService.compararEvolucao(request);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro na comparação';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return { imagens: [] };
    }
  }, [toast]);

  /**
   * Gera relatório de uso
   */
  const gerarRelatorio = useCallback(async (request: RelatorioUsoImagensRequest): Promise<RelatorioUsoImagensResponse> => {
    try {
      return await imagemMedicaService.gerarRelatorioUso(request);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar relatório';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
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
  }, [toast]);

  /**
   * Verifica integridade das imagens
   */
  const verificarIntegridade = useCallback(async (): Promise<ProblemaIntegridade[]> => {
    try {
      return await imagemMedicaService.verificarIntegridade();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro na verificação';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return [];
    }
  }, [toast]);

  // Utilitários
  const obterImagemPorId = useCallback((id: string): ImagemMedica | undefined => {
    return imagens.find(img => img.id === id);
  }, [imagens]);

  const obterImagensPorTipo = useCallback((tipo: TipoImagem): ImagemMedica[] => {
    return imagens.filter(img => img.tipo_imagem === tipo);
  }, [imagens]);

  const obterImagensPorRegiao = useCallback((regiao: string): ImagemMedica[] => {
    return imagens.filter(img => img.regiao_corporal === regiao);
  }, [imagens]);

  const calcularEstatisticas = useCallback(() => {
    const stats = {
      total: imagens.length,
      porTipo: {} as Record<TipoImagem, number>,
      comWatermark: 0,
      visiveisPaciente: 0,
      pendentesProcessamento: 0
    };

    // Inicializar contadores por tipo
    Object.values(TipoImagem).forEach(tipo => {
      stats.porTipo[tipo] = 0;
    });

    // Calcular estatísticas
    imagens.forEach(imagem => {
      stats.porTipo[imagem.tipo_imagem]++;
      if (imagem.watermark_aplicado) stats.comWatermark++;
      if (imagem.visivel_paciente) stats.visiveisPaciente++;
      if (imagem.status_processamento === StatusProcessamentoImagem.PENDENTE) {
        stats.pendentesProcessamento++;
      }
    });

    return stats;
  }, [imagens]);

  return {
    // Estado
    imagens,
    loading,
    uploading,
    processing,
    error,
    
    // Ações de upload
    uploadImagem,
    uploadMultiplasImagens,
    
    // Ações de processamento
    processarImagem,
    processarFilaPendentes,
    
    // Ações de consentimento e aprovação
    gerenciarConsentimento,
    aprovarImagem,
    
    // Ações de listagem e busca
    carregarImagens,
    recarregarImagens,
    filtrarImagens,
    
    // Comparação e análise
    compararEvolucao,
    
    // Relatórios e métricas
    gerarRelatorio,
    verificarIntegridade,
    
    // Utilitários
    obterImagemPorId,
    obterImagensPorTipo,
    obterImagensPorRegiao,
    calcularEstatisticas
  };
};