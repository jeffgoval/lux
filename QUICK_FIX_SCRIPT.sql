-- =====================================================
-- QUICK FIX SCRIPT - EXECUTE IMEDIATAMENTE
-- Resolve todos os problemas de autenticação em uma execução
-- =====================================================

-- Este script pode ser executado diretamente no Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/[SEU_PROJECT_ID]/sql

-- =====================================================
-- INÍCIO DA CORREÇÃO RÁPIDA
-- =====================================================

DO $QUICK_FIX$
BEGIN
  RAISE NOTICE '🚀 INICIANDO CORREÇÃO RÁPIDA DO SISTEMA DE AUTENTICAÇÃO';
  RAISE NOTICE '⏰ Timestamp: %', now();
END $QUICK_FIX$;

-- =====================================================
-- 1. CRIAR ENUMS NECESSÁRIOS
-- =====================================================

-- User role types
DO $user_role_enum$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type') THEN
        CREATE TYPE public.user_role_type AS ENUM (
          'super_admin', 'proprietaria', 'gerente', 'profissionais', 
          'recepcionistas', 'visitante', 'cliente'
        );
        RAISE NOTICE '✅ Created user_role_type enum';
    ELSE
        RAISE NOTICE '⏭️  user_role_type enum already exists';
    END IF;
END $user_role_enum$;

-- Procedure types
DO $procedure_enum$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_procedimento') THEN
        CREATE TYPE public.tipo_procedimento AS ENUM (
          'consulta', 'botox_toxina', 'preenchimento', 'harmonizacao_facial',
          'laser_ipl', 'peeling', 'tratamento_corporal', 'skincare_avancado',
          'limpeza_pele', 'outros'
        );
        RAISE NOTICE '✅ Created tipo_procedimento enum';
    ELSE
        RAISE NOTICE '⏭️  tipo_procedimento enum already exists';
    END IF;
END $procedure_enum$;

-- =====================================================
-- 2. CRIAR TABELAS ESSENCIAIS
-- =====================================================

-- Profiles table
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

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role_type NOT NULL,
  clinica_id UUID,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Clinics table
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

-- Medical specialties table
CREATE TABLE IF NOT EXISTS public.especialidades_medicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  codigo_cbo TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Professionals table
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
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT profissionais_unique_user UNIQUE (user_id),
  CONSTRAINT profissionais_unique_registro UNIQUE (registro_profissional)
);

-- Clinic-Professional relationship table (CRÍTICA!)
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
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT clinica_profissionais_unique UNIQUE(clinica_id, user_id)
);

-- Procedure templates table
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

-- =====================================================
-- 3. ADICIONAR FOREIGN KEYS
-- =====================================================

-- Add foreign key from user_roles to clinicas
DO $foreign_key$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_roles_clinica_fkey'
    ) THEN
        ALTER TABLE public.user_roles 
        ADD CONSTRAINT user_roles_clinica_fkey 
        FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Added user_roles_clinica_fkey constraint';
    ELSE
        RAISE NOTICE '⏭️  user_roles_clinica_fkey constraint already exists';
    END IF;
END $foreign_key$;

-- =====================================================
-- 4. CRIAR ÍNDICES ESSENCIAIS
-- =====================================================

-- Function to create index if not exists
CREATE OR REPLACE FUNCTION create_index_safe(index_name TEXT, table_name TEXT, column_spec TEXT)
RETURNS VOID AS $index_func$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = index_name) THEN
        EXECUTE format('CREATE INDEX %I ON %I (%s)', index_name, table_name, column_spec);
        RAISE NOTICE '✅ Created index %', index_name;
    ELSE
        RAISE NOTICE '⏭️  Index % already exists', index_name;
    END IF;
END;
$index_func$ LANGUAGE plpgsql;

