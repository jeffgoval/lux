#!/usr/bin/env node

/**
 * Agendador Simples de Backup
 * 
 * Executa backup em intervalos regulares
 */

console.log('⏰ Agendador de Backup do Supabase');

import { execSync } from 'child_process';
import fs from 'fs';

// Configurações
const SCHEDULE = {
  intervalMinutes: 60, // Backup a cada 60 minutos
  maxBackups: 24 // Manter 24 backups (1 dia se executar de hora em hora)
};

function log(message) {
  const timestamp = new Date().toLocaleString('pt-BR');
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  
  // Salvar em arquivo de log
  const logFile = './logs/backup-scheduler.log';
  
  // Criar diretório de logs se não existir
  if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs', { recursive: true });
  }
  
  fs.appendFileSync(logFile, logMessage + '\n');
}

async function executeBackup() {
  try {
    log('Iniciando backup automático...');
    
    const output = execSync('node scripts/backup-supabase-final.js', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    log('Backup concluído com sucesso');
    return true;
    
  } catch (error) {
    log(`Erro no backup: ${error.message}`);
    return false;
  }
}

function startScheduler() {
  log(`Agendador iniciado - backup a cada ${SCHEDULE.intervalMinutes} minutos`);
  
  // Executar backup imediatamente
  executeBackup();
  
  // Agendar próximos backups
  setInterval(async () => {
    await executeBackup();
  }, SCHEDULE.intervalMinutes * 60 * 1000);
  
  // Manter o processo rodando
  process.on('SIGINT', () => {
    log('Parando agendador de backups...');
    process.exit(0);
  });
  
  log('Pressione Ctrl+C para parar o agendador');
}

// Verificar argumentos
const args = process.argv.slice(2);

if (args.includes('--once')) {
  // Executar apenas uma vez
  log('Executando backup único...');
  executeBackup().then(() => {
    log('Backup único concluído');
    process.exit(0);
  });
} else {
  // Executar continuamente
  startScheduler();
}