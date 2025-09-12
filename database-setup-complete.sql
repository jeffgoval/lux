-- =====================================================
-- COMPLETE DATABASE SETUP AND MIGRATION SCRIPT
-- Fixes all authentication and onboarding issues
-- Safe to run multiple times (idempotent)
-- =====================================================

-- Set client encoding and timezone
SET client_encoding = 'UTF8';
SET timezone = 'UTC';

-- Create a log table for tracking setup progress
CREATE TABLE IF NOT EXISTS public.setup_log (
  id SERIAL PRIMARY KEY,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL, -- 'START', 'SUCCESS', 'ERROR', 'SKIP'
  message TEXT NOT NULL,
  details JSONB,
  execution_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Function to log setup progress
CREATE OR REPLACE FUNCTION public.log_setup_progress(
  p_step TEXT,
  p_status TEXT,
  p_message TEXT,
  p_details JSONB DEFAULT NULL
)
RETURNS VOID AS $
BEGIN
  INSERT INTO public.setup_log (
    step_name,
    status,
    message,
    details,
    execution_timestamp
  ) VALUES (
    p_step,
    p_status,
    p_message,
    p_details,
    now()
  );
  
  RAISE NOTICE '[%] %: %', p_status, p_step, p_message;
END;
$ LANGUAGE plpgsql;

-- Start setup
SELECT public.log_setup_progress('SETUP_START', 'START', 'Starting complete database setup');

-- =====================================================
-- STEP 1: CREATE ENUMS AND TYPES
-- =====================================================

SELECT public.log_setup_progress('STEP_1', 'START', 'Creating enums and types');

-- User role types
DO $ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type') THEN
        CREATE TYPE public.user_role_type AS ENUM (
          'super_admin',
          'proprietaria', 
          'gerente',
          'profissionais',
          'recepcionistas',
          'visitante',
          'cliente'
        );
        PERFORM public.log_setup_progress('STEP_1', 'SUCCESS', 'Created user_role_type enum');
    ELSE
        PERFORM public.log_setup_progress('STEP_1', 'SKIP', 'user_role_type enum already exists');
    END IF;
END $;

-- Procedure types
DO $ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_procedimento') THEN
        CREATE TYPE public.tipo_procedimento AS ENUM (
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
        PERFORM public.log_setup_progress('STEP_1', 'SUCCESS', 'Created tipo_procedimento enum');
    ELSE
        PERFORM public.log_setup_progress('STEP_1', 'SKIP', 'tipo_procedimento enum already exists');
    END IF;
END $;

-- =====================================================
-- STEP 2: CREATE CORE TABLES
-- =====================================================

SELECT public.log_setup_progress('STEP_2', 'START', 'Creating core tables');

-- User profiles table
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
  clinica_id UUID, -- Will be set after clinic creation
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- Add unique constraint if it doesn't exist
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_roles_user_role_clinic_unique'
    ) THEN
        ALTER TABLE public.user_roles 
        ADD CONSTRAINT user_roles_user_role_clinic_unique 
        UNIQUE(user_id, role, clinica_id);
    END IF;
END $;

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
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraints if they don't exist
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profissionais_unique_user'
    ) THEN
        ALTER TABLE public.profissionais 
        ADD CONSTRAINT profissionais_unique_user UNIQUE (user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profissionais_unique_registro'
    ) THEN
        ALTER TABLE public.profissionais 
        ADD CONSTRAINT profissionais_unique_registro UNIQUE (registro_profissional);
    END IF;
END $;

-- Clinic-Professional relationship table
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

-- Add unique constraint if it doesn't exist
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'clinica_profissionais_unique'
    ) THEN
        ALTER TABLE public.clinica_profissionais 
        ADD CONSTRAINT clinica_profissionais_unique UNIQUE(clinica_id, user_id);
    END IF;
END $;

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

SELECT public.log_setup_progress('STEP_2', 'SUCCESS', 'Core tables created successfully');

