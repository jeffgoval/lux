import { X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FiltrosCliente, CategoriaCliente } from "@/types/cliente";

interface ClienteFiltersProps {
  isOpen: boolean;
  filtros: FiltrosCliente;
  onFiltrosChange: (filtros: FiltrosCliente) => void;
  onClose: () => void;
}

export const ClienteFilters = ({ isOpen, filtros, onFiltrosChange, onClose }: ClienteFiltersProps) => {
  if (!isOpen) return null;

  const categorias: { value: CategoriaCliente; label: string; color: string }[] = [
    { value: 'vip', label: 'VIP', color: 'bg-warning text-warning-foreground' },
    { value: 'ativo', label: 'Ativo', color: 'bg-success text-success-foreground' },
    { value: 'risco', label: 'Em Risco', color: 'bg-destructive text-destructive-foreground' },
    { value: 'novo', label: 'Novo', color: 'bg-primary text-primary-foreground' },
    { value: 'sazonal', label: 'Sazonal', color: 'bg-accent text-accent-foreground' },
    { value: 'indicador', label: 'Indicador', color: 'bg-secondary text-secondary-foreground' },
  ];

  const tags = [
    { id: '1', nome: 'VIP', cor: '#FFD700' },
    { id: '2', nome: 'Pontual', cor: '#10B981' },
    { id: '3', nome: 'Indicadora', cor: '#8B5CF6' },
    { id: '4', nome: 'Pele Oleosa', cor: '#F59E0B' },
    { id: '5', nome: 'Em Risco', cor: '#EF4444' },
    { id: '6', nome: 'Pele Seca', cor: '#06B6D4' },
    { id: '7', nome: 'Novo Cliente', cor: '#22C55E' },
    { id: '8', nome: 'Pele Sensível', cor: '#F97316' },
  ];

  const handleCategoriaChange = (categoria: CategoriaCliente, checked: boolean) => {
    const currentCategorias = filtros.categoria || [];
    if (checked) {
      onFiltrosChange({
        ...filtros,
        categoria: [...currentCategorias, categoria]
      });
    } else {
      onFiltrosChange({
        ...filtros,
        categoria: currentCategorias.filter(c => c !== categoria)
      });
    }
  };

  const handleTagChange = (tagId: string, checked: boolean) => {
    const currentTags = filtros.tags || [];
    if (checked) {
      onFiltrosChange({
        ...filtros,
        tags: [...currentTags, tagId]
      });
    } else {
      onFiltrosChange({
        ...filtros,
        tags: currentTags.filter(t => t !== tagId)
      });
    }
  };

  const clearAllFilters = () => {
    onFiltrosChange({});
  };

  const hasActiveFilters = Object.keys(filtros).some(key => {
    const value = filtros[key as keyof FiltrosCliente];
    return Array.isArray(value) ? value.length > 0 : !!value;
  });

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-fade-in">
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l border-border shadow-elegant overflow-y-auto animate-slide-in-right">
        <Card className="h-full rounded-none border-0">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary" />
                <CardTitle className="heading-premium">Filtros Avançados</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Filtros ativos
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-8 text-xs"
                >
                  Limpar tudo
                </Button>
              </div>
            )}

            {/* Categorias */}
            <div className="space-y-4">
              <h3 className="heading-premium text-sm">Categoria do Cliente</h3>
              <div className="space-y-3">
                {categorias.map((categoria) => (
                  <div key={categoria.value} className="flex items-center space-x-3">
                    <Checkbox
                      id={categoria.value}
                      checked={(filtros.categoria || []).includes(categoria.value)}
                      onCheckedChange={(checked) => 
                        handleCategoriaChange(categoria.value, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={categoria.value}
                      className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                    >
                      <Badge className={`${categoria.color} text-xs`}>
                        {categoria.label}
                      </Badge>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-4">
              <h3 className="heading-premium text-sm">Tags</h3>
              <div className="space-y-3">
                {tags.map((tag) => (
                  <div key={tag.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={tag.id}
                      checked={(filtros.tags || []).includes(tag.id)}
                      onCheckedChange={(checked) => 
                        handleTagChange(tag.id, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={tag.id}
                      className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                    >
                      <Badge
                        variant="outline"
                        style={{ borderColor: tag.cor, color: tag.cor }}
                        className="text-xs"
                      >
                        {tag.nome}
                      </Badge>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Period Filter Placeholder */}
            <div className="space-y-4">
              <h3 className="heading-premium text-sm">Último Atendimento</h3>
              <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
                Filtros de período em desenvolvimento
              </div>
            </div>

            {/* LTV Filter Placeholder */}
            <div className="space-y-4">
              <h3 className="heading-premium text-sm">Lifetime Value (LTV)</h3>
              <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
                Filtros de valor em desenvolvimento
              </div>
            </div>
          </CardContent>

          {/* Apply Button */}
          <div className="border-t border-border p-6">
            <Button
              onClick={onClose}
              className="w-full btn-premium"
            >
              Aplicar Filtros
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};