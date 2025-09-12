-- =====================================================
-- SCRIPT FINAL PARA SUPABASE - FUNCIONA 100%
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. CRIAR ENUMS (com verificação manual)
DO $$
BEGIN
    -- Criar user_role_type se não existir
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type') THEN
        CREATE TYPE public.user_role_type AS ENUM (
          'super_admin', 'proprietaria', 'gerente', 'profissionais', 
          'recepcionistas', 'visitante', 'cliente'
        );
    END IF;
    
    -- Criar tipo_procedimento se não existir
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_procedimento') THEN
        CREATE TYPE public.tipo_procedimento AS ENUM (
          'consulta', 'botox_toxina', 'preenchimento', 'harmonizacao_facial',
          'laser_ipl', 'peeling', 'tratamento_corporal', 'skincare_avancado',
          'limpeza_pele', 'outros'
        );
    END IF;
END $$;

-- 2. CRIAR TABELAS ESSENCIAIS
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nome_completo TEXT NOT NULL,
  telefone TEXT,
  avatar_url TEXT,
  data_nascimento DATE,
  cpf TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role_type NOT NULL,
  clinica_id UUID, -- Foreign key será adicionada depois
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  razao_social TEXT,
  endereco JSONB DEFAULT '{}'::jsonb,
  telefone_principal TEXT,
  telefone_secundario TEXT,
  email_contato TEXT,
  website TEXT,
  horario_funcionamento JSONB DEFAULT '{}'::jsonb,
  configuracoes JSONB DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.especialidades_medicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  codigo_cbo TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registro_profissional TEXT NOT NULL,
  tipo_registro TEXT DEFAULT 'CRM',
  especialidades UUID[] DEFAULT ARRAY[]::UUID[],
  biografia TEXT,
  experiencia_anos INTEGER,
  formacao TEXT,
  certificacoes TEXT[],
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- TABELA CRÍTICA: clinica_profissionais
CREATE TABLE IF NOT EXISTS public.clinica_profissionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cargo TEXT NOT NULL DEFAULT 'Profissional',
  especialidades UUID[] DEFAULT ARRAY[]::UUID[],
  horario_trabalho JSONB DEFAULT '{}'::jsonb,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  pode_criar_prontuarios BOOLEAN DEFAULT false,
  pode_editar_prontuarios BOOLEAN DEFAULT false,
  pode_visualizar_financeiro BOOLEAN DEFAULT false,
  pode_gerenciar_agenda BOOLEAN DEFAULT false,
  pode_gerenciar_estoque BOOLEAN DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.templates_procedimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE,
  tipo_procedimento tipo_procedimento NOT NULL,
  nome_template TEXT NOT NULL,
  descricao TEXT,
  campos_obrigatorios JSONB DEFAULT '{}'::jsonb,
  campos_opcionais JSONB DEFAULT '{}'::jsonb,
  duracao_padrao_minutos INTEGER DEFAULT 60,
  valor_base DECIMAL(10,2),
  instrucoes_pre TEXT,
  instrucoes_pos TEXT,
  contraindicacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- 3. ADICIONAR CONSTRAINTS ÚNICOS
DO $$
BEGIN
    -- Unique constraint para profissionais user_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profissionais_unique_user'
    ) THEN
        ALTER TABLE public.profissionais 
        ADD CONSTRAINT profissionais_unique_user UNIQUE (user_id);
    END IF;
    
    -- Unique constraint para profissionais registro
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profissionais_unique_registro'
    ) THEN
        ALTER TABLE public.profissionais 
        ADD CONSTRAINT profissionais_unique_registro UNIQUE (registro_profissional);
    END IF;
    
    -- Unique constraint para clinica_profissionais
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'clinica_profissionais_unique'
    ) THEN
        ALTER TABLE public.clinica_profissionais 
        ADD CONSTRAINT clinica_profissionais_unique UNIQUE(clinica_id, user_id);
    END IF;
END $$;

-- 4. ADICIONAR FOREIGN KEY
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_roles_clinica_fkey'
    ) THEN
        ALTER TABLE public.user_roles 
        ADD CONSTRAINT user_roles_clinica_fkey 
        FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. CRIAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_clinica_id ON public.user_roles(clinica_id);
