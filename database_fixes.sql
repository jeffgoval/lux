-- 🚀 CORREÇÕES CRÍTICAS DO BANCO DE DADOS
-- Execute este SQL no Supabase Dashboard para corrigir todos os problemas identificados

-- ============================================================================
-- 1. ADICIONAR COLUNAS FALTANTES NA TABELA CLINICAS
-- ============================================================================

ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS endereco JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS telefone_principal TEXT;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS email_contato TEXT;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS horario_funcionamento JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.clinicas ADD COLUMN IF NOT EXISTS organizacao_id UUID;

-- ============================================================================
-- 2. ADICIONAR COLUNAS FALTANTES NA TABELA PROFISSIONAIS
-- ============================================================================

ALTER TABLE public.profissionais ADD COLUMN IF NOT EXISTS especialidades TEXT[];

-- ============================================================================
-- 3. CRIAR TABELAS FALTANTES
-- ============================================================================

-- Tabela de relacionamento clinica_profissionais
CREATE TABLE IF NOT EXISTS public.clinica_profissionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cargo TEXT NOT NULL DEFAULT 'Profissional',
  especialidades TEXT[],
  
  -- Informações de trabalho
  horario_trabalho JSONB,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  
  -- Permissões
  pode_criar_prontuarios BOOLEAN DEFAULT false,
  pode_editar_prontuarios BOOLEAN DEFAULT false,
  pode_visualizar_financeiro BOOLEAN DEFAULT false,
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(clinica_id, user_id)
);

-- Enum para tipos de procedimento
CREATE TYPE IF NOT EXISTS public.tipo_procedimento AS ENUM (
  'consulta',
  'botox_toxina',
  'preenchimento',
  'harmonizacao_facial',
  'laser_ipl',
  'peeling',
  'tratamento_corporal',
  'skincare_avancado',
  'limpeza_pele',
  'outros'
);

-- Tabela de templates de procedimentos
CREATE TABLE IF NOT EXISTS public.templates_procedimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_procedimento tipo_procedimento NOT NULL,
  nome_template TEXT NOT NULL,
  descricao TEXT,
  
  -- Configuração do template
  campos_obrigatorios JSONB DEFAULT '{}'::jsonb,
  campos_opcionais JSONB DEFAULT '{}'::jsonb,
  
  -- Valores padrão
  duracao_padrao_minutos INTEGER DEFAULT 60,
  valor_base DECIMAL(10,2),
  
  -- Status
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- 4. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_clinica_profissionais_clinica ON public.clinica_profissionais(clinica_id);
CREATE INDEX IF NOT EXISTS idx_clinica_profissionais_user ON public.clinica_profissionais(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_tipo ON public.templates_procedimentos(tipo_procedimento);
CREATE INDEX IF NOT EXISTS idx_clinicas_organizacao ON public.clinicas(organizacao_id);

-- ============================================================================
-- 5. CRIAR TRIGGERS PARA TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_clinica_profissionais_updated_at
  BEFORE UPDATE ON public.clinica_profissionais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_templates_procedimentos_updated_at
  BEFORE UPDATE ON public.templates_procedimentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 6. CORRIGIR POLÍTICAS RLS PARA ONBOARDING
-- ============================================================================

-- Remover políticas problemáticas
DROP POLICY IF EXISTS "Users can create initial visitor role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can create their initial role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can create clinics" ON public.clinicas;
DROP POLICY IF EXISTS "Users can create their first clinic" ON public.clinicas;
DROP POLICY IF EXISTS "Users can view accessible clinics" ON public.clinicas;
DROP POLICY IF EXISTS "Users can view their clinics" ON public.clinicas;

-- Políticas permissivas para onboarding
CREATE POLICY "Allow onboarding user_roles"
ON public.user_roles
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow onboarding clinicas"
ON public.clinicas
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow onboarding profissionais"
ON public.profissionais
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow onboarding clinica_profissionais"
ON public.clinica_profissionais
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow onboarding templates_procedimentos"
ON public.templates_procedimentos
FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 7. HABILITAR RLS EM TODAS AS TABELAS
-- ============================================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinica_profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_procedimentos ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar se as colunas foram criadas
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('clinicas', 'profissionais', 'clinica_profissionais', 'templates_procedimentos')
  AND column_name IN ('cnpj', 'endereco', 'telefone_principal', 'email_contato', 'horario_funcionamento', 'especialidades')
ORDER BY table_name, column_name;
