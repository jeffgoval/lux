/**
 * React Hook for Image Access Management
 * Provides easy-to-use interface for managing image access permissions
 * Requirements: 6.3, 9.2
 */

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  imagemAcessoService, 
  PermissaoAcessoImagem, 
  ConfiguracaoVisibilidade, 
  LogAcessoDetalhado,
  FiltroAcessoImagem
} from '@/services/imagem-acesso.service';

interface UseAcessoImagensOptions {
  imagemId?: string;
  autoLoad?: boolean;
}

interface UseAcessoImagensReturn {
  // Estado
  permissoes: PermissaoAcessoImagem | null;
  logs: LogAcessoDetalhado[];
  loading: boolean;
  loadingLogs: boolean;
  error: string | null;
  
  // Ações de permissões
  verificarPermissoes: (imagemId?: string) => Promise<PermissaoAcessoImagem | null>;
  verificarAcessoSessao: (sessaoId: string) => Promise<{ pode_acessar: boolean; motivo?: string }>;
  
  // Ações de configuração
  configurarVisibilidade: (imagemId: string, config: ConfiguracaoVisibilidade) => Promise<boolean>;
  revogarAcesso: (imagemId: string, motivo: string) => Promise<boolean>;
  
  // Ações de URL temporária
  gerarUrlTemporaria: (imagemId: string, duracaoSegundos?: number, permitirDownload?: boolean) => Promise<string | null>;
  
  // Ações de logs
  carregarLogs: (filtros?: FiltroAcessoImagem & { data_inicio?: string; data_fim?: string; limite?: number }) => Promise<void>;
  registrarAcesso: (imagemId: string, acao: string, contexto?: Record<string, any>) => Promise<void>;
  
  // Relatórios
  gerarRelatorioAcessos: (clinicaId: string, dataInicio: string, dataFim: string) => Promise<{
    total_acessos: number;
    acessos_por_usuario: Record<string, number>;
    acessos_por_acao: Record<string, number>;
    imagens_mais_acessadas: Array<{ imagem_id: string; total_acessos: number }>;
    horarios_pico: Record<string, number>;
  }>;
  
  // Utilitários
  podeVisualizar: boolean;
  podeBaixar: boolean;
  podeCompartilhar: boolean;
  podeEditarMetadados: boolean;
  podeAprovar: boolean;
  podeRevogarConsentimento: boolean;
}

