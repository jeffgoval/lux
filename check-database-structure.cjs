#!/usr/bin/env node

/**
 * 🔍 VERIFICAÇÃO DA ESTRUTURA DO BANCO DE DADOS
 * 
 * Analisa a estrutura atual do banco e identifica tabelas faltantes
 */

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://dvnyfwpphuuujhodqkko.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxNzQ4NzEsImV4cCI6MjA0OTc1MDg3MX0.8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseStructure() {
  console.log('🔍 VERIFICAÇÃO DA ESTRUTURA DO BANCO DE DADOS\n');

  try {
    // 1. Verificar tabelas existentes
    console.log('📋 Verificando tabelas existentes...');
    
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_list');
    
    if (tablesError) {
      console.log('⚠️  Não foi possível usar RPC, tentando método alternativo...');
      
      // Método alternativo - tentar acessar tabelas conhecidas
      const knownTables = [
        'profiles', 'user_roles', 'clinicas', 'profissionais', 
        'prontuarios', 'servicos', 'agendamentos', 'clientes',
        'templates_procedimentos', 'clinica_profissionais'
      ];
      
      console.log('🔍 Testando acesso às tabelas conhecidas:');
      
      for (const tableName of knownTables) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (error) {
            console.log(`  ❌ ${tableName} - ${error.message}`);
          } else {
            console.log(`  ✅ ${tableName} - Acessível`);
          }
        } catch (err) {
          console.log(`  ❌ ${tableName} - Erro: ${err.message}`);
        }
      }
    } else {
      console.log('✅ Tabelas encontradas:');
      tables.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    }

    // 2. Verificar enums
    console.log('\n🔍 Verificando enums...');
    
    const enumTests = [
      { name: 'user_role_type', test: 'SELECT unnest(enum_range(NULL::user_role_type))' },
      { name: 'tipo_procedimento', test: 'SELECT unnest(enum_range(NULL::tipo_procedimento))' },
      { name: 'status_prontuario', test: 'SELECT unnest(enum_range(NULL::status_prontuario))' }
    ];
    
    for (const enumTest of enumTests) {
      try {
        const { data, error } = await supabase
          .rpc('execute_sql', { sql: enumTest.test });
        
        if (error) {
          console.log(`  ❌ ${enumTest.name} - ${error.message}`);
        } else {
          console.log(`  ✅ ${enumTest.name} - Disponível`);
        }
      } catch (err) {
        console.log(`  ❌ ${enumTest.name} - Erro: ${err.message}`);
      }
    }

    // 3. Verificar funções
    console.log('\n🔍 Verificando funções...');
    
    const functionTests = [
      'gerar_numero_prontuario',
      'hash_sensitive_data',
      'log_evento_sistema'
    ];
    
    for (const funcName of functionTests) {
      try {
        const { data, error } = await supabase
          .rpc('execute_sql', { sql: `SELECT ${funcName}()` });
        
        if (error) {
          console.log(`  ❌ ${funcName} - ${error.message}`);
        } else {
          console.log(`  ✅ ${funcName} - Disponível`);
        }
      } catch (err) {
        console.log(`  ❌ ${funcName} - Erro: ${err.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar verificação
checkDatabaseStructure();
