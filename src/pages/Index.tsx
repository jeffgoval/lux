import { useState } from "react";
import { Link } from "react-router-dom";
import { Users, Sparkles, Package, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarHeader } from "@/components/CalendarHeader";
import { CalendarFilters } from "@/components/CalendarFilters";
import { DayView } from "@/components/DayView";

// Mock data for appointments
const mockAppointments = [
  {
    id: '1',
    time: '09:00',
    duration: 60,
    client: {
      name: 'Maria Silva',
      phone: '(11) 99999-9999',
      email: 'maria@email.com'
    },
    service: 'Botox',
    professional: 'Dra. Ana Silva',
    status: 'confirmed' as const,
    price: 800,
    notes: 'Primeira aplicação, cliente ansiosa'
  },
  {
    id: '2',
    time: '10:30',
    duration: 90,
    client: {
      name: 'João Santos',
      phone: '(11) 88888-8888',
      email: 'joao@email.com'
    },
    service: 'Preenchimento Labial',
    professional: 'Dr. Carlos Santos',
    status: 'pending' as const,
    price: 1200,
  },
  {
    id: '3',
    time: '14:00',
    duration: 45,
    client: {
      name: 'Ana Costa',
      phone: '(11) 77777-7777',
      email: 'ana@email.com'
    },
    service: 'Limpeza de Pele',
    professional: 'Marina Costa',
    status: 'confirmed' as const,
    price: 300,
  },
  {
    id: '4',
    time: '16:00',
    duration: 120,
    client: {
      name: 'Carlos Oliveira',
      phone: '(11) 66666-6666',
      email: 'carlos@email.com'
    },
    service: 'Drenagem Linfática',
    professional: 'Júlia Ferreira',
    status: 'completed' as const,
    price: 450,
  }
];

const Index = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'day' | 'week' | 'month'>('day');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleNewAppointment = () => {
    console.log('Novo agendamento');
  };

  const handleEditAppointment = (appointment: any) => {
    console.log('Editar agendamento:', appointment);
  };

  const handleDeleteAppointment = (id: string) => {
    console.log('Deletar agendamento:', id);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-elegant">
                <img 
                  src="/lovable-uploads/d7b20c64-f4e9-410c-bb8e-0b9d3434c239.png" 
                  alt="Logo" 
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <h1 className="heading-premium text-2xl text-foreground">
                  Sistema de Agendamento Premium
                </h1>
                <p className="text-premium">
                  Clínica Estética de Alto Padrão
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Link to="/clientes">
                <Button className="btn-premium">
                  <Users className="w-4 h-4 mr-2" />
                  Gestão de Clientes
                </Button>
              </Link>
              <Link to="/servicos">
                <Button variant="outline" className="border-primary/20 hover:bg-primary/5">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Serviços
                </Button>
              </Link>
              <Link to="/produtos">
                <Button variant="outline" className="border-primary/20 hover:bg-primary/5">
                  <Package className="w-4 h-4 mr-2" />
                  Produtos
                </Button>
              </Link>
              <Link to="/equipamentos">
                <Button variant="outline" className="border-primary/20 hover:bg-primary/5">
                  <Wrench className="w-4 h-4 mr-2" />
                  Equipamentos
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Calendar Header */}
        <CalendarHeader
          currentDate={currentDate}
          viewType={viewType}
          onDateChange={setCurrentDate}
          onViewChange={setViewType}
          onNewAppointment={handleNewAppointment}
          onToggleFilters={() => setFiltersOpen(!filtersOpen)}
          filtersActive={filtersOpen}
        />

        {/* Main Content */}
        <div className="animate-fade-in">
          {viewType === 'day' && (
            <DayView
              date={currentDate}
              appointments={mockAppointments}
              onEditAppointment={handleEditAppointment}
              onDeleteAppointment={handleDeleteAppointment}
            />
          )}
          
          {viewType === 'week' && (
            <div className="glass-effect rounded-2xl p-8 text-center">
              <h3 className="heading-premium text-lg mb-2">Visão Semanal</h3>
              <p className="text-premium">Em desenvolvimento - Visualização semanal com slots detalhados</p>
            </div>
          )}
          
          {viewType === 'month' && (
            <div className="glass-effect rounded-2xl p-8 text-center">
              <h3 className="heading-premium text-lg mb-2">Visão Mensal</h3>
              <p className="text-premium">Em desenvolvimento - Calendário mensal com percentual de ocupação</p>
            </div>
          )}
        </div>

        {/* Filters Panel */}
        <CalendarFilters
          isOpen={filtersOpen}
          onClose={() => setFiltersOpen(false)}
        />

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-premium text-sm">
            Sistema desenvolvido para clínicas estéticas premium
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;