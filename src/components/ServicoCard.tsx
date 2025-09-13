import { Clock, DollarSign, Star, Users, Zap, Calendar, MoreVertical, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Servico } from '@/types/servico';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ServicoCardProps {
  servico: Servico;
  variant?: 'grid' | 'lista';
}

const categoriaColors = {
  facial: 'hsl(220, 70%, 50%)',
  corporal: 'hsl(280, 70%, 50%)',
  capilar: 'hsl(160, 70%, 50%)',
  estetica_avancada: 'hsl(350, 70%, 50%)',
  wellness: 'hsl(120, 70%, 50%)',
  masculino: 'hsl(200, 70%, 50%)'
};

const complexidadeColors = {
  basico: 'hsl(120, 50%, 50%)',
  intermediario: 'hsl(60, 70%, 50%)',
  avancado: 'hsl(30, 70%, 50%)',
  premium: 'hsl(340, 70%, 50%)'
};

const statusLabels = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  sazonal: 'Sazonal',
  descontinuado: 'Descontinuado'
};

export default function ServicoCard({ servico, variant = 'grid' }: ServicoCardProps) {
  const getCategoriaEmoji = (categoria: string) => {
    const emojis: Record<string, string> = {
      facial: '✨',
      corporal: '💆',
      capilar: '💇',
      estetica_avancada: '⚡',
      wellness: '🧘',
      masculino: '👨'
    };
    return emojis[categoria] || '💎';
  };

  const getComplexidadeLabel = (nivel: string) => {
    const labels: Record<string, string> = {
      basico: 'Básico',
      intermediario: 'Intermediário',
      avancado: 'Avançado',
      premium: 'Premium'
    };
    return labels[nivel] || nivel;
  };

  if (variant === 'lista') {
    return (
      <Card className="hover:shadow-md transition-all duration-200 border-l-4" 
            style={{ borderLeftColor: categoriaColors[servico.categoria] }}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="w-16 h-16 rounded-lg overflow-hidden relative">
                {servico.imagemPrincipal ? (
                  <img 
                    src={servico.imagemPrincipal} 
                    alt={servico.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20 flex items-center justify-center relative">
                    {/* Mini background pattern */}
                    <div className="absolute inset-0 opacity-20">
                      <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-primary/40"></div>
                      <div className="absolute top-3 right-2 w-1 h-1 rounded-full bg-secondary/50"></div>
                      <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-accent/40"></div>
                      <div className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-primary/30"></div>
                    </div>
                    
                    {/* Icon */}
                    <div className="relative z-10 w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center">
                      <span className="text-lg">
                        {servico.icone || getCategoriaEmoji(servico.categoria)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg truncate">{servico.nome}</h3>
                  <Badge variant="outline" className="text-xs">
                    {statusLabels[servico.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                  {servico.descricaoComercial}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {servico.duracaoPadrao}min
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {servico.popularidade}%
                  </div>
                  {servico.satisfacaoMedia && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-current text-yellow-500" />
                      {servico.satisfacaoMedia.toFixed(1)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-bold text-lg">
                  R$ {servico.precoBase.toLocaleString('pt-BR')}
                </div>
                <div className="text-sm text-muted-foreground">
                  Margem: {servico.margemLucro.toFixed(1)}%
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to={`/servicos/${servico.id}`}>Ver Detalhes</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={`/servicos/${servico.id}/editar`}>Editar</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={`/agendamentos/novo?servico=${servico.id}`}>Agendar</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      {/* Imagem/Header */}
      <div className="relative h-40 overflow-hidden">
        {servico.imagemPrincipal ? (
          <img 
            src={servico.imagemPrincipal} 
            alt={servico.nome}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20 flex items-center justify-center relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-primary/30"></div>
              <div className="absolute top-12 right-8 w-4 h-4 rounded-full bg-secondary/40"></div>
              <div className="absolute bottom-8 left-8 w-6 h-6 rounded-full bg-accent/30"></div>
              <div className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-primary/20"></div>
            </div>
            
            {/* Main Icon */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">
                  {servico.icone || getCategoriaEmoji(servico.categoria)}
                </span>
              </div>
              <div className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider">
                {servico.categoria.replace('_', ' ')}
              </div>
            </div>
            
            {/* Subtle shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          </div>
        )}
        
        {/* Badges sobrepostos */}
        <div className="absolute top-3 left-3">
          <Badge 
            variant="secondary"
            className="text-xs font-medium"
            style={{ backgroundColor: `${categoriaColors[servico.categoria]}20`, 
                     borderColor: categoriaColors[servico.categoria] }}
          >
            {getCategoriaEmoji(servico.categoria)} {servico.categoria.replace('_', ' ')}
          </Badge>
        </div>
        
        <div className="absolute top-3 right-3">
          <Badge 
            variant={servico.status === 'ativo' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {statusLabels[servico.status]}
          </Badge>
        </div>

        {servico.sazonal && (
          <div className="absolute bottom-3 left-3">
            <Badge variant="outline" className="text-xs bg-background/80">
              <Calendar className="w-3 h-3 mr-1" />
              Sazonal
            </Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
              {servico.nome}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {servico.descricaoComercial}
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/servicos/${servico.id}`}>Ver Detalhes</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/servicos/${servico.id}/editar`}>Editar</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/agendamentos/novo?servico=${servico.id}`}>Agendar</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Informações Principais */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{servico.duracaoPadrao}min</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">R$ {servico.precoBase.toLocaleString('pt-BR')}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <Badge 
              variant="outline" 
              className="text-xs px-2 py-0"
              style={{ color: complexidadeColors[servico.nivelComplexidade] }}
            >
              {getComplexidadeLabel(servico.nivelComplexidade)}
            </Badge>
          </div>
          
          {servico.satisfacaoMedia && (
            <div className="flex items-center gap-2 text-sm">
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
              <span>{servico.satisfacaoMedia.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Popularidade */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Popularidade</span>
            <span className="font-medium">{servico.popularidade}%</span>
          </div>
          <Progress value={servico.popularidade} className="h-2" />
        </div>

        {/* Tags */}
        {servico.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {servico.tags.slice(0, 3).map(tag => (
              <Badge 
                key={tag.id} 
                variant="outline" 
                className="text-xs px-2 py-0"
                style={{ borderColor: tag.cor, color: tag.cor }}
              >
                {tag.nome}
              </Badge>
            ))}
            {servico.tags.length > 3 && (
              <Badge variant="outline" className="text-xs px-2 py-0">
                +{servico.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link to={`/servicos/${servico.id}`}>Ver Detalhes</Link>
          </Button>
          <Button asChild size="sm" className="flex-1">
            <Link to={`/agendamentos/novo?servico=${servico.id}`}>Agendar</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}