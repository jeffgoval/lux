/**
 * AgendamentoModalPremium - Modal Avançado de Agendamento
 * Interface sofisticada com validação em tempo real, integração com prontuário
 * e sugestões inteligentes de serviços
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  MapPin, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lightbulb,
  Star,
  Phone,
  Mail,
  FileText,
  CreditCard,
  Gift,
  Zap,
  TrendingUp,
  Info,
  Save,
  X
} from 'lucide-react';
import { format, addMinutes, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { smartSchedulingEngine, ConflictAnalysis } from '@/services/SmartSchedulingEngine';
import { revenueOptimizer, UpsellingSuggestion, PricingRecommendation } from '@/services/RevenueOptimizer';
import ConflictResolver from './ConflictResolver';

// =====================================================
// INTERFACES
// =====================================================

export interface AgendamentoFormData {
  id?: string;
  clienteId: string;
  profissionalId: string;
  servicoId: string;
  salaId?: string;
  dataAgendamento: Date;
  duracaoMinutos: number;
  status: 'pendente' | 'confirmado';
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente' | 'vip';
  valorServico: number;
  valorFinal: number;
  descontoAplicado?: number;
  observacoes?: string;
  observacoesInternas?: string;
  notificarCliente: boolean;
  confirmarAutomaticamente: boolean;
  processarPagamento: boolean;
}

export interface AgendamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit' | 'view';
  agendamento?: AgendamentoFormData;
  initialDate?: Date;
  initialTime?: string;
  onSave: (data: AgendamentoFormData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  categoria: 'regular' | 'vip' | 'premium' | 'corporativo';
  historicoGastos: number;
  ultimaVisita?: Date;
  observacoesMedicas?: string;
  alergias?: string[];
  preferencias?: string[];
}

export interface Profissional {
  id: string;
  nome: string;
  especialidades: string[];
  horarioTrabalho: any;
  disponivel: boolean;
}

export interface Servico {
  id: string;
  nome: string;
  precoBase: number;
  duracaoMinutos: number;
  descricao?: string;
  categoria: string;
  requerEquipamento?: boolean;
  equipamentosNecessarios?: string[];
  servicosComplementares?: string[];
}

export interface Sala {
  id: string;
  nome: string;
  tipo: string;
  capacidade: number;
  equipamentos: string[];
  disponivel: boolean;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const AgendamentoModalPremium: React.FC<AgendamentoModalProps> = ({
  open,
  onOpenChange,
  mode,
  agendamento,
  initialDate,
  initialTime,
  onSave,
  onDelete,
  isLoading = false
}) => {
  const { toast } = useToast();
  
  // Estados do formulário
  const [formData, setFormData] = useState<AgendamentoFormData>({
    clienteId: '',
    profissionalId: '',
    servicoId: '',
    salaId: '',
    dataAgendamento: initialDate || new Date(),
    duracaoMinutos: 60,
    status: 'pendente',
    prioridade: 'normal',
    valorServico: 0,
    valorFinal: 0,
    observacoes: '',
    observacoesInternas: '',
    notificarCliente: true,
    confirmarAutomaticamente: false,
    processarPagamento: false
  });

  // Estados de dados
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  
  // Estados de funcionalidades avançadas
  const [conflicts, setConflicts] = useState<ConflictAnalysis | null>(null);
  const [upsellingSuggestions, setUpsellingSuggestions] = useState<UpsellingSuggestion[]>([]);
  const [pricingRecommendation, setPricingRecommendation] = useState<PricingRecommendation | null>(null);
  const [selectedUpselling, setSelectedUpselling] = useState<string[]>([]);
  
  // Estados de UI
  const [activeTab, setActiveTab] = useState('basico');
  const [showConflictResolver, setShowConflictResolver] = useState(false);
  const [validatingConflicts, setValidatingConflicts] = useState(false);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [clienteDetails, setClienteDetails] = useState<Cliente | null>(null);

  // Horários disponíveis
  const horariosDisponiveis = useMemo(() => {
    const horarios = [];
    for (let hour = 8; hour <= 19; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        horarios.push(timeString);
      }
    }
    return horarios;
  }, []);

  // Inicializar dados do formulário
  useEffect(() => {
    if (agendamento) {
      setFormData(agendamento);
    } else if (initialDate && initialTime) {
      const [hour, minute] = initialTime.split(':').map(Number);
      const dataAgendamento = new Date(initialDate);
      dataAgendamento.setHours(hour, minute, 0, 0);
      
      setFormData(prev => ({
        ...prev,
        dataAgendamento
      }));
    }
  }, [agendamento, initialDate, initialTime]);

  // Carregar dados básicos
  useEffect(() => {
    if (open) {
      loadClientes();
      loadProfissionais();
      loadServicos();
      loadSalas();
    }
  }, [open]);

  // Validar conflitos quando dados críticos mudam
  useEffect(() => {
    if (formData.clienteId && formData.profissionalId && formData.servicoId && formData.dataAgendamento) {
      validateConflicts();
    }
  }, [formData.clienteId, formData.profissionalId, formData.servicoId, formData.dataAgendamento, formData.duracaoMinutos]);

  // Carregar detalhes do cliente
  useEffect(() => {
    if (formData.clienteId) {
      loadClienteDetails(formData.clienteId);
      loadUpsellingSuggestions();
    }
  }, [formData.clienteId]);

  // Calcular pricing dinâmico
  useEffect(() => {
    if (formData.servicoId && formData.dataAgendamento) {
      calculateDynamicPricing();
    }
  }, [formData.servicoId, formData.dataAgendamento]);

  const loadClientes = async () => {
    // Implementar carregamento de clientes
    // Mock data por enquanto
    setClientes([
      {
        id: '1',
        nome: 'Maria Silva',
        telefone: '(11) 99999-9999',
        email: 'maria@email.com',
        categoria: 'vip',
        historicoGastos: 5000,
        ultimaVisita: new Date('2024-01-15')
      }
    ]);
  };

  const loadProfissionais = async () => {
    // Implementar carregamento de profissionais
    setProfissionais([
      {
        id: '1',
        nome: 'Dra. Ana Silva',
        especialidades: ['Botox', 'Preenchimento'],
        horarioTrabalho: {},
        disponivel: true
      }
    ]);
  };

  const loadServicos = async () => {
    // Implementar carregamento de serviços
    setServicos([
      {
        id: '1',
        nome: 'Botox',
        precoBase: 800,
        duracaoMinutos: 60,
        categoria: 'Injetáveis',
        servicosComplementares: ['2', '3']
      },
      {
        id: '2',
        nome: 'Preenchimento Labial',
        precoBase: 1200,
        duracaoMinutos: 90,
        categoria: 'Injetáveis'
      }
    ]);
  };

  const loadSalas = async () => {
    // Implementar carregamento de salas
    setSalas([
      {
        id: '1',
        nome: 'Sala 1',
        tipo: 'Procedimentos',
        capacidade: 2,
        equipamentos: [],
        disponivel: true
      }
    ]);
  };

  const loadClienteDetails = async (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    setClienteDetails(cliente || null);
  };

  const validateConflicts = async () => {
    if (!formData.clienteId || !formData.profissionalId || !formData.servicoId) return;
    
    setValidatingConflicts(true);
    try {
      const conflictAnalysis = await smartSchedulingEngine.detectConflicts({
        id: formData.id,
        clienteId: formData.clienteId,
        profissionalId: formData.profissionalId,
        servicoId: formData.servicoId,
        salaId: formData.salaId,
        dataAgendamento: formData.dataAgendamento,
        duracaoMinutos: formData.duracaoMinutos
      });
      
      setConflicts(conflictAnalysis);
      
      if (conflictAnalysis.temConflitos && conflictAnalysis.conflitos.some(c => c.severidade === 'critica')) {
        setShowConflictResolver(true);
      }
    } catch (error) {

    } finally {
      setValidatingConflicts(false);
    }
  };

  const loadUpsellingSuggestions = async () => {
    if (!formData.clienteId || !clienteDetails) return;
    
    try {
      const suggestions = await revenueOptimizer.suggestUpselling(
        clienteDetails,
        {
          id: formData.id || '',
          clienteId: formData.clienteId,
          servicoId: formData.servicoId,
          dataAgendamento: formData.dataAgendamento,
          valorServico: formData.valorServico,
          valorFinal: formData.valorFinal,
          status: formData.status
        }
      );
      
      setUpsellingSuggestions(suggestions);
    } catch (error) {

    }
  };

  const calculateDynamicPricing = async () => {
    const servico = servicos.find(s => s.id === formData.servicoId);
    if (!servico) return;
    
    setLoadingPricing(true);
    try {
      const demandMetrics = await revenueOptimizer.calculateDemandMetrics(
        formData.servicoId,
        formData.dataAgendamento,
        formData.profissionalId
      );
      
      const pricing = await revenueOptimizer.calculateDynamicPricing(
        {
          id: servico.id,
          nome: servico.nome,
          precoBase: servico.precoBase,
          duracaoMinutos: servico.duracaoMinutos,
          margemLucro: 60,
          demandaMedia: 10,
          sazonalidade: { '01': 1.0, '02': 1.0, '03': 1.0, '04': 1.0, '05': 1.0, '06': 1.0, '07': 1.0, '08': 1.0, '09': 1.0, '10': 1.0, '11': 1.0, '12': 1.0 },
          servicosComplementares: servico.servicosComplementares || []
        },
        formData.dataAgendamento,
        demandMetrics
      );
      
      setPricingRecommendation(pricing);
      
      // Atualizar preços no formulário
      setFormData(prev => ({
        ...prev,
        valorServico: pricing.precoSugerido,
        valorFinal: pricing.precoSugerido,
        descontoAplicado: pricing.desconto
      }));
    } catch (error) {

    } finally {
      setLoadingPricing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (conflicts?.temConflitos && conflicts.conflitos.some(c => c.severidade === 'critica')) {
      setShowConflictResolver(true);
      return;
    }
    
    try {
      // Adicionar serviços de upselling ao valor final
      const valorUpselling = selectedUpselling.reduce((sum, id) => {
        const suggestion = upsellingSuggestions.find(s => s.servicoId === id);
        return sum + (suggestion?.precoAdicional || 0);
      }, 0);
      
      const finalData = {
        ...formData,
        valorFinal: formData.valorFinal + valorUpselling
      };
      
      await onSave(finalData);
      onOpenChange(false);
      
      toast({
        title: mode === 'create' ? 'Agendamento criado' : 'Agendamento atualizado',
        description: 'As informações foram salvas com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar o agendamento.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!formData.id || !onDelete) return;
    
    try {
      await onDelete(formData.id);
      onOpenChange(false);
      
      toast({
        title: 'Agendamento excluído',
        description: 'O agendamento foi removido com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao excluir o agendamento.',
        variant: 'destructive',
      });
    }
  };

  const handleConflictResolve = (resolution: any) => {
    if (resolution.action === 'reschedule' && resolution.newDateTime) {
      setFormData(prev => ({
        ...prev,
        dataAgendamento: resolution.newDateTime
      }));
    }
    setShowConflictResolver(false);
    setConflicts(null);
  };

  const toggleUpselling = (servicoId: string) => {
    setSelectedUpselling(prev => 
      prev.includes(servicoId) 
        ? prev.filter(id => id !== servicoId)
        : [...prev, servicoId]
    );
  };

  if (showConflictResolver && conflicts) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resolver Conflitos de Agendamento</DialogTitle>
          </DialogHeader>
          <ConflictResolver
            conflicts={conflicts}
            agendamento={{
              id: formData.id,
              clienteId: formData.clienteId,
              profissionalId: formData.profissionalId,
              servicoId: formData.servicoId,
              salaId: formData.salaId,
              dataAgendamento: formData.dataAgendamento,
              duracaoMinutos: formData.duracaoMinutos
            }}
            onResolve={handleConflictResolve}
            onCancel={() => setShowConflictResolver(false)}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="heading-premium">
              {mode === 'create' ? 'Novo Agendamento' : 
               mode === 'edit' ? 'Editar Agendamento' : 
               'Visualizar Agendamento'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basico">Básico</TabsTrigger>
                <TabsTrigger value="avancado">Avançado</TabsTrigger>
                <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                <TabsTrigger value="upselling">Upselling</TabsTrigger>
              </TabsList>

              {/* Aba Básico */}
              <TabsContent value="basico" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cliente */}
                  <div className="space-y-2">
                    <Label htmlFor="cliente">Cliente *</Label>
                    <Select
                      value={formData.clienteId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, clienteId: value }))}
                      disabled={mode === 'view'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            <div className="flex items-center gap-2">
                              {cliente.categoria === 'vip' && <Star className="h-3 w-3 text-yellow-500" />}
                              {cliente.nome}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Detalhes do Cliente */}
                    {clienteDetails && (
                      <Card className="p-3 bg-muted/50">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            {clienteDetails.telefone}
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {clienteDetails.email}
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-3 w-3" />
                            Histórico: R$ {clienteDetails.historicoGastos.toLocaleString()}
                          </div>
                          {clienteDetails.ultimaVisita && (
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-3 w-3" />
                              Última visita: {format(clienteDetails.ultimaVisita, 'dd/MM/yyyy')}
                            </div>
                          )}
                        </div>
                      </Card>
                    )}
                  </div>

                  {/* Profissional */}
                  <div className="space-y-2">
                    <Label htmlFor="profissional">Profissional *</Label>
                    <Select
                      value={formData.profissionalId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, profissionalId: value }))}
                      disabled={mode === 'view'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar profissional" />
                      </SelectTrigger>
                      <SelectContent>
                        {profissionais.map((profissional) => (
                          <SelectItem key={profissional.id} value={profissional.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              {profissional.nome}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Serviço */}
                  <div className="space-y-2">
                    <Label htmlFor="servico">Serviço *</Label>
                    <Select
                      value={formData.servicoId}
                      onValueChange={(value) => {
                        const servico = servicos.find(s => s.id === value);
                        setFormData(prev => ({ 
                          ...prev, 
                          servicoId: value,
                          duracaoMinutos: servico?.duracaoMinutos || 60,
                          valorServico: servico?.precoBase || 0,
                          valorFinal: servico?.precoBase || 0
                        }));
                      }}
                      disabled={mode === 'view'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        {servicos.map((servico) => (
                          <SelectItem key={servico.id} value={servico.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{servico.nome}</span>
                              <span className="text-muted-foreground">
                                R$ {servico.precoBase} • {servico.duracaoMinutos}min
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sala */}
                  <div className="space-y-2">
                    <Label htmlFor="sala">Sala</Label>
                    <Select
                      value={formData.salaId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, salaId: value }))}
                      disabled={mode === 'view'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar sala" />
                      </SelectTrigger>
                      <SelectContent>
                        {salas.map((sala) => (
                          <SelectItem key={sala.id} value={sala.id}>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              {sala.nome} ({sala.tipo})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Data */}
                  <div className="space-y-2">
                    <Label htmlFor="data">Data *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.dataAgendamento && "text-muted-foreground"
                          )}
                          disabled={mode === 'view'}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.dataAgendamento ? 
                            format(formData.dataAgendamento, "PPP", { locale: ptBR }) : 
                            "Selecionar data"
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.dataAgendamento}
                          onSelect={(date) => {
                            if (date) {
                              const newDate = new Date(formData.dataAgendamento);
                              newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                              setFormData(prev => ({ ...prev, dataAgendamento: newDate }));
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Horário */}
                  <div className="space-y-2">
                    <Label htmlFor="horario">Horário *</Label>
                    <Select
                      value={format(formData.dataAgendamento, 'HH:mm')}
                      onValueChange={(value) => {
                        const [hour, minute] = value.split(':').map(Number);
                        const newDate = new Date(formData.dataAgendamento);
                        newDate.setHours(hour, minute, 0, 0);
                        setFormData(prev => ({ ...prev, dataAgendamento: newDate }));
                      }}
                      disabled={mode === 'view'}
                    >
                      <SelectTrigger>
                        <Clock className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Selecionar horário" />
                      </SelectTrigger>
                      <SelectContent>
                        {horariosDisponiveis.map((horario) => (
                          <SelectItem key={horario} value={horario}>
                            {horario}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Observações sobre o agendamento..."
                    value={formData.observacoes}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                    rows={3}
                    disabled={mode === 'view'}
                  />
                </div>
              </TabsContent>

              {/* Aba Avançado */}
              <TabsContent value="avancado" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Status */}
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                      disabled={mode === 'view'}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="confirmado">Confirmado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Prioridade */}
                  <div className="space-y-2">
                    <Label htmlFor="prioridade">Prioridade</Label>
                    <Select
                      value={formData.prioridade}
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, prioridade: value }))}
                      disabled={mode === 'view'}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Duração */}
                  <div className="space-y-2">
                    <Label htmlFor="duracao">Duração (minutos)</Label>
                    <Input
                      id="duracao"
                      type="number"
                      value={formData.duracaoMinutos}
                      onChange={(e) => setFormData(prev => ({ ...prev, duracaoMinutos: parseInt(e.target.value) || 60 }))}
                      disabled={mode === 'view'}
                    />
                  </div>
                </div>

                {/* Observações Internas */}
                <div className="space-y-2">
                  <Label htmlFor="observacoesInternas">Observações Internas</Label>
                  <Textarea
                    id="observacoesInternas"
                    placeholder="Observações internas (não visíveis ao cliente)..."
                    value={formData.observacoesInternas}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoesInternas: e.target.value }))}
                    rows={3}
                    disabled={mode === 'view'}
                  />
                </div>

                {/* Opções */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notificar Cliente</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar confirmação por WhatsApp e email
                      </p>
                    </div>
                    <Switch
                      checked={formData.notificarCliente}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notificarCliente: checked }))}
                      disabled={mode === 'view'}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Confirmar Automaticamente</Label>
                      <p className="text-sm text-muted-foreground">
                        Confirmar agendamento automaticamente após criação
                      </p>
                    </div>
                    <Switch
                      checked={formData.confirmarAutomaticamente}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, confirmarAutomaticamente: checked }))}
                      disabled={mode === 'view'}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Aba Financeiro */}
              <TabsContent value="financeiro" className="space-y-4">
                {/* Pricing Dinâmico */}
                {pricingRecommendation && (
                  <Card className="p-4 bg-primary/5 border-primary/20">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <h4 className="font-medium text-primary">Pricing Inteligente</h4>
                      <Badge variant="secondary">
                        {pricingRecommendation.confianca}% confiança
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Preço Original</p>
                        <p className="font-medium">R$ {pricingRecommendation.precoOriginal.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Preço Sugerido</p>
                        <p className="font-medium text-primary">R$ {pricingRecommendation.precoSugerido.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      {pricingRecommendation.justificativa.map((justificativa, index) => (
                        <p key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          {justificativa}
                        </p>
                      ))}
                    </div>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Valor do Serviço */}
                  <div className="space-y-2">
                    <Label htmlFor="valorServico">Valor do Serviço</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="valorServico"
                        type="number"
                        step="0.01"
                        value={formData.valorServico}
                        onChange={(e) => setFormData(prev => ({ ...prev, valorServico: parseFloat(e.target.value) || 0 }))}
                        className="pl-10"
                        disabled={mode === 'view'}
                      />
                    </div>
                  </div>

                  {/* Desconto */}
                  <div className="space-y-2">
                    <Label htmlFor="desconto">Desconto</Label>
                    <div className="relative">
                      <Gift className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="desconto"
                        type="number"
                        step="0.01"
                        value={formData.descontoAplicado || 0}
                        onChange={(e) => {
                          const desconto = parseFloat(e.target.value) || 0;
                          setFormData(prev => ({ 
                            ...prev, 
                            descontoAplicado: desconto,
                            valorFinal: prev.valorServico - desconto
                          }));
                        }}
                        className="pl-10"
                        disabled={mode === 'view'}
                      />
                    </div>
                  </div>

                  {/* Valor Final */}
                  <div className="space-y-2">
                    <Label htmlFor="valorFinal">Valor Final</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="valorFinal"
                        type="number"
                        step="0.01"
                        value={formData.valorFinal}
                        onChange={(e) => setFormData(prev => ({ ...prev, valorFinal: parseFloat(e.target.value) || 0 }))}
                        className="pl-10 font-medium"
                        disabled={mode === 'view'}
                      />
                    </div>
                  </div>
                </div>

                {/* Opção de Pagamento */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Processar Pagamento</Label>
                    <p className="text-sm text-muted-foreground">
                      Processar pagamento no momento do agendamento
                    </p>
                  </div>
                  <Switch
                    checked={formData.processarPagamento}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, processarPagamento: checked }))}
                    disabled={mode === 'view'}
                  />
                </div>
              </TabsContent>

              {/* Aba Upselling */}
              <TabsContent value="upselling" className="space-y-4">
                {upsellingSuggestions.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">Serviços Complementares Sugeridos</h3>
                    </div>
                    
                    {upsellingSuggestions.map((suggestion) => (
                      <Card 
                        key={suggestion.servicoId}
                        className={`p-4 cursor-pointer transition-all ${
                          selectedUpselling.includes(suggestion.servicoId)
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => toggleUpselling(suggestion.servicoId)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{suggestion.servicoNome}</h4>
                              <Badge variant="outline" className="text-xs">
                                {suggestion.categoria}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {suggestion.probabilidadeAceitacao}% chance
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">
                              {suggestion.motivoSugestao}
                            </p>
                            
                            <p className="text-sm text-primary">
                              {suggestion.beneficioCliente}
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <p className="font-medium text-primary">
                              +R$ {suggestion.precoAdicional.toFixed(2)}
                            </p>
                            {selectedUpselling.includes(suggestion.servicoId) && (
                              <CheckCircle className="h-5 w-5 text-primary mt-2" />
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                    
                    {selectedUpselling.length > 0 && (
                      <Card className="p-4 bg-success/5 border-success/20">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-success">
                            Incremento de Receita:
                          </span>
                          <span className="font-bold text-success">
                            +R$ {selectedUpselling.reduce((sum, id) => {
                              const suggestion = upsellingSuggestions.find(s => s.servicoId === id);
                              return sum + (suggestion?.precoAdicional || 0);
                            }, 0).toFixed(2)}
                          </span>
                        </div>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma sugestão de upselling disponível</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Alertas de Conflito */}
            {conflicts?.temConflitos && (
              <Alert className="border-warning bg-warning/5">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Conflitos detectados:</p>
                    <ul className="space-y-1">
                      {conflicts.conflitos.slice(0, 3).map((conflict, index) => (
                        <li key={index} className="text-sm flex items-center gap-2">
                          <div className="w-1 h-1 bg-warning rounded-full" />
                          {conflict.descricao}
                        </li>
                      ))}
                    </ul>
                    {conflicts.conflitos.length > 3 && (
                      <p className="text-sm text-muted-foreground">
                        +{conflicts.conflitos.length - 3} outros conflitos
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Ações */}
            <div className="flex justify-between pt-4">
              <div>
                {mode === 'edit' && onDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </Button>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                
                {mode !== 'view' && (
                  <Button
                    type="submit"
                    variant="premium"
                    disabled={isLoading || validatingConflicts}
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {mode === 'create' ? 'Criar Agendamento' : 'Salvar Alterações'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

export default AgendamentoModalPremium;
