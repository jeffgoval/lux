/**
 * 🏢 SELETOR DE CLÍNICA MULTI-TENANT
 * 
 * Componente para troca segura entre clínicas com validação de acesso
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Check, ChevronDown, Building2, Crown, Shield, Users, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { UserClinicAccess, UserRole } from '@/types/auth.types';
import { AuthorizationService } from '@/services/authorization.service';

// ============================================================================
// INTERFACES
// ============================================================================

interface ClinicSelectorProps {
  className?: string;
  showRoleInfo?: boolean;
  showExpiryWarning?: boolean;
  onClinicChange?: (clinic: UserClinicAccess) => void;
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

const getRoleIcon = (role: UserRole) => {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return <Shield className="w-4 h-4 text-purple-600" />;
    case UserRole.CLINIC_OWNER:
      return <Crown className="w-4 h-4 text-yellow-600" />;
    case UserRole.CLINIC_MANAGER:
      return <Users className="w-4 h-4 text-blue-600" />;
    case UserRole.PROFESSIONAL:
      return <Building2 className="w-4 h-4 text-green-600" />;
    case UserRole.RECEPTIONIST:
      return <Users className="w-4 h-4 text-gray-600" />;
    default:
      return <Users className="w-4 h-4 text-gray-400" />;
  }
};

const getRoleLabel = (role: UserRole): string => {
  const labels: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: 'Super Admin',
    [UserRole.CLINIC_OWNER]: 'Proprietário',
    [UserRole.CLINIC_MANAGER]: 'Gerente',
    [UserRole.PROFESSIONAL]: 'Profissional',
    [UserRole.RECEPTIONIST]: 'Recepcionista',
    [UserRole.PATIENT]: 'Paciente'
  };
  return labels[role] || role;
};

const getRoleBadgeVariant = (role: UserRole) => {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return 'destructive';
    case UserRole.CLINIC_OWNER:
      return 'default';
    case UserRole.CLINIC_MANAGER:
      return 'secondary';
    default:
      return 'outline';
  }
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function ClinicSelector({
  className = '',
  showRoleInfo = true,
  showExpiryWarning = true,
  onClinicChange
}: ClinicSelectorProps) {
  const { 
    roles,
    isInitializing 
  } = useUnifiedAuth();
  
  // Extract clinic information from roles
  const currentClinic = roles.find(r => r.clinica_id)?.clinica_id || null;
  const availableClinics = roles.filter(r => r.clinica_id).map(r => ({ id: r.clinica_id, name: `Clínica ${r.clinica_id}` }));
  const switchClinic = async (clinicId: string) => {
    // TODO: Implement clinic switching in unified auth
    console.log('Switching to clinic:', clinicId);
  };
  
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  // ==========================================================================
  // LÓGICA DE VALIDAÇÃO E FILTRAGEM
  // ==========================================================================

  const validClinics = useMemo(() => {
    return AuthorizationService.filterAccessibleClinics(availableClinics);
  }, [availableClinics]);

  const clinicsWithWarnings = useMemo(() => {
    return validClinics.map(clinic => {
      const warnings: string[] = [];
      
      // Verificar expiração
      if (clinic.expiresAt) {
        const expiryDate = new Date(clinic.expiresAt);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry <= 7) {
          warnings.push(`Acesso expira em ${daysUntilExpiry} dias`);
        }
      }
      
      // Verificar status da clínica
      if (!clinic.clinic.active) {
        warnings.push('Clínica inativa');
      }
      
      return {
        ...clinic,
        warnings
      };
    });
  }, [validClinics]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleClinicSwitch = useCallback(async (targetClinic: UserClinicAccess) => {
    if (isSwitching || targetClinic.clinic.id === currentClinic?.clinic.id) {
      return;
    }

    setIsSwitching(true);
    setSwitchError(null);

    try {
      const success = await switchClinic(targetClinic.clinic.id);
      
      if (success) {
        onClinicChange?.(targetClinic);
      } else {
        setSwitchError('Falha ao trocar de clínica. Tente novamente.');
      }
    } catch (error) {
      console.error('Clinic switch error:', error);
      setSwitchError('Erro interno. Tente novamente.');
    } finally {
      setIsSwitching(false);
    }
  }, [isSwitching, currentClinic, switchClinic, onClinicChange]);

  // ==========================================================================
  // RENDERIZAÇÃO CONDICIONAL
  // ==========================================================================

  // Se não há clínicas disponíveis
  if (validClinics.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Nenhuma clínica acessível encontrada. Entre em contato com o administrador.
        </AlertDescription>
      </Alert>
    );
  }

  // Se há apenas uma clínica
  if (validClinics.length === 1) {
    const clinic = validClinics[0];
    return (
      <div className={`flex items-center space-x-3 p-3 bg-gray-50 rounded-lg ${className}`}>
        <Avatar className="w-8 h-8">
          <AvatarImage src={clinic.clinic.settings?.branding?.logo} />
          <AvatarFallback>
            {clinic.clinic.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {clinic.clinic.name}
          </p>
          {showRoleInfo && (
            <div className="flex items-center space-x-2 mt-1">
              {getRoleIcon(clinic.role)}
              <span className="text-xs text-gray-500">
                {getRoleLabel(clinic.role)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Múltiplas clínicas - mostrar seletor
  return (
    <div className={className}>
      {switchError && (
        <Alert variant="destructive" className="mb-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{switchError}</AlertDescription>
        </Alert>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            disabled={isLoading || isSwitching}
          >
            <div className="flex items-center space-x-3">
              <Avatar className="w-6 h-6">
                <AvatarImage src={currentClinic?.clinic.settings?.branding?.logo} />
                <AvatarFallback className="text-xs">
                  {currentClinic?.clinic.name.substring(0, 2).toUpperCase() || '??'}
                </AvatarFallback>
              </Avatar>
              
              <div className="text-left">
                <p className="text-sm font-medium truncate max-w-[150px]">
                  {currentClinic?.clinic.name || 'Selecionar Clínica'}
                </p>
                {showRoleInfo && currentClinic && (
                  <p className="text-xs text-gray-500">
                    {getRoleLabel(currentClinic.role)}
                  </p>
                )}
              </div>
            </div>
            
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-80" align="start">
          <DropdownMenuLabel>Clínicas Disponíveis</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {clinicsWithWarnings.map((clinic) => (
            <DropdownMenuItem
              key={clinic.clinic.id}
              className="p-3 cursor-pointer"
              onClick={() => handleClinicSwitch(clinic)}
              disabled={isSwitching}
            >
              <div className="flex items-center space-x-3 w-full">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={clinic.clinic.settings?.branding?.logo} />
                  <AvatarFallback>
                    {clinic.clinic.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {clinic.clinic.name}
                    </p>
                    {currentClinic?.clinic.id === clinic.clinic.id && (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                  </div>

                  <div className="flex items-center space-x-2 mt-1">
                    {getRoleIcon(clinic.role)}
                    <Badge variant={getRoleBadgeVariant(clinic.role)} className="text-xs">
                      {getRoleLabel(clinic.role)}
                    </Badge>
                  </div>

                  {/* Avisos */}
                  {showExpiryWarning && clinic.warnings.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {clinic.warnings.map((warning, index) => (
                        <div key={index} className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span className="text-xs text-amber-600">{warning}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </DropdownMenuItem>
          ))}

          {/* Informações adicionais */}
          <DropdownMenuSeparator />
          <div className="p-3 text-xs text-gray-500">
            <p>💡 Você pode trocar de clínica a qualquer momento</p>
            <p>🔒 Dados são isolados entre clínicas</p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================================
// COMPONENTE COMPACTO PARA HEADER
// ============================================================================

export function CompactClinicSelector({ className = '' }: { className?: string }) {
  const { roles } = useUnifiedAuth();
  const currentClinic = roles.find(r => r.clinica_id)?.clinica_id || null;

  if (!currentClinic) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Avatar className="w-6 h-6">
        <AvatarImage src={currentClinic.clinic.settings?.branding?.logo} />
        <AvatarFallback className="text-xs">
          {currentClinic.clinic.name.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="hidden sm:block">
        <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
          {currentClinic.clinic.name}
        </p>
        <p className="text-xs text-gray-500">
          {getRoleLabel(currentClinic.role)}
        </p>
      </div>
    </div>
  );
}
