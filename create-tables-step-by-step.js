import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://dvnyfwpphuuujhodqkko.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bnlmd3BwaHV1dWpob2Rxa2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NzAyMjcsImV4cCI6MjA3MzE0NjIyN30.sQyW-Jn9LrR5mfRpJSoPOm1ENOrApc6GUEQxgfRHzuk";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTablesStepByStep() {
  console.log('🚀 Criando tabelas passo a passo...');
  
  // Primeiro, vamos tentar criar as tabelas usando INSERT direto
  // Isso vai nos dar informações sobre a estrutura atual
  
  console.log('\n1️⃣ Testando tabela clinica_profissionais...');
  try {
    const { data, error } = await supabase
      .from('clinica_profissionais')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Tabela clinica_profissionais não existe:', error.message);
    } else {
      console.log('✅ Tabela clinica_profissionais já existe!');
    }
  } catch (e) {
    console.log('❌ Erro ao verificar clinica_profissionais:', e.message);
  }
  
  console.log('\n2️⃣ Testando tabela templates_procedimentos...');
  try {
    const { data, error } = await supabase
      .from('templates_procedimentos')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Tabela templates_procedimentos não existe:', error.message);
    } else {
      console.log('✅ Tabela templates_procedimentos já existe!');
    }
  } catch (e) {
    console.log('❌ Erro ao verificar templates_procedimentos:', e.message);
  }
  
  console.log('\n3️⃣ Verificando políticas RLS atuais...');
  
  // Tentar inserir um registro de teste para ver se as políticas estão funcionando
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('⚠️  Nenhum usuário logado para testar políticas RLS');
    } else {
      console.log('👤 Usuário logado:', user.email);
      
      // Testar política de user_roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);
      
      if (rolesError) {
        console.log('❌ Erro ao acessar user_roles:', rolesError.message);
      } else {
        console.log('✅ Acesso a user_roles funcionando. Roles encontradas:', roles.length);
      }
      
      // Testar política de clinicas
      const { data: clinicas, error: clinicasError } = await supabase
        .from('clinicas')
        .select('*')
        .limit(1);
      
      if (clinicasError) {
        console.log('❌ Erro ao acessar clinicas:', clinicasError.message);
      } else {
        console.log('✅ Acesso a clinicas funcionando. Clínicas encontradas:', clinicas.length);
      }
    }
  } catch (e) {
    console.log('❌ Erro ao verificar políticas:', e.message);
  }
  
  console.log('\n📋 RESUMO:');
  console.log('Para resolver os problemas, você precisa:');
  console.log('');
  console.log('1. Criar as tabelas que estão faltando');
  console.log('2. Configurar as políticas RLS');
  console.log('');
  console.log('💡 SOLUÇÃO MAIS SIMPLES:');
  console.log('Execute o conteúdo do arquivo temp_onboarding_setup.sql');
  console.log('no SQL Editor do Supabase:');
  console.log('🔗 https://supabase.com/dashboard/project/dvnyfwpphuuujhodqkko/sql');
  console.log('');
  console.log('Ou use o arquivo: supabase/migrations/20250912050000_create_onboarding_tables.sql');
}

createTablesStepByStep();