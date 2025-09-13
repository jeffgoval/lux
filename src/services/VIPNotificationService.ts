/**
 * VIPNotificationService - Serviço de Notificações Especializadas para VIP
 * Sistema de comunicação premium para clientes VIP e gerência
 */

import { supabase } from '@/integrations/supabase/client';
import { ClientePremium, ClienteCategoria, NivelVip } from '@/types/ClientePremium';

// =====================================================
// INTERFACES E TIPOS
// =====================================================

export interface VIPNotificationRequest {
  tipo: VIPNotificationType;
  destinatario: NotificationRecipient;
  dados: NotificationData;
  urgente?: boolean;
  agendarPara?: Date;
}

export type VIPNotificationType = 
  | 'agendamento_vip_confirmado'
  | 'realocacao_cliente_regular'
  | 'upgrade_automatico'
  | 'beneficio_aplicado'
  | 'gerencia_vip_booking'
  | 'conflito_resolvido'
  | 'lista_espera_vip'
  | 'cancelamento_vip';

export interface NotificationRecipient {
  tipo: 'cliente' | 'profissional' | 'gerencia' | 'sistema';
  id: string;
  nome?: string;
  preferenciasContato?: {
    canal: 'whatsapp' | 'sms' | 'email' | 'push';
    telefone?: string;
    email?: string;
  };
}

export interface NotificationData {
  agendamentoId?: string;
  clienteId?: string;
  clienteNome?: string;
  categoria?: ClienteCategoria;
  nivelVip?: NivelVip;
  dataAgendamento?: Date;
  servicoNome?: string;
  profissionalNome?: string;
  valorEstimado?: number;
  beneficiosAplicados?: string[];
  compensacao?: string;
  novoHorario?: Date;
  motivoAlteracao?: string;
  observacoes?: string;
  metadata?: Record<string, any>;
}

export interface NotificationTemplate {
  id: string;
  tipo: VIPNotificationType;
  canal: 'whatsapp' | 'sms' | 'email' | 'push';
  categoria: ClienteCategoria;
  titulo: string;
  corpo: string;
  variaveis: string[];
  ativo: boolean;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  canal: string;
  enviado: boolean;
  erro?: string;
  tentativas?: number;
}

// =====================================================
// TEMPLATES DE NOTIFICAÇÃO
// =====================================================