-- =====================================================
-- STEP 3: ADD FOREIGN KEY CONSTRAINTS
-- =====================================================

SELECT public.log_setup_progress('STEP_3', 'START', 'Adding foreign key constraints');

-- Add foreign key from user_roles to clinicas if it doesn't exist
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_roles_clinica_fkey'
    ) THEN
        ALTER TABLE public.user_roles 
        ADD CONSTRAINT user_roles_clinica_fkey 
        FOREIGN KEY (clinica_id) REFERENCES public.clinicas(id) ON DELETE SET NULL;
        PERFORM public.log_setup_progress('STEP_3', 'SUCCESS', 'Added user_roles_clinica_fkey constraint');
    ELSE
        PERFORM public.log_setup_progress('STEP_3', 'SKIP', 'user_roles_clinica_fkey constraint already exists');
    END IF;
END $;

-- =====================================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

SELECT public.log_setup_progress('STEP_4', 'START', 'Creating performance indexes');

-- Function to create index if it doesn't exist
CREATE OR REPLACE FUNCTION public.create_index_if_not_exists(
    index_name TEXT,
    table_name TEXT,
    column_spec TEXT
) RETURNS VOID AS $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = index_name
    ) THEN
        EXECUTE format('CREATE INDEX %I ON %I (%s)', index_name, table_name, column_spec);
        PERFORM public.log_setup_progress('STEP_4', 'SUCCESS', format('Created index %s', index_name));
    ELSE
        PERFORM public.log_setup_progress('STEP_4', 'SKIP', format('Index %s already exists', index_name));
    END IF;
END;
$ LANGUAGE plpgsql;

-- Create all indexes
SELECT public.create_index_if_not_exists('idx_profiles_email', 'profiles', 'email');
SELECT public.create_index_if_not_exists('idx_profiles_ativo', 'profiles', 'ativo');
SELECT public.create_index_if_not_exists('idx_user_roles_user_id', 'user_roles', 'user_id');
SELECT public.create_index_if_not_exists('idx_user_roles_clinica_id', 'user_roles', 'clinica_id');
SELECT public.create_index_if_not_exists('idx_user_roles_role', 'user_roles', 'role');
SELECT public.create_index_if_not_exists('idx_user_roles_ativo', 'user_roles', 'ativo');
SELECT public.create_index_if_not_exists('idx_clinicas_ativo', 'clinicas', 'ativo');
SELECT public.create_index_if_not_exists('idx_clinicas_criado_por', 'clinicas', 'criado_por');
SELECT public.create_index_if_not_exists('idx_clinicas_nome', 'clinicas', 'nome');
SELECT public.create_index_if_not_exists('idx_profissionais_user_id', 'profissionais', 'user_id');
SELECT public.create_index_if_not_exists('idx_profissionais_registro', 'profissionais', 'registro_profissional');
SELECT public.create_index_if_not_exists('idx_profissionais_ativo', 'profissionais', 'ativo');
SELECT public.create_index_if_not_exists('idx_clinica_profissionais_clinica', 'clinica_profissionais', 'clinica_id');
SELECT public.create_index_if_not_exists('idx_clinica_profissionais_user', 'clinica_profissionais', 'user_id');
SELECT public.create_index_if_not_exists('idx_clinica_profissionais_ativo', 'clinica_profissionais', 'ativo');
SELECT public.create_index_if_not_exists('idx_templates_clinica', 'templates_procedimentos', 'clinica_id');
SELECT public.create_index_if_not_exists('idx_templates_tipo', 'templates_procedimentos', 'tipo_procedimento');
SELECT public.create_index_if_not_exists('idx_templates_ativo', 'templates_procedimentos', 'ativo');
SELECT public.create_index_if_not_exists('idx_especialidades_nome', 'especialidades_medicas', 'nome');
SELECT public.create_index_if_not_exists('idx_especialidades_ativo', 'especialidades_medicas', 'ativo');

-- =====================================================
-- STEP 5: CREATE TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =====================================================

