-- Migração para adicionar colunas faltantes na tabela clinicas
-- Data: 2025-01-13
-- Descrição: Adiciona as colunas cnpj, endereco, telefone_principal, email_contato, horario_funcionamento e organizacao_id

-- Adicionar coluna cnpj
ALTER TABLE public.clinicas 
ADD COLUMN IF NOT EXISTS cnpj TEXT;

-- Adicionar coluna endereco como JSONB
ALTER TABLE public.clinicas 
ADD COLUMN IF NOT EXISTS endereco JSONB DEFAULT '{}'::jsonb;

-- Adicionar coluna telefone_principal
ALTER TABLE public.clinicas 
ADD COLUMN IF NOT EXISTS telefone_principal TEXT;

-- Adicionar coluna email_contato
ALTER TABLE public.clinicas 
ADD COLUMN IF NOT EXISTS email_contato TEXT;

-- Adicionar coluna horario_funcionamento como JSONB
ALTER TABLE public.clinicas 
ADD COLUMN IF NOT EXISTS horario_funcionamento JSONB DEFAULT '{}'::jsonb;

-- Adicionar coluna organizacao_id se não existir
ALTER TABLE public.clinicas 
ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE SET NULL;

-- Adicionar coluna especialidades na tabela profissionais se não existir
ALTER TABLE public.profissionais 
ADD COLUMN IF NOT EXISTS especialidades TEXT[];

-- Adicionar constraints de validação
ALTER TABLE public.clinicas 
ADD CONSTRAINT IF NOT EXISTS clinicas_cnpj_format 
CHECK (cnpj IS NULL OR LENGTH(cnpj) >= 11);

ALTER TABLE public.clinicas 
ADD CONSTRAINT IF NOT EXISTS clinicas_email_format 
CHECK (email_contato IS NULL OR email_contato ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_clinicas_cnpj ON public.clinicas(cnpj);
CREATE INDEX IF NOT EXISTS idx_clinicas_organizacao_id ON public.clinicas(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_clinicas_ativo ON public.clinicas(ativo);

-- Comentários explicativos
COMMENT ON COLUMN public.clinicas.cnpj IS 'CNPJ da clínica (formato: 11.111.111/0001-11)';
COMMENT ON COLUMN public.clinicas.endereco IS 'Endereço completo da clínica em formato JSON';
COMMENT ON COLUMN public.clinicas.telefone_principal IS 'Telefone principal da clínica';
COMMENT ON COLUMN public.clinicas.email_contato IS 'Email de contato da clínica';
COMMENT ON COLUMN public.clinicas.horario_funcionamento IS 'Horários de funcionamento por dia da semana em formato JSON';
COMMENT ON COLUMN public.clinicas.organizacao_id IS 'ID da organização à qual a clínica pertence (opcional)';