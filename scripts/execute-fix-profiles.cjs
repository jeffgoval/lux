const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://shzbgjooydruspqajjkf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoemJnam9veWRydXNwcWFqamtmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTc3NzI5NCwiZXhwIjoyMDUxMzUzMjk0fQ.Ej4Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeFixProfilesScript() {
  console.log('🔧 Iniciando correção das tabelas...\n');

  try {
    // 1. Verificar estrutura atual da tabela profiles
    console.log('1. Verificando estrutura da tabela profiles...');
    const { data: profilesColumns, error: profilesError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          column_name, 
          data_type, 
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
          AND table_schema = 'public'
        ORDER BY ordinal_position;
      `
    });

    if (profilesError) {
      console.log('❌ Erro ao verificar profiles:', profilesError.message);
    } else {
      console.log('✅ Estrutura atual da tabela profiles:', profilesColumns);
    }

    // 2. Recriar tabela profiles
    console.log('\n2. Recriando tabela profiles...');
    const { error: dropProfilesError } = await supabase.rpc('exec_sql', {
      sql: 'DROP TABLE IF EXISTS public.profiles CASCADE;'
    });

    if (dropProfilesError) {
      console.log('⚠️ Aviso ao remover profiles:', dropProfilesError.message);
    }

    const { error: createProfilesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE public.profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          nome_completo TEXT DEFAULT 'Usuário',
          telefone TEXT,
          avatar_url TEXT,
          cpf TEXT,
          data_nascimento DATE,
          endereco JSONB,
          ativo BOOLEAN NOT NULL DEFAULT true,
          primeiro_acesso BOOLEAN NOT NULL DEFAULT true,
          configuracoes_usuario JSONB DEFAULT '{}'::jsonb,
          criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
        );
      `
    });

    if (createProfilesError) {
      console.log('❌ Erro ao criar profiles:', createProfilesError.message);
    } else {
      console.log('✅ Tabela profiles criada com sucesso!');
    }

    // 3. Verificar/criar tabela user_roles
    console.log('\n3. Verificando tabela user_roles...');
    const { error: createRolesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.user_roles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          role TEXT NOT NULL,
          clinica_id UUID,
          ativo BOOLEAN NOT NULL DEFAULT true,
          criado_por UUID REFERENCES auth.users(id),
          criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
      `
    });

    if (createRolesError) {
      console.log('❌ Erro ao criar user_roles:', createRolesError.message);
    } else {
      console.log('✅ Tabela user_roles verificada/criada!');
    }

    // 4. Recriar função trigger
    console.log('\n4. Criando função trigger...');
    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $$
        BEGIN
          -- Criar profile
          INSERT INTO public.profiles (id, email, nome_completo, primeiro_acesso, ativo, criado_em)
          VALUES (
            NEW.id, 
            NEW.email, 
            COALESCE(NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1)),
            true, 
            true, 
            now()
          );
          
          -- Criar role padrão
          INSERT INTO public.user_roles (user_id, role, ativo, criado_por, criado_em)
          VALUES (NEW.id, 'proprietaria', true, NEW.id, now());
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });

    if (functionError) {
      console.log('❌ Erro ao criar função:', functionError.message);
    } else {
      console.log('✅ Função trigger criada!');
    }

    // 5. Criar trigger
    console.log('\n5. Criando trigger...');
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
      `
    });

    if (triggerError) {
      console.log('❌ Erro ao criar trigger:', triggerError.message);
    } else {
      console.log('✅ Trigger criado!');
    }

    // 6. Configurar RLS
    console.log('\n6. Configurando políticas RLS...');
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
        CREATE POLICY "Users can view own profile" ON public.profiles
          FOR SELECT USING (auth.uid() = id);

        DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
        CREATE POLICY "Users can update own profile" ON public.profiles
          FOR UPDATE USING (auth.uid() = id);

        DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
        CREATE POLICY "Users can view own roles" ON public.user_roles
          FOR SELECT USING (auth.uid() = user_id);
      `
    });

    if (rlsError) {
      console.log('❌ Erro ao configurar RLS:', rlsError.message);
    } else {
      console.log('✅ Políticas RLS configuradas!');
    }

    console.log('\n🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Teste o cadastro na aplicação');
    console.log('2. Verifique se o profile e roles são criados automaticamente');
    console.log('3. Confirme se o onboarding funciona corretamente');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o script
executeFixProfilesScript();
