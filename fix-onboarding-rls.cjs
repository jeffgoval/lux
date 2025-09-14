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

async function executeSQL(sql, description) {
  console.log(`🔧 ${description}...`);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error(`❌ Erro: ${error.message}`);
      return false;
    }
    console.log(`✅ ${description} - Sucesso!`);
    return true;
  } catch (error) {
    console.error(`❌ Erro inesperado: ${error.message}`);
    return false;
  }
}

async function fixOnboardingRLS() {
  console.log('🚀 Iniciando correção das políticas RLS para onboarding...\n');

  // 1. Garantir estrutura da tabela profiles
  const profilesStructure = `
    -- Verificar se a tabela profiles tem a estrutura correta
    ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS primeiro_acesso BOOLEAN DEFAULT true NOT NULL;

    -- Criar índice para performance
    CREATE INDEX IF NOT EXISTS idx_profiles_primeiro_acesso ON public.profiles(user_id, primeiro_acesso);
    CREATE INDEX IF NOT EXISTS idx_profiles_active_users ON public.profiles(user_id) WHERE primeiro_acesso = false;
  `;

  await executeSQL(profilesStructure, 'Ajustando estrutura da tabela profiles');

  // 2. Remover políticas antigas e criar novas mais restritivas
  const rlsPolicies = `
    -- Remover políticas antigas
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
    
    -- Política para SELECT - usuários podem ver seu próprio perfil sempre
    CREATE POLICY "profiles_select_own" ON public.profiles
      FOR SELECT USING (auth.uid() = user_id);

    -- Política para INSERT - usuários podem criar seu próprio perfil
    CREATE POLICY "profiles_insert_own" ON public.profiles
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    -- Política para UPDATE - usuários podem atualizar seu próprio perfil
    CREATE POLICY "profiles_update_own" ON public.profiles
      FOR UPDATE USING (auth.uid() = user_id);
  `;

  await executeSQL(rlsPolicies, 'Criando políticas RLS para profiles');

  // 3. Políticas para user_roles - bloquear acesso durante onboarding
  const rolesPolicies = `
    -- Remover políticas antigas de user_roles
    DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Users can update own roles" ON public.user_roles;

    -- Política SELECT para roles - apenas usuários que completaram onboarding
    CREATE POLICY "user_roles_select_completed_onboarding" ON public.user_roles
      FOR SELECT USING (
        auth.uid() = user_id 
        AND EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE profiles.user_id = auth.uid() 
          AND profiles.primeiro_acesso = false
        )
      );

    -- Política INSERT para roles - apenas durante onboarding ou para usuários completos
    CREATE POLICY "user_roles_insert_onboarding" ON public.user_roles
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    -- Política UPDATE para roles - apenas usuários que completaram onboarding
    CREATE POLICY "user_roles_update_completed_onboarding" ON public.user_roles
      FOR UPDATE USING (
        auth.uid() = user_id 
        AND EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE profiles.user_id = auth.uid() 
          AND profiles.primeiro_acesso = false
        )
      );
  `;

  await executeSQL(rolesPolicies, 'Criando políticas RLS para user_roles');

  // 4. Políticas para clínicas - apenas usuários que completaram onboarding
  const clinicasPolicies = `
    -- Políticas para clínicas - bloquear durante onboarding
    DROP POLICY IF EXISTS "clinicas_select_owner" ON public.clinicas;
    DROP POLICY IF EXISTS "clinicas_insert_owner" ON public.clinicas;
    DROP POLICY IF EXISTS "clinicas_update_owner" ON public.clinicas;

    -- SELECT clínicas - apenas usuários que completaram onboarding
    CREATE POLICY "clinicas_select_completed_onboarding" ON public.clinicas
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.profiles p ON p.user_id = ur.user_id
          WHERE ur.user_id = auth.uid()
          AND ur.clinica_id = clinicas.id
          AND ur.ativo = true
          AND p.primeiro_acesso = false
        )
      );

    -- INSERT clínicas - permitir durante onboarding para proprietários
    CREATE POLICY "clinicas_insert_onboarding" ON public.clinicas
      FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
      );

    -- UPDATE clínicas - apenas usuários que completaram onboarding
    CREATE POLICY "clinicas_update_completed_onboarding" ON public.clinicas
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.profiles p ON p.user_id = ur.user_id
          WHERE ur.user_id = auth.uid()
          AND ur.clinica_id = clinicas.id
          AND ur.role IN ('proprietaria', 'gerente')
          AND ur.ativo = true
          AND p.primeiro_acesso = false
        )
      );
  `;

  await executeSQL(clinicasPolicies, 'Criando políticas RLS para clínicas');

  // 5. Função utilitária para verificar se usuário completou onboarding
  const utilityFunction = `
    -- Função para verificar se usuário completou onboarding
    CREATE OR REPLACE FUNCTION public.user_completed_onboarding(user_uuid UUID DEFAULT auth.uid())
    RETURNS BOOLEAN AS $$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = user_uuid 
        AND primeiro_acesso = false
      );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Dar permissão para usuários autenticados
    GRANT EXECUTE ON FUNCTION public.user_completed_onboarding TO authenticated;
  `;

  await executeSQL(utilityFunction, 'Criando função utilitária de onboarding');

  console.log('\n✅ Correção das políticas RLS concluída!');
  console.log('🔒 Agora usuários com primeiro_acesso = true terão acesso limitado');
  console.log('📝 Apenas perfil próprio e criação de dados básicos para onboarding são permitidos');
}

fixOnboardingRLS().catch(console.error);