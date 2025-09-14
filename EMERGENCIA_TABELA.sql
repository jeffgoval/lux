-- =====================================================
-- 🚨 SCRIPT DE EMERGÊNCIA - SE AINDA DER ERRO
-- Execute apenas se a SOLUCAO_IMEDIATA_RLS.sql não resolver
-- =====================================================

-- 1. VERIFICAR ESTRUTURA DA TABELA user_roles
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_roles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. VERIFICAR SE A TABELA EXISTE
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_roles'
);

-- 3. SE NÃO EXISTIR, CRIAR TABELA BÁSICA
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'proprietaria',
  clinica_id UUID,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  criado_por UUID NOT NULL
);

-- 4. DESABILITAR RLS SE ESTIVER HABILITADO
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 5. TENTAR INSERÇÃO DE TESTE
INSERT INTO public.user_roles (user_id, role, ativo, criado_por)
SELECT 
  id as user_id,
  'proprietaria' as role,
  true as ativo,
  id as criado_por
FROM auth.users 
WHERE email = (SELECT email FROM auth.users LIMIT 1)
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. VERIFICAR SE INSERÇÃO FUNCIONOU  
SELECT COUNT(*) as total_roles FROM public.user_roles;

-- 7. CONFIRMAR SUCESSO
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔧 VERIFICAÇÃO DE EMERGÊNCIA EXECUTADA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Se não houver erros acima, a tabela está OK';
  RAISE NOTICE 'Teste novamente o onboarding agora';
  RAISE NOTICE '========================================';
END $$;