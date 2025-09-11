import { useState } from "react";
import { Link } from "react-router-dom";
import { Users, Search, Filter, Plus, TrendingUp, UserCheck, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockClientes, mockMetricas } from "@/data/clientesMock";
import { Cliente, FiltrosCliente } from "@/types/cliente";
import { ClienteCard } from "@/components/ClienteCard";
import { ClienteFilters } from "@/components/ClienteFilters";

const Clientes = () => {
  const [clientes] = useState<Cliente[]>(mockClientes);
  const [metricas] = useState(mockMetricas);
  const [filtros, setFiltros] = useState<FiltrosCliente>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [busca, setBusca] = useState("");

  const clientesFiltrados = clientes.filter(cliente => {
    if (busca && !cliente.nome.toLowerCase().includes(busca.toLowerCase()) && 
        !cliente.email.toLowerCase().includes(busca.toLowerCase()) &&
        !cliente.telefone.includes(busca)) {
      return false;
    }
    
    if (filtros.categoria && filtros.categoria.length > 0 && !filtros.categoria.includes(cliente.categoria)) {
      return false;
    }
    
    if (filtros.tags && filtros.tags.length > 0) {
      const clienteTags = cliente.tags.map(tag => tag.id);
      if (!filtros.tags.some(tagId => clienteTags.includes(tagId))) {
        return false;
      }
    }
    
    return true;
  });

  const getCategoriaColor = (categoria: string) => {
    const colors = {
      vip: "bg-warning text-warning-foreground",
      ativo: "bg-success text-success-foreground",
      risco: "bg-destructive text-destructive-foreground",
      novo: "bg-primary text-primary-foreground",
      sazonal: "bg-accent text-accent-foreground",
      indicador: "bg-secondary text-secondary-foreground"
    };
    return colors[categoria as keyof typeof colors] || "bg-muted text-muted-foreground";
  };

  const getCategoriaLabel = (categoria: string) => {
    const labels = {
      vip: "VIP",
      ativo: "Ativo",
      risco: "Em Risco",
      novo: "Novo",
      sazonal: "Sazonal",
      indicador: "Indicador"
    };
    return labels[categoria as keyof typeof labels] || categoria;
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-elegant">
              <Users className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="heading-premium text-3xl text-foreground">
                Gestão de Clientes Premium
              </h1>
              <p className="text-premium">
                Sistema completo de relacionamento com clientes
              </p>
            </div>
          </div>

          {/* Métricas Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="glass-effect hover-elegant">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Clientes
                </CardTitle>
                <Users className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{metricas.totalClientes}</div>
                <p className="text-xs text-success flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +{metricas.crescimento}% este mês
                </p>
              </CardContent>
            </Card>

            <Card className="glass-effect hover-elegant">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  LTV Médio
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  R$ {metricas.ltvMedio.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Valor por cliente
                </p>
              </CardContent>
            </Card>

            <Card className="glass-effect hover-elegant">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Taxa de Retenção
                </CardTitle>
                <UserCheck className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{metricas.taxaRetencao}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Clientes ativos
                </p>
              </CardContent>
            </Card>

            <Card className="glass-effect hover-elegant">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  NPS Médio
                </CardTitle>
                <Star className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{metricas.npsMedio}</div>
                <p className="text-xs text-success mt-1">
                  Satisfação excelente
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between mb-6">
          <div className="flex flex-1 gap-4 items-center w-full lg:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar cliente..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 glass-effect border-0"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`glass-effect border-0 ${filtersOpen ? 'bg-primary text-primary-foreground' : ''}`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
              {Object.keys(filtros).some(key => filtros[key as keyof FiltrosCliente]) && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                  !
                </Badge>
              )}
            </Button>
          </div>
          
          <Button className="btn-premium">
            <Plus className="w-4 h-4 mr-2" />
            Novo Cliente
          </Button>
        </div>

        {/* Filters Panel */}
        <ClienteFilters
          isOpen={filtersOpen}
          filtros={filtros}
          onFiltrosChange={setFiltros}
          onClose={() => setFiltersOpen(false)}
        />

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-premium">
            Exibindo <span className="font-medium text-foreground">{clientesFiltrados.length}</span> de{" "}
            <span className="font-medium text-foreground">{clientes.length}</span> clientes
          </p>
        </div>

        {/* Clientes Grid */}
        <div className="animate-fade-in">
          {clientesFiltrados.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {clientesFiltrados.map((cliente) => (
                <ClienteCard key={cliente.id} cliente={cliente} />
              ))}
            </div>
          ) : (
            <Card className="glass-effect p-12 text-center">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="heading-premium text-lg mb-2">Nenhum cliente encontrado</h3>
              <p className="text-premium mb-6">
                {busca || Object.keys(filtros).length > 0 
                  ? "Tente ajustar os filtros ou termos de busca" 
                  : "Comece adicionando seu primeiro cliente"
                }
              </p>
              {!busca && Object.keys(filtros).length === 0 && (
                <Button className="btn-premium">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeiro Cliente
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Clientes;