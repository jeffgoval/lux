#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const CONFIG = {
  supabaseUrl: 'https://dvnyfwpphuuujhodqkko.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk',
  backupDir: './backups'
};

const TABLES = ['profiles', 'organizations', 'clinics', 'user_roles', 'roles'];

async function fetchTable(table) {

  try {
    const response = await fetch(`${CONFIG.supabaseUrl}/rest/v1/${table}?select=*`, {
      headers: {
        'apikey': CONFIG.supabaseKey,
        'Authorization': `Bearer ${CONFIG.supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();

      return { table, data, success: true };
    } else {

      return { table, data: [], success: false, error: response.status };
    }
    
  } catch (error) {

    return { table, data: [], success: false, error: error.message };
  }
}

async function main() {

  // Criar diretório se não existir
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });

  }
  
  const backup = {
    timestamp: new Date().toISOString(),
    tables: {}
  };
  
  let totalRecords = 0;
  
  for (const table of TABLES) {
    const result = await fetchTable(table);
    backup.tables[table] = result;
    
    if (result.success) {
      totalRecords += result.data.length;
    }
  }
  
  // Salvar backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
  const filename = `backup_${timestamp}.json`;
  const filepath = path.join(CONFIG.backupDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
  
  const stats = fs.statSync(filepath);

}

main().catch(console.error);
