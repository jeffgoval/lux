-- =====================================================
-- CORREÇÃO SIMPLES DOS BUGS DE AUTENTICAÇÃO
-- Execute LINHA POR LINHA no Supabase SQL Editor
-- =====================================================

-- 1. PRIMEIRO: Limpar dados corrompidos existentes
-- Corrige profiles que têm roles como nome
UPDATE public.profiles 
SET nome_completo = CASE 
  WHEN nome_completo IN ('super_admin', 'proprietaria', 'gerente', 'profissionais', 'recepcionistas', 'visitante', 'cliente') 
  THEN split_part(email, '@', 1)
  ELSE nome_completo
END,
atualizado_em = now()
WHERE nome_completo IN ('super_admin', 'proprietaria', 'gerente', 'profissionais', 'recepcionistas', 'visitante', 'cliente');

-- 2. SEGUNDO: Garantir que novos usuários tenham primeiro_acesso = true
-- Corrige usuários recentes que podem ter perdido a flag
UPDATE public.profiles 
SET primeiro_acesso = true,
    atualizado_em = now()
WHERE criado_em > (CURRENT_TIMESTAMP - INTERVAL '7 days')
  AND primeiro_acesso = false;

-- 3. VERIFICAÇÃO: Ver quantos registros foram corrigidos
SELECT 
  'Profiles com roles como nome' as tipo,
  COUNT(*) as quantidade
FROM public.profiles 
WHERE nome_completo IN ('super_admin', 'proprietaria', 'gerente', 'profissionais', 'recepcionistas', 'visitante', 'cliente')
UNION ALL
SELECT 
  'Usuários recentes sem primeiro_acesso' as tipo,
  COUNT(*) as quantidade
FROM public.profiles 
WHERE criado_em > (CURRENT_TIMESTAMP - INTERVAL '7 days')
  AND primeiro_acesso = false;

-- 4. FINAL: Verificar estrutura da tabela
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