-- Create essential indexes
SELECT create_index_safe('idx_profiles_email', 'profiles', 'email');
SELECT create_index_safe('idx_user_roles_user_id', 'user_roles', 'user_id');
SELECT create_index_safe('idx_user_roles_clinica_id', 'user_roles', 'clinica_id');
SELECT create_index_safe('idx_clinicas_ativo', 'clinicas', 'ativo');
SELECT create_index_safe('idx_profissionais_user_id', 'profissionais', 'user_id');
SELECT create_index_safe('idx_clinica_profissionais_clinica', 'clinica_profissionais', 'clinica_id');
SELECT create_index_safe('idx_clinica_profissionais_user', 'clinica_profissionais', 'user_id');
SELECT create_index_safe('idx_templates_clinica', 'templates_procedimentos', 'clinica_id');

-- =====================================================
-- 5. INSERIR DADOS DE REFERÊNCIA
-- =====================================================

INSERT INTO public.especialidades_medicas (nome, descricao, codigo_cbo) 
VALUES
  ('Dermatologia', 'Especialidade médica que se ocupa do diagnóstico, tratamento e prevenção de doenças e afecções relacionadas à pele', '2251-42'),
  ('Cirurgia Plástica', 'Especialidade médica que se dedica à correção de defeitos congênitos ou adquiridos', '2251-43'),
  ('Medicina Estética', 'Área médica focada em procedimentos estéticos não cirúrgicos', '2251-44'),
  ('Fisioterapia Dermatofuncional', 'Especialidade da fisioterapia voltada para tratamentos estéticos', '2236-40'),
  ('Biomedicina Estética', 'Área da biomedicina focada em procedimentos estéticos', '2211-05'),
  ('Enfermagem Estética', 'Especialidade da enfermagem voltada para procedimentos estéticos', '2235-65')
ON CONFLICT (nome) DO NOTHING;

-- =====================================================
-- 6. HABILITAR RLS
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinica_profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.especialidades_medicas ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. CRIAR POLÍTICAS RLS PERMISSIVAS PARA ONBOARDING
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "profiles_user_access" ON public.profiles;
DROP POLICY IF EXISTS "user_roles_create_initial" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_view_own" ON public.user_roles;
DROP POLICY IF EXISTS "clinicas_create_first" ON public.clinicas;
DROP POLICY IF EXISTS "clinicas_view_associated" ON public.clinicas;
DROP POLICY IF EXISTS "profissionais_create_own" ON public.profissionais;
DROP POLICY IF EXISTS "profissionais_view_own" ON public.profissionais;
DROP POLICY IF EXISTS "clinica_profissionais_create_own" ON public.clinica_profissionais;
DROP POLICY IF EXISTS "clinica_profissionais_view_own" ON public.clinica_profissionais;
DROP POLICY IF EXISTS "templates_clinic_access" ON public.templates_procedimentos;
DROP POLICY IF EXISTS "especialidades_read_all" ON public.especialidades_medicas;

-- Create permissive policies for onboarding

-- Profiles: Users can manage their own profile
CREATE POLICY "profiles_user_access"
ON public.profiles FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- User roles: Users can create and view their own roles
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

-- Clinicas: Users with proprietaria role can create clinics
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

-- Profissionais: Users can create their own professional profile
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

-- Clinica profissionais: Users can link themselves to clinics
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

-- Templates: Clinic members can manage templates
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

-- Especialidades: Everyone can read, only admins can modify
CREATE POLICY "especialidades_read_all"
ON public.especialidades_medicas FOR SELECT
USING (true);

-- =====================================================
-- 8. CRIAR TRIGGERS PARA TIMESTAMPS
-- =====================================================

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $update_func$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$update_func$ language 'plpgsql';

