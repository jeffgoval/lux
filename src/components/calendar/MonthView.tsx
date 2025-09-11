import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface Appointment {
  id: string
  clienteNome: string
  servico: string
  horario: string
  medico: string
  status: 'confirmado' | 'pendente' | 'cancelado'
  data: string
}

interface MonthViewProps {
  currentDate: Date
  appointments: Appointment[]
  onEditAppointment: (appointment: Appointment) => void
  onDeleteAppointment: (id: string) => void
  onNewAppointment: (date: Date) => void
}

export function MonthView({ 
  currentDate, 
  appointments, 
  onEditAppointment, 
  onDeleteAppointment, 
  onNewAppointment 
}: MonthViewProps) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { locale: ptBR })
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR })
  
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  })

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(apt => isSameDay(new Date(apt.data), date))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado': return 'bg-success/10 text-success'
      case 'pendente': return 'bg-warning/10 text-warning'
      case 'cancelado': return 'bg-destructive/10 text-destructive'
      default: return 'bg-muted'
    }
  }

  return (
    <div className="space-y-4">
      {/* Header dos dias da semana */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
            {day}
          </div>
        ))}
      </div>

      {/* Grid do calendário */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day, index) => {
          const dayAppointments = getAppointmentsForDay(day)
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isDayToday = isToday(day)
          
          return (
            <Card 
              key={index}
              className={cn(
                "min-h-[120px] p-2 cursor-pointer hover:shadow-md transition-all",
                !isCurrentMonth && "opacity-40",
                isDayToday && "ring-2 ring-primary"
              )}
              onClick={() => onNewAppointment(day)}
            >
              <div className="space-y-2">
                {/* Data */}
                <div className={cn(
                  "text-sm font-medium",
                  isDayToday ? "text-primary font-bold" : "text-foreground"
                )}>
                  {format(day, "d")}
                </div>

                {/* Agendamentos */}
                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map((appointment) => (
                    <div
                      key={appointment.id}
                      className={cn(
                        "text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity",
                        getStatusColor(appointment.status)
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditAppointment(appointment)
                      }}
                    >
                      <div className="font-medium truncate">{appointment.horario}</div>
                      <div className="truncate">{appointment.clienteNome}</div>
                    </div>
                  ))}
                  
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{dayAppointments.length - 3} mais
                    </div>
                  )}
                </div>

                {/* Botão para novo agendamento (aparece no hover) */}
                {dayAppointments.length === 0 && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" className="w-full text-xs">
                      + Novo
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-success/20"></div>
          <span>Confirmado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-warning/20"></div>
          <span>Pendente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-destructive/20"></div>
          <span>Cancelado</span>
        </div>
      </div>
    </div>
  )
}