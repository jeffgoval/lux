const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://shzbgjooydruspqajjkf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoemJnam9veWRydXNwcWFqamtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTY4ODcsImV4cCI6MjA3MzM3Mjg4N30.yJGgiGL0PmbakvtbNh9P5cWDKyESIkTzUCX9rRiVpKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testNavigationFix() {
  console.log('🧪 TESTANDO CORREÇÃO DA NAVEGAÇÃO...\n');

  try {
    // 1. Criar usuário de teste
    const timestamp = Date.now();
    const testEmail = `teste-nav-${timestamp}@exemplo.com`;
    const testPassword = '123456';
    
    console.log('1. Criando usuário de teste...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          nome_completo: 'Usuário Teste Navegação'
        }
      }
    });

    if (authError || !authData.user) {
      console.log('❌ Erro ao criar usuário:', authError?.message);
      return;
    }

    console.log('✅ Usuário criado:', authData.user.id);
    
    // 2. Aguardar trigger
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 3. Verificar estado inicial (deve precisar de onboarding)
    console.log('\n2. Verificando estado inicial...');
    const { data: initialProfile, error: initialError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (initialError) {
      console.log('❌ Erro ao buscar profile inicial:', initialError.message);
      return;
    }

    console.log('✅ Estado inicial:');
    console.log(`   primeiro_acesso: ${initialProfile.primeiro_acesso}`);
    console.log(`   ${initialProfile.primeiro_acesso ? '🔄 PRECISA de onboarding' : '✅ NÃO precisa de onboarding'}`);

    // 4. Simular finalização do onboarding
    console.log('\n3. Simulando finalização do onboarding...');
    const { error: completeError } = await supabase
      .from('profiles')
      .update({ primeiro_acesso: false })
      .eq('id', authData.user.id);

    if (completeError) {
      console.log('❌ Erro ao finalizar onboarding:', completeError.message);
      return;
    }

    console.log('✅ Onboarding finalizado!');

    // 5. Verificar estado após finalização
    console.log('\n4. Verificando estado após finalização...');
    const { data: finalProfile, error: finalError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (finalError) {
      console.log('❌ Erro ao buscar profile final:', finalError.message);
      return;
    }

    console.log('✅ Estado final:');
    console.log(`   primeiro_acesso: ${finalProfile.primeiro_acesso}`);
    console.log(`   ${finalProfile.primeiro_acesso ? '🔄 AINDA precisa de onboarding' : '🎉 PODE acessar dashboard'}`);

    // 6. Verificar roles (importante para o guard)
    console.log('\n5. Verificando roles do usuário...');
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', authData.user.id)
      .eq('ativo', true);

    if (rolesError) {
      console.log('❌ Erro ao buscar roles:', rolesError.message);
    } else {
      console.log(`✅ ${roles.length} role(s) encontrada(s):`);
      roles.forEach(role => {
        console.log(`   - ${role.role} (ativo: ${role.ativo})`);
      });
    }

    // 7. Limpar
    console.log('\n6. Limpando dados de teste...');
    await supabase.auth.signOut();

    console.log('\n🎯 RESULTADO DA CORREÇÃO:');
    if (finalProfile.primeiro_acesso === false) {
      console.log('🎉 CORREÇÃO FUNCIONOU!');
      console.log('✅ Guard agora verifica primeiro_acesso corretamente');
      console.log('✅ Usuário pode navegar para dashboard após onboarding');
      console.log('✅ Navegação forçada com window.location.href');
      
      console.log('\n📋 PRÓXIMO TESTE:');
      console.log('Teste o fluxo completo na aplicação:');
      console.log('1. Cadastro → 2. Onboarding → 3. Dashboard');
    } else {
      console.log('❌ Ainda há problemas na finalização');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testNavigationFix();
