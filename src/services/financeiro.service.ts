// =====================================================
// SERVIÇO FINANCEIRO
// =====================================================
// Implementa operações do sistema financeiro com
// cálculo automático de receitas e comissões
// =====================================================

import { supabase } from '@/lib/supabase';
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
  ResumoFinanceiroBasico,
  ComissaoPendente,
  DespesaPorCategoria
} from '@/types/financeiro';

export class FinanceiroService {
  // =====================================================
  // TRANSAÇÕES FINANCEIRAS
  // =====================================================

  static async listarTransacoes(
    clinica_id: string,
    filtros?: FiltroTransacaoFinanceira
  ): Promise<TransacaoFinanceira[]> {
    let query = supabase
      .from('transacoes_financeiras')
      .select(`
        *,
        profissional:profiles!profissional_id(nome_completo),
        cliente:clientes!cliente_id(nome_completo),
        sessao:sessoes_atendimento!sessao_atendimento_id(id),
        produto:produtos!produto_id(nome)
      `)
      .eq('clinica_id', clinica_id)
      .order('data_transacao', { ascending: false });

    // Aplicar filtros
    if (filtros) {
      if (filtros.tipo?.length) {
        query = query.in('tipo', filtros.tipo);
      }
      if (filtros.categoria_despesa?.length) {
        query = query.in('categoria_despesa', filtros.categoria_despesa);
      }
      if (filtros.status?.length) {
        query = query.in('status', filtros.status);
      }
      if (filtros.data_inicio) {
        query = query.gte('data_transacao', filtros.data_inicio);
      }
      if (filtros.data_fim) {
        query = query.lte('data_transacao', filtros.data_fim);
      }
      if (filtros.profissional_id) {
        query = query.eq('profissional_id', filtros.profissional_id);
      }
      if (filtros.cliente_id) {
        query = query.eq('cliente_id', filtros.cliente_id);
      }
      if (filtros.valor_minimo) {
        query = query.gte('valor', filtros.valor_minimo);
      }
      if (filtros.valor_maximo) {
        query = query.lte('valor', filtros.valor_maximo);
      }
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao listar transações: ${error.message}`);
    }

    return data || [];
  }

  static async criarTransacao(
    clinica_id: string,
    dados: CriarTransacaoFinanceiraData
  ): Promise<TransacaoFinanceira> {
    const { data, error } = await supabase
      .from('transacoes_financeiras')
      .insert({
        clinica_id,
        ...dados,
        status: 'confirmada'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar transação: ${error.message}`);
    }

