require('dotenv').config();

﻿#!/usr/bin/env node

/**
 * Script Final de Backup do Supabase
 * 
 * Faz backup de todas as tabelas acessíveis via API
 */

import fs from 'fs';
import path from 'path';

const CONFIG = {
  supabaseUrl: 'REMOVED_FOR_SECURITY',
  supabaseKey: 'REMOVED_FOR_SECURITY',
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

      });
    }
  } catch (error) {

  }
}

async function main() {

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

    } else {
      backup.summary.errors.push(`${table}: ${result.error}`);

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

  if (backup.summary.errors.length > 0) {

    backup.summary.errors.forEach(error => );
  }

}

main().catch(error => {

  process.exit(1);
});
