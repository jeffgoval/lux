import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Edit, Calendar, Phone, Mail, MapPin, Star, TrendingUp, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { mockClientes } from "@/data/clientesMock";
import { ClienteTimeline } from "@/components/ClienteTimeline";
import { ClientePerfilMedico } from "@/components/ClientePerfilMedico";
import { ClienteMetricas } from "@/components/ClienteMetricas";

const ClienteDetalhes = () => {
  const { id } = useParams();
  const cliente = mockClientes.find(c => c.id === id);

  if (!cliente) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card className="glass-effect p-8 text-center">
          <h2 className="heading-premium text-xl mb-4">Cliente não encontrado</h2>
          <Link to="/clientes">
            <Button className="btn-premium">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos Clientes
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

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
            <Link to="/clientes">
              <Button variant="outline" className="glass-effect border-0">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-elegant">
              <User className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="heading-premium text-3xl text-foreground">
                Perfil do Cliente
              </h1>
              <p className="text-premium">
                Visão completa e histórico detalhado
              </p>
            </div>
            <Button className="btn-premium">
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>

        {/* Cliente Header Card */}
        <Card className="glass-effect mb-8 animate-fade-in">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Foto e Info Principal */}
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">
                <Avatar className="w-24 h-24 border-4 border-primary/20">
                  <AvatarImage src={cliente.foto} alt={cliente.nome} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {cliente.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="text-center lg:text-left">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-3">
                    <h2 className="heading-premium text-2xl">{cliente.nome}</h2>
                    <Badge className={getCategoriaColor(cliente.categoria)}>
                      {getCategoriaLabel(cliente.categoria)}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 justify-center lg:justify-start">
                      <Phone className="w-4 h-4" />
                      {cliente.telefone}
                    </div>
                    <div className="flex items-center gap-2 justify-center lg:justify-start">
                      <Mail className="w-4 h-4" />
                      {cliente.email}
                    </div>
                    <div className="flex items-center gap-2 justify-center lg:justify-start">
                      <MapPin className="w-4 h-4" />
                      {cliente.endereco.cidade}, {cliente.endereco.estado}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mt-4 justify-center lg:justify-start">
                    {cliente.tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        style={{ borderColor: tag.cor, color: tag.cor }}
                        className="text-xs"
                      >
                        {tag.nome}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Métricas Rápidas */}
              <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 lg:ml-8">
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">R$ {cliente.ltv.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">LTV</div>
                </div>
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{cliente.frequencia}</div>
                  <div className="text-xs text-muted-foreground">Atendimentos</div>
                </div>
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{cliente.nps}/10</div>
                  <div className="text-xs text-muted-foreground">NPS</div>
                </div>
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{cliente.frequenciaIdeal}d</div>
                  <div className="text-xs text-muted-foreground">Frequência</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Content */}
        <Tabs defaultValue="perfil" className="animate-slide-up">
          <TabsList className="grid w-full lg:w-auto lg:inline-grid grid-cols-2 lg:grid-cols-4 mb-8 glass-effect">
            <TabsTrigger value="perfil" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Perfil
            </TabsTrigger>
            <TabsTrigger value="historico" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Histórico
            </TabsTrigger>
            <TabsTrigger value="medico" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Estético/Médico
            </TabsTrigger>
            <TabsTrigger value="metricas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Análises
            </TabsTrigger>
          </TabsList>

          <TabsContent value="perfil" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dados Pessoais */}
              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle className="heading-premium">Dados Pessoais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">CPF</label>
                      <p className="text-foreground">{cliente.cpf}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">RG</label>
                      <p className="text-foreground">{cliente.rg}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                      <p className="text-foreground">{cliente.dataNascimento.toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Endereço */}
              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle className="heading-premium">Endereço</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-foreground">
                    {cliente.endereco.rua}, {cliente.endereco.numero}
                    {cliente.endereco.complemento && `, ${cliente.endereco.complemento}`}
                  </p>
                  <p className="text-foreground">
                    {cliente.endereco.bairro} - {cliente.endereco.cidade}/{cliente.endereco.estado}
                  </p>
                  <p className="text-muted-foreground">CEP: {cliente.endereco.cep}</p>
                </CardContent>
              </Card>

              {/* Preferências */}
              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle className="heading-premium">Preferências</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Como nos conheceu</label>
                    <p className="text-foreground">{cliente.comoNosConheceu}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Preferências de Contato</label>
                    <div className="flex gap-2 mt-1">
                      {cliente.preferenciasContato.map((pref) => (
                        <Badge key={pref} variant="outline">{pref}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Horários Preferenciais</label>
                    <div className="flex gap-2 mt-1">
                      {cliente.preferencasHorario.map((horario) => (
                        <Badge key={horario} variant="outline">{horario}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Profissionais Preferidos */}
              <Card className="glass-effect">
                <CardHeader>
                  <CardTitle className="heading-premium">Profissionais Preferidos</CardTitle>
                </CardHeader>
                <CardContent>
                  {cliente.profissionaisPreferidos.length > 0 ? (
                    <div className="space-y-2">
                      {cliente.profissionaisPreferidos.map((prof, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-warning" />
                          <span className="text-foreground">{prof}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nenhuma preferência registrada</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="historico">
            <ClienteTimeline historico={cliente.historico} />
          </TabsContent>

          <TabsContent value="medico">
            <ClientePerfilMedico cliente={cliente} />
          </TabsContent>

          <TabsContent value="metricas">
            <ClienteMetricas cliente={cliente} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClienteDetalhes;