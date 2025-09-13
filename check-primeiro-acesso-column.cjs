const { createClient } = require('@supabase/supabase-js');

// Ler variáveis do arquivo .env manualmente
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
// Fallback para ANON KEY se PUBLISHABLE_KEY não existir
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseKey ? 'Present' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  console.log('Available env vars:', Object.keys(env));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPrimeiroAcessoColumn() {
  try {
    console.log('🔍 Verificando se a coluna primeiro_acesso existe na tabela profiles...');
    
    // Tentar fazer uma query que usa a coluna primeiro_acesso
    const { data, error } = await supabase
      .from('profiles')
      .select('id, primeiro_acesso')
      .limit(1);
    
    if (error) {
      if (error.message.includes('column "primeiro_acesso" does not exist')) {
        console.log('❌ A coluna primeiro_acesso NÃO existe na tabela profiles');
        console.log('🔧 Será necessário adicionar a coluna ao banco de dados');
        return false;
      } else {
        console.error('❌ Erro ao verificar a coluna:', error.message);
        return false;
      }
    }
    
    console.log('✅ A coluna primeiro_acesso existe na tabela profiles');
    console.log('📊 Dados encontrados:', data?.length || 0, 'registros');
    
    // Verificar quantos usuários têm primeiro_acesso = true
    const { data: firstAccessUsers, error: countError } = await supabase
      .from('profiles')
      .select('id, email, primeiro_acesso')
      .eq('primeiro_acesso', true);
    
    if (!countError) {
      console.log('👥 Usuários com primeiro_acesso = true:', firstAccessUsers?.length || 0);
      if (firstAccessUsers && firstAccessUsers.length > 0) {
        console.log('📋 Lista de usuários:');
        firstAccessUsers.forEach(user => {
          console.log(`  - ${user.email} (ID: ${user.id})`);
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    return false;
  }
}

async function addPrimeiroAcessoColumn() {
  try {
    console.log('🔧 Adicionando coluna primeiro_acesso à tabela profiles...');
    
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.profiles 
        ADD COLUMN IF NOT EXISTS primeiro_acesso BOOLEAN DEFAULT true NOT NULL;
        
        -- Atualizar usuários existentes para não precisarem de onboarding
        UPDATE public.profiles 
        SET primeiro_acesso = false 
        WHERE primeiro_acesso IS NULL OR primeiro_acesso = true;
      `
    });
    
    if (error) {
      console.error('❌ Erro ao adicionar coluna:', error.message);
      return false;
    }
    
    console.log('✅ Coluna primeiro_acesso adicionada com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro inesperado ao adicionar coluna:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando verificação da coluna primeiro_acesso...\n');
  
  const columnExists = await checkPrimeiroAcessoColumn();
  
  if (!columnExists) {
    console.log('\n🔧 Tentando adicionar a coluna...');
    const added = await addPrimeiroAcessoColumn();
    
    if (added) {
      console.log('\n✅ Verificando novamente...');
      await checkPrimeiroAcessoColumn();
    }
  }
  
  console.log('\n🏁 Verificação concluída');
}

main().catch(console.error);