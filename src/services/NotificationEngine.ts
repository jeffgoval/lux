/**
 * NotificationEngine - Sistema Multi-Canal de Notificações
 * Suporte a WhatsApp (Meta API), SMS (Twilio), Email (SendGrid) e Push
 */

import { supabase } from '@/integrations/supabase/client';
import { format, addHours, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// =====================================================
// INTERFACES E TIPOS
// =====================================================

export interface NotificationRequest {
  recipientId: string;
  templateId: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  scheduledFor?: Date;
  context: NotificationContext;
  metadata?: Record<string, any>;
  retryPolicy?: RetryPolicy;
}

export interface NotificationContext {
  clienteNome: string;
  clienteCategoria?: 'regular' | 'vip' | 'premium' | 'diamond';
  agendamentoId?: string;
  dataAgendamento?: Date;
  profissional?: string;
  servico?: string;
  valor?: number;
  observacoes?: string;
  customData?: Record<string, any>;
}

export interface NotificationChannel {
  type: 'whatsapp' | 'sms' | 'email' | 'push';
  recipient: string; // telefone, email, ou device token
  templateOverride?: string;
  enabled: boolean;
  priority: number; // ordem de tentativa
}

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelay: number; // segundos
}

export interface NotificationTemplate {
  id: string;
  name: string;
  category: 'appointment' | 'reminder' | 'confirmation' | 'marketing' | 'alert';
  channels: {
    whatsapp?: WhatsAppTemplate;
    sms?: SMSTemplate;
    email?: EmailTemplate;
    push?: PushTemplate;
  };
  variables: string[];
  clientCategories?: string[];
  active: boolean;
}

export interface WhatsAppTemplate {
  templateName: string;
  language: string;
  components: WhatsAppComponent[];
}

export interface WhatsAppComponent {
  type: 'header' | 'body' | 'footer' | 'buttons';
  parameters?: WhatsAppParameter[];
  buttons?: WhatsAppButton[];
}

export interface WhatsAppParameter {
  type: 'text' | 'currency' | 'date_time';
  value: string;
}

export interface WhatsAppButton {
  type: 'quick_reply' | 'url';
  text: string;
  payload?: string;
  url?: string;
}

export interface SMSTemplate {
  content: string;
  maxLength: number;
}

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: string; // base64
  contentType: string;
}

export interface PushTemplate {
  title: string;
  body: string;
  icon?: string;
  badge?: number;
  data?: Record<string, any>;
}

export interface NotificationResult {
  id: string;
  success: boolean;
  channel: string;
  recipient: string;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  errorMessage?: string;
  externalId?: string;
  cost?: number;
}

export interface DeliveryReport {
  notificationId: string;
  channel: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  errorCode?: string;
  errorMessage?: string;
}

// =====================================================
// TEMPLATES PREDEFINIDOS
// =====================================================