    return data;
  }

  static async atualizarTransacao(
    id: string,
    dados: Partial<TransacaoFinanceira>
  ): Promise<TransacaoFinanceira> {
    const { data, error } = await supabase
      .from('transacoes_financeiras')
      .update(dados)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar transação: ${error.message}`);
    }

    return data;
  }

  static async excluirTransacao(id: string): Promise<void> {
    const { error } = await supabase
      .from('transacoes_financeiras')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao excluir transação: ${error.message}`);
    }
  }

  // =====================================================
  // METAS FINANCEIRAS
  // =====================================================

  static async listarMetas(clinica_id: string): Promise<MetaFinanceira[]> {
    const { data, error } = await supabase
      .from('metas_financeiras')
      .select('*')
      .eq('clinica_id', clinica_id)
      .eq('ativo', true)
      .order('ano', { ascending: false })
      .order('mes', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar metas: ${error.message}`);
    }

    return data || [];
  }

  static async criarMeta(
    clinica_id: string,
    dados: CriarMetaFinanceiraData
  ): Promise<MetaFinanceira> {
    const { data, error } = await supabase
      .from('metas_financeiras')
      .insert({
        clinica_id,
        ...dados
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar meta: ${error.message}`);
    }

    return data;
  }

  static async atualizarMeta(
    id: string,
    dados: Partial<MetaFinanceira>
  ): Promise<MetaFinanceira> {
    const { data, error } = await supabase
      .from('metas_financeiras')
      .update(dados)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar meta: ${error.message}`);
    }

    return data;
  }

  // =====================================================
  // COMISSÕES PROFISSIONAIS
  // =====================================================

  static async listarComissoes(clinica_id: string): Promise<ComissaoProfissional[]> {
    const { data, error } = await supabase
      .from('comissoes_profissionais')
      .select(`
        *,
        profissional:profiles!profissional_id(nome_completo),
        servico:servicos!servico_id(nome)
      `)
      .eq('clinica_id', clinica_id)
      .eq('ativo', true)
      .order('criado_em', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar comissões: ${error.message}`);
    }

    return data || [];
  }

  static async criarComissao(
    clinica_id: string,
    dados: CriarComissaoProfissionalData
  ): Promise<ComissaoProfissional> {
    const { data, error } = await supabase
      .from('comissoes_profissionais')
      .insert({
        clinica_id,
        ...dados
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar comissão: ${error.message}`);
    }

    return data;
  }

  static async atualizarComissao(
    id: string,
    dados: Partial<ComissaoProfissional>
  ): Promise<ComissaoProfissional> {
    const { data, error } = await supabase
      .from('comissoes_profissionais')
      .update(dados)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar comissão: ${error.message}`);
    }

    return data;
  }

  // =====================================================
  // FUNÇÕES DE CÁLCULO E RELATÓRIOS
  // =====================================================

  static async calcularComissao(
    profissional_id: string,
    clinica_id: string,
    servico_id: string,
    valor_procedimento: number
  ): Promise<CalculoComissao> {
    const { data, error } = await supabase.rpc('calcular_comissao_profissional', {
      p_profissional_id: profissional_id,
      p_clinica_id: clinica_id,
      p_servico_id: servico_id,
      p_valor_procedimento: valor_procedimento
    });

    if (error) {
      throw new Error(`Erro ao calcular comissão: ${error.message}`);
    }

    return data?.[0] || { percentual: 0, valor_comissao: 0 };
  }

  static async registrarReceitaSessao(sessao_id: string): Promise<string> {
    const { data, error } = await supabase.rpc('registrar_receita_sessao', {
      p_sessao_id: sessao_id
    });

    if (error) {
      throw new Error(`Erro ao registrar receita: ${error.message}`);
    }

    return data;
  }

  static async registrarGastoProduto(
    produto_id: string,
    quantidade: number,
    sessao_id?: string,
    motivo?: string
  ): Promise<string> {
    const { data, error } = await supabase.rpc('registrar_gasto_produto', {
      p_produto_id: produto_id,
      p_quantidade: quantidade,
      p_sessao_id: sessao_id,
      p_motivo: motivo || 'Uso em procedimento'
    });

    if (error) {
      throw new Error(`Erro ao registrar gasto: ${error.message}`);
    }

    return data;
  }

  static async obterResumoFinanceiro(
    clinica_id: string,
    data_inicio: string,
    data_fim: string
  ): Promise<ResumoFinanceiro> {
    const { data, error } = await supabase.rpc('obter_resumo_financeiro', {
      p_clinica_id: clinica_id,
      p_data_inicio: data_inicio,
      p_data_fim: data_fim
    });

    if (error) {
      throw new Error(`Erro ao obter resumo financeiro: ${error.message}`);
    }

    return data?.[0] || {
      total_receitas: 0,
      total_despesas: 0,
      total_comissoes: 0,
      lucro_bruto: 0,
      lucro_liquido: 0,
      total_atendimentos: 0,
      ticket_medio: 0,
      comissoes_pagas: 0,
      comissoes_pendentes: 0
    };
  }

  static async compararComMetas(
    clinica_id: string,
    ano: number,
    mes: number
  ): Promise<ComparacaoMetas> {
    const { data, error } = await supabase.rpc('comparar_com_metas', {
      p_clinica_id: clinica_id,
      p_ano: ano,
      p_mes: mes
    });

    if (error) {
      throw new Error(`Erro ao comparar com metas: ${error.message}`);
    }

    return data?.[0] || {
      meta_receita: 0,
      receita_atual: 0,
      percentual_receita: 0,
      meta_despesas: 0,
      despesas_atual: 0,
      percentual_despesas: 0,
      meta_lucro: 0,
      lucro_atual: 0,
      percentual_lucro: 0,
      meta_atendimentos: 0,
      atendimentos_atual: 0,
      percentual_atendimentos: 0
    };
  }

  // =====================================================
  // VIEWS E CONSULTAS ESPECIAIS
  // =====================================================

  static async obterResumoBasico(clinica_id: string): Promise<ResumoFinanceiroBasico[]> {
    const { data, error } = await supabase
      .from('resumo_financeiro_basico')
      .select('*')
      .eq('clinica_id', clinica_id)
      .order('mes_ano', { ascending: false })
      .limit(12);

    if (error) {
      throw new Error(`Erro ao obter resumo básico: ${error.message}`);
    }

    return data || [];
  }

  static async obterComissoesPendentes(clinica_id: string): Promise<ComissaoPendente[]> {
    const { data, error } = await supabase
      .from('comissoes_pendentes')
      .select('*')
      .eq('clinica_id', clinica_id)
      .order('valor_total_pendente', { ascending: false });

    if (error) {
      throw new Error(`Erro ao obter comissões pendentes: ${error.message}`);
    }

    return data || [];
  }

  static async obterDespesasPorCategoria(
    clinica_id: string,
    meses: number = 6
  ): Promise<DespesaPorCategoria[]> {
    const dataLimite = new Date();
    dataLimite.setMonth(dataLimite.getMonth() - meses);

    const { data, error } = await supabase
      .from('despesas_por_categoria')
      .select('*')
      .eq('clinica_id', clinica_id)
      .gte('mes_ano', dataLimite.toISOString().slice(0, 7))
      .order('mes_ano', { ascending: false })
      .order('valor_total', { ascending: false });

    if (error) {
      throw new Error(`Erro ao obter despesas por categoria: ${error.message}`);
    }

    return data || [];
  }

  // =====================================================
  // OPERAÇÕES DE COMISSÃO
  // =====================================================

  static async marcarComissaoComoPaga(
    transacao_id: string,
    data_pagamento?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('transacoes_financeiras')
      .update({
        comissao_paga: true,
        data_pagamento_comissao: data_pagamento || new Date().toISOString().split('T')[0]
      })
      .eq('id', transacao_id)
      .eq('tipo', 'comissao');

    if (error) {
      throw new Error(`Erro ao marcar comissão como paga: ${error.message}`);
    }
  }

  static async marcarMultiplasComissoesPagas(
    profissional_id: string,
    clinica_id: string,
    data_pagamento?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('transacoes_financeiras')
      .update({
        comissao_paga: true,
        data_pagamento_comissao: data_pagamento || new Date().toISOString().split('T')[0]
      })
      .eq('profissional_id', profissional_id)
      .eq('clinica_id', clinica_id)
      .eq('tipo', 'comissao')
      .eq('comissao_paga', false)
      .eq('status', 'confirmada');

    if (error) {
      throw new Error(`Erro ao marcar comissões como pagas: ${error.message}`);
    }
  }

  // =====================================================
  // UTILITÁRIOS
  // =====================================================

  static async verificarIntegridadeFinanceira(clinica_id: string): Promise<{
    sessoes_sem_receita: number;
    receitas_sem_sessao: number;
    comissoes_inconsistentes: number;
  }> {
    // Verificar sessões sem receita registrada
    const { data: sessoesSemReceita, error: error1 } = await supabase
      .from('sessoes_atendimento')
      .select('id')
      .eq('clinica_id', clinica_id)
      .not('valor_total', 'is', null)
      .gt('valor_total', 0)
      .not('id', 'in', 
        supabase
          .from('transacoes_financeiras')
          .select('sessao_atendimento_id')
          .eq('tipo', 'receita')
          .not('sessao_atendimento_id', 'is', null)
      );

    // Verificar receitas sem sessão
    const { data: receitasSemSessao, error: error2 } = await supabase
      .from('transacoes_financeiras')
      .select('id')
      .eq('clinica_id', clinica_id)
      .eq('tipo', 'receita')
      .is('sessao_atendimento_id', null);

    // Verificar comissões inconsistentes
    const { data: comissoesInconsistentes, error: error3 } = await supabase
      .from('transacoes_financeiras')
      .select('id')
      .eq('clinica_id', clinica_id)
      .eq('tipo', 'comissao')
      .or('valor_comissao.is.null,percentual_comissao.is.null');

    if (error1 || error2 || error3) {
      throw new Error('Erro ao verificar integridade financeira');
    }

    return {
      sessoes_sem_receita: sessoesSemReceita?.length || 0,
      receitas_sem_sessao: receitasSemSessao?.length || 0,
      comissoes_inconsistentes: comissoesInconsistentes?.length || 0
    };
  }
}