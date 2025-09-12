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
    console.log(`✅ Diretório de backup criado: ${CONFIG.backupDir}`);
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
    console.log(`🔄 ${description}...`);
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log(`✅ ${description} concluído`);
    return output;
  } catch (error) {
    console.error(`❌ Erro em ${description}:`);
    console.error(error.message);
    throw error;
  }
}

// Verificar se pg_dump está disponível
function checkPgDump() {
  try {
    execSync('pg_dump --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    console.error('❌ pg_dump não encontrado!');
    console.error('Instale PostgreSQL client tools ou use Docker:');
    console.error('docker run --rm postgres:15 pg_dump --version');
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
        console.log(`🗑️  Backup antigo removido: ${file.name}`);
      });
    }
  } catch (error) {
    console.warn('⚠️  Erro ao limpar backups antigos:', error.message);
  }
}

// Obter string de conexão do usuário
function getConnectionString() {
  console.log('\n📋 Para fazer backup, você precisa da string de conexão do Supabase.');
  console.log('Encontre em: Dashboard Supabase -> Settings -> Database -> Connection string');
  console.log('Exemplo: postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres');
  console.log('\n⚠️  IMPORTANTE: Use a string com a senha real, não [PASSWORD]');
  
  // Por segurança, vamos usar variável de ambiente se disponível
  const envConnectionString = process.env.SUPABASE_DB_URL;
  
  if (envConnectionString) {
    console.log('✅ String de conexão encontrada na variável SUPABASE_DB_URL');
    return envConnectionString;
  }
  
  console.log('\n💡 Dica: Defina a variável SUPABASE_DB_URL para não precisar digitar sempre');
  console.log('Exemplo: set SUPABASE_DB_URL=postgresql://postgres:...');
  
  return null;
}

// Função principal
async function main() {
  console.log('🚀 Backup Simplificado do Supabase\n');
  
  ensureBackupDir();
  
  // Obter string de conexão
  const connectionString = getConnectionString();
  
  if (!connectionString) {
    console.log('\n❌ String de conexão não fornecida.');
    console.log('Defina a variável SUPABASE_DB_URL ou modifique o script.');
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
      console.log('🐳 Tentando usar Docker...');
      backupFile = backupWithDocker(connectionString, backupType);
    }
    
    // Verificar se o arquivo foi criado e tem conteúdo
    if (fs.existsSync(backupFile)) {
      const stats = fs.statSync(backupFile);
      console.log(`\n✅ Backup criado com sucesso!`);
      console.log(`📁 Arquivo: ${backupFile}`);
      console.log(`📊 Tamanho: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`🕒 Data: ${stats.mtime.toLocaleString('pt-BR')}`);
      
      if (stats.size < 1000) {
        console.log('⚠️  Arquivo muito pequeno - verifique se a string de conexão está correta');
      }
    } else {
      throw new Error('Arquivo de backup não foi criado');
    }
    
    // Limpar backups antigos
    cleanOldBackups();
    
    console.log('\n🎉 Backup concluído com sucesso!');
    
  } catch (error) {
    console.error('\n❌ Erro durante o backup:', error.message);
    console.log('\n💡 Dicas para resolver:');
    console.log('1. Verifique se a string de conexão está correta');
    console.log('2. Confirme se o IP está liberado no Supabase (Settings -> Database -> Network Restrictions)');
    console.log('3. Teste a conexão: psql "sua_string_de_conexao"');
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