SELECT public.log_setup_progress('STEP_5', 'START', 'Creating timestamp triggers');

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$ language 'plpgsql';

-- Function to create trigger if it doesn't exist
CREATE OR REPLACE FUNCTION public.create_trigger_if_not_exists(
    trigger_name TEXT,
    table_name TEXT
) RETURNS VOID AS $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = trigger_name AND event_object_table = table_name
    ) THEN
        EXECUTE format(
            'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
            trigger_name, table_name
        );
        PERFORM public.log_setup_progress('STEP_5', 'SUCCESS', format('Created trigger %s', trigger_name));
    ELSE
        PERFORM public.log_setup_progress('STEP_5', 'SKIP', format('Trigger %s already exists', trigger_name));
    END IF;
END;
$ LANGUAGE plpgsql;

-- Create all triggers
SELECT public.create_trigger_if_not_exists('update_profiles_updated_at', 'profiles');
SELECT public.create_trigger_if_not_exists('update_clinicas_updated_at', 'clinicas');
SELECT public.create_trigger_if_not_exists('update_profissionais_updated_at', 'profissionais');
SELECT public.create_trigger_if_not_exists('update_clinica_profissionais_updated_at', 'clinica_profissionais');
SELECT public.create_trigger_if_not_exists('update_templates_procedimentos_updated_at', 'templates_procedimentos');

-- =====================================================
-- STEP 6: INSERT INITIAL DATA
-- =====================================================

SELECT public.log_setup_progress('STEP_6', 'START', 'Inserting initial reference data');

-- Insert basic medical specialties
INSERT INTO public.especialidades_medicas (nome, descricao, codigo_cbo) 
VALUES
  ('Dermatologia', 'Especialidade médica que se ocupa do diagnóstico, tratamento e prevenção de doenças e afecções relacionadas à pele', '2251-42'),
  ('Cirurgia Plástica', 'Especialidade médica que se dedica à correção de defeitos congênitos ou adquiridos', '2251-43'),
  ('Medicina Estética', 'Área médica focada em procedimentos estéticos não cirúrgicos', '2251-44'),
  ('Fisioterapia Dermatofuncional', 'Especialidade da fisioterapia voltada para tratamentos estéticos', '2236-40'),
  ('Biomedicina Estética', 'Área da biomedicina focada em procedimentos estéticos', '2211-05'),
  ('Enfermagem Estética', 'Especialidade da enfermagem voltada para procedimentos estéticos', '2235-65')
ON CONFLICT (nome) DO NOTHING;

SELECT public.log_setup_progress('STEP_6', 'SUCCESS', 'Initial reference data inserted');

-- =====================================================
-- STEP 7: ENABLE ROW LEVEL SECURITY
-- =====================================================

SELECT public.log_setup_progress('STEP_7', 'START', 'Enabling Row Level Security');

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinica_profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.especialidades_medicas ENABLE ROW LEVEL SECURITY;

SELECT public.log_setup_progress('STEP_7', 'SUCCESS', 'RLS enabled on all tables');

-- =====================================================
-- STEP 8: CREATE RLS POLICIES
-- =====================================================

SELECT public.log_setup_progress('STEP_8', 'START', 'Creating RLS policies');

-- Function to drop policy if exists
CREATE OR REPLACE FUNCTION public.drop_policy_if_exists(
    policy_name TEXT,
    table_name TEXT
) RETURNS VOID AS $
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = policy_name AND tablename = table_name
    ) THEN
        EXECUTE format('DROP POLICY %I ON %I', policy_name, table_name);
        PERFORM public.log_setup_progress('STEP_8', 'SUCCESS', format('Dropped existing policy %s', policy_name));
    END IF;
END;
$ LANGUAGE plpgsql;

