/**
 * VipLayout - Layout Exclusivo para Clientes VIP
 * Design premium com tema luxuoso e animações sofisticadas
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Crown, 
  Sparkles, 
  Bell, 
  Settings, 
  User, 
  LogOut,
  MessageCircle,
  Calendar,
  CreditCard,
  Gift,
  Star
} from 'lucide-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// =====================================================
// INTERFACES
// =====================================================

interface VipLayoutProps {
  children?: React.ReactNode;
}

interface VipNavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
  badge?: string;
  premium?: boolean;
}

interface VipClient {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  categoria: 'vip' | 'premium';
  avatar?: string;
  creditos: number;
  pontos: number;
  proximoAgendamento?: Date;
  nivelVip: 'Gold' | 'Platinum' | 'Diamond';
}

// =====================================================
// DADOS MOCK (substituir por dados reais)
// =====================================================

const mockVipClient: VipClient = {
  id: '1',
  nome: 'Dra. Ana Carolina Silva',
  email: 'ana.silva@email.com',
  telefone: '(11) 99999-9999',
  categoria: 'premium',
  creditos: 1250.00,
  pontos: 8750,
  proximoAgendamento: new Date('2024-01-20T14:00:00'),
  nivelVip: 'Platinum'
};

const vipNavigation: VipNavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Crown,
    path: '/vip',
    premium: true
  },
  {
    id: 'agendamentos',
    label: 'Meus Agendamentos',
    icon: Calendar,
    path: '/vip/agendamentos'
  },
  {
    id: 'creditos',
    label: 'Créditos & Pontos',
    icon: CreditCard,
    path: '/vip/creditos',
    badge: 'R$ 1.250'
  },
  {
    id: 'concierge',
    label: 'Concierge Virtual',
    icon: MessageCircle,
    path: '/vip/concierge',
    badge: '24h',
    premium: true
  },
  {
    id: 'beneficios',
    label: 'Benefícios VIP',
    icon: Gift,
    path: '/vip/beneficios',
    premium: true
  },
  {
    id: 'historico',
    label: 'Histórico Premium',
    icon: Star,
    path: '/vip/historico'
  }
];

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const VipLayout: React.FC<VipLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = React.useState(3);
  
  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    // Implementar logout
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-[url('/patterns/luxury-pattern.svg')] opacity-5" />
      
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed left-0 top-0 z-40 h-screen w-80 border-r border-purple-200/10 bg-black/40 backdrop-blur-xl"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-purple-200/10 p-6">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center space-x-3"
            >
              <div className="relative">
                <Crown className="h-8 w-8 text-yellow-400" />
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles className="h-4 w-4 text-yellow-300" />
                </motion.div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">
                  Luxe VIP
                </h1>
                <p className="text-xs text-purple-200/60">Experiência Premium</p>
              </div>
            </motion.div>
          </div>

          {/* Perfil do Cliente */}
          <div className="p-6 border-b border-purple-200/10">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center space-x-4"
            >
              <Avatar className="h-12 w-12 ring-2 ring-yellow-400/50">
                <AvatarImage src={mockVipClient.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-black font-semibold">
                  {mockVipClient.nome.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {mockVipClient.nome}
                </p>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="secondary" 
                    className="bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 text-yellow-300 border-yellow-400/30"
                  >
                    <Crown className="w-3 h-3 mr-1" />
                    {mockVipClient.nivelVip}
                  </Badge>
                </div>
                <p className="text-xs text-purple-200/60 truncate">
                  {mockVipClient.pontos.toLocaleString()} pontos
                </p>
              </div>
            </motion.div>
          </div>

          {/* Navegação */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {vipNavigation.map((item, index) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                
                return (
                  <motion.div
                    key={item.id}
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start h-12 text-left font-medium transition-all duration-200",
                        isActive 
                          ? "bg-gradient-to-r from-yellow-400/20 to-yellow-600/10 text-yellow-300 border-yellow-400/30 shadow-lg shadow-yellow-400/10" 
                          : "text-purple-200/80 hover:text-white hover:bg-white/5",
                        item.premium && "relative overflow-hidden"
                      )}
                      onClick={() => handleNavigation(item.path)}
                    >
                      {item.premium && (
                        <motion.div
                          animate={{ x: [-100, 300] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent"
                        />
                      )}
                      
                      <Icon className={cn(
                        "mr-3 h-5 w-5",
                        item.premium && "text-yellow-400"
                      )} />
                      
                      <span className="flex-1">{item.label}</span>
                      
                      {item.badge && (
                        <Badge 
                          variant="outline" 
                          className="ml-auto bg-purple-500/20 text-purple-200 border-purple-400/30 text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                      
                      {item.premium && (
                        <Sparkles className="ml-2 h-3 w-3 text-yellow-400" />
                      )}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-purple-200/10 p-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-purple-200/60 hover:text-white"
              >
                <Settings className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm" 
                className="text-purple-200/60 hover:text-white relative"
              >
                <Bell className="h-4 w-4" />
                {notifications > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
                    {notifications}
                  </Badge>
                )}
              </Button>
              
              <div className="flex-1" />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-purple-200/60 hover:text-red-400"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="ml-80">
        <div className="min-h-screen">
          {children || <Outlet />}
        </div>
      </main>

      {/* Floating Premium Indicator */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-4 py-2 rounded-full shadow-lg shadow-yellow-400/25 flex items-center space-x-2">
          <Crown className="h-4 w-4" />
          <span className="text-sm font-semibold">VIP Ativo</span>
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="h-4 w-4" />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default VipLayout;