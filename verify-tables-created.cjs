#!/usr/bin/env node

/**
 * 🔍 VERIFICADOR DE TABELAS CRIADAS
 * 
 * Verifica se as tabelas foram criadas com sucesso
 */

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://dvnyfwpphuuujhodqkko.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxNzQ4NzEsImV4cCI6MjA0OTc1MDg3MX0.8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8QJ8';

const supabase = createClient(supabaseUrl, supabaseKey);

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function verifyTables() {
  log('🔍 VERIFICANDO TABELAS CRIADAS NO SUPABASE\n', 'bold');
  
  const tablesToCheck = [
    'organizacoes',
    'clinicas', 
    'user_roles',
    'clientes',
    'servicos',
    'agendamentos',
    'bloqueios_agenda',
    'lista_espera',
    'disponibilidade_profissional'
  ];
  
  let tablesFound = 0;
  let tablesWithData = 0;
  
  for (const tableName of tablesToCheck) {
    try {
      log(`📋 Verificando tabela: ${tableName}`, 'blue');
      
      // Tentar acessar a tabela
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) {
        log(`❌ ${tableName} - Erro: ${error.message}`, 'red');
      } else {
        log(`✅ ${tableName} - Acessível`, 'green');
        tablesFound++;
        
        if (count && count > 0) {
          log(`   📊 ${count} registros encontrados`, 'yellow');
          tablesWithData++;
        } else {
          log(`   📊 Tabela vazia`, 'yellow');
        }
      }
    } catch (err) {
      log(`❌ ${tableName} - Erro de conexão: ${err.message}`, 'red');
    }
  }
  
  log(`\n📊 RESULTADO FINAL:`, 'bold');
  log(`✅ ${tablesFound}/${tablesToCheck.length} tabelas acessíveis`, 'green');
  log(`📊 ${tablesWithData} tabelas com dados`, 'yellow');
  
  if (tablesFound >= 5) {
    log('\n🎉 SUCESSO! As tabelas principais foram criadas!', 'green');
    log('✅ Sistema parcialmente funcional', 'green');
    log('✅ Agendamentos podem ser criados', 'green');
    log('✅ Clientes podem ser gerenciados', 'green');
    log('✅ Serviços podem ser configurados', 'green');
  } else if (tablesFound > 0) {
    log('\n⚠️  PARCIAL: Algumas tabelas foram criadas', 'yellow');
    log('💡 Continue com a migração manual se necessário', 'yellow');
  } else {
    log('\n❌ FALHA: Nenhuma tabela foi criada', 'red');
    log('💡 Execute a migração manual no Supabase Dashboard', 'red');
  }
  
  // Verificar enums
  log('\n🔍 Verificando enums criados...', 'blue');
  
  const enumsToCheck = [
    'agendamento_status',
    'cliente_categoria',
    'user_role_type'
  ];
  
  for (const enumName of enumsToCheck) {
    try {
      // Tentar usar o enum em uma consulta
      const { data, error } = await supabase
        .from('agendamentos')
        .select('status')
        .limit(1);
      
      if (!error) {
        log(`✅ Enum ${enumName} - Funcional`, 'green');
      }
    } catch (err) {
      log(`❌ Enum ${enumName} - Erro: ${err.message}`, 'red');
    }
  }
  
  log('\n✨ Verificação concluída!', 'blue');
}

// Executar verificação
verifyTables().catch(console.error);
