#!/usr/bin/env node

/**
 * 🧪 CRIAR DADOS MÍNIMOS DE TESTE
 * 
 * Cria dados usando apenas campos conhecidos
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🧪 CRIANDO DADOS MÍNIMOS DE TESTE\n');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// DADOS MÍNIMOS (apenas campos que sabemos que existem)
// ============================================================================

const MINIMAL_DATA = {
  clinics: [
    {
      nome: 'Bella Estética',
      ativo: true
    }
  ],
  users: [
    {
      email: 'admin@teste.com',
      telefone: '11999999999',
      ativo: true
    }
  ]
};

// ============================================================================
// INSTRUÇÕES PARA CRIAÇÃO MANUAL
// ============================================================================

function showManualInstructions() {
  console.log('📋 INSTRUÇÕES PARA CRIAÇÃO MANUAL NO DASHBOARD\n');
  
  console.log('🔗 Acesse: https://supabase.com/dashboard/project/shzbgjooydruspqajjkf');
  console.log('📊 Vá para: Table Editor\n');
  
  console.log('🏢 1. CRIAR CLÍNICA:');
  console.log('   Tabela: clinicas');
  console.log('   Dados:');
  console.log('   - nome: "Clínica Teste V2"');
  console.log('   - ativo: true');
  console.log('   - (outros campos serão preenchidos automaticamente)\n');
  
  console.log('👤 2. CRIAR USUÁRIO:');
  console.log('   Tabela: profiles');
  console.log('   Dados:');
  console.log('   - email: "admin@teste.com"');
  console.log('   - telefone: "11999999999"');
  console.log('   - ativo: true');
  console.log('   - (outros campos serão preenchidos automaticamente)\n');
  
  console.log('👥 3. CRIAR ROLE:');
  console.log('   Tabela: user_roles');
  console.log('   Dados:');
  console.log('   - user_id: [ID do usuário criado]');
  console.log('   - clinica_id: [ID da clínica criada]');
  console.log('   - role: "admin"');
  console.log('   - ativo: true\n');
  
  console.log('🔑 4. CREDENCIAIS DE TESTE:');
  console.log('   Email: admin@teste.com');
  console.log('   Senha: 123456 (qualquer senha > 3 caracteres)\n');
}

// ============================================================================
// TENTAR CRIAÇÃO AUTOMÁTICA (pode falhar por RLS)
// ============================================================================

async function tryAutomaticCreation() {
  console.log('🤖 Tentando criação automática...\n');
  
  let success = false;
  
  // Tentar criar clínica
  console.log('🏢 Tentando criar clínica...');
  try {
    const { data, error } = await supabase
      .from('clinicas')
      .insert(MINIMAL_DATA.clinics[0])
      .select()
      .single();
    
    if (error) {
      console.log(`  ❌ Falhou: ${error.message}`);
    } else {
      console.log(`  ✅ Clínica criada: ${data.id}`);
      success = true;
    }
  } catch (err) {
    console.log(`  ❌ Erro: ${err.message}`);
  }
  
  // Tentar criar usuário
  console.log('\n👤 Tentando criar usuário...');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert(MINIMAL_DATA.users[0])
      .select()
      .single();
    
    if (error) {
      console.log(`  ❌ Falhou: ${error.message}`);
    } else {
      console.log(`  ✅ Usuário criado: ${data.id}`);
      success = true;
    }
  } catch (err) {
    console.log(`  ❌ Erro: ${err.message}`);
  }
  
  return success;
}

// ============================================================================
// VERIFICAR SE JÁ EXISTEM DADOS
// ============================================================================

async function checkForExistingData() {
  console.log('🔍 Verificando dados existentes...\n');
  
  let hasData = false;
  
  try {
    const { data: clinics } = await supabase
      .from('clinicas')
      .select('id, nome')
      .limit(5);
    
    if (clinics && clinics.length > 0) {
      console.log(`🏢 ${clinics.length} clínicas encontradas:`);
      clinics.forEach(clinic => console.log(`   - ${clinic.nome} (${clinic.id})`));
      hasData = true;
    } else {
      console.log('🏢 Nenhuma clínica encontrada');
    }
  } catch (err) {
    console.log(`❌ Erro ao verificar clínicas: ${err.message}`);
  }
  
  try {
    const { data: users } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(5);
    
    if (users && users.length > 0) {
      console.log(`\n👤 ${users.length} usuários encontrados:`);
      users.forEach(user => console.log(`   - ${user.email} (${user.id})`));
      hasData = true;
    } else {
      console.log('\n👤 Nenhum usuário encontrado');
    }
  } catch (err) {
    console.log(`❌ Erro ao verificar usuários: ${err.message}`);
  }
  
  try {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('id, role')
      .limit(5);
    
    if (roles && roles.length > 0) {
      console.log(`\n👥 ${roles.length} roles encontrados:`);
      roles.forEach(role => console.log(`   - ${role.role} (${role.id})`));
      hasData = true;
    } else {
      console.log('\n👥 Nenhum role encontrado');
    }
  } catch (err) {
    console.log(`❌ Erro ao verificar roles: ${err.message}`);
  }
  
  return hasData;
}

// ============================================================================
// GERAR SQL PARA EXECUÇÃO MANUAL
// ============================================================================

function generateSQL() {
  console.log('\n📝 SQL PARA EXECUÇÃO MANUAL:\n');
  
  console.log('-- 1. Criar clínica');
  console.log(`INSERT INTO clinicas (nome, ativo) VALUES ('Clínica Teste V2', true);`);
  console.log('');
  
  console.log('-- 2. Criar usuário');
  console.log(`INSERT INTO profiles (email, telefone, ativo) VALUES ('admin@teste.com', '11999999999', true);`);
  console.log('');
  
  console.log('-- 3. Criar role (substitua os UUIDs pelos IDs reais)');
  console.log(`INSERT INTO user_roles (user_id, clinica_id, role, ativo) `);
  console.log(`VALUES (`);
  console.log(`  (SELECT id FROM profiles WHERE email = 'admin@teste.com'),`);
  console.log(`  (SELECT id FROM clinicas WHERE nome = 'Clínica Teste V2'),`);
  console.log(`  'admin',`);
  console.log(`  true`);
  console.log(`);`);
  console.log('');
  
  console.log('-- 4. Verificar dados criados');
  console.log(`SELECT 'Clínicas' as tipo, nome as nome, id FROM clinicas`);
  console.log(`UNION ALL`);
  console.log(`SELECT 'Usuários' as tipo, email as nome, id FROM profiles`);
  console.log(`UNION ALL`);
  console.log(`SELECT 'Roles' as tipo, role as nome, id FROM user_roles;`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // 1. Verificar dados existentes
  const hasExistingData = await checkForExistingData();
  
  if (hasExistingData) {
    console.log('\n🎉 DADOS JÁ EXISTEM!');
    console.log('\nPróximos passos:');
    console.log('1. Testar login na aplicação');
    console.log('2. Usar credenciais existentes');
    console.log('3. Verificar funcionamento do sistema');
    return;
  }
  
  // 2. Tentar criação automática
  const automaticSuccess = await tryAutomaticCreation();
  
  if (automaticSuccess) {
    console.log('\n🎉 ALGUNS DADOS CRIADOS AUTOMATICAMENTE!');
    console.log('Complete a criação manualmente se necessário.');
  } else {
    console.log('\n⚠️ CRIAÇÃO AUTOMÁTICA FALHOU (RLS ativo)');
  }
  
  // 3. Mostrar instruções manuais
  console.log('\n' + '='.repeat(60));
  showManualInstructions();
  
  // 4. Gerar SQL
  generateSQL();
  
  console.log('='.repeat(60));
  console.log('💡 RESUMO:');
  console.log('1. Use o dashboard do Supabase para criar dados');
  console.log('2. Ou execute o SQL acima no SQL Editor');
  console.log('3. Depois teste o login na aplicação');
  console.log('\n🔗 Dashboard: https://supabase.com/dashboard/project/shzbgjooydruspqajjkf');
}

main().catch(console.error);
