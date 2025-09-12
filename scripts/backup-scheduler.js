#!/usr/bin/env node

/**
 * Agendador de Backups Automáticos do Supabase
 * 
 * Este script agenda backups automáticos em intervalos regulares
 */

import cron from 'node-cron';
import { backupFull, backupSchema } from './backup-supabase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações do agendamento
const SCHEDULE_CONFIG = {
  // Backup completo diário às 2:00 AM
  dailyFull: '0 2 * * *',
  
  // Backup de schema a cada 6 horas
  schemaBackup: '0 */6 * * *',
  
  // Backup rápido a cada hora (apenas dados críticos)
  hourlyData: '0 * * * *'
};

// Log das operações
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(logMessage);
  
  // Salvar em arquivo de log
  const logFile = path.join('./logs', 'backup-scheduler.log');
  
  // Criar diretório de logs se não existir
  const logDir = path.dirname(logFile);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  fs.appendFileSync(logFile, logMessage + '\n');
}

// Executar backup com tratamento de erro
async function executeBackup(type, description) {
  try {
    log(`Iniciando ${description}...`);
    
    let result;
    switch (type) {
      case 'full':
        result = await backupFull();
        break;
      case 'schema':
        result = await backupSchema();
        break;
      default:
        throw new Error(`Tipo de backup inválido: ${type}`);
    }
    
    log(`${description} concluído com sucesso: ${result}`);
    return result;
    
  } catch (error) {
    log(`Erro em ${description}: ${error.message}`);
    
    // Enviar notificação de erro (implementar conforme necessário)
    await notifyError(description, error);
    
    throw error;
  }
}

// Notificar erro (implementar conforme sua necessidade)
async function notifyError(operation, error) {
  // Aqui você pode implementar notificações por:
  // - Email
  // - Slack
  // - Discord
  // - Webhook
  
  log(`ERRO CRÍTICO em ${operation}: ${error.message}`);
  
  // Exemplo de webhook (descomente e configure conforme necessário)
  /*
  try {
    const webhook = 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL';
    const payload = {
      text: `🚨 Erro no backup do Supabase: ${operation}`,
      attachments: [{
        color: 'danger',
        fields: [{
          title: 'Erro',
          value: error.message,
          short: false
        }]
      }]
    };
    
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (notifyError) {
    log(`Erro ao enviar notificação: ${notifyError.message}`);
  }
  */
}

// Verificar saúde do sistema
function healthCheck() {
  const checks = {
    diskSpace: checkDiskSpace(),
    supabaseCLI: checkSupabaseCLI(),
    networkConnection: checkNetworkConnection()
  };
  
  const allHealthy = Object.values(checks).every(check => check.healthy);
  
  if (!allHealthy) {
    const issues = Object.entries(checks)
      .filter(([_, check]) => !check.healthy)
      .map(([name, check]) => `${name}: ${check.message}`)
      .join(', ');
    
    log(`⚠️  Problemas de saúde detectados: ${issues}`);
  }
  
  return allHealthy;
}

function checkDiskSpace() {
  try {
    const stats = fs.statSync('./backups');
    // Verificação básica - implementar verificação real de espaço em disco
    return { healthy: true, message: 'OK' };
  } catch (error) {
    return { healthy: false, message: 'Diretório de backup inacessível' };
  }
}

function checkSupabaseCLI() {
  try {
    execSync('supabase --version', { stdio: 'pipe' });
    return { healthy: true, message: 'OK' };
  } catch (error) {
    return { healthy: false, message: 'Supabase CLI não encontrado' };
  }
}

function checkNetworkConnection() {
  // Implementar verificação de conectividade com Supabase
  return { healthy: true, message: 'OK' };
}

// Configurar agendamentos
function setupSchedules() {
  log('🕐 Configurando agendamentos de backup...');
  
  // Backup completo diário
  cron.schedule(SCHEDULE_CONFIG.dailyFull, async () => {
    if (healthCheck()) {
      await executeBackup('full', 'Backup completo diário');
    }
  }, {
    scheduled: true,
    timezone: "America/Sao_Paulo"
  });
  
  // Backup de schema a cada 6 horas
  cron.schedule(SCHEDULE_CONFIG.schemaBackup, async () => {
    if (healthCheck()) {
      await executeBackup('schema', 'Backup de schema (6h)');
    }
  }, {
    scheduled: true,
    timezone: "America/Sao_Paulo"
  });
  
  log('✅ Agendamentos configurados:');
  log(`   - Backup completo diário: ${SCHEDULE_CONFIG.dailyFull}`);
  log(`   - Backup de schema: ${SCHEDULE_CONFIG.schemaBackup}`);
}

// Função principal
function main() {
  log('🚀 Iniciando agendador de backups do Supabase...');
  
  // Verificar saúde inicial
  if (!healthCheck()) {
    log('❌ Verificação de saúde falhou. Verifique os problemas antes de continuar.');
    process.exit(1);
  }
  
  // Configurar agendamentos
  setupSchedules();
  
  log('✅ Agendador de backups ativo. Pressione Ctrl+C para parar.');
  
  // Manter o processo rodando
  process.on('SIGINT', () => {
    log('🛑 Parando agendador de backups...');
    process.exit(0);
  });
  
  // Verificação de saúde a cada hora
  setInterval(() => {
    healthCheck();
  }, 60 * 60 * 1000);
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  setupSchedules,
  executeBackup,
  healthCheck
};