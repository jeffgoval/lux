#!/usr/bin/env node

/**
 * 🔄 ADAPTAR SCHEMA EXISTENTE PARA V2
 * 
 * Adapta as tabelas existentes para funcionar com o sistema V2
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🔄 ADAPTANDO SCHEMA EXISTENTE PARA V2\n');

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// VERIFICAR ESTRUTURA DAS TABELAS EXISTENTES
// ============================================================================

async function analyzeExistingTables() {
  console.log('🔍 Analisando tabelas existentes...\n');
  
  const tables = ['profiles', 'clinicas', 'user_roles'];
  const tableInfo = {};
  
  for (const table of tables) {
    console.log(`📋 Analisando tabela: ${table}`);
    
    try {
      // Tentar buscar alguns registros para entender a estrutura
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(3);
      
      if (error) {
        console.log(`  ❌ Erro: ${error.message}`);
        tableInfo[table] = { error: error.message };
      } else {
        console.log(`  ✅ ${data.length} registros encontrados`);
        
        if (data.length > 0) {
          const columns = Object.keys(data[0]);
          console.log(`  📊 Colunas: ${columns.join(', ')}`);
          tableInfo[table] = { 
            columns, 
            sampleData: data[0],
            recordCount: data.length 
          };
        } else {
          console.log(`  📊 Tabela vazia`);
          tableInfo[table] = { columns: [], recordCount: 0 };
        }
      }
      
    } catch (err) {
      console.log(`  ❌ Erro: ${err.message}`);
      tableInfo[table] = { error: err.message };
    }
    
    console.log('');
  }
  
  return tableInfo;
}

// ============================================================================
// CRIAR MAPEAMENTO PARA SISTEMA V2
// ============================================================================

function createV2Mapping(tableInfo) {
  console.log('🗺️ Criando mapeamento para Sistema V2...\n');
  
  const mapping = {
    users: null,
    clinics: null,
    userClinicRoles: null
  };
  
  // Mapear profiles -> users
  if (tableInfo.profiles && tableInfo.profiles.columns) {
    const profileCols = tableInfo.profiles.columns;
    console.log('👤 Mapeamento profiles -> users:');
    
    const userMapping = {
      table: 'profiles',
      mappings: {
        id: profileCols.includes('id') ? 'id' : null,
        email: profileCols.includes('email') ? 'email' : null,
        name: profileCols.includes('name') ? 'name' : profileCols.includes('full_name') ? 'full_name' : null,
        phone: profileCols.includes('phone') ? 'phone' : null,
        active: profileCols.includes('active') ? 'active' : null,
        created_at: profileCols.includes('created_at') ? 'created_at' : null
      }
    };
    
    Object.entries(userMapping.mappings).forEach(([v2Field, existingField]) => {
      console.log(`  ${v2Field} <- ${existingField || 'FALTANDO'}`);
    });
    
    mapping.users = userMapping;
  }
  
  console.log('');
  
  // Mapear clinicas -> clinics
  if (tableInfo.clinicas && tableInfo.clinicas.columns) {
    const clinicCols = tableInfo.clinicas.columns;
    console.log('🏢 Mapeamento clinicas -> clinics:');
    
    const clinicMapping = {
      table: 'clinicas',
      mappings: {
        id: clinicCols.includes('id') ? 'id' : null,
        name: clinicCols.includes('name') ? 'name' : clinicCols.includes('nome') ? 'nome' : null,
        email: clinicCols.includes('email') ? 'email' : null,
        phone: clinicCols.includes('phone') ? 'phone' : clinicCols.includes('telefone') ? 'telefone' : null,
        active: clinicCols.includes('active') ? 'active' : clinicCols.includes('ativo') ? 'ativo' : null,
        created_at: clinicCols.includes('created_at') ? 'created_at' : null
      }
    };
    
    Object.entries(clinicMapping.mappings).forEach(([v2Field, existingField]) => {
      console.log(`  ${v2Field} <- ${existingField || 'FALTANDO'}`);
    });
    
    mapping.clinics = clinicMapping;
  }
  
  console.log('');
  
  // Mapear user_roles -> user_clinic_roles
  if (tableInfo.user_roles && tableInfo.user_roles.columns) {
    const roleCols = tableInfo.user_roles.columns;
    console.log('👥 Mapeamento user_roles -> user_clinic_roles:');
    
    const roleMapping = {
      table: 'user_roles',
      mappings: {
        user_id: roleCols.includes('user_id') ? 'user_id' : null,
        clinic_id: roleCols.includes('clinic_id') ? 'clinic_id' : roleCols.includes('clinica_id') ? 'clinica_id' : null,
        role: roleCols.includes('role') ? 'role' : roleCols.includes('papel') ? 'papel' : null,
        active: roleCols.includes('active') ? 'active' : roleCols.includes('ativo') ? 'ativo' : null,
        created_at: roleCols.includes('created_at') ? 'created_at' : null
      }
    };
    
    Object.entries(roleMapping.mappings).forEach(([v2Field, existingField]) => {
      console.log(`  ${v2Field} <- ${existingField || 'FALTANDO'}`);
    });
    
    mapping.userClinicRoles = roleMapping;
  }
  
  return mapping;
}

// ============================================================================
// TESTAR CONSULTAS V2 COM SCHEMA EXISTENTE
// ============================================================================

async function testV2Queries(mapping) {
  console.log('\n🧪 Testando consultas V2 com schema existente...\n');
  
  // Teste 1: Buscar usuários
  if (mapping.users) {
    console.log('👤 Teste: Buscar usuários...');
    try {
      const { data, error } = await supabase
        .from(mapping.users.table)
        .select('*')
        .limit(3);
      
      if (error) {
        console.log(`  ❌ Erro: ${error.message}`);
      } else {
        console.log(`  ✅ ${data.length} usuários encontrados`);
        if (data.length > 0) {
          const user = data[0];
          console.log(`  📊 Exemplo: ${user[mapping.users.mappings.name] || user.id}`);
        }
      }
    } catch (err) {
      console.log(`  ❌ Erro: ${err.message}`);
    }
  }
  
  // Teste 2: Buscar clínicas
  if (mapping.clinics) {
    console.log('\n🏢 Teste: Buscar clínicas...');
    try {
      const { data, error } = await supabase
        .from(mapping.clinics.table)
        .select('*')
        .limit(3);
      
      if (error) {
        console.log(`  ❌ Erro: ${error.message}`);
      } else {
        console.log(`  ✅ ${data.length} clínicas encontradas`);
        if (data.length > 0) {
          const clinic = data[0];
          console.log(`  📊 Exemplo: ${clinic[mapping.clinics.mappings.name] || clinic.id}`);
        }
      }
    } catch (err) {
      console.log(`  ❌ Erro: ${err.message}`);
    }
  }
  
  // Teste 3: Buscar roles
  if (mapping.userClinicRoles) {
    console.log('\n👥 Teste: Buscar roles...');
    try {
      const { data, error } = await supabase
        .from(mapping.userClinicRoles.table)
        .select('*')
        .limit(3);
      
      if (error) {
        console.log(`  ❌ Erro: ${error.message}`);
      } else {
        console.log(`  ✅ ${data.length} roles encontrados`);
        if (data.length > 0) {
          const role = data[0];
          console.log(`  📊 Exemplo: ${role[mapping.userClinicRoles.mappings.role] || 'sem role'}`);
        }
      }
    } catch (err) {
      console.log(`  ❌ Erro: ${err.message}`);
    }
  }
}

// ============================================================================
// GERAR ADAPTADOR PARA O SISTEMA V2
// ============================================================================

function generateV2Adapter(mapping) {
  console.log('\n🔧 Gerando adaptador para Sistema V2...\n');
  
  const fs = require('fs');
  const path = require('path');
  
  const adapterCode = `/**
 * 🔄 ADAPTADOR PARA SCHEMA EXISTENTE
 * 
 * Adapta o schema existente para funcionar com o Sistema V2
 */