const VIP_NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  // Templates para WhatsApp
  'agendamento_vip_confirmado_whatsapp_vip': {
    id: 'agendamento_vip_confirmado_whatsapp_vip',
    tipo: 'agendamento_vip_confirmado',
    canal: 'whatsapp',
    categoria: ClienteCategoria.VIP,
    titulo: '✨ Agendamento VIP Confirmado',
    corpo: `Olá *{clienteNome}*! 👑

Seu agendamento VIP foi confirmado com sucesso:

📅 *Data:* {dataAgendamento}
⏰ *Horário:* {horarioAgendamento}
💆‍♀️ *Serviço:* {servicoNome}
👨‍⚕️ *Profissional:* {profissionalNome}

🎁 *Benefícios VIP aplicados:*
{beneficiosAplicados}

Chegue com 15 minutos de antecedência para desfrutar de nossa recepção premium.

Até breve! ✨`,
    variaveis: ['clienteNome', 'dataAgendamento', 'horarioAgendamento', 'servicoNome', 'profissionalNome', 'beneficiosAplicados'],
    ativo: true
  },

  'agendamento_vip_confirmado_whatsapp_premium': {
    id: 'agendamento_vip_confirmado_whatsapp_premium',
    tipo: 'agendamento_vip_confirmado',
    canal: 'whatsapp',
    categoria: ClienteCategoria.PREMIUM,
    titulo: '💎 Agendamento Premium Confirmado',
    corpo: `Prezado(a) *{clienteNome}*! 💎

Seu agendamento Premium foi confirmado:

📅 *Data:* {dataAgendamento}
⏰ *Horário:* {horarioAgendamento}
💆‍♀️ *Serviço:* {servicoNome}
👨‍⚕️ *Profissional:* {profissionalNome}
🏢 *Sala:* Sala Premium Exclusiva

🌟 *Experiência Premium inclui:*
{beneficiosAplicados}

Nosso concierge estará à sua disposição. Chegue com 20 minutos de antecedência para o check-in premium.

Aguardamos você! 💎`,
    variaveis: ['clienteNome', 'dataAgendamento', 'horarioAgendamento', 'servicoNome', 'profissionalNome', 'beneficiosAplicados'],
    ativo: true
  },

  'realocacao_cliente_regular_whatsapp': {
    id: 'realocacao_cliente_regular_whatsapp',
    tipo: 'realocacao_cliente_regular',
    canal: 'whatsapp',
    categoria: ClienteCategoria.REGULAR,
    titulo: '📅 Reagendamento Necessário',
    corpo: `Olá {clienteNome}!

Precisamos reagendar seu horário devido a uma situação especial:

❌ *Horário anterior:* {horarioAnterior}
✅ *Novo horário:* {novoHorario}
💆‍♀️ *Serviço:* {servicoNome}
👨‍⚕️ *Profissional:* {profissionalNome}

🎁 *Como compensação:*
{compensacao}

Pedimos desculpas pelo inconveniente. Confirme sua presença respondendo esta mensagem.

Obrigado pela compreensão! 🙏`,
    variaveis: ['clienteNome', 'horarioAnterior', 'novoHorario', 'servicoNome', 'profissionalNome', 'compensacao'],
    ativo: true
  },

  'gerencia_vip_booking_push': {
    id: 'gerencia_vip_booking_push',
    tipo: 'gerencia_vip_booking',
    canal: 'push',
    categoria: ClienteCategoria.VIP,
    titulo: '👑 Novo Agendamento VIP',
    corpo: `Cliente {categoria} {nivelVip}: {clienteNome}
Agendado para {dataAgendamento}
Valor estimado: R$ {valorEstimado}`,
    variaveis: ['categoria', 'nivelVip', 'clienteNome', 'dataAgendamento', 'valorEstimado'],
    ativo: true
  },

  'lista_espera_vip_whatsapp': {
    id: 'lista_espera_vip_whatsapp',
    tipo: 'lista_espera_vip',
    canal: 'whatsapp',
    categoria: ClienteCategoria.VIP,
    titulo: '🎯 Vaga Disponível - Prioridade VIP',
    corpo: `Boa notícia, *{clienteNome}*! 🎉

Uma vaga VIP ficou disponível:

📅 *Data:* {dataAgendamento}
⏰ *Horário:* {horarioAgendamento}
💆‍♀️ *Serviço:* {servicoNome}
👨‍⚕️ *Profissional:* {profissionalNome}

⚡ *Responda em até 2 horas* para garantir sua vaga VIP!

Digite *SIM* para confirmar ou *NÃO* para recusar.`,
    variaveis: ['clienteNome', 'dataAgendamento', 'horarioAgendamento', 'servicoNome', 'profissionalNome'],
    ativo: true
  }
};

// =====================================================
// CLASSE PRINCIPAL
// =====================================================

export class VIPNotificationService {
  private static instance: VIPNotificationService;

  public static getInstance(): VIPNotificationService {
    if (!VIPNotificationService.instance) {
      VIPNotificationService.instance = new VIPNotificationService();
    }
    return VIPNotificationService.instance;
  }

