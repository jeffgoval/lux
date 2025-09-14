#!/usr/bin/env node

/**
 * Script de Restauração do Supabase
 * 
 * Este script restaura backups do banco de dados Supabase
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const CONFIG = {
  projectId: 'dvnyfwpphuuujhodqkko',
  backupDir: './backups',
};

// Interface para input do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para fazer pergunta ao usuário
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Listar backups disponíveis
function listAvailableBackups() {
  try {
    const files = fs.readdirSync(CONFIG.backupDir)
      .filter(file => file.startsWith('backup_') && file.endsWith('.sql'))
      .map(file => {
        const filepath = path.join(CONFIG.backupDir, file);
        const stats = fs.statSync(filepath);
        return {
          name: file,
          path: filepath,
          size: stats.size,
          date: stats.mtime,
          type: file.includes('_full_') ? 'Completo' : 
                file.includes('_schema_') ? 'Schema' : 
                file.includes('_data_') ? 'Dados' : 'Desconhecido'
        };
      })
      .sort((a, b) => b.date - a.date);

    return files;
  } catch (error) {

    return [];
  }
}

// Mostrar backups disponíveis
function displayBackups(backups) {

  if (backups.length === 0) {

    return;
  }
  
  backups.forEach((backup, index) => {
    const sizeMB = (backup.size / 1024 / 1024).toFixed(2);
    const dateStr = backup.date.toLocaleString('pt-BR');

  });
}

// Executar comando com confirmação
async function runCommand(command, description, requireConfirmation = true) {
  try {

    if (requireConfirmation) {
      const confirm = await askQuestion('⚠️  Esta operação irá SUBSTITUIR os dados atuais. Continuar? (sim/não): ');
      if (confirm.toLowerCase() !== 'sim' && confirm.toLowerCase() !== 's') {

        return false;
      }
    }

    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    return true;
    
  } catch (error) {

    return false;
  }
}

// Restaurar backup via Supabase CLI
async function restoreWithSupabaseCLI(backupFile) {
  // Primeiro, fazer reset do banco local
  const resetSuccess = await runCommand(
    'supabase db reset',
    'Reset do banco de dados local',
    true
  );
  
  if (!resetSuccess) {
    return false;
  }
  
  // Aplicar o backup
  const restoreCommand = `supabase db reset --db-url "postgresql://postgres:postgres@localhost:54322/postgres" < "${backupFile}"`;
  
  return await runCommand(
    restoreCommand,
    'Aplicação do backup',
    false
  );
}

// Restaurar backup via psql (para produção)
async function restoreWithPsql(backupFile, connectionString) {

  const confirm = await askQuestion('Digite "CONFIRMO" para continuar: ');
  if (confirm !== 'CONFIRMO') {

    return false;
  }
  
  const restoreCommand = `psql "${connectionString}" < "${backupFile}"`;
  
  return await runCommand(
    restoreCommand,
    'Restauração em produção',
    false
  );
}

// Verificar integridade do backup
function verifyBackup(backupFile) {
  try {

    const content = fs.readFileSync(backupFile, 'utf8');
    
    // Verificações básicas
    const checks = {
      hasContent: content.length > 0,
      hasSqlCommands: content.includes('CREATE') || content.includes('INSERT'),
      hasValidStructure: content.includes('--') || content.includes('/*'),
      fileSize: fs.statSync(backupFile).size
    };
    
    if (!checks.hasContent) {

      return false;
    }
    
    if (!checks.hasSqlCommands) {

      return false;
    }
    
    if (checks.fileSize < 100) {

      return false;
    }

    return true;
    
  } catch (error) {

    return false;
  }
}

// Função principal
async function main() {

  try {
    // Listar backups disponíveis
    const backups = listAvailableBackups();
    displayBackups(backups);
    
    if (backups.length === 0) {
      rl.close();
      return;
    }
    
    // Selecionar backup
    const selection = await askQuestion('Selecione o número do backup para restaurar (ou "q" para sair): ');
    
    if (selection.toLowerCase() === 'q') {

      rl.close();
      return;
    }
    
    const backupIndex = parseInt(selection) - 1;
    
    if (backupIndex < 0 || backupIndex >= backups.length) {

      rl.close();
      return;
    }
    
    const selectedBackup = backups[backupIndex];

    // Verificar integridade
    if (!verifyBackup(selectedBackup.path)) {
      rl.close();
      return;
    }
    
    // Escolher ambiente

    const envChoice = await askQuestion('Escolha (1 ou 2): ');
    
    let success = false;
    
    if (envChoice === '1') {
      // Restauração local
      success = await restoreWithSupabaseCLI(selectedBackup.path);
      
    } else if (envChoice === '2') {
      // Restauração em produção
      const connectionString = await askQuestion('Cole a string de conexão do banco de produção: ');
      
      if (!connectionString.trim()) {

        rl.close();
        return;
      }
      
      success = await restoreWithPsql(selectedBackup.path, connectionString);
      
    } else {

      rl.close();
      return;
    }
    
    if (success) {

    } else {

    }
    
  } catch (error) {

  } finally {
    rl.close();
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  listAvailableBackups,
  verifyBackup,
  restoreWithSupabaseCLI,
  restoreWithPsql
};
