/**
 * 🛡️ GUARD DE AUTENTICAÇÃO SEGURO V2
 * 
 * Guard determinístico que elimina loops infinitos e race conditions
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSecureAuth } from '@/contexts/SecureAuthContext';
import { UserRole, Permission } from '@/types/auth.types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, RefreshCw } from 'lucide-react';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

interface SecureAuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: (UserRole | string)[]; // Aceita tanto roles novas quanto antigas
  requiredPermissions?: Permission[];
  requireAll?: boolean; // Se true, requer TODAS as roles/permissões
  fallback?: React.ReactNode;
  allowOnboarding?: boolean;
  redirectTo?: string;
}

interface AuthDecision {
  action: 'ALLOW' | 'REDIRECT' | 'DENY' | 'LOADING';
  redirectTo?: string;
  reason?: string;
}

// ============================================================================
// MAPEAMENTO DE ROLES ANTIGAS PARA NOVAS
// ============================================================================

const mapLegacyRole = (role: string): UserRole | null => {
  const roleMap: Record<string, UserRole> = {
    'super_admin': UserRole.SUPER_ADMIN,
    'proprietaria': UserRole.CLINIC_OWNER,
    'clinic_owner': UserRole.CLINIC_OWNER,
    'gerente': UserRole.CLINIC_MANAGER,
    'clinic_manager': UserRole.CLINIC_MANAGER,
    'profissionais': UserRole.PROFESSIONAL,
    'professional': UserRole.PROFESSIONAL,
    'recepcionistas': UserRole.RECEPTIONIST,
    'receptionist': UserRole.RECEPTIONIST,
    'patient': UserRole.PATIENT
  };

  return roleMap[role] || null;
};

// ============================================================================
// ROTAS PÚBLICAS (não precisam de autenticação)
// ============================================================================

const PUBLIC_ROUTES = [
  '/',
  '/auth',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/unauthorized',
  '/404',
  '/500'
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function SecureAuthGuard({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  requireAll = false,
  fallback,
  allowOnboarding = false,
  redirectTo
}: SecureAuthGuardProps) {
  const location = useLocation();
  const auth = useSecureAuth();
  const [hasWaited, setHasWaited] = useState(false);

  // ==========================================================================
  // TIMEOUT DE SEGURANÇA PARA EVITAR LOADING INFINITO
  // ==========================================================================

  useEffect(() => {
    const timeout = setTimeout(() => {
      setHasWaited(true);
    }, 3000); // 3 segundos máximo de loading

    return () => clearTimeout(timeout);
  }, []);

  // ==========================================================================
  // LÓGICA DE DECISÃO DETERMINÍSTICA
  // ==========================================================================

  const authDecision = useMemo((): AuthDecision => {
    const currentPath = location.pathname;

    // 1. ROTAS PÚBLICAS - sempre permitir
    if (PUBLIC_ROUTES.includes(currentPath)) {
      return { action: 'ALLOW' };
    }

    // 2. LOADING INICIAL - aguardar até timeout
    if (auth.isLoading && !hasWaited) {
      return { action: 'LOADING' };
    }

    // 3. NÃO AUTENTICADO - redirecionar para login
    if (!auth.isAuthenticated) {
      return { 
        action: 'REDIRECT', 
        redirectTo: '/auth',
        reason: 'Usuário não autenticado'
      };
    }

    // 4. USUÁRIO SEM DADOS BÁSICOS - erro crítico
    if (!auth.user) {
      return { 
        action: 'DENY', 
        reason: 'Dados do usuário não encontrados'
      };
    }

    // 5. ONBOARDING - verificação simples e direta
    const needsOnboarding = auth.user && auth.profile?.primeiro_acesso === true;

    // Se profile ainda não carregou, aguardar
    if (auth.user && !auth.profile) {
      return { action: 'LOADING' };
    }

    if (needsOnboarding) {
      if (currentPath === '/onboarding' && allowOnboarding) {
        return { action: 'ALLOW' };
      } else if (currentPath !== '/onboarding') {
        return {
          action: 'REDIRECT',
          redirectTo: '/onboarding',
          reason: 'Usuário precisa completar onboarding'
        };
      }
    }

    // 6. VERIFICAR ROLES OBRIGATÓRIAS
    if (requiredRoles.length > 0) {
      // Mapear roles antigas para novas
      const mappedRoles = requiredRoles.map(role => {
        if (typeof role === 'string') {
          return mapLegacyRole(role) || role;
        }
        return role;
      }).filter(Boolean);

      const hasRequiredRoles = requireAll
        ? mappedRoles.every(role => auth.hasRole(role))
        : mappedRoles.some(role => auth.hasRole(role));

      if (!hasRequiredRoles) {
        return {
          action: 'DENY',
          reason: `Acesso negado. Roles necessárias: ${requiredRoles.join(', ')}`
        };
      }
    }

    // 7. VERIFICAR PERMISSÕES OBRIGATÓRIAS
    if (requiredPermissions.length > 0) {
      const hasRequiredPermissions = requireAll
        ? requiredPermissions.every(permission => auth.hasPermission(permission))
        : requiredPermissions.some(permission => auth.hasPermission(permission));

      if (!hasRequiredPermissions) {
        return { 
          action: 'DENY', 
          reason: `Permissões insuficientes. Permissões necessárias: ${requiredPermissions.join(', ')}`
        };
      }
    }

    // 8. TOKEN EXPIRADO - tentar refresh ou redirecionar
    if (auth.isTokenExpired()) {
      // O contexto já cuida do refresh automático
      return { action: 'LOADING' };
    }

    // 9. TUDO OK - permitir acesso
    return { action: 'ALLOW' };

  }, [
    location.pathname,
    auth.isLoading,
    auth.isAuthenticated,
    auth.user,
    auth.currentClinic,
    auth.availableClinics,
    hasWaited,
    requiredRoles,
    requiredPermissions,
    requireAll,
    allowOnboarding,
    auth.hasRole,
    auth.hasPermission,
    auth.isTokenExpired
  ]);

  // ==========================================================================
  // RENDERIZAÇÃO BASEADA NA DECISÃO
  // ==========================================================================

  // LOADING
  if (authDecision.action === 'LOADING') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Verificando autenticação...
            </h3>
            <p className="text-sm text-gray-600">
              Aguarde enquanto validamos suas credenciais
            </p>
          </div>
        </div>
      </div>
    );
  }

  // REDIRECT
  if (authDecision.action === 'REDIRECT') {
    const targetPath = redirectTo || authDecision.redirectTo || '/auth';
    
    return (
      <Navigate 
        to={targetPath} 
        state={{ from: location.pathname, reason: authDecision.reason }}
        replace 
      />
    );
  }

  // DENY (Acesso Negado)
  if (authDecision.action === 'DENY') {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">
                Acesso Negado
              </h2>
              <p className="text-gray-600">
                {authDecision.reason || 'Você não tem permissão para acessar esta página.'}
              </p>
            </div>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Entre em contato com o administrador se você acredita que isso é um erro.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Voltar
              </Button>
              
              <Button
                onClick={() => auth.logout()}
                variant="default"
              >
                Fazer Logout
              </Button>
            </div>

            {/* Debug info em desenvolvimento */}
            {import.meta.env.DEV && (
              <details className="text-left text-xs text-gray-500 mt-4">
                <summary className="cursor-pointer">Debug Info</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify({
                    isAuthenticated: auth.isAuthenticated,
                    user: auth.user?.email,
                    currentClinic: auth.currentClinic?.clinic.name,
                    requiredRoles,
                    requiredPermissions,
                    userRole: auth.currentClinic?.role,
                    userPermissions: auth.currentClinic?.permissions,
                    decision: authDecision
                  }, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ALLOW - renderizar children
  return <>{children}</>;
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

/**
 * Guard simplificado apenas para verificar autenticação
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  return (
    <SecureAuthGuard>
      {children}
    </SecureAuthGuard>
  );
}

/**
 * Guard para roles específicas
 */
export function RequireRole({ 
  children, 
  roles 
}: { 
  children: React.ReactNode; 
  roles: UserRole[] 
}) {
  return (
    <SecureAuthGuard requiredRoles={roles}>
      {children}
    </SecureAuthGuard>
  );
}

/**
 * Guard para permissões específicas
 */
export function RequirePermission({ 
  children, 
  permissions 
}: { 
  children: React.ReactNode; 
  permissions: Permission[] 
}) {
  return (
    <SecureAuthGuard requiredPermissions={permissions}>
      {children}
    </SecureAuthGuard>
  );
}
