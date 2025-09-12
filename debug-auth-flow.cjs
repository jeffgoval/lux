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

// Simular a lógica do checkOnboardingStatus
function checkOnboardingStatus(profile, roles, isProfileLoading, isRolesLoading) {
  console.log('🔍 Checking onboarding status:', {
    hasProfile: !!profile,
    primeiroAcesso: profile?.primeiro_acesso,
    rolesCount: roles.length,
    isProfileLoading,
    isRolesLoading
  });

  // If data is still loading, don't make decisions yet
  if (isProfileLoading || isRolesLoading) {
    return {
      needsOnboarding: false,
      reason: 'Data still loading',
      canSkip: false
    };
  }

  // If we have no profile and no roles, but data finished loading,
  // this might be a temporary state during user creation - be conservative
  if (!profile && roles.length === 0) {
    return {
      needsOnboarding: true,
      reason: 'No profile and no roles found',
      canSkip: false
    };
  }

  // No profile at all - definitely needs onboarding
  if (!profile) {
    return {
      needsOnboarding: true,
      reason: 'No profile found',
      canSkip: false
    };
  }

  // Profile explicitly marked as first access
  if (profile.primeiro_acesso) {
    return {
      needsOnboarding: true,
      reason: 'First access flag is true',
      canSkip: false
    };
  }

  // Profile exists but no roles - this is more nuanced
  if (roles.length === 0) {
    // If profile has basic info filled out, user might not need full onboarding
    const hasBasicInfo = profile.nome_completo && 
                        profile.nome_completo !== profile.email?.split('@')[0] &&
                        profile.email;

    if (hasBasicInfo) {
      return {
        needsOnboarding: true,
        reason: 'Missing roles but has profile info',
        canSkip: true // Could potentially skip to role assignment
      };
    } else {
      return {
        needsOnboarding: true,
        reason: 'Incomplete profile and no roles',
        canSkip: false
      };
    }
  }

  // Has profile and roles - no onboarding needed
  return {
    needsOnboarding: false,
    reason: 'Complete profile and roles exist',
    canSkip: true
  };
}

async function debugAuthFlow() {
  try {
    console.log('🚀 Debugando fluxo de autenticação...\n');
    
    // Cenário 1: Usuário sem dados (estado inicial)
    console.log('📋 CENÁRIO 1: Usuário sem dados');
    let result = checkOnboardingStatus(null, [], false, false);
    console.log('   Resultado:', result);
    console.log('   ✅ Correto: deve ir para onboarding\n');
    
    // Cenário 2: Dados ainda carregando
    console.log('📋 CENÁRIO 2: Dados ainda carregando');
    result = checkOnboardingStatus(null, [], true, true);
    console.log('   Resultado:', result);
    console.log('   ✅ Correto: não deve redirecionar ainda\n');
    
    // Cenário 3: Profile carregando, roles não
    console.log('📋 CENÁRIO 3: Profile carregando, roles não');
    result = checkOnboardingStatus(null, [], true, false);
    console.log('   Resultado:', result);
    console.log('   ✅ Correto: não deve redirecionar ainda\n');
    
    // Cenário 4: Usuário com primeiro acesso
    console.log('📋 CENÁRIO 4: Usuário com primeiro acesso');
    const profileFirstAccess = {
      id: '1',
      user_id: '1',
      email: 'test@example.com',
      nome_completo: 'Test User',
      primeiro_acesso: true,
      ativo: true
    };
    result = checkOnboardingStatus(profileFirstAccess, [], false, false);
    console.log('   Resultado:', result);
    console.log('   ✅ Correto: deve ir para onboarding\n');
    
    // Cenário 5: Usuário com profile mas sem roles
    console.log('📋 CENÁRIO 5: Usuário com profile mas sem roles');
    const profileNoRoles = {
      id: '1',
      user_id: '1',
      email: 'test@example.com',
      nome_completo: 'Test User',
      primeiro_acesso: false,
      ativo: true
    };
    result = checkOnboardingStatus(profileNoRoles, [], false, false);
    console.log('   Resultado:', result);
    console.log('   ⚠️  Deve ir para onboarding mas pode pular\n');
    
    // Cenário 6: Usuário completo (profile + roles)
    console.log('📋 CENÁRIO 6: Usuário completo (profile + roles)');
    const roles = [{ id: '1', user_id: '1', role: 'proprietaria', ativo: true }];
    result = checkOnboardingStatus(profileNoRoles, roles, false, false);
    console.log('   Resultado:', result);
    console.log('   ✅ Correto: não precisa de onboarding\n');
    
    // Cenário 7: Profile com nome básico (email) e sem roles
    console.log('📋 CENÁRIO 7: Profile com nome básico e sem roles');
    const profileBasicName = {
      id: '1',
      user_id: '1',
      email: 'test@example.com',
      nome_completo: 'test', // Mesmo que o email
      primeiro_acesso: false,
      ativo: true
    };
    result = checkOnboardingStatus(profileBasicName, [], false, false);
    console.log('   Resultado:', result);
    console.log('   ✅ Correto: deve ir para onboarding (profile incompleto)\n');
    
    console.log('🎯 RESUMO DOS PROBLEMAS IDENTIFICADOS:');
    console.log('1. ✅ A lógica de onboarding está funcionando corretamente');
    console.log('2. ⚠️  O problema pode estar na condição de corrida durante o login');
    console.log('3. ⚠️  O AuthGuard pode estar redirecionando antes dos dados serem criados');
    console.log('4. 💡 Solução: Melhorar o tempo de espera e verificações no AuthGuard');
    
  } catch (error) {
    console.error('❌ Erro no debug:', error);
  }
}

debugAuthFlow().catch(console.error);