  /**
   * Envia notificação VIP personalizada
   */
  async sendVIPNotification(request: VIPNotificationRequest): Promise<NotificationResult> {
    try {
      // Buscar template apropriado
      const template = this.getTemplate(
        request.tipo,
        request.destinatario.preferenciasContato?.canal || 'whatsapp',
        request.dados.categoria || ClienteCategoria.VIP
      );

      if (!template) {
        return {
          success: false,
          canal: request.destinatario.preferenciasContato?.canal || 'whatsapp',
          enviado: false,
          erro: 'Template de notificação não encontrado'
        };
      }

      // Processar template com dados
      const mensagemProcessada = this.processTemplate(template, request.dados);

      // Criar registro de notificação
      const notificationRecord = await this.createNotificationRecord(
        request,
        template,
        mensagemProcessada
      );

      // Enviar notificação
      const envioResult = await this.sendNotification(
        request.destinatario,
        mensagemProcessada,
        template.canal,
        request.urgente || false
      );

      // Atualizar status do registro
      await this.updateNotificationStatus(
        notificationRecord.id,
        envioResult.enviado,
        envioResult.erro
      );

      return {
        success: envioResult.enviado,
        notificationId: notificationRecord.id,
        canal: template.canal,
        enviado: envioResult.enviado,
        erro: envioResult.erro
      };

    } catch (error) {
      console.error('Erro ao enviar notificação VIP:', error);
      return {
        success: false,
        canal: request.destinatario.preferenciasContato?.canal || 'whatsapp',
        enviado: false,
        erro: 'Erro interno no sistema de notificações'
      };
    }
  }

  /**
   * Envia notificação de agendamento VIP confirmado
   */
  async notifyVIPBookingConfirmed(
    cliente: ClientePremium,
    agendamentoId: string,
    detalhes: {
      dataAgendamento: Date;
      servicoNome: string;
      profissionalNome: string;
      beneficiosAplicados: string[];
    }
  ): Promise<NotificationResult> {
    return this.sendVIPNotification({
      tipo: 'agendamento_vip_confirmado',
      destinatario: {
        tipo: 'cliente',
        id: cliente.id,
        nome: cliente.nome,
        preferenciasContato: {
          canal: cliente.preferenciasContato.canalPreferido,
          telefone: cliente.telefone,
          email: cliente.email
        }
      },
      dados: {
        agendamentoId,
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        categoria: cliente.categoria,
        nivelVip: cliente.nivelVip,
        dataAgendamento: detalhes.dataAgendamento,
        servicoNome: detalhes.servicoNome,
        profissionalNome: detalhes.profissionalNome,
        beneficiosAplicados: detalhes.beneficiosAplicados
      },
      urgente: cliente.categoria === ClienteCategoria.PREMIUM
    });
  }

  /**
   * Envia notificação de realocação para cliente regular
   */
  async notifyRegularClientReallocation(
    clienteId: string,
    agendamentoOriginal: {
      dataOriginal: Date;
      novaData: Date;
      servicoNome: string;
      profissionalNome: string;
    },
    compensacao: string
  ): Promise<NotificationResult> {
    // Buscar dados do cliente
    const { data: cliente } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', clienteId)
      .single();

    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }

