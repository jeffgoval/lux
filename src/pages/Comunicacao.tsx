import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Bot, 
  Send, 
  Eye, 
  Reply,
  Zap,
  Settings,
  Plus,
  Search,
  Filter,
  ArrowLeft,
  Instagram,
  Mail,
  Smartphone,
  Globe
} from "lucide-react";
import { Link } from "react-router-dom";
import { 
  templatesMock, 
  agentesMock, 
  campanhasMock, 
  integracoesMock, 
  metricasComunicacaoMock 
} from "@/data/comunicacaoMock";

const Comunicacao = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativa': case 'conectado': return 'bg-success text-success-foreground';
      case 'pausada': case 'configurando': return 'bg-warning text-warning-foreground';
      case 'finalizada': case 'desconectado': return 'bg-muted text-muted-foreground';
      case 'rascunho': case 'erro': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getCanalIcon = (canal: string) => {
    switch (canal) {
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />;
      case 'instagram': return <Instagram className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <Smartphone className="h-4 w-4" />;
      case 'site': return <Globe className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                Comunicação Inteligente
              </h1>
              <p className="text-muted-foreground">
                Automatize e otimize toda comunicação com seus clientes
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-card border">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="agentes">Agentes IA</TabsTrigger>
            <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
            <TabsTrigger value="conversas">Conversas</TabsTrigger>
            <TabsTrigger value="integracoes">Integrações</TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Métricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-0 shadow-elegant bg-gradient-to-br from-card to-card/50">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Mensagens Enviadas
                  </CardTitle>
                  <Send className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {formatNumber(metricasComunicacaoMock.mensagens.total_enviadas)}
                  </div>
                  <p className="text-xs text-success mt-2">
                    ↗ +12.3% vs mês anterior
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-elegant bg-gradient-to-br from-card to-card/50">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Taxa de Abertura
                  </CardTitle>
                  <Eye className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {metricasComunicacaoMock.mensagens.taxa_abertura.toFixed(1)}%
                  </div>
                  <p className="text-xs text-success mt-2">
                    ↗ +3.1% vs mês anterior
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-elegant bg-gradient-to-br from-card to-card/50">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Taxa de Resposta
                  </CardTitle>
                  <Reply className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {metricasComunicacaoMock.mensagens.taxa_resposta.toFixed(1)}%
                  </div>
                  <p className="text-xs text-success mt-2">
                    ↗ +5.7% vs mês anterior
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-elegant bg-gradient-to-br from-card to-card/50">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    ROI Campanhas
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {metricasComunicacaoMock.conversoes.roi_campanha.toFixed(1)}%
                  </div>
                  <p className="text-xs text-success mt-2">
                    ↗ +18.4% vs mês anterior
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Performance dos Agentes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    Performance dos Agentes IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {agentesMock.map((agente) => (
                    <div key={agente.id} className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-secondary/30 to-accent/30 border">
                      <div>
                        <h4 className="font-semibold text-foreground">{agente.nome}</h4>
                        <p className="text-sm text-muted-foreground">{agente.descricao}</p>
                        <div className="flex gap-4 mt-2">
                          <span className="text-xs text-muted-foreground">
                            Conversões: {agente.metricas.taxa_conversao.toFixed(1)}%
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Satisfação: {agente.metricas.satisfacao_media}/10
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {agente.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Performance por Canal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(metricasComunicacaoMock.canais).map(([canal, dados]) => (
                    dados.mensagens > 0 && (
                      <div key={canal} className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-secondary/30 to-accent/30 border">
                        <div className="flex items-center gap-3">
                          {getCanalIcon(canal)}
                          <div>
                            <h4 className="font-semibold capitalize">{canal}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatNumber(dados.mensagens)} mensagens
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-primary">
                            {dados.conversoes} conversões
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {dados.taxa_engajamento.toFixed(1)}% engajamento
                          </div>
                        </div>
                      </div>
                    )
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Templates */}
          <TabsContent value="templates" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Template
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {templatesMock.map((template) => (
                <Card key={template.id} className="border-0 shadow-elegant hover:shadow-premium transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{template.nome}</CardTitle>
                        <p className="text-sm text-muted-foreground">{template.categoria}</p>
                      </div>
                      <Badge className={template.ativo ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}>
                        {template.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-secondary/30 p-3 rounded-lg">
                      <p className="text-sm leading-relaxed line-clamp-3">
                        {template.conteudo}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {template.canal.map((canal) => (
                          <Badge key={canal} variant="outline" className="text-xs">
                            {canal}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Editar</Button>
                        <Button variant="outline" size="sm">Duplicar</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Agentes IA */}
          <TabsContent value="agentes" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {agentesMock.map((agente) => (
                <Card key={agente.id} className="border-0 shadow-elegant">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                          <Bot className="h-5 w-5 text-primary" />
                          {agente.nome}
                        </CardTitle>
                        <p className="text-muted-foreground mt-1">{agente.descricao}</p>
                      </div>
                      <Badge className={agente.ativo ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}>
                        {agente.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-2">Personalidade</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Tom:</span>
                          <span className="ml-2 capitalize">{agente.personalidade.tom.replace('_', ' ')}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Estilo:</span>
                          <span className="ml-2 capitalize">{agente.personalidade.estilo.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Métricas de Performance</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-secondary/30 rounded-lg">
                          <div className="text-lg font-bold text-primary">{agente.metricas.taxa_conversao.toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground">Taxa Conversão</div>
                        </div>
                        <div className="text-center p-3 bg-secondary/30 rounded-lg">
                          <div className="text-lg font-bold text-primary">{agente.metricas.satisfacao_media}/10</div>
                          <div className="text-xs text-muted-foreground">Satisfação</div>
                        </div>
                        <div className="text-center p-3 bg-secondary/30 rounded-lg">
                          <div className="text-lg font-bold text-primary">{formatNumber(agente.metricas.conversas_iniciadas)}</div>
                          <div className="text-xs text-muted-foreground">Conversas</div>
                        </div>
                        <div className="text-center p-3 bg-secondary/30 rounded-lg">
                          <div className="text-lg font-bold text-primary">{agente.metricas.handoff_rate.toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground">Escalation Rate</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Settings className="h-4 w-4 mr-2" />
                        Configurar
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        Treinar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Campanhas */}
          <TabsContent value="campanhas" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Campanhas Ativas</h3>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Campanha
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {campanhasMock.map((campanha) => (
                <Card key={campanha.id} className="border-0 shadow-elegant">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{campanha.nome}</CardTitle>
                        <p className="text-muted-foreground">{campanha.descricao}</p>
                      </div>
                      <Badge className={getStatusColor(campanha.status)}>
                        {campanha.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{formatNumber(campanha.metricas.enviados)}</div>
                        <div className="text-xs text-muted-foreground">Enviados</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{campanha.metricas.taxa_abertura.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Taxa Abertura</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{formatNumber(campanha.metricas.respondidos)}</div>
                        <div className="text-xs text-muted-foreground">Respondidos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{campanha.metricas.taxa_conversao.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Conversão</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{formatNumber(campanha.metricas.conversoes)}</div>
                        <div className="text-xs text-muted-foreground">Conversões</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getCanalIcon(campanha.canal)}
                        <span className="text-sm capitalize">{campanha.canal}</span>
                        <Badge variant="outline" className="text-xs">{campanha.tipo}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Relatório</Button>
                        <Button variant="outline" size="sm">Editar</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Conversas */}
          <TabsContent value="conversas" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Conversas Recentes</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
                <Button variant="outline" size="sm">Ver Todas</Button>
              </div>
            </div>

            <Card className="border-0 shadow-elegant">
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground py-8">
                  Interface de conversas em desenvolvimento...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrações */}
          <TabsContent value="integracoes" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Integrações de Canal</h3>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Integração
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integracoesMock.map((integracao) => (
                <Card key={integracao.id} className="border-0 shadow-elegant">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getCanalIcon(integracao.canal)}
                        <div>
                          <CardTitle className="text-lg">{integracao.nome}</CardTitle>
                          <p className="text-sm text-muted-foreground capitalize">{integracao.canal}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(integracao.status)}>
                        {integracao.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Mensagens/mês:</span>
                        <span className="font-medium">{formatNumber(integracao.mensagens_mes)}</span>
                      </div>
                      {integracao.limite_mensal && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Limite:</span>
                          <span className="font-medium">{formatNumber(integracao.limite_mensal)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Última sincronização:</span>
                        <span className="font-medium">
                          {integracao.ultima_sincronizacao?.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Settings className="h-4 w-4 mr-2" />
                        Configurar
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        Testar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Comunicacao;