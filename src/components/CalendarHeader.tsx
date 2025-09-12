import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Filter, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CalendarHeaderProps {
  currentDate: Date;
  viewType: 'day' | 'week' | 'month';
  onDateChange: (date: Date) => void;
  onViewChange: (view: 'day' | 'week' | 'month') => void;
  onNewAppointment: () => void;
  onToggleFilters: () => void;
  filtersActive: boolean;
}

export const CalendarHeader = ({
  currentDate,
  viewType,
  onDateChange,
  onViewChange,
  onNewAppointment,
  onToggleFilters,
  filtersActive
}: CalendarHeaderProps) => {
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (viewType) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    onDateChange(newDate);
  };

  const getDateTitle = () => {
    switch (viewType) {
      case 'day':
        return format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
      case 'week':
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${format(weekStart, "d 'de' MMM", { locale: ptBR })} - ${format(weekEnd, "d 'de' MMM 'de' yyyy", { locale: ptBR })}`;
      case 'month':
        return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
      default:
        return '';
    }
  };

  return (
    <div className="glass-effect rounded-2xl p-6 mb-6 animate-fade-in">
      <div className="flex items-center justify-between">
        {/* Date Navigation */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="elegant"
              size="icon"
              onClick={() => navigateDate('prev')}
              className="hover:scale-105"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="min-w-[300px] text-center">
              <h1 className="heading-premium text-xl capitalize">
                {getDateTitle()}
              </h1>
            </div>
            
            <Button
              variant="elegant"
              size="icon"
              onClick={() => navigateDate('next')}
              className="hover:scale-105"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {viewType !== 'day' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateChange(new Date())}
              className="text-warm hover:text-primary-dark"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Hoje
            </Button>
          )}
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-muted p-1">
            {(['day', 'week', 'month'] as const).map((view) => (
              <Button
                key={view}
                variant={viewType === view ? "premium" : "ghost"}
                size="sm"
                onClick={() => onViewChange(view)}
                className={`px-4 ${viewType === view ? 'shadow-soft' : ''}`}
              >
                {view === 'day' ? 'Dia' : view === 'week' ? 'Semana' : 'Mês'}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};