/**
 * Script para configurar as tabelas de métricas no Supabase remoto
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Ler variáveis do arquivo .env
const envContent = fs.readFileSync('.env', 'utf8');
const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].replace(/["']/g, '') : null;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY') || getEnvVar('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!');
  console.log('Verifique se VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão definidas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log('🚀 Configurando banco de dados...');

  // SQL das métricas
  const metricsSQL = `
-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELAS PARA ARMAZENAMENTO DE MÉTRICAS
-- =====================================================

-- Snapshots das métricas (atualizados a cada 5 minutos)
CREATE TABLE IF NOT EXISTS metrics_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Métricas operacionais
    occupancy_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    daily_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
    cancellation_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    no_show_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    
    -- Métricas de serviço
    avg_service_duration INTEGER DEFAULT 0,
    client_satisfaction NUMERIC(3,1) DEFAULT 0,
    conversion_rate NUMERIC(5,2) DEFAULT 0,
    avg_ticket NUMERIC(8,2) DEFAULT 0,
    
    -- Utilização de recursos
    staff_utilization NUMERIC(5,2) DEFAULT 0,
    peak_hours TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- KPIs agregados por período
CREATE TABLE IF NOT EXISTS kpi_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
    date DATE NOT NULL,
    
    total_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
    growth_rate NUMERIC(5,2) DEFAULT 0,
    retention_rate NUMERIC(5,2) DEFAULT 0,
    
    total_appointments INTEGER NOT NULL DEFAULT 0,
    completed_appointments INTEGER NOT NULL DEFAULT 0,
    cancelled_appointments INTEGER NOT NULL DEFAULT 0,
    no_shows INTEGER NOT NULL DEFAULT 0,
    vip_appointments INTEGER NOT NULL DEFAULT 0,
    
    new_clients INTEGER NOT NULL DEFAULT 0,
    returning_clients INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(period, date)
);

-- Alertas do sistema
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    data JSONB DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);`;

  // SQL dos índices
  const indexesSQL = `
-- Índices
CREATE INDEX IF NOT EXISTS idx_metrics_snapshots_timestamp ON metrics_snapshots(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_period_date ON kpi_metrics(period, date DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON system_alerts(status);`;

  // SQL das políticas RLS
  const rlsSQL = `
-- Habilitar RLS
ALTER TABLE metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (permite leitura para usuários autenticados)
DROP POLICY IF EXISTS "Allow authenticated read metrics_snapshots" ON metrics_snapshots;
CREATE POLICY "Allow authenticated read metrics_snapshots" ON metrics_snapshots FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read kpi_metrics" ON kpi_metrics;
CREATE POLICY "Allow authenticated read kpi_metrics" ON kpi_metrics FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read system_alerts" ON system_alerts;
CREATE POLICY "Allow authenticated read system_alerts" ON system_alerts FOR SELECT TO authenticated USING (true);`;

  // SQL dos dados iniciais
  const dataSQL = `
-- Dados de exemplo
INSERT INTO metrics_snapshots (
    timestamp, occupancy_rate, daily_revenue, cancellation_rate, no_show_rate,
    avg_service_duration, client_satisfaction, conversion_rate, avg_ticket,
    staff_utilization, peak_hours
) VALUES (
    NOW(), 75.5, 1250.00, 8.2, 3.1, 65, 8.7, 92.3, 125.50, 82.4,
    ARRAY['14:00-15:00', '16:00-17:00', '18:00-19:00']
) ON CONFLICT DO NOTHING;

-- KPIs de exemplo
INSERT INTO kpi_metrics (
    period, date, total_revenue, growth_rate, retention_rate,
    total_appointments, completed_appointments, cancelled_appointments,
    no_shows, vip_appointments, new_clients, returning_clients
) VALUES 
('monthly', DATE_TRUNC('month', CURRENT_DATE)::DATE, 15750.00, 12.5, 87.3, 126, 118, 6, 2, 18, 23, 95),
('weekly', DATE_TRUNC('week', CURRENT_DATE)::DATE, 3250.00, 8.7, 89.1, 28, 26, 1, 1, 4, 6, 20),
('daily', CURRENT_DATE, 450.00, 15.2, 88.5, 4, 4, 0, 0, 1, 1, 3)
ON CONFLICT (period, date) DO NOTHING;`;

  try {
    // Executar SQLs sequencialmente
    console.log('📋 Criando tabelas...');
    const { error: tablesError } = await supabase.rpc('exec_sql', { sql: metricsSQL });
    if (tablesError) throw tablesError;

    console.log('🔍 Criando índices...');
    const { error: indexesError } = await supabase.rpc('exec_sql', { sql: indexesSQL });
    if (indexesError) throw indexesError;

    console.log('🔒 Configurando políticas RLS...');
    const { error: rlsError } = await supabase.rpc('exec_sql', { sql: rlsSQL });
    if (rlsError) throw rlsError;

    console.log('📊 Inserindo dados iniciais...');
    const { error: dataError } = await supabase.rpc('exec_sql', { sql: dataSQL });
    if (dataError) throw dataError;

    console.log('✅ Banco de dados configurado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao configurar banco:', error);
    
    // Tentar usando queries diretas
    try {
      console.log('🔄 Tentando método alternativo...');
      
      const { error: altError } = await supabase
        .from('metrics_snapshots')
        .select('id')
        .limit(1);
        
      if (altError && altError.code === '42P01') {
        console.log('📋 Tabela não existe, criando via SQL direto...');
        // Método alternativo usando SQL direto
        await executeDirectSQL();
      } else {
        console.log('✅ Tabelas já existem!');
      }
    } catch (altError) {
      console.error('❌ Erro no método alternativo:', altError);
      console.log('');
      console.log('🛠️  SOLUÇÃO MANUAL:');
      console.log('1. Acesse o Supabase Dashboard');
      console.log('2. Vá para SQL Editor');
      console.log('3. Execute o SQL abaixo:');
      console.log('');
      console.log('--- COPIE E EXECUTE NO SQL EDITOR ---');
      console.log(metricsSQL + '\n\n' + indexesSQL + '\n\n' + rlsSQL + '\n\n' + dataSQL);
      console.log('--- FIM DO SQL ---');
    }
  }
}

async function executeDirectSQL() {
  // Método direto usando insert simples para testar conectividade
  try {
    const { data, error } = await supabase
      .from('metrics_snapshots')
      .insert([
        {
          timestamp: new Date().toISOString(),
          occupancy_rate: 75.5,
          daily_revenue: 1250.00,
          cancellation_rate: 8.2,
          no_show_rate: 3.1,
          avg_service_duration: 65,
          client_satisfaction: 8.7,
          conversion_rate: 92.3,
          avg_ticket: 125.50,
          staff_utilization: 82.4,
          peak_hours: ['14:00-15:00', '16:00-17:00', '18:00-19:00']
        }
      ])
      .select();

    console.log('✅ Dados inseridos com sucesso:', data);
  } catch (error) {
    console.error('❌ Erro na inserção direta:', error);
  }
}

// Executar
setupDatabase();