-- Drop existing policies
SELECT public.drop_policy_if_exists('profiles_user_access', 'profiles');
SELECT public.drop_policy_if_exists('profiles_view_others', 'profiles');
SELECT public.drop_policy_if_exists('user_roles_create_initial', 'user_roles');
SELECT public.drop_policy_if_exists('user_roles_view_own', 'user_roles');
SELECT public.drop_policy_if_exists('user_roles_update_own', 'user_roles');
SELECT public.drop_policy_if_exists('user_roles_clinic_management', 'user_roles');
SELECT public.drop_policy_if_exists('clinicas_create_first', 'clinicas');
SELECT public.drop_policy_if_exists('clinicas_view_associated', 'clinicas');
SELECT public.drop_policy_if_exists('clinicas_update_owners', 'clinicas');
SELECT public.drop_policy_if_exists('profissionais_create_own', 'profissionais');
SELECT public.drop_policy_if_exists('profissionais_view_own', 'profissionais');
SELECT public.drop_policy_if_exists('profissionais_update_own', 'profissionais');
SELECT public.drop_policy_if_exists('clinica_profissionais_create_own', 'clinica_profissionais');
SELECT public.drop_policy_if_exists('clinica_profissionais_view_own', 'clinica_profissionais');
SELECT public.drop_policy_if_exists('clinica_profissionais_update_own', 'clinica_profissionais');
SELECT public.drop_policy_if_exists('templates_clinic_access', 'templates_procedimentos');
SELECT public.drop_policy_if_exists('especialidades_read_all', 'especialidades_medicas');
SELECT public.drop_policy_if_exists('especialidades_admin_modify', 'especialidades_medicas');

-- Create new policies

-- Profiles policies
CREATE POLICY "profiles_user_access"
ON public.profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_view_others"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clinica_profissionais cp1
    JOIN public.clinica_profissionais cp2 ON cp1.clinica_id = cp2.clinica_id
    WHERE cp1.user_id = auth.uid() 
      AND cp2.user_id = public.profiles.id
      AND cp1.ativo = true 
      AND cp2.ativo = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
      AND role = 'super_admin'
      AND ativo = true
  )
);

-- User roles policies
CREATE POLICY "user_roles_create_initial"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('proprietaria', 'visitante', 'profissionais')
);

CREATE POLICY "user_roles_view_own"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "user_roles_update_own"
ON public.user_roles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    OLD.role = NEW.role
    AND OLD.user_id = NEW.user_id
  )
);

CREATE POLICY "user_roles_clinic_management"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.clinica_profissionais
    WHERE user_id = auth.uid()
      AND clinica_id = public.user_roles.clinica_id
      AND ativo = true
  )
  AND
  EXISTS (
    SELECT 1 FROM public.user_roles owner_role
    WHERE owner_role.user_id = auth.uid()
      AND owner_role.role IN ('proprietaria', 'gerente')
      AND owner_role.ativo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinica_profissionais
    WHERE user_id = auth.uid()
      AND clinica_id = public.user_roles.clinica_id
      AND ativo = true
  )
);

-- Clinicas policies
CREATE POLICY "clinicas_create_first"
ON public.clinicas
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'proprietaria'
      AND ativo = true
  )
);

CREATE POLICY "clinicas_view_associated"
ON public.clinicas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clinica_profissionais
    WHERE user_id = auth.uid()
      AND clinica_id = public.clinicas.id
      AND ativo = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND clinica_id = public.clinicas.id
      AND ativo = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND ativo = true
  )
);

CREATE POLICY "clinicas_update_owners"
ON public.clinicas
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND clinica_id = public.clinicas.id
      AND role IN ('proprietaria', 'gerente')
      AND ativo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND clinica_id = public.clinicas.id
      AND role IN ('proprietaria', 'gerente')
      AND ativo = true
  )
);

-- Profissionais policies
CREATE POLICY "profissionais_create_own"
ON public.profissionais
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profissionais_view_own"
ON public.profissionais
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.clinica_profissionais cp1
    JOIN public.clinica_profissionais cp2 ON cp1.clinica_id = cp2.clinica_id
    WHERE cp1.user_id = auth.uid()
      AND cp2.user_id = public.profissionais.user_id
      AND cp1.ativo = true
      AND cp2.ativo = true
  )
  AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('proprietaria', 'gerente')
      AND ativo = true
  )
);

