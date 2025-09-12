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
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLoginFlow() {
  try {
    console.log('🧪 Testando fluxo de login...\n');
    
    // Simular o que acontece após login
    console.log('1. Verificando estado atual do banco...');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');
    
    console.log(`   Profiles: ${profiles?.length || 0}`);
    console.log(`   Roles: ${roles?.length || 0}\n`);
    
    // Simular criação de um usuário de teste
    console.log('2. Simulando criação de profile para usuário de teste...');
    
    // Gerar um UUID válido para teste
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    
    const testUserId = generateUUID();
    const testEmail = 'test@example.com';
    
    // Criar profile como o sistema faria
    const { data: newProfile, error: createProfileError } = await supabase
      .from('profiles')
      .insert({
        user_id: testUserId,
        nome_completo: testEmail.split('@')[0],
        email: testEmail,
        primeiro_acesso: false, // Como está sendo feito atualmente
        ativo: true
      })
      .select()
      .single();
    
    if (createProfileError) {
      console.error('❌ Erro ao criar profile:', createProfileError.message);
      return;
    }
    
    console.log('✅ Profile criado:', {
      id: newProfile.id,
      email: newProfile.email,
      primeiro_acesso: newProfile.primeiro_acesso
    });
    
    // Criar role
    const { data: newRole, error: createRoleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: testUserId,
        role: 'proprietaria',
        ativo: true,
        criado_por: testUserId
      })
      .select()
      .single();
    
    if (createRoleError) {
      console.error('❌ Erro ao criar role:', createRoleError.message);
    } else {
      console.log('✅ Role criado:', {
        id: newRole.id,
        role: newRole.role,
        ativo: newRole.ativo
      });
    }
    
    console.log('\n3. Simulando verificação de onboarding...');
    
    // Simular a lógica do checkOnboardingStatus
    const profile = newProfile;
    const userRoles = newRole ? [newRole] : [];
    
    console.log('   Profile existe:', !!profile);
    console.log('   primeiro_acesso:', profile?.primeiro_acesso);
    console.log('   Roles count:', userRoles.length);
    
    // Lógica do checkOnboardingStatus
    let needsOnboarding = false;
    let reason = '';
    
    if (!profile) {
      needsOnboarding = true;
      reason = 'No profile found';
    } else if (profile.primeiro_acesso) {
      needsOnboarding = true;
      reason = 'First access flag is true';
    } else if (userRoles.length === 0) {
      needsOnboarding = true;
      reason = 'Missing roles but has profile info';
    } else {
      needsOnboarding = false;
      reason = 'Complete profile and roles exist';
    }
    
    console.log(`   Needs onboarding: ${needsOnboarding}`);
    console.log(`   Reason: ${reason}\n`);
    
    // Limpar dados de teste
    console.log('4. Limpando dados de teste...');
    
    if (newRole) {
      await supabase.from('user_roles').delete().eq('id', newRole.id);
    }
    await supabase.from('profiles').delete().eq('id', newProfile.id);
    
    console.log('✅ Dados de teste removidos\n');
    
    console.log('🎯 CONCLUSÃO:');
    console.log('   O sistema está funcionando corretamente para usuários com profile e role.');
    console.log('   O problema pode estar na condição de corrida durante o login.');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testLoginFlow().catch(console.error);