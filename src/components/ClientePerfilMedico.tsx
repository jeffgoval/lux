import { AlertTriangle, Heart, Pill, Scissors, Target, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cliente } from "@/types/cliente";

interface ClientePerfilMedicoProps {
  cliente: Cliente;
}

export const ClientePerfilMedico = ({ cliente }: ClientePerfilMedicoProps) => {
  const getTipoPeleColor = (tipo: string) => {
    const colors = {
      oleosa: 'bg-warning/20 text-warning border-warning/30',
      seca: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
      mista: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
      sensivel: 'bg-orange-500/20 text-orange-600 border-orange-500/30'
    };
    return colors[tipo as keyof typeof colors] || 'bg-muted text-muted-foreground';
  };

  const getGravidadeColor = (gravidade: string) => {
    const colors = {
      leve: 'bg-success/20 text-success border-success/30',
      moderada: 'bg-warning/20 text-warning border-warning/30',
      grave: 'bg-destructive/20 text-destructive border-destructive/30'
    };
    return colors[gravidade as keyof typeof colors] || 'bg-muted text-muted-foreground';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tipo de Pele */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="heading-premium flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              Tipo de Pele
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getTipoPeleColor(cliente.tipoPele)}>
              {cliente.tipoPele.charAt(0).toUpperCase() + cliente.tipoPele.slice(1)}
            </Badge>
          </CardContent>
        </Card>

        {/* Perfil de Consumo */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="heading-premium flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Perfil de Consumo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Comportamento</p>
              <Badge variant="outline" className="mt-1">
                {cliente.perfilConsumo.charAt(0).toUpperCase() + cliente.perfilConsumo.slice(1)}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sensibilidade a preço</p>
              <Badge variant="outline" className="mt-1">
                {cliente.sensibilidadePreco.charAt(0).toUpperCase() + cliente.sensibilidadePreco.slice(1)}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Frequência ideal</p>
              <Badge variant="outline" className="mt-1">
                {cliente.frequenciaIdeal} dias
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alergias */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="heading-premium flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Alergias e Reações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cliente.alergias.length > 0 ? (
            <div className="space-y-4">
              {cliente.alergias.map((alergia, index) => (
                <div key={index} className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-foreground">{alergia.tipo}</h4>
                      <p className="text-sm text-muted-foreground">{alergia.descricao}</p>
                    </div>
                    <Badge className={getGravidadeColor(alergia.gravidade)}>
                      {alergia.gravidade}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma alergia registrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Condições Médicas */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="heading-premium flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            Condições Médicas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cliente.condicoesMedicas.length > 0 ? (
            <div className="space-y-4">
              {cliente.condicoesMedicas.map((condicao, index) => (
                <div key={index} className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-foreground">{condicao.nome}</h4>
                      {condicao.descricao && (
                        <p className="text-sm text-muted-foreground mt-1">{condicao.descricao}</p>
                      )}
                    </div>
                    <Badge variant={condicao.controlada ? "outline" : "destructive"}>
                      {condicao.controlada ? "Controlada" : "Não controlada"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma condição médica registrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Medicamentos */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="heading-premium flex items-center gap-2">
              <Pill className="w-5 h-5 text-primary" />
              Medicamentos em Uso
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cliente.medicamentos.length > 0 ? (
              <div className="space-y-2">
                {cliente.medicamentos.map((medicamento, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <Pill className="w-4 h-4 text-primary" />
                    <span className="text-sm">{medicamento}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Pill className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Nenhum medicamento em uso</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cirurgias Prévias */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="heading-premium flex items-center gap-2">
              <Scissors className="w-5 h-5 text-primary" />
              Cirurgias Prévias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cliente.cirurgiasPrevia.length > 0 ? (
              <div className="space-y-4">
                {cliente.cirurgiasPrevia.map((cirurgia, index) => (
                  <div key={index} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-foreground">{cirurgia.nome}</h4>
                      <Badge variant={cirurgia.tipo === 'estetica' ? 'default' : 'secondary'}>
                        {cirurgia.tipo === 'estetica' ? 'Estética' : 'Não estética'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(cirurgia.data)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Scissors className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Nenhuma cirurgia prévia</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Objetivos e Contraindicações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="heading-premium flex items-center gap-2">
              <Target className="w-5 h-5 text-success" />
              Objetivos Estéticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cliente.objetivosEsteticos.length > 0 ? (
              <div className="space-y-2">
                {cliente.objetivosEsteticos.map((objetivo, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-success/5 rounded-lg">
                    <Target className="w-4 h-4 text-success" />
                    <span className="text-sm">{objetivo}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Nenhum objetivo definido</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="heading-premium flex items-center gap-2">
              <X className="w-5 h-5 text-destructive" />
              Contraindicações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cliente.contraindicacoes.length > 0 ? (
              <div className="space-y-2">
                {cliente.contraindicacoes.map((contraindicacao, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-destructive/5 rounded-lg">
                    <X className="w-4 h-4 text-destructive" />
                    <span className="text-sm">{contraindicacao}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <X className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Nenhuma contraindicação</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};