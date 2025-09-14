/**
 * RevenueOptimizer - Sistema de Otimização de Receita
 * Engine inteligente para maximizar receita através de pricing dinâmico,
 * upselling e otimização de agenda
 */

import { supabase } from '@/integrations/supabase/client';
import { addDays, startOfDay, endOfDay, format, differenceInDays } from 'date-fns';

// =====================================================
// INTERFACES E TIPOS
// =====================================================

export interface DemandMetrics {
  ocupacaoAtual: number; // 0-100%
  demandaHistorica: number;
  tendenciaSemanal: 'crescente' | 'estavel' | 'decrescente';
  sazonalidade: number; // Fator multiplicador
  concorrencia: number; // Nível de concorrência no horário
}

export interface PricingRecommendation {
  precoSugerido: number;
  precoOriginal: number;
  desconto?: number;
  acrescimo?: number;
  justificativa: string[];
  confianca: number; // 0-100%
  validoAte: Date;
  fatoresConsiderados: string[];
}

export interface UpsellingSuggestion {
  servicoId: string;
  servicoNome: string;
  precoAdicional: number;
  probabilidadeAceitacao: number; // 0-100%
  motivoSugestao: string;
  beneficioCliente: string;
  incrementoReceita: number;
  categoria: 'complementar' | 'upgrade' | 'manutencao' | 'preventivo';
}

export interface RevenueAnalysis {
  receitaAtual: number;
  receitaPotencial: number;
  oportunidadePerdida: number;
  sugestoesMelhoria: RevenueSuggestion[];
  metricas: RevenueMetrics;
}

export interface RevenueSuggestion {
  tipo: 'pricing' | 'upselling' | 'reagendamento' | 'promocao';
  descricao: string;
  impactoEstimado: number;
  facilidadeImplementacao: 'baixa' | 'media' | 'alta';
  prioridade: number; // 1-10
}

export interface RevenueMetrics {
  ticketMedio: number;
  taxaConversao: number;
  receitaPorHora: number;
  margemLucro: number;
  custoOportunidade: number;
}

export interface Cliente {
  id: string;
  nome: string;
  categoria: 'regular' | 'vip' | 'premium' | 'corporativo';
  historicoGastos: number;
  frequenciaVisitas: number;
  ultimaVisita: Date;
  preferenciaServicos: string[];
  sensibilidadePreco: 'baixa' | 'media' | 'alta';
}

export interface Servico {
  id: string;
  nome: string;
  precoBase: number;
  duracaoMinutos: number;
  margemLucro: number;
  demandaMedia: number;
  sazonalidade: Record<string, number>;
  servicosComplementares: string[];
}

export interface Agendamento {
  id: string;
  clienteId: string;
  servicoId: string;
  dataAgendamento: Date;
  valorServico: number;
  valorFinal: number;
  status: string;
}

// =====================================================
// REVENUE OPTIMIZER CLASS
// =====================================================

export class RevenueOptimizer {
  private static instance: RevenueOptimizer;
  
  public static getInstance(): RevenueOptimizer {
    if (!RevenueOptimizer.instance) {
      RevenueOptimizer.instance = new RevenueOptimizer();
    }
    return RevenueOptimizer.instance;
  }

