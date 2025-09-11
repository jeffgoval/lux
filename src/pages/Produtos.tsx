import { useState } from 'react';
import { Search, Plus, Package, AlertTriangle, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { produtosMock, produtoMetricasMock } from '@/data/produtosMock';
import { Produto } from '@/types/produto';

export default function Produtos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [produtos] = useState<Produto[]>(produtosMock);

  const filteredProdutos = produtos.filter(produto =>
    produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.marca.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (produto: Produto) => {
    if (produto.quantidade === 0) {
      return <Badge variant="destructive">Esgotado</Badge>;
    }
    if (produto.quantidade <= produto.estoqueMinimo) {
      return <Badge variant="outline" className="border-warning text-warning">Baixo Estoque</Badge>;
    }
    if (new Date(produto.dataVencimento) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
      return <Badge variant="outline" className="border-warning text-warning">Vencendo</Badge>;
    }
    return <Badge variant="outline" className="border-success text-success">Disponível</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie o estoque de produtos utilizados nos procedimentos
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Produto
        </Button>
      </div>

      {/* Dashboard Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Estoque</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(produtoMetricasMock.valorTotalEstoque)}</div>
            <p className="text-xs text-muted-foreground">
              {produtoMetricasMock.totalProdutos} produtos cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Baixo Estoque</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{produtoMetricasMock.produtosBaixoEstoque}</div>
            <p className="text-xs text-muted-foreground">
              Produtos precisando reposição
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencendo</CardTitle>
            <Calendar className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{produtoMetricasMock.produtosVencendo}</div>
            <p className="text-xs text-muted-foreground">
              Próximos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gasto Mensal</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(produtoMetricasMock.gastoMensal)}</div>
            <p className="text-xs text-success">
              Economia: {formatCurrency(produtoMetricasMock.economiaMensal)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lista" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="lista">Lista de Produtos</TabsTrigger>
            <TabsTrigger value="categorias">Por Categoria</TabsTrigger>
            <TabsTrigger value="alertas">Alertas</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-[300px]"
              />
            </div>
          </div>
        </div>

        <TabsContent value="lista" className="space-y-4">
          <div className="grid gap-4">
            {filteredProdutos.map((produto) => (
              <Card key={produto.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{produto.nome}</CardTitle>
                      <CardDescription>{produto.marca} • {produto.categoria}</CardDescription>
                    </div>
                    {getStatusBadge(produto)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Estoque</p>
                      <p className="font-medium">{produto.quantidade} {produto.unidadeMedida}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Custo</p>
                      <p className="font-medium">{formatCurrency(produto.precoCusto)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Vencimento</p>
                      <p className="font-medium">{new Date(produto.dataVencimento).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Localização</p>
                      <p className="font-medium">{produto.localizacao || 'Não informado'}</p>
                    </div>
                  </div>
                  
                  {produto.quantidade <= produto.estoqueMinimo && (
                    <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                      <p className="text-sm text-warning font-medium flex items-center">
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Estoque baixo! Mínimo: {produto.estoqueMinimo} {produto.unidadeMedida}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categorias" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {produtoMetricasMock.categoriasMaisGastas.map((categoria, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="capitalize">{categoria.categoria}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Gasto Mensal</span>
                      <span className="font-medium">{formatCurrency(categoria.valor)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Produtos</span>
                      <span className="font-medium">
                        {produtos.filter(p => p.categoria === categoria.categoria).length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alertas" className="space-y-4">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Produtos com Baixo Estoque
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {produtos
                    .filter(p => p.quantidade <= p.estoqueMinimo)
                    .map(produto => (
                      <div key={produto.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{produto.nome}</p>
                          <p className="text-sm text-muted-foreground">
                            Estoque: {produto.quantidade} {produto.unidadeMedida} 
                            (Mínimo: {produto.estoqueMinimo})
                          </p>
                        </div>
                        <Button size="sm">Solicitar Compra</Button>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-warning flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Produtos Vencendo (30 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {produtos
                    .filter(p => {
                      const vencimento = new Date(p.dataVencimento);
                      const proximoMes = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                      return vencimento <= proximoMes;
                    })
                    .map(produto => (
                      <div key={produto.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{produto.nome}</p>
                          <p className="text-sm text-muted-foreground">
                            Vence em: {new Date(produto.dataVencimento).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge variant="outline" className="border-warning text-warning">
                          {Math.ceil((new Date(produto.dataVencimento).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}