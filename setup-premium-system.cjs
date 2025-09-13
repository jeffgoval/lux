#!/usr/bin/env node

/**
 * Script para configurar o sistema premium de métricas e alertas
 * 
 * Este script:
 * 1. Configura o banco de dados Supabase
 * 2. Atualiza os componentes para usar dados reais
 * 3. Configura as notificações
 */

const fs = require('fs');
const path = require('path');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`${colors.bright}${colors.blue}[${step}]${colors.reset} ${message}`);
}

function logSuccess(message) {
  log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logWarning(message) {
  log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function logError(message) {
  log(`${colors.red}❌ ${message}${colors.reset}`);
}

// Verificar arquivos necessários
function checkFiles() {
  const requiredFiles = [
    '.env',
    'src/lib/supabase.ts',
    'src/hooks/useMetricsReal.ts',
    'src/lib/notifications.ts',
    'scripts/setup-database.js'
  ];

  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    logError('Arquivos necessários não encontrados:');
    missingFiles.forEach(file => log(`  - ${file}`, colors.red));
    return false;
  }

  logSuccess('Todos os arquivos necessários encontrados');
  return true;
}

// Verificar variáveis de ambiente
function checkEnvironment() {
  const envContent = fs.readFileSync('.env', 'utf8');
  
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];

  const missingVars = requiredVars.filter(varName => 
    !envContent.includes(varName) || envContent.match(new RegExp(`${varName}=\\s*$`, 'm'))
  );

  if (missingVars.length > 0) {
    logError('Variáveis de ambiente obrigatórias não encontradas ou vazias:');
    missingVars.forEach(varName => log(`  - ${varName}`, colors.red));
    return false;
  }

  logSuccess('Variáveis de ambiente configuradas');
  return true;
}

// Atualizar componentes para usar dados reais
function updateComponents() {
  const updates = [
    {
      file: 'src/pages/DashboardExecutivo.tsx',
      search: "import { useMetricsMock as useMetrics } from '@/hooks/useMetricsMock';",
      replace: "import { useMetrics } from '@/hooks/useMetricsReal';"
    },
    {
      file: 'src/pages/AlertsDashboard.tsx', 
      search: "import { IntelligentAlertsEngineMock } from '@/lib/IntelligentAlertsEngineMock';",
      replace: "import { useMetrics } from '@/hooks/useMetricsReal';"
    }
  ];

  let updatedFiles = 0;

  updates.forEach(update => {
    if (fs.existsSync(update.file)) {
      try {
        let content = fs.readFileSync(update.file, 'utf8');
        
        if (content.includes(update.search)) {
          content = content.replace(update.search, update.replace);
          fs.writeFileSync(update.file, content, 'utf8');
          updatedFiles++;
          logSuccess(`Atualizado: ${update.file}`);
        }
      } catch (error) {
        logWarning(`Erro ao atualizar ${update.file}: ${error.message}`);
      }
    }
  });

  return updatedFiles > 0;
}

// Criar service worker para notificações
function createServiceWorker() {
  const swContent = `
// Service Worker para notificações push
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'view') {
    // Abrir URL específica
    const urlToOpen = event.notification.data.url || '/dashboard';
    
    event.waitUntil(
      clients.matchAll().then(function(clientList) {
        for (let i = 0; i < clientList.length; i++) {
          let client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  } else if (event.action === 'acknowledge') {
    // Reconhecer alerta via API
    const alertId = event.notification.data.alertId;
    if (alertId) {
      fetch('/api/alerts/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId })
      });
    }
  }
});

self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'Nova notificação',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: true
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'LuxeFlow', options)
  );
});
`;

  try {
    fs.writeFileSync('public/sw.js', swContent.trim(), 'utf8');
    logSuccess('Service Worker criado: public/sw.js');
    return true;
  } catch (error) {
    logError(`Erro ao criar service worker: ${error.message}`);
    return false;
  }
}

// Instruções para próximos passos
function showNextSteps() {
  log('');
  log(`${colors.bright}${colors.cyan}🚀 PRÓXIMOS PASSOS:${colors.reset}`);
  log('');
  
  log(`${colors.yellow}1. Configurar banco de dados:${colors.reset}`);
  log('   node scripts/setup-database.js');
  log('');
  
  log(`${colors.yellow}2. Instalar dependências se necessário:${colors.reset}`);
  log('   npm install dotenv');
  log('');
  
  log(`${colors.yellow}3. Executar aplicação:${colors.reset}`);
  log('   npm run dev');
  log('');
  
  log(`${colors.yellow}4. Acessar funcionalidades:${colors.reset}`);
  log('   • Dashboard Executivo: http://localhost:3000/dashboard/executive');
  log('   • Alertas Inteligentes: http://localhost:3000/dashboard/alerts');
  log('');
  
  log(`${colors.yellow}5. Ativar notificações:${colors.reset}`);
  log('   • Clique no botão "Ativar Notificações" no dashboard');
  log('   • Permita notificações quando solicitado pelo navegador');
  log('');
  
  log(`${colors.cyan}📊 RECURSOS DISPONÍVEIS:${colors.reset}`);
  log('• ✅ Métricas em tempo real');
  log('• ✅ Alertas inteligentes'); 
  log('• ✅ Notificações push');
  log('• ✅ Dashboard executivo');
  log('• ✅ Histórico de KPIs');
  log('• ✅ Controle de acesso (roles)');
  log('');
}

// Função principal
async function main() {
  log('');
  log(`${colors.bright}${colors.magenta}🎯 CONFIGURAÇÃO DO SISTEMA PREMIUM${colors.reset}`);
  log('   Sistema de Métricas e Alertas Inteligentes');
  log('');

  // 1. Verificar arquivos
  logStep('1/5', 'Verificando arquivos necessários...');
  if (!checkFiles()) {
    process.exit(1);
  }

  // 2. Verificar ambiente
  logStep('2/5', 'Verificando variáveis de ambiente...');
  if (!checkEnvironment()) {
    logError('Configure as variáveis de ambiente no arquivo .env');
    process.exit(1);
  }

  // 3. Atualizar componentes
  logStep('3/5', 'Atualizando componentes para usar dados reais...');
  if (updateComponents()) {
    logSuccess('Componentes atualizados com sucesso');
  } else {
    logWarning('Nenhum componente foi atualizado (pode já estar configurado)');
  }

  // 4. Criar service worker
  logStep('4/5', 'Criando service worker para notificações...');
  createServiceWorker();

  // 5. Instruções finais
  logStep('5/5', 'Configuração concluída!');
  logSuccess('Sistema premium configurado com sucesso');

  showNextSteps();
}

// Executar
if (require.main === module) {
  main().catch(error => {
    logError(`Erro durante a configuração: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main };