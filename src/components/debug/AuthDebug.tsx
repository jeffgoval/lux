/**
 * 🔍 COMPONENTE DE DEBUG PARA AUTENTICAÇÃO
 * 
 * Componente para testar e debugar problemas de autenticação
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DebugInfo {
  user: any;
  profile: any;
  roles: any[];
  error: string | null;
  isLoading: boolean;
}

export function AuthDebug() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    user: null,
    profile: null,
    roles: [],
    error: null,
    isLoading: true
  });

  const checkAuth = async () => {
    setDebugInfo(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Verificar usuário autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw new Error(`Erro ao buscar usuário: ${userError.message}`);
      }

      if (!user) {
        setDebugInfo({
          user: null,
          profile: null,
          roles: [],
          error: 'Usuário não autenticado',
          isLoading: false
        });
        return;
      }

      // Verificar se a tabela profiles existe
      let profile = null;
      let profileError = null;
      
      try {
        const { data: profileData, error: profError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        profile = profileData;
        profileError = profError;
      } catch (error) {
        profileError = error;
      }

      // Verificar roles
      let roles = [];
      let rolesError = null;
      
      try {
        const { data: rolesData, error: rolError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id);
        
        roles = rolesData || [];
        rolesError = rolError;
      } catch (error) {
        rolesError = error;
      }

      setDebugInfo({
        user,
        profile,
        roles,
        error: profileError ? `Erro no profile: ${profileError.message}` : 
               rolesError ? `Erro nas roles: ${rolesError.message}` : null,
        isLoading: false
      });

    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        isLoading: false
      }));
    }
  };

  const createProfile = async () => {
    if (!debugInfo.user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: debugInfo.user.id,
          email: debugInfo.user.email,
          nome_completo: debugInfo.user.email.split('@')[0],
          primeiro_acesso: true,
          ativo: true
        });

      if (error) {
        throw error;
      }

      // Recarregar dados
      await checkAuth();
    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao criar profile'
      }));
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Debug de Autenticação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={checkAuth} disabled={debugInfo.isLoading}>
              {debugInfo.isLoading ? 'Verificando...' : 'Verificar Auth'}
            </Button>
            {debugInfo.user && !debugInfo.profile && (
              <Button onClick={createProfile} variant="outline">
                Criar Profile
              </Button>
            )}
          </div>

          {debugInfo.error && (
            <Alert variant="destructive">
              <AlertDescription>{debugInfo.error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Usuário</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(debugInfo.user, null, 2)}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(debugInfo.profile, null, 2)}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Roles</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(debugInfo.roles, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}