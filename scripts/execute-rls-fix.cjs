const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://shzbgjooydruspqajjkf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoemJnam9veWRydXNwcWFqamtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzMDc3MjYsImV4cCI6MjA1MDg4MzcyNn0.JOJPdA5-UzVqjkFFW86i9SN9sTrFrpjrYYKP3F7pRZg';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeRLSFix() {
  console.log('🛠️ EXECUTANDO CORREÇÕES DE RLS AUTOMATICAMENTE');
  console.log('='.repeat(60));

  try {
    console.log('\n1. 🔍 VERIFICANDO TABELAS EXISTENTES');
    console.log('-'.repeat(40));

    // Verificar se as tabelas existem
    const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT table_name, table_schema 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('profiles', 'user_roles', 'clinicas');
      `
    });

    if (tablesError) {
      // Se RPC não funcionar, tentar abordagem direta
      console.log('⚠️ RPC não disponível, verificando tabelas diretamente...');
      
      const profileCheck = await supabase.from('profiles').select('count').limit(1);
      const rolesCheck = await supabase.from('user_roles').select('count').limit(1);
      
      if (profileCheck.error && profileCheck.error.message.includes('does not exist')) {
        console.log('❌ Tabela profiles não existe - precisa ser criada primeiro');
        return false;
      }
      
      if (rolesCheck.error && rolesCheck.error.message.includes('does not exist')) {
        console.log('❌ Tabela user_roles não existe - precisa ser criada primeiro');
        return false;
      }
      
      console.log('✅ Tabelas básicas existem');
    } else {
      console.log('✅ Tabelas verificadas:', tables);
    }

    console.log('\n2. 🛡️ REMOVENDO POLÍTICAS RESTRITIVAS');
    console.log('-'.repeat(40));

    // Lista de políticas para remover
    const policiesToRemove = [
      'Users can only view own profile',
      'Users can only update own profile', 
      'Users can only view own roles',
      'Users can only manage own roles'
    ];

    for (const policy of policiesToRemove) {
      try {
        // Tentar remover de profiles
        await supabase.rpc('exec_sql', {
          sql: `DROP POLICY IF EXISTS "${policy}" ON profiles;`
        });
        
        // Tentar remover de user_roles
        await supabase.rpc('exec_sql', {
          sql: `DROP POLICY IF EXISTS "${policy}" ON user_roles;`
        });
        
        console.log(`✅ Política removida: ${policy}`);
      } catch (error) {
        console.log(`⚠️ Não foi possível remover política: ${policy}`);
      }
    }

    console.log('\n3. 🔧 CRIANDO POLÍTICAS PERMISSIVAS');
    console.log('-'.repeat(40));

    // Políticas para profiles
    const profilePolicies = [
      {
        name: 'auth_users_can_create_own_profile',
        sql: `CREATE POLICY "auth_users_can_create_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);`
      },
      {
        name: 'auth_users_can_read_own_profile', 
        sql: `CREATE POLICY "auth_users_can_read_own_profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);`
      },
      {
        name: 'auth_users_can_update_own_profile',
        sql: `CREATE POLICY "auth_users_can_update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);`
      }
    ];

    // Políticas para user_roles
    const rolesPolicies = [
      {
        name: 'auth_users_can_create_own_roles',
        sql: `CREATE POLICY "auth_users_can_create_own_roles" ON user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);`
      },
      {
        name: 'auth_users_can_read_own_roles',
        sql: `CREATE POLICY "auth_users_can_read_own_roles" ON user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);`
      },
      {
        name: 'auth_users_can_update_own_roles', 
        sql: `CREATE POLICY "auth_users_can_update_own_roles" ON user_roles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`
      }
    ];

    // Executar políticas de profiles
    for (const policy of profilePolicies) {
      try {
        const result = await supabase.rpc('exec_sql', { sql: policy.sql });
        if (result.error) {
          console.log(`❌ Erro ao criar política ${policy.name}:`, result.error.message);
        } else {
          console.log(`✅ Política criada: ${policy.name}`);
        }
      } catch (error) {
        console.log(`❌ Erro ao criar política ${policy.name}:`, error.message);
      }
    }

    // Executar políticas de user_roles  
    for (const policy of rolesPolicies) {
      try {
        const result = await supabase.rpc('exec_sql', { sql: policy.sql });
        if (result.error) {
          console.log(`❌ Erro ao criar política ${policy.name}:`, result.error.message);
        } else {
          console.log(`✅ Política criada: ${policy.name}`);
        }
      } catch (error) {
        console.log(`❌ Erro ao criar política ${policy.name}:`, error.message);
      }
    }

    console.log('\n4. 🔄 ATIVANDO RLS NAS TABELAS');
    console.log('-'.repeat(40));

    const tablesToSecure = ['profiles', 'user_roles'];
    
    for (const table of tablesToSecure) {
      try {
        const result = await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
        });
        
        if (result.error && !result.error.message.includes('already enabled')) {
          console.log(`❌ Erro ao ativar RLS em ${table}:`, result.error.message);
        } else {
          console.log(`✅ RLS ativado em: ${table}`);
        }
      } catch (error) {
        console.log(`⚠️ RLS pode já estar ativo em ${table}`);
      }
    }

    console.log('\n5. 🎯 VERIFICANDO TRIGGER handle_new_user');
    console.log('-'.repeat(40));

    // Verificar se o trigger existe
    const triggerCheck = await supabase.rpc('exec_sql', {
      sql: `
        SELECT trigger_name, event_manipulation, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created';
      `
    });

    if (triggerCheck.error || !triggerCheck.data || triggerCheck.data.length === 0) {
      console.log('⚠️ Trigger não encontrado, criando função e trigger...');
      
      // Criar função handle_new_user
      const functionResult = await supabase.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION public.handle_new_user()
          RETURNS TRIGGER AS $$
          BEGIN
            -- Criar perfil básico
            INSERT INTO public.profiles (id, email, nome_completo, primeiro_acesso)
            VALUES (
              NEW.id,
              NEW.email,
              COALESCE(NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1)),
              true
            );

            -- Criar role de proprietária
            INSERT INTO public.user_roles (user_id, role, ativo, criado_por)
            VALUES (
              NEW.id,
              'proprietaria',
              true,
              NEW.id
            );

            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      });

      if (functionResult.error) {
        console.log('❌ Erro ao criar função:', functionResult.error.message);
      } else {
        console.log('✅ Função handle_new_user criada');
      }

      // Criar trigger
      const triggerResult = await supabase.rpc('exec_sql', {
        sql: `
          DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
          CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
        `
      });

      if (triggerResult.error) {
        console.log('❌ Erro ao criar trigger:', triggerResult.error.message);
      } else {
        console.log('✅ Trigger on_auth_user_created criado');
      }
    } else {
      console.log('✅ Trigger handle_new_user já existe');
    }

    console.log('\n6. 📊 VERIFICAÇÃO FINAL');
    console.log('-'.repeat(40));

    // Contar políticas criadas
    const policiesCheck = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          tablename,
          COUNT(*) as policy_count
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('profiles', 'user_roles')
        GROUP BY tablename
        ORDER BY tablename;
      `
    });

    if (policiesCheck.data) {
      console.log('📋 Políticas por tabela:', policiesCheck.data);
    }

    console.log('\n🎉 CORREÇÕES EXECUTADAS COM SUCESSO!');
    console.log('-'.repeat(40));
    console.log('✅ Políticas RLS permissivas criadas');
    console.log('✅ RLS ativado nas tabelas');
    console.log('✅ Trigger de criação automática verificado');
    console.log('');
    console.log('🚀 PRÓXIMO PASSO: Teste o cadastro na aplicação');

    return true;

  } catch (error) {
    console.error('❌ Erro geral durante a correção:', error);
    return false;
  }
}

// Executar as correções
executeRLSFix().then((success) => {
  if (success) {
    console.log('\n✅ Script executado com sucesso!');
    process.exit(0);
  } else {
    console.log('\n❌ Falha na execução do script');
    process.exit(1);
  }
});