import { useState } from 'react';
import { Search, Plus, Wrench, Activity, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { equipamentosMock, equipamentoMetricasMock } from '@/data/equipamentosMock';
import { Equipamento } from '@/types/equipamento';

export default function Equipamentos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [equipamentos] = useState<Equipamento[]>(equipamentosMock);

  const filteredEquipamentos = equipamentos.filter(equipamento =>
    equipamento.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    equipamento.modelo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (equipamento: Equipamento) => {
    switch (equipamento.status) {
      case 'ativo':
        return <Badge variant="outline" className="border-success text-success">Ativo</Badge>;
      case 'manutencao':
        return <Badge variant="outline" className="border-warning text-warning">Manutenção</Badge>;
      case 'inativo':
        return <Badge variant="destructive">Inativo</Badge>;
      case 'calibracao':
        return <Badge variant="outline" className="border-primary text-primary">Calibração</Badge>;
      default:
        return <Badge variant="secondary">Indefinido</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const proximasManutencoes = equipamentos.filter(eq => {
    if (!eq.proximaManutencao) return false;
    const proximaManutencao = new Date(eq.proximaManutencao);
    const proximoMes = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return proximaManutencao <= proximoMes;
  });

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Equipamentos</h1>
          <p className="text-muted-foreground">
            Gerencie equipamentos estéticos e suas manutenções
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Equipamento
        </Button>
      </div>

      {/* Dashboard Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Equipamentos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{equipamentoMetricasMock.totalEquipamentos}</div>
            <p className="text-xs text-muted-foreground">
              {equipamentoMetricasMock.equipamentosAtivos} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Manutenção</CardTitle>
            <Wrench className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{equipamentoMetricasMock.equipamentosManutencao}</div>
            <p className="text-xs text-muted-foreground">
              Equipamentos indisponíveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas Manutenções</CardTitle>
            <Calendar className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{equipamentoMetricasMock.alertasManutencao}</div>
            <p className="text-xs text-muted-foreground">
              Próximos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gasto Manutenção</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(equipamentoMetricasMock.gastoManutencaoMensal)}</div>
            <p className="text-xs text-muted-foreground">
              Mês atual
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lista" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="lista">Lista de Equipamentos</TabsTrigger>
            <TabsTrigger value="manutencoes">Manutenções</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar equipamentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-[300px]"
              />
            </div>
          </div>
        </div>

        <TabsContent value="lista" className="space-y-4">
          <div className="grid gap-4">
            {filteredEquipamentos.map((equipamento) => (
              <Card key={equipamento.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{equipamento.nome}</CardTitle>
                      <CardDescription>
                        {equipamento.modelo} • {equipamento.fabricante.nome} • {equipamento.tipo}
                      </CardDescription>
                    </div>
                    {getStatusBadge(equipamento)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Localização</p>
                      <p className="font-medium">{equipamento.localizacao}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Horas de Uso</p>
                      <p className="font-medium">{equipamento.horasUso}h</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Valor Atual</p>
                      <p className="font-medium">{formatCurrency(equipamento.valorAtual || equipamento.valorCompra)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Próxima Manutenção</p>
                      <p className="font-medium">
                        {equipamento.proximaManutencao 
                          ? new Date(equipamento.proximaManutencao).toLocaleDateString('pt-BR')
                          : 'Não agendada'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {equipamento.voltagem}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {equipamento.potencia}
                      </Badge>
                      {equipamento.frequencia && (
                        <Badge variant="secondary" className="text-xs">
                          {equipamento.frequencia}
                        </Badge>
                      )}
                    </div>
                    
                    {equipamento.proximaManutencao && new Date(equipamento.proximaManutencao) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                      <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                        <p className="text-sm text-warning font-medium flex items-center">
                          <Calendar className="mr-2 h-4 w-4" />
                          Manutenção programada para: {new Date(equipamento.proximaManutencao).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="manutencoes" className="space-y-4">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-warning flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Próximas Manutenções (30 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {proximasManutencoes.map(equipamento => (
                    <div key={equipamento.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{equipamento.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          Agendada para: {equipamento.proximaManutencao && new Date(equipamento.proximaManutencao).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="border-warning text-warning">
                          {equipamento.proximaManutencao && Math.ceil((new Date(equipamento.proximaManutencao).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias
                        </Badge>
                        <Button size="sm">Agendar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wrench className="mr-2 h-5 w-5" />
                  Equipamentos em Manutenção
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {equipamentos
                    .filter(eq => eq.status === 'manutencao')
                    .map(equipamento => (
                      <div key={equipamento.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{equipamento.nome}</p>
                          <p className="text-sm text-muted-foreground">
                            Localização: {equipamento.localizacao}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="border-warning text-warning">Em Manutenção</Badge>
                          <Button size="sm" variant="outline">Ver Detalhes</Button>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Equipamentos Mais Utilizados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {equipamentoMetricasMock.equipamentosMaisUtilizados.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.equipamento.nome}</p>
                        <p className="text-sm text-muted-foreground">{item.equipamento.tipo}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{item.horasUso}h</p>
                        <p className="text-sm text-muted-foreground">Total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Custos de Manutenção</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Mês Atual</span>
                    <span className="font-medium">{formatCurrency(equipamentoMetricasMock.gastoManutencaoMensal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Média Mensal</span>
                    <span className="font-medium">{formatCurrency(equipamentoMetricasMock.gastoManutencaoMensal * 0.8)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Previsão Próximo Mês</span>
                    <span className="font-medium">{formatCurrency(equipamentoMetricasMock.gastoManutencaoMensal * 1.1)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}