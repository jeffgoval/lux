/**
 * ConflictResolver - Componente para Resolução Visual de Conflitos
 * Interface sofisticada para identificar e resolver conflitos de agendamento
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Clock, 
  Calendar, 
  User, 
  MapPin, 
  CheckCircle, 
  XCircle,
  ArrowRight,
  Lightbulb,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

import { ConflictAnalysis, ConflictInfo, AlternativeSlot, AgendamentoData } from '@/services/SmartSchedulingEngine';

// =====================================================
// INTERFACES
// =====================================================

export interface ConflictResolverProps {
  conflicts: ConflictAnalysis;
  agendamento: AgendamentoData;
  onResolve: (resolution: ConflictResolution) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export interface ConflictResolution {
  action: 'force' | 'reschedule' | 'modify' | 'cancel';
  newDateTime?: Date;
  newProfessional?: string;
  newRoom?: string;
  notes?: string;
  selectedAlternative?: AlternativeSlot;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const ConflictResolver: React.FC<ConflictResolverProps> = ({
  conflicts,
  agendamento,
  onResolve,
  onCancel,
  isLoading = false
}) => {
  const [selectedResolution, setSelectedResolution] = useState<ConflictResolution | null>(null);
  const [selectedAlternative, setSelectedAlternative] = useState<AlternativeSlot | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  // Determinar severidade geral dos conflitos
  const overallSeverity = conflicts.conflitos.reduce((max, conflict) => {
    const severityLevels = { 'baixa': 1, 'media': 2, 'alta': 3, 'critica': 4 };
    return Math.max(max, severityLevels[conflict.severidade]);
  }, 0);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critica': return 'destructive';
      case 'alta': return 'destructive';
      case 'media': return 'warning';
      case 'baixa': return 'secondary';
      default: return 'secondary';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critica': return <XCircle className="h-4 w-4" />;
      case 'alta': return <AlertTriangle className="h-4 w-4" />;
      case 'media': return <Clock className="h-4 w-4" />;
      case 'baixa': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const handleAlternativeSelect = (alternative: AlternativeSlot) => {
    setSelectedAlternative(alternative);
    setSelectedResolution({
      action: 'reschedule',
      newDateTime: alternative.dataHorario,
      newProfessional: alternative.profissionalId,
      newRoom: alternative.salaId,
      selectedAlternative: alternative
    });
  };

  const handleForceSchedule = () => {
    setSelectedResolution({
      action: 'force',
      notes: 'Agendamento forçado apesar dos conflitos'
    });
  };

  const handleResolve = () => {
    if (selectedResolution) {
      onResolve(selectedResolution);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Status Geral */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className={`p-3 rounded-full ${
            overallSeverity >= 3 ? 'bg-destructive/10 text-destructive' : 
            overallSeverity >= 2 ? 'bg-warning/10 text-warning' : 
            'bg-secondary/10 text-secondary-foreground'
          }`}>
            {overallSeverity >= 3 ? <XCircle className="h-6 w-6" /> : 
             overallSeverity >= 2 ? <AlertTriangle className="h-6 w-6" /> : 
             <CheckCircle className="h-6 w-6" />}
          </div>
          <div>
            <h2 className="text-2xl font-bold heading-premium">
              {overallSeverity >= 3 ? 'Conflitos Críticos Detectados' :
               overallSeverity >= 2 ? 'Conflitos Identificados' :
               'Avisos de Agendamento'}
            </h2>
            <p className="text-muted-foreground">
              {conflicts.conflitos.length} {conflicts.conflitos.length === 1 ? 'conflito encontrado' : 'conflitos encontrados'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Detalhes do Agendamento */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Detalhes do Agendamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{format(agendamento.dataAgendamento, 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Profissional ID: {agendamento.profissionalId.slice(0, 8)}...</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{agendamento.salaId ? `Sala: ${agendamento.salaId.slice(0, 8)}...` : 'Sala não definida'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{agendamento.duracaoMinutos} minutos</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Conflitos */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Conflitos Identificados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-60">
            <div className="space-y-3">
              {conflicts.conflitos.map((conflict, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-border transition-colors"
                >
                  <div className={`p-1 rounded-full ${
                    conflict.severidade === 'critica' ? 'bg-destructive/10 text-destructive' :
                    conflict.severidade === 'alta' ? 'bg-destructive/10 text-destructive' :
                    conflict.severidade === 'media' ? 'bg-warning/10 text-warning' :
                    'bg-secondary/10 text-secondary-foreground'
                  }`}>
                    {getSeverityIcon(conflict.severidade)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getSeverityColor(conflict.severidade) as any} className="text-xs">
                        {conflict.severidade.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {conflict.tipo.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-foreground mb-1">
                      {conflict.descricao}
                    </p>
                    
                    {conflict.sugestaoResolucao && (
                      <div className="flex items-start gap-2 mt-2 p-2 bg-muted/50 rounded-md">
                        <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          {conflict.sugestaoResolucao}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Alternativas Disponíveis */}
      {conflicts.alternativasDisponiveis.length > 0 && (
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Alternativas Sugeridas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {conflicts.alternativasDisponiveis.map((alternative, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-soft ${
                    selectedAlternative?.dataHorario.getTime() === alternative.dataHorario.getTime()
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleAlternativeSelect(alternative)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10 text-primary">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {format(alternative.dataHorario, 'EEEE, dd/MM/yyyy', { locale: ptBR })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(alternative.dataHorario, 'HH:mm', { locale: ptBR })} • {alternative.motivo}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        Score: {alternative.pontuacao}
                      </Badge>
                      {selectedAlternative?.dataHorario.getTime() === alternative.dataHorario.getTime() && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sugestões de Resolução */}
      {conflicts.sugestoesResolucao.length > 0 && (
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            <strong>Sugestões:</strong>
            <ul className="mt-2 space-y-1">
              {conflicts.sugestoesResolucao.map((sugestao, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <ArrowRight className="h-3 w-3 mt-1 flex-shrink-0" />
                  {sugestao}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Ações de Resolução */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Ações de Resolução</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Reagendar com Alternativa */}
            {selectedAlternative && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 border border-primary/20 rounded-lg bg-primary/5"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-primary">Reagendar para:</h4>
                  <Badge variant="secondary">Recomendado</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {format(selectedAlternative.dataHorario, 'EEEE, dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}
                </p>
                <Button 
                  onClick={handleResolve}
                  disabled={isLoading}
                  className="w-full"
                  variant="premium"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Confirmar Reagendamento
                </Button>
              </motion.div>
            )}

            {/* Forçar Agendamento */}
            {conflicts.podeResolver && overallSeverity < 4 && (
              <div className="p-4 border border-warning/20 rounded-lg bg-warning/5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <h4 className="font-medium text-warning">Forçar Agendamento</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Prosseguir com o agendamento apesar dos conflitos identificados.
                </p>
                <Button 
                  onClick={handleForceSchedule}
                  variant="outline"
                  className="w-full border-warning text-warning hover:bg-warning/10"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Forçar Agendamento
                </Button>
              </div>
            )}

            {/* Cancelar */}
            <div className="flex gap-3">
              <Button 
                onClick={onCancel}
                variant="outline"
                className="flex-1"
                disabled={isLoading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              
              {selectedResolution && selectedResolution.action === 'force' && (
                <Button 
                  onClick={handleResolve}
                  variant="destructive"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Confirmar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConflictResolver;