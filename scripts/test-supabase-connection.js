#!/usr/bin/env node

/**
 * Teste de Conexão com Supabase
 */

const CONFIG = {
  supabaseUrl: 'https://dvnyfwpphuuujhodqkko.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk'
};

async function testConnection() {

  try {
    const response = await fetch(`${CONFIG.supabaseUrl}/rest/v1/profiles?select=*&limit=1`, {
      headers: {
        'apikey': CONFIG.supabaseKey,
        'Authorization': `Bearer ${CONFIG.supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();

    } else {
      const errorText = await response.text();

    }
    
  } catch (error) {

  }
}

testConnection();