CREATE POLICY "profissionais_update_own"
ON public.profissionais
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Clinica profissionais policies
CREATE POLICY "clinica_profissionais_create_own"
ON public.clinica_profissionais
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND
  (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'proprietaria'
        AND ativo = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND clinica_id = public.clinica_profissionais.clinica_id
        AND ativo = true
    )
  )
);

CREATE POLICY "clinica_profissionais_view_own"
ON public.clinica_profissionais
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND clinica_id = public.clinica_profissionais.clinica_id
      AND role IN ('proprietaria', 'gerente')
      AND ativo = true
  )
);

CREATE POLICY "clinica_profissionais_update_own"
ON public.clinica_profissionais
FOR UPDATE
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND clinica_id = public.clinica_profissionais.clinica_id
      AND role IN ('proprietaria', 'gerente')
      AND ativo = true
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND clinica_id = public.clinica_profissionais.clinica_id
      AND role IN ('proprietaria', 'gerente')
      AND ativo = true
  )
);

-- Templates policies
CREATE POLICY "templates_clinic_access"
ON public.templates_procedimentos
FOR ALL
USING (
  clinica_id IS NULL
  OR
  EXISTS (
    SELECT 1 FROM public.clinica_profissionais
    WHERE user_id = auth.uid()
      AND clinica_id = public.templates_procedimentos.clinica_id
      AND ativo = true
  )
)
WITH CHECK (
  clinica_id IS NULL
  OR
  EXISTS (
    SELECT 1 FROM public.clinica_profissionais
    WHERE user_id = auth.uid()
      AND clinica_id = public.templates_procedimentos.clinica_id
      AND ativo = true
  )
);

-- Especialidades policies
CREATE POLICY "especialidades_read_all"
ON public.especialidades_medicas
FOR SELECT
USING (true);

CREATE POLICY "especialidades_admin_modify"
ON public.especialidades_medicas
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND ativo = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND ativo = true
  )
);

SELECT public.log_setup_progress('STEP_8', 'SUCCESS', 'RLS policies created successfully');

-- =====================================================
-- STEP 9: ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

SELECT public.log_setup_progress('STEP_9', 'START', 'Adding table comments');

COMMENT ON TABLE public.profiles IS 'User profile information';
COMMENT ON TABLE public.user_roles IS 'User roles and permissions within clinics';
COMMENT ON TABLE public.clinicas IS 'Clinic information and settings';
COMMENT ON TABLE public.profissionais IS 'Professional credentials and information';
COMMENT ON TABLE public.clinica_profissionais IS 'Relationship between professionals and clinics';
COMMENT ON TABLE public.templates_procedimentos IS 'Procedure templates for clinics';
COMMENT ON TABLE public.especialidades_medicas IS 'Medical specialties reference data';

SELECT public.log_setup_progress('STEP_9', 'SUCCESS', 'Table comments added');

-- =====================================================
-- STEP 10: FINAL VERIFICATION
-- =====================================================

SELECT public.log_setup_progress('STEP_10', 'START', 'Running final verification');

-- Verify all tables exist
DO $
DECLARE
  missing_tables TEXT[];
  expected_tables TEXT[] := ARRAY[
    'profiles', 'user_roles', 'clinicas', 'profissionais',
    'clinica_profissionais', 'templates_procedimentos', 'especialidades_medicas'
  ];
BEGIN
  SELECT array_agg(expected_table) INTO missing_tables
  FROM unnest(expected_tables) AS expected_table
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = expected_table
  );
  
  IF missing_tables IS NOT NULL AND array_length(missing_tables, 1) > 0 THEN
    PERFORM public.log_setup_progress('STEP_10', 'ERROR', 'Missing tables found', 
      jsonb_build_object('missing_tables', missing_tables));
  ELSE
    PERFORM public.log_setup_progress('STEP_10', 'SUCCESS', 'All required tables exist');
  END IF;
