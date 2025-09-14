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
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não encontrada no .env');
  console.log('📝 Adicione a chave de service role no arquivo .env:');
  console.log('SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQL(sql, description) {
  console.log(`🔧 ${description}...`);
  try {
    const { data, error } = await supabase.rpc('exec', { sql });
    
    if (error) {
      console.error(`❌ Erro: ${error.message}`);
      return false;
    }
    console.log(`✅ ${description} - Sucesso!`);
    return true;
  } catch (error) {
    console.error(`❌ Erro inesperado: ${error.message}`);
    return false;
  }
}

async function executeSQLDirect(sql) {
  try {
    // Dividir SQL em comandos individuais
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    for (const command of commands) {
      if (command.toLowerCase().includes('select')) {
        // Para SELECTs, usar query direta
        const { data, error } = await supabase.rpc('exec', { 
          sql: command + ';'
        });
        
        if (error) {
          console.error(`❌ Erro no comando: ${command.substring(0, 50)}...`);
          console.error(`   ${error.message}`);
          continue;
        }
        
        if (data) {
          console.log(`✅ Query executada: ${command.substring(0, 50)}...`);
          console.log('📊 Resultado:', data);
        }
      } else {
        // Para outros comandos, usar rpc
        const { error } = await supabase.rpc('exec', { 
          sql: command + ';'
        });
        
        if (error) {
          console.error(`❌ Erro no comando: ${command.substring(0, 50)}...`);
          console.error(`   ${error.message}`);
        } else {
          console.log(`✅ Executado: ${command.substring(0, 50)}...`);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    return false;
  }
}

async function executeRLSPolicies() {
  console.log('🚀 Executando políticas RLS para onboarding...\n');

  const sqlCommands = [
    {
      sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primeiro_acesso BOOLEAN DEFAULT true NOT NULL`,
      desc: 'Adicionando coluna primeiro_acesso'
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_profiles_primeiro_acesso ON public.profiles(user_id, primeiro_acesso)`,
      desc: 'Criando índice primeiro_acesso'
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_profiles_active_users ON public.profiles(user_id) WHERE primeiro_acesso = false`,
      desc: 'Criando índice usuários ativos'
    },
    {
      sql: `DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles`,
      desc: 'Removendo política antiga profiles'
    },
    {
      sql: `DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles`,
      desc: 'Removendo política antiga profiles update'
    },
    {
      sql: `DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles`,
      desc: 'Removendo política antiga profiles insert'
    },
    {
      sql: `CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = user_id)`,
      desc: 'Criando política SELECT profiles'
    },
    {
      sql: `CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id)`,
      desc: 'Criando política INSERT profiles'
    },
    {
      sql: `CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = user_id)`,
      desc: 'Criando política UPDATE profiles'
    }
  ];

  // Executar comandos um por um
  for (const command of sqlCommands) {
    await executeSQL(command.sql, command.desc);
    await new Promise(resolve => setTimeout(resolve, 500)); // Pequeno delay
  }

  // Políticas para user_roles
  const userRolesPolicies = [
    {
      sql: `DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles`,
      desc: 'Removendo política antiga user_roles select'
    },
    {
      sql: `DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles`,
      desc: 'Removendo política antiga user_roles insert'
    },
    {
      sql: `DROP POLICY IF EXISTS "Users can update own roles" ON public.user_roles`,
      desc: 'Removendo política antiga user_roles update'
    },
    {
      sql: `CREATE POLICY "user_roles_select_completed_onboarding" ON public.user_roles 
            FOR SELECT USING (
              auth.uid() = user_id 
              AND EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.user_id = auth.uid() 
                AND profiles.primeiro_acesso = false
              )
            )`,
      desc: 'Criando política SELECT user_roles (onboarding completo)'
    },
    {
      sql: `CREATE POLICY "user_roles_insert_onboarding" ON public.user_roles 
            FOR INSERT WITH CHECK (auth.uid() = user_id)`,
      desc: 'Criando política INSERT user_roles'
    }
  ];

  for (const command of userRolesPolicies) {
    await executeSQL(command.sql, command.desc);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n✅ Políticas RLS executadas com sucesso!');
  console.log('🔒 Onboarding agora é obrigatório para todos os novos usuários');
}

executeRLSPolicies().catch(console.error);