export const useAcessoImagens = (options: UseAcessoImagensOptions = {}): UseAcessoImagensReturn => {
  const { imagemId, autoLoad = true } = options;
  const { toast } = useToast();

  // Estado
  const [permissoes, setPermissoes] = useState<PermissaoAcessoImagem | null>(null);
  const [logs, setLogs] = useState<LogAcessoDetalhado[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar permissões automaticamente
  useEffect(() => {
    if (autoLoad && imagemId) {
      verificarPermissoes(imagemId);
    }
  }, [imagemId, autoLoad]);

  /**
   * Verifica permissões de acesso para uma imagem
   */
  const verificarPermissoes = useCallback(async (targetImagemId?: string): Promise<PermissaoAcessoImagem | null> => {
    const id = targetImagemId || imagemId;
    if (!id) return null;

    setLoading(true);
    setError(null);

    try {
      const perms = await imagemAcessoService.verificarPermissoes(id);
      setPermissoes(perms);
      return perms;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao verificar permissões';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [imagemId, toast]);

  /**
   * Verifica se usuário pode acessar imagens de uma sessão
   */
  const verificarAcessoSessao = useCallback(async (sessaoId: string): Promise<{ pode_acessar: boolean; motivo?: string }> => {
    try {
      return await imagemAcessoService.verificarAcessoSessao(sessaoId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao verificar acesso à sessão';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return { pode_acessar: false, motivo: errorMessage };
    }
  }, [toast]);

  /**
   * Configura visibilidade de uma imagem
   */
  const configurarVisibilidade = useCallback(async (
    targetImagemId: string, 
    config: ConfiguracaoVisibilidade
  ): Promise<boolean> => {
    setLoading(true);

    try {
      const resultado = await imagemAcessoService.configurarVisibilidade(targetImagemId, config);

      if (resultado.success) {
        toast({
          title: 'Sucesso',
          description: 'Configurações de visibilidade atualizadas'
        });

        // Recarregar permissões se for a imagem atual
        if (targetImagemId === imagemId) {
          await verificarPermissoes();
        }

        return true;
      } else {
        toast({
          title: 'Erro',
          description: resultado.error || 'Erro ao configurar visibilidade',
          variant: 'destructive'
        });
        return false;
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao configurar visibilidade';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [imagemId, toast, verificarPermissoes]);

  /**
   * Revoga acesso a uma imagem
   */
  const revogarAcesso = useCallback(async (targetImagemId: string, motivo: string): Promise<boolean> => {
    if (!motivo.trim()) {
      toast({
        title: 'Motivo Obrigatório',
        description: 'Informe o motivo da revogação de acesso',
        variant: 'destructive'
      });
      return false;
    }

    setLoading(true);

    try {
      const resultado = await imagemAcessoService.revogarAcesso(targetImagemId, motivo);

      if (resultado.success) {
        toast({
          title: 'Acesso Revogado',
          description: 'Acesso à imagem foi revogado com sucesso'
        });

        // Recarregar permissões se for a imagem atual
        if (targetImagemId === imagemId) {
          await verificarPermissoes();
        }

        return true;
      } else {
        toast({
          title: 'Erro',
          description: resultado.error || 'Erro ao revogar acesso',
          variant: 'destructive'
        });
        return false;
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao revogar acesso';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [imagemId, toast, verificarPermissoes]);

  /**
   * Gera URL de acesso temporário
   */
  const gerarUrlTemporaria = useCallback(async (
    targetImagemId: string,
    duracaoSegundos: number = 3600,
    permitirDownload: boolean = false
  ): Promise<string | null> => {
    setLoading(true);

    try {
      const resultado = await imagemAcessoService.gerarUrlAcessoTemporario(
        targetImagemId,
        duracaoSegundos,
        permitirDownload
      );

      if (resultado.url) {
        toast({
          title: 'URL Gerada',
          description: `URL de acesso temporário criada (válida por ${Math.round(duracaoSegundos / 60)} minutos)`
        });
        return resultado.url;
      } else {
        toast({
          title: 'Erro',
          description: resultado.error || 'Erro ao gerar URL',
          variant: 'destructive'
        });
        return null;
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar URL';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Carrega logs de acesso
   */
  const carregarLogs = useCallback(async (filtros?: FiltroAcessoImagem & {
    data_inicio?: string;
    data_fim?: string;
    limite?: number;
  }) => {
    setLoadingLogs(true);
    setError(null);

    try {
      const filtrosCompletos = {
        imagem_id: imagemId,
        limite: 50,
        ...filtros
      };

      const logsData = await imagemAcessoService.listarLogsAcesso(filtrosCompletos);
      setLogs(logsData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar logs';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoadingLogs(false);
    }
  }, [imagemId, toast]);

  /**
   * Registra acesso à imagem
   */
  const registrarAcesso = useCallback(async (
    targetImagemId: string,
    acao: string,
    contexto?: Record<string, any>
  ): Promise<void> => {
    try {
      await imagemAcessoService.registrarAcesso({
        imagem_id: targetImagemId,
        acao,
        contexto
      });
    } catch (err) {
      console.error('Erro ao registrar acesso:', err);
      // Não mostrar toast para erro de log, pois não afeta a funcionalidade principal
    }
  }, []);

  /**
   * Gera relatório de acessos
   */
  const gerarRelatorioAcessos = useCallback(async (
    clinicaId: string,
    dataInicio: string,
    dataFim: string
  ) => {
    try {
      return await imagemAcessoService.gerarRelatorioAcessos(clinicaId, dataInicio, dataFim);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar relatório';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return {
        total_acessos: 0,
        acessos_por_usuario: {},
        acessos_por_acao: {},
        imagens_mais_acessadas: [],
        horarios_pico: {}
      };
    }
  }, [toast]);

  // Computed properties para facilitar o uso
  const podeVisualizar = permissoes?.pode_visualizar ?? false;
  const podeBaixar = permissoes?.pode_baixar ?? false;
  const podeCompartilhar = permissoes?.pode_compartilhar ?? false;
  const podeEditarMetadados = permissoes?.pode_editar_metadados ?? false;
  const podeAprovar = permissoes?.pode_aprovar ?? false;
  const podeRevogarConsentimento = permissoes?.pode_revogar_consentimento ?? false;

  return {
    // Estado
    permissoes,
    logs,
    loading,
    loadingLogs,
    error,
    
    // Ações de permissões
    verificarPermissoes,
    verificarAcessoSessao,
    
    // Ações de configuração
    configurarVisibilidade,
    revogarAcesso,
    
    // Ações de URL temporária
    gerarUrlTemporaria,
    
    // Ações de logs
    carregarLogs,
    registrarAcesso,
    
    // Relatórios
    gerarRelatorioAcessos,
    
    // Utilitários
    podeVisualizar,
    podeBaixar,
    podeCompartilhar,
    podeEditarMetadados,
    podeAprovar,
    podeRevogarConsentimento
  };
};