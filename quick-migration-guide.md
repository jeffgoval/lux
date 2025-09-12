# Migração Rápida: Supabase → DigitalOcean
## Solução que funciona HOJE

### 🎯 Estratégia: Backend Simples + PostgreSQL Limpo

Vamos criar um backend **sem RLS**, **sem complicação**, só PostgreSQL puro com queries normais.

## Passo 1: Setup DigitalOcean (30 minutos)

### 1.1 Criar Database
```bash
# No painel DigitalOcean:
# 1. Databases → Create Database
# 2. PostgreSQL 15
# 3. Basic plan ($15/mês)
# 4. Região mais próxima
```

### 1.2 Conectar e criar schema limpo
```sql
-- Schema SIMPLES, sem RLS, sem complicação
CREATE DATABASE clinica_app;

-- Tabelas básicas que funcionam
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

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  clinica_id UUID,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20),
  endereco JSONB,
  telefone VARCHAR(20),
  email VARCHAR(255),
  horario_funcionamento JSONB,
  owner_id UUID REFERENCES users(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sem RLS, sem trigger, sem complicação!
-- Controle de acesso no backend
```

## Passo 2: Backend Express Simples (2 horas)

### 2.1 Estrutura mínima
```
backend/
├── src/
│   ├── routes/
│   │   ├── auth.js
│   │   ├── clinicas.js
│   │   └── users.js
│   ├── middleware/
│   │   └── auth.js
│   ├── db/
│   │   └── connection.js
│   └── server.js
├── package.json
└── .env
```

### 2.2 Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  }
}
```