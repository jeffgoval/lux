/**
 * Image Access Control Service
 * Manages granular access control and audit logging for medical images
 * Requirements: 6.3, 9.2
 */

import { supabase } from '@/integrations/supabase/client';
import { imagemMedicaService } from './imagem-medica.service';
import { LogAcessoImagem } from '@/types/imagem-medica';

export interface PermissaoAcessoImagem {
  pode_visualizar: boolean;
  pode_baixar: boolean;
  pode_compartilhar: boolean;
  pode_editar_metadados: boolean;
  pode_aprovar: boolean;
  pode_revogar_consentimento: boolean;
  motivo_negacao?: string;
}

export interface ConfiguracaoVisibilidade {
  visivel_paciente: boolean;
  visivel_outros_profissionais: boolean;
  requer_aprovacao_admin: boolean;
  permite_download_paciente: boolean;
  watermark_obrigatorio: boolean;
}

export interface FiltroAcessoImagem {
  usuario_id?: string;
  clinica_id?: string;
  tipo_usuario?: 'paciente' | 'profissional' | 'admin' | 'proprietario';
  imagem_id?: string;
  sessao_id?: string;
}

export interface LogAcessoDetalhado {
  id: string;
  imagem_id: string;
  usuario_id: string;
  acao: string;
  ip_address: string;
  user_agent: string;
  timestamp: string;
  contexto_adicional: Record<string, any>;
  sucesso: boolean;
  motivo_falha?: string;
}

export class ImagemAcessoService {
  
  /**
   * Verifica permissões de acesso para uma imagem específica
   */
  async verificarPermissoes(
    imagemId: string, 
    usuarioId?: string
  ): Promise<PermissaoAcessoImagem> {
    try {
      const userId = usuarioId || (await supabase.auth.getUser()).data.user?.id;
      
      if (!userId) {
        return {
          pode_visualizar: false,
          pode_baixar: false,
          pode_compartilhar: false,
          pode_editar_metadados: false,
          pode_aprovar: false,
          pode_revogar_consentimento: false,
          motivo_negacao: 'Usuário não autenticado'
        };
      }

      // Verificar acesso básico usando função do banco
      const { data: temAcesso, error } = await supabase
        .rpc('verificar_acesso_imagem', {
          p_imagem_id: imagemId,
          p_user_id: userId
        });

      if (error || !temAcesso) {
        return {
          pode_visualizar: false,
          pode_baixar: false,
          pode_compartilhar: false,
          pode_editar_metadados: false,
          pode_aprovar: false,
          pode_revogar_consentimento: false,
          motivo_negacao: error?.message || 'Acesso negado'
        };
      }

      // Buscar dados detalhados da imagem e usuário
      const { data: dadosCompletos, error: errorDados } = await supabase
        .from('imagens_medicas')
        .select(`
          *,
          sessoes_atendimento!inner(
            prontuarios!inner(
              clinica_id,
              cliente_id,
              clientes!inner(user_id)
            )
          )
        `)
        .eq('id', imagemId)
        .single();

      if (errorDados || !dadosCompletos) {
        return {
          pode_visualizar: false,
          pode_baixar: false,
          pode_compartilhar: false,
          pode_editar_metadados: false,
          pode_aprovar: false,
          pode_revogar_consentimento: false,
          motivo_negacao: 'Dados da imagem não encontrados'
        };
      }

      // Verificar role do usuário na clínica
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('clinica_id', dadosCompletos.sessoes_atendimento.prontuarios.clinica_id)
        .eq('ativo', true)
        .single();

      const isPaciente = dadosCompletos.sessoes_atendimento.prontuarios.clientes.user_id === userId;
      const isProfissionalCapturou = dadosCompletos.capturada_por === userId;
      const role = userRole?.role;

      // Definir permissões baseadas no contexto
      const permissoes: PermissaoAcessoImagem = {
        pode_visualizar: true, // Já passou pela verificação básica
        pode_baixar: false,
        pode_compartilhar: false,
        pode_editar_metadados: false,
        pode_aprovar: false,
        pode_revogar_consentimento: false
      };

      if (isPaciente) {
        // Permissões para paciente
        permissoes.pode_baixar = dadosCompletos.visivel_paciente && dadosCompletos.consentimento_obtido;
        permissoes.pode_revogar_consentimento = true;
      } else if (role === 'proprietario' || role === 'admin') {
        // Permissões para admin/proprietário
        permissoes.pode_baixar = true;
        permissoes.pode_compartilhar = true;
        permissoes.pode_editar_metadados = true;
        permissoes.pode_aprovar = true;
        permissoes.pode_revogar_consentimento = true;
      } else if (role === 'profissionais') {
        // Permissões para profissionais
        permissoes.pode_baixar = true;
        permissoes.pode_compartilhar = isProfissionalCapturou;
        permissoes.pode_editar_metadados = isProfissionalCapturou;
        permissoes.pode_aprovar = false;
        permissoes.pode_revogar_consentimento = false;
      } else if (role === 'recepcionista') {
        // Permissões limitadas para recepcionista
        permissoes.pode_baixar = dadosCompletos.aprovada_por !== null;
        permissoes.pode_compartilhar = false;
        permissoes.pode_editar_metadados = false;
        permissoes.pode_aprovar = false;
        permissoes.pode_revogar_consentimento = false;
      }

      return permissoes;

    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      return {
        pode_visualizar: false,
        pode_baixar: false,
        pode_compartilhar: false,
        pode_editar_metadados: false,
        pode_aprovar: false,
        pode_revogar_consentimento: false,
        motivo_negacao: 'Erro interno na verificação de permissões'
      };
    }
  }

