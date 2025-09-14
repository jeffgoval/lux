import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RoleData {
  id: string;
  role_name: string;
  display_name: string;
  description: string;
  permissions: Record<string, boolean>;
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
      
      // Dados estáticos enquanto tipos não estão atualizados
      const staticRoles: RoleData[] = [
        {
          id: '1',
          role_name: 'super_admin',
          display_name: 'Super Administrador',
          description: 'Acesso total ao sistema',
          permissions: { canManageUsers: true, canManageClinics: true, canAccessAllData: true },
          hierarchy_level: 1,
          color_class: 'bg-purple-100 text-purple-800',
          ativo: true,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        },
        {
          id: '2',
          role_name: 'visitante',
          display_name: 'Visitante',
          description: 'Visitante do sistema',
          permissions: { canViewDashboard: true },
          hierarchy_level: 6,
          color_class: 'bg-gray-100 text-gray-800',
          ativo: true,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        }
      ];

      setRoles(staticRoles);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado ao buscar roles');

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
