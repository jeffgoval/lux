// Script para testar endpoints após deploy
const API_URL = process.env.API_URL || 'http://localhost:8080/api';

async function testEndpoints() {
  console.log('🧪 Testando endpoints...');
  console.log(`📍 API URL: ${API_URL}`);
  console.log('='.repeat(50));

  // Test 1: Health check
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    console.log('✅ Health check:', data.status);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // Test 2: API Health
  try {
    const response = await fetch(`${API_URL}/api/health`);
    const data = await response.json();
    console.log('✅ API Health:', data.status);
  } catch (error) {
    console.log('❌ API Health failed:', error.message);
  }

  // Test 3: Register user
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `teste${Date.now()}@teste.com`,
        password: '123456',
        nome_completo: 'Teste User'
      })
    });
    const data = await response.json();
    console.log('✅ Register:', data.success ? 'OK' : 'FAILED');
  } catch (error) {
    console.log('❌ Register failed:', error.message);
  }

  console.log('='.repeat(50));
  console.log('🎉 Testes concluídos!');
}

// Executar se chamado diretamente
if (require.main === module) {
  testEndpoints();
}

module.exports = { testEndpoints };