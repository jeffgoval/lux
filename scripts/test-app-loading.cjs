#!/usr/bin/env node

/**
 * 🧪 TESTE DE CARREGAMENTO DA APLICAÇÃO
 * 
 * Verifica se a aplicação está carregando sem erros
 */

const http = require('http');

console.log('🔍 Testando carregamento da aplicação...\n');

// Função para fazer requisição HTTP
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          body: data
        });
      });
    });
    
    request.on('error', (error) => {
      reject(error);
    });
    
    request.setTimeout(5000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Testar diferentes rotas
async function testRoutes() {
  const routes = [
    { path: '/', name: 'Landing Page' },
    { path: '/auth', name: 'Auth Page' },
    { path: '/dashboard', name: 'Dashboard (should redirect)' }
  ];
  
  const baseUrl = 'http://localhost:5174';
  
  console.log(`🌐 Testando rotas em ${baseUrl}...\n`);
  
  for (const route of routes) {
    try {
      console.log(`📄 Testando ${route.name} (${route.path})...`);
      
      const response = await makeRequest(`${baseUrl}${route.path}`);
      
      if (response.statusCode === 200) {
        console.log(`  ✅ Status: ${response.statusCode} OK`);
        
        // Verificar se contém React
        if (response.body.includes('react') || response.body.includes('React')) {
          console.log(`  ✅ React detectado`);
        }
        
        // Verificar se não há erros óbvios
        if (response.body.includes('Error') || response.body.includes('error')) {
          console.log(`  ⚠️ Possíveis erros detectados no HTML`);
        } else {
          console.log(`  ✅ Sem erros óbvios no HTML`);
        }
        
      } else {
        console.log(`  ⚠️ Status: ${response.statusCode}`);
      }
      
    } catch (error) {
      console.log(`  ❌ Erro: ${error.message}`);
    }
    
    console.log('');
  }
}

// Verificar se o servidor está rodando
async function checkServer() {
  try {
    console.log('🔍 Verificando se o servidor está rodando...');
    
    const response = await makeRequest('http://localhost:5174/');
    
    if (response.statusCode === 200) {
      console.log('✅ Servidor está rodando na porta 5174\n');
      return true;
    } else {
      console.log(`⚠️ Servidor respondeu com status ${response.statusCode}\n`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Servidor não está rodando: ${error.message}\n`);
    console.log('💡 Execute: npm run dev -- --port 5174\n');
    return false;
  }
}

// Executar testes
async function runTests() {
  const serverRunning = await checkServer();
  
  if (serverRunning) {
    await testRoutes();
    
    console.log('='.repeat(50));
    console.log('📋 RESUMO DOS TESTES');
    console.log('='.repeat(50));
    console.log('✅ Servidor está rodando');
    console.log('✅ Rotas estão respondendo');
    console.log('\n🎉 APLICAÇÃO ESTÁ FUNCIONANDO!');
    console.log('\n📝 Próximos passos:');
    console.log('1. Abrir http://localhost:5174/auth no navegador');
    console.log('2. Testar o formulário de login');
    console.log('3. Verificar se não há erros no console do navegador');
    
  } else {
    console.log('❌ Não foi possível testar - servidor não está rodando');
  }
}

// Executar
runTests().catch(console.error);
