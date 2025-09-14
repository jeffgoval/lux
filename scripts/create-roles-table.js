#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dvnyfwpphuuujhodqkko.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createRolesTable() {

  try {
    // Create the roles table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    
    if (createError) {

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
      return false;
    }

    // Insert default roles
    const { error: insertError } = await supabase
      .from('roles')
      .upsert([
        { nome: 'super_admin', descricao: 'Super Administrador do Sistema', nivel_acesso: 10 },
        { nome: 'proprietaria', descricao: 'Proprietária da Clínica', nivel_acesso: 9 },
        { nome: 'gerente', descricao: 'Gerente da Clínica', nivel_acesso: 8 },
        { nome: 'profissionais', descricao: 'Profissionais de Estética', nivel_acesso: 6 },
        { nome: 'recepcionistas', descricao: 'Recepcionistas', nivel_acesso: 4 },
        { nome: 'visitante', descricao: 'Visitante', nivel_acesso: 2 },
        { nome: 'cliente', descricao: 'Cliente', nivel_acesso: 1 }
      ], { 
        onConflict: 'nome',
        ignoreDuplicates: true 
      });
    
    if (insertError) {

      return false;
    }

    // Verify creation
    const { data: roles, error: selectError } = await supabase
      .from('roles')
      .select('*')
      .order('nivel_acesso', { ascending: false });
    
    if (selectError) {

      return false;
    }

    roles.forEach(role => {

    });
    
    return true;
    
  } catch (error) {

    return false;
  }
}

createRolesTable()
  .then(success => {
    if (success) {

    } else {

    }
  })
  .catch(console.error);