    return this.sendVIPNotification({
      tipo: 'realocacao_cliente_regular',
      destinatario: {
        tipo: 'cliente',
        id: clienteId,
        nome: cliente.nome,
        preferenciasContato: {
          canal: cliente.canal_preferido || 'whatsapp',
          telefone: cliente.telefone,
          email: cliente.email
        }
      },
      dados: {
        clienteNome: cliente.nome,
        novoHorario: agendamentoOriginal.novaData,
        servicoNome: agendamentoOriginal.servicoNome,
        profissionalNome: agendamentoOriginal.profissionalNome,
        compensacao,
        metadata: {
          horarioAnterior: agendamentoOriginal.dataOriginal
        }
      },
      urgente: true
    });
  }

  /**
   * Envia notificação para gerência sobre agendamento VIP
   */
  async notifyManagementVIPBooking(
    cliente: ClientePremium,
    agendamentoId: string,
    detalhes: {
      dataAgendamento: Date;
      servicoNome: string;
      profissionalNome: string;
      valorEstimado: number;
    }
  ): Promise<NotificationResult[]> {
    // Buscar gerentes para notificar
    const { data: gerentes } = await supabase
      .from('usuarios')
      .select('id, nome, email')
      .eq('role', 'gerente')
      .eq('ativo', true);

    if (!gerentes || gerentes.length === 0) {
      return [];
    }

    const results: NotificationResult[] = [];

    for (const gerente of gerentes) {
      const result = await this.sendVIPNotification({
        tipo: 'gerencia_vip_booking',
        destinatario: {
          tipo: 'gerencia',
          id: gerente.id,
          nome: gerente.nome,
          preferenciasContato: {
            canal: 'push',
            email: gerente.email
          }
        },
        dados: {
          agendamentoId,
          clienteId: cliente.id,
          clienteNome: cliente.nome,
          categoria: cliente.categoria,
          nivelVip: cliente.nivelVip,
          dataAgendamento: detalhes.dataAgendamento,
          servicoNome: detalhes.servicoNome,
          profissionalNome: detalhes.profissionalNome,
          valorEstimado: detalhes.valorEstimado
        },
        urgente: cliente.categoria === ClienteCategoria.PREMIUM
      });

      results.push(result);
    }

    return results;
  }

  /**
   * Envia notificação de vaga disponível na lista de espera VIP
   */
  async notifyVIPWaitlistSlot(
    clienteId: string,
    agendamentoDetalhes: {
      dataAgendamento: Date;
      servicoNome: string;
      profissionalNome: string;
    }
  ): Promise<NotificationResult> {
    // Buscar dados do cliente
    const { data: cliente } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', clienteId)
      .single();

    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }

    return this.sendVIPNotification({
      tipo: 'lista_espera_vip',
      destinatario: {
        tipo: 'cliente',
        id: clienteId,
        nome: cliente.nome,
        preferenciasContato: {
          canal: cliente.canal_preferido || 'whatsapp',
          telefone: cliente.telefone,
          email: cliente.email
        }
      },
      dados: {
        clienteNome: cliente.nome,
        categoria: cliente.categoria,
        dataAgendamento: agendamentoDetalhes.dataAgendamento,
        servicoNome: agendamentoDetalhes.servicoNome,
        profissionalNome: agendamentoDetalhes.profissionalNome
      },
      urgente: true
    });
  }

  // =====================================================
  // MÉTODOS PRIVADOS
  // =====================================================

  private getTemplate(
    tipo: VIPNotificationType,
    canal: string,
    categoria: ClienteCategoria
  ): NotificationTemplate | null {
    const templateKey = `${tipo}_${canal}_${categoria.toLowerCase()}`;
    let template = VIP_NOTIFICATION_TEMPLATES[templateKey];

    // Fallback para template genérico se não encontrar específico
    if (!template) {
      const fallbackKey = `${tipo}_${canal}`;
      template = Object.values(VIP_NOTIFICATION_TEMPLATES)
        .find(t => t.id.startsWith(fallbackKey)) || null;
    }

    return template;
  }

  private processTemplate(template: NotificationTemplate, dados: NotificationData): {
    titulo: string;
    corpo: string;
  } {
    let titulo = template.titulo;
    let corpo = template.corpo;

    // Processar variáveis no título
    titulo = this.replaceVariables(titulo, dados);

    // Processar variáveis no corpo
    corpo = this.replaceVariables(corpo, dados);

    return { titulo, corpo };
  }

  private replaceVariables(texto: string, dados: NotificationData): string {
    let resultado = texto;

    // Substituições básicas
    const substituicoes: Record<string, string> = {
      '{clienteNome}': dados.clienteNome || '',
      '{categoria}': dados.categoria || '',
      '{nivelVip}': dados.nivelVip || '',
      '{servicoNome}': dados.servicoNome || '',
      '{profissionalNome}': dados.profissionalNome || '',
      '{valorEstimado}': dados.valorEstimado?.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }) || '',
      '{compensacao}': dados.compensacao || '',
      '{motivoAlteracao}': dados.motivoAlteracao || ''
    };

    // Formatação de datas
    if (dados.dataAgendamento) {
      substituicoes['{dataAgendamento}'] = dados.dataAgendamento.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      substituicoes['{horarioAgendamento}'] = dados.dataAgendamento.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    if (dados.novoHorario) {
      substituicoes['{novoHorario}'] = dados.novoHorario.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    // Processar benefícios aplicados
    if (dados.beneficiosAplicados && dados.beneficiosAplicados.length > 0) {
      substituicoes['{beneficiosAplicados}'] = dados.beneficiosAplicados
        .map(beneficio => `• ${beneficio}`)
        .join('\n');
    }

    // Processar metadados
    if (dados.metadata) {
      Object.entries(dados.metadata).forEach(([key, value]) => {
        substituicoes[`{${key}}`] = String(value);
      });
    }

    // Aplicar substituições
    Object.entries(substituicoes).forEach(([variavel, valor]) => {
      resultado = resultado.replace(new RegExp(variavel.replace(/[{}]/g, '\\$&'), 'g'), valor);
    });

    return resultado;
  }

  private async createNotificationRecord(
    request: VIPNotificationRequest,
    template: NotificationTemplate,
    mensagem: { titulo: string; corpo: string }
  ): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('notificacoes')
      .insert({
        tipo: request.tipo,
        destinatario_tipo: request.destinatario.tipo,
        destinatario_id: request.destinatario.id,
        canal: template.canal,
        titulo: mensagem.titulo,
        mensagem: mensagem.corpo,
        urgente: request.urgente || false,
        agendado_para: request.agendarPara?.toISOString(),
        template_id: template.id,
        dados_originais: request.dados,
        status: 'pendente'
      })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  private async sendNotification(
    destinatario: NotificationRecipient,
    mensagem: { titulo: string; corpo: string },
    canal: string,
    urgente: boolean
  ): Promise<{ enviado: boolean; erro?: string }> {
    try {
      switch (canal) {
        case 'whatsapp':
          return await this.sendWhatsApp(destinatario, mensagem, urgente);
        case 'sms':
          return await this.sendSMS(destinatario, mensagem, urgente);
        case 'email':
          return await this.sendEmail(destinatario, mensagem, urgente);
        case 'push':
          return await this.sendPushNotification(destinatario, mensagem, urgente);
        default:
          return { enviado: false, erro: 'Canal de notificação não suportado' };
      }
    } catch (error) {
      return { 
        enviado: false, 
        erro: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  }

  private async sendWhatsApp(
    destinatario: NotificationRecipient,
    mensagem: { titulo: string; corpo: string },
    urgente: boolean
  ): Promise<{ enviado: boolean; erro?: string }> {
    // Implementar integração com WhatsApp Business API
    console.log('Enviando WhatsApp para:', destinatario.preferenciasContato?.telefone);
    console.log('Mensagem:', mensagem.corpo);
    
    // Simular envio bem-sucedido
    return { enviado: true };
  }

  private async sendSMS(
    destinatario: NotificationRecipient,
    mensagem: { titulo: string; corpo: string },
    urgente: boolean
  ): Promise<{ enviado: boolean; erro?: string }> {
    // Implementar integração com provedor de SMS
    console.log('Enviando SMS para:', destinatario.preferenciasContato?.telefone);
    console.log('Mensagem:', mensagem.corpo);
    
    return { enviado: true };
  }

  private async sendEmail(
    destinatario: NotificationRecipient,
    mensagem: { titulo: string; corpo: string },
    urgente: boolean
  ): Promise<{ enviado: boolean; erro?: string }> {
    // Implementar integração com provedor de email
    console.log('Enviando email para:', destinatario.preferenciasContato?.email);
    console.log('Assunto:', mensagem.titulo);
    console.log('Corpo:', mensagem.corpo);
    
    return { enviado: true };
  }

  private async sendPushNotification(
    destinatario: NotificationRecipient,
    mensagem: { titulo: string; corpo: string },
    urgente: boolean
  ): Promise<{ enviado: boolean; erro?: string }> {
    // Implementar push notification
    console.log('Enviando push notification para:', destinatario.id);
    console.log('Título:', mensagem.titulo);
    console.log('Corpo:', mensagem.corpo);
    
    return { enviado: true };
  }

  private async updateNotificationStatus(
    notificationId: string,
    enviado: boolean,
    erro?: string
  ): Promise<void> {
    await supabase
      .from('notificacoes')
      .update({
        status: enviado ? 'enviado' : 'erro',
        enviado_em: enviado ? new Date().toISOString() : null,
        erro_detalhes: erro,
        tentativas: 1
      })
      .eq('id', notificationId);
  }
}

export default VIPNotificationService;