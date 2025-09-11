import { useState, useMemo } from 'react';
import { Plus, Grid3X3, List, TrendingUp, DollarSign, Users, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { servicosMock, servicosMetricas, categorias } from '@/data/servicosMock';
import { FiltrosServico } from '@/types/servico';
import ServicoCard from '@/components/ServicoCard';
import { Link } from 'react-router-dom';

export default function Servicos() {
  const [filtros, setFiltros] = useState<FiltrosServico>({});
  const [visualizacao, setVisualizacao] = useState<'grid' | 'lista'>('grid');
  const [ordenacao, setOrdenacao] = useState<'popularidade' | 'preco' | 'nome'>('popularidade');

  const servicosFiltrados = useMemo(() => {
    let servicos = [...servicosMock];

    // Aplicar filtros
    if (filtros.busca) {
      servicos = servicos.filter(servico =>
        servico.nome.toLowerCase().includes(filtros.busca!.toLowerCase()) ||
        servico.descricaoComercial.toLowerCase().includes(filtros.busca!.toLowerCase())
      );
    }

    if (filtros.categoria?.length) {
      servicos = servicos.filter(servico =>
        filtros.categoria!.includes(servico.categoria)
      );
    }

    if (filtros.status?.length) {
      servicos = servicos.filter(servico =>
        filtros.status!.includes(servico.status)
      );
    }

    if (filtros.faixaPreco) {
      servicos = servicos.filter(servico =>
        servico.precoBase >= filtros.faixaPreco!.min &&
        servico.precoBase <= filtros.faixaPreco!.max
      );
    }

    if (filtros.complexidade?.length) {
      servicos = servicos.filter(servico =>
        filtros.complexidade!.includes(servico.nivelComplexidade)
      );
    }

    // Aplicar ordenação
    switch (ordenacao) {
      case 'popularidade':
        servicos.sort((a, b) => b.popularidade - a.popularidade);
        break;
      case 'preco':
        servicos.sort((a, b) => a.precoBase - b.precoBase);
        break;
      case 'nome':
        servicos.sort((a, b) => a.nome.localeCompare(b.nome));
        break;
    }

    return servicos;
  }, [filtros, ordenacao]);

  const categoriasComContadores = useMemo(() => {
    return categorias.map(categoria => ({
      ...categoria,
      total: servicosMock.filter(s => s.categoria === categoria.id && s.status === 'ativo').length
    }));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Gestão de Serviços
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie seu catálogo de procedimentos estéticos premium
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/servicos/novo">
                <Plus className="w-4 h-4 mr-2" />
                Novo Serviço
              </Link>
            </Button>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Serviços</CardTitle>
              <Grid3X3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{servicosMetricas.totalServicos}</div>
              <p className="text-xs text-muted-foreground">
                {servicosMetricas.servicosAtivos} ativos
              </p>
            </CardContent>
          </Card>

          <Card className="border-secondary/20 bg-gradient-to-br from-secondary/5 to-transparent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {servicosMetricas.receitaTotal.toLocaleString('pt-BR')}
              </div>
              <p className="text-xs text-muted-foreground">
                +{servicosMetricas.crescimentoMensal}% este mês
              </p>
            </CardContent>
          </Card>

          <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Margem Média</CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {servicosMetricas.margemMedia.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Lucratividade média
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mais Popular</CardTitle>
              <Star className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold truncate">
                {servicosMetricas.servicoMaisPopular}
              </div>
              <p className="text-xs text-muted-foreground">
                Serviço mais procurado
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Controles de Visualização */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar serviços..."
                value={filtros.busca || ''}
                onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                className="w-full"
              />
            </div>

            <div className="flex gap-2">
              <Select value={ordenacao} onValueChange={(value: any) => setOrdenacao(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popularidade">Popularidade</SelectItem>
                  <SelectItem value="preco">Preço</SelectItem>
                  <SelectItem value="nome">Nome</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex border rounded-md">
                <Button
                  variant={visualizacao === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setVisualizacao('grid')}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={visualizacao === 'lista' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setVisualizacao('lista')}
                  className="rounded-l-none"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs por Categoria */}
          <Tabs defaultValue="todos" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              {categoriasComContadores.map(categoria => (
                <TabsTrigger key={categoria.id} value={categoria.id}>
                  <span className="hidden lg:inline">{categoria.nome}</span>
                  <span className="lg:hidden">{categoria.icone}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="todos" className="space-y-6">
              {visualizacao === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {servicosFiltrados.map(servico => (
                    <ServicoCard key={servico.id} servico={servico} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {servicosFiltrados.map(servico => (
                    <ServicoCard key={servico.id} servico={servico} variant="lista" />
                  ))}
                </div>
              )}
            </TabsContent>

            {categoriasComContadores.map(categoria => (
              <TabsContent key={categoria.id} value={categoria.id} className="space-y-6">
                {visualizacao === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {servicosFiltrados
                      .filter(s => s.categoria === categoria.id)
                      .map(servico => (
                        <ServicoCard key={servico.id} servico={servico} />
                      ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {servicosFiltrados
                      .filter(s => s.categoria === categoria.id)
                      .map(servico => (
                        <ServicoCard key={servico.id} servico={servico} variant="lista" />
                      ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          {servicosFiltrados.length === 0 && (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                Nenhum serviço encontrado com os filtros aplicados.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}