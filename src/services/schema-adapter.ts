/**
 * 🔄 ADAPTADOR PARA SCHEMA EXISTENTE
 *
 * Adapta o schema existente para funcionar com o Sistema V2
 */

import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types/auth.types';

// Mapeamento das tabelas existentes baseado na estrutura descoberta
const TABLE_MAPPING = {
  users: {
    table: 'profiles',
    mappings: {
      id: 'id',
      email: 'email',
      name: 'full_name', // Assumindo que existe
      phone: 'telefone',
      active: 'ativo',
      created_at: 'criado_em',
      updated_at: 'atualizado_em'
    }
  },
  clinics: {
    table: 'clinicas',
    mappings: {
      id: 'id',
      name: 'nome',
      email: null, // Não existe na tabela
      phone: null, // Não existe na tabela
      active: 'ativo',
      created_at: 'criado_em',
      updated_at: 'atualizado_em'
    }
  },
  userClinicRoles: {
    table: 'user_roles',
    mappings: {
      id: 'id',
      user_id: 'user_id',
      clinic_id: 'clinica_id',
      role: 'role',
      active: 'ativo',
      created_at: 'criado_em'
    }
  }
};

// Mapeamento de roles do sistema antigo para o novo
const ROLE_MAPPING: Record<string, UserRole> = {
  'proprietaria': UserRole.CLINIC_OWNER,
  'gerente': UserRole.CLINIC_MANAGER,
  'profissionais': UserRole.PROFESSIONAL,
  'recepcionistas': UserRole.RECEPTIONIST,
  'admin': UserRole.CLINIC_OWNER,
  'manager': UserRole.CLINIC_MANAGER,
  'professional': UserRole.PROFESSIONAL,
  'receptionist': UserRole.RECEPTIONIST,
  'patient': UserRole.PATIENT
};

// Adaptador para usuários
export class UserAdapter {
  static async findByEmail(email: string) {
    const mapping = TABLE_MAPPING.users;

    try {
      const { data, error } = await supabase
        .from(mapping.table)
        .select('*')
        .eq(mapping.mappings.email, email)
        .single();

      if (error) {
        console.log('UserAdapter.findByEmail error:', error.message);
        return null;
      }

      return {
        id: data[mapping.mappings.id],
        email: data[mapping.mappings.email],
        name: data[mapping.mappings.name] || data.nome || 'Usuário',
        phone: data[mapping.mappings.phone],
        active: data[mapping.mappings.active] ?? true,
        created_at: data[mapping.mappings.created_at],
        updated_at: data[mapping.mappings.updated_at]
      };
    } catch (err) {
      console.error('UserAdapter.findByEmail exception:', err);
      return null;
    }
  }

  static async findById(id: string) {
    const mapping = TABLE_MAPPING.users;

    try {
      const { data, error } = await supabase
        .from(mapping.table)
        .select('*')
        .eq(mapping.mappings.id, id)
        .single();

      if (error) return null;

      return {
        id: data[mapping.mappings.id],
        email: data[mapping.mappings.email],
        name: data[mapping.mappings.name] || data.nome || 'Usuário',
        phone: data[mapping.mappings.phone],
        active: data[mapping.mappings.active] ?? true,
        created_at: data[mapping.mappings.created_at],
        updated_at: data[mapping.mappings.updated_at]
      };
    } catch (err) {
      console.error('UserAdapter.findById exception:', err);
      return null;
    }
  }

  static async create(userData: any) {
    const mapping = TABLE_MAPPING.users;

    const insertData: any = {};
    if (mapping.mappings.email) insertData[mapping.mappings.email] = userData.email;
    if (mapping.mappings.name) insertData[mapping.mappings.name] = userData.name;
    if (mapping.mappings.phone) insertData[mapping.mappings.phone] = userData.phone;
    if (mapping.mappings.active) insertData[mapping.mappings.active] = userData.active ?? true;

    try {
      const { data, error } = await supabase
        .from(mapping.table)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.log('UserAdapter.create error:', error.message);
        return null;
      }

      return data;
    } catch (err) {
      console.error('UserAdapter.create exception:', err);
      return null;
    }
  }
}

