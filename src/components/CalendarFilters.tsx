import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Search, User, Scissors, Clock, DollarSign } from "lucide-react";
import { useState } from "react";

interface CalendarFiltersProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FilterState {
  professional: string;
  service: string;
  status: string;
  timeRange: string;
  priceRange: string;
  search: string;
}

export const CalendarFilters = ({ isOpen, onClose }: CalendarFiltersProps) => {
  const [filters, setFilters] = useState<FilterState>({
    professional: '',
    service: '',
    status: '',
    timeRange: '',
    priceRange: '',
    search: ''
  });

  const professionals = [
    { id: 'ana', name: 'Dra. Ana Silva', specialty: 'Dermatologista' },
    { id: 'carlos', name: 'Dr. Carlos Santos', specialty: 'Cirurgião Plástico' },
    { id: 'marina', name: 'Marina Costa', specialty: 'Esteticista' },
    { id: 'julia', name: 'Júlia Ferreira', specialty: 'Fisioterapeuta' }
  ];

  const services = [
    'Botox',
    'Preenchimento',
    'Limpeza de Pele',
    'Peeling',
    'Laser',
    'Massagem',
    'Drenagem Linfática'
  ];

  const statuses = [
    { value: 'confirmed', label: 'Confirmado', color: 'bg-success' },
    { value: 'pending', label: 'Pendente', color: 'bg-warning' },
    { value: 'cancelled', label: 'Cancelado', color: 'bg-destructive' },
    { value: 'completed', label: 'Finalizado', color: 'bg-muted' }
  ];

  const clearFilters = () => {
    setFilters({
      professional: '',
      service: '',
      status: '',
      timeRange: '',
      priceRange: '',
      search: ''
    });
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-fade-in">
      <div className="fixed right-0 top-0 h-full w-96 bg-background border-l border-border shadow-premium animate-slide-up">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="heading-premium text-lg">Filtros Avançados</h2>
              <p className="text-premium text-sm">
                {activeFiltersCount > 0 ? `${activeFiltersCount} filtros ativos` : 'Nenhum filtro ativo'}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto h-[calc(100%-140px)]">
          {/* Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-warm">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nome do cliente, observações..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          {/* Professional Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-warm flex items-center gap-2">
              <User className="h-4 w-4" />
              Profissional
            </label>
            <Select value={filters.professional} onValueChange={(value) => setFilters({ ...filters, professional: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um profissional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((prof) => (
                  <SelectItem key={prof.id} value={prof.id}>
                    <div>
                      <div className="font-medium">{prof.name}</div>
                      <div className="text-xs text-muted-foreground">{prof.specialty}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-warm flex items-center gap-2">
              <Scissors className="h-4 w-4" />
              Serviço
            </label>
            <Select value={filters.service} onValueChange={(value) => setFilters({ ...filters, service: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service} value={service.toLowerCase()}>
                    {service}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-warm">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {statuses.map((status) => (
                <Button
                  key={status.value}
                  variant={filters.status === status.value ? "premium" : "outline"}
                  size="sm"
                  onClick={() => setFilters({ 
                    ...filters, 
                    status: filters.status === status.value ? '' : status.value 
                  })}
                  className="justify-start"
                >
                  <div className={`w-2 h-2 rounded-full ${status.color} mr-2`} />
                  {status.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Time Range Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-warm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horário
            </label>
            <Select value={filters.timeRange} onValueChange={(value) => setFilters({ ...filters, timeRange: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Manhã (08:00 - 12:00)</SelectItem>
                <SelectItem value="afternoon">Tarde (12:00 - 18:00)</SelectItem>
                <SelectItem value="evening">Noite (18:00 - 22:00)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price Range Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-warm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Faixa de Preço
            </label>
            <Select value={filters.priceRange} onValueChange={(value) => setFilters({ ...filters, priceRange: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma faixa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-200">R$ 0 - R$ 200</SelectItem>
                <SelectItem value="200-500">R$ 200 - R$ 500</SelectItem>
                <SelectItem value="500-1000">R$ 500 - R$ 1.000</SelectItem>
                <SelectItem value="1000+">R$ 1.000+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters */}
          {activeFiltersCount > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-warm">Filtros Ativos</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(filters).map(([key, value]) => {
                  if (!value) return null;
                  return (
                    <Badge key={key} variant="secondary" className="bg-primary-light/20 text-primary-dark">
                      {key === 'professional' && professionals.find(p => p.id === value)?.name}
                      {key === 'service' && services.find(s => s.toLowerCase() === value)}
                      {key === 'status' && statuses.find(s => s.value === value)?.label}
                      {key === 'timeRange' && value}
                      {key === 'priceRange' && value}
                      {key === 'search' && `"${value}"`}
                      <X 
                        className="h-3 w-3 ml-1 cursor-pointer" 
                        onClick={() => setFilters({ ...filters, [key]: '' })}
                      />
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t border-border">
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={clearFilters}>
              Limpar Tudo
            </Button>
            <Button variant="premium" className="flex-1" onClick={onClose}>
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};