import { useState } from "react";
import { Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarHeader } from "@/components/CalendarHeader";
import { CalendarFilters } from "@/components/CalendarFilters";
import { DayView } from "@/components/DayView";
import { WeekView } from "@/components/calendar/WeekView";
import { MonthView } from "@/components/calendar/MonthView";
import { NovoAgendamentoModal } from "@/components/modals/NovoAgendamentoModal";

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
  const [novoAgendamentoOpen, setNovoAgendamentoOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();

  const handleNewAppointment = (date?: Date, time?: string) => {
    setSelectedDate(date || currentDate);
    setSelectedTime(time);
    setNovoAgendamentoOpen(true);
  };

  const handleEditAppointment = (appointment: any) => {
    console.log('Editar agendamento:', appointment);
  };

  const handleDeleteAppointment = (id: string) => {
    console.log('Deletar agendamento:', id);
  };

  // Converter mock appointments para o formato esperado pelos componentes
  const convertedAppointments = mockAppointments.map(apt => ({
    id: apt.id,
    clienteNome: apt.client.name,
    servico: apt.service,
    horario: apt.time,
    medico: apt.professional,
    status: apt.status as 'confirmado' | 'pendente' | 'cancelado',
    data: currentDate.toISOString()
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold heading-premium">Agenda</h1>
          <p className="text-muted-foreground">Gerencie agendamentos e consultas</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Filter className="h-4 w-4" />
          </Button>
          <Button onClick={() => handleNewAppointment()} variant="premium">
            <Plus className="w-4 h-4 mr-2" />
            Novo Agendamento
          </Button>
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
            onGoToToday={() => setCurrentDate(new Date())}
          />
        )}
        
        {viewType === 'week' && (
          <WeekView
            currentDate={currentDate}
            appointments={convertedAppointments}
            onEditAppointment={handleEditAppointment}
            onDeleteAppointment={handleDeleteAppointment}
            onNewAppointment={handleNewAppointment}
          />
        )}
        
        {viewType === 'month' && (
          <MonthView
            currentDate={currentDate}
            appointments={convertedAppointments}
            onEditAppointment={handleEditAppointment}
            onDeleteAppointment={handleDeleteAppointment}
            onNewAppointment={handleNewAppointment}
          />
        )}
      </div>

      {/* Filters Panel */}
      <CalendarFilters
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
      />

      {/* Modal de Novo Agendamento */}
      <NovoAgendamentoModal
        open={novoAgendamentoOpen}
        onOpenChange={setNovoAgendamentoOpen}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
      />
    </div>
  );
};

export default Index;