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

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Configurações do Supabase (do seu .env)
const CONFIG = {
  supabaseUrl: process.env.VITE_SUPABASE_URL,
  supabaseKey: process.env.VITE_SUPABASE_ANON_KEY,
  backupDir: './backups',
  maxBackups: 10
};

if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

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

    return data;
    
  } catch (error) {

    return null;
  }
}

// Fazer backup de todas as tabelas
async function backupAllTables() {

  const backup = {
    timestamp: new Date().toISOString(),
    supabaseUrl: CONFIG.supabaseUrl,
    tables: {}
  };

  let totalRecords = 0;

  for (const table of TABLES_TO_BACKUP) {

    const data = await fetchFromSupabase(table);
    
    if (data !== null) {
      backup.tables[table] = data;
      totalRecords += data.length;
    } else {
      backup.tables[table] = [];

    }
  }

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

    return filepath;
    
  } catch (error) {

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

      });
    }
  } catch (error) {

  }
}

// Testar conectividade com Supabase
async function testConnection() {
  try {

    const response = await fetch(`${CONFIG.supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': CONFIG.supabaseKey,
        'Authorization': `Bearer ${CONFIG.supabaseKey}`
      }
    });

    if (response.ok) {

      return true;
    } else {

      return false;
    }
    
  } catch (error) {

    return false;
  }
}

// Função principal
async function main() {

  ensureBackupDir();
  
  // Testar conexão

  const connected = await testConnection();
  if (!connected) {

    process.exit(1);
  }
  
  try {
    // Fazer backup
    const backup = await backupAllTables();
    
    // Salvar arquivo
    const backupFile = saveBackup(backup);
    
    // Limpar backups antigos
    cleanOldBackups();

  } catch (error) {

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
