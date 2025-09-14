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
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function debugProfileStructure() {
  console.log('🔍 Diagnosticando estrutura da tabela profiles...\n');

  try {
    // 1. Tentar criar usuário de teste
    console.log('1. Criando usuário de teste...');
    const testEmail = `debug-${Date.now()}@example.com`;
    
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'test123456'
    });

    if (signUpError) {
      console.error('❌ Erro ao criar usuário:', signUpError.message);
      return;
    }

    const userId = authData.user?.id;
    console.log(`✅ Usuário criado: ID = ${userId}`);

    // 2. Fazer login
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: 'test123456'
    });

    if (signInError) {
      console.error('❌ Erro no login:', signInError.message);
      return;
    }

    console.log('✅ Login realizado');

    // 3. Tentar inserir profile com UUID manual
    console.log('\n2. Tentando criar profile com UUID manual...');
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: crypto.randomUUID(),
        user_id: userId,
        email: testEmail,
        nome_completo: 'Debug User',
        primeiro_acesso: true
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Erro detalhado:', JSON.stringify(profileError, null, 2));
      
      // Tentar sem especificar ID
      console.log('\n3. Tentando criar profile SEM especificar ID...');
      
      const { data: profileData2, error: profileError2 } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          email: testEmail,
          nome_completo: 'Debug User 2',
          primeiro_acesso: true
        })
        .select()
        .single();
        
      if (profileError2) {
        console.error('❌ Erro sem ID:', JSON.stringify(profileError2, null, 2));
        
        console.log('\n🔧 DIAGNÓSTICO:');
        console.log('- Problema na estrutura da tabela profiles');
        console.log('- Possível problema de foreign key ou constraints');
        console.log('- Necessário recriar a tabela');
        
        console.log('\n📋 EXECUTE ESTE SQL NO SUPABASE:');
        console.log('-- Verificar estrutura atual');
        console.log('\\d profiles;');
        console.log('');
        console.log('-- Se necessário, recriar tabela');
        console.log('DROP TABLE IF EXISTS profiles CASCADE;');
        console.log('');
        console.log('CREATE TABLE profiles (');
        console.log('  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,');
        console.log('  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,');
        console.log('  nome_completo TEXT NOT NULL,');
        console.log('  email TEXT NOT NULL,');
        console.log('  telefone TEXT,');
        console.log('  avatar_url TEXT,');
        console.log('  ativo BOOLEAN DEFAULT true NOT NULL,');
        console.log('  primeiro_acesso BOOLEAN DEFAULT true NOT NULL,');
        console.log('  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,');
        console.log('  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL');
        console.log(');');
        console.log('');
        console.log('-- Habilitar RLS');
        console.log('ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;');
        console.log('');
        console.log('-- Políticas básicas');
        console.log('CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = user_id);');
        console.log('CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);');
        console.log('CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = user_id);');
        
      } else {
        console.log('✅ Profile criado sem especificar ID!');
        console.log('📊 Dados:', profileData2);
        
        // Testar fluxo completo
        console.log('\n4. Testando fluxo de onboarding completo...');
        
        // Criar role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'proprietaria',
            ativo: true,
            criado_por: userId
          });
          
        if (roleError) {
          console.log('❌ Erro ao criar role:', roleError.message);
        } else {
          console.log('✅ Role criada');
        }
        
        // Marcar onboarding completo
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ primeiro_acesso: false })
          .eq('user_id', userId);
          
        if (updateError) {
          console.log('❌ Erro ao completar onboarding:', updateError.message);
        } else {
          console.log('✅ Onboarding marcado como completo');
        }
        
        console.log('\n🎉 FLUXO BÁSICO FUNCIONANDO!');
        console.log('🔍 Problema pode estar no frontend ou na lógica de redirecionamento');
      }
    } else {
      console.log('✅ Profile criado com UUID manual!');
      console.log('📊 Dados:', profileData);
    }

    // Cleanup
    await supabase.from('profiles').delete().eq('user_id', userId);
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

debugProfileStructure().catch(console.error);