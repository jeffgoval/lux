/**
 * 🚀 EXECUTAR SETUP COMPLETO DO SISTEMA DE AUTENTICAÇÃO V2
 * 
 * Este script executa o SQL diretamente via Supabase client
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function executeAuthSetup() {
  console.log('🚀 EXECUTANDO SETUP COMPLETO DO SISTEMA DE AUTENTICAÇÃO V2\n');

  try {
    // ========================================================================
    // 1. REMOVER TRIGGER E FUNÇÃO EXISTENTES
    // ========================================================================
    console.log('🧹 1. Removendo trigger e função existentes...');
    
    const cleanupSQL = `
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      DROP FUNCTION IF EXISTS public.handle_new_user();
    `;

    const { error: cleanupError } = await supabase.rpc('exec_sql', { 
      sql_query: cleanupSQL 
    });

    if (cleanupError && !cleanupError.message.includes('does not exist')) {
      console.log('⚠️ Aviso na limpeza:', cleanupError.message);
    } else {
      console.log('✅ Limpeza concluída');
    }

    // ========================================================================
    // 2. RECRIAR TABELA PROFILES
    // ========================================================================
    console.log('\n📋 2. Recriando tabela profiles...');
    
    const profilesSQL = `
      DROP TABLE IF EXISTS public.profiles CASCADE;
      
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
    `;

    const { error: profilesError } = await supabase.rpc('exec_sql', { 
      sql_query: profilesSQL 
    });

    if (profilesError) {
      console.error('❌ Erro ao criar tabela profiles:', profilesError.message);
      return;
    }

    console.log('✅ Tabela profiles criada');

    // ========================================================================
    // 3. CRIAR ENUM E TABELA USER_ROLES
    // ========================================================================
    console.log('\n🎭 3. Criando enum e tabela user_roles...');
    
    const rolesSQL = `
      DO $$ BEGIN
          CREATE TYPE user_role_type AS ENUM (
              'super_admin',
              'proprietaria', 
              'gerente',
              'profissionais',
              'recepcionistas',
              'visitante',
              'cliente'
          );
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      DROP TABLE IF EXISTS public.user_roles CASCADE;

      CREATE TABLE public.user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        role user_role_type NOT NULL DEFAULT 'proprietaria',
        clinica_id UUID,
        ativo BOOLEAN NOT NULL DEFAULT true,
        criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        criado_por UUID REFERENCES auth.users(id),
        
        UNIQUE(user_id, role, clinica_id)
      );
    `;

    const { error: rolesError } = await supabase.rpc('exec_sql', { 
      sql_query: rolesSQL 
    });

    if (rolesError) {
      console.error('❌ Erro ao criar tabela user_roles:', rolesError.message);
      return;
    }

    console.log('✅ Enum e tabela user_roles criados');

    // ========================================================================
    // 4. CRIAR FUNÇÃO DE TRIGGER
    // ========================================================================
    console.log('\n⚙️ 4. Criando função de trigger...');
    
    const functionSQL = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        -- 1. Criar perfil automaticamente
        INSERT INTO public.profiles (
          id, 
          email, 
          nome_completo,
          primeiro_acesso,
          ativo,
          criado_em
        ) VALUES (
          NEW.id,
          NEW.email,
          COALESCE(
            NEW.raw_user_meta_data->>'nome_completo',
            NEW.raw_user_meta_data->>'full_name',
            split_part(NEW.email, '@', 1),
            'Usuário'
          ),
          true,
          true,
          now()
        )
        ON CONFLICT (id) DO UPDATE SET
          email = NEW.email,
          atualizado_em = now();

        -- 2. Criar role padrão de proprietária
        INSERT INTO public.user_roles (
          user_id, 
          role, 
          ativo, 
          criado_por,
          criado_em
        ) VALUES (
          NEW.id,
          'proprietaria',
          true,
          NEW.id,
          now()
        )
        ON CONFLICT (user_id, role, clinica_id) DO NOTHING;

        RETURN NEW;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Erro ao criar perfil/role para usuário %: %', NEW.id, SQLERRM;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: functionError } = await supabase.rpc('exec_sql', { 
      sql_query: functionSQL 
    });

    if (functionError) {
      console.error('❌ Erro ao criar função:', functionError.message);
      return;
    }

    console.log('✅ Função de trigger criada');

    // ========================================================================
    // 5. CRIAR TRIGGER
    // ========================================================================
    console.log('\n🔗 5. Criando trigger...');
    
    const triggerSQL = `
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `;

    const { error: triggerError } = await supabase.rpc('exec_sql', { 
      sql_query: triggerSQL 
    });

    if (triggerError) {
      console.error('❌ Erro ao criar trigger:', triggerError.message);
      return;
    }

    console.log('✅ Trigger criado');

    // ========================================================================
    // 6. HABILITAR RLS E CRIAR POLÍTICAS
    // ========================================================================
    console.log('\n🔒 6. Configurando RLS e políticas...');
    
    const rlsSQL = `
      -- Habilitar RLS
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

      -- Políticas para profiles
      CREATE POLICY "Users can view own profile" ON public.profiles
        FOR SELECT USING (auth.uid() = id);

      CREATE POLICY "Users can update own profile" ON public.profiles
        FOR UPDATE USING (auth.uid() = id);

      CREATE POLICY "Users can insert own profile" ON public.profiles
        FOR INSERT WITH CHECK (auth.uid() = id);

      -- Políticas para user_roles
      CREATE POLICY "Users can view own roles" ON public.user_roles
        FOR SELECT USING (auth.uid() = user_id);

      CREATE POLICY "Users can insert own roles" ON public.user_roles
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    `;

    const { error: rlsError } = await supabase.rpc('exec_sql', { 
      sql_query: rlsSQL 
    });

    if (rlsError) {
      console.error('❌ Erro ao configurar RLS:', rlsError.message);
      return;
    }

    console.log('✅ RLS e políticas configurados');

    // ========================================================================
    // 7. CRIAR FUNÇÃO DE UPDATE TIMESTAMP
    // ========================================================================
    console.log('\n⏰ 7. Criando função de update timestamp...');
    
    const timestampSQL = `
      CREATE OR REPLACE FUNCTION public.update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.atualizado_em = now();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER update_profiles_updated_at 
        BEFORE UPDATE ON public.profiles 
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    `;

    const { error: timestampError } = await supabase.rpc('exec_sql', { 
      sql_query: timestampSQL 
    });

    if (timestampError) {
      console.error('❌ Erro ao criar função de timestamp:', timestampError.message);
      return;
    }

    console.log('✅ Função de timestamp criada');

    // ========================================================================
    // 8. VERIFICAÇÃO FINAL
    // ========================================================================
    console.log('\n🔍 8. Verificação final...');
    
    // Verificar tabelas
    const { data: profilesData, error: profilesCheckError } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });

    const { data: rolesData, error: rolesCheckError } = await supabase
      .from('user_roles')
      .select('count', { count: 'exact', head: true });

    if (profilesCheckError || rolesCheckError) {
      console.error('❌ Erro na verificação:', profilesCheckError || rolesCheckError);
      return;
    }

    console.log('✅ Tabelas verificadas:');
    console.log(`   📋 profiles: ${profilesData?.length || 0} registros`);
    console.log(`   🎭 user_roles: ${rolesData?.length || 0} registros`);

    console.log('\n🎉 SETUP COMPLETO EXECUTADO COM SUCESSO!');
    console.log('\n📋 O que foi criado:');
    console.log('   ✅ Tabela profiles com campos corretos');
    console.log('   ✅ Tabela user_roles com enum de roles');
    console.log('   ✅ Trigger automático para novos usuários');
    console.log('   ✅ Políticas RLS básicas');
    console.log('   ✅ Função de atualização de timestamp');
    console.log('\n🎯 Próximos passos:');
    console.log('   1. Testar cadastro de novo usuário');
    console.log('   2. Verificar se profile e role são criados automaticamente');
    console.log('   3. Testar fluxo de onboarding');

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  }
}

// Executar setup
executeAuthSetup()
  .then(() => {
    console.log('\n✅ SCRIPT FINALIZADO!');
  })
  .catch(console.error);
