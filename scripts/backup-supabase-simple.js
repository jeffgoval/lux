#!/usr/bin/env node

/**
 * Script Simplificado de Backup do Supabase
 * 
 * Este script faz backup usando pg_dump diretamente
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
  maxBackups: 10,
  // String de conexão do Supabase (você precisa pegar no dashboard)
  // Settings -> Database -> Connection string
  connectionString: null // Será solicitado ao usuário
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

// Verificar se pg_dump está disponível
function checkPgDump() {
  try {
    execSync('pg_dump --version', { stdio: 'pipe' });
    return true;
  } catch (error) {

    return false;
  }
}

// Fazer backup usando pg_dump
function backupWithPgDump(connectionString, type = 'full') {
  const filename = generateBackupFilename(type);
  const filepath = path.join(CONFIG.backupDir, filename);
  
  let command;
  
  switch (type) {
    case 'schema':
      command = `pg_dump "${connectionString}" --schema-only > "${filepath}"`;
      break;
    case 'data':
      command = `pg_dump "${connectionString}" --data-only > "${filepath}"`;
      break;
    case 'full':
    default:
      command = `pg_dump "${connectionString}" > "${filepath}"`;
      break;
  }
  
  runCommand(command, `Backup ${type}`);
  return filepath;
}

// Fazer backup usando Docker (se pg_dump não estiver disponível)
function backupWithDocker(connectionString, type = 'full') {
  const filename = generateBackupFilename(type);
  const filepath = path.join(CONFIG.backupDir, filename);
  
  let pgDumpArgs;
  
  switch (type) {
    case 'schema':
      pgDumpArgs = '--schema-only';
      break;
    case 'data':
      pgDumpArgs = '--data-only';
      break;
    case 'full':
    default:
      pgDumpArgs = '';
      break;
  }
  
  const command = `docker run --rm postgres:15 pg_dump "${connectionString}" ${pgDumpArgs} > "${filepath}"`;
  
  runCommand(command, `Backup ${type} (via Docker)`);
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

// Obter string de conexão do usuário
function getConnectionString() {

  // Por segurança, vamos usar variável de ambiente se disponível
  const envConnectionString = process.env.SUPABASE_DB_URL;
  
  if (envConnectionString) {

    return envConnectionString;
  }

  return null;
}

// Função principal
async function main() {

  ensureBackupDir();
  
  // Obter string de conexão
  const connectionString = getConnectionString();
  
  if (!connectionString) {

    process.exit(1);
  }
  
  // Verificar argumentos da linha de comando
  const args = process.argv.slice(2);
  const backupType = args[0] || 'full';
  
  try {
    let backupFile;
    
    // Tentar pg_dump primeiro, depois Docker
    if (checkPgDump()) {
      backupFile = backupWithPgDump(connectionString, backupType);
    } else {

      backupFile = backupWithDocker(connectionString, backupType);
    }
    
    // Verificar se o arquivo foi criado e tem conteúdo
    if (fs.existsSync(backupFile)) {
      const stats = fs.statSync(backupFile);

      if (stats.size < 1000) {

      }
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
  backupWithPgDump,
  backupWithDocker,
  cleanOldBackups
};
