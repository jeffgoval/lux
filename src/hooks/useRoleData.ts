import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RoleData {
  id: string;
  role_name: string;
  display_name: string;
  description: string;
  permissions: any; // Using any to handle Json type from Supabase
  hierarchy_level: number;
  color_class: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export function useRoleData() {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Using direct RPC call since types aren't updated yet
      const { data, error: fetchError } = await supabase.rpc('get_active_roles');

      if (fetchError) {
        setError(fetchError.message);
        console.error('Error fetching roles:', fetchError);
        return;
      }

      setRoles(data || []);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado ao buscar roles');
      console.error('Error fetching roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleByName = (roleName: string) => {
    return roles.find(role => role.role_name === roleName);
  };

  const getRoleLabel = (roleName: string) => {
    const role = getRoleByName(roleName);
    return role?.display_name || roleName;
  };

  const getRoleColor = (roleName: string) => {
    const role = getRoleByName(roleName);
    return role?.color_class || 'bg-gray-100 text-gray-800';
  };

  const getRolePermissions = (roleName: string) => {
    const role = getRoleByName(roleName);
    return role?.permissions || {};
  };

  const hasPermission = (roleName: string, permission: string) => {
    const permissions = getRolePermissions(roleName);
    return permissions[permission] === true;
  };

  return {
    roles,
    loading,
    error,
    getRoleByName,
    getRoleLabel,
    getRoleColor,
    getRolePermissions,
    hasPermission,
    refetch: fetchRoles
  };
}