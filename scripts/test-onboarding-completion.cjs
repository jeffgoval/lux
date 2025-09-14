const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://shzbgjooydruspqajjkf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoemJnam9veWRydXNwcWFqamtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTY4ODcsImV4cCI6MjA3MzM3Mjg4N30.yJGgiGL0PmbakvtbNh9P5cWDKyESIkTzUCX9rRiVpKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testOnboardingCompletion() {
  console.log('🧪 TESTANDO FINALIZAÇÃO DO ONBOARDING...\n');

  try {
    // 1. Criar usuário de teste
    const timestamp = Date.now();
    const testEmail = `teste-onboarding-${timestamp}@exemplo.com`;
    const testPassword = '123456';
    
    console.log('1. Criando usuário de teste...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          nome_completo: 'Usuário Teste Onboarding'
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
    console.log('\n2. Verificando profile inicial...');
    const { data: initialProfile, error: initialError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (initialError) {
      console.log('❌ Erro ao buscar profile inicial:', initialError.message);
      return;
    }

    console.log('✅ Profile inicial encontrado:');
    console.log(`   primeiro_acesso: ${initialProfile.primeiro_acesso}`);
    console.log(`   nome_completo: ${initialProfile.nome_completo}`);

    // 4. Simular finalização do onboarding
    console.log('\n3. Simulando finalização do onboarding...');
    
    // Primeiro, criar clínica (simulando o que o onboarding faz)
    const { data: clinicaData, error: clinicaError } = await supabase
      .from('clinicas')
      .insert({
        nome: 'Clínica Teste Onboarding',
        endereco: {
          rua: 'Rua Teste',
          numero: '123',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '01234-567'
        },
        telefone: '(11) 99999-9999',
        email: testEmail,
        proprietario_id: authData.user.id
      })
      .select()
      .single();

    if (clinicaError) {
      console.log('❌ Erro ao criar clínica:', clinicaError.message);
      // Continuar mesmo assim para testar a finalização
    } else {
      console.log('✅ Clínica criada:', clinicaData.id);
    }

    // 5. Marcar onboarding como completo
    console.log('\n4. Marcando onboarding como completo...');
    const { error: completeError } = await supabase
      .from('profiles')
      .update({ primeiro_acesso: false })
      .eq('id', authData.user.id);

    if (completeError) {
      console.log('❌ ERRO AO FINALIZAR ONBOARDING:', completeError.message);
      console.log('📋 Código:', completeError.code);
      console.log('📋 Detalhes:', completeError.details);
      
      if (completeError.code === '42501') {
        console.log('\n🎯 PROBLEMA: Política RLS bloqueando update');
        console.log('💡 SOLUÇÃO: Verificar se usuário tem permissão para atualizar próprio profile');
      }
      return;
    }

    console.log('✅ Onboarding marcado como completo!');

    // 6. Verificar profile atualizado
    console.log('\n5. Verificando profile atualizado...');
    const { data: updatedProfile, error: updatedError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (updatedError) {
      console.log('❌ Erro ao buscar profile atualizado:', updatedError.message);
    } else {
      console.log('✅ Profile atualizado:');
      console.log(`   primeiro_acesso: ${updatedProfile.primeiro_acesso}`);
      console.log(`   nome_completo: ${updatedProfile.nome_completo}`);
      
      if (updatedProfile.primeiro_acesso === false) {
        console.log('🎉 ONBOARDING FINALIZADO COM SUCESSO!');
        console.log('✅ O usuário deve ser redirecionado para o dashboard');
      } else {
        console.log('❌ primeiro_acesso ainda é true - problema na atualização');
      }
    }

    // 7. Limpar
    console.log('\n6. Limpando dados de teste...');
    await supabase.auth.signOut();

    console.log('\n🎯 CONCLUSÃO:');
    if (!completeError && updatedProfile?.primeiro_acesso === false) {
      console.log('✅ Finalização do onboarding está funcionando');
      console.log('📋 O problema pode estar na navegação ou no contexto React');
      console.log('\n💡 POSSÍVEIS CAUSAS:');
      console.log('1. Contexto não está sendo atualizado após update');
      console.log('2. Navegação sendo bloqueada por algum guard');
      console.log('3. Erro JavaScript não capturado');
    } else {
      console.log('❌ Há problemas na finalização do onboarding');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testOnboardingCompletion();
