-- 🔥 MIGRAÇÃO CORRIGIDA - Adicionar colunas faltantes
-- Execute no Supabase SQL Editor

-- Adicionar colunas à tabela clinicas
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS endereco JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS telefone_principal TEXT;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS email_contato TEXT;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS horario_funcionamento JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE SET NULL;

-- Adicionar coluna à tabela profissionais
ALTER TABLE public.profissionais ADD COLUMN IF NOT EXISTS especialidades TEXT[];

-- Criar índices (sem IF NOT EXISTS pois não é suportado para índices)
DO $$
BEGIN
    -- Índice para CNPJ
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'clinicas' AND indexname = 'idx_clinicas_cnpj') THEN
        CREATE INDEX idx_clinicas_cnpj ON public.clinicas(cnpj);
    END IF;
    
    -- Índice para organizacao_id
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'clinicas' AND indexname = 'idx_clinicas_organizacao_id') THEN
        CREATE INDEX idx_clinicas_organizacao_id ON public.clinicas(organizacao_id);
    END IF;
    
    -- Índice para ativo (se não existir)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'clinicas' AND indexname = 'idx_clinicas_ativo') THEN
        CREATE INDEX idx_clinicas_ativo ON public.clinicas(ativo);
    END IF;
END
$$;

-- Adicionar constraints usando DO block para verificar existência
DO $$
BEGIN
    -- Constraint para formato do CNPJ
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clinicas_cnpj_format') THEN
        ALTER TABLE public.clinicas ADD CONSTRAINT clinicas_cnpj_format 
        CHECK (cnpj IS NULL OR LENGTH(cnpj) >= 11);
    END IF;
    
    -- Constraint para formato do email
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clinicas_email_format') THEN
        ALTER TABLE public.clinicas ADD CONSTRAINT clinicas_email_format 
        CHECK (email_contato IS NULL OR email_contato ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;
END
$$;