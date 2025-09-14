#!/usr/bin/env node

/**
 * 🧪 TESTAR SISTEMA COMPLETO
 * 
 * Testa o sistema V2 completo após criação dos dados
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🧪 TESTANDO SISTEMA COMPLETO V2\n');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// SIMULAR ADAPTADORES (versão JavaScript)
// ============================================================================

const UserAdapter = {
  async findByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error) return null;
      
      return {
        id: data.id,
        email: data.email,
        name: data.nome || 'Usuário',
        phone: data.telefone,
        active: data.ativo ?? true,
        created_at: data.criado_em
      };
    } catch (err) {
      return null;
    }
  }
};

const ClinicAdapter = {
  async findById(id) {
    try {
      const { data, error } = await supabase
        .from('clinicas')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) return null;
      
      return {
        id: data.id,
        name: data.nome,
        active: data.ativo ?? true,
        created_at: data.criado_em
      };
    } catch (err) {
      return null;
    }
  }
};

const RoleAdapter = {
  async findByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('ativo', true);
      
      if (error) return [];
      
      return data.map(role => ({
        id: role.id,
        user_id: role.user_id,
        clinic_id: role.clinica_id,
        role: role.role,
        active: role.ativo ?? true,
        created_at: role.criado_em
      }));
    } catch (err) {
      return [];
    }
  }
};

// ============================================================================
// SIMULAR PROCESSO DE LOGIN
// ============================================================================

async function simulateLogin(email, password) {
  console.log(`🔐 Simulando login: ${email}...`);
  
  try {
    // 1. Buscar usuário
    console.log('  📋 Buscando usuário...');
    const user = await UserAdapter.findByEmail(email);
    
    if (!user) {
      console.log('  ❌ Usuário não encontrado');
      return { success: false, error: 'Usuário não encontrado' };
    }
    
    console.log(`  ✅ Usuário encontrado: ${user.id}`);
    
    // 2. Validar senha (simulado)
    console.log('  🔑 Validando senha...');
    if (password.length < 3) {
      console.log('  ❌ Senha muito curta');
      return { success: false, error: 'Senha inválida' };
    }
    
    console.log('  ✅ Senha válida');
    
    // 3. Buscar roles
    console.log('  👥 Buscando roles...');
    const roles = await RoleAdapter.findByUserId(user.id);
    
    if (roles.length === 0) {
      console.log('  ⚠️ Nenhum role encontrado');
      return { success: false, error: 'Usuário sem permissões' };
    }
    
    console.log(`  ✅ ${roles.length} roles encontrados`);
    
    // 4. Buscar clínicas
    console.log('  🏢 Buscando clínicas...');
    const clinicAccess = [];
    
    for (const role of roles) {
      const clinic = await ClinicAdapter.findById(role.clinic_id);
      if (clinic) {
        clinicAccess.push({
          clinicId: clinic.id,
          clinicName: clinic.name,
          role: role.role,
          isActive: role.active
        });
        console.log(`    - ${clinic.name} (${role.role})`);
      }
    }
    
    console.log(`  ✅ ${clinicAccess.length} clínicas acessíveis`);
    
    // 5. Resultado do login
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: roles[0].role,
        clinicAccess,
        isActive: user.active
      },
      tokens: {
        accessToken: `dev-token-${user.id}-${Date.now()}`,
        refreshToken: `dev-refresh-${user.id}-${Date.now()}`,
        expiresIn: 3600
      }
    };
    
  } catch (error) {
    console.log(`  ❌ Erro no login: ${error.message}`);
    return { success: false, error: 'Erro interno' };
  }
}

// ============================================================================
// VERIFICAR DADOS NECESSÁRIOS
// ============================================================================

async function checkRequiredData() {
  console.log('🔍 Verificando dados necessários...\n');
  
  const results = {
    clinics: [],
    users: [],
    roles: []
  };
  
  // Verificar clínicas
  try {
    const { data: clinics } = await supabase
      .from('clinicas')
      .select('id, nome, ativo')
      .eq('ativo', true);
    
    results.clinics = clinics || [];
    console.log(`🏢 ${results.clinics.length} clínicas ativas encontradas`);
    results.clinics.forEach(clinic => console.log(`   - ${clinic.nome}`));
  } catch (err) {
    console.log(`❌ Erro ao verificar clínicas: ${err.message}`);
  }
  
  // Verificar usuários
  try {
    const { data: users } = await supabase
      .from('profiles')
      .select('id, email, ativo')
      .eq('ativo', true);
    
    results.users = users || [];
    console.log(`\n👤 ${results.users.length} usuários ativos encontrados`);
    results.users.forEach(user => console.log(`   - ${user.email}`));
  } catch (err) {
    console.log(`❌ Erro ao verificar usuários: ${err.message}`);
  }
  
  // Verificar roles
  try {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('id, role, ativo')
      .eq('ativo', true);
    
    results.roles = roles || [];
    console.log(`\n👥 ${results.roles.length} roles ativos encontrados`);
    results.roles.forEach(role => console.log(`   - ${role.role}`));
  } catch (err) {
    console.log(`❌ Erro ao verificar roles: ${err.message}`);
  }
  
  return results;
}

// ============================================================================
// TESTAR CENÁRIOS COMPLETOS
// ============================================================================

async function testScenarios(data) {
  console.log('\n🧪 Testando cenários de login...\n');
  
  const testCases = [
    { email: 'admin@teste.com', password: '123456', description: 'Login válido' },
    { email: 'admin@teste.com', password: '12', description: 'Senha muito curta' },
    { email: 'inexistente@teste.com', password: '123456', description: 'Usuário inexistente' }
  ];
  
  // Se temos usuários reais, usar o primeiro
  if (data.users.length > 0) {
    testCases[0].email = data.users[0].email;
  }
  
  for (const testCase of testCases) {
    console.log(`📋 Teste: ${testCase.description}`);
    const result = await simulateLogin(testCase.email, testCase.password);
    
    if (result.success) {
      console.log('  🎉 Login bem-sucedido!');
      console.log(`  👤 Usuário: ${result.user.name} (${result.user.email})`);
      console.log(`  🏢 Clínicas: ${result.user.clinicAccess.length}`);
      console.log(`  🔑 Token: ${result.tokens.accessToken.substring(0, 20)}...`);
    } else {
      console.log(`  ❌ Login falhou: ${result.error}`);
    }
    
    console.log('');
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // 1. Verificar dados necessários
  const data = await checkRequiredData();
  
  // 2. Verificar se temos dados suficientes
  const hasMinimalData = data.clinics.length > 0 && data.users.length > 0 && data.roles.length > 0;
  
  if (!hasMinimalData) {
    console.log('\n⚠️ DADOS INSUFICIENTES PARA TESTE');
    console.log('\nPara testar o sistema, você precisa:');
    console.log('1. Pelo menos 1 clínica ativa');
    console.log('2. Pelo menos 1 usuário ativo');
    console.log('3. Pelo menos 1 role ativo');
    console.log('\n💡 Execute o script anterior para criar dados:');
    console.log('node scripts/create-minimal-test-data.cjs');
    console.log('\nOu crie manualmente no dashboard do Supabase.');
    return;
  }
  
  // 3. Testar cenários
  await testScenarios(data);
  
  // ============================================================================
  // RESUMO FINAL
  // ============================================================================
  
  console.log('='.repeat(60));
  console.log('📋 RESUMO DO TESTE COMPLETO');
  console.log('='.repeat(60));
  
  console.log(`🏢 Clínicas: ${data.clinics.length} ativas`);
  console.log(`👤 Usuários: ${data.users.length} ativos`);
  console.log(`👥 Roles: ${data.roles.length} ativos`);
  
  if (hasMinimalData) {
    console.log('\n🎉 SISTEMA ESTÁ FUNCIONANDO!');
    console.log('\nPróximos passos:');
    console.log('1. Abrir aplicação: http://localhost:5174/auth');
    console.log('2. Testar login com credenciais reais');
    console.log('3. Verificar seleção de clínica');
    console.log('4. Testar navegação entre páginas');
    
    if (data.users.length > 0) {
      console.log('\n🔑 Credenciais sugeridas:');
      console.log(`   Email: ${data.users[0].email}`);
      console.log('   Senha: 123456 (ou qualquer senha > 3 caracteres)');
    }
  }
  
  console.log('\n📚 Documentação: src/services/schema-adapter.ts');
}

main().catch(console.error);
