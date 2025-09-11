import { Calendar, Star, DollarSign, CreditCard, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AtendimentoHistorico } from "@/types/cliente";

interface ClienteTimelineProps {
  historico: AtendimentoHistorico[];
}

export const ClienteTimeline = ({ historico }: ClienteTimelineProps) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatValue = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const getSatisfacaoColor = (satisfacao?: number) => {
    if (!satisfacao) return 'text-muted-foreground';
    if (satisfacao >= 9) return 'text-success';
    if (satisfacao >= 7) return 'text-warning';
    return 'text-destructive';
  };

  const getSatisfacaoLabel = (satisfacao?: number) => {
    if (!satisfacao) return 'Não avaliado';
    if (satisfacao >= 9) return 'Excelente';
    if (satisfacao >= 7) return 'Bom';
    if (satisfacao >= 5) return 'Regular';
    return 'Insatisfeito';
  };

  if (historico.length === 0) {
    return (
      <Card className="glass-effect p-12 text-center">
        <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="heading-premium text-lg mb-2">Nenhum histórico encontrado</h3>
        <p className="text-premium">
          Os atendimentos realizados aparecerão aqui
        </p>
      </Card>
    );
  }

  const historicoOrdenado = [...historico].sort((a, b) => 
    new Date(b.data).getTime() - new Date(a.data).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="w-5 h-5 text-primary" />
        <h2 className="heading-premium text-xl">Histórico de Atendimentos</h2>
        <Badge variant="outline" className="ml-auto">
          {historico.length} atendimento{historico.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border"></div>

        <div className="space-y-8">
          {historicoOrdenado.map((atendimento, index) => (
            <div key={atendimento.id} className="relative">
              {/* Timeline Dot */}
              <div className="absolute left-6 w-4 h-4 bg-primary rounded-full border-4 border-background shadow-soft"></div>
              
              {/* Content */}
              <div className="ml-16">
                <Card className="glass-effect hover-elegant">
                  <CardHeader className="pb-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="heading-premium text-lg">
                          {formatDate(atendimento.data)}
                        </CardTitle>
                        <p className="text-premium mt-1">
                          Profissional: {atendimento.profissional}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {formatValue(atendimento.valor)}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />
                            {atendimento.formaPagamento}
                          </div>
                        </div>
                        
                        {atendimento.satisfacao && (
                          <div className="text-center">
                            <div className={`text-lg font-bold flex items-center gap-1 ${getSatisfacaoColor(atendimento.satisfacao)}`}>
                              <Star className="w-4 h-4" />
                              {atendimento.satisfacao}/10
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {getSatisfacaoLabel(atendimento.satisfacao)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Procedimentos */}
                    <div>
                      <h4 className="heading-premium text-sm mb-3">Procedimentos Realizados</h4>
                      <div className="flex flex-wrap gap-2">
                        {atendimento.procedimentos.map((proc, idx) => (
                          <Badge key={idx} variant="outline" className="bg-primary/5">
                            {proc}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Produtos */}
                    {atendimento.produtos.length > 0 && (
                      <div>
                        <h4 className="heading-premium text-sm mb-3">Produtos Utilizados</h4>
                        <div className="flex flex-wrap gap-2">
                          {atendimento.produtos.map((produto, idx) => (
                            <Badge key={idx} variant="secondary">
                              {produto}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Observações */}
                    {atendimento.observacoes && (
                      <div>
                        <h4 className="heading-premium text-sm mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Observações
                        </h4>
                        <div className="bg-muted/30 rounded-lg p-4">
                          <p className="text-sm text-muted-foreground">
                            {atendimento.observacoes}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Recomendações */}
                    {atendimento.recomendacoes && atendimento.recomendacoes.length > 0 && (
                      <div>
                        <h4 className="heading-premium text-sm mb-3">Recomendações</h4>
                        <ul className="space-y-1">
                          {atendimento.recomendacoes.map((rec, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Fotos */}
                    {atendimento.fotos && (
                      <div>
                        <h4 className="heading-premium text-sm mb-3">Registro Fotográfico</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {atendimento.fotos.antes.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">Antes</p>
                              <div className="aspect-square bg-muted/30 rounded-lg flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">
                                  {atendimento.fotos.antes.length} foto{atendimento.fotos.antes.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          )}
                          {atendimento.fotos.depois.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">Depois</p>
                              <div className="aspect-square bg-muted/30 rounded-lg flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">
                                  {atendimento.fotos.depois.length} foto{atendimento.fotos.depois.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};