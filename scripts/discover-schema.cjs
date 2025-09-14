#!/usr/bin/env node

/**
 * 🔍 DESCOBRIR ESTRUTURA DO SCHEMA
 * 
 * Descobre a estrutura das tabelas existentes
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🔍 DESCOBRINDO ESTRUTURA DO SCHEMA\n');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// DESCOBRIR ESTRUTURA VIA TENTATIVA E ERRO
// ============================================================================

async function discoverTableStructure(tableName) {
  console.log(`🔍 Descobrindo estrutura da tabela: ${tableName}`);
  
  // Campos comuns que podem existir
  const commonFields = [
    'id', 'uuid', 'user_id', 'clinic_id', 'clinica_id',
    'name', 'nome', 'email', 'phone', 'telefone',
    'role', 'papel', 'tipo', 'active', 'ativo',
    'created_at', 'updated_at', 'criado_em', 'atualizado_em',
    'full_name', 'first_name', 'last_name',
    'password', 'senha', 'hash_senha'
  ];
  
  const existingFields = [];
  
  for (const field of commonFields) {
    try {
      // Tentar fazer uma query com esse campo
      const { data, error } = await supabase
        .from(tableName)
        .select(field)
        .limit(1);
      
      if (!error) {
        existingFields.push(field);
        console.log(`  ✅ ${field}`);
      }
      
    } catch (err) {
      // Campo não existe, continuar
    }
  }
  
  console.log(`  📊 ${existingFields.length} campos encontrados\n`);
  return existingFields;
}

// ============================================================================
// TENTAR INSERÇÃO DE TESTE
// ============================================================================

async function testInsert(tableName, fields) {
  console.log(`🧪 Testando inserção em: ${tableName}`);
  
  // Criar dados de teste baseados nos campos encontrados
  const testData = {};
  
  fields.forEach(field => {
    switch (field) {
      case 'id':
      case 'uuid':
        // Não incluir - será gerado automaticamente
        break;
      case 'name':
      case 'nome':
        testData[field] = 'Teste V2';
        break;
      case 'email':
        testData[field] = `teste-v2-${Date.now()}@exemplo.com`;
        break;
      case 'phone':
      case 'telefone':
        testData[field] = '(11) 99999-9999';
        break;
      case 'role':
      case 'papel':
        testData[field] = 'admin';
        break;
      case 'active':
      case 'ativo':
        testData[field] = true;
        break;
      case 'user_id':
      case 'clinic_id':
      case 'clinica_id':
        // Deixar null por enquanto
        testData[field] = null;
        break;
      default:
        if (field.includes('name')) {
          testData[field] = 'Teste';
        }
    }
  });
  
  console.log(`  📝 Dados de teste:`, testData);
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .insert(testData)
      .select()
      .single();
    
    if (error) {
      console.log(`  ❌ Erro na inserção: ${error.message}`);
      
      // Analisar erro para descobrir campos obrigatórios
      if (error.message.includes('null value in column')) {
        const match = error.message.match(/null value in column "([^"]+)"/);
        if (match) {
          console.log(`  💡 Campo obrigatório descoberto: ${match[1]}`);
        }
      }
      
      if (error.message.includes('violates foreign key constraint')) {
        console.log(`  💡 Tabela tem foreign keys - precisa de dados relacionados`);
      }
      
    } else {
      console.log(`  ✅ Inserção bem-sucedida!`);
      console.log(`  📊 Registro criado:`, data);
      
      // Limpar o teste
      if (data && data.id) {
        await supabase.from(tableName).delete().eq('id', data.id);
        console.log(`  🧹 Registro de teste removido`);
      }
    }
    
  } catch (err) {
    console.log(`  ❌ Erro: ${err.message}`);
  }
  
  console.log('');
}

// ============================================================================
// CRIAR DADOS DE TESTE MÍNIMOS
// ============================================================================

async function createTestData() {
  console.log('🧪 Criando dados de teste mínimos...\n');
  
  // 1. Tentar criar uma clínica
  console.log('🏢 Criando clínica de teste...');
  try {
    const { data: clinic, error: clinicError } = await supabase
      .from('clinicas')
      .insert({
        nome: 'Clínica Teste V2',
        email: `clinica-teste-${Date.now()}@exemplo.com`
      })
      .select()
      .single();
    
    if (clinicError) {
      console.log(`  ❌ Erro: ${clinicError.message}`);
    } else {
      console.log(`  ✅ Clínica criada: ${clinic.id}`);
      
      // 2. Tentar criar um usuário
      console.log('\n👤 Criando usuário de teste...');
      try {
        const { data: user, error: userError } = await supabase
          .from('profiles')
          .insert({
            email: `usuario-teste-${Date.now()}@exemplo.com`,
            full_name: 'Usuário Teste V2'
          })
          .select()
          .single();
        
        if (userError) {
          console.log(`  ❌ Erro: ${userError.message}`);
        } else {
          console.log(`  ✅ Usuário criado: ${user.id}`);
          
          // 3. Tentar criar um role
          console.log('\n👥 Criando role de teste...');
          try {
            const { data: role, error: roleError } = await supabase
              .from('user_roles')
              .insert({
                user_id: user.id,
                clinica_id: clinic.id,
                role: 'admin'
              })
              .select()
              .single();
            
            if (roleError) {
              console.log(`  ❌ Erro: ${roleError.message}`);
            } else {
              console.log(`  ✅ Role criado: ${role.id}`);
              
              // Limpar dados de teste
              console.log('\n🧹 Limpando dados de teste...');
              await supabase.from('user_roles').delete().eq('id', role.id);
              await supabase.from('profiles').delete().eq('id', user.id);
              await supabase.from('clinicas').delete().eq('id', clinic.id);
              console.log('  ✅ Dados de teste removidos');
            }
          } catch (err) {
            console.log(`  ❌ Erro no role: ${err.message}`);
          }
        }
      } catch (err) {
        console.log(`  ❌ Erro no usuário: ${err.message}`);
      }
    }
  } catch (err) {
    console.log(`  ❌ Erro na clínica: ${err.message}`);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const tables = ['profiles', 'clinicas', 'user_roles'];
  const schemaInfo = {};
  
  // 1. Descobrir estrutura de cada tabela
  for (const table of tables) {
    const fields = await discoverTableStructure(table);
    schemaInfo[table] = fields;
  }
  
  // 2. Testar inserções para descobrir mais detalhes
  for (const table of tables) {
    if (schemaInfo[table].length > 0) {
      await testInsert(table, schemaInfo[table]);
    }
  }
  
  // 3. Tentar criar dados de teste completos
  await createTestData();
  
  // ============================================================================
  // RESUMO FINAL
  // ============================================================================
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 ESTRUTURA DESCOBERTA');
  console.log('='.repeat(60));
  
  Object.entries(schemaInfo).forEach(([table, fields]) => {
    console.log(`\n📋 ${table}:`);
    if (fields.length > 0) {
      fields.forEach(field => console.log(`  - ${field}`));
    } else {
      console.log('  (nenhum campo descoberto)');
    }
  });
  
  console.log('\n💡 Próximos passos:');
  console.log('1. Usar dashboard do Supabase para ver estrutura completa');
  console.log('2. Criar dados de teste manualmente');
  console.log('3. Adaptar AuthService para usar tabelas existentes');
  console.log('\n🔗 Dashboard: https://supabase.com/dashboard/project/shzbgjooydruspqajjkf');
}

main().catch(console.error);
