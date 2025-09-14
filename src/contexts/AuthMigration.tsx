/**
 * 🔄 MIGRAÇÃO GRADUAL PARA CONTEXTO UNIFICADO
 * 
 * Este arquivo facilita a migração gradual dos contextos antigos
 * para o novo contexto unificado.
 */

import React, { ReactNode } from 'react';
import { UnifiedAuthProvider, useUnifiedAuth } from './UnifiedAuthContext';
import { useSecureAuth } from './SecureAuthContext';
import { useAuth } from './AuthContext';

// ============================================================================
// PROVIDER DE MIGRAÇÃO
// ============================================================================

interface AuthMigrationProviderProps {
  children: ReactNode;
  useLegacy?: boolean; // Flag para usar sistema antigo durante migração
}

export function AuthMigrationProvider({ children, useLegacy = false }: AuthMigrationProviderProps) {
  if (useLegacy) {
    // Usar sistema antigo durante migração
    return <>{children}</>;
  }

  // Usar novo sistema unificado
  return (
    <UnifiedAuthProvider>
      {children}
    </UnifiedAuthProvider>
  );
}

// ============================================================================
// HOOK DE COMPATIBILIDADE
// ============================================================================

/**
 * Hook que funciona com ambos os sistemas durante a migração
 */
export function useAuthCompat() {
  try {
    // Tentar usar o novo sistema primeiro
    return useUnifiedAuth();
  } catch {
    try {
      // Fallback para SecureAuth
      return useSecureAuth();
    } catch {
      // Fallback para AuthContext antigo
      return useAuth();
    }
  }
}

// ============================================================================
// WRAPPER DE COMPONENTES
// ============================================================================

/**
 * HOC para migrar componentes gradualmente
 */
export function withAuthMigration<T extends object>(
  Component: React.ComponentType<T>,
  useLegacy = false
) {
  return function MigratedComponent(props: T) {
    if (useLegacy) {
      return <Component {...props} />;
    }

    return (
      <UnifiedAuthProvider>
        <Component {...props} />
      </UnifiedAuthProvider>
    );
  };
}

// ============================================================================
// UTILITÁRIOS DE MIGRAÇÃO
// ============================================================================

/**
 * Verifica se o novo sistema está disponível
 */
export function isUnifiedAuthAvailable(): boolean {
  try {
    useUnifiedAuth();
    return true;
  } catch {
    return false;
  }
}

/**
 * Obtém informações sobre o sistema de auth atual
 */
export function getAuthSystemInfo() {
  const systems = {
    unified: false,
    secure: false,
    legacy: false
  };

  try {
    useUnifiedAuth();
    systems.unified = true;
  } catch {
    try {
      useSecureAuth();
      systems.secure = true;
    } catch {
      try {
        useAuth();
        systems.legacy = true;
      } catch {
        // Nenhum sistema disponível
      }
    }
  }

  return systems;
}
