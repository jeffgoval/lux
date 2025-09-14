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

async function checkCurrentPolicies() {
  console.log('🔍 Verificando políticas RLS atuais...\n');

  try {
    // Tentar verificar as tabelas diretamente
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, user_id, primeiro_acesso')
      .limit(1);

    if (profilesError) {
      console.log('❌ Tabela profiles:', profilesError.message);
    } else {
      console.log('✅ Tabela profiles acessível');
      console.log('📊 Estrutura verificada');
    }

    // Verificar user_roles
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('id, user_id, role')
      .limit(1);

    if (rolesError) {
      console.log('❌ Tabela user_roles:', rolesError.message);
    } else {
      console.log('✅ Tabela user_roles acessível');
    }

    // Verificar clinicas
    const { data: clinicasData, error: clinicasError } = await supabase
      .from('clinicas')
      .select('id, nome')
      .limit(1);

    if (clinicasError) {
      console.log('❌ Tabela clinicas:', clinicasError.message);
    } else {
      console.log('✅ Tabela clinicas acessível');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

async function testOnboardingRestrictions() {
  console.log('\n🧪 Testando restrições de onboarding...\n');

  // Criar usuário de teste
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'test123456';

  console.log('1. Criando usuário de teste...');
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword
  });

  if (signUpError) {
    console.error('❌ Erro ao criar usuário:', signUpError.message);
    return;
  }

  const userId = authData.user?.id;
  if (!userId) {
    console.error('❌ Usuário não foi criado');
    return;
  }

  console.log(`✅ Usuário criado: ${testEmail}`);

  // Fazer login
  console.log('\n2. Fazendo login...');
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (signInError) {
    console.error('❌ Erro no login:', signInError.message);
    return;
  }

  console.log('✅ Login realizado');

  // Tentar criar profile com primeiro_acesso = true
  console.log('\n3. Testando criação de profile...');
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      email: testEmail,
      nome_completo: 'Teste Usuário',
      primeiro_acesso: true
    })
    .select()
    .single();

  if (profileError) {
    console.error('❌ Erro ao criar profile:', profileError.message);
    return;
  }

  console.log('✅ Profile criado com primeiro_acesso = true');

  // Tentar acessar user_roles (DEVE falhar)
  console.log('\n4. Testando acesso a user_roles (deve falhar)...');
  const { data: rolesData, error: rolesError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', userId);

  if (rolesError) {
    console.log('🔒 ✅ CORRETO: Acesso a user_roles bloqueado!');
    console.log(`   Erro: ${rolesError.message}`);
  } else {
    console.log('⚠️  PROBLEMA: Acesso a user_roles NÃO foi bloqueado!');
    console.log(`   Roles encontradas: ${rolesData.length}`);
  }

  // Criar role (deve conseguir durante onboarding)
  console.log('\n5. Testando criação de role...');
  const { data: newRoleData, error: newRoleError } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role: 'proprietaria',
      ativo: true,
      criado_por: userId
    });

  if (newRoleError) {
    console.log('❌ Erro ao criar role:', newRoleError.message);
  } else {
    console.log('✅ Role criada durante onboarding');
  }

  // Marcar onboarding como completo
  console.log('\n6. Marcando onboarding como completo...');
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ primeiro_acesso: false })
    .eq('user_id', userId);

  if (updateError) {
    console.error('❌ Erro ao completar onboarding:', updateError.message);
    return;
  }

  console.log('✅ Onboarding marcado como completo');

  // Tentar acessar roles novamente (agora deve funcionar)
  console.log('\n7. Testando acesso a user_roles após onboarding...');
  const { data: rolesAfter, error: rolesAfterError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', userId);

  if (rolesAfterError) {
    console.log('❌ PROBLEMA: Ainda não consegue acessar roles após onboarding');
    console.log(`   Erro: ${rolesAfterError.message}`);
  } else {
    console.log('✅ CORRETO: Acesso liberado após onboarding completo!');
    console.log(`   Roles encontradas: ${rolesAfter.length}`);
  }

  // Cleanup
  console.log('\n8. Limpando dados de teste...');
  await supabase.from('profiles').delete().eq('user_id', userId);

  console.log('\n📋 RESUMO DO TESTE:');
  console.log('- ✅ Criação de usuário funcionando');
  console.log('- ✅ Criação de profile funcionando');
  console.log(rolesError ? '- ✅ RLS bloqueando acesso durante onboarding' : '- ❌ RLS NÃO está bloqueando onboarding');
  console.log(!newRoleError ? '- ✅ Criação de role permitida durante onboarding' : '- ❌ Criação de role bloqueada');
  console.log(!updateError ? '- ✅ Marcação de onboarding completo funcionando' : '- ❌ Não consegue marcar onboarding completo');
  console.log(!rolesAfterError ? '- ✅ Acesso liberado após onboarding' : '- ❌ Acesso ainda bloqueado após onboarding');
}

async function main() {
  console.log('🚀 Verificando implementação de RLS para onboarding...\n');
  
  await checkCurrentPolicies();
  await testOnboardingRestrictions();
  
  console.log('\n🎯 PRÓXIMOS PASSOS:');
  console.log('1. Se RLS não está funcionando, execute as políticas manualmente no Supabase SQL Editor');
  console.log('2. Use o arquivo: onboarding-rls-policies.sql');
  console.log('3. Teste novamente com um novo usuário no frontend');
}

main().catch(console.error);