// Adaptador para clínicas
export class ClinicAdapter {
  static async findById(id: string) {
    const mapping = TABLE_MAPPING.clinics;

    try {
      const { data, error } = await supabase
        .from(mapping.table)
        .select('*')
        .eq(mapping.mappings.id, id)
        .single();

      if (error) return null;

      return {
        id: data[mapping.mappings.id],
        name: data[mapping.mappings.name],
        email: data[mapping.mappings.email] || null, // Campo não existe
        phone: data[mapping.mappings.phone] || null, // Campo não existe
        active: data[mapping.mappings.active] ?? true,
        created_at: data[mapping.mappings.created_at],
        updated_at: data[mapping.mappings.updated_at]
      };
    } catch (err) {
      console.error('ClinicAdapter.findById exception:', err);
      return null;
    }
  }

  static async findAll() {
    const mapping = TABLE_MAPPING.clinics;

    try {
      const { data, error } = await supabase
        .from(mapping.table)
        .select('*')
        .eq(mapping.mappings.active, true);

      if (error) return [];

      return data.map(clinic => ({
        id: clinic[mapping.mappings.id],
        name: clinic[mapping.mappings.name],
        email: clinic[mapping.mappings.email] || null,
        phone: clinic[mapping.mappings.phone] || null,
        active: clinic[mapping.mappings.active] ?? true,
        created_at: clinic[mapping.mappings.created_at],
        updated_at: clinic[mapping.mappings.updated_at]
      }));
    } catch (err) {
      console.error('ClinicAdapter.findAll exception:', err);
      return [];
    }
  }

  static async create(clinicData: any) {
    const mapping = TABLE_MAPPING.clinics;

    const insertData: any = {};
    if (mapping.mappings.name) insertData[mapping.mappings.name] = clinicData.name;
    if (mapping.mappings.active) insertData[mapping.mappings.active] = clinicData.active ?? true;

    try {
      const { data, error } = await supabase
        .from(mapping.table)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.log('ClinicAdapter.create error:', error.message);
        return null;
      }

      return data;
    } catch (err) {
      console.error('ClinicAdapter.create exception:', err);
      return null;
    }
  }
}

// Adaptador para roles
export class RoleAdapter {
  static async findByUserId(userId: string) {
    const mapping = TABLE_MAPPING.userClinicRoles;

    try {
      const { data, error } = await supabase
        .from(mapping.table)
        .select('*')
        .eq(mapping.mappings.user_id, userId)
        .eq(mapping.mappings.active, true);

      if (error) {
        console.log('RoleAdapter.findByUserId error:', error.message);
        return [];
      }

      return data.map(role => ({
        id: role[mapping.mappings.id],
        user_id: role[mapping.mappings.user_id],
        clinic_id: role[mapping.mappings.clinic_id],
        role: this.mapRole(role[mapping.mappings.role]),
        active: role[mapping.mappings.active] ?? true,
        created_at: role[mapping.mappings.created_at]
      }));
    } catch (err) {
      console.error('RoleAdapter.findByUserId exception:', err);
      return [];
    }
  }

  static async findByUserAndClinic(userId: string, clinicId: string) {
    const mapping = TABLE_MAPPING.userClinicRoles;

    try {
      const { data, error } = await supabase
        .from(mapping.table)
        .select('*')
        .eq(mapping.mappings.user_id, userId)
        .eq(mapping.mappings.clinic_id, clinicId)
        .eq(mapping.mappings.active, true)
        .single();

      if (error) return null;

      return {
        id: data[mapping.mappings.id],
        user_id: data[mapping.mappings.user_id],
        clinic_id: data[mapping.mappings.clinic_id],
        role: this.mapRole(data[mapping.mappings.role]),
        active: data[mapping.mappings.active] ?? true,
        created_at: data[mapping.mappings.created_at]
      };
    } catch (err) {
      console.error('RoleAdapter.findByUserAndClinic exception:', err);
      return null;
    }
  }

