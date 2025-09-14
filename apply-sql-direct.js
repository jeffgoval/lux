

const sqlCommands = `
-- 1. CORRIGIR ESTRUTURA DA TABELA PROFILES
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. GARANTIR COLUNA primeiro_acesso
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primeiro_acesso BOOLEAN DEFAULT true NOT NULL;

-- 3. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_primeiro_acesso ON public.profiles(user_id, primeiro_acesso);

-- 4. POLÍTICAS RLS PARA PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- 5. POLÍTICAS RLS PARA USER_ROLES (ONBOARDING)
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update own roles" ON public.user_roles;

-- Bloquear SELECT de roles durante onboarding
CREATE POLICY "user_roles_select_completed_onboarding" ON public.user_roles 
FOR SELECT USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.primeiro_acesso = false
  )
);

-- Permitir INSERT de roles durante onboarding
CREATE POLICY "user_roles_insert_onboarding" ON public.user_roles 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. VERIFICAR POLÍTICAS CRIADAS
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_roles')
ORDER BY tablename, policyname;
`;


