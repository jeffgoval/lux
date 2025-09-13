/**
 * Testes para VIPSchedulingService
 * Validação completa das funcionalidades de agendamento VIP
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { VIPSchedulingService } from '../VIPSchedulingService';
import { ClienteCategoria, NivelVip } from '@/types/ClientePremium';

// Mock do Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(() => ({
          data: []
        }))
      })),
      gte: vi.fn(() => ({
        lte: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              data: []
            }))
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      }))
    })),
    rpc: vi.fn()
  }))
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

describe('VIPSchedulingService', () => {
  let vipService: VIPSchedulingService;
  
  const mockClienteVIP = {
    id: 'cliente-vip-1',
    nome: 'João Silva VIP',
    email: 'joao@email.com',
    telefone: '11999999999',
    categoria: ClienteCategoria.VIP,
    nivelVip: NivelVip.OURO,
    pontuacaoFidelidade: 2500,
    statusAtivo: true,
    historicoFinanceiro: {
      totalGasto: 15000,
      gastoMedio: 500,
      ultimoGasto: 600,
      ticketMedio: 550,
      totalDesconto: 1500,
      statusPagamento: 'em_dia' as const,
      faturasPendentes: 0,
      valorPendente: 0
    },
    historicoAgendamentos: {
      totalAgendamentos: 30,
      agendamentosFinalizados: 28,
      agendamentosCancelados: 2,
      agendamentosNaoCompareceu: 0,
      taxaComparecimento: 0.93,
      servicosMaisRealizados: [],
      intervaloMedioEntreVisitas: 21
    },
    metricas: {
      nps: 9,
      satisfacaoMedia: 4.8,
      avaliacoes: [],
      reclamacoes: [],
      elogios: [],
      indicacoes: 5,
      tempoComoCliente: 365,
      frequenciaVisitas: 'alta' as const,
      tendenciaGastos: 'crescente' as const,
      riscoCancelamento: 'baixo' as const,
      valorVitalicio: 25000
    },
    preferencias: {
      profissionaisPreferidos: ['prof-1'],
      profissionaisEvitados: [],
      salasPreferidas: ['sala-premium-1'],
      horariosPreferidos: [
        {
          diaSemana: 2,
          horaInicio: '09:00',
          horaFim: '11:00',
          prioridade: 10
        }
      ],
      servicosInteresse: ['servico-1'],
      servicosEvitados: []
    },
    programaFidelidade: {
      id: 'programa-1',
      nome: 'VIP Ouro',
      nivel: NivelVip.OURO,
      pontos: 2500,
      pontosVitalicio: 5000,
      dataIngresso: new Date('2023-01-01'),
      status: 'ativo' as const,
      beneficiosDisponiveis: [],
      historicoResgates: []
    },
    beneficiosAtivos: [],
    endereco: undefined,
    contatosAdicionais: [],
    preferenciasContato: {
      canalPreferido: 'whatsapp' as const,
      horarioPreferido: {
        inicio: '09:00',
        fim: '18:00'
      },
      diasSemana: [1, 2, 3, 4, 5],
      receberPromocoes: true,
      receberLembretes: true,
      receberNovidades: true,
      frequenciaContato: 'media' as const
    },
    restricoesMedicas: undefined,
    observacoesMedicas: undefined,
    indicadoPor: undefined,
    clientesIndicados: [],
    relacionamentos: [],
    tags: ['vip', 'fidelizado'],
    observacoesInternas: undefined,
    criadoEm: new Date('2023-01-01'),
    atualizadoEm: new Date(),
    criadoPor: 'admin-1',
    ultimaInteracao: new Date(),
    proximoContato: undefined
  };

  const mockClienteRegular = {
    ...mockClienteVIP,
    id: 'cliente-regular-1',
    nome: 'Maria Santos',
    categoria: ClienteCategoria.REGULAR,
    nivelVip: NivelVip.BRONZE
  };

  const mockVIPRequest = {
    clienteId: 'cliente-vip-1',
    servicoId: 'servico-1',
    profissionalId: 'prof-1',
    dataPreferida: new Date('2024-12-20T10:00:00Z'),
    horarioPreferido: '10:00',
    flexibilidadeDias: 7,
    observacoes: 'Cliente VIP - atendimento especial',
    urgente: false
  };

  beforeEach(() => {
    vipService = VIPSchedulingService.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('scheduleVIPClient', () => {
    it('deve agendar cliente VIP quando horário está disponível', async () => {
      // Mock: cliente VIP encontrado
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockClienteVIP,
        error: null
      });

      // Mock: horário disponível
      mockSupabase.from().select().eq().eq().eq().eq.mockResolvedValueOnce({
        data: [],
        error: null
      });

      // Mock: criação do agendamento
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: {
          id: 'agendamento-1',
          cliente_id: mockVIPRequest.clienteId,
          data_agendamento: mockVIPRequest.dataPreferida
        },
        error: null
      });

      const result = await vipService.scheduleVIPClient(mockVIPRequest);

      expect(result.success).toBe(true);
      expect(result.agendamentoId).toBe('agendamento-1');
      expect(result.horarioConfirmado).toEqual(mockVIPRequest.dataPreferida);
      expect(result.message).toContain('Agendamento VIP confirmado');
    });

    it('deve falhar quando cliente não é VIP', async () => {
      // Mock: cliente regular encontrado
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockClienteRegular,
        error: null
      });

      const result = await vipService.scheduleVIPClient(mockVIPRequest);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Cliente não possui status VIP/Premium');
    });

    it('deve realocar cliente regular para acomodar VIP', async () => {
      // Mock: cliente VIP encontrado
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockClienteVIP,
        error: null
      });

      // Mock: horário ocupado por cliente regular
      mockSupabase.from().select().eq().eq().eq().eq.mockResolvedValueOnce({
        data: [{
          id: 'agendamento-regular-1',
          cliente_id: 'cliente-regular-1',
          profissional_id: 'prof-1',
          data_agendamento: mockVIPRequest.dataPreferida,
          status: 'confirmado'
        }],
        error: null
      });

      // Mock: agendamentos conflitantes com cliente regular
      mockSupabase.from().select().eq().eq().eq().mockResolvedValueOnce({
        data: [{
          id: 'agendamento-regular-1',
          cliente: {
            categoria: ClienteCategoria.REGULAR,
            nivel_vip: NivelVip.BRONZE
          }
        }],
        error: null
      });

      // Mock: função de realocação
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          agendamento_realocado_id: 'agendamento-regular-1'
        },
        error: null
      });

      // Mock: criação do agendamento VIP
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: {
          id: 'agendamento-vip-1',
          cliente_id: mockVIPRequest.clienteId
        },
        error: null
      });

      const result = await vipService.scheduleVIPClient(mockVIPRequest);

      expect(result.success).toBe(true);
      expect(result.conflitosResolvidos).toBeDefined();
      expect(result.conflitosResolvidos?.length).toBeGreaterThan(0);
    });

    it('deve sugerir horários alternativos quando não consegue resolver conflitos', async () => {
      // Mock: cliente VIP encontrado
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockClienteVIP,
        error: null
      });

      // Mock: horário ocupado
      mockSupabase.from().select().eq().eq().eq().eq.mockResolvedValueOnce({
        data: [{
          id: 'agendamento-vip-outro',
          cliente_id: 'outro-vip',
          status: 'confirmado'
        }],
        error: null
      });

      // Mock: conflitos com outro VIP (não pode realocar)
      mockSupabase.from().select().eq().eq().eq().mockResolvedValueOnce({
        data: [{
          id: 'agendamento-vip-outro',
          cliente: {
            categoria: ClienteCategoria.VIP,
            nivel_vip: NivelVip.PLATINA
          }
        }],
        error: null
      });

      // Mock: slots alternativos
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [{
          data_hora: '2024-12-21T10:00:00Z',
          profissional_id: 'prof-1',
          profissional_nome: 'Dr. João',
          sala_id: 'sala-1',
          sala_nome: 'Sala Premium'
        }],
        error: null
      });

      const result = await vipService.scheduleVIPClient(mockVIPRequest);

      expect(result.success).toBe(false);
      expect(result.alternativasDisponiveis).toBeDefined();
      expect(result.alternativasDisponiveis?.length).toBeGreaterThan(0);
      expect(result.message).toContain('Alternativas sugeridas');
    });
  });

  describe('findExclusiveVIPSlots', () => {
    it('deve retornar slots exclusivos para clientes VIP', async () => {
      // Mock: cliente VIP encontrado
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockClienteVIP,
        error: null
      });

      // Mock: horários exclusivos VIP
      mockSupabase.from().select().gte().lte().eq().order.mockResolvedValueOnce({
        data: [{
          id: 'horario-vip-1',
          data_hora: '2024-12-20T09:00:00Z',
          profissional: {
            id: 'prof-1',
            nome: 'Dr. João'
          },
          sala: {
            id: 'sala-premium-1',
            nome: 'Sala Premium VIP'
          }
        }],
        error: null
      });

      const dataInicio = new Date('2024-12-20');
      const dataFim = new Date('2024-12-27');

      const slots = await vipService.findExclusiveVIPSlots(
        mockClienteVIP.id,
        'servico-1',
        dataInicio,
        dataFim
      );

      expect(slots).toBeDefined();
      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0].disponibilidade).toBe('exclusivo_premium');
      expect(slots[0].profissionalNome).toBe('Dr. João');
    });

    it('deve retornar array vazio para cliente não-VIP', async () => {
      // Mock: cliente regular encontrado
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockClienteRegular,
        error: null
      });

      const dataInicio = new Date('2024-12-20');
      const dataFim = new Date('2024-12-27');

      const slots = await vipService.findExclusiveVIPSlots(
        mockClienteRegular.id,
        'servico-1',
        dataInicio,
        dataFim
      );

      expect(slots).toEqual([]);
    });
  });

  describe('reallocateRegularClient', () => {
    it('deve realocar cliente regular com sucesso', async () => {
      const agendamentoId = 'agendamento-regular-1';
      const vipClienteId = 'cliente-vip-1';
      const novoHorario = new Date('2024-12-21T10:00:00Z');

      // Mock: agendamento regular encontrado
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: agendamentoId,
          cliente_id: 'cliente-regular-1',
          profissional_id: 'prof-1',
          servico_id: 'servico-1',
          data_agendamento: '2024-12-20T10:00:00Z',
          cliente: {
            id: 'cliente-regular-1',
            nome: 'Maria Santos',
            categoria: ClienteCategoria.REGULAR,
            nivel_vip: NivelVip.BRONZE
          },
          profissional: {
            id: 'prof-1',
            nome: 'Dr. João'
          },
          servico: {
            id: 'servico-1',
            nome: 'Limpeza de Pele',
            duracao_minutos: 60
          }
        },
        error: null
      });

      // Mock: função de realocação
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          agendamento_realocado_id: agendamentoId,
          novo_horario: novoHorario
        },
        error: null
      });

      // Mock: inserção de notificações
      mockSupabase.from().insert.mockResolvedValue({
        data: { id: 'notificacao-1' },
        error: null
      });

      const result = await vipService.reallocateRegularClient(
        agendamentoId,
        vipClienteId,
        novoHorario
      );

      expect(result).toBeDefined();
      expect(result?.tipo).toBe('reagendamento_cliente_regular');
      expect(result?.clienteAfetadoId).toBe('cliente-regular-1');
      expect(result?.novoHorario).toEqual(novoHorario);
      expect(result?.compensacao).toContain('15% de desconto');
    });

    it('deve retornar null quando agendamento não pode ser realocado', async () => {
      const agendamentoId = 'agendamento-vip-1';
      const vipClienteId = 'cliente-vip-1';
      const novoHorario = new Date('2024-12-21T10:00:00Z');

      // Mock: agendamento VIP encontrado (não pode ser realocado)
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          id: agendamentoId,
          cliente: {
            categoria: ClienteCategoria.VIP,
            nivel_vip: NivelVip.OURO
          }
        },
        error: null
      });

      const result = await vipService.reallocateRegularClient(
        agendamentoId,
        vipClienteId,
        novoHorario
      );

      expect(result).toBeNull();
    });
  });

  describe('notifyManagementVIPBooking', () => {
    it('deve notificar gerência para cliente Premium Diamante', async () => {
      const clientePremium = {
        ...mockClienteVIP,
        categoria: ClienteCategoria.PREMIUM,
        nivelVip: NivelVip.DIAMANTE
      };

      const agendamentoId = 'agendamento-premium-1';
      const detalhes = {
        dataAgendamento: new Date('2024-12-20T10:00:00Z'),
        servicoNome: 'Tratamento Premium',
        profissionalNome: 'Dr. João',
        valorEstimado: 1500,
        observacoes: 'Cliente Premium Diamante'
      };

      // Mock: inserção de notificação
      mockSupabase.from().insert.mockResolvedValueOnce({
        data: { id: 'notificacao-gerencia-1' },
        error: null
      });

      await vipService.notifyManagementVIPBooking(
        clientePremium,
        agendamentoId,
        detalhes
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('notificacoes_gerencia');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'vip_booking',
          cliente_id: clientePremium.id,
          cliente_nome: clientePremium.nome,
          categoria: clientePremium.categoria,
          nivel_vip: clientePremium.nivelVip
        })
      );
    });

    it('não deve notificar gerência para VIP Ouro', async () => {
      const clienteVIPOuro = {
        ...mockClienteVIP,
        categoria: ClienteCategoria.VIP,
        nivelVip: NivelVip.OURO
      };

      const agendamentoId = 'agendamento-vip-1';
      const detalhes = {
        dataAgendamento: new Date('2024-12-20T10:00:00Z'),
        servicoNome: 'Limpeza de Pele',
        profissionalNome: 'Dr. João',
        valorEstimado: 300,
        observacoes: 'Cliente VIP Ouro'
      };

      await vipService.notifyManagementVIPBooking(
        clienteVIPOuro,
        agendamentoId,
        detalhes
      );

      // Não deve inserir notificação para VIP Ouro
      expect(mockSupabase.from().insert).not.toHaveBeenCalled();
    });
  });

  describe('applyVIPBenefits', () => {
    it('deve aplicar benefícios para cliente Premium Diamante', async () => {
      const clienteId = 'cliente-premium-1';
      const agendamentoId = 'agendamento-1';

      // Mock: cliente Premium Diamante
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          ...mockClienteVIP,
          categoria: ClienteCategoria.PREMIUM,
          nivelVip: NivelVip.DIAMANTE
        },
        error: null
      });

      // Mock: updates para aplicar benefícios
      mockSupabase.from().update().eq.mockResolvedValue({
        data: { id: agendamentoId },
        error: null
      });

      // Mock: profissional sênior disponível
      mockSupabase.from().select().eq().eq().limit().single.mockResolvedValueOnce({
        data: { id: 'prof-senior-1' },
        error: null
      });

      const beneficios = await vipService.applyVIPBenefits(clienteId, agendamentoId);

      expect(beneficios).toContain('Upgrade automático para sala premium');
      expect(beneficios).toContain('Profissional sênior designado automaticamente');
      expect(beneficios).toContain('Reagendamento gratuito habilitado');
    });

    it('deve aplicar benefícios limitados para VIP Ouro', async () => {
      const clienteId = 'cliente-vip-1';
      const agendamentoId = 'agendamento-1';

      // Mock: cliente VIP Ouro
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: {
          ...mockClienteVIP,
          categoria: ClienteCategoria.VIP,
          nivelVip: NivelVip.OURO
        },
        error: null
      });

      const beneficios = await vipService.applyVIPBenefits(clienteId, agendamentoId);

      expect(beneficios).toEqual([]);
    });
  });

  describe('Cálculo de Score de Slots', () => {
    it('deve calcular score baseado nas preferências do cliente', () => {
      const slot = {
        data_hora: '2024-12-20T09:00:00Z',
        profissionalId: 'prof-1', // Profissional preferido
        salaId: 'sala-premium-1' // Sala preferida
      };

      // Usar método privado através de reflexão para teste
      const score = (vipService as any).calculateSlotScore(slot, mockClienteVIP);

      expect(score).toBeGreaterThan(50); // Score base
      expect(score).toBeGreaterThan(90); // Com bônus de preferências
    });

    it('deve penalizar slots distantes da data original', () => {
      const slotDistante = {
        data: new Date('2024-12-30T09:00:00Z'), // 10 dias no futuro
        profissionalId: 'prof-outro',
        salaId: 'sala-outra'
      };

      const score = (vipService as any).calculateSlotScore(slotDistante, mockClienteVIP);

      expect(score).toBeLessThan(50); // Penalizado pela distância
    });
  });

  describe('Validação de Configurações de Prioridade', () => {
    it('deve retornar configuração correta para Premium Diamante', () => {
      const clientePremiumDiamante = {
        ...mockClienteVIP,
        categoria: ClienteCategoria.PREMIUM,
        nivelVip: NivelVip.DIAMANTE
      };

      const config = (vipService as any).getPriorityConfig(clientePremiumDiamante);

      expect(config.prioridadeScore).toBe(100);
      expect(config.podeDesalocarRegular).toBe(true);
      expect(config.tempoAntecedenciaMinima).toBe(0);
      expect(config.notificarGerencia).toBe(true);
    });

    it('deve retornar configuração correta para VIP Ouro', () => {
      const config = (vipService as any).getPriorityConfig(mockClienteVIP);

      expect(config.prioridadeScore).toBe(70);
      expect(config.podeDesalocarRegular).toBe(false);
      expect(config.tempoAntecedenciaMinima).toBe(12);
      expect(config.notificarGerencia).toBe(false);
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve tratar erro quando cliente não é encontrado', async () => {
      // Mock: cliente não encontrado
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Cliente não encontrado' }
      });

      const result = await vipService.scheduleVIPClient(mockVIPRequest);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Cliente não encontrado');
    });

    it('deve tratar erro interno no sistema', async () => {
      // Mock: erro interno
      mockSupabase.from().select().eq().single.mockRejectedValueOnce(
        new Error('Erro de conexão com banco')
      );

      const result = await vipService.scheduleVIPClient(mockVIPRequest);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Erro interno no sistema de agendamento VIP');
    });
  });
});