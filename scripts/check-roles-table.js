#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dvnyfwpphuuujhodqkko.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRolesTable() {

  // Check if roles table exists
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .limit(5);
  
  if (error) {

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

    data.forEach(role => {

    });
  }
}

checkRolesTable().catch(console.error);