  /**
   * Calcula pricing dinâmico baseado na demanda
   */
  async calculateDynamicPricing(
    servico: Servico,
    horario: Date,
    demanda: DemandMetrics
  ): Promise<PricingRecommendation> {
    try {
      let precoSugerido = servico.precoBase;
      const justificativas: string[] = [];
      const fatoresConsiderados: string[] = [];
      let confianca = 80;

      // Fator de ocupação
      if (demanda.ocupacaoAtual > 80) {
        const acrescimo = servico.precoBase * 0.15; // 15% de acréscimo
        precoSugerido += acrescimo;
        justificativas.push(`Alta demanda (${demanda.ocupacaoAtual}% ocupação)`);
        fatoresConsiderados.push('ocupacao_alta');
      } else if (demanda.ocupacaoAtual < 40) {
        const desconto = servico.precoBase * 0.10; // 10% de desconto
        precoSugerido -= desconto;
        justificativas.push(`Baixa demanda (${demanda.ocupacaoAtual}% ocupação)`);
        fatoresConsiderados.push('ocupacao_baixa');
      }

      // Fator de sazonalidade
      const mes = format(horario, 'MM');
      const fatorSazonalidade = servico.sazonalidade[mes] || 1;
      if (fatorSazonalidade > 1.1) {
        precoSugerido *= fatorSazonalidade;
        justificativas.push('Período de alta sazonalidade');
        fatoresConsiderados.push('sazonalidade_alta');
      } else if (fatorSazonalidade < 0.9) {
        precoSugerido *= fatorSazonalidade;
        justificativas.push('Período de baixa sazonalidade');
        fatoresConsiderados.push('sazonalidade_baixa');
      }

      // Fator de horário premium
      const hora = horario.getHours();
      if (hora >= 18 || hora <= 8) {
        precoSugerido *= 1.05; // 5% de acréscimo para horários especiais
        justificativas.push('Horário premium (noite/manhã cedo)');
        fatoresConsiderados.push('horario_premium');
      }

      // Fator de tendência
      if (demanda.tendenciaSemanal === 'crescente') {
        precoSugerido *= 1.08;
        justificativas.push('Tendência de crescimento da demanda');
        fatoresConsiderados.push('tendencia_crescente');
      } else if (demanda.tendenciaSemanal === 'decrescente') {
        precoSugerido *= 0.95;
        justificativas.push('Tendência de queda da demanda');
        fatoresConsiderados.push('tendencia_decrescente');
      }

      // Limites de segurança (não mais que 25% de variação)
      const limiteMinimo = servico.precoBase * 0.75;
      const limiteMaximo = servico.precoBase * 1.25;
      precoSugerido = Math.max(limiteMinimo, Math.min(limiteMaximo, precoSugerido));

      // Ajustar confiança baseada na quantidade de fatores
      confianca = Math.min(95, 60 + (fatoresConsiderados.length * 8));

      const desconto = precoSugerido < servico.precoBase ? 
        servico.precoBase - precoSugerido : undefined;
      const acrescimo = precoSugerido > servico.precoBase ? 
        precoSugerido - servico.precoBase : undefined;

      return {
        precoSugerido: Math.round(precoSugerido * 100) / 100,
        precoOriginal: servico.precoBase,
        desconto,
        acrescimo,
        justificativa: justificativas,
        confianca,
        validoAte: addDays(new Date(), 1),
        fatoresConsiderados
      };

    } catch (error) {

      return {
        precoSugerido: servico.precoBase,
        precoOriginal: servico.precoBase,
        justificativa: ['Erro no cálculo - usando preço base'],
        confianca: 50,
        validoAte: addDays(new Date(), 1),
        fatoresConsiderados: []
      };
    }
  }

  /**
   * Sugere upselling baseado no perfil do cliente
   */
  async suggestUpselling(
    cliente: Cliente,
    agendamentoAtual: Agendamento
  ): Promise<UpsellingSuggestion[]> {
    try {
      const sugestoes: UpsellingSuggestion[] = [];

      // Buscar serviço atual
      const { data: servicoAtual } = await supabase
        .from('servicos')
        .select('*')
        .eq('id', agendamentoAtual.servicoId)
        .single();

      if (!servicoAtual) return [];

      // Buscar serviços complementares
      const { data: servicosComplementares } = await supabase
        .from('servicos')
        .select('*')
        .in('id', servicoAtual.servicos_complementares || [])
        .eq('ativo', true);

      // Buscar histórico do cliente
      const { data: historicoCliente } = await supabase
        .from('agendamentos')
        .select('servico_id, valor_final, data_agendamento')
        .eq('cliente_id', cliente.id)
        .eq('status', 'finalizado')
        .order('data_agendamento', { ascending: false })
        .limit(10);

      const servicosJaRealizados = new Set(
        historicoCliente?.map(h => h.servico_id) || []
      );

      // Processar serviços complementares
      for (const servico of servicosComplementares || []) {
        if (servicosJaRealizados.has(servico.id)) continue;

        let probabilidade = 60; // Base
        let categoria: UpsellingSuggestion['categoria'] = 'complementar';

        // Ajustar probabilidade baseada no perfil do cliente
        if (cliente.categoria === 'premium' || cliente.categoria === 'vip') {
          probabilidade += 20;
        }

        if (cliente.sensibilidadePreco === 'baixa') {
          probabilidade += 15;
        } else if (cliente.sensibilidadePreco === 'alta') {
          probabilidade -= 10;
        }

        // Verificar se é upgrade
        if (servico.preco_base > servicoAtual.preco_base) {
          categoria = 'upgrade';
          probabilidade -= 10;
        }

        // Verificar frequência de visitas
        if (cliente.frequenciaVisitas > 4) {
          probabilidade += 10;
        }

        sugestoes.push({
          servicoId: servico.id,
          servicoNome: servico.nome,
          precoAdicional: servico.preco_base,
          probabilidadeAceitacao: Math.min(95, Math.max(20, probabilidade)),
          motivoSugestao: this.gerarMotivoUpselling(servico, servicoAtual, cliente),
          beneficioCliente: this.gerarBeneficioCliente(servico, categoria),
          incrementoReceita: servico.preco_base,
          categoria
        });
      }

      // Buscar serviços de manutenção baseados no histórico
      const ultimoServico = historicoCliente?.[0];
      if (ultimoServico) {
        const diasDesdeUltimo = differenceInDays(new Date(), new Date(ultimoServico.data_agendamento));
        
        if (diasDesdeUltimo >= 30) {
          // Sugerir manutenção
          const { data: servicosManutencao } = await supabase
            .from('servicos')
            .select('*')
            .ilike('nome', '%manutenção%')
            .eq('ativo', true)
            .limit(2);

          for (const servico of servicosManutencao || []) {
            sugestoes.push({
              servicoId: servico.id,
              servicoNome: servico.nome,
              precoAdicional: servico.preco_base,
              probabilidadeAceitacao: 75,
              motivoSugestao: `Recomendado após ${diasDesdeUltimo} dias do último procedimento`,
              beneficioCliente: 'Mantém os resultados por mais tempo',
              incrementoReceita: servico.preco_base,
              categoria: 'manutencao'
            });
          }
        }
      }

      // Ordenar por probabilidade e receita
      return sugestoes
        .sort((a, b) => (b.probabilidadeAceitacao * b.incrementoReceita) - (a.probabilidadeAceitacao * a.incrementoReceita))
        .slice(0, 5);

    } catch (error) {

      return [];
    }
  }

