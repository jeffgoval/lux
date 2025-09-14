const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://shzbgjooydruspqajjkf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoemJnam9veWRydXNwcWFqamtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTY4ODcsImV4cCI6MjA3MzM3Mjg4N30.yJGgiGL0PmbakvtbNh9P5cWDKyESIkTzUCX9rRiVpKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugFinalFlow() {
  console.log('🔍 DEBUG FINAL - SIMULANDO FLUXO COMPLETO...\n');

  try {
    // 1. Criar usuário e simular onboarding completo
    const timestamp = Date.now();
    const testEmail = `final-test-${timestamp}@exemplo.com`;
    const testPassword = '123456';
    
    console.log('1. Criando usuário...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          nome_completo: 'Usuário Final Test'
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
    
    // 3. Verificar profile inicial
    const { data: initialProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    console.log('\n2. Profile inicial:');
    console.log(`   primeiro_acesso: ${initialProfile?.primeiro_acesso}`);
    console.log(`   nome: ${initialProfile?.nome_completo}`);

    // 4. Simular finalização do onboarding (o que o OnboardingWizard faz)
    console.log('\n3. Simulando finalização do onboarding...');
    
    const { data: updateResult, error: updateError } = await supabase
      .from('profiles')
      .update({ primeiro_acesso: false })
      .eq('id', authData.user.id)
      .select();

    if (updateError) {
      console.log('❌ Erro ao finalizar onboarding:', updateError.message);
      return;
    }

    console.log('✅ Onboarding finalizado:', updateResult[0]);

    // 5. Fazer login para simular o contexto
    console.log('\n4. Fazendo login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (loginError) {
      console.log('❌ Erro no login:', loginError.message);
      return;
    }

    console.log('✅ Login realizado');

    // 6. Verificar dados após login (o que o contexto veria)
    console.log('\n5. Verificando dados após login...');
    
    const { data: profileAfterLogin } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    const { data: rolesAfterLogin } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', authData.user.id)
      .eq('ativo', true);

    console.log('📊 Estado que o contexto deveria ter:');
    console.log(`   user: ${!!loginData.user}`);
    console.log(`   profile: ${!!profileAfterLogin}`);
    console.log(`   profile.primeiro_acesso: ${profileAfterLogin?.primeiro_acesso}`);
    console.log(`   roles: ${rolesAfterLogin?.length || 0}`);

    // 7. Simular decisão do SecureAuthGuard
    console.log('\n6. Simulando SecureAuthGuard...');
    
    const needsOnboarding = loginData.user && profileAfterLogin?.primeiro_acesso === true;
    console.log(`   needsOnboarding: ${needsOnboarding}`);
    
    if (needsOnboarding) {
      console.log('❌ PROBLEMA: Guard ainda considera que precisa onboarding');
      console.log('🎯 CAUSA: primeiro_acesso ainda é true OU contexto não atualizou');
    } else {
      console.log('✅ Guard deveria permitir acesso ao dashboard');
    }

    // 8. Verificar se há problema de timing
    console.log('\n7. Testando timing...');
    
    // Simular delay que pode acontecer no contexto
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { data: profileDelayed } = await supabase
      .from('profiles')
      .select('primeiro_acesso')
      .eq('id', authData.user.id)
      .single();

    console.log(`   primeiro_acesso após delay: ${profileDelayed?.primeiro_acesso}`);

    // 9. Limpar
    await supabase.auth.signOut();

    console.log('\n🎯 DIAGNÓSTICO FINAL:');
    
    if (profileAfterLogin?.primeiro_acesso === false) {
      console.log('✅ Banco de dados está correto');
      console.log('🤔 Problema pode estar em:');
      console.log('1. Contexto React não está sendo atualizado');
      console.log('2. SecureAuthGuard está usando dados em cache');
      console.log('3. Há race condition entre atualização e navegação');
      console.log('4. SecureAuth.tsx ainda tem lógica problemática');
      
      console.log('\n💡 SOLUÇÕES POSSÍVEIS:');
      console.log('1. Forçar reload completo da página após onboarding');
      console.log('2. Usar navigate() em vez de window.location.href');
      console.log('3. Adicionar delay maior antes da navegação');
      console.log('4. Implementar verificação em loop até contexto atualizar');
    } else {
      console.log('❌ Problema no banco de dados - primeiro_acesso não foi atualizado');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

debugFinalFlow();
