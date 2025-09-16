/**
 * Integrity report UI components
 * Provides comprehensive display of data integrity verification results
 */

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, User, Building, FileText, Link, Settings, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { UserIntegrityReport, IntegrityCheckResult } from '@/services/integrity-verification.service';

interface IntegrityReportProps {
  report: UserIntegrityReport;
  onAutoFix?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

export const IntegrityReport: React.FC<IntegrityReportProps> = ({
  report,
  onAutoFix,
  onRefresh,
  isLoading = false,
  className
}) => {
  const getStatusColor = (status: 'valid' | 'invalid' | 'warning') => {
    switch (status) {
      case 'valid': return 'text-green-600 bg-green-50 border-green-200';
      case 'invalid': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const getStatusIcon = (status: 'valid' | 'invalid' | 'warning') => {
    switch (status) {
      case 'valid': return <CheckCircle className="h-5 w-5" />;
      case 'invalid': return <XCircle className="h-5 w-5" />;
      case 'warning': return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const completionPercentage = (report.summary.passedChecks / report.summary.totalChecks) * 100;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card className={cn("border-2", getStatusColor(report.overallStatus))}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(report.overallStatus)}
              <div>
                <CardTitle className="text-lg">Relatório de Integridade</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Usuário: {report.email} • ID: {report.userId.slice(0, 8)}...
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Atualizar'}
                </Button>
              )}
              {onAutoFix && report.overallStatus !== 'valid' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onAutoFix}
                  disabled={isLoading}
                >
                  Auto-Corrigir
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Integridade dos Dados</span>
                <span>{Math.round(completionPercentage)}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>

            {/* Summary */}
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{report.summary.passedChecks}</div>
                <div className="text-xs text-muted-foreground">Válidos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{report.summary.failedChecks}</div>
                <div className="text-xs text-muted-foreground">Falhas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{report.summary.warningChecks}</div>
                <div className="text-xs text-muted-foreground">Avisos</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{report.summary.totalChecks}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Checks */}
      <div className="grid gap-4">
        <IntegrityCheckCard
          title="Perfil do Usuário"
          icon={<User className="h-5 w-5" />}
          check={report.checks.profile}
        />
        <IntegrityCheckCard
          title="Roles do Usuário"
          icon={<Settings className="h-5 w-5" />}
          check={report.checks.userRole}
        />
        <IntegrityCheckCard
          title="Dados da Clínica"
          icon={<Building className="h-5 w-5" />}
          check={report.checks.clinic}
        />
        <IntegrityCheckCard
          title="Registro Profissional"
          icon={<FileText className="h-5 w-5" />}
          check={report.checks.professional}
        />
        <IntegrityCheckCard
          title="Vínculo Profissional"
          icon={<Link className="h-5 w-5" />}
          check={report.checks.clinicProfessionalLink}
        />
        <IntegrityCheckCard
          title="Templates de Procedimentos"
          icon={<FileText className="h-5 w-5" />}
          check={report.checks.templates}
        />
        <IntegrityCheckCard
          title="Conclusão do Onboarding"
          icon={<CheckCircle className="h-5 w-5" />}
          check={report.checks.onboardingCompletion}
        />
      </div>

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-yellow-600 mt-1">•</span>
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface IntegrityCheckCardProps {
  title: string;
  icon: React.ReactNode;
  check: IntegrityCheckResult;
}

const IntegrityCheckCard: React.FC<IntegrityCheckCardProps> = ({
  title,
  icon,
  check
}) => {
  const hasErrors = check.errors.length > 0;
  const hasWarnings = check.warnings.length > 0;
  
  const status = hasErrors ? 'invalid' : hasWarnings ? 'warning' : 'valid';
  const statusColor = status === 'valid' ? 'border-green-200' : 
                     status === 'warning' ? 'border-yellow-200' : 'border-red-200';

  return (
    <Card className={cn("border", statusColor)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <Badge variant={status === 'valid' ? 'default' : status === 'warning' ? 'secondary' : 'destructive'}>
            {status === 'valid' ? 'Válido' : status === 'warning' ? 'Aviso' : 'Erro'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {check.errors.length > 0 && (
          <div className="space-y-1 mb-3">
            <h4 className="text-sm font-medium text-red-600">Erros:</h4>
            {check.errors.map((error, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-red-600">
                <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            ))}
          </div>
        )}
        
        {check.warnings.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-yellow-600">Avisos:</h4>
            {check.warnings.map((warning, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-yellow-600">
                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

        {check.errors.length === 0 && check.warnings.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-3 w-3" />
            <span>Todos os dados estão corretos</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Batch report summary component
interface BatchReportSummaryProps {
  reports: UserIntegrityReport[];
  className?: string;
}

export const BatchReportSummary: React.FC<BatchReportSummaryProps> = ({
  reports,
  className
}) => {
  const stats = {
    total: reports.length,
    valid: reports.filter(r => r.overallStatus === 'valid').length,
    invalid: reports.filter(r => r.overallStatus === 'invalid').length,
    warning: reports.filter(r => r.overallStatus === 'warning').length
  };

  const validPercentage = (stats.valid / stats.total) * 100;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Resumo da Verificação em Lote</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
              <div className="text-xs text-muted-foreground">Válidos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{stats.warning}</div>
              <div className="text-xs text-muted-foreground">Avisos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{stats.invalid}</div>
              <div className="text-xs text-muted-foreground">Inválidos</div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Taxa de Sucesso</span>
              <span>{Math.round(validPercentage)}%</span>
            </div>
            <Progress value={validPercentage} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};