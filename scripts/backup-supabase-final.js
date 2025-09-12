#!/usr/bin/env node

/**
 * Script Final de Backup do Supabase
 * 
 * Faz backup de todas as tabelas acessíveis via API
 */

console.log('🚀 Backup Automático do Supabase');

import fs from 'fs';
import path from 'path';

const CONFIG = {
  supabaseUrl: 'https://dvnyfwpphuuujhodqkko.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk',
  backupDir: './backups',
  maxBackups: 10
};

// Lista de tabelas conhecidas para tentar
const KNOWN_TABLES = [
  'profiles',
  'user_roles', 
  'organizations',
  'clinics',
  'clinic_professionals',
  'roles',
  'appointments',
  'patients',
  'medical_records',
  'procedures',
  'procedure_templates',
  'inventory_items',
  'equipment',
  'audit_logs',
  'storage_objects'
];

async function fetchTable(table) {
  try {
    const response = await fetch(`${CONFIG.supabaseUrl}/rest/v1/${table}?select=*`, {
      headers: {
        'apikey': CONFIG.supabaseKey,
        'Authorization': `Bearer ${CONFIG.supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return { table, data, success: true, count: data.length };
    } else {
      return { table, data: [], success: false, error: response.status };
    }
    
  } catch (error) {
    return { table, data: [], success: false, error: error.message };
  }
}

function ensureBackupDir() {
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
    console.log('✅ Diretório de backup criado');
  }
}

function cleanOldBackups() {
  try {
    const files = fs.readdirSync(CONFIG.backupDir)
      .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(CONFIG.backupDir, file),
        stats: fs.statSync(path.join(CONFIG.backupDir, file))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime);

    if (files.length > CONFIG.maxBackups) {
      const filesToDelete = files.slice(CONFIG.maxBackups);
      
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`🗑️  Removido: ${file.name}`);
      });
    }
  } catch (error) {
    console.warn('⚠️  Erro ao limpar backups:', error.message);
  }
}

async function main() {
  console.log('📋 Iniciando backup das tabelas...\n');
  
  ensureBackupDir();
  
  const backup = {
    timestamp: new Date().toISOString(),
    supabaseUrl: CONFIG.supabaseUrl,
    tables: {},
    summary: {
      totalTables: 0,
      successfulTables: 0,
      totalRecords: 0,
      errors: []
    }
  };
  
  // Testar cada tabela
  for (const table of KNOWN_TABLES) {
    process.stdout.write(`🔄 ${table}... `);
    
    const result = await fetchTable(table);
    backup.tables[table] = result;
    backup.summary.totalTables++;
    
    if (result.success) {
      backup.summary.successfulTables++;
      backup.summary.totalRecords += result.count;
      console.log(`✅ ${result.count} registros`);
    } else {
      backup.summary.errors.push(`${table}: ${result.error}`);
      console.log(`❌ Erro ${result.error}`);
    }
  }
  
  // Salvar backup
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .split('.')[0];
  
  const filename = `backup_${timestamp}.json`;
  const filepath = path.join(CONFIG.backupDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
  
  const stats = fs.statSync(filepath);
  
  // Limpar backups antigos
  cleanOldBackups();
  
  // Relatório final
  console.log(`\n🎉 Backup concluído!`);
  console.log(`📁 Arquivo: ${filename}`);
  console.log(`📊 Resumo:`);
  console.log(`   - Tabelas testadas: ${backup.summary.totalTables}`);
  console.log(`   - Tabelas com sucesso: ${backup.summary.successfulTables}`);
  console.log(`   - Total de registros: ${backup.summary.totalRecords}`);
  console.log(`   - Tamanho do arquivo: ${(stats.size / 1024).toFixed(2)} KB`);
  
  if (backup.summary.errors.length > 0) {
    console.log(`\n⚠️  Tabelas não encontradas ou sem acesso:`);
    backup.summary.errors.forEach(error => console.log(`   - ${error}`));
  }
  
  console.log(`\n💡 Para restaurar: use o arquivo JSON ou importe via Supabase Dashboard`);
}

main().catch(error => {
  console.error('\n❌ Erro durante o backup:', error.message);
  process.exit(1);
});