import { supabase } from '@/lib/supabase';

// Mapeamento das tabelas existentes
const TABLE_MAPPING = ${JSON.stringify(mapping, null, 2)};

// Adaptador para usuários
export class UserAdapter {
  static async findByEmail(email: string) {
    const mapping = TABLE_MAPPING.users;
    if (!mapping) return null;
    
    const { data, error } = await supabase
      .from(mapping.table)
      .select('*')
      .eq(mapping.mappings.email, email)
      .single();
    
    if (error) return null;
    
    return {
      id: data[mapping.mappings.id],
      email: data[mapping.mappings.email],
      name: data[mapping.mappings.name],
      phone: data[mapping.mappings.phone],
      active: data[mapping.mappings.active] ?? true,
      created_at: data[mapping.mappings.created_at]
    };
  }
}

// Adaptador para clínicas
export class ClinicAdapter {
  static async findById(id: string) {
    const mapping = TABLE_MAPPING.clinics;
    if (!mapping) return null;
    
    const { data, error } = await supabase
      .from(mapping.table)
      .select('*')
      .eq(mapping.mappings.id, id)
      .single();
    
    if (error) return null;
    
    return {
      id: data[mapping.mappings.id],
      name: data[mapping.mappings.name],
      email: data[mapping.mappings.email],
      phone: data[mapping.mappings.phone],
      active: data[mapping.mappings.active] ?? true,
      created_at: data[mapping.mappings.created_at]
    };
  }
}

