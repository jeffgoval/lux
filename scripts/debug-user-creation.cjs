const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://shzbgjooydruspqajjkf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoemJnam9veWRydXNwcWFqamtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3OTY4ODcsImV4cCI6MjA3MzM3Mjg4N30.yJGgiGL0PmbakvtbNh9P5cWDKyESIkTzUCX9rRiVpKw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugUserCreation() {
  console.log('🔍 DEBUGANDO CRIAÇÃO DE USUÁRIO...\n');

  try {
    // 1. Criar usuário de teste
    const timestamp = Date.now();
    const testEmail = `debug-user-${timestamp}@exemplo.com`;
    const testPassword = '123456';
    
    console.log('1. Criando usuário de teste...');
    console.log(`Email: ${testEmail}`);
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          nome_completo: 'Usuário Debug'
        }
      }
    });

    if (authError) {
      console.log('❌ Erro ao criar usuário:', authError.message);
      return;
    }

    if (!authData.user) {
      console.log('❌ Usuário não foi criado');
      return;
    }

    console.log('✅ Usuário criado no auth.users:');
    console.log(`   ID: ${authData.user.id}`);
    console.log(`   Email: ${authData.user.email}`);
    console.log(`   Confirmado: ${authData.user.email_confirmed_at ? 'Sim' : 'Não'}`);

    // 2. Aguardar trigger
    console.log('\n2. Aguardando trigger executar...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3. Verificar se profile foi criado
    console.log('\n3. Verificando se profile foi criado...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.log('❌ ERRO ao buscar profile:', profileError.message);
      console.log('📋 Código:', profileError.code);
      
      if (profileError.code === 'PGRST116') {
        console.log('🎯 PROBLEMA: Profile não foi criado pelo trigger');
        console.log('💡 POSSÍVEIS CAUSAS:');
        console.log('1. Trigger não existe ou está desabilitado');
        console.log('2. Função do trigger tem erro');
        console.log('3. Política RLS bloqueando insert');
        console.log('4. Usuário não confirmado (se trigger depende disso)');
      }
    } else {
      console.log('✅ Profile encontrado:');
      console.log(`   Nome: ${profile.nome_completo}`);
      console.log(`   Email: ${profile.email}`);
      console.log(`   primeiro_acesso: ${profile.primeiro_acesso}`);
      console.log(`   Criado: ${new Date(profile.criado_em).toLocaleString()}`);
    }

    // 4. Verificar roles
    console.log('\n4. Verificando roles...');
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', authData.user.id);

    if (rolesError) {
      console.log('❌ Erro ao buscar roles:', rolesError.message);
    } else if (roles.length === 0) {
      console.log('❌ Nenhuma role encontrada');
      console.log('🎯 PROBLEMA: Trigger de role não funcionou');
    } else {
      console.log(`✅ ${roles.length} role(s) encontrada(s):`);
      roles.forEach(role => {
        console.log(`   - ${role.role} (ativo: ${role.ativo})`);
      });
    }

    // 5. Tentar fazer login
    console.log('\n5. Testando login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (loginError) {
      console.log('❌ Erro no login:', loginError.message);
      
      if (loginError.message.includes('Email not confirmed')) {
        console.log('🎯 PROBLEMA: Email não confirmado');
        console.log('💡 SOLUÇÃO: Confirmar email ou desabilitar confirmação');
      }
    } else {
      console.log('✅ Login funcionou');
      console.log(`   Sessão: ${loginData.session ? 'Ativa' : 'Inativa'}`);
      
      // Verificar se consegue acessar profile após login
      const { data: profileAfterLogin, error: profileAfterLoginError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileAfterLoginError) {
        console.log('❌ Não consegue acessar profile após login:', profileAfterLoginError.message);
      } else {
        console.log('✅ Profile acessível após login');
      }
    }

    // 6. Limpar
    console.log('\n6. Limpando usuário de teste...');
    await supabase.auth.signOut();

    console.log('\n🎯 DIAGNÓSTICO FINAL:');
    if (!profile) {
      console.log('❌ PROBLEMA PRINCIPAL: Trigger não está criando profile');
      console.log('📋 PRÓXIMOS PASSOS:');
      console.log('1. Verificar se trigger existe no banco');
      console.log('2. Verificar se função do trigger funciona');
      console.log('3. Verificar políticas RLS na tabela profiles');
      console.log('4. Verificar se confirmação de email é obrigatória');
    } else if (!roles || roles.length === 0) {
      console.log('⚠️ Profile criado mas roles não');
      console.log('📋 PRÓXIMOS PASSOS:');
      console.log('1. Verificar trigger de roles');
      console.log('2. Verificar políticas RLS na tabela user_roles');
    } else {
      console.log('✅ Sistema de criação funcionando');
      console.log('🤔 Problema pode estar no onboarding ou contexto React');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

debugUserCreation();
