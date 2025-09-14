-- 🚀 MIGRAÇÃO SIMPLIFICADA - Apenas o essencial para funcionar
-- Execute no Supabase SQL Editor: https://supabase.com/dashboard/project/dvnyfwpphuuujhodqkko/sql

-- ========================================
-- PASSO 1: Adicionar colunas essenciais
-- ========================================

ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS endereco JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS telefone_principal TEXT;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS email_contato TEXT;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS horario_funcionamento JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS organizacao_id UUID;

-- ========================================
-- PASSO 2: Adicionar coluna na tabela profissionais
-- ========================================

ALTER TABLE public.profissionais ADD COLUMN IF NOT EXISTS especialidades TEXT[];

-- ========================================
-- FIM DA MIGRAÇÃO ESSENCIAL
-- ========================================

-- Verificar se funcionou:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'clinicas' AND table_schema = 'public';