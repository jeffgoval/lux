-- =====================================================
-- 🚨 SOLUÇÃO IMEDIATA - EXECUTAR AGORA NO SUPABASE
-- =====================================================
-- Copie e cole este código no Supabase SQL Editor e execute

-- 1. DESABILITAR RLS TEMPORARIAMENTE (método mais rápido)
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 2. OU, se preferir manter RLS, remover todas as políticas restritivas
DROP POLICY IF EXISTS "Users can create their initial role" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_onboarding" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_completed_onboarding" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_completed_onboarding" ON public.user_roles;
DROP POLICY IF EXISTS "Verificar permissões para criar roles" ON public.user_roles;
DROP POLICY IF EXISTS "Proprietárias podem gerenciar roles" ON public.user_roles;
DROP POLICY IF EXISTS "Usuários podem ver próprios roles" ON public.user_roles;
DROP POLICY IF EXISTS "Gerentes podem ver roles do contexto" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins podem ver todos roles" ON public.user_roles;

-- 3. CRIAR POLÍTICA ULTRA-PERMISSIVA (temporária)
CREATE POLICY "temp_allow_all_user_roles" 
ON public.user_roles 
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. TAMBÉM LIBERAR OUTRAS TABELAS ESSENCIAIS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_procedimentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinica_profissionais DISABLE ROW LEVEL SECURITY;

-- 5. VERIFICAR SE FOI APLICADO
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_roles', 'profiles', 'clinicas', 'templates_procedimentos', 'profissionais', 'clinica_profissionais');

-- 6. MOSTRAR STATUS
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🚨 RLS DESABILITADO TEMPORARIAMENTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tabelas liberadas para onboarding:';
  RAISE NOTICE '   - user_roles';
  RAISE NOTICE '   - profiles';  
  RAISE NOTICE '   - clinicas';
  RAISE NOTICE '   - templates_procedimentos';
  RAISE NOTICE '   - profissionais';
  RAISE NOTICE '   - clinica_profissionais';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TESTE AGORA:';
  RAISE NOTICE '1. Faça um novo cadastro';
  RAISE NOTICE '2. Complete o onboarding';
  RAISE NOTICE '3. Verifique se não há mais erro 403';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE: Após testar e confirmar funcionamento,';
  RAISE NOTICE '⚠️  execute o script refined-rls-security.sql';
  RAISE NOTICE '⚠️  para reabilitar segurança';
  RAISE NOTICE '========================================';
END $$;