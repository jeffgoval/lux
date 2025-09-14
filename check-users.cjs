const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const equalIndex = trimmedLine.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmedLine.substring(0, equalIndex).trim();
          const value = trimmedLine.substring(equalIndex + 1).trim().replace(/^["']|["']$/g, '');
          envVars[key] = value;
        }
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('Erro ao ler arquivo .env:', error.message);
    return {};
  }
}

const env = loadEnv();
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function checkUsers() {
  console.log('🔍 Verificando usuários existentes...');
  
  // Verificar profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, user_id, email, nome_completo, primeiro_acesso, criado_em');
  
  if (error) {
    console.error('❌ Erro ao buscar profiles:', error.message);
  } else {
    console.log('📊 Total de profiles:', profiles?.length || 0);
    
    if (profiles && profiles.length > 0) {
      console.log('\n📋 Lista de profiles:');
      profiles.forEach(p => {
        console.log(`  - ${p.email} | primeiro_acesso: ${p.primeiro_acesso} | criado: ${p.criado_em}`);
      });
    }
  }
  
  // Verificar user_roles
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('id, user_id, role, ativo, criado_em');
  
  if (rolesError) {
    console.error('❌ Erro ao buscar roles:', rolesError.message);
  } else {
    console.log('\n👥 Total de user_roles:', roles?.length || 0);
    if (roles && roles.length > 0) {
      roles.forEach(r => {
        console.log(`  - User ID: ${r.user_id} | Role: ${r.role} | Ativo: ${r.ativo}`);
      });
    }
  }
  
  // Verificar tabela clinicas
  const { data: clinicas, error: clinicasError } = await supabase
    .from('clinicas')
    .select('id, nome, criado_em')
    .limit(5);
  
  if (clinicasError) {
    console.error('❌ Erro ao buscar clínicas:', clinicasError.message);
  } else {
    console.log('\n🏥 Total de clínicas (amostra):', clinicas?.length || 0);
  }
}

checkUsers().catch(console.error);