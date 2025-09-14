// Script para testar endpoints após deploy
const API_URL = process.env.API_URL || 'http://localhost:8080/api';

async function testEndpoints() {

  // Test 1: Health check
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();

  } catch (error) {

  }

  // Test 2: API Health
  try {
    const response = await fetch(`${API_URL}/api/health`);
    const data = await response.json();

  } catch (error) {

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

  } catch (error) {

  }

}

// Executar se chamado diretamente
if (require.main === module) {
  testEndpoints();
}

module.exports = { testEndpoints };
