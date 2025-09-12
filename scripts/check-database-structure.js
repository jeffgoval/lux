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
    console.log(`🔍 Checking table: ${tableName}`);
    
    // Try to query the table
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ Table ${tableName} error:`, error.message);
      return { exists: false, error: error.message };
    }
    
    console.log(`✅ Table ${tableName} exists and is accessible`);
    return { exists: true, data };
    
  } catch (error) {
    console.log(`❌ Table ${tableName} check failed:`, error.message);
    return { exists: false, error: error.message };
  }
}

/**
 * Check database structure
 */
async function checkDatabaseStructure() {
  console.log('🏗️  Checking database structure...\n');
  
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
  
  console.log('\n📊 SUMMARY:');
  console.log('='.repeat(50));
  
  for (const [table, result] of Object.entries(results)) {
    const status = result.exists ? '✅' : '❌';
    console.log(`${status} ${table}: ${result.exists ? 'OK' : result.error}`);
  }
  
  // Check for missing critical tables
  const missingTables = Object.entries(results)
    .filter(([table, result]) => !result.exists)
    .map(([table]) => table);
  
  if (missingTables.length > 0) {
    console.log('\n🚨 MISSING TABLES:');
    missingTables.forEach(table => {
      console.log(`   - ${table}`);
    });
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('   1. Run the database setup script');
    console.log('   2. Check Supabase dashboard for table creation');
    console.log('   3. Verify RLS policies are properly configured');
  } else {
    console.log('\n✅ All critical tables exist!');
  }
  
  return results;
}

/**
 * Generate SQL for missing tables
 */
function generateMissingTableSQL() {
  console.log('\n📝 SQL for missing tables:\n');
  
  console.log('-- Create user_role_type enum if not exists');
  console.log(`CREATE TYPE IF NOT EXISTS user_role_type AS ENUM (
  'super_admin',
  'proprietaria', 
  'gerente',
  'profissionais',
  'recepcionistas',
  'visitante',
  'cliente'
);`);
  
  console.log('\n-- Create profiles table');
  console.log(`CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
  
  console.log('\n-- Create user_roles table');
  console.log(`CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organizacao_id UUID,
  clinica_id UUID,
  role user_role_type NOT NULL,
  ativo BOOLEAN DEFAULT true NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  criado_por UUID REFERENCES auth.users(id) NOT NULL
);`);
  
  console.log('\n-- Enable RLS');
  console.log(`ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;`);
  
  console.log('\n-- Basic RLS policies');
  console.log(`CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

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
    console.error('❌ Database check failed:', error);
    process.exit(1);
  });