const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  appointment_confirmation: {
    id: 'appointment_confirmation',
    name: 'Confirmação de Agendamento',
    category: 'confirmation',
    channels: {
      whatsapp: {
        templateName: 'agendamento_confirmado',
        language: 'pt_BR',
        components: [
          {
            type: 'header',
            parameters: [{ type: 'text', value: '{{clienteNome}}' }]
          },
          {
            type: 'body',
            parameters: [
              { type: 'text', value: '{{servico}}' },
              { type: 'date_time', value: '{{dataAgendamento}}' },
              { type: 'text', value: '{{profissional}}' },
              { type: 'currency', value: '{{valor}}' }
            ]
          },
          {
            type: 'buttons',
            buttons: [
              { type: 'quick_reply', text: 'Confirmar', payload: 'CONFIRM' },
              { type: 'quick_reply', text: 'Reagendar', payload: 'RESCHEDULE' }
            ]
          }
        ]
      },
      sms: {
        content: 'Olá {{clienteNome}}! Seu agendamento para {{servico}} foi confirmado para {{dataHoraFormatada}} com {{profissional}}. Valor: R$ {{valor}}. Para confirmar responda SIM.',
        maxLength: 160
      },
      email: {
        subject: 'Agendamento Confirmado - {{servico}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6B46C1;">Agendamento Confirmado</h2>
            <p>Olá <strong>{{clienteNome}}</strong>,</p>
            <p>Seu agendamento foi confirmado com sucesso!</p>
            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Detalhes do Agendamento:</h3>
              <p><strong>Serviço:</strong> {{servico}}</p>
              <p><strong>Data e Hora:</strong> {{dataHoraFormatada}}</p>
              <p><strong>Profissional:</strong> {{profissional}}</p>
              <p><strong>Valor:</strong> R$ {{valor}}</p>
            </div>
            <p>Aguardamos você!</p>
          </div>
        `,
        textContent: 'Olá {{clienteNome}}! Seu agendamento para {{servico}} foi confirmado para {{dataHoraFormatada}} com {{profissional}}. Valor: R$ {{valor}}.'
      },
      push: {
        title: 'Agendamento Confirmado',
        body: '{{servico}} em {{dataHoraFormatada}} com {{profissional}}',
        data: { type: 'appointment', action: 'confirmed' }
      }
    },
    variables: ['clienteNome', 'servico', 'dataAgendamento', 'dataHoraFormatada', 'profissional', 'valor'],
    active: true
  },

  appointment_reminder_24h: {
    id: 'appointment_reminder_24h',
    name: 'Lembrete 24h',
    category: 'reminder',
    channels: {
      whatsapp: {
        templateName: 'lembrete_24h',
        language: 'pt_BR',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', value: '{{clienteNome}}' },
              { type: 'text', value: '{{servico}}' },
              { type: 'date_time', value: '{{dataAgendamento}}' }
            ]
          },
          {
            type: 'buttons',
            buttons: [
              { type: 'quick_reply', text: 'Confirmar Presença', payload: 'CONFIRM_ATTENDANCE' },
              { type: 'quick_reply', text: 'Reagendar', payload: 'RESCHEDULE' }
            ]
          }
        ]
      },
      sms: {
        content: 'Lembrete: {{clienteNome}}, você tem {{servico}} amanhã às {{horaFormatada}}. Para confirmar responda SIM.',
        maxLength: 160
      }
    },
    variables: ['clienteNome', 'servico', 'dataAgendamento', 'horaFormatada'],
    active: true
  },

  vip_special_treatment: {
    id: 'vip_special_treatment',
    name: 'Tratamento VIP Especial',
    category: 'appointment',
    channels: {
      whatsapp: {
        templateName: 'vip_especial',
        language: 'pt_BR',
        components: [
          {
            type: 'header',
            parameters: [{ type: 'text', value: '👑 VIP' }]
          },
          {
            type: 'body',
            parameters: [
              { type: 'text', value: '{{clienteNome}}' },
              { type: 'text', value: '{{servico}}' },
              { type: 'date_time', value: '{{dataAgendamento}}' }
            ]
          }
        ]
      }
    },
    variables: ['clienteNome', 'servico', 'dataAgendamento'],
    clientCategories: ['vip', 'premium', 'diamond'],
    active: true
  }
};

// =====================================================
// CLASSE PRINCIPAL
// =====================================================

export class NotificationEngine {
  private static instance: NotificationEngine;
  private readonly apiConfig = {
    whatsapp: {
      baseUrl: 'https://graph.facebook.com/v18.0',
      accessToken: process.env.META_WHATSAPP_TOKEN,
      phoneNumberId: process.env.META_PHONE_NUMBER_ID
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_FROM_NUMBER
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      fromEmail: process.env.SENDGRID_FROM_EMAIL,
      fromName: process.env.SENDGRID_FROM_NAME || 'Luxe Flow'
    }
  };

  public static getInstance(): NotificationEngine {
    if (!NotificationEngine.instance) {
      NotificationEngine.instance = new NotificationEngine();
    }
    return NotificationEngine.instance;
  }

  /**
   * Enviar notificação multi-canal
   */
  async sendNotification(request: NotificationRequest): Promise<NotificationResult[]> {
    try {
      // Registrar notificação no banco
      const { data: notification } = await supabase
        .from('notifications')
        .insert({
          recipient_id: request.recipientId,
          template_id: request.templateId,
          priority: request.priority,
          scheduled_for: request.scheduledFor?.toISOString(),
          context: request.context,
          metadata: request.metadata,
          status: request.scheduledFor ? 'scheduled' : 'processing'
        })
        .select()
        .single();

      if (request.scheduledFor && request.scheduledFor > new Date()) {
        // Agendar para depois
        return [{
          id: notification.id,
          success: true,
          channel: 'scheduled',
          recipient: request.recipientId,
          sentAt: new Date()
        }];
      }

      // Enviar imediatamente
      return await this.processNotification(notification.id, request);

    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      return [{
        id: 'error',
        success: false,
        channel: 'system',
        recipient: request.recipientId,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
      }];
    }
  }

  /**
   * Processar envio da notificação
   */
  private async processNotification(
    notificationId: string, 
    request: NotificationRequest
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    const template = NOTIFICATION_TEMPLATES[request.templateId];

    if (!template) {
      throw new Error(`Template não encontrado: ${request.templateId}`);
    }

    // Aplicar filtros de categoria cliente
    if (template.clientCategories && 
        request.context.clienteCategoria && 
        !template.clientCategories.includes(request.context.clienteCategoria)) {
      return [{
        id: notificationId,
        success: false,
        channel: 'filter',
        recipient: request.recipientId,
        errorMessage: 'Cliente não elegível para este template'
      }];
    }

    // Processar cada canal
    for (const channel of request.channels.filter(c => c.enabled)) {
      try {
        let result: NotificationResult;

        switch (channel.type) {
          case 'whatsapp':
            result = await this.sendWhatsApp(notificationId, channel, template, request.context);
            break;
          case 'sms':
            result = await this.sendSMS(notificationId, channel, template, request.context);
            break;
          case 'email':
            result = await this.sendEmail(notificationId, channel, template, request.context);
            break;
          case 'push':
            result = await this.sendPush(notificationId, channel, template, request.context);
            break;
          default:
            result = {
              id: notificationId,
              success: false,
              channel: channel.type,
              recipient: channel.recipient,
              errorMessage: 'Canal não suportado'
            };
        }

        results.push(result);

        // Registrar resultado no banco
        await this.logDeliveryResult(result);

      } catch (error) {
        const errorResult: NotificationResult = {
          id: notificationId,
          success: false,
          channel: channel.type,
          recipient: channel.recipient,
          errorMessage: error instanceof Error ? error.message : 'Erro no envio'
        };
        results.push(errorResult);
        await this.logDeliveryResult(errorResult);
      }
    }

    return results;
  }

  /**
   * Enviar via WhatsApp Business API
   */
  private async sendWhatsApp(
    notificationId: string,
    channel: NotificationChannel,
    template: NotificationTemplate,
    context: NotificationContext
  ): Promise<NotificationResult> {
    
    if (!template.channels.whatsapp) {
      throw new Error('Template WhatsApp não configurado');
    }

    const whatsappTemplate = template.channels.whatsapp;
    const variables = this.processVariables(template.variables, context);

    // Processar componentes com variáveis
    const components = whatsappTemplate.components.map(component => ({
      ...component,
      parameters: component.parameters?.map(param => ({
        ...param,
        value: this.replaceVariables(param.value, variables)
      }))
    }));

    const payload = {
      messaging_product: 'whatsapp',
      to: channel.recipient,
      type: 'template',
      template: {
        name: whatsappTemplate.templateName,
        language: { code: whatsappTemplate.language },
        components
      }
    };

    const response = await fetch(
      `${this.apiConfig.whatsapp.baseUrl}/${this.apiConfig.whatsapp.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiConfig.whatsapp.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`WhatsApp API Error: ${result.error?.message || 'Erro desconhecido'}`);
    }

    return {
      id: notificationId,
      success: true,
      channel: 'whatsapp',
      recipient: channel.recipient,
      sentAt: new Date(),
      externalId: result.messages?.[0]?.id
    };
  }

  /**
   * Enviar via SMS (Twilio)
   */
  private async sendSMS(
    notificationId: string,
    channel: NotificationChannel,
    template: NotificationTemplate,
    context: NotificationContext
  ): Promise<NotificationResult> {
    
    if (!template.channels.sms) {
      throw new Error('Template SMS não configurado');
    }

    const smsTemplate = template.channels.sms;
    const variables = this.processVariables(template.variables, context);
    const message = this.replaceVariables(smsTemplate.content, variables);

    const payload = new URLSearchParams({
      To: channel.recipient,
      From: this.apiConfig.twilio.fromNumber!,
      Body: message
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.apiConfig.twilio.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(
            `${this.apiConfig.twilio.accountSid}:${this.apiConfig.twilio.authToken}`
          ).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: payload
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Twilio Error: ${result.message || 'Erro desconhecido'}`);
    }

    return {
      id: notificationId,
      success: true,
      channel: 'sms',
      recipient: channel.recipient,
      sentAt: new Date(),
      externalId: result.sid,
      cost: parseFloat(result.price) || 0
    };
  }

  /**
   * Enviar via Email (SendGrid)
   */
  private async sendEmail(
    notificationId: string,
    channel: NotificationChannel,
    template: NotificationTemplate,
    context: NotificationContext
  ): Promise<NotificationResult> {
    
    if (!template.channels.email) {
      throw new Error('Template Email não configurado');
    }

    const emailTemplate = template.channels.email;
    const variables = this.processVariables(template.variables, context);

    const payload = {
      personalizations: [{
        to: [{ email: channel.recipient, name: context.clienteNome }],
        subject: this.replaceVariables(emailTemplate.subject, variables)
      }],
      from: {
        email: this.apiConfig.sendgrid.fromEmail!,
        name: this.apiConfig.sendgrid.fromName!
      },
      content: [
        {
          type: 'text/plain',
          value: this.replaceVariables(emailTemplate.textContent, variables)
        },
        {
          type: 'text/html',
          value: this.replaceVariables(emailTemplate.htmlContent, variables)
        }
      ]
    };

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiConfig.sendgrid.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`SendGrid Error: ${error.errors?.[0]?.message || 'Erro desconhecido'}`);
    }

    return {
      id: notificationId,
      success: true,
      channel: 'email',
      recipient: channel.recipient,
      sentAt: new Date(),
      externalId: response.headers.get('x-message-id') || undefined
    };
  }

  /**
   * Enviar Push Notification
   */
  private async sendPush(
    notificationId: string,
    channel: NotificationChannel,
    template: NotificationTemplate,
    context: NotificationContext
  ): Promise<NotificationResult> {
    
    // TODO: Implementar com Firebase ou similar
    return {
      id: notificationId,
      success: false,
      channel: 'push',
      recipient: channel.recipient,
      errorMessage: 'Push notifications não implementadas ainda'
    };
  }

  /**
   * Processar variáveis do template
   */
  private processVariables(
    templateVariables: string[],
    context: NotificationContext
  ): Record<string, string> {
    const variables: Record<string, string> = {};

    templateVariables.forEach(variable => {
      switch (variable) {
        case 'clienteNome':
          variables[variable] = context.clienteNome;
          break;
        case 'servico':
          variables[variable] = context.servico || '';
          break;
        case 'dataAgendamento':
          variables[variable] = context.dataAgendamento?.toISOString() || '';
          break;
        case 'dataHoraFormatada':
          variables[variable] = context.dataAgendamento 
            ? format(context.dataAgendamento, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
            : '';
          break;
        case 'horaFormatada':
          variables[variable] = context.dataAgendamento 
            ? format(context.dataAgendamento, 'HH:mm', { locale: ptBR })
            : '';
          break;
        case 'profissional':
          variables[variable] = context.profissional || '';
          break;
        case 'valor':
          variables[variable] = context.valor 
            ? context.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
            : '';
          break;
        default:
          variables[variable] = context.customData?.[variable] || '';
      }
    });

    return variables;
  }

  /**
   * Substituir variáveis no texto
   */
  private replaceVariables(text: string, variables: Record<string, string>): string {
    let result = text;
    
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return result;
  }

  /**
   * Registrar resultado da entrega
   */
  private async logDeliveryResult(result: NotificationResult): Promise<void> {
    try {
      await supabase.from('notification_deliveries').insert({
        notification_id: result.id,
        channel: result.channel,
        recipient: result.recipient,
        success: result.success,
        sent_at: result.sentAt?.toISOString(),
        delivered_at: result.deliveredAt?.toISOString(),
        read_at: result.readAt?.toISOString(),
        external_id: result.externalId,
        error_message: result.errorMessage,
        cost: result.cost
      });
    } catch (error) {
      console.error('Erro ao registrar delivery:', error);
    }
  }

  /**
   * Processar webhook de delivery
   */
  async processDeliveryWebhook(
    provider: 'whatsapp' | 'twilio' | 'sendgrid',
    payload: any
  ): Promise<void> {
    try {
      let deliveryReport: DeliveryReport | null = null;

      switch (provider) {
        case 'whatsapp':
          deliveryReport = this.parseWhatsAppWebhook(payload);
          break;
        case 'twilio':
          deliveryReport = this.parseTwilioWebhook(payload);
          break;
        case 'sendgrid':
          deliveryReport = this.parseSendGridWebhook(payload);
          break;
      }

      if (deliveryReport) {
        await this.updateDeliveryStatus(deliveryReport);
      }
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
    }
  }

  private parseWhatsAppWebhook(payload: any): DeliveryReport | null {
    // Implementar parsing do webhook do WhatsApp
    // Retorna status: sent, delivered, read, failed
    return null;
  }

  private parseTwilioWebhook(payload: any): DeliveryReport | null {
    // Implementar parsing do webhook do Twilio
    return null;
  }

  private parseSendGridWebhook(payload: any): DeliveryReport | null {
    // Implementar parsing do webhook do SendGrid
    return null;
  }

  private async updateDeliveryStatus(report: DeliveryReport): Promise<void> {
    await supabase
      .from('notification_deliveries')
      .update({
        status: report.status,
        delivered_at: report.status === 'delivered' ? report.timestamp.toISOString() : undefined,
        read_at: report.status === 'read' ? report.timestamp.toISOString() : undefined,
        error_message: report.errorMessage
      })
      .eq('notification_id', report.notificationId)
      .eq('channel', report.channel);
  }
}

// =====================================================
// INSTÂNCIA SINGLETON
// =====================================================

export const notificationEngine = NotificationEngine.getInstance();

// =====================================================
// FUNÇÕES DE CONVENIÊNCIA
// =====================================================

export async function sendAppointmentConfirmation(
  clienteId: string,
  context: NotificationContext,
  channels: NotificationChannel[]
): Promise<NotificationResult[]> {
  return notificationEngine.sendNotification({
    recipientId: clienteId,
    templateId: 'appointment_confirmation',
    channels,
    priority: 'normal',
    context
  });
}

export async function sendReminder24h(
  clienteId: string,
  context: NotificationContext,
  scheduledFor: Date
): Promise<NotificationResult[]> {
  
  // Determinar canais baseado na categoria do cliente
  const channels: NotificationChannel[] = [
    { type: 'whatsapp', recipient: context.customData?.telefone || '', enabled: true, priority: 1 },
    { type: 'sms', recipient: context.customData?.telefone || '', enabled: true, priority: 2 },
    { type: 'email', recipient: context.customData?.email || '', enabled: true, priority: 3 }
  ];

  return notificationEngine.sendNotification({
    recipientId: clienteId,
    templateId: 'appointment_reminder_24h',
    channels,
    priority: 'high',
    scheduledFor,
    context
  });
}

export async function sendVIPSpecialNotification(
  clienteId: string,
  context: NotificationContext
): Promise<NotificationResult[]> {
  
  const vipChannels: NotificationChannel[] = [
    { type: 'whatsapp', recipient: context.customData?.telefone || '', enabled: true, priority: 1 }
  ];

  return notificationEngine.sendNotification({
    recipientId: clienteId,
    templateId: 'vip_special_treatment',
    channels: vipChannels,
    priority: 'high',
    context
  });
}