END $;

-- Verify RLS is enabled
DO $
DECLARE
  tables_without_rls TEXT[];
  expected_tables TEXT[] := ARRAY[
    'profiles', 'user_roles', 'clinicas', 'profissionais',
    'clinica_profissionais', 'templates_procedimentos', 'especialidades_medicas'
  ];
BEGIN
  SELECT array_agg(tablename) INTO tables_without_rls
  FROM pg_tables 
  WHERE schemaname = 'public' 
    AND tablename = ANY(expected_tables)
    AND rowsecurity = false;
  
  IF tables_without_rls IS NOT NULL AND array_length(tables_without_rls, 1) > 0 THEN
    PERFORM public.log_setup_progress('STEP_10', 'ERROR', 'Tables without RLS found', 
      jsonb_build_object('tables_without_rls', tables_without_rls));
  ELSE
    PERFORM public.log_setup_progress('STEP_10', 'SUCCESS', 'RLS enabled on all required tables');
  END IF;
END $;

-- Verify reference data exists
DO $
DECLARE
  specialty_count INTEGER;
BEGIN
  SELECT count(*) INTO specialty_count FROM public.especialidades_medicas WHERE ativo = true;
  
  IF specialty_count = 0 THEN
    PERFORM public.log_setup_progress('STEP_10', 'ERROR', 'No reference data found');
  ELSE
    PERFORM public.log_setup_progress('STEP_10', 'SUCCESS', 
      format('Reference data verified: %s specialties', specialty_count));
  END IF;
END $;

-- =====================================================
-- COMPLETION AND CLEANUP
-- =====================================================

-- Final success message
SELECT public.log_setup_progress('SETUP_COMPLETE', 'SUCCESS', 'Database setup completed successfully');

-- Generate setup summary
DO $
DECLARE
  setup_summary JSONB;
  error_count INTEGER;
  success_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT 
    count(*) FILTER (WHERE status = 'ERROR') as errors,
    count(*) FILTER (WHERE status = 'SUCCESS') as successes,
    count(*) as total
  INTO error_count, success_count, total_count
  FROM public.setup_log;
  
  setup_summary := jsonb_build_object(
    'total_steps', total_count,
    'successful_steps', success_count,
    'failed_steps', error_count,
    'success_rate', ROUND((success_count::DECIMAL / total_count * 100), 2),
    'completion_time', now(),
    'status', CASE WHEN error_count = 0 THEN 'SUCCESS' ELSE 'PARTIAL_SUCCESS' END
  );
  
  PERFORM public.log_setup_progress('SETUP_SUMMARY', 'SUCCESS', 'Setup summary generated', setup_summary);
  
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'DATABASE SETUP COMPLETED';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Status: %', setup_summary->>'status';
  RAISE NOTICE 'Success Rate: %% %', setup_summary->>'success_rate';
  RAISE NOTICE 'Total Steps: %', setup_summary->>'total_steps';
  RAISE NOTICE 'Successful: %', setup_summary->>'successful_steps';
  RAISE NOTICE 'Failed: %', setup_summary->>'failed_steps';
  RAISE NOTICE '=================================================';
  
  IF error_count > 0 THEN
    RAISE NOTICE 'Check setup_log table for error details';
  ELSE
    RAISE NOTICE 'All systems ready for onboarding!';
  END IF;
END $;

-- Clean up temporary functions (optional)
-- DROP FUNCTION IF EXISTS public.create_index_if_not_exists(TEXT, TEXT, TEXT);
-- DROP FUNCTION IF EXISTS public.create_trigger_if_not_exists(TEXT, TEXT);
-- DROP FUNCTION IF EXISTS public.drop_policy_if_exists(TEXT, TEXT);

-- Add final comment to track completion
COMMENT ON SCHEMA public IS 'Complete database setup completed - ' || now();