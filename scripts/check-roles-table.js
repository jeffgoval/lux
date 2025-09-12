#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dvnyfwpphuuujhodqkko.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRolesTable() {
  console.log('🔍 Checking for roles table...\n');
  
  // Check if roles table exists
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .limit(5);
  
  if (error) {
    console.log('❌ Roles table not found:', error.message);
    console.log('\n📝 Creating roles table SQL:');
    console.log(`
-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(50) UNIQUE NOT NULL,
  descricao TEXT,
  nivel_acesso INTEGER DEFAULT 1,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (nome, descricao, nivel_acesso) VALUES
('super_admin', 'Super Administrador do Sistema', 10),
('proprietaria', 'Proprietária da Clínica', 9),
('gerente', 'Gerente da Clínica', 8),
('profissionais', 'Profissionais de Estética', 6),
('recepcionistas', 'Recepcionistas', 4),
('visitante', 'Visitante', 2),
('cliente', 'Cliente', 1)
ON CONFLICT (nome) DO NOTHING;

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Create policy for roles
CREATE POLICY "Anyone can view roles" ON roles
  FOR SELECT USING (true);
`);
  } else {
    console.log('✅ Roles table exists');
    console.log('📋 Current roles:');
    data.forEach(role => {
      console.log(`   - ${role.nome}: ${role.descricao} (nível ${role.nivel_acesso})`);
    });
  }
}

checkRolesTable().catch(console.error);