  static async create(roleData: any) {
    const mapping = TABLE_MAPPING.userClinicRoles;

    const insertData: any = {};
    if (mapping.mappings.user_id) insertData[mapping.mappings.user_id] = roleData.user_id;
    if (mapping.mappings.clinic_id) insertData[mapping.mappings.clinic_id] = roleData.clinic_id;
    if (mapping.mappings.role) insertData[mapping.mappings.role] = roleData.role;
    if (mapping.mappings.active) insertData[mapping.mappings.active] = roleData.active ?? true;

    try {
      const { data, error } = await supabase
        .from(mapping.table)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.log('RoleAdapter.create error:', error.message);
        return null;
      }

      return data;
    } catch (err) {
      console.error('RoleAdapter.create exception:', err);
      return null;
    }
  }

  // Mapear roles antigos para novos
  private static mapRole(oldRole: string): UserRole {
    return ROLE_MAPPING[oldRole] || UserRole.PATIENT;
  }

  // Obter roles disponíveis no sistema antigo
  static getAvailableRoles(): string[] {
    return Object.keys(ROLE_MAPPING);
  }
}

// ============================================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================================

export class SchemaAdapter {
  // Verificar se o sistema está usando schema antigo ou novo
  static async detectSchemaVersion(): Promise<'v1' | 'v2' | 'unknown'> {
    try {
      // Tentar acessar tabela do V2
      const { error: v2Error } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      if (!v2Error) return 'v2';

      // Tentar acessar tabelas do V1
      const { error: v1Error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (!v1Error) return 'v1';

      return 'unknown';
    } catch (err) {
      return 'unknown';
    }
  }

  // Testar conectividade com as tabelas
  static async testConnection(): Promise<{
    profiles: boolean;
    clinicas: boolean;
    user_roles: boolean;
  }> {
    const results = {
      profiles: false,
      clinicas: false,
      user_roles: false
    };

    // Testar profiles
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      results.profiles = !error;
    } catch (err) {
      results.profiles = false;
    }

    // Testar clinicas
    try {
      const { error } = await supabase.from('clinicas').select('id').limit(1);
      results.clinicas = !error;
    } catch (err) {
      results.clinicas = false;
    }

    // Testar user_roles
    try {
      const { error } = await supabase.from('user_roles').select('id').limit(1);
      results.user_roles = !error;
    } catch (err) {
      results.user_roles = false;
    }

    return results;
  }

  // Criar dados de teste para desenvolvimento
  static async createTestData() {
    console.log('🧪 Criando dados de teste...');

    try {
      // 1. Criar clínica de teste
      const clinic = await ClinicAdapter.create({
        name: 'Clínica Teste V2',
        active: true
      });

      if (!clinic) {
        console.log('❌ Não foi possível criar clínica de teste');
        return null;
      }

      console.log('✅ Clínica criada:', clinic.id);

      // 2. Criar usuário de teste
      const user = await UserAdapter.create({
        email: `admin-teste-${Date.now()}@exemplo.com`,
        name: 'Admin Teste',
        phone: '(11) 99999-9999',
        active: true
      });

      if (!user) {
        console.log('❌ Não foi possível criar usuário de teste');
        return null;
      }

      console.log('✅ Usuário criado:', user.id);

      // 3. Criar role de teste
      const role = await RoleAdapter.create({
        user_id: user.id,
        clinic_id: clinic.id,
        role: 'admin',
        active: true
      });

      if (!role) {
        console.log('❌ Não foi possível criar role de teste');
        return null;
      }

      console.log('✅ Role criado:', role.id);

      return {
        clinic,
        user,
        role
      };

    } catch (err) {
      console.error('❌ Erro ao criar dados de teste:', err);
      return null;
    }
  }
}
