import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  AlertCircle,
  Target,
  BarChart3,
  CalendarDays,
  Plus,
  Filter
} from "lucide-react";
import { resumoFinanceiroMock, metasFinanceirasMock, analiseRentabilidadeMock, recebimentosMock } from "@/data/financeiroMock";
import { format } from "date-fns";

const Financeiro = () => {
  const [periodo, setPeriodo] = useState("mensal");
  const resumo = resumoFinanceiroMock;

  // Cálculo das metas
  const metaReceita = metasFinanceirasMock.find(m => m.tipo === 'receita')?.valor || 0;
  const progressoReceita = (resumo.receitas.total / metaReceita) * 100;
  
  const metaLucro = metasFinanceirasMock.find(m => m.tipo === 'lucro')?.valor || 0;
  const progressoLucro = (resumo.lucro / metaLucro) * 100;

  // Contas vencendo nos próximos 7 dias
  const contasVencendo = recebimentosMock.filter(r => 
    r.status === 'pendente' && 
    new Date(r.dataVencimento) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/50 to-primary/5">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Controle Financeiro
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie receitas, despesas e analise a rentabilidade da sua clínica
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nova Transação
            </Button>
          </div>
        </div>

        {/* Alertas */}
        {contasVencendo.length > 0 && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    {contasVencendo.length} conta(s) vencendo nos próximos 7 dias
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total: R$ {contasVencendo.reduce((acc, c) => acc + c.valor, 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumo Financeiro */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="backdrop-blur-sm bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {resumo.receitas.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={progressoReceita >= 100 ? "default" : "secondary"} className="text-xs">
                  {progressoReceita.toFixed(0)}% da meta
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas do Mês</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                R$ {resumo.despesas.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Produtos: R$ {resumo.despesas.produtos.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                R$ {resumo.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={progressoLucro >= 100 ? "default" : "secondary"} className="text-xs">
                  {resumo.margemLucro.toFixed(1)}% margem
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {resumo.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Por atendimento
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contas a Receber e Pagar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="backdrop-blur-sm bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Contas a Receber
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 mb-4">
                R$ {resumo.contasReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="space-y-2">
                {recebimentosMock.filter(r => r.status === 'pendente').slice(0, 3).map((recebimento) => (
                  <div key={recebimento.id} className="flex justify-between items-center py-2 border-b border-border/50">
                    <div className="text-sm">
                      <p className="font-medium">R$ {recebimento.valor.toFixed(2)}</p>
                      <p className="text-muted-foreground text-xs">
                        Vence em {format(new Date(recebimento.dataVencimento), 'dd/MM')}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {recebimento.formaPagamento.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Análise de Rentabilidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analiseRentabilidadeMock.slice(0, 3).map((analise) => (
                  <div key={analise.servicoId} className="flex justify-between items-center py-2">
                    <div className="text-sm">
                      <p className="font-medium">{analise.nomeServico}</p>
                      <p className="text-muted-foreground text-xs">
                        {analise.quantidadeRealizada} procedimentos
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={analise.margemLiquida >= 70 ? "default" : analise.margemLiquida >= 50 ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {analise.margemLiquida.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navegação por Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="receitas">Receitas</TabsTrigger>
            <TabsTrigger value="despesas">Despesas</TabsTrigger>
            <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Card className="backdrop-blur-sm bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Visão Geral - {resumo.periodo}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">Total de Receitas</p>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {resumo.receitas.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">Total de Despesas</p>
                    <p className="text-2xl font-bold text-red-600">
                      R$ {resumo.despesas.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">Resultado</p>
                    <p className={`text-2xl font-bold ${resumo.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      R$ {resumo.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receitas">
            <Card className="backdrop-blur-sm bg-card/50">
              <CardHeader>
                <CardTitle>Gestão de Receitas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Módulo de receitas em desenvolvimento...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="despesas">
            <Card className="backdrop-blur-sm bg-card/50">
              <CardHeader>
                <CardTitle>Gestão de Despesas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Módulo de despesas em desenvolvimento...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fluxo">
            <Card className="backdrop-blur-sm bg-card/50">
              <CardHeader>
                <CardTitle>Fluxo de Caixa</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Módulo de fluxo de caixa em desenvolvimento...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Financeiro;