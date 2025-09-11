import { Link } from "react-router-dom";
import { Calendar, Phone, Star, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Cliente } from "@/types/cliente";

interface ClienteCardProps {
  cliente: Cliente;
}

export const ClienteCard = ({ cliente }: ClienteCardProps) => {
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  const getDaysAgo = (date: Date) => {
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Link to={`/clientes/${cliente.id}`}>
      <Card className="glass-effect hover-elegant cursor-pointer group transition-all duration-300 hover:scale-[1.02]">
        <CardContent className="p-6">
          {/* Header with Avatar and Category */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-primary/20">
                <AvatarImage src={cliente.foto} alt={cliente.nome} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {cliente.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="heading-premium text-sm font-medium truncate">
                  {cliente.nome}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {cliente.email}
                </p>
              </div>
            </div>
            <Badge className={`${getCategoriaColor(cliente.categoria)} text-xs`}>
              {getCategoriaLabel(cliente.categoria)}
            </Badge>
          </div>

          {/* Contact Info */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="w-3 h-3" />
              <span className="truncate">{cliente.telefone}</span>
            </div>
          </div>

          {/* Tags */}
          {cliente.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {cliente.tags.slice(0, 2).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  style={{ borderColor: tag.cor, color: tag.cor }}
                  className="text-xs px-2 py-0.5"
                >
                  {tag.nome}
                </Badge>
              ))}
              {cliente.tags.length > 2 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  +{cliente.tags.length - 2}
                </Badge>
              )}
            </div>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-2 bg-background/50 rounded-lg">
              <div className="text-sm font-bold text-primary">
                R$ {cliente.ltv.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">LTV</div>
            </div>
            <div className="text-center p-2 bg-background/50 rounded-lg">
              <div className="text-sm font-bold text-primary flex items-center justify-center gap-1">
                {cliente.nps && <Star className="w-3 h-3 text-warning" />}
                {cliente.nps || '--'}/10
              </div>
              <div className="text-xs text-muted-foreground">NPS</div>
            </div>
          </div>

          {/* Last Interaction */}
          <div className="space-y-2">
            {cliente.ultimoAtendimento && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Último atendimento
                </div>
                <span className="text-foreground">
                  {formatDate(cliente.ultimoAtendimento)} ({getDaysAgo(cliente.ultimoAtendimento)}d)
                </span>
              </div>
            )}
            
            {cliente.proximoAgendamento && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  Próximo agendamento
                </div>
                <span className="text-primary font-medium">
                  {formatDate(cliente.proximoAgendamento)}
                </span>
              </div>
            )}

            {!cliente.proximoAgendamento && cliente.categoria === 'risco' && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <Clock className="w-3 h-3" />
                Sem agendamento há {cliente.ultimoAtendimento ? getDaysAgo(cliente.ultimoAtendimento) : '?'} dias
              </div>
            )}
          </div>

          {/* Hover Effect Indicator */}
          <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="text-xs text-primary font-medium text-center">
              Clique para ver detalhes
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};