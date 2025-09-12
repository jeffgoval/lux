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
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUserProfiles() {
  try {
    console.log('🔍 Verificando usuários na tabela profiles...\n');
    
    // Verificar todos os profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('criado_em', { ascending: false });
    
    if (profilesError) {
      console.error('❌ Erro ao buscar profiles:', profilesError.message);
      return;
    }
    
    console.log(`📊 Total de profiles encontrados: ${profiles?.length || 0}\n`);
    
    if (profiles && profiles.length > 0) {
      profiles.forEach((profile, index) => {
        console.log(`👤 Profile ${index + 1}:`);
        console.log(`  ID: ${profile.id}`);
        console.log(`  User ID: ${profile.user_id}`);
        console.log(`  Email: ${profile.email}`);
        console.log(`  Nome: ${profile.nome_completo}`);
        console.log(`  Primeiro Acesso: ${profile.primeiro_acesso}`);
        console.log(`  Ativo: ${profile.ativo}`);
        console.log(`  Criado em: ${profile.criado_em}`);
        console.log('');
      });
    }
    
    // Verificar usuários autenticados
    console.log('🔍 Verificando usuários autenticados...\n');
    
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('⚠️  Não foi possível acessar usuários auth (precisa de service key)');
    } else {
      console.log(`👥 Total de usuários auth: ${authUsers?.users?.length || 0}\n`);
      
      if (authUsers?.users && authUsers.users.length > 0) {
        authUsers.users.forEach((user, index) => {
          console.log(`🔐 Auth User ${index + 1}:`);
          console.log(`  ID: ${user.id}`);
          console.log(`  Email: ${user.email}`);
          console.log(`  Criado em: ${user.created_at}`);
          console.log(`  Último login: ${user.last_sign_in_at}`);
          console.log('');
        });
      }
    }
    
    // Verificar roles
    console.log('🔍 Verificando roles de usuários...\n');
    
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .order('criado_em', { ascending: false });
    
    if (rolesError) {
      console.error('❌ Erro ao buscar roles:', rolesError.message);
    } else {
      console.log(`🎭 Total de roles encontrados: ${roles?.length || 0}\n`);
      
      if (roles && roles.length > 0) {
        roles.forEach((role, index) => {
          console.log(`🎭 Role ${index + 1}:`);
          console.log(`  ID: ${role.id}`);
          console.log(`  User ID: ${role.user_id}`);
          console.log(`  Role: ${role.role}`);
          console.log(`  Ativo: ${role.ativo}`);
          console.log(`  Criado em: ${role.criado_em}`);
          console.log('');
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

debugUserProfiles().catch(console.error);