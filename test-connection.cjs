#!/usr/bin/env node

/**
 * 🔍 TESTE DE CONECTIVIDADE COM SUPABASE
 */

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://dvnyfwpphuuujhodqkko.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxNzQ4NzEsImV4cCI6MjA0OTc1MDg3MX0.8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testando conectividade com Supabase...');
  
  try {
    // Teste 1: Verificar se o cliente foi criado
    console.log('✅ Cliente Supabase criado com sucesso');
    
    // Teste 2: Tentar uma consulta simples
    console.log('🔄 Tentando consulta simples...');
    
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(3);
    
    if (error) {
      console.log(`❌ Erro na consulta: ${error.message}`);
      console.log(`📋 Código do erro: ${error.code}`);
      console.log(`🔍 Detalhes: ${error.details}`);
    } else {
      console.log('✅ Consulta executada com sucesso!');
      console.log('📋 Dados retornados:', data);
    }
    
  } catch (error) {
    console.log(`❌ Erro de conectividade: ${error.message}`);
    console.log(`🔍 Tipo do erro: ${error.constructor.name}`);
    
    if (error.code) {
      console.log(`📋 Código: ${error.code}`);
    }
  }
}

testConnection();
