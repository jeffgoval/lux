/**
 * 🔐 HOOK DE AUTENTICAÇÃO UNIFICADO
 * 
 * Redireciona para o hook do Clerk mantendo compatibilidade
 */

import { useClerkAuth } from './useClerkAuth';

// Redireciona para o hook do Clerk mantendo interface compatível
export function useUnifiedAuth() {
  return useClerkAuth();
}