  /**
   * Gera URL de acesso temporário com controle de permissões
   */
  async gerarUrlAcessoTemporario(
    imagemId: string,
    duracaoSegundos: number = 3600,
    permitirDownload: boolean = false
  ): Promise<{ url?: string; error?: string }> {
    try {
      // Verificar permissões
      const permissoes = await this.verificarPermissoes(imagemId);
      
      if (!permissoes.pode_visualizar) {
        return { error: permissoes.motivo_negacao || 'Acesso negado' };
      }

      if (permitirDownload && !permissoes.pode_baixar) {
        return { error: 'Permissão de download negada' };
      }

      // Buscar dados da imagem
      const { data: imagem, error } = await supabase
        .from('imagens_medicas')
        .select('path_storage, bucket_storage')
        .eq('id', imagemId)
        .single();

      if (error || !imagem) {
        return { error: 'Imagem não encontrada' };
      }

      // Gerar URL assinada
      const { data: urlData, error: urlError } = await supabase.storage
        .from(imagem.bucket_storage)
        .createSignedUrl(imagem.path_storage, duracaoSegundos, {
          download: permitirDownload
        });

      if (urlError) {
        return { error: `Erro ao gerar URL: ${urlError.message}` };
      }

      // Registrar acesso
      await this.registrarAcesso({
        imagem_id: imagemId,
        acao: permitirDownload ? 'DOWNLOAD' : 'VISUALIZACAO',
        contexto: {
          url_temporaria: true,
          duracao_segundos: duracaoSegundos,
          permite_download: permitirDownload
        }
      });

      return { url: urlData.signedUrl };

    } catch (error) {
      console.error('Erro ao gerar URL temporária:', error);
      return { error: 'Erro interno ao gerar URL de acesso' };
    }
  }

