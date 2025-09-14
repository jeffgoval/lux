#!/usr/bin/env node

/**
 * 🚀 EXECUTOR DIRETO DE SQL NO SUPABASE
 * 
 * Executa SQL diretamente usando o método correto do Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

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

async function executeSQLDirect(sqlContent, description) {
  try {
    log(`\n🔄 ${description}...`, 'blue');
    
    // Usar o método correto do Supabase para executar SQL
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sqlContent 
    });
    
    if (error) {
      log(`❌ Erro ao executar SQL: ${error.message}`, 'red');
      return { success: false, error: error.message };
    }
    
    log(`✅ SQL executado com sucesso!`, 'green');
    return { success: true, data };
    
  } catch (error) {
    log(`❌ Erro geral: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function createTablesIndividually() {
  log('🔧 Criando tabelas individualmente...', 'blue');
  
  const tables = [
    {
      name: 'organizacoes',
      sql: `
        CREATE TABLE IF NOT EXISTS public.organizacoes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nome TEXT NOT NULL,
          cnpj TEXT UNIQUE,
          endereco JSONB DEFAULT '{}'::jsonb,
          telefone_principal TEXT,
          email_contato TEXT,
          plano TEXT NOT NULL DEFAULT 'basico',
          ativo BOOLEAN NOT NULL DEFAULT true,
          criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
          atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
          criado_por UUID REFERENCES auth.users(id)
        );
      `
    },
    {
      name: 'clientes',
      sql: `
        CREATE TABLE IF NOT EXISTS public.clientes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
          nome_completo TEXT NOT NULL,
          email TEXT,
          telefone TEXT,
          data_nascimento DATE,
          cpf TEXT,
          endereco JSONB DEFAULT '{}'::jsonb,
          categoria TEXT NOT NULL DEFAULT 'regular',
          observacoes TEXT,
          ativo BOOLEAN NOT NULL DEFAULT true,
          criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
          atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
          criado_por UUID REFERENCES auth.users(id)
        );
      `
    },
    {
      name: 'servicos',
      sql: `
        CREATE TABLE IF NOT EXISTS public.servicos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
          nome TEXT NOT NULL,
          nome_tecnico TEXT,
          codigo_interno TEXT,
          categoria TEXT NOT NULL,
          subcategoria TEXT,
          status TEXT NOT NULL DEFAULT 'ativo',
          descricao_comercial TEXT,
          descricao_tecnica TEXT,
          duracao_padrao INTEGER NOT NULL DEFAULT 60,
          preco_base DECIMAL(10,2) NOT NULL,
          ativo BOOLEAN NOT NULL DEFAULT true,
          criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
          atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
          criado_por UUID REFERENCES auth.users(id)
        );
      `
    },
    {
      name: 'agendamentos',
      sql: `
        CREATE TABLE IF NOT EXISTS public.agendamentos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
          profissional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
          servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE RESTRICT,
          clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
          data_agendamento TIMESTAMPTZ NOT NULL,
          duracao_minutos INTEGER NOT NULL DEFAULT 60,
          status TEXT NOT NULL DEFAULT 'pendente',
          valor_servico DECIMAL(10,2) NOT NULL,
          valor_final DECIMAL(10,2) NOT NULL,
          observacoes TEXT,
          ativo BOOLEAN NOT NULL DEFAULT true,
          criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
          atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
          criado_por UUID REFERENCES auth.users(id)
        );
      `
    }
  ];
  
  let successCount = 0;
  
  for (const table of tables) {
    try {
      log(`📝 Criando tabela ${table.name}...`, 'yellow');
      
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: table.sql 
      });
      
      if (error) {
        log(`❌ Erro ao criar ${table.name}: ${error.message}`, 'red');
      } else {
        log(`✅ Tabela ${table.name} criada com sucesso!`, 'green');
        successCount++;
      }
    } catch (err) {
      log(`❌ Erro ao criar ${table.name}: ${err.message}`, 'red');
    }
  }
  
  return successCount;
}

async function testConnection() {
  try {
    log('🔍 Testando conexão com Supabase...', 'blue');
    
    // Tentar uma consulta simples
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5);
    
    if (error) {
      log(`⚠️  Erro na consulta: ${error.message}`, 'yellow');
      return false;
    } else {
      log('✅ Conexão com Supabase estabelecida!', 'green');
      if (data && data.length > 0) {
        log(`📋 Tabelas encontradas: ${data.map(t => t.table_name).join(', ')}`, 'blue');
      }
      return true;
    }
  } catch (error) {
    log(`❌ Erro de conexão: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('🚀 EXECUTOR DIRETO DE SQL NO SUPABASE\n', 'bold');
  
  // Testar conexão
  const connected = await testConnection();
  if (!connected) {
    log('❌ Não foi possível conectar ao Supabase.', 'red');
    return;
  }
  
  // Tentar executar migração completa
  try {
    log('📁 Carregando arquivo de migração...', 'blue');
    const migrationSQL = fs.readFileSync('database-migration-incremental.sql', 'utf8');
    
    const result = await executeSQLDirect(migrationSQL, 'Migração Completa');
    
    if (result.success) {
      log('\n🎉 MIGRAÇÃO EXECUTADA COM SUCESSO!', 'green');
    } else {
      log('\n⚠️  Migração falhou, tentando método alternativo...', 'yellow');
      
      // Tentar criar tabelas individualmente
      const tablesCreated = await createTablesIndividually();
      
      if (tablesCreated > 0) {
        log(`\n✅ ${tablesCreated} tabelas criadas com sucesso!`, 'green');
      } else {
        log('\n❌ Não foi possível criar as tabelas.', 'red');
      }
    }
    
  } catch (error) {
    log(`❌ Erro ao carregar arquivo: ${error.message}`, 'red');
  }
  
  // Verificar tabelas criadas
  log('\n🔍 Verificando tabelas criadas...', 'blue');
  
  const tablesToCheck = [
    'organizacoes', 'clientes', 'servicos', 'agendamentos',
    'bloqueios_agenda', 'lista_espera', 'disponibilidade_profissional',
    'sessoes_atendimento', 'imagens_medicas', 'consentimentos_digitais',
    'equipamentos', 'produtos', 'salas_clinica', 'auditoria_medica', 'logs_sistema'
  ];
  
  let tablesFound = 0;
  
  for (const tableName of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        log(`❌ ${tableName} - ${error.message}`, 'red');
      } else {
        log(`✅ ${tableName} - Acessível`, 'green');
        tablesFound++;
      }
    } catch (err) {
      log(`❌ ${tableName} - Erro: ${err.message}`, 'red');
    }
  }
  
  log(`\n📊 RESULTADO FINAL: ${tablesFound}/${tablesToCheck.length} tabelas acessíveis`, 
      tablesFound === tablesToCheck.length ? 'green' : 'yellow');
  
  if (tablesFound > 0) {
    log('\n🎉 ALGUMAS TABELAS FORAM CRIADAS COM SUCESSO!', 'green');
    log('✅ Sistema parcialmente funcional', 'green');
  } else {
    log('\n❌ Nenhuma tabela foi criada.', 'red');
    log('💡 Recomendação: Execute o SQL manualmente no Supabase Dashboard', 'yellow');
  }
  
  log('\n✨ Execução concluída!', 'blue');
}

// Executar
main().catch(console.error);
