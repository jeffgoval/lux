/**
 * VIPSchedulingService - Serviço de Agendamento Especializado para Clientes VIP
 * Sistema especializado para gestão automática de priorização e agendamentos premium
 */

import { isBefore, isAfter, addDays, format, addMinutes, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { ClientePremium, ClienteCategoria, NivelVip } from '@/types/ClientePremium';
import { VIPNotificationService } from './VIPNotificationService';

// =====================================================
// INTERFACES E TIPOS
// =====================================================

export interface VIPSchedulingRequest {
  clienteId: string;
  servicoId: string;
  profissionalId?: string;
  dataPreferida: Date;
  horarioPreferido?: string;
  flexibilidadeDias?: number;
  observacoes?: string;
  urgente?: boolean;
}

export interface VIPSchedulingResult {
  success: boolean;
  agendamentoId?: string;
  horarioConfirmado?: Date;
  profissionalConfirmado?: string;
  salaConfirmada?: string;
  conflitosResolvidos?: ConflictResolution[];
  alternativasDisponiveis?: AlternativeSlot[];
  notificacoesEnviadas?: NotificationSent[];
  message: string;
}

export interface ConflictResolution {
  tipo: 'reagendamento_cliente_regular' | 'realocacao_profissional' | 'upgrade_sala';
  clienteAfetadoId?: string;
  agendamentoOriginalId?: string;
  novoHorario?: Date;
  justificativa: string;
  compensacao?: string;
}

export interface AlternativeSlot {
  data: Date;
  horario: string;
  profissionalId: string;
  profissionalNome: string;
  salaId?: string;
  salaNome?: string;
  disponibilidade: 'livre' | 'preferencial_vip' | 'exclusivo_premium';
  score: number; // Pontuação baseada nas preferências do cliente
}

export interface NotificationSent {
  tipo: 'cliente_vip' | 'cliente_afetado' | 'profissional' | 'gerencia';
  destinatarioId: string;
  canal: 'whatsapp' | 'email' | 'sms' | 'push';
  template: string;
  enviado: boolean;
  erro?: string;
}

export interface VIPPriorityConfig {
  categoria: ClienteCategoria;
  nivelVip: NivelVip;
  prioridadeScore: number;
  podeDesalocarRegular: boolean;
  tempoAntecedenciaMinima: number; // em horas
  notificarGerencia: boolean;
  beneficiosEspeciais: string[];
}

// =====================================================
// CONFIGURAÇÕES DE PRIORIDADE
// =====================================================

const VIP_PRIORITY_MATRIX: Record<string, VIPPriorityConfig> = {
  'premium_diamante': {
    categoria: ClienteCategoria.PREMIUM,
    nivelVip: NivelVip.DIAMANTE,
    prioridadeScore: 100,
    podeDesalocarRegular: true,
    tempoAntecedenciaMinima: 0,
    notificarGerencia: true,
    beneficiosEspeciais: ['reagendamento_gratuito', 'sala_premium', 'profissional_senior']
  },
  'premium_platina': {
    categoria: ClienteCategoria.PREMIUM,
    nivelVip: NivelVip.PLATINA,
    prioridadeScore: 90,
    podeDesalocarRegular: true,
    tempoAntecedenciaMinima: 2,
    notificarGerencia: true,
    beneficiosEspeciais: ['reagendamento_gratuito', 'sala_premium']
  },
  'vip_diamante': {
    categoria: ClienteCategoria.VIP,
    nivelVip: NivelVip.DIAMANTE,
    prioridadeScore: 85,
    podeDesalocarRegular: true,
    tempoAntecedenciaMinima: 4,
    notificarGerencia: true,
    beneficiosEspeciais: ['reagendamento_gratuito']
  },
  'vip_platina': {
    categoria: ClienteCategoria.VIP,
    nivelVip: NivelVip.PLATINA,
    prioridadeScore: 80,
    podeDesalocarRegular: true,
    tempoAntecedenciaMinima: 6,
    notificarGerencia: false,
    beneficiosEspeciais: ['reagendamento_gratuito']
  },
  'vip_ouro': {
    categoria: ClienteCategoria.VIP,
    nivelVip: NivelVip.OURO,
    prioridadeScore: 70,
    podeDesalocarRegular: false,
    tempoAntecedenciaMinima: 12,
    notificarGerencia: false,
    beneficiosEspeciais: []
  }
};

// =====================================================
// CLASSE PRINCIPAL
// =====================================================

export class VIPSchedulingService {
  private static instance: VIPSchedulingService;
  private notificationService: VIPNotificationService;

  private constructor() {
    this.notificationService = VIPNotificationService.getInstance();
  }

  public static getInstance(): VIPSchedulingService {
    if (!VIPSchedulingService.instance) {
      VIPSchedulingService.instance = new VIPSchedulingService();
    }
    return VIPSchedulingService.instance;
  }

  /**
   * Agenda um cliente VIP com priorização automática
   */
  async scheduleVIPClient(request: VIPSchedulingRequest): Promise<VIPSchedulingResult> {
    try {
      // 1. Buscar dados do cliente
      const cliente = await this.getClientePremium(request.clienteId);
      if (!cliente) {
        return {
          success: false,
          message: 'Cliente não encontrado'
        };
      }

      // 2. Verificar se é cliente VIP/Premium
      if (!this.isVIPClient(cliente)) {
        return {
          success: false,
          message: 'Cliente não possui status VIP/Premium'
        };
      }

      // 3. Obter configuração de prioridade
      const priorityConfig = this.getPriorityConfig(cliente);

      // 4. Verificar disponibilidade inicial
      const disponibilidadeInicial = await this.checkInitialAvailability(request);
      
      if (disponibilidadeInicial.disponivel) {
        // Horário disponível - agendar diretamente
        return await this.createVIPAppointment(request, cliente, priorityConfig);
      }

      // 5. Buscar alternativas ou resolver conflitos
      if (priorityConfig.podeDesalocarRegular) {
        const conflictResolution = await this.resolveConflictsForVIP(request, cliente, priorityConfig);
        if (conflictResolution.success) {
          return conflictResolution;
        }
      }

      // 6. Sugerir horários alternativos
      const alternatives = await this.findAlternativeSlots(request, cliente, priorityConfig);
      
      return {
        success: false,
        alternativasDisponiveis: alternatives,
        message: 'Horário não disponível. Alternativas sugeridas com base nas preferências do cliente.'
      };

    } catch (error) {

      return {
        success: false,
        message: 'Erro interno no sistema de agendamento VIP'
      };
    }
  }

  /**
   * Busca horários exclusivos para clientes VIP
   */
  async findExclusiveVIPSlots(
    clienteId: string,
    servicoId: string,
    dataInicio: Date,
    dataFim: Date
  ): Promise<AlternativeSlot[]> {
    const cliente = await this.getClientePremium(clienteId);
    if (!cliente || !this.isVIPClient(cliente)) {
      return [];
    }

    const priorityConfig = this.getPriorityConfig(cliente);
    const slots: AlternativeSlot[] = [];

    // Buscar horários preferenciais para VIP
    const { data: horariosVIP } = await supabase
      .from('horarios_exclusivos_vip')
      .select(`
        *,
        profissional:profissionais(id, nome),
        sala:salas_clinica(id, nome)
      `)
      .gte('data_hora', dataInicio.toISOString())
      .lte('data_hora', dataFim.toISOString())
      .eq('categoria_minima', cliente.categoria)
      .order('data_hora');

    if (horariosVIP) {
      for (const horario of horariosVIP) {
        slots.push({
          data: new Date(horario.data_hora),
          horario: format(new Date(horario.data_hora), 'HH:mm'),
          profissionalId: horario.profissional.id,
          profissionalNome: horario.profissional.nome,
          salaId: horario.sala?.id,
          salaNome: horario.sala?.nome,
          disponibilidade: 'exclusivo_premium',
          score: this.calculateSlotScore(horario, cliente)
        });
      }
    }

    return slots.sort((a, b) => b.score - a.score);
  }

  /**
   * Realoca agendamento de cliente regular para acomodar VIP
   */
  async reallocateRegularClient(
    agendamentoId: string,
    vipClienteId: string,
    novoHorario: Date
  ): Promise<ConflictResolution | null> {
    try {
      // Buscar agendamento original
      const { data: agendamento } = await supabase
        .from('agendamentos')
        .select(`
          *,
          cliente:clientes(id, nome, categoria, nivel_vip),
          profissional:profissionais(id, nome),
          servico:servicos(id, nome, duracao_minutos)
        `)
        .eq('id', agendamentoId)
        .single();

      if (!agendamento) return null;

      // Verificar se cliente pode ser realocado
      if (agendamento.cliente.categoria === ClienteCategoria.VIP || 
          agendamento.cliente.categoria === ClienteCategoria.PREMIUM) {
        return null; // Não realocar outros VIPs
      }

      // Buscar horário alternativo para o cliente regular
      const alternativeSlot = await this.findNextAvailableSlot(
        agendamento.servico_id,
        agendamento.profissional_id,
        new Date(agendamento.data_agendamento)
      );

      if (!alternativeSlot) return null;

      // Executar realocação em transação
      const { error } = await supabase.rpc('realocar_agendamento_para_vip', {
        agendamento_original_id: agendamentoId,
        novo_horario: alternativeSlot.toISOString(),
        vip_cliente_id: vipClienteId,
        motivo: 'Priorização de cliente VIP'
      });

      if (error) throw error;

      // Enviar notificações usando o serviço especializado
      await this.notificationService.notifyRegularClientReallocation(
        agendamento.cliente_id,
        {
          dataOriginal: new Date(agendamento.data_agendamento),
          novaData: alternativeSlot,
          servicoNome: agendamento.servico.nome,
          profissionalNome: agendamento.profissional.nome
        },
        'Desconto de 15% no próximo agendamento'
      );

      return {
        tipo: 'reagendamento_cliente_regular',
        clienteAfetadoId: agendamento.cliente_id,
        agendamentoOriginalId: agendamentoId,
        novoHorario: alternativeSlot,
        justificativa: 'Reagendamento para acomodar cliente VIP',
        compensacao: 'Desconto de 15% no próximo agendamento'
      };

    } catch (error) {

      return null;
    }
  }

  /**
   * Aplica benefícios especiais para clientes VIP
   */
  async applyVIPBenefits(
    clienteId: string,
    agendamentoId: string
  ): Promise<string[]> {
    const cliente = await this.getClientePremium(clienteId);
    if (!cliente) return [];

    const priorityConfig = this.getPriorityConfig(cliente);
    const beneficiosAplicados: string[] = [];

    for (const beneficio of priorityConfig.beneficiosEspeciais) {
      switch (beneficio) {
        case 'sala_premium':
          await this.upgradeToPremiumRoom(agendamentoId);
          beneficiosAplicados.push('Upgrade automático para sala premium');
          break;

        case 'profissional_senior':
          await this.assignSeniorProfessional(agendamentoId);
          beneficiosAplicados.push('Profissional sênior designado automaticamente');
          break;

        case 'reagendamento_gratuito':
          await this.enableFreeRescheduling(agendamentoId);
          beneficiosAplicados.push('Reagendamento gratuito habilitado');
          break;
      }
    }

    return beneficiosAplicados;
  }

  // =====================================================
  // MÉTODOS PRIVADOS
  // =====================================================

  private async getClientePremium(clienteId: string): Promise<ClientePremium | null> {
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', clienteId)
      .single();

    return data as ClientePremium;
  }

  private isVIPClient(cliente: ClientePremium): boolean {
    return cliente.categoria === ClienteCategoria.VIP || 
           cliente.categoria === ClienteCategoria.PREMIUM;
  }

  private getPriorityConfig(cliente: ClientePremium): VIPPriorityConfig {
    const key = `${cliente.categoria.toLowerCase()}_${cliente.nivelVip.toLowerCase()}`;
    return VIP_PRIORITY_MATRIX[key] || VIP_PRIORITY_MATRIX['vip_ouro'];
  }

  private async checkInitialAvailability(request: VIPSchedulingRequest): Promise<{disponivel: boolean}> {
    const { data } = await supabase
      .from('agendamentos')
      .select('id')
      .eq('profissional_id', request.profissionalId)
      .eq('data_agendamento', request.dataPreferida.toISOString())
      .eq('status', 'confirmado');

    return { disponivel: !data || data.length === 0 };
  }

  private async createVIPAppointment(
    request: VIPSchedulingRequest,
    cliente: ClientePremium,
    priorityConfig: VIPPriorityConfig
  ): Promise<VIPSchedulingResult> {
    const { data, error } = await supabase
      .from('agendamentos')
      .insert({
        cliente_id: request.clienteId,
        servico_id: request.servicoId,
        profissional_id: request.profissionalId,
        data_agendamento: request.dataPreferida.toISOString(),
        status: 'confirmado',
        categoria_cliente: cliente.categoria,
        nivel_vip: cliente.nivelVip,
        prioridade: priorityConfig.prioridadeScore,
        observacoes: request.observacoes
      })
      .select()
      .single();

    if (error) throw error;

    // Aplicar benefícios VIP
    const beneficios = await this.applyVIPBenefits(request.clienteId, data.id);

    // Buscar dados do serviço e profissional para notificações
    const { data: servicoData } = await supabase
      .from('servicos')
      .select('nome, valor')
      .eq('id', request.servicoId)
      .single();

    const { data: profissionalData } = await supabase
      .from('profissionais')
      .select('nome')
      .eq('user_id', request.profissionalId)
      .single();

    // Enviar notificação VIP para cliente
    await this.notificationService.notifyVIPBookingConfirmed(cliente, data.id, {
      dataAgendamento: request.dataPreferida,
      servicoNome: servicoData?.nome || 'Serviço solicitado',
      profissionalNome: profissionalData?.nome || 'Profissional designado',
      beneficiosAplicados: beneficios
    });

    // Notificar gerência se necessário
    if (priorityConfig.notificarGerencia) {
      await this.notificationService.notifyManagementVIPBooking(cliente, data.id, {
        dataAgendamento: request.dataPreferida,
        servicoNome: servicoData?.nome || 'Serviço solicitado',
        profissionalNome: profissionalData?.nome || 'Profissional designado',
        valorEstimado: servicoData?.valor || 0
      });
    }

    return {
      success: true,
      agendamentoId: data.id,
      horarioConfirmado: request.dataPreferida,
      profissionalConfirmado: request.profissionalId,
      message: `Agendamento VIP confirmado. Benefícios aplicados: ${beneficios.join(', ')}`
    };
  }

  private async resolveConflictsForVIP(
    request: VIPSchedulingRequest,
    cliente: ClientePremium,
    priorityConfig: VIPPriorityConfig
  ): Promise<VIPSchedulingResult> {
    // Buscar agendamentos conflitantes de clientes regulares
    const { data: conflictingAppointments } = await supabase
      .from('agendamentos')
      .select(`
        *,
        cliente:clientes(categoria, nivel_vip)
      `)
      .eq('profissional_id', request.profissionalId)
      .eq('data_agendamento', request.dataPreferida.toISOString())
      .eq('status', 'confirmado');

    if (!conflictingAppointments || conflictingAppointments.length === 0) {
      return { success: false, message: 'Nenhum conflito encontrado para resolver' };
    }

    // Tentar realocar cliente regular
    for (const appointment of conflictingAppointments) {
      if (appointment.cliente.categoria === ClienteCategoria.REGULAR) {
        const resolution = await this.reallocateRegularClient(
          appointment.id,
          request.clienteId,
          request.dataPreferida
        );

        if (resolution) {
          // Criar novo agendamento VIP
          const vipResult = await this.createVIPAppointment(request, cliente, priorityConfig);
          
          return {
            ...vipResult,
            conflitosResolvidos: [resolution]
          };
        }
      }
    }

    return { success: false, message: 'Não foi possível resolver conflitos automaticamente' };
  }

  private async findAlternativeSlots(
    request: VIPSchedulingRequest,
    cliente: ClientePremium,
    priorityConfig: VIPPriorityConfig
  ): Promise<AlternativeSlot[]> {
    const alternatives: AlternativeSlot[] = [];
    const flexibilidade = request.flexibilidadeDias || 7;

    for (let i = 1; i <= flexibilidade; i++) {
      const dataAlternativa = addDays(request.dataPreferida, i);
      
      // Buscar slots disponíveis nesta data
      const slotsDisponiveis = await this.getAvailableSlotsForDate(
        dataAlternativa,
        request.servicoId,
        request.profissionalId
      );

      alternatives.push(...slotsDisponiveis.map(slot => ({
        ...slot,
        score: this.calculateSlotScore(slot, cliente)
      })));
    }

    return alternatives
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Retornar top 10 alternativas
  }

  private calculateSlotScore(slot: any, cliente: ClientePremium): number {
    let score = 50; // Score base

    // Preferências de horário
    if (cliente.preferencias?.horariosPreferidos) {
      const slotHour = new Date(slot.data_hora || slot.data).getHours();
      const preferredHours = cliente.preferencias.horariosPreferidos.map(h => 
        parseInt(h.horaInicio.split(':')[0])
      );
      
      if (preferredHours.includes(slotHour)) {
        score += 30;
      }
    }

    // Profissional preferido
    if (cliente.preferencias?.profissionaisPreferidos?.includes(slot.profissionalId)) {
      score += 25;
    }

    // Sala preferida
    if (cliente.preferencias?.salasPreferidas?.includes(slot.salaId)) {
      score += 15;
    }

    // Proximidade da data original
    const diasDiferenca = Math.abs(
      (new Date(slot.data).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    score -= diasDiferenca * 2; // Penalizar datas mais distantes

    return Math.max(0, score);
  }

  private async getAvailableSlotsForDate(
    data: Date,
    servicoId: string,
    profissionalId?: string
  ): Promise<any[]> {
    const { data: slots } = await supabase
      .rpc('get_available_slots', {
        target_date: data.toISOString().split('T')[0],
        servico_id: servicoId,
        profissional_id: profissionalId
      });

    return slots || [];
  }

  private async findNextAvailableSlot(
    servicoId: string,
    profissionalId: string,
    afterDate: Date
  ): Promise<Date | null> {
    for (let i = 1; i <= 30; i++) { // Buscar nos próximos 30 dias
      const targetDate = addDays(afterDate, i);
      const slots = await this.getAvailableSlotsForDate(targetDate, servicoId, profissionalId);
      
      if (slots.length > 0) {
        return new Date(slots[0].data_hora);
      }
    }

    return null;
  }

  private async upgradeToPremiumRoom(agendamentoId: string): Promise<void> {
    await supabase
      .from('agendamentos')
      .update({ 
        sala_premium: true,
        observacoes_internas: 'Upgrade automático para sala premium (cliente VIP)'
      })
      .eq('id', agendamentoId);
  }

  private async assignSeniorProfessional(agendamentoId: string): Promise<void> {
    // Buscar profissional sênior disponível
    const { data: seniorProfessional } = await supabase
      .from('profissionais')
      .select('id')
      .eq('nivel', 'senior')
      .eq('ativo', true)
      .limit(1)
      .single();

    if (seniorProfessional) {
      await supabase
        .from('agendamentos')
        .update({ 
          profissional_id: seniorProfessional.id,
          observacoes_internas: 'Profissional sênior designado automaticamente (cliente VIP)'
        })
        .eq('id', agendamentoId);
    }
  }

  private async enableFreeRescheduling(agendamentoId: string): Promise<void> {
    await supabase
      .from('agendamentos')
      .update({ 
        reagendamento_gratuito: true,
        observacoes_internas: 'Reagendamento gratuito habilitado (benefício VIP)'
      })
      .eq('id', agendamentoId);
  }
}

export default VIPSchedulingService;
