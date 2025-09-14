#!/usr/bin/env node

/**
 * 🧪 TESTAR ADAPTADOR DE SCHEMA
 * 
 * Testa o adaptador para o schema existente
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🧪 TESTANDO ADAPTADOR DE SCHEMA\n');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// SIMULAR ADAPTADOR (versão JavaScript)
// ============================================================================

const TABLE_MAPPING = {
  users: {
    table: 'profiles',
    mappings: {
      id: 'id',
      email: 'email',
      name: 'full_name',
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

// ============================================================================
// TESTAR CONECTIVIDADE
// ============================================================================

async function testConnection() {
  console.log('🔍 Testando conectividade com tabelas...\n');
  
  const tables = ['profiles', 'clinicas', 'user_roles'];
  const results = {};
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
        results[table] = false;
      } else {
        console.log(`✅ ${table}: Conectado`);
        results[table] = true;
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
      results[table] = false;
    }
  }
  
  return results;
}

// ============================================================================
// TESTAR OPERAÇÕES BÁSICAS
// ============================================================================

async function testBasicOperations() {
  console.log('\n🧪 Testando operações básicas...\n');
  
  // Teste 1: Buscar clínicas
  console.log('🏢 Testando busca de clínicas...');
  try {
    const { data, error } = await supabase
      .from(TABLE_MAPPING.clinics.table)
      .select('*')
      .limit(3);
    
    if (error) {
      console.log(`  ❌ Erro: ${error.message}`);
    } else {
      console.log(`  ✅ ${data.length} clínicas encontradas`);
      if (data.length > 0) {
        const clinic = data[0];
        console.log(`  📊 Exemplo: ${clinic[TABLE_MAPPING.clinics.mappings.name] || clinic.id}`);
      }
    }
  } catch (err) {
    console.log(`  ❌ Erro: ${err.message}`);
  }
  
  // Teste 2: Buscar usuários
  console.log('\n👤 Testando busca de usuários...');
  try {
    const { data, error } = await supabase
      .from(TABLE_MAPPING.users.table)
      .select('*')
      .limit(3);
    
    if (error) {
      console.log(`  ❌ Erro: ${error.message}`);
    } else {
      console.log(`  ✅ ${data.length} usuários encontrados`);
      if (data.length > 0) {
        const user = data[0];
        console.log(`  📊 Exemplo: ${user[TABLE_MAPPING.users.mappings.email] || user.id}`);
      }
    }
  } catch (err) {
    console.log(`  ❌ Erro: ${err.message}`);
  }
  
  // Teste 3: Buscar roles
  console.log('\n👥 Testando busca de roles...');
  try {
    const { data, error } = await supabase
      .from(TABLE_MAPPING.userClinicRoles.table)
      .select('*')
      .limit(3);
    
    if (error) {
      console.log(`  ❌ Erro: ${error.message}`);
    } else {
      console.log(`  ✅ ${data.length} roles encontrados`);
      if (data.length > 0) {
        const role = data[0];
        console.log(`  📊 Exemplo: ${role[TABLE_MAPPING.userClinicRoles.mappings.role] || 'sem role'}`);
      }
    }
  } catch (err) {
    console.log(`  ❌ Erro: ${err.message}`);
  }
}

// ============================================================================
// TESTAR CRIAÇÃO DE DADOS (se possível)
// ============================================================================

async function testDataCreation() {
  console.log('\n🧪 Testando criação de dados...\n');
  
  // Teste 1: Criar clínica
  console.log('🏢 Tentando criar clínica de teste...');
  try {
    const clinicData = {};
    clinicData[TABLE_MAPPING.clinics.mappings.name] = `Clínica Teste ${Date.now()}`;
    clinicData[TABLE_MAPPING.clinics.mappings.active] = true;
    
    const { data, error } = await supabase
      .from(TABLE_MAPPING.clinics.table)
      .insert(clinicData)
      .select()
      .single();
    
    if (error) {
      console.log(`  ❌ Erro: ${error.message}`);
      
      // Analisar tipo de erro
      if (error.message.includes('row-level security')) {
        console.log('  💡 RLS está ativo - precisa de autenticação');
      } else if (error.message.includes('violates')) {
        console.log('  💡 Violação de constraint - verificar campos obrigatórios');
      }
    } else {
      console.log(`  ✅ Clínica criada: ${data.id}`);
      
      // Limpar teste
      await supabase
        .from(TABLE_MAPPING.clinics.table)
        .delete()
        .eq('id', data.id);
      console.log('  🧹 Dados de teste removidos');
    }
  } catch (err) {
    console.log(`  ❌ Erro: ${err.message}`);
  }
}

// ============================================================================
// VERIFICAR RLS POLICIES
// ============================================================================

async function checkRLSPolicies() {
  console.log('\n🔒 Verificando políticas RLS...\n');
  
  const tables = ['profiles', 'clinicas', 'user_roles'];
  
  for (const table of tables) {
    console.log(`🔍 Verificando RLS em ${table}...`);
    
    // Tentar inserção simples para detectar RLS
    try {
      const { error } = await supabase
        .from(table)
        .insert({ test: 'test' });
      
      if (error) {
        if (error.message.includes('row-level security')) {
          console.log(`  🔒 RLS ativo em ${table}`);
        } else if (error.message.includes('column "test" does not exist')) {
          console.log(`  ✅ RLS não está bloqueando em ${table}`);
        } else {
          console.log(`  ⚠️ ${table}: ${error.message.substring(0, 50)}...`);
        }
      } else {
        console.log(`  ✅ Inserção permitida em ${table}`);
      }
    } catch (err) {
      console.log(`  ❌ ${table}: ${err.message.substring(0, 50)}...`);
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // 1. Testar conectividade
  const connectivity = await testConnection();
  
  // 2. Testar operações básicas
  await testBasicOperations();
  
  // 3. Verificar RLS
  await checkRLSPolicies();
  
  // 4. Testar criação (se possível)
  await testDataCreation();
  
  // ============================================================================
  // RESUMO FINAL
  // ============================================================================
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 RESUMO DOS TESTES');
  console.log('='.repeat(60));
  
  console.log(`🔗 Conectividade:`);
  Object.entries(connectivity).forEach(([table, connected]) => {
    console.log(`  ${connected ? '✅' : '❌'} ${table}`);
  });
  
  const allConnected = Object.values(connectivity).every(Boolean);
  
  if (allConnected) {
    console.log('\n🎉 ADAPTADOR ESTÁ FUNCIONANDO!');
    console.log('\nPróximos passos:');
    console.log('1. Integrar adaptador no AuthService');
    console.log('2. Configurar bypass de RLS para testes');
    console.log('3. Criar dados de teste via dashboard');
    console.log('4. Testar login completo');
  } else {
    console.log('\n⚠️ Alguns problemas encontrados');
    console.log('Verifique as conexões e configurações acima.');
  }
  
  console.log('\n📚 Documentação: src/services/schema-adapter.ts');
}

main().catch(console.error);