  /**
   * Configura visibilidade de uma imagem
   */
  async configurarVisibilidade(
    imagemId: string,
    configuracao: ConfiguracaoVisibilidade
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verificar permissões de aprovação
      const permissoes = await this.verificarPermissoes(imagemId);
      
      if (!permissoes.pode_aprovar) {
        return { 
          success: false, 
          error: 'Usuário não tem permissão para configurar visibilidade' 
        };
      }

      // Atualizar configurações
      const { error } = await supabase
        .from('imagens_medicas')
        .update({
          visivel_paciente: configuracao.visivel_paciente,
          visivel_outros_profissionais: configuracao.visivel_outros_profissionais,
          watermark_aplicado: configuracao.watermark_obrigatorio ? true : undefined,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', imagemId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Registrar alteração
      await this.registrarAcesso({
        imagem_id: imagemId,
        acao: 'CONFIGURACAO_VISIBILIDADE',
        contexto: configuracao
      });

      return { success: true };

    } catch (error) {
      console.error('Erro ao configurar visibilidade:', error);
      return { 
        success: false, 
        error: 'Erro interno ao configurar visibilidade' 
      };
    }
  }

  /**
   * Lista logs de acesso com filtros
   */
  async listarLogsAcesso(
    filtros: FiltroAcessoImagem & {
      data_inicio?: string;
      data_fim?: string;
      acao?: string;
      limite?: number;
    }
  ): Promise<LogAcessoDetalhado[]> {
    try {
      let query = supabase
        .from('auditoria_medica')
        .select(`
          id,
          registro_id,
          usuario_id,
          operacao,
          ip_address,
          user_agent,
          criado_em,
          contexto_adicional,
          dados_novos
        `)
        .eq('tabela_afetada', 'imagens_medicas')
        .order('criado_em', { ascending: false });

      // Aplicar filtros
      if (filtros.imagem_id) {
        query = query.eq('registro_id', filtros.imagem_id);
      }

      if (filtros.usuario_id) {
        query = query.eq('usuario_id', filtros.usuario_id);
      }

      if (filtros.acao) {
        query = query.eq('operacao', filtros.acao);
      }

      if (filtros.data_inicio) {
        query = query.gte('criado_em', filtros.data_inicio);
      }

      if (filtros.data_fim) {
        query = query.lte('criado_em', filtros.data_fim);
      }

      if (filtros.limite) {
        query = query.limit(filtros.limite);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar logs:', error);
        return [];
      }

      return (data || []).map(log => ({
        id: log.id,
        imagem_id: log.registro_id,
        usuario_id: log.usuario_id,
        acao: log.operacao,
        ip_address: log.ip_address || '',
        user_agent: log.user_agent || '',
        timestamp: log.criado_em,
        contexto_adicional: log.contexto_adicional || {},
        sucesso: true, // Se está no log, foi bem-sucedido
        motivo_falha: undefined
      }));

    } catch (error) {
      console.error('Erro ao listar logs de acesso:', error);
      return [];
    }
  }

  /**
   * Registra acesso à imagem
   */
  async registrarAcesso(log: LogAcessoImagem): Promise<void> {
    try {
      await imagemMedicaService.registrarLogAcesso(log);
    } catch (error) {
      console.error('Erro ao registrar acesso:', error);
    }
  }

  /**
   * Verifica se usuário pode acessar imagens de uma sessão
   */
  async verificarAcessoSessao(
    sessaoId: string,
    usuarioId?: string
  ): Promise<{ pode_acessar: boolean; motivo?: string }> {
    try {
      const userId = usuarioId || (await supabase.auth.getUser()).data.user?.id;
      
      if (!userId) {
        return { pode_acessar: false, motivo: 'Usuário não autenticado' };
      }

      // Verificar se usuário tem acesso à sessão
      const { data: sessao, error } = await supabase
        .from('sessoes_atendimento')
        .select(`
          id,
          prontuarios!inner(
            clinica_id,
            cliente_id,
            clientes!inner(user_id)
          )
        `)
        .eq('id', sessaoId)
        .single();

      if (error || !sessao) {
        return { pode_acessar: false, motivo: 'Sessão não encontrada' };
      }

      // Verificar se é o paciente
      if (sessao.prontuarios.clientes.user_id === userId) {
        return { pode_acessar: true };
      }

      // Verificar se tem role na clínica
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('clinica_id', sessao.prontuarios.clinica_id)
        .eq('ativo', true)
        .single();

      if (userRole) {
        return { pode_acessar: true };
      }

      return { pode_acessar: false, motivo: 'Usuário não tem acesso a esta sessão' };

    } catch (error) {
      console.error('Erro ao verificar acesso à sessão:', error);
      return { pode_acessar: false, motivo: 'Erro interno na verificação' };
    }
  }

  /**
   * Gera relatório de acessos por período
   */
  async gerarRelatorioAcessos(
    clinicaId: string,
    dataInicio: string,
    dataFim: string
  ): Promise<{
    total_acessos: number;
    acessos_por_usuario: Record<string, number>;
    acessos_por_acao: Record<string, number>;
    imagens_mais_acessadas: Array<{ imagem_id: string; total_acessos: number }>;
    horarios_pico: Record<string, number>;
  }> {
    try {
      const logs = await this.listarLogsAcesso({
        clinica_id: clinicaId,
        data_inicio: dataInicio,
        data_fim: dataFim,
        limite: 10000
      });

      const relatorio = {
        total_acessos: logs.length,
        acessos_por_usuario: {} as Record<string, number>,
        acessos_por_acao: {} as Record<string, number>,
        imagens_mais_acessadas: [] as Array<{ imagem_id: string; total_acessos: number }>,
        horarios_pico: {} as Record<string, number>
      };

      // Processar logs
      const imagensCount: Record<string, number> = {};

      logs.forEach(log => {
        // Contar por usuário
        relatorio.acessos_por_usuario[log.usuario_id] = 
          (relatorio.acessos_por_usuario[log.usuario_id] || 0) + 1;

        // Contar por ação
        relatorio.acessos_por_acao[log.acao] = 
          (relatorio.acessos_por_acao[log.acao] || 0) + 1;

        // Contar por imagem
        imagensCount[log.imagem_id] = (imagensCount[log.imagem_id] || 0) + 1;

        // Contar por horário
        const hora = new Date(log.timestamp).getHours().toString().padStart(2, '0');
        relatorio.horarios_pico[hora] = (relatorio.horarios_pico[hora] || 0) + 1;
      });

      // Top 10 imagens mais acessadas
      relatorio.imagens_mais_acessadas = Object.entries(imagensCount)
        .map(([imagem_id, total_acessos]) => ({ imagem_id, total_acessos }))
        .sort((a, b) => b.total_acessos - a.total_acessos)
        .slice(0, 10);

      return relatorio;

    } catch (error) {
      console.error('Erro ao gerar relatório de acessos:', error);
      return {
        total_acessos: 0,
        acessos_por_usuario: {},
        acessos_por_acao: {},
        imagens_mais_acessadas: [],
        horarios_pico: {}
      };
    }
  }

  /**
   * Revoga acesso temporário a uma imagem
   */
  async revogarAcesso(
    imagemId: string,
    motivo: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verificar permissões
      const permissoes = await this.verificarPermissoes(imagemId);
      
      if (!permissoes.pode_aprovar) {
        return { 
          success: false, 
          error: 'Usuário não tem permissão para revogar acesso' 
        };
      }

      // Marcar imagem como não visível temporariamente
      const { error } = await supabase
        .from('imagens_medicas')
        .update({
          visivel_paciente: false,
          visivel_outros_profissionais: false,
          motivo_arquivamento: motivo,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', imagemId);

      if (error) {
        return { success: false, error: error.message };
      }

      // Registrar revogação
      await this.registrarAcesso({
        imagem_id: imagemId,
        acao: 'REVOGACAO_ACESSO',
        contexto: { motivo }
      });

      return { success: true };

    } catch (error) {
      console.error('Erro ao revogar acesso:', error);
      return { 
        success: false, 
        error: 'Erro interno ao revogar acesso' 
      };
    }
  }
}

// Instância singleton do serviço
export const imagemAcessoService = new ImagemAcessoService();