-- Create triggers
DO $triggers$
BEGIN
    -- Profiles trigger
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_profiles_updated_at'
    ) THEN
        CREATE TRIGGER update_profiles_updated_at
        BEFORE UPDATE ON public.profiles
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
        RAISE NOTICE '✅ Created profiles timestamp trigger';
    END IF;
    
    -- Clinicas trigger
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_clinicas_updated_at'
    ) THEN
        CREATE TRIGGER update_clinicas_updated_at
        BEFORE UPDATE ON public.clinicas
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
        RAISE NOTICE '✅ Created clinicas timestamp trigger';
    END IF;
    
    -- Profissionais trigger
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_profissionais_updated_at'
    ) THEN
        CREATE TRIGGER update_profissionais_updated_at
        BEFORE UPDATE ON public.profissionais
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
        RAISE NOTICE '✅ Created profissionais timestamp trigger';
    END IF;
    
    -- Clinica profissionais trigger
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_clinica_profissionais_updated_at'
    ) THEN
        CREATE TRIGGER update_clinica_profissionais_updated_at
        BEFORE UPDATE ON public.clinica_profissionais
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
        RAISE NOTICE '✅ Created clinica_profissionais timestamp trigger';
    END IF;
END $triggers$;

-- =====================================================
-- 9. VERIFICAÇÃO FINAL
-- =====================================================

-- Quick verification function
CREATE OR REPLACE FUNCTION public.quick_verification()
RETURNS JSONB AS $verify_func$
DECLARE
  result JSONB;
  table_count INTEGER;
  policy_count INTEGER;
  specialty_count INTEGER;
BEGIN
  -- Count tables
  SELECT count(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN (
      'profiles', 'user_roles', 'clinicas', 'profissionais',
      'clinica_profissionais', 'templates_procedimentos', 'especialidades_medicas'
    );
  
  -- Count policies
  SELECT count(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public';
  
  -- Count specialties
  SELECT count(*) INTO specialty_count
  FROM public.especialidades_medicas 
  WHERE ativo = true;
  
  result := jsonb_build_object(
    'timestamp', now(),
    'tables_created', table_count,
    'expected_tables', 7,
    'policies_created', policy_count,
    'specialties_inserted', specialty_count,
    'status', CASE 
      WHEN table_count = 7 AND policy_count > 10 AND specialty_count > 0 
      THEN 'SUCCESS' 
      ELSE 'INCOMPLETE' 
    END,
    'ready_for_onboarding', table_count = 7 AND policy_count > 10
  );
  
  RETURN result;
END;
$verify_func$ LANGUAGE plpgsql;

-- =====================================================
-- 10. EXECUTAR VERIFICAÇÃO E MOSTRAR RESULTADO
-- =====================================================

-- Execute verification
SELECT public.quick_verification() as verification_result;

-- Show table status
SELECT 
  table_name,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count,
  (SELECT rowsecurity FROM pg_tables WHERE tablename = t.table_name AND schemaname = 'public') as rls_enabled
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
  AND t.table_name IN (
    'profiles', 'user_roles', 'clinicas', 'profissionais',
    'clinica_profissionais', 'templates_procedimentos', 'especialidades_medicas'
  )
ORDER BY t.table_name;

-- Show policy count by table
SELECT 
  tablename,
  count(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Clean up temporary function
DROP FUNCTION IF EXISTS create_index_safe(TEXT, TEXT, TEXT);

-- =====================================================
-- MENSAGEM FINAL
-- =====================================================

DO $FINAL$
BEGIN
  RAISE NOTICE '🎉 CORREÇÃO RÁPIDA CONCLUÍDA!';
  RAISE NOTICE '✅ Todas as tabelas essenciais foram criadas';
  RAISE NOTICE '✅ Políticas RLS configuradas para onboarding';
  RAISE NOTICE '✅ Dados de referência inseridos';
  RAISE NOTICE '✅ Índices e triggers criados';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 PRÓXIMOS PASSOS:';
  RAISE NOTICE '1. Atualize o código do backend';
  RAISE NOTICE '2. Teste o endpoint de onboarding';
  RAISE NOTICE '3. Verifique se o fluxo completo funciona';
  RAISE NOTICE '';
  RAISE NOTICE '📋 VERIFICAÇÃO:';
  RAISE NOTICE 'Execute: SELECT public.quick_verification();';
  RAISE NOTICE '';
  RAISE NOTICE '⏰ Concluído em: %', now();
END $FINAL$;