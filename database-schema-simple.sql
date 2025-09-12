-- Schema SIMPLES para DigitalOcean PostgreSQL
-- SEM RLS, SEM TRIGGER, SEM COMPLICAÇÃO!

-- Limpar tudo (cuidado em produção!)
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS clinicas CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Tabela de usuários - SIMPLES
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nome_completo VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de roles - SEM RLS
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN (
    'super_admin', 'proprietaria', 'gerente', 
    'profissionais', 'recepcionistas', 'visitante', 'cliente'
  )),
  clinica_id UUID, -- Será preenchido quando criar clínica
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de clínicas - SIMPLES
CREATE TABLE clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20),
  endereco JSONB, -- Endereço como JSON
  telefone VARCHAR(20),
  email VARCHAR(255),
  horario_funcionamento JSONB, -- Horários como JSON
  owner_id UUID REFERENCES users(id), -- Dono da clínica
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Adicionar foreign key depois que clinicas existe
ALTER TABLE user_roles ADD CONSTRAINT fk_clinica 
FOREIGN KEY (clinica_id) REFERENCES clinicas(id) ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_clinica_id ON user_roles(clinica_id);
CREATE INDEX idx_clinicas_owner ON clinicas(owner_id);

-- Função para atualizar updated_at (opcional)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at (opcional)
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinicas_updated_at 
  BEFORE UPDATE ON clinicas 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Dados de teste (opcional)
INSERT INTO users (email, password_hash, nome_completo, telefone) VALUES 
('admin@teste.com', '$2b$10$example_hash_here', 'Admin Teste', '11999999999');

INSERT INTO user_roles (user_id, role) VALUES 
((SELECT id FROM users WHERE email = 'admin@teste.com'), 'proprietaria');

-- Pronto! Schema simples que FUNCIONA
-- Sem RLS, sem dor de cabeça, só PostgreSQL puro