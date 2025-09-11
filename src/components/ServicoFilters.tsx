import { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { FiltrosServico, CategoriaServico, StatusServico, NivelComplexidade } from '@/types/servico';
import { CategoriaInfo } from '@/types/servico';

interface ServicoFiltersProps {
  filtros: FiltrosServico;
  onFiltrosChange: (filtros: FiltrosServico) => void;
  categorias: (CategoriaInfo & { total: number })[];
}

const statusOptions: { value: StatusServico; label: string; color: string }[] = [
  { value: 'ativo', label: 'Ativo', color: 'hsl(120, 50%, 50%)' },
  { value: 'inativo', label: 'Inativo', color: 'hsl(0, 50%, 50%)' },
  { value: 'sazonal', label: 'Sazonal', color: 'hsl(60, 70%, 50%)' },
  { value: 'descontinuado', label: 'Descontinuado', color: 'hsl(0, 0%, 50%)' }
];

const complexidadeOptions: { value: NivelComplexidade; label: string; color: string }[] = [
  { value: 'basico', label: 'Básico', color: 'hsl(120, 50%, 50%)' },
  { value: 'intermediario', label: 'Intermediário', color: 'hsl(60, 70%, 50%)' },
  { value: 'avancado', label: 'Avançado', color: 'hsl(30, 70%, 50%)' },
  { value: 'premium', label: 'Premium', color: 'hsl(340, 70%, 50%)' }
];

export default function ServicoFilters({ filtros, onFiltrosChange, categorias }: ServicoFiltersProps) {
  const [secaoAberta, setSecaoAberta] = useState<string[]>(['categorias', 'status']);

  const toggleSecao = (secao: string) => {
    setSecaoAberta(prev => 
      prev.includes(secao) 
        ? prev.filter(s => s !== secao)
        : [...prev, secao]
    );
  };

  const handleCategoriaChange = (categoria: CategoriaServico, checked: boolean) => {
    const novasCategorias = checked
      ? [...(filtros.categoria || []), categoria]
      : (filtros.categoria || []).filter(c => c !== categoria);
    
    onFiltrosChange({
      ...filtros,
      categoria: novasCategorias.length > 0 ? novasCategorias : undefined
    });
  };

  const handleStatusChange = (status: StatusServico, checked: boolean) => {
    const novosStatus = checked
      ? [...(filtros.status || []), status]
      : (filtros.status || []).filter(s => s !== status);
    
    onFiltrosChange({
      ...filtros,
      status: novosStatus.length > 0 ? novosStatus : undefined
    });
  };

  const handleComplexidadeChange = (complexidade: NivelComplexidade, checked: boolean) => {
    const novasComplexidades = checked
      ? [...(filtros.complexidade || []), complexidade]
      : (filtros.complexidade || []).filter(c => c !== complexidade);
    
    onFiltrosChange({
      ...filtros,
      complexidade: novasComplexidades.length > 0 ? novasComplexidades : undefined
    });
  };

  const handlePrecoChange = (valores: number[]) => {
    onFiltrosChange({
      ...filtros,
      faixaPreco: {
        min: valores[0],
        max: valores[1]
      }
    });
  };

  const handleDuracaoChange = (valores: number[]) => {
    onFiltrosChange({
      ...filtros,
      duracao: {
        min: valores[0],
        max: valores[1]
      }
    });
  };

  const handleSazonalChange = (checked: boolean) => {
    onFiltrosChange({
      ...filtros,
      sazonal: checked ? true : undefined
    });
  };

  const limparFiltros = () => {
    onFiltrosChange({});
  };

  const contarFiltrosAtivos = () => {
    let count = 0;
    if (filtros.categoria?.length) count++;
    if (filtros.status?.length) count++;
    if (filtros.complexidade?.length) count++;
    if (filtros.faixaPreco) count++;
    if (filtros.duracao) count++;
    if (filtros.sazonal) count++;
    return count;
  };

  const filtrosAtivos = contarFiltrosAtivos();

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <CardTitle className="text-base">Filtros</CardTitle>
            {filtrosAtivos > 0 && (
              <Badge variant="secondary" className="text-xs">
                {filtrosAtivos}
              </Badge>
            )}
          </div>
          {filtrosAtivos > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={limparFiltros}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Categorias */}
        <Collapsible 
          open={secaoAberta.includes('categorias')}
          onOpenChange={() => toggleSecao('categorias')}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors">
            <span>Categorias</span>
            {secaoAberta.includes('categorias') ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-3">
            {categorias.map(categoria => (
              <div key={categoria.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`categoria-${categoria.id}`}
                    checked={filtros.categoria?.includes(categoria.id) || false}
                    onCheckedChange={(checked) => 
                      handleCategoriaChange(categoria.id, checked as boolean)
                    }
                  />
                  <label 
                    htmlFor={`categoria-${categoria.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                  >
                    <span>{categoria.icone}</span>
                    <span>{categoria.nome}</span>
                  </label>
                </div>
                <Badge variant="outline" className="text-xs">
                  {categoria.total}
                </Badge>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Status */}
        <Collapsible 
          open={secaoAberta.includes('status')}
          onOpenChange={() => toggleSecao('status')}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors">
            <span>Status</span>
            {secaoAberta.includes('status') ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-3">
            {statusOptions.map(status => (
              <div key={status.value} className="flex items-center space-x-3">
                <Checkbox
                  id={`status-${status.value}`}
                  checked={filtros.status?.includes(status.value) || false}
                  onCheckedChange={(checked) => 
                    handleStatusChange(status.value, checked as boolean)
                  }
                />
                <label 
                  htmlFor={`status-${status.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span>{status.label}</span>
                </label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Complexidade */}
        <Collapsible 
          open={secaoAberta.includes('complexidade')}
          onOpenChange={() => toggleSecao('complexidade')}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors">
            <span>Complexidade</span>
            {secaoAberta.includes('complexidade') ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-3">
            {complexidadeOptions.map(complexidade => (
              <div key={complexidade.value} className="flex items-center space-x-3">
                <Checkbox
                  id={`complexidade-${complexidade.value}`}
                  checked={filtros.complexidade?.includes(complexidade.value) || false}
                  onCheckedChange={(checked) => 
                    handleComplexidadeChange(complexidade.value, checked as boolean)
                  }
                />
                <label 
                  htmlFor={`complexidade-${complexidade.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: complexidade.color }}
                  />
                  <span>{complexidade.label}</span>
                </label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Faixa de Preço */}
        <Collapsible 
          open={secaoAberta.includes('preco')}
          onOpenChange={() => toggleSecao('preco')}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors">
            <span>Faixa de Preço</span>
            {secaoAberta.includes('preco') ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-3">
            <div className="px-2">
              <Slider
                value={[filtros.faixaPreco?.min || 0, filtros.faixaPreco?.max || 500]}
                onValueChange={handlePrecoChange}
                max={500}
                min={0}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>R$ {filtros.faixaPreco?.min || 0}</span>
                <span>R$ {filtros.faixaPreco?.max || 500}</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Duração */}
        <Collapsible 
          open={secaoAberta.includes('duracao')}
          onOpenChange={() => toggleSecao('duracao')}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium hover:text-primary transition-colors">
            <span>Duração (min)</span>
            {secaoAberta.includes('duracao') ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-3">
            <div className="px-2">
              <Slider
                value={[filtros.duracao?.min || 15, filtros.duracao?.max || 180]}
                onValueChange={handleDuracaoChange}
                max={180}
                min={15}
                step={15}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{filtros.duracao?.min || 15}min</span>
                <span>{filtros.duracao?.max || 180}min</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Outros Filtros */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="sazonal"
              checked={filtros.sazonal || false}
              onCheckedChange={handleSazonalChange}
            />
            <label 
              htmlFor="sazonal"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Apenas sazonais
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}