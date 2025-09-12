#!/usr/bin/env node

/**
 * Teste de Conexão com Supabase
 */

const CONFIG = {
  supabaseUrl: 'https://dvnyfwpphuuujhodqkko.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk'
};

async function testConnection() {
  console.log('🔍 Testando conexão com Supabase...');
  console.log('URL:', CONFIG.supabaseUrl);
  
  try {
    const response = await fetch(`${CONFIG.supabaseUrl}/rest/v1/profiles?select=*&limit=1`, {
      headers: {
        'apikey': CONFIG.supabaseKey,
        'Authorization': `Bearer ${CONFIG.supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Conexão OK!');
      console.log('Dados recebidos:', data.length, 'registros');
      console.log('Primeiro registro:', data[0] || 'Nenhum');
    } else {
      const errorText = await response.text();
      console.error('❌ Erro na resposta:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

testConnection();