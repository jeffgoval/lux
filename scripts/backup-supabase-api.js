#!/usr/bin/env node

/**
 * Script de Backup via API do Supabase
 * 
 * Este script faz backup das tabelas usando a API REST do Supabase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações do Supabase (do seu .env)
const CONFIG = {
  supabaseUrl: 'https://dvnyfwpphuuujhodqkko.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk',
  backupDir: './backups',
  maxBackups: 10
};

// Tabelas principais para backup
const TABLES_TO_BACKUP = [
  'profiles',
  'organizations', 
  'clinics',
  'clinic_professionals',
  'user_roles',
  'roles',
  'appointments',
  'patients',
  'medical_records',
  'procedures',
  'procedure_templates',
  'inventory_items',
  'equipment',
  'audit_logs'
];

// Criar diretório de backup se não existir
function ensureBackupDir() {
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
    console.log(`✅ Diretório de backup criado: ${CONFIG.backupDir}`);
  }
}

// Gerar nome do arquivo com timestamp
function generateBackupFilename() {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .split('.')[0];
  
  return `backup_api_${timestamp}.json`;
}

// Fazer requisição para a API do Supabase
async function fetchFromSupabase(table) {
  try {
    const response = await fetch(`${CONFIG.supabaseUrl}/rest/v1/${table}?select=*`, {
      headers: {
        'apikey': CONFIG.supabaseKey,
        'Authorization': `Bearer ${CONFIG.supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ ${table}: ${data.length} registros`);
    return data;
    
  } catch (error) {
    console.error(`❌ Erro ao buscar ${table}:`, error.message);
    return null;
  }
}

// Fazer backup de todas as tabelas
async function backupAllTables() {
  console.log('🔄 Iniciando backup das tabelas...\n');
  
  const backup = {
    timestamp: new Date().toISOString(),
    supabaseUrl: CONFIG.supabaseUrl,
    tables: {}
  };

  let totalRecords = 0;

  for (const table of TABLES_TO_BACKUP) {
    console.log(`🔄 Fazendo backup da tabela: ${table}`);
    
    const data = await fetchFromSupabase(table);
    
    if (data !== null) {
      backup.tables[table] = data;
      totalRecords += data.length;
    } else {
      backup.tables[table] = [];
      console.log(`⚠️  Tabela ${table} não encontrada ou sem acesso`);
    }
  }

  console.log(`\n📊 Total de registros: ${totalRecords}`);
  return backup;
}

// Salvar backup em arquivo
function saveBackup(backup) {
  const filename = generateBackupFilename();
  const filepath = path.join(CONFIG.backupDir, filename);
  
  try {
    const jsonData = JSON.stringify(backup, null, 2);
    fs.writeFileSync(filepath, jsonData, 'utf8');
    
    const stats = fs.statSync(filepath);
    console.log(`\n✅ Backup salvo com sucesso!`);
    console.log(`📁 Arquivo: ${filepath}`);
    console.log(`📊 Tamanho: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🕒 Data: ${stats.mtime.toLocaleString('pt-BR')}`);
    
    return filepath;
    
  } catch (error) {
    console.error('❌ Erro ao salvar backup:', error.message);
    throw error;
  }
}

// Limpar backups antigos
function cleanOldBackups() {
  try {
    const files = fs.readdirSync(CONFIG.backupDir)
      .filter(file => file.startsWith('backup_api_') && file.endsWith('.json'))
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
        console.log(`🗑️  Backup antigo removido: ${file.name}`);
      });
    }
  } catch (error) {
    console.warn('⚠️  Erro ao limpar backups antigos:', error.message);
  }
}

// Testar conectividade com Supabase
async function testConnection() {
  try {
    console.log('🔍 Testando conexão com Supabase...');
    
    const response = await fetch(`${CONFIG.supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': CONFIG.supabaseKey,
        'Authorization': `Bearer ${CONFIG.supabaseKey}`
      }
    });

    if (response.ok) {
      console.log('✅ Conexão com Supabase OK');
      return true;
    } else {
      console.error('❌ Erro na conexão:', response.status, response.statusText);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar conexão:', error.message);
    return false;
  }
}

// Função principal
async function main() {
  console.log('🚀 Backup via API do Supabase\n');
  
  ensureBackupDir();
  
  // Testar conexão
  console.log('🔍 Testando conexão com Supabase...');
  const connected = await testConnection();
  if (!connected) {
    console.log('\n❌ Não foi possível conectar ao Supabase.');
    console.log('Verifique as configurações no script.');
    process.exit(1);
  }
  
  try {
    // Fazer backup
    const backup = await backupAllTables();
    
    // Salvar arquivo
    const backupFile = saveBackup(backup);
    
    // Limpar backups antigos
    cleanOldBackups();
    
    console.log('\n🎉 Backup concluído com sucesso!');
    console.log('\n💡 Este backup contém apenas os dados das tabelas.');
    console.log('Para backup completo (schema + dados), use o script backup-supabase-simple.js');
    
  } catch (error) {
    console.error('\n❌ Erro durante o backup:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  backupAllTables,
  saveBackup,
  cleanOldBackups,
  testConnection
};