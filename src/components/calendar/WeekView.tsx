import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format, startOfWeek, addDays, isSameDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Clock, User, Stethoscope } from "lucide-react"

interface Appointment {
  id: string
  clienteNome: string
  servico: string
  horario: string
  medico: string
  status: 'confirmado' | 'pendente' | 'cancelado'
  data: string
}

interface WeekViewProps {
  currentDate: Date
  appointments: Appointment[]
  onEditAppointment: (appointment: Appointment) => void
  onDeleteAppointment: (id: string) => void
  onNewAppointment: (date: Date, time?: string) => void
}

export function WeekView({ 
  currentDate, 
  appointments, 
  onEditAppointment, 
  onDeleteAppointment, 
  onNewAppointment 
}: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { locale: ptBR })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  
  const timeSlots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30", "18:00"
  ]

  const getAppointmentsForDateTime = (date: Date, time: string) => {
    return appointments.filter(apt => 
      isSameDay(new Date(apt.data), date) && apt.horario === time
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado': return 'bg-success/10 text-success border-success/20'
      case 'pendente': return 'bg-warning/10 text-warning border-warning/20'
      case 'cancelado': return 'bg-destructive/10 text-destructive border-destructive/20'
      default: return 'bg-muted'
    }
  }

  return (
    <div className="space-y-4">
      {/* Header dos dias */}
      <div className="grid grid-cols-8 gap-2">
        <div className="h-16"></div> {/* Espaço para a coluna de horários */}
        {weekDays.map((day, index) => (
          <Card key={index} className="p-3 text-center">
            <div className="text-sm text-muted-foreground">
              {format(day, "EEE", { locale: ptBR })}
            </div>
            <div className="text-lg font-semibold">
              {format(day, "dd", { locale: ptBR })}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(day, "MMM", { locale: ptBR })}
            </div>
          </Card>
        ))}
      </div>

      {/* Grid de horários */}
      <div className="grid grid-cols-8 gap-2">
        {/* Coluna de horários */}
        <div className="space-y-2">
          {timeSlots.map((time) => (
            <div 
              key={time} 
              className="h-20 flex items-center justify-center text-sm text-muted-foreground font-medium border-r"
            >
              {time}
            </div>
          ))}
        </div>

        {/* Colunas dos dias */}
        {weekDays.map((day, dayIndex) => (
          <div key={dayIndex} className="space-y-2">
            {timeSlots.map((time) => {
              const dayAppointments = getAppointmentsForDateTime(day, time)
              
              return (
                <div 
                  key={time}
                  className="h-20 border border-border rounded-lg p-1 relative group hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => dayAppointments.length === 0 && onNewAppointment(day, time)}
                >
                  {dayAppointments.length === 0 ? (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center h-full">
                      <Button size="sm" variant="ghost" className="text-xs">
                        + Novo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {dayAppointments.map((appointment) => (
                        <Card 
                          key={appointment.id}
                          className={`p-2 text-xs ${getStatusColor(appointment.status)} cursor-pointer hover:shadow-md transition-all`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditAppointment(appointment)
                          }}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="font-medium truncate">{appointment.clienteNome}</span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Stethoscope className="h-3 w-3" />
                              <span className="truncate">{appointment.servico}</span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{appointment.horario}</span>
                            </div>

                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getStatusColor(appointment.status)}`}
                            >
                              {appointment.status}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}