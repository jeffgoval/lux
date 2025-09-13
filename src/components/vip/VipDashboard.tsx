/**
 * VipDashboard - Dashboard Exclusivo para Clientes VIP
 * Interface premium com widgets personalizados e métricas em tempo real
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar,
  CreditCard,
  Star,
  Clock,
  TrendingUp,
  Gift,
  MessageCircle,
  Crown,
  Sparkles,
  ChevronRight,
  Award,
  Zap,
  Heart,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Camera,
  Users,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format, addDays, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// =====================================================
// INTERFACES
// =====================================================

interface VipDashboardProps {
  className?: string;
}

interface AgendamentoVip {
  id: string;
  data: Date;
  horario: string;
  servico: string;
  profissional: string;
  sala: string;
  status: 'confirmado' | 'pendente' | 'em_andamento' | 'concluido';
  valor: number;
  duracao: number;
  observacoes?: string;
}

interface CreditoInfo {
  saldo: number;
  pontos: number;
  proximoVencimento?: Date;
  cashback: number;
  historico: CreditoTransacao[];
}

interface CreditoTransacao {
  id: string;
  data: Date;
  tipo: 'ganho' | 'gasto' | 'bonus';
  valor: number;
  descricao: string;
}

interface BeneficioVip {
  id: string;
  titulo: string;
  descricao: string;
  icon: React.ComponentType<any>;
  ativo: boolean;
  progresso?: number;
  meta?: number;
}

interface MetricaVip {
  label: string;
  valor: string | number;
  icon: React.ComponentType<any>;
  cor: string;
  tendencia?: 'up' | 'down' | 'neutral';
  percentualMudanca?: number;
}

// =====================================================
// DADOS MOCK
// =====================================================

const mockAgendamentos: AgendamentoVip[] = [
  {
    id: '1',
    data: new Date(),
    horario: '14:00',
    servico: 'Harmonização Facial Premium',
    profissional: 'Dra. Mariana Santos',
    sala: 'Suíte VIP 1',
    status: 'confirmado',
    valor: 1800,
    duracao: 120,
    observacoes: 'Cliente VIP - Atendimento personalizado'
  },
  {
    id: '2',
    data: addDays(new Date(), 7),
    horario: '10:00',
    servico: 'Botox + Preenchimento',
    profissional: 'Dr. Ricardo Lima',
    sala: 'Suíte Diamond',
    status: 'confirmado',
    valor: 2200,
    duracao: 90
  },
  {
    id: '3',
    data: addDays(new Date(), 14),
    horario: '16:00',
    servico: 'Limpeza de Pele Diamante',
    profissional: 'Dra. Ana Costa',
    sala: 'Suíte VIP 2',
    status: 'pendente',
    valor: 450,
    duracao: 60
  }
];

const mockCreditos: CreditoInfo = {
  saldo: 1250.00,
  pontos: 8750,
  proximoVencimento: addDays(new Date(), 45),
  cashback: 325.50,
  historico: [
    {
      id: '1',
      data: new Date(),
      tipo: 'ganho',
      valor: 180,
      descricao: 'Cashback - Harmonização Facial'
    },
    {
      id: '2',
      data: addDays(new Date(), -3),
      tipo: 'bonus',
      valor: 500,
      descricao: 'Bônus VIP - Programa Fidelidade'
    }
  ]
};

const mockBeneficios: BeneficioVip[] = [
  {
    id: '1',
    titulo: 'Reagendamento Gratuito',
    descricao: 'Reagende até 2h antes sem custo',
    icon: Calendar,
    ativo: true
  },
  {
    id: '2',
    titulo: 'Desconto Progressivo',
    descricao: '15% em todos os procedimentos',
    icon: Award,
    ativo: true,
    progresso: 8750,
    meta: 10000
  },
  {
    id: '3',
    titulo: 'Concierge 24h',
    descricao: 'Suporte exclusivo sempre disponível',
    icon: MessageCircle,
    ativo: true
  },
  {
    id: '4',
    titulo: 'Suíte Premium',
    descricao: 'Acesso às salas VIP',
    icon: Crown,
    ativo: true
  }
];

const mockMetricas: MetricaVip[] = [
  {
    label: 'Este Mês',
    valor: 'R$ 4.250',
    icon: DollarSign,
    cor: 'text-green-400',
    tendencia: 'up',
    percentualMudanca: 22
  },
  {
    label: 'Procedimentos',
    valor: 8,
    icon: Zap,
    cor: 'text-blue-400',
    tendencia: 'up',
    percentualMudanca: 15
  },
  {
    label: 'Satisfação',
    valor: '98%',
    icon: Heart,
    cor: 'text-pink-400',
    tendencia: 'up',
    percentualMudanca: 3
  },
  {
    label: 'Economia',
    valor: 'R$ 890',
    icon: Star,
    cor: 'text-yellow-400',
    tendencia: 'up',
    percentualMudanca: 18
  }
];

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const VipDashboard: React.FC<VipDashboardProps> = ({ className }) => {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('mes');

  useEffect(() => {
    // Simular carregamento
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado': return 'text-green-400 bg-green-400/10';
      case 'pendente': return 'text-yellow-400 bg-yellow-400/10';
      case 'em_andamento': return 'text-blue-400 bg-blue-400/10';
      case 'concluido': return 'text-purple-400 bg-purple-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmado': return 'Confirmado';
      case 'pendente': return 'Pendente';
      case 'em_andamento': return 'Em Andamento';
      case 'concluido': return 'Concluído';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="text-yellow-400"
        >
          <Sparkles className="h-12 w-12" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen p-8", className)}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-200 bg-clip-text text-transparent">
              Dashboard VIP
            </h1>
            <p className="text-purple-200/60 mt-2">
              Bem-vinda ao seu espaço exclusivo premium
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              className="bg-white/5 border-purple-200/20 text-purple-200 hover:bg-white/10"
            >
              <Camera className="h-4 w-4 mr-2" />
              Galeria
            </Button>
            
            <Button className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:from-yellow-500 hover:to-yellow-700 shadow-lg shadow-yellow-400/25">
              <MessageCircle className="h-4 w-4 mr-2" />
              Concierge
            </Button>
          </div>
        </motion.div>

        {/* Métricas */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {mockMetricas.map((metrica, index) => {
            const Icon = metrica.icon;
            
            return (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="bg-white/5 border-purple-200/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-200/60 text-sm font-medium">
                          {metrica.label}
                        </p>
                        <p className="text-2xl font-bold text-white mt-1">
                          {metrica.valor}
                        </p>
                        {metrica.tendencia && (
                          <div className="flex items-center mt-2">
                            <TrendingUp className={cn("h-3 w-3 mr-1", metrica.cor)} />
                            <span className={cn("text-xs font-medium", metrica.cor)}>
                              +{metrica.percentualMudanca}%
                            </span>
                          </div>
                        )}
                      </div>
                      <div className={cn("p-2 rounded-lg bg-white/5", metrica.cor)}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Próximos Agendamentos */}
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="lg:col-span-2"
          >
            <Card className="bg-white/5 border-purple-200/10 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-yellow-400" />
                    <CardTitle className="text-white">Próximos Agendamentos</CardTitle>
                    <Badge className="bg-yellow-400/20 text-yellow-300 border-yellow-400/30">
                      {mockAgendamentos.length}
                    </Badge>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-purple-200/60 hover:text-white"
                  >
                    Ver todos
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {mockAgendamentos.map((agendamento, index) => (
                  <motion.div
                    key={agendamento.id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Badge className={getStatusColor(agendamento.status)}>
                            {getStatusLabel(agendamento.status)}
                          </Badge>
                          
                          <span className="text-sm text-purple-200/60">
                            {isToday(agendamento.data) 
                              ? 'Hoje' 
                              : isTomorrow(agendamento.data)
                              ? 'Amanhã'
                              : format(agendamento.data, 'dd/MM/yyyy', { locale: ptBR })
                            } - {agendamento.horario}
                          </span>
                        </div>
                        
                        <h4 className="font-semibold text-white mb-1">
                          {agendamento.servico}
                        </h4>
                        
                        <div className="flex items-center space-x-4 text-sm text-purple-200/60">
                          <div className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            {agendamento.profissional}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {agendamento.sala}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {agendamento.duracao}min
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold text-yellow-400">
                          R$ {agendamento.valor.toLocaleString()}
                        </p>
                        {agendamento.status === 'confirmado' && isToday(agendamento.data) && (
                          <Button
                            size="sm"
                            className="mt-2 bg-yellow-400/20 text-yellow-300 hover:bg-yellow-400/30 border-yellow-400/30"
                            variant="outline"
                          >
                            Check-in
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {agendamento.observacoes && (
                      <div className="mt-3 p-2 bg-yellow-400/10 rounded border border-yellow-400/20">
                        <p className="text-xs text-yellow-300">
                          {agendamento.observacoes}
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar - Créditos e Benefícios */}
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="space-y-6"
          >
            {/* Créditos */}
            <Card className="bg-white/5 border-purple-200/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <CreditCard className="h-5 w-5 mr-2 text-yellow-400" />
                  Meus Créditos
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-gradient-to-r from-yellow-400/20 to-yellow-600/10 rounded-lg border border-yellow-400/30">
                  <p className="text-3xl font-bold text-yellow-400">
                    R$ {mockCreditos.saldo.toLocaleString()}
                  </p>
                  <p className="text-sm text-purple-200/60 mt-1">
                    Saldo disponível
                  </p>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-purple-200/60">Pontos</p>
                    <p className="text-lg font-bold text-white">
                      {mockCreditos.pontos.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-purple-200/60">Cashback</p>
                    <p className="text-lg font-bold text-green-400">
                      R$ {mockCreditos.cashback.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <Separator className="bg-purple-200/10" />
                
                <Button className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black hover:from-yellow-500 hover:to-yellow-700">
                  Usar Créditos
                </Button>
              </CardContent>
            </Card>

            {/* Benefícios VIP */}
            <Card className="bg-white/5 border-purple-200/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Crown className="h-5 w-5 mr-2 text-yellow-400" />
                  Benefícios VIP
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {mockBeneficios.map((beneficio, index) => {
                  const Icon = beneficio.icon;
                  
                  return (
                    <motion.div
                      key={beneficio.id}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="flex items-start space-x-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="p-1 rounded bg-yellow-400/20">
                        <Icon className="h-4 w-4 text-yellow-400" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">
                          {beneficio.titulo}
                        </p>
                        <p className="text-xs text-purple-200/60 mt-1">
                          {beneficio.descricao}
                        </p>
                        
                        {beneficio.progresso && beneficio.meta && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-purple-200/60 mb-1">
                              <span>{beneficio.progresso.toLocaleString()}</span>
                              <span>{beneficio.meta.toLocaleString()}</span>
                            </div>
                            <Progress 
                              value={(beneficio.progresso / beneficio.meta) * 100} 
                              className="h-1"
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-shrink-0">
                        {beneficio.ativo ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default VipDashboard;