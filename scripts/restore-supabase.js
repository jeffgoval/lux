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
    console.error('❌ Erro ao listar backups:', error.message);
    return [];
  }
}

// Mostrar backups disponíveis
function displayBackups(backups) {
  console.log('\n📋 Backups disponíveis:\n');
  
  if (backups.length === 0) {
    console.log('❌ Nenhum backup encontrado no diretório:', CONFIG.backupDir);
    return;
  }
  
  backups.forEach((backup, index) => {
    const sizeMB = (backup.size / 1024 / 1024).toFixed(2);
    const dateStr = backup.date.toLocaleString('pt-BR');
    
    console.log(`${index + 1}. ${backup.name}`);
    console.log(`   📊 Tipo: ${backup.type} | Tamanho: ${sizeMB} MB`);
    console.log(`   🕒 Data: ${dateStr}`);
    console.log('');
  });
}

// Executar comando com confirmação
async function runCommand(command, description, requireConfirmation = true) {
  try {
    console.log(`\n🔄 ${description}...`);
    
    if (requireConfirmation) {
      const confirm = await askQuestion('⚠️  Esta operação irá SUBSTITUIR os dados atuais. Continuar? (sim/não): ');
      if (confirm.toLowerCase() !== 'sim' && confirm.toLowerCase() !== 's') {
        console.log('❌ Operação cancelada pelo usuário.');
        return false;
      }
    }
    
    console.log('🔄 Executando restauração...');
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    console.log(`✅ ${description} concluído`);
    return true;
    
  } catch (error) {
    console.error(`❌ Erro em ${description}:`);
    console.error(error.message);
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
  console.log('\n⚠️  ATENÇÃO: Você está restaurando em PRODUÇÃO!');
  console.log('Esta operação irá SUBSTITUIR TODOS os dados do banco de produção.');
  
  const confirm = await askQuestion('Digite "CONFIRMO" para continuar: ');
  if (confirm !== 'CONFIRMO') {
    console.log('❌ Operação cancelada.');
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
    console.log('🔍 Verificando integridade do backup...');
    
    const content = fs.readFileSync(backupFile, 'utf8');
    
    // Verificações básicas
    const checks = {
      hasContent: content.length > 0,
      hasSqlCommands: content.includes('CREATE') || content.includes('INSERT'),
      hasValidStructure: content.includes('--') || content.includes('/*'),
      fileSize: fs.statSync(backupFile).size
    };
    
    if (!checks.hasContent) {
      console.log('❌ Arquivo de backup está vazio');
      return false;
    }
    
    if (!checks.hasSqlCommands) {
      console.log('❌ Arquivo não parece conter comandos SQL válidos');
      return false;
    }
    
    if (checks.fileSize < 100) {
      console.log('❌ Arquivo muito pequeno, pode estar corrompido');
      return false;
    }
    
    console.log('✅ Backup parece válido');
    console.log(`📊 Tamanho: ${(checks.fileSize / 1024 / 1024).toFixed(2)} MB`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao verificar backup:', error.message);
    return false;
  }
}

// Função principal
async function main() {
  console.log('🔄 Script de Restauração do Supabase\n');
  
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
      console.log('👋 Saindo...');
      rl.close();
      return;
    }
    
    const backupIndex = parseInt(selection) - 1;
    
    if (backupIndex < 0 || backupIndex >= backups.length) {
      console.log('❌ Seleção inválida');
      rl.close();
      return;
    }
    
    const selectedBackup = backups[backupIndex];
    console.log(`\n📁 Backup selecionado: ${selectedBackup.name}`);
    
    // Verificar integridade
    if (!verifyBackup(selectedBackup.path)) {
      rl.close();
      return;
    }
    
    // Escolher ambiente
    console.log('\n🎯 Selecione o ambiente de destino:');
    console.log('1. Local (desenvolvimento)');
    console.log('2. Produção (requer string de conexão)');
    
    const envChoice = await askQuestion('Escolha (1 ou 2): ');
    
    let success = false;
    
    if (envChoice === '1') {
      // Restauração local
      success = await restoreWithSupabaseCLI(selectedBackup.path);
      
    } else if (envChoice === '2') {
      // Restauração em produção
      const connectionString = await askQuestion('Cole a string de conexão do banco de produção: ');
      
      if (!connectionString.trim()) {
        console.log('❌ String de conexão é obrigatória');
        rl.close();
        return;
      }
      
      success = await restoreWithPsql(selectedBackup.path, connectionString);
      
    } else {
      console.log('❌ Opção inválida');
      rl.close();
      return;
    }
    
    if (success) {
      console.log('\n🎉 Restauração concluída com sucesso!');
      console.log('💡 Verifique se todos os dados foram restaurados corretamente.');
    } else {
      console.log('\n❌ Falha na restauração. Verifique os logs de erro acima.');
    }
    
  } catch (error) {
    console.error('\n❌ Erro durante a restauração:', error.message);
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