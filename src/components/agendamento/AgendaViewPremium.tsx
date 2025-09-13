/**
 * AgendaViewPremium - Componente Avançado de Visualização de Agenda
 * Interface sofisticada com virtualização, filtros inteligentes e animações suaves
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  Filter, 
  Search, 
  User, 
  MapPin, 
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Phone,
  MessageSquare,
  Star,
  Zap
} from 'lucide-react';
import { format, addMinutes, startOfDay, endOfDay, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// =====================================================
// INTERFACES
// =====================================================

export interface AgendamentoView {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteCategoria: 'regular' | 'vip' | 'premium' | 'corporativo';
  clienteTelefone?: string;
  clienteEmail?: string;
  profissionalId: string;
  profissionalNome: string;
  servicoId: string;
  servicoNome: string;
  salaId?: string;
  salaNome?: string;
  dataAgendamento: Date;
  duracaoMinutos: number;
  status: 'pendente' | 'confirmado' | 'em_andamento' | 'finalizado' | 'cancelado' | 'nao_compareceu';
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente' | 'vip';
  valorServico: number;
  valorFinal: number;
  observacoes?: string;
  observacoesInternas?: string;
  confirmadoEm?: Date;
  lembreteEnviado24h: boolean;
  lembreteEnviado2h: boolean;
  avaliacaoCliente?: number;
  tags?: string[];
}

export interface AgendaViewProps {
  viewType: 'day' | 'week' | 'month';
  currentDate: Date;
  profissionalId?: string;
  agendamentos: AgendamentoView[];
  onAgendamentoSelect: (agendamento: AgendamentoView) => void;
  onTimeSlotSelect: (date: Date, time: string) => void;
  onEditAgendamento: (agendamento: AgendamentoView) => void;
  onDeleteAgendamento: (id: string) => void;
  onStatusChange: (id: string, status: AgendamentoView['status']) => void;
  isLoading?: boolean;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  agendamento?: AgendamentoView;
  blocked?: boolean;
  blockReason?: string;
}

export interface AgendaFilters {
  status: string[];
  profissional: string;
  servico: string;
  cliente: string;
  prioridade: string[];
  categoria: string[];
  search: string;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const AgendaViewPremium: React.FC<AgendaViewProps> = ({
  viewType,
  currentDate,
  profissionalId,
  agendamentos,
  onAgendamentoSelect,
  onTimeSlotSelect,
  onEditAgendamento,
  onDeleteAgendamento,
  onStatusChange,
  isLoading = false
}) => {
  const [filters, setFilters] = useState<AgendaFilters>({
    status: [],
    profissional: '',
    servico: '',
    cliente: '',
    prioridade: [],
    categoria: [],
    search: ''
  });
  
  const [selectedAgendamento, setSelectedAgendamento] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Gerar slots de tempo para visualização diária
  const timeSlots = useMemo(() => {
    const slots: TimeSlot[] = [];
    const startHour = 8;
    const endHour = 20;
    const interval = 30; // minutos

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const slotDate = new Date(currentDate);
        slotDate.setHours(hour, minute, 0, 0);

        // Verificar se há agendamento neste horário
        const agendamento = agendamentos.find(a => {
          const agendamentoStart = new Date(a.dataAgendamento);
          const agendamentoEnd = addMinutes(agendamentoStart, a.duracaoMinutos);
          return slotDate >= agendamentoStart && slotDate < agendamentoEnd;
        });

        // Verificar se está bloqueado (lógica seria implementada)
        const blocked = false; // Implementar lógica de bloqueios
        
        slots.push({
          time: timeString,
          available: !agendamento && !blocked,
          agendamento,
          blocked,
          blockReason: blocked ? 'Horário bloqueado' : undefined
        });
      }
    }

    return slots;
  }, [currentDate, agendamentos]);

  // Filtrar agendamentos
  const filteredAgendamentos = useMemo(() => {
    return agendamentos.filter(agendamento => {
      // Filtro por status
      if (filters.status.length > 0 && !filters.status.includes(agendamento.status)) {
        return false;
      }

      // Filtro por profissional
      if (filters.profissional && agendamento.profissionalId !== filters.profissional) {
        return false;
      }

      // Filtro por serviço
      if (filters.servico && agendamento.servicoId !== filters.servico) {
        return false;
      }

      // Filtro por prioridade
      if (filters.prioridade.length > 0 && !filters.prioridade.includes(agendamento.prioridade)) {
        return false;
      }

      // Filtro por categoria
      if (filters.categoria.length > 0 && !filters.categoria.includes(agendamento.clienteCategoria)) {
        return false;
      }

      // Filtro por busca
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          agendamento.clienteNome.toLowerCase().includes(searchLower) ||
          agendamento.servicoNome.toLowerCase().includes(searchLower) ||
          agendamento.profissionalNome.toLowerCase().includes(searchLower) ||
          agendamento.observacoes?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [agendamentos, filters]);

  // Métricas do dia
  const dayMetrics = useMemo(() => {
    const agendamentosHoje = filteredAgendamentos.filter(a => 
      isSameDay(new Date(a.dataAgendamento), currentDate)
    );

    return {
      total: agendamentosHoje.length,
      confirmados: agendamentosHoje.filter(a => a.status === 'confirmado').length,
      pendentes: agendamentosHoje.filter(a => a.status === 'pendente').length,
      finalizados: agendamentosHoje.filter(a => a.status === 'finalizado').length,
      receita: agendamentosHoje.reduce((sum, a) => sum + a.valorFinal, 0),
      ocupacao: Math.round((agendamentosHoje.length / 24) * 100) // 24 slots por dia
    };
  }, [filteredAgendamentos, currentDate]);

  const getStatusColor = (status: AgendamentoView['status']) => {
    switch (status) {
      case 'confirmado': return 'bg-success text-success-foreground';
      case 'pendente': return 'bg-warning text-warning-foreground';
      case 'em_andamento': return 'bg-primary text-primary-foreground';
      case 'finalizado': return 'bg-muted text-muted-foreground';
      case 'cancelado': return 'bg-destructive text-destructive-foreground';
      case 'nao_compareceu': return 'bg-destructive/80 text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityIcon = (prioridade: AgendamentoView['prioridade']) => {
    switch (prioridade) {
      case 'vip': return <Star className="h-3 w-3 text-yellow-500" />;
      case 'urgente': return <Zap className="h-3 w-3 text-red-500" />;
      case 'alta': return <AlertCircle className="h-3 w-3 text-orange-500" />;
      default: return null;
    }
  };

  const getCategoryIcon = (categoria: AgendamentoView['clienteCategoria']) => {
    switch (categoria) {
      case 'vip': return <Star className="h-3 w-3 text-yellow-500" />;
      case 'premium': return <Star className="h-3 w-3 text-purple-500" />;
      case 'corporativo': return <User className="h-3 w-3 text-blue-500" />;
      default: return null;
    }
  };

  const handleSlotClick = (slot: TimeSlot) => {
    if (slot.agendamento) {
      onAgendamentoSelect(slot.agendamento);
    } else if (slot.available) {
      const slotDate = new Date(currentDate);
      const [hour, minute] = slot.time.split(':').map(Number);
      slotDate.setHours(hour, minute, 0, 0);
      onTimeSlotSelect(slotDate, slot.time);
    }
  };

  const handleStatusChange = (agendamento: AgendamentoView, newStatus: AgendamentoView['status']) => {
    onStatusChange(agendamento.id, newStatus);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header com Métricas */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-effect rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold heading-premium">
                {format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </h2>
              <p className="text-muted-foreground">
                {dayMetrics.total} agendamentos • {dayMetrics.ocupacao}% ocupação
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-primary/10 border-primary' : ''}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>
          </div>

          {/* Métricas Rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{dayMetrics.confirmados}</div>
              <div className="text-xs text-muted-foreground">Confirmados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">{dayMetrics.pendentes}</div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{dayMetrics.finalizados}</div>
              <div className="text-xs text-muted-foreground">Finalizados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                R$ {dayMetrics.receita.toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">Receita</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{dayMetrics.ocupacao}%</div>
              <div className="text-xs text-muted-foreground">Ocupação</div>
            </div>
          </div>
        </motion.div>

        {/* Filtros Expandidos */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-effect rounded-xl p-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cliente, serviço, profissional..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select
                    value={filters.status.join(',')}
                    onValueChange={(value) => setFilters(prev => ({ 
                      ...prev, 
                      status: value ? value.split(',') : [] 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmado">Confirmado</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="finalizado">Finalizado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Prioridade</label>
                  <Select
                    value={filters.prioridade.join(',')}
                    onValueChange={(value) => setFilters(prev => ({ 
                      ...prev, 
                      prioridade: value ? value.split(',') : [] 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as prioridades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Categoria</label>
                  <Select
                    value={filters.categoria.join(',')}
                    onValueChange={(value) => setFilters(prev => ({ 
                      ...prev, 
                      categoria: value ? value.split(',') : [] 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="corporativo">Corporativo</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timeline de Agendamentos */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Timeline do Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-2">
                {timeSlots.map((slot, index) => (
                  <motion.div
                    key={slot.time}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.01 }}
                    className={`flex items-center gap-4 p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                      slot.blocked 
                        ? 'bg-muted/50 border-muted cursor-not-allowed' 
                        : slot.agendamento 
                          ? 'bg-background border-border hover:shadow-soft' 
                          : 'bg-background/50 border-border/50 hover:bg-background hover:border-border'
                    } ${hoveredSlot === slot.time ? 'scale-[1.02]' : ''}`}
                    onClick={() => handleSlotClick(slot)}
                    onMouseEnter={() => setHoveredSlot(slot.time)}
                    onMouseLeave={() => setHoveredSlot(null)}
                  >
                    {/* Horário */}
                    <div className="w-16 text-sm font-medium text-warm">
                      {slot.time}
                    </div>

                    {/* Conteúdo do Slot */}
                    {slot.blocked ? (
                      <div className="flex-1 flex items-center gap-2 text-muted-foreground">
                        <div className="w-2 h-2 bg-muted rounded-full" />
                        <span className="text-sm">{slot.blockReason}</span>
                      </div>
                    ) : slot.agendamento ? (
                      <div className="flex-1 bg-card rounded-lg p-4 border border-border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* Header do Agendamento */}
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                {getCategoryIcon(slot.agendamento.clienteCategoria)}
                                <h3 className="font-medium text-foreground">
                                  {slot.agendamento.clienteNome}
                                </h3>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {getPriorityIcon(slot.agendamento.prioridade)}
                                <Badge className={getStatusColor(slot.agendamento.status)}>
                                  {slot.agendamento.status.replace('_', ' ').toUpperCase()}
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Detalhes do Agendamento */}
                            <div className="grid grid-cols-2 gap-4 text-sm text-premium">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />
                                {slot.agendamento.servicoNome}
                              </div>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />
                                {slot.agendamento.profissionalNome}
                              </div>
                              {slot.agendamento.salaNome && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-primary" />
                                  {slot.agendamento.salaNome}
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" />
                                {slot.agendamento.duracaoMinutos} min
                              </div>
                            </div>

                            {/* Observações */}
                            {slot.agendamento.observacoes && (
                              <div className="mt-3 p-2 bg-muted/50 rounded-md">
                                <p className="text-sm text-muted-foreground">
                                  {slot.agendamento.observacoes}
                                </p>
                              </div>
                            )}

                            {/* Tags */}
                            {slot.agendamento.tags && slot.agendamento.tags.length > 0 && (
                              <div className="mt-2 flex gap-1">
                                {slot.agendamento.tags.map((tag, tagIndex) => (
                                  <Badge key={tagIndex} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Ações e Valor */}
                          <div className="flex items-center gap-2 ml-4">
                            <div className="text-right">
                              <div className="font-medium text-primary">
                                R$ {slot.agendamento.valorFinal.toFixed(2).replace('.', ',')}
                              </div>
                              {slot.agendamento.avaliacaoCliente && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  {slot.agendamento.avaliacaoCliente}
                                </div>
                              )}
                            </div>
                            
                            {/* Menu de Ações */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onAgendamentoSelect(slot.agendamento!)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Visualizar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onEditAgendamento(slot.agendamento!)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                {slot.agendamento!.clienteTelefone && (
                                  <DropdownMenuItem>
                                    <Phone className="h-4 w-4 mr-2" />
                                    Ligar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  WhatsApp
                                </DropdownMenuItem>
                                <Separator />
                                <DropdownMenuItem 
                                  onClick={() => handleStatusChange(slot.agendamento!, 'confirmado')}
                                  disabled={slot.agendamento!.status === 'confirmado'}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Confirmar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleStatusChange(slot.agendamento!, 'cancelado')}
                                  className="text-destructive"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancelar
                                </DropdownMenuItem>
                                <Separator />
                                <DropdownMenuItem 
                                  onClick={() => onDeleteAgendamento(slot.agendamento!.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center gap-2 text-muted-foreground">
                        <div className="w-2 h-2 bg-muted rounded-full" />
                        <span className="text-sm">Horário disponível</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default AgendaViewPremium;