#!/usr/bin/env node

/**
 * 🚀 EXECUTOR VIA SUPABASE CLI
 * 
 * Executa SQL via CLI do Supabase
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function executeCommand(command) {
  return new Promise((resolve, reject) => {
    log(`🔄 Executando: ${command}`, 'blue');
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        log(`❌ Erro: ${error.message}`, 'red');
        reject(error);
        return;
      }
      
      if (stderr) {
        log(`⚠️  Stderr: ${stderr}`, 'yellow');
      }
      
      if (stdout) {
        log(`✅ Output: ${stdout}`, 'green');
      }
      
      resolve({ stdout, stderr });
    });
  });
}

async function executeSQLViaCLI() {
  try {
    log('🚀 EXECUTANDO SQL VIA SUPABASE CLI\n', 'bold');
    
    // 1. Verificar status do projeto
    log('📋 Verificando status do projeto...', 'blue');
    await executeCommand('supabase status --linked');
    
    // 2. Criar arquivo SQL temporário
    const sqlContent = `
-- Enums básicos
CREATE TYPE IF NOT EXISTS public.agendamento_status AS ENUM (
  'rascunho', 'pendente', 'confirmado', 'em_andamento',
  'finalizado', 'cancelado', 'nao_compareceu', 'reagendado'
);

CREATE TYPE IF NOT EXISTS public.cliente_categoria AS ENUM (
  'regular', 'vip', 'premium', 'corporativo'
);

-- Tabela de organizações
CREATE TABLE IF NOT EXISTS public.organizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  endereco JSONB DEFAULT '{}'::jsonb,
  telefone_principal TEXT,
  email_contato TEXT,
  plano TEXT NOT NULL DEFAULT 'basico',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  data_nascimento DATE,
  cpf TEXT,
  endereco JSONB DEFAULT '{}'::jsonb,
  categoria cliente_categoria NOT NULL DEFAULT 'regular',
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Tabela de serviços
CREATE TABLE IF NOT EXISTS public.servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  nome_tecnico TEXT,
  codigo_interno TEXT,
  categoria TEXT NOT NULL,
  subcategoria TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  descricao_comercial TEXT,
  descricao_tecnica TEXT,
  duracao_padrao INTEGER NOT NULL DEFAULT 60,
  preco_base DECIMAL(10,2) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS public.agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  profissional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE RESTRICT,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  data_agendamento TIMESTAMPTZ NOT NULL,
  duracao_minutos INTEGER NOT NULL DEFAULT 60,
  status agendamento_status NOT NULL DEFAULT 'pendente',
  valor_servico DECIMAL(10,2) NOT NULL,
  valor_final DECIMAL(10,2) NOT NULL,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_agendamentos_clinica_data ON public.agendamentos(clinica_id, data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_profissional_data ON public.agendamentos(profissional_id, data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON public.agendamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON public.agendamentos(status);

-- RLS
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

-- Políticas básicas
CREATE POLICY "Users can view accessible organizations" ON public.organizacoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND (organizacao_id = public.organizacoes.id OR role IN ('super_admin'))
      AND ativo = true
    )
  );

CREATE POLICY "Users can view clinic clients" ON public.clientes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.clientes.clinica_id
      AND ativo = true
    )
  );

CREATE POLICY "Users can manage clinic clients" ON public.clientes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.clientes.clinica_id
      AND role IN ('proprietaria', 'gerente', 'profissionais', 'recepcionistas')
      AND ativo = true
    )
  );

CREATE POLICY "Users can view clinic services" ON public.servicos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.servicos.clinica_id
      AND ativo = true
    )
  );

CREATE POLICY "Users can manage clinic services" ON public.servicos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.servicos.clinica_id
      AND role IN ('proprietaria', 'gerente', 'profissionais')
      AND ativo = true
    )
  );

CREATE POLICY "Users can view clinic appointments" ON public.agendamentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.agendamentos.clinica_id
      AND ativo = true
    )
  );

CREATE POLICY "Users can manage clinic appointments" ON public.agendamentos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND clinica_id = public.agendamentos.clinica_id
      AND role IN ('proprietaria', 'gerente', 'profissionais', 'recepcionistas')
      AND ativo = true
    )
  );
`;

    // Salvar arquivo temporário
    const tempFile = 'temp_migration.sql';
    fs.writeFileSync(tempFile, sqlContent);
    log(`📝 Arquivo SQL temporário criado: ${tempFile}`, 'green');
    
    // 3. Executar SQL via CLI
    log('🔄 Executando SQL via CLI...', 'blue');
    await executeCommand(`supabase db push --file ${tempFile} --linked`);
    
    // 4. Limpar arquivo temporário
    fs.unlinkSync(tempFile);
    log('🧹 Arquivo temporário removido', 'green');
    
    // 5. Verificar tabelas criadas
    log('🔍 Verificando tabelas criadas...', 'blue');
    await executeCommand('supabase db diff --linked');
    
    log('\n🎉 EXECUÇÃO CONCLUÍDA COM SUCESSO!', 'green');
    
  } catch (error) {
    log(`❌ Erro durante execução: ${error.message}`, 'red');
    
    // Tentar método alternativo
    log('\n🔄 Tentando método alternativo...', 'yellow');
    
    try {
      // Executar comandos SQL individuais
      const commands = [
        'supabase db reset --linked',
        'supabase db push --linked'
      ];
      
      for (const cmd of commands) {
        await executeCommand(cmd);
      }
      
    } catch (altError) {
      log(`❌ Método alternativo também falhou: ${altError.message}`, 'red');
    }
  }
}

// Executar
executeSQLViaCLI();
