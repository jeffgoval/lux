/**
 * VipReschedulingService - Serviço de Reagendamento VIP
 * Sistema especializado para reagendamentos sem penalidades para clientes VIP
 */

import { supabase } from '@/integrations/supabase/client';
import { smartSchedulingEngine, AlternativeSlot } from './SmartSchedulingEngine';
import { addMinutes, format, isAfter, isBefore, subHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// =====================================================
// INTERFACES
// =====================================================

export interface VipRescheduleRequest {
  agendamentoId: string;
  clienteId: string;
  novaData?: Date;
  novoHorario?: string;
  motivo?: string;
  preferenciasProfissional?: string[];
  preferenciasSala?: string[];
  flexibilidadeDias?: number;
  urgente?: boolean;
}

export interface VipRescheduleResponse {
  success: boolean;
  agendamentoId: string;
  novoAgendamento?: VipAgendamento;
  alternativas?: AlternativeSlot[];
  penalidade?: VipPenalty;
  beneficiosUsados?: string[];
  message: string;
}

export interface VipAgendamento {
  id: string;
  clienteId: string;
  profissionalId: string;
  servicoId: string;
  salaId?: string;
  dataOriginal: Date;
  novaData: Date;
  horarioOriginal: string;
  novoHorario: string;
  status: 'reagendado' | 'confirmado' | 'pendente';
  valorOriginal: number;
  valorFinal: number;
  descontoVip: number;
  observacoes?: string;
  historico: VipHistoricoReagendamento[];
}

export interface VipPenalty {
  aplicada: boolean;
  tipo: 'taxa' | 'credito' | 'sem_penalidade';
  valor: number;
  motivo: string;
  dispensadoPor: 'status_vip' | 'antecedencia' | 'primeira_vez' | 'programa_fidelidade';
}

export interface VipHistoricoReagendamento {
  data: Date;
  de: {
    data: Date;
    horario: string;
  };
  para: {
    data: Date;
    horario: string;
  };
  motivo?: string;
  penalidade?: VipPenalty;
  usuarioId: string;
}

export interface VipReschedulePolicy {
  categoria: 'vip' | 'premium' | 'diamond';
  reagendamentosGratuitos: number;
  antecedenciaMinima: number; // horas
  taxaEmergencia: number;
  beneficios: VipBenefit[];
}

export interface VipBenefit {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  condicoes?: string[];
}

// =====================================================
// POLÍTICAS VIP
// =====================================================

const VIP_POLICIES: Record<string, VipReschedulePolicy> = {
  vip: {
    categoria: 'vip',
    reagendamentosGratuitos: 2,
    antecedenciaMinima: 2,
    taxaEmergencia: 0.1, // 10%
    beneficios: [
      {
        id: 'reagendamento_gratuito',
        nome: 'Reagendamento Gratuito',
        descricao: 'Até 2 reagendamentos por mês sem taxa',
        ativo: true,
        condicoes: ['antecedencia_2h', 'limite_mensal']
      },
      {
        id: 'prioridade_horario',
        nome: 'Prioridade de Horário',
        descricao: 'Acesso prioritário aos melhores horários',
        ativo: true
      }
    ]
  },
  premium: {
    categoria: 'premium',
    reagendamentosGratuitos: 3,
    antecedenciaMinima: 1,
    taxaEmergencia: 0.05, // 5%
    beneficios: [
      {
        id: 'reagendamento_ilimitado',
        nome: 'Reagendamento Ilimitado',
        descricao: 'Reagendamentos ilimitados sem taxa',
        ativo: true,
        condicoes: ['antecedencia_1h']
      },
      {
        id: 'upgrade_automatico',
        nome: 'Upgrade Automático',
        descricao: 'Upgrade automático para horários premium disponíveis',
        ativo: true
      },
      {
        id: 'concierge_dedicado',
        nome: 'Concierge Dedicado',
        descricao: 'Assistência personalizada para reagendamentos',
        ativo: true
      }
    ]
  },
  diamond: {
    categoria: 'diamond',
    reagendamentosGratuitos: -1, // ilimitado
    antecedenciaMinima: 0.5,
    taxaEmergencia: 0,
    beneficios: [
      {
        id: 'sem_restricoes',
        nome: 'Sem Restrições',
        descricao: 'Reagende a qualquer momento sem penalidades',
        ativo: true
      },
      {
        id: 'horarios_exclusivos',
        nome: 'Horários Exclusivos',
        descricao: 'Acesso a horários reservados para Diamond',
        ativo: true
      },
      {
        id: 'garantia_satisfacao',
        nome: 'Garantia de Satisfação',
        descricao: 'Se não ficar satisfeito, reagende novamente grátis',
        ativo: true
      }
    ]
  }
};

// =====================================================
// SERVIÇO PRINCIPAL
// =====================================================

export class VipReschedulingService {
  private static instance: VipReschedulingService;

  public static getInstance(): VipReschedulingService {
    if (!VipReschedulingService.instance) {
      VipReschedulingService.instance = new VipReschedulingService();
    }
    return VipReschedulingService.instance;
  }

  /**
   * Reagenda um agendamento para cliente VIP
   */
  async rescheduleVipAppointment(request: VipRescheduleRequest): Promise<VipRescheduleResponse> {
    try {
      // 1. Validar cliente VIP
      const clienteVip = await this.validateVipClient(request.clienteId);
      if (!clienteVip.isVip) {
        return {
          success: false,
          agendamentoId: request.agendamentoId,
          message: 'Cliente não possui status VIP ativo'
        };
      }

      // 2. Buscar agendamento atual
      const agendamentoAtual = await this.getAgendamentoAtual(request.agendamentoId);
      if (!agendamentoAtual) {
        return {
          success: false,
          agendamentoId: request.agendamentoId,
          message: 'Agendamento não encontrado'
        };
      }

      // 3. Verificar política de reagendamento
      const policy = VIP_POLICIES[clienteVip.categoria];
      const penalidade = await this.calculatePenalty(
        agendamentoAtual,
        request,
        clienteVip,
        policy
      );

      // 4. Se data/horário específico foi solicitado
      if (request.novaData && request.novoHorario) {
        const novoDateTime = this.combineDateTime(request.novaData, request.novoHorario);
        
        // Validar disponibilidade
        const conflicts = await smartSchedulingEngine.detectConflicts({
          id: request.agendamentoId,
          clienteId: request.clienteId,
          profissionalId: agendamentoAtual.profissional_id,
          servicoId: agendamentoAtual.servico_id,
          salaId: agendamentoAtual.sala_id,
          dataAgendamento: novoDateTime,
          duracaoMinutos: agendamentoAtual.duracao_minutos
        });

        if (!conflicts.temConflitos) {
          // Reagendar para data/horário específico
          return await this.executeReschedule(
            agendamentoAtual,
            novoDateTime,
            request,
            penalidade,
            clienteVip
          );
        } else {
          // Retornar conflitos e alternativas
          return {
            success: false,
            agendamentoId: request.agendamentoId,
            alternativas: conflicts.alternativasDisponiveis,
            message: 'Horário não disponível. Veja as alternativas sugeridas.',
            penalidade
          };
        }
      }

      // 5. Buscar horários ótimos automaticamente
      const alternativas = await smartSchedulingEngine.findOptimalSlot({
        clienteId: request.clienteId,
        profissionalId: agendamentoAtual.profissional_id,
        servicoId: agendamentoAtual.servico_id,
        salaPreferida: agendamentoAtual.sala_id,
        dataPreferida: request.novaData || new Date(),
        duracaoMinutos: agendamentoAtual.duracao_minutos,
        flexibilidadeDias: request.flexibilidadeDias || 7,
        prioridade: 'vip',
        categoriaCliente: clienteVip.categoria
      });

      if (alternativas.length === 0) {
        return {
          success: false,
          agendamentoId: request.agendamentoId,
          message: 'Nenhum horário disponível encontrado no período solicitado'
        };
      }

      // 6. Se urgente, usar primeira opção disponível
      if (request.urgente && alternativas.length > 0) {
        const melhorOpcao = alternativas[0];
        return await this.executeReschedule(
          agendamentoAtual,
          melhorOpcao.dataHorario,
          request,
          penalidade,
          clienteVip,
          melhorOpcao.salaId
        );
      }

      // 7. Retornar alternativas para escolha do cliente
      return {
        success: true,
        agendamentoId: request.agendamentoId,
        alternativas: alternativas.slice(0, 5), // Top 5 opções
        penalidade,
        message: 'Horários disponíveis encontrados. Selecione sua preferência.'
      };

    } catch (error) {
      console.error('Erro no reagendamento VIP:', error);
      return {
        success: false,
        agendamentoId: request.agendamentoId,
        message: 'Erro interno no sistema de reagendamento'
      };
    }
  }

  /**
   * Executa o reagendamento efetivamente
   */
  private async executeReschedule(
    agendamentoAtual: any,
    novoDateTime: Date,
    request: VipRescheduleRequest,
    penalidade: VipPenalty,
    clienteVip: any,
    novaSalaId?: string
  ): Promise<VipRescheduleResponse> {
    
    try {
      // Usar transação para garantir consistência
      const { data, error } = await supabase.rpc('reagendar_vip_appointment', {
        p_agendamento_id: request.agendamentoId,
        p_nova_data: novoDateTime.toISOString(),
        p_nova_sala_id: novaSalaId || agendamentoAtual.sala_id,
        p_motivo: request.motivo,
        p_penalidade_valor: penalidade.valor,
        p_penalidade_aplicada: penalidade.aplicada,
        p_beneficios_utilizados: penalidade.dispensadoPor ? [penalidade.dispensadoPor] : []
      });

      if (error) {
        throw error;
      }

      // Enviar notificações
      await this.sendRescheduleNotifications(
        clienteVip,
        agendamentoAtual,
        novoDateTime,
        request.motivo
      );

      return {
        success: true,
        agendamentoId: request.agendamentoId,
        novoAgendamento: data.novo_agendamento,
        penalidade,
        beneficiosUsados: penalidade.dispensadoPor ? [penalidade.dispensadoPor] : [],
        message: 'Reagendamento realizado com sucesso!'
      };

    } catch (error) {
      console.error('Erro na execução do reagendamento:', error);
      throw error;
    }
  }

  /**
   * Valida se o cliente possui status VIP ativo
   */
  private async validateVipClient(clienteId: string): Promise<{
    isVip: boolean;
    categoria: 'vip' | 'premium' | 'diamond';
    beneficiosAtivos: string[];
  }> {
    const { data, error } = await supabase
      .from('clientes')
      .select(`
        categoria,
        programa_vip,
        beneficios_ativos,
        data_vip_inicio,
        data_vip_fim
      `)
      .eq('id', clienteId)
      .single();

    if (error || !data) {
      return { isVip: false, categoria: 'vip', beneficiosAtivos: [] };
    }

    const isVipAtivo = data.categoria && ['vip', 'premium', 'diamond'].includes(data.categoria);
    const vencimentoVip = data.data_vip_fim ? new Date(data.data_vip_fim) : null;
    const vipValido = !vencimentoVip || isAfter(vencimentoVip, new Date());

    return {
      isVip: isVipAtivo && vipValido,
      categoria: data.categoria || 'vip',
      beneficiosAtivos: data.beneficios_ativos || []
    };
  }

  /**
   * Busca dados do agendamento atual
   */
  private async getAgendamentoAtual(agendamentoId: string) {
    const { data, error } = await supabase
      .from('agendamentos')
      .select(`
        *,
        servicos(duracao_media_minutos, nome),
        clientes(nome, categoria),
        profissionais(nome)
      `)
      .eq('id', agendamentoId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Calcula penalidade baseada na política VIP
   */
  private async calculatePenalty(
    agendamento: any,
    request: VipRescheduleRequest,
    clienteVip: any,
    policy: VipReschedulePolicy
  ): Promise<VipPenalty> {
    
    const agora = new Date();
    const dataAgendamento = new Date(agendamento.data_agendamento);
    const horasAntecedencia = (dataAgendamento.getTime() - agora.getTime()) / (1000 * 60 * 60);

    // Diamond: sem penalidades
    if (clienteVip.categoria === 'diamond') {
      return {
        aplicada: false,
        tipo: 'sem_penalidade',
        valor: 0,
        motivo: 'Cliente Diamond - sem penalidades',
        dispensadoPor: 'status_vip'
      };
    }

    // Verificar antecedência mínima
    if (horasAntecedencia >= policy.antecedenciaMinima) {
      return {
        aplicada: false,
        tipo: 'sem_penalidade',
        valor: 0,
        motivo: `Reagendamento dentro da antecedência mínima (${policy.antecedenciaMinima}h)`,
        dispensadoPor: 'antecedencia'
      };
    }

    // Verificar cota mensal de reagendamentos
    const reagendamentosEsseMes = await this.countMonthlyReschedules(
      request.clienteId,
      new Date()
    );

    if (reagendamentosEsseMes < policy.reagendamentosGratuitos) {
      return {
        aplicada: false,
        tipo: 'sem_penalidade',
        valor: 0,
        motivo: `Reagendamento gratuito (${reagendamentosEsseMes + 1}/${policy.reagendamentosGratuitos})`,
        dispensadoPor: 'programa_fidelidade'
      };
    }

    // Aplicar taxa de emergência
    const taxaValor = agendamento.valor_final * policy.taxaEmergencia;

    return {
      aplicada: true,
      tipo: 'taxa',
      valor: taxaValor,
      motivo: `Taxa de reagendamento de emergência (${horasAntecedencia.toFixed(1)}h de antecedência)`,
    };
  }

  /**
   * Conta reagendamentos do mês atual
   */
  private async countMonthlyReschedules(clienteId: string, referenceDate: Date): Promise<number> {
    const inicioMes = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const fimMes = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);

    const { data, error } = await supabase
      .from('historico_reagendamentos')
      .select('id')
      .eq('cliente_id', clienteId)
      .gte('data_reagendamento', inicioMes.toISOString())
      .lte('data_reagendamento', fimMes.toISOString());

    if (error) {
      console.error('Erro ao contar reagendamentos mensais:', error);
      return 0;
    }

    return data?.length || 0;
  }

  /**
   * Combina data e horário em um DateTime
   */
  private combineDateTime(data: Date, horario: string): Date {
    const [hora, minuto] = horario.split(':').map(Number);
    const resultado = new Date(data);
    resultado.setHours(hora, minuto, 0, 0);
    return resultado;
  }

  /**
   * Envia notificações de reagendamento
   */
  private async sendRescheduleNotifications(
    cliente: any,
    agendamentoAtual: any,
    novoDateTime: Date,
    motivo?: string
  ): Promise<void> {
    try {
      // Enviar via NotificationEngine quando implementado
      console.log('Enviando notificações de reagendamento:', {
        cliente: cliente.nome,
        de: agendamentoAtual.data_agendamento,
        para: novoDateTime,
        motivo
      });

      // TODO: Implementar integração com NotificationEngine
    } catch (error) {
      console.error('Erro ao enviar notificações:', error);
    }
  }
}

// =====================================================
// INSTÂNCIA SINGLETON
// =====================================================

export const vipReschedulingService = VipReschedulingService.getInstance();