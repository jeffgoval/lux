// =====================================================
// HOOK FINANCEIRO
// =====================================================
// Hook React para gerenciar operações financeiras
// com cálculo automático de receitas e comissões
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { FinanceiroService } from '@/services/financeiro.service';
import { useAuth } from '@/contexts/AuthContext';
import type {
  TransacaoFinanceira,
  MetaFinanceira,
  ComissaoProfissional,
  CriarTransacaoFinanceiraData,
  CriarMetaFinanceiraData,
  CriarComissaoProfissionalData,
  ResumoFinanceiro,
  ComparacaoMetas,
  CalculoComissao,
  FiltroTransacaoFinanceira,
  DashboardFinanceiro,
  UseFinanceiroOptions,
  UseFinanceiroReturn
} from '@/types/financeiro';

export function useFinanceiro(options: UseFinanceiroOptions): UseFinanceiroReturn {
  const { user } = useAuth();
  const { clinica_id, auto_refresh = false, refresh_interval = 30000 } = options;

  // Estados principais
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([]);
  const [metas, setMetas] = useState<MetaFinanceira[]>([]);
  const [comissoes, setComissoes] = useState<ComissaoProfissional[]>([]);
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [dashboard, setDashboard] = useState<DashboardFinanceiro | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =====================================================
  // FUNÇÕES DE CARREGAMENTO
  // =====================================================

  const carregarTransacoes = useCallback(async (filtros?: FiltroTransacaoFinanceira) => {
    try {
      const data = await FinanceiroService.listarTransacoes(clinica_id, filtros);
      setTransacoes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar transações');
    }
  }, [clinica_id]);

  const carregarMetas = useCallback(async () => {
    try {
      const data = await FinanceiroService.listarMetas(clinica_id);
      setMetas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar metas');
    }
  }, [clinica_id]);

  const carregarComissoes = useCallback(async () => {
    try {
      const data = await FinanceiroService.listarComissoes(clinica_id);
      setComissoes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar comissões');
    }
  }, [clinica_id]);

  const carregarResumo = useCallback(async (data_inicio: string, data_fim: string) => {
    try {
      const data = await FinanceiroService.obterResumoFinanceiro(clinica_id, data_inicio, data_fim);
      setResumo(data);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao carregar resumo';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [clinica_id]);

  const carregarDashboard = useCallback(async () => {
    try {
      setLoading(true);
      
      // Período atual (último mês)
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      
      // Período anterior para comparação
      const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);

      // Carregar dados em paralelo
      const [
        resumoAtual,
        resumoAnterior,
        comissoesPendentes,
        despesasPorCategoria,
        evolucaoMensal,
        comparacaoMetas
      ] = await Promise.all([
        FinanceiroService.obterResumoFinanceiro(
          clinica_id,
          inicioMes.toISOString().split('T')[0],
          fimMes.toISOString().split('T')[0]
        ),
        FinanceiroService.obterResumoFinanceiro(
          clinica_id,
          inicioMesAnterior.toISOString().split('T')[0],
          fimMesAnterior.toISOString().split('T')[0]
        ),
        FinanceiroService.obterComissoesPendentes(clinica_id),
        FinanceiroService.obterDespesasPorCategoria(clinica_id, 6),
        FinanceiroService.obterResumoBasico(clinica_id),
        FinanceiroService.compararComMetas(clinica_id, hoje.getFullYear(), hoje.getMonth() + 1)
      ]);

      // Calcular variações
      const calcularVariacao = (atual: number, anterior: number) => {
        if (anterior === 0) return atual > 0 ? 100 : 0;
        return ((atual - anterior) / anterior) * 100;
      };

      const dashboardData: DashboardFinanceiro = {
        periodo: {
          inicio: inicioMes.toISOString().split('T')[0],
          fim: fimMes.toISOString().split('T')[0]
        },
        metricas_principais: {
          receita_total: {
            label: 'Receita Total',
            valor: resumoAtual.total_receitas,
            variacao: resumoAtual.total_receitas - resumoAnterior.total_receitas,
            variacao_percentual: calcularVariacao(resumoAtual.total_receitas, resumoAnterior.total_receitas),
            meta: comparacaoMetas.meta_receita,
            percentual_meta: comparacaoMetas.percentual_receita,
            formato: 'moeda',
            cor: resumoAtual.total_receitas >= resumoAnterior.total_receitas ? 'success' : 'error'
          },
          despesa_total: {
            label: 'Despesas Totais',
            valor: resumoAtual.total_despesas,
            variacao: resumoAtual.total_despesas - resumoAnterior.total_despesas,
            variacao_percentual: calcularVariacao(resumoAtual.total_despesas, resumoAnterior.total_despesas),
            meta: comparacaoMetas.meta_despesas,
            percentual_meta: comparacaoMetas.percentual_despesas,
            formato: 'moeda',
            cor: resumoAtual.total_despesas <= resumoAnterior.total_despesas ? 'success' : 'warning'
          },
          lucro_liquido: {
            label: 'Lucro Líquido',
            valor: resumoAtual.lucro_liquido,
            variacao: resumoAtual.lucro_liquido - resumoAnterior.lucro_liquido,
            variacao_percentual: calcularVariacao(resumoAtual.lucro_liquido, resumoAnterior.lucro_liquido),
            meta: comparacaoMetas.meta_lucro,
            percentual_meta: comparacaoMetas.percentual_lucro,
            formato: 'moeda',
            cor: resumoAtual.lucro_liquido >= resumoAnterior.lucro_liquido ? 'success' : 'error'
          },
          ticket_medio: {
            label: 'Ticket Médio',
            valor: resumoAtual.ticket_medio,
            variacao: resumoAtual.ticket_medio - resumoAnterior.ticket_medio,
            variacao_percentual: calcularVariacao(resumoAtual.ticket_medio, resumoAnterior.ticket_medio),
            formato: 'moeda',
            cor: resumoAtual.ticket_medio >= resumoAnterior.ticket_medio ? 'success' : 'warning'
          },
          total_atendimentos: {
            label: 'Total de Atendimentos',
            valor: resumoAtual.total_atendimentos,
            variacao: resumoAtual.total_atendimentos - resumoAnterior.total_atendimentos,
            variacao_percentual: calcularVariacao(resumoAtual.total_atendimentos, resumoAnterior.total_atendimentos),
            meta: comparacaoMetas.meta_atendimentos,
            percentual_meta: comparacaoMetas.percentual_atendimentos,
            formato: 'numero',
            cor: resumoAtual.total_atendimentos >= resumoAnterior.total_atendimentos ? 'success' : 'warning'
          }
        },
        comissoes: {
          total_pendente: comissoesPendentes.reduce((acc, c) => acc + c.valor_total_pendente, 0),
          total_pago: resumoAtual.comissoes_pagas,
          profissionais_pendentes: comissoesPendentes.length
        },
        despesas_por_categoria: despesasPorCategoria,
        evolucao_mensal: evolucaoMensal
      };

      setDashboard(dashboardData);
      setResumo(resumoAtual);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }, [clinica_id]);

  // =====================================================
  // OPERAÇÕES CRUD
  // =====================================================

  const criarTransacao = useCallback(async (dados: CriarTransacaoFinanceiraData): Promise<TransacaoFinanceira> => {
    try {
      setLoading(true);
      const novaTransacao = await FinanceiroService.criarTransacao(clinica_id, dados);
      setTransacoes(prev => [novaTransacao, ...prev]);
      return novaTransacao;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao criar transação';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [clinica_id]);

  const atualizarTransacao = useCallback(async (id: string, dados: Partial<TransacaoFinanceira>): Promise<TransacaoFinanceira> => {
    try {
      setLoading(true);
      const transacaoAtualizada = await FinanceiroService.atualizarTransacao(id, dados);
      setTransacoes(prev => prev.map(t => t.id === id ? transacaoAtualizada : t));
      return transacaoAtualizada;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao atualizar transação';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const excluirTransacao = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      await FinanceiroService.excluirTransacao(id);
      setTransacoes(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao excluir transação';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const criarMeta = useCallback(async (dados: CriarMetaFinanceiraData): Promise<MetaFinanceira> => {
    try {
      setLoading(true);
      const novaMeta = await FinanceiroService.criarMeta(clinica_id, dados);
      setMetas(prev => [novaMeta, ...prev]);
      return novaMeta;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao criar meta';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [clinica_id]);

  const atualizarMeta = useCallback(async (id: string, dados: Partial<MetaFinanceira>): Promise<MetaFinanceira> => {
    try {
      setLoading(true);
      const metaAtualizada = await FinanceiroService.atualizarMeta(id, dados);
      setMetas(prev => prev.map(m => m.id === id ? metaAtualizada : m));
      return metaAtualizada;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao atualizar meta';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const criarComissao = useCallback(async (dados: CriarComissaoProfissionalData): Promise<ComissaoProfissional> => {
    try {
      setLoading(true);
      const novaComissao = await FinanceiroService.criarComissao(clinica_id, dados);
      setComissoes(prev => [novaComissao, ...prev]);
      return novaComissao;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao criar comissão';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [clinica_id]);

  const atualizarComissao = useCallback(async (id: string, dados: Partial<ComissaoProfissional>): Promise<ComissaoProfissional> => {
    try {
      setLoading(true);
      const comissaoAtualizada = await FinanceiroService.atualizarComissao(id, dados);
      setComissoes(prev => prev.map(c => c.id === id ? comissaoAtualizada : c));
      return comissaoAtualizada;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao atualizar comissão';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  // =====================================================
  // FUNÇÕES DE CONSULTA
  // =====================================================

  const obterResumo = useCallback(async (data_inicio: string, data_fim: string): Promise<ResumoFinanceiro> => {
    return await carregarResumo(data_inicio, data_fim);
  }, [carregarResumo]);

  const compararComMetas = useCallback(async (ano: number, mes: number): Promise<ComparacaoMetas> => {
    try {
      return await FinanceiroService.compararComMetas(clinica_id, ano, mes);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao comparar com metas';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [clinica_id]);

  const calcularComissao = useCallback(async (profissional_id: string, servico_id: string, valor: number): Promise<CalculoComissao> => {
    try {
      return await FinanceiroService.calcularComissao(profissional_id, clinica_id, servico_id, valor);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao calcular comissão';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [clinica_id]);

  // =====================================================
  // UTILITÁRIOS
  // =====================================================

  const refresh = useCallback(async () => {
    setError(null);
    await Promise.all([
      carregarTransacoes(),
      carregarMetas(),
      carregarComissoes(),
      carregarDashboard()
    ]);
  }, [carregarTransacoes, carregarMetas, carregarComissoes, carregarDashboard]);

  const filtrarTransacoes = useCallback((filtros: FiltroTransacaoFinanceira): TransacaoFinanceira[] => {
    return transacoes.filter(transacao => {
      if (filtros.tipo?.length && !filtros.tipo.includes(transacao.tipo)) return false;
      if (filtros.categoria_despesa?.length && !filtros.categoria_despesa.includes(transacao.categoria_despesa!)) return false;
      if (filtros.status?.length && !filtros.status.includes(transacao.status)) return false;
      if (filtros.data_inicio && transacao.data_transacao < filtros.data_inicio) return false;
      if (filtros.data_fim && transacao.data_transacao > filtros.data_fim) return false;
      if (filtros.profissional_id && transacao.profissional_id !== filtros.profissional_id) return false;
      if (filtros.cliente_id && transacao.cliente_id !== filtros.cliente_id) return false;
      if (filtros.valor_minimo && transacao.valor < filtros.valor_minimo) return false;
      if (filtros.valor_maximo && transacao.valor > filtros.valor_maximo) return false;
      return true;
    });
  }, [transacoes]);

  // =====================================================
  // EFEITOS
  // =====================================================

  // Carregamento inicial
  useEffect(() => {
    if (clinica_id && user) {
      refresh();
    }
  }, [clinica_id, user, refresh]);

  // Auto refresh
  useEffect(() => {
    if (auto_refresh && refresh_interval > 0) {
      const interval = setInterval(refresh, refresh_interval);
      return () => clearInterval(interval);
    }
  }, [auto_refresh, refresh_interval, refresh]);

  // =====================================================
  // RETORNO DO HOOK
  // =====================================================

  return {
    // Estados
    transacoes,
    metas,
    comissoes,
    resumo,
    dashboard,
    loading,
    error,

    // Ações
    criarTransacao,
    atualizarTransacao,
    excluirTransacao,
    criarMeta,
    atualizarMeta,
    criarComissao,
    atualizarComissao,

    // Consultas
    obterResumo,
    compararComMetas,
    calcularComissao,

    // Utilitários
    refresh,
    filtrarTransacoes
  };
}