import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Role = Database['public']['Tables']['roles']['Row'];

export function useSystemRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('roles')
          .select('*')
          .eq('ativo', true)
          .order('hierarchy_level');

        if (error) {
          setError(error.message);
        } else {
          setRoles(data || []);
        }
      } catch (err) {
        setError('Erro ao carregar roles do sistema');
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const getRoleByName = (roleName: string) => {
    return roles.find(role => role.role_name === roleName);
  };

  const getRoleDisplayName = (roleName: string) => {
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
    getRoleDisplayName,
    getRoleColor,
    getRolePermissions,
    hasPermission
  };
}