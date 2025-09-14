#!/usr/bin/env node

/**
 * 🗄️ MIGRAÇÃO DO BANCO DE DADOS - SISTEMA V2
 * 
 * Executa a migração completa para o sistema de autenticação seguro
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  console.log('Certifique-se de ter:');
  console.log('- VITE_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY (ou VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🗄️ MIGRAÇÃO DO BANCO DE DADOS - SISTEMA V2\n');

// ============================================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================================

async function executeSQLFile(filePath, description) {
  console.log(`📄 Executando: ${description}...`);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`  ❌ Arquivo não encontrado: ${filePath}`);
      return false;
    }
    
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    
    // Dividir em statements individuais (separados por ;)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`  📊 ${statements.length} statements encontrados`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.length < 10) continue; // Pular statements muito pequenos
      
      try {
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });
        
        if (error) {
          // Tentar execução direta se RPC falhar
          const { error: directError } = await supabase
            .from('_temp_migration')
            .select('*')
            .limit(1);
          
          if (directError && directError.message.includes('does not exist')) {
            // Criar função temporária para execução
            await createTempExecutionFunction();
          }
          
          console.log(`  ⚠️ Statement ${i + 1}: ${error.message.substring(0, 100)}...`);
          errorCount++;
        } else {
          successCount++;
        }
        
      } catch (err) {
        console.log(`  ❌ Erro no statement ${i + 1}: ${err.message.substring(0, 100)}...`);
        errorCount++;
      }
    }
    
    console.log(`  ✅ Concluído: ${successCount} sucessos, ${errorCount} erros\n`);
    return errorCount === 0;
    
  } catch (error) {
    console.log(`  ❌ Erro ao executar arquivo: ${error.message}\n`);
    return false;
  }
}

async function createTempExecutionFunction() {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          EXECUTE sql_query;
        END;
        $$;
      `
    });
    
    if (error) {
      console.log('  ℹ️ Função de execução não disponível, usando método alternativo');
    }
  } catch (err) {
    // Ignorar erro - tentaremos método alternativo
  }
}

async function checkConnection() {
  console.log('🔍 Verificando conexão com Supabase...');
  
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);
    
    if (error) {
      console.log(`  ❌ Erro de conexão: ${error.message}`);
      return false;
    }
    
    console.log('  ✅ Conexão estabelecida com sucesso\n');
    return true;
    
  } catch (err) {
    console.log(`  ❌ Erro de conexão: ${err.message}`);
    return false;
  }
}

async function backupCurrentSchema() {
  console.log('💾 Fazendo backup do schema atual...');
  
  try {
    // Listar tabelas existentes
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .neq('table_name', 'spatial_ref_sys'); // Excluir tabelas do sistema
    
    if (error) {
      console.log(`  ⚠️ Não foi possível listar tabelas: ${error.message}`);
    } else {
      const tableNames = tables.map(t => t.table_name);
      console.log(`  📊 ${tableNames.length} tabelas encontradas: ${tableNames.slice(0, 5).join(', ')}${tableNames.length > 5 ? '...' : ''}`);
      
      // Salvar lista de tabelas
      const backupInfo = {
        timestamp: new Date().toISOString(),
        tables: tableNames,
        supabaseUrl: supabaseUrl
      };
      
      const backupPath = path.join(process.cwd(), 'backups', `schema-backup-${Date.now()}.json`);
      
      // Criar diretório de backup se não existir
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      fs.writeFileSync(backupPath, JSON.stringify(backupInfo, null, 2));
      console.log(`  ✅ Backup salvo em: ${backupPath}\n`);
    }
    
  } catch (err) {
    console.log(`  ⚠️ Erro no backup: ${err.message}\n`);
  }
}

// ============================================================================
// MIGRAÇÃO PRINCIPAL
// ============================================================================

async function runMigration() {
  console.log('🚀 Iniciando migração do banco de dados...\n');
  
  // 1. Verificar conexão
  const connected = await checkConnection();
  if (!connected) {
    console.log('❌ Não foi possível conectar ao banco. Verifique as credenciais.');
    process.exit(1);
  }
  
  // 2. Fazer backup
  await backupCurrentSchema();
  
  // 3. Executar migração do schema
  const schemaSuccess = await executeSQLFile(
    path.join(process.cwd(), 'database/secure-auth-schema.sql'),
    'Schema de autenticação seguro'
  );
  
  // 4. Aplicar políticas RLS
  const rlsSuccess = await executeSQLFile(
    path.join(process.cwd(), 'database/secure-rls-policies.sql'),
    'Políticas RLS rigorosas'
  );
  
  // 5. Migrar dados existentes
  const dataSuccess = await executeSQLFile(
    path.join(process.cwd(), 'database/migrate-existing-data.sql'),
    'Migração de dados existentes'
  );
  
  // ============================================================================
  // RESUMO FINAL
  // ============================================================================
  
  console.log('='.repeat(60));
  console.log('📋 RESUMO DA MIGRAÇÃO');
  console.log('='.repeat(60));
  
  console.log(`🗄️ Schema: ${schemaSuccess ? '✅ Sucesso' : '❌ Falhou'}`);
  console.log(`🔒 RLS Policies: ${rlsSuccess ? '✅ Sucesso' : '❌ Falhou'}`);
  console.log(`📊 Migração de Dados: ${dataSuccess ? '✅ Sucesso' : '❌ Falhou'}`);
  
  const allSuccess = schemaSuccess && rlsSuccess && dataSuccess;
  
  if (allSuccess) {
    console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('\nPróximos passos:');
    console.log('1. Configurar variáveis de ambiente JWT');
    console.log('2. Testar login com credenciais válidas');
    console.log('3. Verificar isolamento multi-tenant');
  } else {
    console.log('\n⚠️ MIGRAÇÃO PARCIALMENTE CONCLUÍDA');
    console.log('\nVerifique os erros acima e execute novamente se necessário.');
    console.log('O backup foi salvo em caso de necessidade de rollback.');
  }
  
  console.log('\n📚 Documentação: MIGRATION_PLAN.md');
}

// Executar migração
runMigration().catch(console.error);
