#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://shzbgjooydruspqajjkf.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '****************************************************************************************************************************************************************************************************************';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Lista de tabelas esperadas baseada no WARP.md
 */
const expectedTables = [
  'profiles',
  'user_roles', 
  'organizacoes',
  'clinicas',
  'clinica_profissionais',
  'especialidades_medicas',
  'templates_procedimentos',
  'prontuarios',
  'sessoes_atendimento',
  'imagens_medicas',
  'consentimentos_digitais',
  'auditoria_medica',
  'profissionais_especialidades',
  'convites',
  'user_sessions',
  'salas_clinica'
];

/**
 * Testa se uma tabela existe tentando fazer uma query
 */
async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      // Parse do erro para identificar o tipo
      const errorMessage = error.message;
      
      if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
        return { exists: false, reason: 'table_not_found' };
      } else if (errorMessage.includes('permission denied')) {
        return { exists: true, reason: 'no_permission', error: errorMessage };
      } else {
        return { exists: false, reason: 'other_error', error: errorMessage };
      }
    }
    
    return { exists: true, recordCount: data ? data.length : 0 };
    
  } catch (error) {
    return { 
      exists: false, 
      reason: 'network_or_connection_error', 
      error: error.message 
    };
  }
}

/**
 * Audita o esquema remoto
 */
async function auditRemoteSchema() {
  console.log('🔍 Auditando esquema do Supabase remoto...');
  console.log('📍 URL:', supabaseUrl);
  console.log('');
  
  const results = {
    timestamp: new Date().toISOString(),
    supabase_url: supabaseUrl,
    tables: {},
    summary: {
      expected: expectedTables.length,
      existing: 0,
      missing: 0,
      errors: 0
    }
  };
  
  // Testa cada tabela esperada
  for (const tableName of expectedTables) {
    console.log(`📋 Verificando tabela: ${tableName}...`);
    
    const result = await checkTableExists(tableName);
    results.tables[tableName] = result;
    
    if (result.exists) {
      console.log(`  ✅ ${tableName} - EXISTE ${result.recordCount !== undefined ? `(${result.recordCount} registros)` : ''}`);
      results.summary.existing++;
      
      if (result.reason === 'no_permission') {
        console.log(`  ⚠️  Sem permissão para ler dados`);
      }
    } else {
      console.log(`  ❌ ${tableName} - NÃO EXISTE (${result.reason})`);
      results.summary.missing++;
      
      if (result.error) {
        console.log(`     Erro: ${result.error}`);
        results.summary.errors++;
      }
    }
  }
  
  // Resumo final
  console.log('');
  console.log('📊 RESUMO DA AUDITORIA:');
  console.log(`   Total esperado: ${results.summary.expected}`);
  console.log(`   ✅ Existentes: ${results.summary.existing}`);
  console.log(`   ❌ Faltantes: ${results.summary.missing}`);
  console.log(`   ⚠️  Erros: ${results.summary.errors}`);
  
  const percentComplete = (results.summary.existing / results.summary.expected * 100).toFixed(1);
  console.log(`   📈 Progresso: ${percentComplete}%`);
  
  // Salva o resultado em arquivo JSON
  const outputPath = path.join(process.cwd(), 'database-audit-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`   💾 Resultados salvos em: ${outputPath}`);
  
  return results;
}

/**
 * Gera relatório das tabelas faltantes
 */
function generateMissingTablesReport(results) {
  const missingTables = Object.entries(results.tables)
    .filter(([tableName, result]) => !result.exists)
    .map(([tableName]) => tableName);
  
  if (missingTables.length === 0) {
    console.log('');
    console.log('🎉 Todas as tabelas estão presentes no banco remoto!');
    return;
  }
  
  console.log('');
  console.log('🚨 TABELAS FALTANTES:');
  console.log('===================');
  
  missingTables.forEach((tableName, index) => {
    console.log(`${index + 1}. ${tableName}`);
  });
  
  console.log('');
  console.log('💡 PRÓXIMAS AÇÕES RECOMENDADAS:');
  console.log('1. Executar scripts de migração para criar as tabelas faltantes');
  console.log('2. Verificar políticas RLS se algumas tabelas existem mas dão erro de permissão');
  console.log('3. Confirmar se as variáveis de ambiente estão configuradas corretamente');
}

// Executa a auditoria
console.log('🚀 Iniciando auditoria do banco de dados...');
console.log('');

auditRemoteSchema()
  .then(results => {
    generateMissingTablesReport(results);
    
    if (results.summary.missing > 0) {
      console.log('');
      console.log('❌ Auditoria concluída com tabelas faltantes.');
      process.exit(1);
    } else {
      console.log('');
      console.log('✅ Auditoria concluída com sucesso!');
      process.exit(0);
    }
  })
  .catch(error => {
    console.error('');
    console.error('💥 Erro durante a auditoria:', error.message);
    process.exit(1);
  });