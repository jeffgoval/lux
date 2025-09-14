#!/usr/bin/env node

/**
 * 🗄️ SETUP DIRETO DO BANCO - SISTEMA V2
 * 
 * Configura o banco usando o cliente Supabase diretamente
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🗄️ SETUP DIRETO DO BANCO DE DADOS\n');

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log(`🔗 Conectando a: ${supabaseUrl}`);

// ============================================================================
// VERIFICAR CONEXÃO
// ============================================================================

async function checkConnection() {
  console.log('\n🔍 Verificando conexão...');
  
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);
    
    if (error) {
      console.log(`  ❌ Erro: ${error.message}`);
      return false;
    }
    
    console.log('  ✅ Conexão OK');
    return true;
    
  } catch (err) {
    console.log(`  ❌ Erro: ${err.message}`);
    return false;
  }
}

// ============================================================================
// VERIFICAR TABELAS EXISTENTES
// ============================================================================

async function checkExistingTables() {
  console.log('\n📋 Verificando tabelas existentes...');
  
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) {
      console.log(`  ⚠️ Não foi possível listar tabelas: ${error.message}`);
      return [];
    }
    
    const tableNames = data.map(t => t.table_name).filter(name => 
      !name.startsWith('_') && 
      name !== 'spatial_ref_sys'
    );
    
    console.log(`  📊 ${tableNames.length} tabelas encontradas:`);
    tableNames.forEach(name => console.log(`    - ${name}`));
    
    return tableNames;
    
  } catch (err) {
    console.log(`  ❌ Erro: ${err.message}`);
    return [];
  }
}

// ============================================================================
// VERIFICAR SE TABELAS V2 EXISTEM
// ============================================================================

async function checkV2Tables() {
  console.log('\n🔍 Verificando tabelas do Sistema V2...');
  
  const requiredTables = ['users', 'clinics', 'user_clinic_roles'];
  const existingTables = await checkExistingTables();
  
  const v2TablesExist = requiredTables.every(table => existingTables.includes(table));
  
  if (v2TablesExist) {
    console.log('  ✅ Tabelas do Sistema V2 já existem');
    
    // Verificar estrutura das tabelas
    for (const table of requiredTables) {
      await checkTableStructure(table);
    }
    
    return true;
  } else {
    console.log('  ⚠️ Tabelas do Sistema V2 não encontradas');
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    console.log(`  📝 Faltando: ${missingTables.join(', ')}`);
    return false;
  }
}

async function checkTableStructure(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`    ❌ ${tableName}: ${error.message}`);
    } else {
      console.log(`    ✅ ${tableName}: Estrutura OK`);
    }
    
  } catch (err) {
    console.log(`    ❌ ${tableName}: ${err.message}`);
  }
}

// ============================================================================
// TESTAR OPERAÇÕES BÁSICAS
// ============================================================================

async function testBasicOperations() {
  console.log('\n🧪 Testando operações básicas...');
  
  // Testar inserção em clínicas
  try {
    const { data, error } = await supabase
      .from('clinics')
      .insert({
        name: 'Clínica Teste V2',
        email: `teste-v2-${Date.now()}@exemplo.com`,
        active: true
      })
      .select()
      .single();
    
    if (error) {
      console.log(`  ❌ Inserção em clinics: ${error.message}`);
    } else {
      console.log(`  ✅ Inserção em clinics: OK (ID: ${data.id})`);
      
      // Limpar teste
      await supabase.from('clinics').delete().eq('id', data.id);
    }
    
  } catch (err) {
    console.log(`  ❌ Erro no teste: ${err.message}`);
  }
}

// ============================================================================
// CONFIGURAR VARIÁVEIS DE AMBIENTE JWT
// ============================================================================

async function setupJWTConfig() {
  console.log('\n🔑 Configurando JWT...');
  
  const fs = require('fs');
  const path = require('path');
  
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Adicionar configurações JWT se não existirem
  const jwtConfigs = [
    'JWT_SECRET=your-super-secret-jwt-key-change-in-production',
    'JWT_EXPIRES_IN=15m',
    'JWT_REFRESH_EXPIRES_IN=7d',
    'AUTH_V2_ENABLED=true'
  ];
  
  let updated = false;
  
  jwtConfigs.forEach(config => {
    const [key] = config.split('=');
    if (!envContent.includes(key)) {
      envContent += `\n${config}`;
      updated = true;
      console.log(`  ✅ Adicionado: ${key}`);
    } else {
      console.log(`  ℹ️ Já existe: ${key}`);
    }
  });
  
  if (updated) {
    fs.writeFileSync(envPath, envContent);
    console.log('  💾 Arquivo .env atualizado');
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🚀 Iniciando setup do banco...\n');
  
  // 1. Verificar conexão
  const connected = await checkConnection();
  if (!connected) {
    console.log('\n❌ Não foi possível conectar. Verifique as credenciais.');
    process.exit(1);
  }
  
  // 2. Verificar tabelas existentes
  const existingTables = await checkExistingTables();
  
  // 3. Verificar se tabelas V2 existem
  const v2Ready = await checkV2Tables();
  
  // 4. Testar operações básicas se tabelas existem
  if (v2Ready) {
    await testBasicOperations();
  }
  
  // 5. Configurar JWT
  await setupJWTConfig();
  
  // ============================================================================
  // RESUMO FINAL
  // ============================================================================
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 RESUMO DO SETUP');
  console.log('='.repeat(60));
  
  console.log(`🔗 Conexão: ✅ OK`);
  console.log(`📊 Tabelas existentes: ${existingTables.length}`);
  console.log(`🗄️ Sistema V2: ${v2Ready ? '✅ Pronto' : '⚠️ Precisa migração'}`);
  console.log(`🔑 JWT: ✅ Configurado`);
  
  if (v2Ready) {
    console.log('\n🎉 BANCO ESTÁ PRONTO PARA O SISTEMA V2!');
    console.log('\nPróximos passos:');
    console.log('1. Testar login na aplicação');
    console.log('2. Verificar isolamento multi-tenant');
    console.log('3. Criar usuários de teste');
  } else {
    console.log('\n⚠️ BANCO PRECISA DE MIGRAÇÃO');
    console.log('\nOpções:');
    console.log('1. Usar interface do Supabase para criar tabelas');
    console.log('2. Executar SQL manualmente no dashboard');
    console.log('3. Usar ferramenta de migração externa');
  }
  
  console.log('\n📚 Documentação: database/secure-auth-schema.sql');
}

main().catch(console.error);
