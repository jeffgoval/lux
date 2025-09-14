#!/usr/bin/env node

/**
 * 🔍 VERIFICAR CONEXÃO SUPABASE
 * 
 * Testa a conexão e lista tabelas existentes
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🔍 VERIFICANDO CONEXÃO SUPABASE\n');

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log(`URL: ${supabaseUrl}`);
console.log(`Key: ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NÃO ENCONTRADA'}`);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// TESTAR DIFERENTES MÉTODOS DE CONEXÃO
// ============================================================================

async function testConnection1() {
  console.log('\n🧪 Teste 1: Verificar tabelas conhecidas...');
  
  const knownTables = ['users', 'profiles', 'clinicas', 'user_roles'];
  
  for (const table of knownTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`  ❌ ${table}: ${error.message}`);
      } else {
        console.log(`  ✅ ${table}: Encontrada (${data.length} registros no teste)`);
      }
      
    } catch (err) {
      console.log(`  ❌ ${table}: ${err.message}`);
    }
  }
}

async function testConnection2() {
  console.log('\n🧪 Teste 2: Testar autenticação...');
  
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log(`  ❌ Auth: ${error.message}`);
    } else {
      console.log(`  ✅ Auth: Funcionando (session: ${data.session ? 'ativa' : 'inativa'})`);
    }
    
  } catch (err) {
    console.log(`  ❌ Auth: ${err.message}`);
  }
}

async function testConnection3() {
  console.log('\n🧪 Teste 3: Testar RPC simples...');
  
  try {
    const { data, error } = await supabase.rpc('version');
    
    if (error) {
      console.log(`  ❌ RPC version: ${error.message}`);
    } else {
      console.log(`  ✅ RPC version: ${data}`);
    }
    
  } catch (err) {
    console.log(`  ❌ RPC version: ${err.message}`);
  }
}

async function testConnection4() {
  console.log('\n🧪 Teste 4: Listar todas as tabelas via REST...');
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ REST API: Funcionando`);
      console.log(`  📊 Resposta: ${JSON.stringify(data).substring(0, 100)}...`);
    } else {
      const error = await response.text();
      console.log(`  ❌ REST API: ${response.status} - ${error}`);
    }
    
  } catch (err) {
    console.log(`  ❌ REST API: ${err.message}`);
  }
}

async function listExistingTables() {
  console.log('\n📋 Tentando listar tabelas existentes...');
  
  // Tentar diferentes abordagens
  const approaches = [
    {
      name: 'pg_tables',
      query: () => supabase.rpc('get_tables')
    },
    {
      name: 'direct query',
      query: () => supabase.from('pg_tables').select('tablename').eq('schemaname', 'public')
    }
  ];
  
  for (const approach of approaches) {
    try {
      console.log(`  🔍 Tentando: ${approach.name}...`);
      const { data, error } = await approach.query();
      
      if (error) {
        console.log(`    ❌ ${error.message}`);
      } else {
        console.log(`    ✅ Sucesso: ${data.length} resultados`);
        if (data.length > 0) {
          console.log(`    📊 Primeiros resultados:`, data.slice(0, 3));
        }
      }
      
    } catch (err) {
      console.log(`    ❌ ${err.message}`);
    }
  }
}

// ============================================================================
// VERIFICAR CONFIGURAÇÃO DO PROJETO
// ============================================================================

async function checkProjectConfig() {
  console.log('\n⚙️ Verificando configuração do projeto...');
  
  try {
    // Extrair project ID da URL
    const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    
    if (projectId) {
      console.log(`  📋 Project ID: ${projectId}`);
      
      // Verificar se é o projeto correto
      if (projectId === 'shzbgjooydruspqajjkf') {
        console.log(`  ✅ Project ID correto`);
      } else {
        console.log(`  ⚠️ Project ID diferente do esperado`);
      }
    }
    
    // Verificar formato da chave
    if (supabaseKey.startsWith('eyJ')) {
      console.log(`  ✅ Formato da chave: JWT válido`);
    } else {
      console.log(`  ⚠️ Formato da chave: Não parece JWT`);
    }
    
  } catch (err) {
    console.log(`  ❌ Erro: ${err.message}`);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  await checkProjectConfig();
  await testConnection1();
  await testConnection2();
  await testConnection3();
  await testConnection4();
  await listExistingTables();
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 RESUMO DOS TESTES');
  console.log('='.repeat(50));
  console.log('Se algum teste passou, a conexão está funcionando.');
  console.log('Verifique os resultados acima para identificar problemas.');
  console.log('\n💡 Próximos passos:');
  console.log('1. Se conexão OK: Executar migração manual no dashboard');
  console.log('2. Se conexão falhou: Verificar credenciais no Supabase');
  console.log('3. Acessar: https://supabase.com/dashboard/project/shzbgjooydruspqajjkf');
}

main().catch(console.error);
