const fetch = require('node-fetch');
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

async function executeSQL(sql, description) {
  console.log(`🔧 ${description}...`);
  
  try {
    const response = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ ${description} - Erro:`, error);
      return false;
    }

    console.log(`✅ ${description} - Sucesso!`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} - Erro:`, error.message);
    return false;
  }
}

async function executeViaPostgREST(sql, description) {
  console.log(`🔧 ${description}...`);
  
  try {
    // Try different approach - direct SQL execution
    const response = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.pgrst.object+json',
        'apikey': env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: sql
    });

    const result = await response.text();
    console.log(`📋 Resposta:`, result);
    
    return response.ok;
  } catch (error) {
    console.error(`❌ ${description} - Erro:`, error.message);
    return false;
  }
}

async function directDatabaseExecution() {
  console.log('🚀 Executando correções SQL diretamente...\n');

  const commands = [
    {
      sql: "ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();",
      desc: "Corrigindo default UUID na tabela profiles"
    },
    {
      sql: "ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primeiro_acesso BOOLEAN DEFAULT true NOT NULL;",
      desc: "Adicionando coluna primeiro_acesso"
    },
    {
      sql: "CREATE INDEX IF NOT EXISTS idx_profiles_primeiro_acesso ON public.profiles(user_id, primeiro_acesso);",
      desc: "Criando índice de performance"
    },
    {
      sql: `DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;`,
      desc: "Removendo política antiga de profiles"
    },
    {
      sql: `CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = user_id);`,
      desc: "Criando política SELECT para profiles"
    },
    {
      sql: `CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);`,
      desc: "Criando política INSERT para profiles"  
    },
    {
      sql: `CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);`,
      desc: "Criando política UPDATE para profiles"
    }
  ];

  let success = 0;
  let total = commands.length;

  for (const command of commands) {
    const result = await executeSQL(command.sql, command.desc);
    if (result) success++;
    
    // Small delay between commands
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n📊 Resultado: ${success}/${total} comandos executados com sucesso`);
  
  if (success === total) {
    console.log('🎉 Todas as correções foram aplicadas!');
    console.log('🧪 Executando teste para verificar...');
    return true;
  } else {
    console.log('⚠️  Algumas correções falharam. Tentando método alternativo...');
    return false;
  }
}

async function tryAlternativeMethod() {
  console.log('\n🔄 Tentando método alternativo...');
  
  // Create a simple test to see if we can connect
  try {
    const response = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/profiles?select=count`, {
      method: 'GET',
      headers: {
        'apikey': env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`
      }
    });

    if (response.ok) {
      console.log('✅ Conexão com Supabase OK');
      console.log('📝 O SQL precisa ser executado manualmente no painel do Supabase');
      console.log('🔗 URL: https://supabase.com/dashboard/project/dvnyfwpphuuujhodqkko/sql');
      
      return false;
    } else {
      console.log('❌ Problema de conexão:', await response.text());
      return false;
    }
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    return false;
  }
}

async function main() {
  console.log('🎯 EXECUTANDO CORREÇÕES DE ONBOARDING\n');
  
  const success = await directDatabaseExecution();
  
  if (!success) {
    await tryAlternativeMethod();
    
    console.log('\n📋 INSTRUÇÕES MANUAIS:');
    console.log('1. Abrir: https://supabase.com/dashboard/project/dvnyfwpphuuujhodqkko/sql');
    console.log('2. Executar o conteúdo do arquivo: apply-sql-direct.js');
    console.log('3. Testar novamente com: node test-onboarding-flow.cjs');
  } else {
    console.log('\n🧪 Testando fluxo após correções...');
    // Run the test
    const { spawn } = require('child_process');
    const testProcess = spawn('node', ['test-onboarding-flow.cjs'], { stdio: 'inherit' });
  }
}

main().catch(console.error);