#!/usr/bin/env node

/**
 * 🗄️ MIGRAÇÃO SIMPLES - SISTEMA V2
 * 
 * Executa migração usando SQL direto via Supabase
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🗄️ MIGRAÇÃO SIMPLES DO BANCO DE DADOS\n');

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

console.log(`🔗 Conectando a: ${supabaseUrl}`);

// ============================================================================
// EXECUTAR SQL VIA API REST
// ============================================================================

async function executeSQL(sql, description) {
  console.log(`\n📄 Executando: ${description}...`);
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({ sql_query: sql })
    });
    
    if (response.ok) {
      console.log('  ✅ Executado com sucesso');
      return true;
    } else {
      const error = await response.text();
      console.log(`  ❌ Erro: ${error}`);
      return false;
    }
    
  } catch (error) {
    console.log(`  ❌ Erro de rede: ${error.message}`);
    return false;
  }
}

// ============================================================================
// CRIAR TABELAS BÁSICAS PRIMEIRO
// ============================================================================

async function createBasicTables() {
  console.log('\n🏗️ Criando tabelas básicas...');
  
  const basicSQL = `
    -- Criar enum para roles
    DO $$ BEGIN
      CREATE TYPE user_role_enum AS ENUM (
        'super_admin',
        'clinic_owner', 
        'clinic_manager',
        'professional',
        'receptionist',
        'patient'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
    
    -- Criar enum para permissões
    DO $$ BEGIN
      CREATE TYPE permission_enum AS ENUM (
        'CREATE_CLINIC',
        'VIEW_CLINIC',
        'EDIT_CLINIC',
        'DELETE_CLINIC',
        'INVITE_USER',
        'MANAGE_USERS',
        'VIEW_USERS',
        'CREATE_MEDICAL_RECORD',
        'VIEW_MEDICAL_RECORD',
        'EDIT_MEDICAL_RECORD',
        'DELETE_MEDICAL_RECORD',
        'VIEW_FINANCIAL',
        'MANAGE_FINANCIAL',
        'VIEW_REPORTS',
        'EXPORT_DATA',
        'VIEW_AUDIT_LOGS',
        'MANAGE_SYSTEM'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
    
    -- Tabela de clínicas
    CREATE TABLE IF NOT EXISTS clinics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(20),
      document VARCHAR(20),
      address JSONB DEFAULT '{}',
      settings JSONB DEFAULT '{}',
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Tabela de usuários
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      document VARCHAR(20),
      birth_date DATE,
      profile_data JSONB DEFAULT '{}',
      email_verified BOOLEAN DEFAULT false,
      phone_verified BOOLEAN DEFAULT false,
      active BOOLEAN DEFAULT true,
      last_login_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Tabela de associações usuário-clínica
    CREATE TABLE IF NOT EXISTS user_clinic_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
      role user_role_enum NOT NULL,
      custom_permissions permission_enum[] DEFAULT '{}',
      active BOOLEAN DEFAULT true,
      expires_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_by UUID REFERENCES users(id),
      UNIQUE(user_id, clinic_id)
    );
    
    -- Índices para performance
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
    CREATE INDEX IF NOT EXISTS idx_clinics_active ON clinics(active);
    CREATE INDEX IF NOT EXISTS idx_user_clinic_roles_user_id ON user_clinic_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_clinic_roles_clinic_id ON user_clinic_roles(clinic_id);
    CREATE INDEX IF NOT EXISTS idx_user_clinic_roles_active ON user_clinic_roles(active);
  `;
  
  return await executeSQL(basicSQL, 'Tabelas básicas do sistema V2');
}

// ============================================================================
// CRIAR POLÍTICAS RLS BÁSICAS
// ============================================================================

async function createBasicRLS() {
  console.log('\n🔒 Criando políticas RLS básicas...');
  
  const rlsSQL = `
    -- Habilitar RLS nas tabelas
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
    ALTER TABLE user_clinic_roles ENABLE ROW LEVEL SECURITY;
    
    -- Função para obter ID do usuário atual
    CREATE OR REPLACE FUNCTION current_user_id()
    RETURNS UUID
    LANGUAGE SQL
    SECURITY DEFINER
    AS $$
      SELECT COALESCE(
        (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
        (current_setting('request.jwt.claims', true)::json->>'user_id')::uuid
      );
    $$;
    
    -- Política para usuários - podem ver apenas seus próprios dados
    DROP POLICY IF EXISTS "users_select_own" ON users;
    CREATE POLICY "users_select_own" ON users
      FOR SELECT USING (id = current_user_id());
    
    -- Política para clínicas - podem ver apenas clínicas que têm acesso
    DROP POLICY IF EXISTS "clinics_select_accessible" ON clinics;
    CREATE POLICY "clinics_select_accessible" ON clinics
      FOR SELECT USING (
        id IN (
          SELECT clinic_id FROM user_clinic_roles 
          WHERE user_id = current_user_id() AND active = true
        )
      );
    
    -- Política para roles - podem ver apenas suas próprias associações
    DROP POLICY IF EXISTS "user_clinic_roles_select_own" ON user_clinic_roles;
    CREATE POLICY "user_clinic_roles_select_own" ON user_clinic_roles
      FOR SELECT USING (user_id = current_user_id());
  `;
  
  return await executeSQL(rlsSQL, 'Políticas RLS básicas');
}

// ============================================================================
// MIGRAÇÃO PRINCIPAL
// ============================================================================

async function runSimpleMigration() {
  console.log('🚀 Iniciando migração simples...\n');
  
  // 1. Criar tabelas básicas
  const tablesSuccess = await createBasicTables();
  
  // 2. Criar políticas RLS básicas
  const rlsSuccess = await createBasicRLS();
  
  // ============================================================================
  // RESUMO
  // ============================================================================
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 RESUMO DA MIGRAÇÃO SIMPLES');
  console.log('='.repeat(50));
  
  console.log(`🏗️ Tabelas: ${tablesSuccess ? '✅ Criadas' : '❌ Erro'}`);
  console.log(`🔒 RLS: ${rlsSuccess ? '✅ Configurado' : '❌ Erro'}`);
  
  if (tablesSuccess && rlsSuccess) {
    console.log('\n🎉 MIGRAÇÃO BÁSICA CONCLUÍDA!');
    console.log('\nPróximos passos:');
    console.log('1. Testar conexão com o banco');
    console.log('2. Criar usuário de teste');
    console.log('3. Testar login');
  } else {
    console.log('\n⚠️ Migração falhou. Verifique os erros acima.');
  }
}

// Executar
runSimpleMigration().catch(console.error);
