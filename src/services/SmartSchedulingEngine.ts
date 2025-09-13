/**
 * SmartSchedulingEngine - Engine Inteligente de Agendamento
 * Sistema avançado para otimização automática de agendamentos
 * com detecção de conflitos e sugestões inteligentes
 */

import { supabase } from '@/integrations/supabase/client';
import { addMinutes, format, startOfDay, endOfDay, addDays, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// =====================================================
// INTERFACES E TIPOS
// =====================================================

export interface SchedulingCriteria {
  clienteId: string;
  profissionalId: string;
  servicoId: string;
  salaPreferida?: string;
  dataPreferida: Date;
  horaPreferida?: string;
  duracaoMinutos: number;
  flexibilidadeDias?: number;
  aceitaAlternativas?: boolean;
  prioridade?: 'baixa' | 'normal' | 'alta' | 'urgente' | 'vip';
  categoriaCliente?: 'regular' | 'vip' | 'premium' | 'corporativo';
}

export interface OptimalSlot {
  dataHorario: Date;
  profissionalId: string;
  salaId?: string;
  pontuacao: number;
  motivos: string[];
  conflitos: ConflictInfo[];
  alternativas?: AlternativeSlot[];
}

export interface ConflictInfo {
  tipo: 'agendamento' | 'bloqueio' | 'horario_funcionamento' | 'intervalo_minimo';
  severidade: 'baixa' | 'media' | 'alta' | 'critica';
  descricao: string;
  agendamentoConflitante?: any;
  bloqueioConflitante?: any;
  sugestaoResolucao?: string;
}

export interface AlternativeSlot {
  dataHorario: Date;
  profissionalId: string;
  salaId?: string;
  motivo: string;
  pontuacao: number;
}

export interface ConflictAnalysis {
  temConflitos: boolean;
  conflitos: ConflictInfo[];
  podeResolver: boolean;
  sugestoesResolucao: string[];
  alternativasDisponiveis: AlternativeSlot[];
}

export interface AgendamentoData {
  id?: string;
  clienteId: string;
  profissionalId: string;
  servicoId: string;
  salaId?: string;
  dataAgendamento: Date;
  duracaoMinutos: number;
  status?: string;
  prioridade?: string;
  categoriaCliente?: string;
}

// =====================================================
// SMART SCHEDULING ENGINE
// =====================================================

export class SmartSchedulingEngine {
  private static instance: SmartSchedulingEngine;
  
  public static getInstance(): SmartSchedulingEngine {
    if (!SmartSchedulingEngine.instance) {
      SmartSchedulingEngine.instance = new SmartSchedulingEngine();
    }
    return SmartSchedulingEngine.instance;
  }

  /**
   * Encontra slots ótimos baseado nos critérios fornecidos
   */
  async findOptimalSlot(criteria: SchedulingCriteria): Promise<OptimalSlot[]> {
    try {
      const slots: OptimalSlot[] = [];
      const flexibilidadeDias = criteria.flexibilidadeDias || 7;
      const dataInicio = criteria.dataPreferida;
      const dataFim = addDays(dataInicio, flexibilidadeDias);

      // Buscar horários disponíveis usando a função do banco
      const { data: horariosDisponiveis, error } = await supabase.rpc(
        'buscar_horarios_disponiveis',
        {
          p_profissional_id: criteria.profissionalId,
          p_servico_id: criteria.servicoId,
          p_data_inicio: format(dataInicio, 'yyyy-MM-dd'),
          p_data_fim: format(dataFim, 'yyyy-MM-dd'),
          p_duracao_minutos: criteria.duracaoMinutos,
          p_intervalo_minutos: 30,
          p_sala_preferida: criteria.salaPreferida
        }
      );

      if (error) {
        console.error('Erro ao buscar horários disponíveis:', error);
        return [];
      }

      // Processar e pontuar cada slot disponível
      for (const horario of horariosDisponiveis || []) {
        if (horario.disponivel) {
          const pontuacao = await this.calcularPontuacaoSlot(
            new Date(horario.data_horario),
            criteria
          );

          const slot: OptimalSlot = {
            dataHorario: new Date(horario.data_horario),
            profissionalId: criteria.profissionalId,
            salaId: horario.sala_sugerida,
            pontuacao,
            motivos: this.gerarMotivosPontuacao(pontuacao, criteria),
            conflitos: []
          };

          slots.push(slot);
        }
      }

      // Ordenar por pontuação (maior primeiro)
      slots.sort((a, b) => b.pontuacao - a.pontuacao);

      // Limitar a 10 melhores opções
      return slots.slice(0, 10);

    } catch (error) {
      console.error('Erro no findOptimalSlot:', error);
      return [];
    }
  }

  /**
   * Detecta conflitos em um agendamento
   */
  async detectConflicts(agendamento: AgendamentoData): Promise<ConflictAnalysis> {
    try {
      const dataFim = addMinutes(agendamento.dataAgendamento, agendamento.duracaoMinutos);
      
      // Usar função de validação completa do banco
      const { data: validacao, error } = await supabase.rpc(
        'validar_agendamento_completo',
        {
          p_cliente_id: agendamento.clienteId,
          p_profissional_id: agendamento.profissionalId,
          p_servico_id: agendamento.servicoId,
          p_sala_id: agendamento.salaId,
          p_data_agendamento: agendamento.dataAgendamento.toISOString(),
          p_duracao_minutos: agendamento.duracaoMinutos,
          p_agendamento_excluir: agendamento.id
        }
      );

      if (error) {
        console.error('Erro na validação:', error);
        return {
          temConflitos: true,
          conflitos: [{
            tipo: 'agendamento',
            severidade: 'critica',
            descricao: 'Erro na validação do agendamento'
          }],
          podeResolver: false,
          sugestoesResolucao: [],
          alternativasDisponiveis: []
        };
      }

      const conflitos: ConflictInfo[] = [];
      
      // Processar erros como conflitos críticos
      if (validacao?.erros && validacao.erros.length > 0) {
        for (const erro of validacao.erros) {
          conflitos.push({
            tipo: 'agendamento',
            severidade: 'critica',
            descricao: erro,
            sugestaoResolucao: this.gerarSugestaoResolucao(erro)
          });
        }
      }

      // Processar avisos como conflitos de baixa severidade
      if (validacao?.avisos && validacao.avisos.length > 0) {
        for (const aviso of validacao.avisos) {
          conflitos.push({
            tipo: 'intervalo_minimo',
            severidade: 'baixa',
            descricao: aviso
          });
        }
      }

      // Buscar alternativas se há conflitos
      let alternativas: AlternativeSlot[] = [];
      if (conflitos.length > 0) {
        alternativas = await this.buscarAlternativas(agendamento);
      }

      return {
        temConflitos: conflitos.length > 0,
        conflitos,
        podeResolver: conflitos.every(c => c.severidade !== 'critica'),
        sugestoesResolucao: conflitos.map(c => c.sugestaoResolucao).filter(Boolean) as string[],
        alternativasDisponiveis: alternativas
      };

    } catch (error) {
      console.error('Erro no detectConflicts:', error);
      return {
        temConflitos: true,
        conflitos: [{
          tipo: 'agendamento',
          severidade: 'critica',
          descricao: 'Erro interno na detecção de conflitos'
        }],
        podeResolver: false,
        sugestoesResolucao: [],
        alternativasDisponiveis: []
      };
    }
  }

  /**
   * Sugere alternativas para agendamentos com conflito
   */
  async suggestAlternatives(agendamento: AgendamentoData): Promise<AlternativeSlot[]> {
    return this.buscarAlternativas(agendamento);
  }

  /**
   * Otimiza agenda de um profissional para um dia
   */
  async optimizeDaySchedule(profissionalId: string, data: Date): Promise<{
    otimizacoesSugeridas: any[];
    melhoriaEstimada: {
      tempoLivreAntes: number;
      tempoLivreDepois: number;
      receitaAntes: number;
      receitaDepois: number;
    };
  }> {
    try {
      // Buscar agendamentos do dia
      const { data: agendamentos, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          servicos(preco_base, duracao_media_minutos),
          clientes(nome, categoria)
        `)
        .eq('profissional_id', profissionalId)
        .gte('data_agendamento', startOfDay(data).toISOString())
        .lte('data_agendamento', endOfDay(data).toISOString())
        .in('status', ['confirmado', 'pendente'])
        .order('data_agendamento');

      if (error) throw error;

      const otimizacoesSugeridas = [];
      let receitaAntes = 0;
      let receitaDepois = 0;
      let tempoLivreAntes = 0;
      let tempoLivreDepois = 0;

      // Calcular métricas atuais
      for (const agendamento of agendamentos || []) {
        receitaAntes += agendamento.valor_final || agendamento.servicos?.preco_base || 0;
      }

      // Identificar gaps e oportunidades de otimização
      if (agendamentos && agendamentos.length > 1) {
        for (let i = 0; i < agendamentos.length - 1; i++) {
          const atual = agendamentos[i];
          const proximo = agendamentos[i + 1];
          
          const fimAtual = addMinutes(new Date(atual.data_agendamento), atual.duracao_minutos);
          const inicioProximo = new Date(proximo.data_agendamento);
          
          const gapMinutos = (inicioProximo.getTime() - fimAtual.getTime()) / (1000 * 60);
          
          if (gapMinutos > 60) {
            otimizacoesSugeridas.push({
              tipo: 'gap_grande',
              descricao: `Gap de ${gapMinutos} minutos entre agendamentos`,
              sugestao: 'Considere reagendar para otimizar o tempo',
              agendamentoAnterior: atual.id,
              agendamentoPosterior: proximo.id,
              tempoEconomizado: gapMinutos - 30
            });
          }
        }
      }

      return {
        otimizacoesSugeridas,
        melhoriaEstimada: {
          tempoLivreAntes,
          tempoLivreDepois,
          receitaAntes,
          receitaDepois: receitaAntes // Por enquanto, sem alteração na receita
        }
      };

    } catch (error) {
      console.error('Erro na otimização da agenda:', error);
      return {
        otimizacoesSugeridas: [],
        melhoriaEstimada: {
          tempoLivreAntes: 0,
          tempoLivreDepois: 0,
          receitaAntes: 0,
          receitaDepois: 0
        }
      };
    }
  }

  // =====================================================
  // MÉTODOS PRIVADOS
  // =====================================================

  private async calcularPontuacaoSlot(dataHorario: Date, criteria: SchedulingCriteria): Promise<number> {
    let pontuacao = 100; // Pontuação base

    // Pontuação por proximidade da data preferida
    const diasDiferenca = Math.abs(
      (dataHorario.getTime() - criteria.dataPreferida.getTime()) / (1000 * 60 * 60 * 24)
    );
    pontuacao -= diasDiferenca * 10;

    // Pontuação por horário preferido
    if (criteria.horaPreferida) {
      const [horaPreferida, minutoPreferido] = criteria.horaPreferida.split(':').map(Number);
      const horaSlot = dataHorario.getHours();
      const minutoSlot = dataHorario.getMinutes();
      
      const diferencaMinutos = Math.abs(
        (horaSlot * 60 + minutoSlot) - (horaPreferida * 60 + minutoPreferido)
      );
      pontuacao -= diferencaMinutos / 10;
    }

    // Bônus por categoria de cliente
    switch (criteria.categoriaCliente) {
      case 'premium':
        pontuacao += 50;
        break;
      case 'vip':
        pontuacao += 40;
        break;
      case 'corporativo':
        pontuacao += 30;
        break;
    }

    // Bônus por prioridade
    switch (criteria.prioridade) {
      case 'vip':
        pontuacao += 100;
        break;
      case 'urgente':
        pontuacao += 80;
        break;
      case 'alta':
        pontuacao += 60;
        break;
      case 'normal':
        pontuacao += 40;
        break;
    }

    // Penalidade por horários menos desejáveis
    const hora = dataHorario.getHours();
    if (hora < 9 || hora > 17) {
      pontuacao -= 20;
    }

    // Bônus para horários de pico (mais eficiente)
    if (hora >= 10 && hora <= 16) {
      pontuacao += 10;
    }

    return Math.max(pontuacao, 0);
  }

  private gerarMotivosPontuacao(pontuacao: number, criteria: SchedulingCriteria): string[] {
    const motivos: string[] = [];

    if (pontuacao >= 150) {
      motivos.push('Horário premium com alta compatibilidade');
    } else if (pontuacao >= 100) {
      motivos.push('Boa opção dentro dos critérios');
    } else if (pontuacao >= 50) {
      motivos.push('Opção alternativa aceitável');
    } else {
      motivos.push('Opção com algumas limitações');
    }

    if (criteria.categoriaCliente === 'vip' || criteria.categoriaCliente === 'premium') {
      motivos.push('Prioridade para cliente premium');
    }

    if (criteria.prioridade === 'urgente' || criteria.prioridade === 'vip') {
      motivos.push('Agendamento prioritário');
    }

    return motivos;
  }

  private gerarSugestaoResolucao(erro: string): string {
    if (erro.includes('não disponível')) {
      return 'Tente um horário alternativo ou outro profissional';
    }
    if (erro.includes('conflito')) {
      return 'Verifique agendamentos existentes e considere reagendar';
    }
    if (erro.includes('horário de funcionamento')) {
      return 'Escolha um horário dentro do funcionamento da clínica';
    }
    if (erro.includes('intervalo mínimo')) {
      return 'Respeite o intervalo mínimo entre procedimentos';
    }
    return 'Verifique os dados do agendamento';
  }

  private async buscarAlternativas(agendamento: AgendamentoData): Promise<AlternativeSlot[]> {
    try {
      const alternativas: AlternativeSlot[] = [];
      const dataOriginal = agendamento.dataAgendamento;

      // Buscar alternativas nos próximos 7 dias
      for (let i = 1; i <= 7; i++) {
        const novaData = addDays(dataOriginal, i);
        
        const { data: horariosDisponiveis } = await supabase.rpc(
          'buscar_horarios_disponiveis',
          {
            p_profissional_id: agendamento.profissionalId,
            p_servico_id: agendamento.servicoId,
            p_data_inicio: format(novaData, 'yyyy-MM-dd'),
            p_data_fim: format(novaData, 'yyyy-MM-dd'),
            p_duracao_minutos: agendamento.duracaoMinutos,
            p_intervalo_minutos: 30,
            p_sala_preferida: agendamento.salaId
          }
        );

        // Pegar os 2 melhores horários do dia
        const horariosValidos = (horariosDisponiveis || [])
          .filter((h: any) => h.disponivel)
          .slice(0, 2);

        for (const horario of horariosValidos) {
          alternativas.push({
            dataHorario: new Date(horario.data_horario),
            profissionalId: agendamento.profissionalId,
            salaId: horario.sala_sugerida,
            motivo: `Alternativa para ${format(novaData, 'dd/MM/yyyy', { locale: ptBR })}`,
            pontuacao: 100 - (i * 10) // Penalidade por distância da data original
          });
        }
      }

      // Ordenar por pontuação e limitar a 5 alternativas
      return alternativas
        .sort((a, b) => b.pontuacao - a.pontuacao)
        .slice(0, 5);

    } catch (error) {
      console.error('Erro ao buscar alternativas:', error);
      return [];
    }
  }
}

// =====================================================
// INSTÂNCIA SINGLETON
// =====================================================

export const smartSchedulingEngine = SmartSchedulingEngine.getInstance();