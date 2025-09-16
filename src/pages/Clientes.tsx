import { useState, useEffect, useMemo, useCallback } from "react";
import { Users, Search, Filter, Plus, TrendingUp, UserCheck, Star, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FiltrosCliente } from "@/types/cliente";
import { ClienteCard } from "@/components/ClienteCard";
import { ClienteFilters } from "@/components/ClienteFilters";
import { NovoClienteModal } from "@/components/modals/NovoClienteModal";
import { ClienteModalDemo } from "@/components/demo/ClienteModalDemo";
import { useCliente } from "@/hooks/useCliente";

const Clientes = () => {
  const [filtros, setFiltros] = useState<FiltrosCliente>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);

  // Use the real cliente hook
  const {
    clientes,
    loading,
    error,
    getClientes,
    refreshClientes
  } = useCliente({ autoRefresh: true });

  // Debounced search implementation
  const [debouncedBusca, setDebouncedBusca] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBusca(busca);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [busca]);

  // Fetch clients with filters when debounced search or filters change
  const fetchFilteredClientes = useCallback(async () => {
    const filters: any = {};
    
    if (debouncedBusca.trim()) {
      filters.busca = debouncedBusca.trim();
    }
    
    if (filtros.categoria && filtros.categoria.length > 0) {
      filters.categoria = filtros.categoria;
    }
    
    await getClientes(filters);
  }, [debouncedBusca, filtros, getClientes]);

  // Trigger search when filters change
  useEffect(() => {
    fetchFilteredClientes();
  }, [fetchFilteredClientes]);

  // Calculate metrics from real data
  const metricas = useMemo(() => {
    if (!clientes.length) {
      return {
        totalClientes: 0,
        ltvMedio: 0,
        taxaRetencao: 0,
        npsMedio: 0,
        novosMes: 0,
        crescimento: 0
      };
    }

    const totalClientes = clientes.length;
    const ltvMedio = Math.round(clientes.reduce((sum, c) => sum + (c.ltv || 0), 0) / totalClientes);
    const clientesComNps = clientes.filter(c => c.nps !== undefined);
    const npsMedio = clientesComNps.length > 0 
      ? Math.round((clientesComNps.reduce((sum, c) => sum + (c.nps || 0), 0) / clientesComNps.length) * 10) / 10
      : 0;
    
    // Calculate new clients this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const novosMes = clientes.filter(c => 
      c.dataRegistro && new Date(c.dataRegistro) >= thisMonth
    ).length;

    return {
      totalClientes,
      ltvMedio,
      taxaRetencao: 84.2, // This would need more complex calculation
      npsMedio,
      novosMes,
      crescimento: 15.3 // This would need historical data
    };
  }, [clientes]);

  const clientesFiltrados = useMemo(() => {
    return clientes.filter(cliente => {
      // Search is now handled server-side via debouncedBusca
      // But we still need client-side filtering for tags since the service doesn't support it yet
      if (filtros.tags && filtros.tags.length > 0) {
        const clienteTags = cliente.tags.map(tag => tag.id);
        if (!filtros.tags.some(tagId => clienteTags.includes(tagId))) {
          return false;
        }
      }
      
      return true;
    });
  }, [clientes, filtros]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold heading-premium">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes e acompanhe o relacionamento
          </p>
        </div>
        <Button className="btn-premium" onClick={() => setNovoClienteOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="glass-effect border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                {error.includes('Não autorizado') ? 'Sessão expirada' : 
                 error.includes('network') || error.includes('fetch') ? 'Erro de conexão' :
                 'Erro ao carregar clientes'}
              </p>
              <p className="text-xs text-muted-foreground">{error}</p>
              {error.includes('Não autorizado') && (
                <p className="text-xs text-muted-foreground mt-1">
                  Faça login novamente para continuar
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshClientes}
              disabled={loading}
              className="border-destructive/20 hover:bg-destructive/10"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {error.includes('Não autorizado') ? 'Fazer Login' : 'Tentar Novamente'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Métricas Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            <Card className="glass-effect hover-elegant">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Clientes
                </CardTitle>
                <Users className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-foreground">{metricas.totalClientes}</div>
                    <p className="text-xs text-success flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3" />
                      +{metricas.crescimento}% este mês
                    </p>
                  </>
                )}
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
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-muted rounded w-20 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-foreground">
                      R$ {metricas.ltvMedio.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Valor por cliente
                    </p>
                  </>
                )}
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
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-foreground">{metricas.taxaRetencao}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clientes ativos
                    </p>
                  </>
                )}
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
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-muted rounded w-12 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-28"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-foreground">{metricas.npsMedio}</div>
                    <p className="text-xs text-success mt-1">
                      Satisfação excelente
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
      </div>

      {/* Actions Bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-1 gap-4 items-center w-full lg:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar cliente..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10 pr-10 glass-effect border-0"
              />
              {loading && busca !== debouncedBusca && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
                </div>
              )}
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
      </div>

      {/* Filters Panel */}
      <ClienteFilters
        isOpen={filtersOpen}
        filtros={filtros}
        onFiltrosChange={setFiltros}
        onClose={() => setFiltersOpen(false)}
      />

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          {loading ? (
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Carregando clientes...
            </span>
          ) : (
            <>
              Exibindo <span className="font-medium text-foreground">{clientesFiltrados.length}</span> de{" "}
              <span className="font-medium text-foreground">{clientes.length}</span> clientes
              {(busca || Object.keys(filtros).some(key => filtros[key as keyof FiltrosCliente])) && (
                <span className="text-xs ml-2 px-2 py-1 bg-primary/10 text-primary rounded-full">
                  Filtrado
                </span>
              )}
            </>
          )}
        </p>
        
        {!loading && !error && clientes.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshClientes}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        )}
      </div>

      {/* Clientes Grid */}
      <div className="animate-fade-in">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <Card key={index} className="glass-effect animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : clientesFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {clientesFiltrados.map((cliente) => (
              <ClienteCard key={cliente.id} cliente={cliente} />
            ))}
          </div>
        ) : (
          <Card className="glass-effect p-12 text-center">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="heading-premium text-lg mb-2">
              {error ? 'Erro ao carregar clientes' : 
               busca ? `Nenhum resultado para "${busca}"` :
               Object.keys(filtros).some(key => filtros[key as keyof FiltrosCliente]) ? 'Nenhum cliente encontrado com os filtros aplicados' :
               'Nenhum cliente cadastrado'}
            </h3>
            <p className="text-premium mb-6">
              {error 
                ? 'Verifique sua conexão e tente novamente'
                : busca 
                  ? "Tente buscar por nome, email ou telefone"
                  : Object.keys(filtros).some(key => filtros[key as keyof FiltrosCliente])
                    ? "Tente remover alguns filtros para ver mais resultados" 
                    : "Comece adicionando seu primeiro cliente ao sistema"
              }
            </p>
            <div className="flex gap-3 justify-center">
              {error ? (
                <Button className="btn-premium" onClick={refreshClientes} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Tentar Novamente
                </Button>
              ) : (
                <>
                  {(busca || Object.keys(filtros).some(key => filtros[key as keyof FiltrosCliente])) && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setBusca("");
                        setFiltros({});
                      }}
                      className="glass-effect border-0"
                    >
                      Limpar Filtros
                    </Button>
                  )}
                  {!busca && !Object.keys(filtros).some(key => filtros[key as keyof FiltrosCliente]) && (
                    <Button className="btn-premium" onClick={() => setNovoClienteOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Primeiro Cliente
                    </Button>
                  )}
                </>
              )}
            </div>
          </Card>
        )}

        {/* Demo Component for Testing */}
        <div className="mt-8 p-4 border-t">
          <ClienteModalDemo />
        </div>

        {/* Modal de Novo Cliente */}
        <NovoClienteModal
          open={novoClienteOpen}
          onOpenChange={setNovoClienteOpen}
          onSuccess={(novoCliente) => {
            // The hook already handles optimistic updates, so no need to manually refresh
            console.log('Cliente criado com sucesso:', novoCliente);
          }}
        />
      </div>
    </div>
  );
};

export default Clientes;