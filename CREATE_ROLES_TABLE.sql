-- =====================================================
-- CREATE ROLES TABLE
-- Execute this SQL in Supabase SQL Editor
-- =====================================================

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

-- Create policy for roles (anyone can view roles)
CREATE POLICY "Anyone can view roles" ON roles
  FOR SELECT USING (true);

-- Create policy for admins to manage roles
CREATE POLICY "Admins can manage roles" ON roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin', 'proprietaria')
      AND ur.ativo = true
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_roles_nome ON roles(nome);
CREATE INDEX IF NOT EXISTS idx_roles_ativo ON roles(ativo);
CREATE INDEX IF NOT EXISTS idx_roles_nivel_acesso ON roles(nivel_acesso);

-- Add trigger to update atualizado_em
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_roles_updated_at 
    BEFORE UPDATE ON roles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Verify creation
SELECT 'Roles table created successfully!' as status;
SELECT * FROM roles ORDER BY nivel_acesso DESC;