  /**
   * Analisa oportunidades de receita
   */
  async analyzeRevenueOpportunities(
    profissionalId: string,
    dataInicio: Date,
    dataFim: Date
  ): Promise<RevenueAnalysis> {
    try {
      // Buscar agendamentos do período
      const { data: agendamentos } = await supabase
        .from('agendamentos')
        .select(`
          *,
          servicos(nome, preco_base, duracao_media_minutos),
          clientes(nome, categoria)
        `)
        .eq('profissional_id', profissionalId)
        .gte('data_agendamento', dataInicio.toISOString())
        .lte('data_agendamento', dataFim.toISOString())
        .in('status', ['confirmado', 'finalizado']);

      const receitaAtual = agendamentos?.reduce((sum, a) => sum + (a.valor_final || 0), 0) || 0;
      
      // Calcular métricas
      const totalHoras = agendamentos?.reduce((sum, a) => sum + (a.duracao_minutos / 60), 0) || 0;
      const ticketMedio = agendamentos?.length ? receitaAtual / agendamentos.length : 0;
      const receitaPorHora = totalHoras > 0 ? receitaAtual / totalHoras : 0;

      // Identificar oportunidades
      const sugestoesMelhoria: RevenueSuggestion[] = [];
      let receitaPotencial = receitaAtual;

      // Oportunidade 1: Otimização de preços
      const agendamentosComPrecoBase = agendamentos?.filter(a => 
        a.valor_final === a.servicos?.preco_base
      ) || [];
      
      if (agendamentosComPrecoBase.length > 0) {
        const incrementoPricing = agendamentosComPrecoBase.length * 50; // Estimativa
        receitaPotencial += incrementoPricing;
        
        sugestoesMelhoria.push({
          tipo: 'pricing',
          descricao: 'Implementar pricing dinâmico em horários de alta demanda',
          impactoEstimado: incrementoPricing,
          facilidadeImplementacao: 'media',
          prioridade: 8
        });
      }

      // Oportunidade 2: Upselling
      const clientesVip = agendamentos?.filter(a => 
        a.clientes?.categoria === 'vip' || a.clientes?.categoria === 'premium'
      ) || [];
      
      if (clientesVip.length > 0) {
        const incrementoUpselling = clientesVip.length * 200; // Estimativa
        receitaPotencial += incrementoUpselling;
        
        sugestoesMelhoria.push({
          tipo: 'upselling',
          descricao: 'Oferecer serviços complementares para clientes premium',
          impactoEstimado: incrementoUpselling,
          facilidadeImplementacao: 'alta',
          prioridade: 9
        });
      }

      // Oportunidade 3: Otimização de agenda
      const horasDisponiveis = this.calcularHorasDisponiveis(dataInicio, dataFim);
      const horasOcupadas = totalHoras;
      const taxaOcupacao = horasDisponiveis > 0 ? (horasOcupadas / horasDisponiveis) * 100 : 0;
      
      if (taxaOcupacao < 70) {
        const horasVazias = horasDisponiveis - horasOcupadas;
        const incrementoOcupacao = horasVazias * receitaPorHora * 0.3; // 30% das horas vazias
        receitaPotencial += incrementoOcupacao;
        
        sugestoesMelhoria.push({
          tipo: 'reagendamento',
          descricao: 'Otimizar distribuição de agendamentos para reduzir gaps',
          impactoEstimado: incrementoOcupacao,
          facilidadeImplementacao: 'media',
          prioridade: 7
        });
      }

      const metricas: RevenueMetrics = {
        ticketMedio,
        taxaConversao: 85, // Estimativa - seria calculada com dados reais
        receitaPorHora,
        margemLucro: 60, // Estimativa
        custoOportunidade: receitaPotencial - receitaAtual
      };

      return {
        receitaAtual,
        receitaPotencial,
        oportunidadePerdida: receitaPotencial - receitaAtual,
        sugestoesMelhoria: sugestoesMelhoria.sort((a, b) => b.prioridade - a.prioridade),
        metricas
      };

    } catch (error) {

      return {
        receitaAtual: 0,
        receitaPotencial: 0,
        oportunidadePerdida: 0,
        sugestoesMelhoria: [],
        metricas: {
          ticketMedio: 0,
          taxaConversao: 0,
          receitaPorHora: 0,
          margemLucro: 0,
          custoOportunidade: 0
        }
      };
    }
  }