// Adaptador para roles
export class RoleAdapter {
  static async findByUserId(userId: string) {
    const mapping = TABLE_MAPPING.userClinicRoles;
    if (!mapping) return [];
    
    const { data, error } = await supabase
      .from(mapping.table)
      .select('*')
      .eq(mapping.mappings.user_id, userId);
    
    if (error) return [];
    
    return data.map(role => ({
      user_id: role[mapping.mappings.user_id],
      clinic_id: role[mapping.mappings.clinic_id],
      role: role[mapping.mappings.role],
      active: role[mapping.mappings.active] ?? true,
      created_at: role[mapping.mappings.created_at]
    }));
  }
}
`;
  
  const adapterPath = path.join(process.cwd(), 'src/services/schema-adapter.ts');
  fs.writeFileSync(adapterPath, adapterCode);
  
  console.log(`✅ Adaptador criado: ${adapterPath}`);
  
  return adapterPath;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // 1. Analisar tabelas existentes
  const tableInfo = await analyzeExistingTables();
  
  // 2. Criar mapeamento
  const mapping = createV2Mapping(tableInfo);
  
  // 3. Testar consultas
  await testV2Queries(mapping);
  
  // 4. Gerar adaptador
  const adapterPath = generateV2Adapter(mapping);
  
  // ============================================================================
  // RESUMO FINAL
  // ============================================================================
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 RESUMO DA ADAPTAÇÃO');
  console.log('='.repeat(60));
  
  console.log(`👤 Usuários: ${mapping.users ? '✅ Mapeado' : '❌ Não encontrado'}`);
  console.log(`🏢 Clínicas: ${mapping.clinics ? '✅ Mapeado' : '❌ Não encontrado'}`);
  console.log(`👥 Roles: ${mapping.userClinicRoles ? '✅ Mapeado' : '❌ Não encontrado'}`);
  console.log(`🔧 Adaptador: ✅ Criado`);
  
  console.log('\n🎉 ADAPTAÇÃO CONCLUÍDA!');
  console.log('\nPróximos passos:');
  console.log('1. Integrar adaptador no AuthService');
  console.log('2. Testar login com dados existentes');
  console.log('3. Verificar funcionamento completo');
  
  console.log(`\n📁 Arquivo criado: ${adapterPath}`);
}

main().catch(console.error);
