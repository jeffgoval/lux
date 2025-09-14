const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://shzbgjooydruspqajjkf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoemJnam9veWRydXNwcWFqamtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTY4ODcsImV4cCI6MjA3MzM3Mjg4N30.yJGgiGL0PmbakvtbNh9P5cWDKyESIkTzUCX9rRiVpKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnoseProfiles() {
  console.log('🔍 Diagnosticando tabela profiles...\n');

  try {
    // 1. Testar cadastro de usuário para ver o erro exato
    console.log('1. Testando cadastro de usuário...');
    
    const testEmail = `teste-${Date.now()}@exemplo.com`;
    const testPassword = '123456';
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          nome_completo: 'Usuário Teste'
        }
      }
    });

    if (authError) {
      console.log('❌ Erro no cadastro:', authError.message);
      return;
    }

    if (authData.user) {
      console.log('✅ Usuário criado:', authData.user.id);
      
      // Aguardar trigger executar
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 2. Tentar buscar profile criado
      console.log('\n2. Buscando profile criado...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.log('❌ Erro ao buscar profile:', profileError.message);
        console.log('📋 Detalhes:', profileError);
      } else {
        console.log('✅ Profile encontrado:', profile);
      }

      // 3. Tentar buscar roles
      console.log('\n3. Buscando roles criadas...');
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', authData.user.id);

      if (rolesError) {
        console.log('❌ Erro ao buscar roles:', rolesError.message);
        console.log('📋 Detalhes:', rolesError);
      } else {
        console.log('✅ Roles encontradas:', roles);
      }

      // 4. Fazer login para testar com usuário autenticado
      console.log('\n4. Fazendo login para testar com usuário autenticado...');
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });

      if (loginError) {
        console.log('❌ Erro no login:', loginError.message);
      } else {
        console.log('✅ Login realizado com sucesso');
        
        // Tentar buscar profile como usuário autenticado
        const { data: authProfile, error: authProfileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (authProfileError) {
          console.log('❌ Erro ao buscar profile autenticado:', authProfileError.message);
        } else {
          console.log('✅ Profile encontrado como usuário autenticado:', authProfile);
        }
      }

      // 5. Limpar usuário de teste
      console.log('\n5. Limpando usuário de teste...');
      await supabase.auth.signOut();
    }

    console.log('\n📊 DIAGNÓSTICO COMPLETO!');
    console.log('Verifique os resultados acima para identificar onde está o problema.');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar diagnóstico
diagnoseProfiles();