  /**
   * Calcula métricas de demanda para um horário específico
   */
  async calculateDemandMetrics(
    servicoId: string,
    horario: Date,
    profissionalId?: string
  ): Promise<DemandMetrics> {
    try {
      const dataInicio = startOfDay(horario);
      const dataFim = endOfDay(horario);
      
      // Buscar agendamentos do mesmo horário nas últimas 4 semanas
      const { data: agendamentosHistoricos } = await supabase
        .from('agendamentos')
        .select('data_agendamento, status')
        .eq('servico_id', servicoId)
        .gte('data_agendamento', addDays(dataInicio, -28).toISOString())
        .lte('data_agendamento', dataFim.toISOString())
        .in('status', ['confirmado', 'finalizado']);

      // Calcular ocupação atual do dia
      const { data: agendamentosHoje } = await supabase
        .from('agendamentos')
        .select('duracao_minutos')
        .gte('data_agendamento', dataInicio.toISOString())
        .lte('data_agendamento', dataFim.toISOString())
        .in('status', ['confirmado', 'pendente']);

      const minutosOcupados = agendamentosHoje?.reduce((sum, a) => sum + a.duracao_minutos, 0) || 0;
      const minutosDisponiveis = 8 * 60; // 8 horas de trabalho
      const ocupacaoAtual = (minutosOcupados / minutosDisponiveis) * 100;

      // Calcular demanda histórica
      const demandaHistorica = agendamentosHistoricos?.length || 0;

      // Calcular tendência (comparar últimas 2 semanas com 2 semanas anteriores)
      const agendamentosRecentes = agendamentosHistoricos?.filter(a => 
        new Date(a.data_agendamento) >= addDays(dataInicio, -14)
      ).length || 0;
      
      const agendamentosAnteriores = agendamentosHistoricos?.filter(a => 
        new Date(a.data_agendamento) < addDays(dataInicio, -14)
      ).length || 0;

      let tendenciaSemanal: DemandMetrics['tendenciaSemanal'] = 'estavel';
      if (agendamentosRecentes > agendamentosAnteriores * 1.2) {
        tendenciaSemanal = 'crescente';
      } else if (agendamentosRecentes < agendamentosAnteriores * 0.8) {
        tendenciaSemanal = 'decrescente';
      }

      return {
        ocupacaoAtual: Math.min(100, ocupacaoAtual),
        demandaHistorica,
        tendenciaSemanal,
        sazonalidade: 1.0, // Seria calculado com dados históricos mais amplos
        concorrencia: 0.5 // Seria integrado com dados externos
      };

    } catch (error) {

      return {
        ocupacaoAtual: 50,
        demandaHistorica: 0,
        tendenciaSemanal: 'estavel',
        sazonalidade: 1.0,
        concorrencia: 0.5
      };
    }
  }

  // =====================================================
  // MÉTODOS PRIVADOS
  // =====================================================

  private gerarMotivoUpselling(servico: any, servicoAtual: any, cliente: Cliente): string {
    if (servico.preco_base > servicoAtual.preco_base) {
      return `Upgrade recomendado para ${cliente.categoria === 'vip' ? 'cliente VIP' : 'melhor resultado'}`;
    }
    return `Complementa perfeitamente o ${servicoAtual.nome}`;
  }

  private gerarBeneficioCliente(servico: any, categoria: UpsellingSuggestion['categoria']): string {
    switch (categoria) {
      case 'complementar':
        return 'Potencializa os resultados do procedimento principal';
      case 'upgrade':
        return 'Resultados superiores e mais duradouros';
      case 'manutencao':
        return 'Mantém os resultados por mais tempo';
      case 'preventivo':
        return 'Previne problemas futuros';
      default:
        return 'Benefício adicional para seu tratamento';
    }
  }

  private calcularHorasDisponiveis(dataInicio: Date, dataFim: Date): number {
    const dias = differenceInDays(dataFim, dataInicio) + 1;
    return dias * 8; // 8 horas por dia útil
  }
}

// =====================================================
// INSTÂNCIA SINGLETON
// =====================================================

export const revenueOptimizer = RevenueOptimizer.getInstance();
