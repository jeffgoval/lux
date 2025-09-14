#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dvnyfwpphuuujhodqkko.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Check if a table exists and get its structure
 */
async function checkTable(tableName) {
  try {

    // Try to query the table
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {

      return { exists: false, error: error.message };
    }

    return { exists: true, data };
    
  } catch (error) {

    return { exists: false, error: error.message };
  }
}

/**
 * Check database structure
 */
async function checkDatabaseStructure() {

  const tables = [
    'profiles',
    'user_roles',
    'organizacoes',
    'clinicas'
  ];
  
  const results = {};
  
  for (const table of tables) {
    results[table] = await checkTable(table);
  }

  for (const [table, result] of Object.entries(results)) {
    const status = result.exists ? '✅' : '❌';

  }
  
  // Check for missing critical tables
  const missingTables = Object.entries(results)
    .filter(([table, result]) => !result.exists)
    .map(([table]) => table);
  
  if (missingTables.length > 0) {

    missingTables.forEach(table => {

    });

  } else {

  }
  
  return results;
}

/**
 * Generate SQL for missing tables
 */
function generateMissingTableSQL() {

  `);

   PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  avatar_url TEXT,
  ativo BOOLEAN DEFAULT true NOT NULL,
  primeiro_acesso BOOLEAN DEFAULT true NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);`);

   PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organizacao_id UUID,
  clinica_id UUID,
  role user_role_type NOT NULL,
  ativo BOOLEAN DEFAULT true NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  criado_por UUID REFERENCES auth.users(id) NOT NULL
);`);

  

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);`);
}

// Run the check
checkDatabaseStructure()
  .then(() => {
    generateMissingTableSQL();
  })
  .catch(error => {

    process.exit(1);
  });
