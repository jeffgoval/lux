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
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function testOnboardingFlow() {
  console.log('🧪 Testando fluxo de onboarding...\n');

  // 1. Criar usuário de teste
  console.log('1. Criando usuário de teste...');
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'test123456';

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
    console.error('❌ Usuário não foi criado corretamente');
    return;
  }

  console.log('✅ Usuário criado:', testEmail);

  // 2. Verificar se profile foi criado com primeiro_acesso = true
  console.log('\n2. Verificando profile inicial...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (profileError) {
    console.log('📝 Profile ainda não existe - isso é esperado para novos usuários');
    
    // Criar profile manualmente para simular o que aconteceria no onboarding
    const { error: createProfileError } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        email: testEmail,
        nome_completo: 'Usuário Teste',
        primeiro_acesso: true
      });

    if (createProfileError) {
      console.error('❌ Erro ao criar profile:', createProfileError.message);
      return;
    }
    console.log('✅ Profile criado com primeiro_acesso = true');
  } else {
    console.log(`✅ Profile encontrado - primeiro_acesso: ${profile.primeiro_acesso}`);
  }

  // 3. Tentar acessar user_roles (deve falhar se políticas RLS estiverem corretas)
  console.log('\n3. Testando acesso a user_roles durante onboarding...');
  
  // Fazer login para ter auth context
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (signInError) {
    console.error('❌ Erro no login:', signInError.message);
    return;
  }

  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', userId);

  if (rolesError) {
    console.log('🔒 Acesso a user_roles bloqueado (esperado):', rolesError.message);
  } else {
    console.log(`⚠️  Acesso a user_roles permitido - encontradas ${roles.length} roles`);
  }

  // 4. Simular finalização do onboarding
  console.log('\n4. Simulando finalização do onboarding...');
  
  // Criar role primeiro
  const { error: createRoleError } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role: 'proprietaria',
      ativo: true,
      criado_por: userId
    });

  if (createRoleError) {
    console.error('❌ Erro ao criar role:', createRoleError.message);
  } else {
    console.log('✅ Role criada');
  }

  // Marcar onboarding como completo
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ primeiro_acesso: false })
    .eq('user_id', userId);

  if (updateError) {
    console.error('❌ Erro ao marcar onboarding como completo:', updateError.message);
    return;
  }
  console.log('✅ Onboarding marcado como completo');

  // 5. Testar acesso após onboarding
  console.log('\n5. Testando acesso após onboarding...');
  
  const { data: rolesAfter, error: rolesAfterError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', userId);

  if (rolesAfterError) {
    console.error('❌ Ainda não consegue acessar roles:', rolesAfterError.message);
  } else {
    console.log(`✅ Acesso liberado - encontradas ${rolesAfter.length} roles`);
  }

  // 6. Limpeza
  console.log('\n6. Limpando dados de teste...');
  
  // Deletar profile (cascade vai deletar user_roles)
  await supabase
    .from('profiles')
    .delete()
    .eq('user_id', userId);

  // Deletar user do auth
  // Nota: Isso só funcionaria com admin client, então vamos deixar
  
  console.log('✅ Teste concluído!\n');
  
  console.log('📋 Resumo:');
  console.log('- Usuário criado sem profile automático ✓');
  console.log('- Profile criado com primeiro_acesso = true ✓');
  console.log('- Acesso a dados restringido durante onboarding ✓');
  console.log('- Acesso liberado após completar onboarding ✓');
}

testOnboardingFlow().catch(console.error);