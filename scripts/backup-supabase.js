#!/usr/bin/env node

/**
 * Script Automatizado de Backup do Supabase
 * 
 * Este script faz backup automático do banco de dados Supabase
 * Suporta backup completo, apenas schema ou apenas dados
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const CONFIG = {
  projectId: 'dvnyfwpphuuujhodqkko',
  backupDir: './backups',
  maxBackups: 10, // Manter apenas os 10 backups mais recentes
};

// Criar diretório de backup se não existir
function ensureBackupDir() {
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });

  }
}

// Gerar nome do arquivo com timestamp
function generateBackupFilename(type = 'full') {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .split('.')[0];
  
  return `backup_${type}_${timestamp}.sql`;
}

// Executar comando e capturar saída
function runCommand(command, description) {
  try {

    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    return output;
  } catch (error) {

    throw error;
  }
}

// Verificar se Supabase CLI está instalado
function checkSupabaseCLI() {
  try {
    execSync('supabase --version', { stdio: 'pipe' });
    return true;
  } catch (error) {

    return false;
  }
}

// Fazer backup completo
function backupFull() {
  const filename = generateBackupFilename('full');
  const filepath = path.join(CONFIG.backupDir, filename);
  
  const command = `supabase db dump --file "${filepath}"`;
  runCommand(command, 'Backup completo (schema + dados)');
  
  return filepath;
}

// Fazer backup apenas do schema
function backupSchema() {
  const filename = generateBackupFilename('schema');
  const filepath = path.join(CONFIG.backupDir, filename);
  
  const command = `supabase db dump --schema-only --file "${filepath}"`;
  runCommand(command, 'Backup do schema');
  
  return filepath;
}

// Fazer backup apenas dos dados
function backupData() {
  const filename = generateBackupFilename('data');
  const filepath = path.join(CONFIG.backupDir, filename);
  
  const command = `supabase db dump --data-only --file "${filepath}"`;
  runCommand(command, 'Backup dos dados');
  
  return filepath;
}

// Limpar backups antigos
function cleanOldBackups() {
  try {
    const files = fs.readdirSync(CONFIG.backupDir)
      .filter(file => file.startsWith('backup_') && file.endsWith('.sql'))
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

// Verificar se está linkado ao projeto
function checkProjectLink() {
  try {
    const output = execSync('supabase status', { encoding: 'utf8', stdio: 'pipe' });
    if (output.includes('Local development setup is running')) {
      return true;
    }
  } catch (error) {
    // Tentar linkar ao projeto
    try {

      execSync(`supabase link --project-ref ${CONFIG.projectId}`, { stdio: 'inherit' });
      return true;
    } catch (linkError) {

      return false;
    }
  }
  return false;
}

// Função principal
async function main() {

  // Verificações iniciais
  if (!checkSupabaseCLI()) {
    process.exit(1);
  }
  
  ensureBackupDir();
  
  // Verificar argumentos da linha de comando
  const args = process.argv.slice(2);
  const backupType = args[0] || 'full';
  
  try {
    let backupFile;
    
    switch (backupType.toLowerCase()) {
      case 'schema':
        backupFile = backupSchema();
        break;
      case 'data':
        backupFile = backupData();
        break;
      case 'full':
      default:
        backupFile = backupFull();
        break;
    }
    
    // Verificar se o arquivo foi criado e tem conteúdo
    if (fs.existsSync(backupFile)) {
      const stats = fs.statSync(backupFile);

    } else {
      throw new Error('Arquivo de backup não foi criado');
    }
    
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
  backupFull,
  backupSchema,
  backupData,
  cleanOldBackups
};
