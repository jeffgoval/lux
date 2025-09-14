const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://shzbgjooydruspqajjkf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoemJnam9veWRydXNwcWFqamtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTY4ODcsImV4cCI6MjA3MzM3Mjg4N30.yJGgiGL0PmbakvtbNh9P5cWDKyESIkTzUCX9rRiVpKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFinalFix() {
  console.log('🎯 TESTE FINAL - Verificando se todas as correções funcionaram...\n');

  try {
    // 1. Testar cadastro completo
    console.log('1. Testando cadastro completo...');
    
    const testEmail = `teste-final-${Date.now()}@exemplo.com`;
    const testPassword = '123456';
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          nome_completo: 'Usuário Teste Final'
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
      
      // 2. Testar busca de profile (deve usar id, não user_id)
      console.log('\n2. Testando busca de profile...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.log('❌ Erro ao buscar profile:', profileError.message);
        console.log('📋 Código:', profileError.code);
      } else {
        console.log('✅ Profile encontrado:', {
          id: profile.id,
          email: profile.email,
          nome_completo: profile.nome_completo,
          primeiro_acesso: profile.primeiro_acesso
        });
      }

      // 3. Testar busca de roles (deve usar user_id)
      console.log('\n3. Testando busca de roles...');
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', authData.user.id);

      if (rolesError) {
        console.log('❌ Erro ao buscar roles:', rolesError.message);
      } else {
        console.log('✅ Roles encontradas:', roles.length);
        if (roles.length > 0) {
          console.log('📋 Primeira role:', {
            role: roles[0].role,
            ativo: roles[0].ativo
          });
        }
      }

      // 4. Fazer login para testar com usuário autenticado
      console.log('\n4. Testando login...');
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });

      if (loginError) {
        console.log('❌ Erro no login:', loginError.message);
      } else {
        console.log('✅ Login realizado com sucesso');
        
        // Testar acesso autenticado ao profile
        const { data: authProfile, error: authProfileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (authProfileError) {
          console.log('❌ Erro ao buscar profile autenticado:', authProfileError.message);
        } else {
          console.log('✅ Profile acessível como usuário autenticado');
        }
      }

      // 5. Limpar usuário de teste
      console.log('\n5. Limpando usuário de teste...');
      await supabase.auth.signOut();
    }

    console.log('\n🎉 TESTE FINAL CONCLUÍDO!');
    console.log('\n📊 RESULTADO:');
    console.log('Se todos os testes passaram, o sistema está funcionando corretamente.');
    console.log('Se algum teste falhou, ainda há problemas a serem corrigidos.');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar teste final
testFinalFix();
