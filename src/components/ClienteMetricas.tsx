import { TrendingUp, Calendar, DollarSign, Star, Clock, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cliente } from "@/types/cliente";

interface ClienteMetricasProps {
  cliente: Cliente;
}

export const ClienteMetricas = ({ cliente }: ClienteMetricasProps) => {
  // Calcular métricas do cliente
  const calcularMetricas = () => {
    const agora = new Date();
    const dataRegistro = cliente.dataRegistro;
    const tempoComoCliente = Math.floor((agora.getTime() - dataRegistro.getTime()) / (1000 * 60 * 60 * 24));
    
    const valorMedioAtendimento = cliente.historico.length > 0 
      ? cliente.ltv / cliente.historico.length 
      : 0;
    
    const ultimoAtendimento = cliente.ultimoAtendimento 
      ? Math.floor((agora.getTime() - cliente.ultimoAtendimento.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    const frequenciaReal = cliente.historico.length > 1 
      ? tempoComoCliente / cliente.historico.length 
      : null;
    
    const satisfacaoMedia = cliente.historico
      .filter(h => h.satisfacao)
      .reduce((acc, h) => acc + (h.satisfacao || 0), 0) / 
      cliente.historico.filter(h => h.satisfacao).length || 0;

    return {
      tempoComoCliente,
      valorMedioAtendimento,
      ultimoAtendimento,
      frequenciaReal,
      satisfacaoMedia,
      totalGasto: cliente.ltv,
      totalAtendimentos: cliente.historico.length
    };
  };

  const metricas = calcularMetricas();

  const formatValue = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatDays = (days: number) => {
    if (days < 30) return `${days} dias`;
    if (days < 365) return `${Math.floor(days / 30)} meses`;
    return `${Math.floor(days / 365)} anos`;
  };

  const getSatisfacaoColor = (satisfacao: number) => {
    if (satisfacao >= 9) return 'text-success';
    if (satisfacao >= 7) return 'text-warning';
    if (satisfacao >= 5) return 'text-orange-500';
    return 'text-destructive';
  };

  const getRiscoColor = () => {
    if (!metricas.ultimoAtendimento) return 'text-muted-foreground';
    if (metricas.ultimoAtendimento > 180) return 'text-destructive';
    if (metricas.ultimoAtendimento > 90) return 'text-warning';
    return 'text-success';
  };

  const getRiscoLabel = () => {
    if (!metricas.ultimoAtendimento) return 'Novo cliente';
    if (metricas.ultimoAtendimento > 180) return 'Alto risco';
    if (metricas.ultimoAtendimento > 90) return 'Risco moderado';
    return 'Cliente ativo';
  };

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-effect text-center">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
              <DollarSign className="w-4 h-4" />
              Lifetime Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatValue(metricas.totalGasto)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total investido
            </p>
          </CardContent>
        </Card>

        <Card className="glass-effect text-center">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Valor Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatValue(metricas.valorMedioAtendimento)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Por atendimento
            </p>
          </CardContent>
        </Card>

        <Card className="glass-effect text-center">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
              <Star className="w-4 h-4" />
              Satisfação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSatisfacaoColor(metricas.satisfacaoMedia)}`}>
              {metricas.satisfacaoMedia ? metricas.satisfacaoMedia.toFixed(1) : '--'}/10
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Média geral
            </p>
          </CardContent>
        </Card>

        <Card className="glass-effect text-center">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              Atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {metricas.totalAtendimentos}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total realizados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Análise Temporal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="heading-premium flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Análise Temporal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">Cliente há</span>
              <span className="font-medium">{formatDays(metricas.tempoComoCliente)}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">Frequência ideal</span>
              <span className="font-medium">{cliente.frequenciaIdeal} dias</span>
            </div>
            
            {metricas.frequenciaReal && (
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">Frequência real</span>
                <span className="font-medium">{Math.round(metricas.frequenciaReal)} dias</span>
              </div>
            )}
            
            {metricas.ultimoAtendimento && (
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">Último atendimento</span>
                <span className="font-medium">{metricas.ultimoAtendimento} dias atrás</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="heading-premium flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Status de Risco
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-6">
              <div className={`text-3xl font-bold mb-2 ${getRiscoColor()}`}>
                {getRiscoLabel()}
              </div>
              <Badge variant="outline" className={`${getRiscoColor()} border-current`}>
                {cliente.categoria.toUpperCase()}
              </Badge>
            </div>

            {metricas.ultimoAtendimento && (
              <div className="space-y-2">
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      metricas.ultimoAtendimento > 180 ? 'bg-destructive' :
                      metricas.ultimoAtendimento > 90 ? 'bg-warning' : 'bg-success'
                    }`}
                    style={{ 
                      width: `${Math.min(100, (metricas.ultimoAtendimento / 180) * 100)}%` 
                    }}
                  ></div>
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  {metricas.ultimoAtendimento} / 180 dias desde último atendimento
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Padrões de Comportamento */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="heading-premium">Padrões de Comportamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2">Perfil de Consumo</h4>
              <Badge variant="outline" className="mb-2">
                {cliente.perfilConsumo.charAt(0).toUpperCase() + cliente.perfilConsumo.slice(1)}
              </Badge>
              <p className="text-xs text-muted-foreground">
                {cliente.perfilConsumo === 'inovador' && 'Busca sempre novidades'}
                {cliente.perfilConsumo === 'moderado' && 'Equilibrio entre tradição e inovação'}
                {cliente.perfilConsumo === 'conservador' && 'Prefere tratamentos conhecidos'}
              </p>
            </div>

            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2">Sensibilidade a Preço</h4>
              <Badge variant="outline" className="mb-2">
                {cliente.sensibilidadePreco.charAt(0).toUpperCase() + cliente.sensibilidadePreco.slice(1)}
              </Badge>
              <p className="text-xs text-muted-foreground">
                {cliente.sensibilidadePreco === 'baixa' && 'Foco na qualidade'}
                {cliente.sensibilidadePreco === 'media' && 'Busca custo-benefício'}
                {cliente.sensibilidadePreco === 'alta' && 'Preço é fator decisivo'}
              </p>
            </div>

            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2">Sazonalidade</h4>
              {cliente.sazonalidade.length > 0 ? (
                <div className="space-y-1">
                  {cliente.sazonalidade.map((epoca, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {epoca}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Sem padrão sazonal</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recomendações */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="heading-premium">Recomendações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metricas.ultimoAtendimento && metricas.ultimoAtendimento > cliente.frequenciaIdeal && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm">
                  <strong>Atenção:</strong> Cliente está {metricas.ultimoAtendimento - cliente.frequenciaIdeal} dias 
                  além da frequência ideal. Considere fazer contato.
                </p>
              </div>
            )}
            
            {metricas.satisfacaoMedia > 0 && metricas.satisfacaoMedia < 7 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm">
                  <strong>Ação necessária:</strong> Satisfação abaixo do esperado. 
                  Agende uma conversa para entender pontos de melhoria.
                </p>
              </div>
            )}
            
            {cliente.categoria === 'vip' && (
              <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                <p className="text-sm">
                  <strong>Cliente VIP:</strong> Mantenha atendimento personalizado e 
                  ofereça acesso prioritário a novos tratamentos.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};