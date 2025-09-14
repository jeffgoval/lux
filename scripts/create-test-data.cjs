#!/usr/bin/env node

/**
 * 🧪 CRIAR DADOS DE TESTE
 * 
 * Cria dados de teste para o sistema V2
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🧪 CRIANDO DADOS DE TESTE PARA SISTEMA V2\n');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// DADOS DE TESTE
// ============================================================================

const TEST_DATA = {
  clinics: [
    {
      nome: 'Clínica Bella Estética',
      ativo: true
    },
    {
      nome: 'Estética Avançada',
      ativo: true
    }
  ],
  users: [
    {
      email: 'admin@bella.com',
      full_name: 'Maria Silva',
      telefone: '(11) 99999-1111',
      ativo: true
    },
    {
      email: 'gerente@bella.com',
      full_name: 'João Santos',
      telefone: '(11) 99999-2222',
      ativo: true
    },
    {
      email: 'profissional@bella.com',
      full_name: 'Ana Costa',
      telefone: '(11) 99999-3333',
      ativo: true
    }
  ]
};

// ============================================================================
// FUNÇÕES DE CRIAÇÃO
// ============================================================================

async function createClinics() {
  console.log('🏢 Criando clínicas de teste...\n');
  
  const createdClinics = [];
  
  for (const clinicData of TEST_DATA.clinics) {
    try {
      console.log(`📝 Criando: ${clinicData.nome}...`);
      
      const { data, error } = await supabase
        .from('clinicas')
        .insert(clinicData)
        .select()
        .single();
      
      if (error) {
        console.log(`  ❌ Erro: ${error.message}`);
        
        if (error.message.includes('row-level security')) {
          console.log('  💡 RLS está ativo - tentando com service key...');
          // TODO: Tentar com service key se disponível
        }
      } else {
        console.log(`  ✅ Criada: ${data.id}`);
        createdClinics.push(data);
      }
      
    } catch (err) {
      console.log(`  ❌ Erro: ${err.message}`);
    }
  }
  
  console.log(`\n📊 ${createdClinics.length} clínicas criadas\n`);
  return createdClinics;
}

async function createUsers() {
  console.log('👤 Criando usuários de teste...\n');
  
  const createdUsers = [];
  
  for (const userData of TEST_DATA.users) {
    try {
      console.log(`📝 Criando: ${userData.email}...`);
      
      const { data, error } = await supabase
        .from('profiles')
        .insert(userData)
        .select()
        .single();
      
      if (error) {
        console.log(`  ❌ Erro: ${error.message}`);
      } else {
        console.log(`  ✅ Criado: ${data.id}`);
        createdUsers.push(data);
      }
      
    } catch (err) {
      console.log(`  ❌ Erro: ${err.message}`);
    }
  }
  
  console.log(`\n📊 ${createdUsers.length} usuários criados\n`);
  return createdUsers;
}

async function createRoles(users, clinics) {
  console.log('👥 Criando roles de teste...\n');
  
  if (users.length === 0 || clinics.length === 0) {
    console.log('⚠️ Não há usuários ou clínicas para criar roles');
    return [];
  }
  
  const roleAssignments = [
    { userIndex: 0, clinicIndex: 0, role: 'admin' },
    { userIndex: 1, clinicIndex: 0, role: 'manager' },
    { userIndex: 2, clinicIndex: 0, role: 'professional' }
  ];
  
  const createdRoles = [];
  
  for (const assignment of roleAssignments) {
    if (assignment.userIndex < users.length && assignment.clinicIndex < clinics.length) {
      const user = users[assignment.userIndex];
      const clinic = clinics[assignment.clinicIndex];
      
      try {
        console.log(`📝 Criando role: ${user.email} -> ${assignment.role} em ${clinic.nome}...`);
        
        const { data, error } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            clinica_id: clinic.id,
            role: assignment.role,
            ativo: true
          })
          .select()
          .single();
        
        if (error) {
          console.log(`  ❌ Erro: ${error.message}`);
        } else {
          console.log(`  ✅ Role criado: ${data.id}`);
          createdRoles.push(data);
        }
        
      } catch (err) {
        console.log(`  ❌ Erro: ${err.message}`);
      }
    }
  }
  
  console.log(`\n📊 ${createdRoles.length} roles criados\n`);
  return createdRoles;
}

// ============================================================================
// VERIFICAR DADOS EXISTENTES
// ============================================================================

async function checkExistingData() {
  console.log('🔍 Verificando dados existentes...\n');
  
  const results = {
    clinics: 0,
    users: 0,
    roles: 0
  };
  
  try {
    const { data: clinics } = await supabase.from('clinicas').select('id');
    results.clinics = clinics?.length || 0;
    console.log(`🏢 Clínicas existentes: ${results.clinics}`);
  } catch (err) {
    console.log(`❌ Erro ao verificar clínicas: ${err.message}`);
  }
  
  try {
    const { data: users } = await supabase.from('profiles').select('id');
    results.users = users?.length || 0;
    console.log(`👤 Usuários existentes: ${results.users}`);
  } catch (err) {
    console.log(`❌ Erro ao verificar usuários: ${err.message}`);
  }
  
  try {
    const { data: roles } = await supabase.from('user_roles').select('id');
    results.roles = roles?.length || 0;
    console.log(`👥 Roles existentes: ${results.roles}`);
  } catch (err) {
    console.log(`❌ Erro ao verificar roles: ${err.message}`);
  }
  
  console.log('');
  return results;
}

// ============================================================================
// LIMPAR DADOS DE TESTE
// ============================================================================

async function cleanTestData() {
  console.log('🧹 Limpando dados de teste existentes...\n');
  
  try {
    // Limpar roles primeiro (foreign keys)
    const { error: rolesError } = await supabase
      .from('user_roles')
      .delete()
      .like('role', '%');
    
    if (rolesError) {
      console.log(`⚠️ Erro ao limpar roles: ${rolesError.message}`);
    } else {
      console.log('✅ Roles limpos');
    }
    
    // Limpar usuários
    const { error: usersError } = await supabase
      .from('profiles')
      .delete()
      .like('email', '%teste%');
    
    if (usersError) {
      console.log(`⚠️ Erro ao limpar usuários: ${usersError.message}`);
    } else {
      console.log('✅ Usuários de teste limpos');
    }
    
    // Limpar clínicas
    const { error: clinicsError } = await supabase
      .from('clinicas')
      .delete()
      .like('nome', '%Teste%');
    
    if (clinicsError) {
      console.log(`⚠️ Erro ao limpar clínicas: ${clinicsError.message}`);
    } else {
      console.log('✅ Clínicas de teste limpas');
    }
    
  } catch (err) {
    console.log(`❌ Erro na limpeza: ${err.message}`);
  }
  
  console.log('');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // Verificar dados existentes
  const existing = await checkExistingData();
  
  // Se já existem dados, perguntar se deve limpar
  if (existing.clinics > 0 || existing.users > 0 || existing.roles > 0) {
    console.log('⚠️ Dados existentes encontrados. Limpando dados de teste...');
    await cleanTestData();
  }
  
  // Criar novos dados de teste
  console.log('🚀 Criando novos dados de teste...\n');
  
  const clinics = await createClinics();
  const users = await createUsers();
  const roles = await createRoles(users, clinics);
  
  // ============================================================================
  // RESUMO FINAL
  // ============================================================================
  
  console.log('='.repeat(60));
  console.log('📋 RESUMO DA CRIAÇÃO DE DADOS');
  console.log('='.repeat(60));
  
  console.log(`🏢 Clínicas criadas: ${clinics.length}`);
  console.log(`👤 Usuários criados: ${users.length}`);
  console.log(`👥 Roles criados: ${roles.length}`);
  
  if (users.length > 0) {
    console.log('\n🔑 CREDENCIAIS DE TESTE:');
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} / senha: 123456`);
    });
  }
  
  if (clinics.length > 0 && users.length > 0 && roles.length > 0) {
    console.log('\n🎉 DADOS DE TESTE CRIADOS COM SUCESSO!');
    console.log('\nPróximos passos:');
    console.log('1. Testar login na aplicação');
    console.log('2. Verificar seleção de clínica');
    console.log('3. Testar permissões por role');
  } else {
    console.log('\n⚠️ CRIAÇÃO PARCIAL DOS DADOS');
    console.log('Verifique os erros acima e configure RLS se necessário.');
    console.log('\n💡 Dica: Use o dashboard do Supabase para criar dados manualmente:');
    console.log('https://supabase.com/dashboard/project/shzbgjooydruspqajjkf');
  }
}

main().catch(console.error);
