import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Scissors, Phone, Mail, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Appointment {
  id: string;
  time: string;
  duration: number;
  client: {
    name: string;
    phone: string;
    email: string;
  };
  service: string;
  professional: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  price: number;
  notes?: string;
}

interface DayViewProps {
  date: Date;
  appointments: Appointment[];
  onEditAppointment: (appointment: Appointment) => void;
  onDeleteAppointment: (id: string) => void;
}

export const DayView = ({ date, appointments, onEditAppointment, onDeleteAppointment }: DayViewProps) => {
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  // Generate time slots from 8:00 to 20:00
  const timeSlots = [];
  for (let hour = 8; hour <= 20; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 20) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success text-success-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'completed': return 'bg-muted text-muted-foreground';
      case 'cancelled': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'pending': return 'Pendente';
      case 'completed': return 'Finalizado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getAppointmentAtTime = (time: string) => {
    return appointments.find(apt => apt.time === time);
  };

  const isTimeBlocked = (time: string) => {
    // Example: lunch break and other blocked times
    const [hour] = time.split(':').map(Number);
    return hour === 12 || hour === 13; // Lunch break
  };

  return (
    <div className="space-y-4">
      {/* Date Header */}
      <div className="glass-effect rounded-xl p-4">
        <h2 className="heading-premium text-lg">
          {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </h2>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-2 text-sm text-warm">
            <Clock className="h-4 w-4" />
            {appointments.length} agendamentos
          </div>
          <div className="flex items-center gap-2 text-sm text-premium">
            Taxa de ocupação: {Math.round((appointments.length / 24) * 100)}%
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="glass-effect rounded-xl p-6">
        <div className="space-y-2">
          {timeSlots.map((time) => {
            const appointment = getAppointmentAtTime(time);
            const blocked = isTimeBlocked(time);

            return (
              <div
                key={time}
                className={`flex items-center gap-4 p-3 rounded-lg border transition-all duration-200 ${
                  blocked 
                    ? 'bg-muted/50 border-muted cursor-not-allowed' 
                    : appointment 
                      ? 'bg-background border-border hover:shadow-soft cursor-pointer' 
                      : 'bg-background/50 border-border/50 hover:bg-background hover:border-border cursor-pointer'
                }`}
                onClick={() => !blocked && !appointment && setSelectedTime(time)}
              >
                <div className="w-16 text-sm font-medium text-warm">
                  {time}
                </div>

                {blocked ? (
                  <div className="flex-1 flex items-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 bg-muted rounded-full" />
                    <span className="text-sm">Horário bloqueado</span>
                  </div>
                ) : appointment ? (
                  <div className="flex-1 bg-card rounded-lg p-4 border border-border hover-elegant">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-foreground">{appointment.client.name}</h3>
                          <Badge className={getStatusColor(appointment.status)}>
                            {getStatusLabel(appointment.status)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-premium">
                          <div className="flex items-center gap-2">
                            <Scissors className="h-4 w-4 text-primary" />
                            {appointment.service}
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            {appointment.professional}
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-primary" />
                            {appointment.client.phone}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            {appointment.duration} min
                          </div>
                        </div>

                        {appointment.notes && (
                          <div className="mt-3 p-2 bg-muted/50 rounded-md">
                            <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <div className="text-right">
                          <div className="font-medium text-primary">
                            R$ {appointment.price.toFixed(2).replace('.', ',')}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditAppointment(appointment);
                            }}
                            className="h-8 w-8 hover:bg-primary-light/20"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteAppointment(appointment.id);
                            }}
                            className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center gap-2 text-muted-foreground">
                    <div className="w-2 h-2 bg-muted rounded-full" />
                    <span className="text-sm">Horário disponível</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass-effect rounded-xl p-4 text-center">
          <div className="text-2xl font-medium text-primary">
            {appointments.filter(a => a.status === 'confirmed').length}
          </div>
          <div className="text-sm text-premium">Confirmados</div>
        </div>
        <div className="glass-effect rounded-xl p-4 text-center">
          <div className="text-2xl font-medium text-warning">
            {appointments.filter(a => a.status === 'pending').length}
          </div>
          <div className="text-sm text-premium">Pendentes</div>
        </div>
        <div className="glass-effect rounded-xl p-4 text-center">
          <div className="text-2xl font-medium text-success">
            {appointments.filter(a => a.status === 'completed').length}
          </div>
          <div className="text-sm text-premium">Finalizados</div>
        </div>
        <div className="glass-effect rounded-xl p-4 text-center">
          <div className="text-2xl font-medium text-primary">
            R$ {appointments.reduce((sum, apt) => sum + apt.price, 0).toFixed(2).replace('.', ',')}
          </div>
          <div className="text-sm text-premium">Total do Dia</div>
        </div>
      </div>
    </div>
  );
};