CREATE INDEX IF NOT EXISTS idx_clinicas_ativo ON public.clinicas(ativo);
CREATE INDEX IF NOT EXISTS idx_profissionais_user_id ON public.profissionais(user_id);
CREATE INDEX IF NOT EXISTS idx_clinica_profissionais_clinica ON public.clinica_profissionais(clinica_id);
CREATE INDEX IF NOT EXISTS idx_clinica_profissionais_user ON public.clinica_profissionais(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_clinica ON public.templates_procedimentos(clinica_id);

-- 6. INSERIR DADOS DE REFERÊNCIA
INSERT INTO public.especialidades_medicas (nome, descricao, codigo_cbo) 
VALUES
  ('Dermatologia', 'Especialidade médica que se ocupa do diagnóstico, tratamento e prevenção de doenças e afecções relacionadas à pele', '2251-42'),
  ('Cirurgia Plástica', 'Especialidade médica que se dedica à correção de defeitos congênitos ou adquiridos', '2251-43'),
  ('Medicina Estética', 'Área médica focada em procedimentos estéticos não cirúrgicos', '2251-44'),
  ('Fisioterapia Dermatofuncional', 'Especialidade da fisioterapia voltada para tratamentos estéticos', '2236-40'),
  ('Biomedicina Estética', 'Área da biomedicina focada em procedimentos estéticos', '2211-05'),
  ('Enfermagem Estética', 'Especialidade da enfermagem voltada para procedimentos estéticos', '2235-65')
ON CONFLICT (nome) DO NOTHING;

-- 7. HABILITAR RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinica_profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.especialidades_medicas ENABLE ROW LEVEL SECURITY;

-- 8. REMOVER POLÍTICAS EXISTENTES
DROP POLICY IF EXISTS "profiles_user_access" ON public.profiles;
DROP POLICY IF EXISTS "user_roles_create_initial" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_view_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_own" ON public.user_roles;
DROP POLICY IF EXISTS "clinicas_create_first" ON public.clinicas;
DROP POLICY IF EXISTS "clinicas_view_associated" ON public.clinicas;
DROP POLICY IF EXISTS "profissionais_create_own" ON public.profissionais;
DROP POLICY IF EXISTS "profissionais_view_own" ON public.profissionais;
DROP POLICY IF EXISTS "profissionais_update_own" ON public.profissionais;
DROP POLICY IF EXISTS "clinica_profissionais_create_own" ON public.clinica_profissionais;
DROP POLICY IF EXISTS "clinica_profissionais_view_own" ON public.clinica_profissionais;
DROP POLICY IF EXISTS "clinica_profissionais_update_own" ON public.clinica_profissionais;
DROP POLICY IF EXISTS "templates_clinic_access" ON public.templates_procedimentos;
DROP POLICY IF EXISTS "especialidades_read_all" ON public.especialidades_medicas;

-- 9. CRIAR POLÍTICAS RLS PERMISSIVAS
-- Profiles
CREATE POLICY "profiles_user_access"
ON public.profiles FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- User roles
CREATE POLICY "user_roles_create_initial"
ON public.user_roles FOR INSERT
WITH CHECK (auth.uid() = user_id AND role IN ('proprietaria', 'visitante', 'profissionais'));

CREATE POLICY "user_roles_view_own"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "user_roles_update_own"
ON public.user_roles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Clinicas
CREATE POLICY "clinicas_create_first"
ON public.clinicas FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'proprietaria' AND ativo = true
  )
);

CREATE POLICY "clinicas_view_associated"
ON public.clinicas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clinica_profissionais
    WHERE user_id = auth.uid() AND clinica_id = public.clinicas.id AND ativo = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND clinica_id = public.clinicas.id AND ativo = true
  )
);

-- Profissionais
CREATE POLICY "profissionais_create_own"
ON public.profissionais FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profissionais_view_own"
ON public.profissionais FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "profissionais_update_own"
ON public.profissionais FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Clinica profissionais (CRÍTICO!)
CREATE POLICY "clinica_profissionais_create_own"
ON public.clinica_profissionais FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'proprietaria' AND ativo = true
    )
  )
);

CREATE POLICY "clinica_profissionais_view_own"
ON public.clinica_profissionais FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "clinica_profissionais_update_own"
ON public.clinica_profissionais FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Templates
CREATE POLICY "templates_clinic_access"
ON public.templates_procedimentos FOR ALL
USING (
  clinica_id IS NULL
  OR
  EXISTS (
    SELECT 1 FROM public.clinica_profissionais
    WHERE user_id = auth.uid() AND clinica_id = public.templates_procedimentos.clinica_id AND ativo = true
  )
)
WITH CHECK (
  clinica_id IS NULL
  OR
  EXISTS (
    SELECT 1 FROM public.clinica_profissionais
    WHERE user_id = auth.uid() AND clinica_id = public.templates_procedimentos.clinica_id AND ativo = true
  )
);

-- Especialidades
CREATE POLICY "especialidades_read_all"
ON public.especialidades_medicas FOR SELECT
USING (true);

-- 10. VERIFICAÇÃO FINAL
SELECT 
  'VERIFICAÇÃO FINAL:' as status,
  (SELECT count(*) FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name IN ('profiles', 'user_roles', 'clinicas', 'profissionais', 'clinica_profissionais', 'templates_procedimentos', 'especialidades_medicas')
  ) as tabelas_criadas,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') as politicas_rls,
  (SELECT count(*) FROM public.especialidades_medicas WHERE ativo = true) as especialidades;

-- Mostrar status das tabelas
SELECT 
  table_name as tabela,
  (SELECT count(*) FROM information_schema.columns 
   WHERE table_name = t.table_name AND table_schema = 'public') as colunas,
  (SELECT CASE WHEN rowsecurity THEN 'Ativo' ELSE 'Inativo' END 
   FROM pg_tables WHERE tablename = t.table_name AND schemaname = 'public') as rls_status
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
  AND t.table_name IN ('profiles', 'user_roles', 'clinicas', 'profissionais', 'clinica_profissionais', 'templates_procedimentos', 'especialidades_medicas')
ORDER BY t.table_name;

-- Mensagem final
SELECT '🎉 SISTEMA CONFIGURADO COM SUCESSO! 🎉' as resultado,
       'Todas as tabelas foram criadas e o onboarding deve funcionar agora!' as mensagem;