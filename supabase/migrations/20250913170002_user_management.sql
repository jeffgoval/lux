-- 02 - User Management (profiles, user_roles)

-- Tabela de perfis
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  avatar_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  primeiro_acesso BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir que a coluna user_id exista mesmo se a tabela profiles já existia sem ela
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN user_id UUID;
  END IF;
END $$;

-- Índices
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_ativo ON public.profiles(ativo);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- RLS profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- policies idempotentes
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'profiles_select_own' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY profiles_select_own ON public.profiles
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'profiles_update_own' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY profiles_update_own ON public.profiles
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'profiles_insert_own' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY profiles_insert_own ON public.profiles
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  -- delete apenas admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'profiles_delete_admin' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY profiles_delete_admin ON public.profiles
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin' AND ur.ativo = true
        )
      );
  END IF;
END $$;

-- Tabela de user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organizacao_id UUID,
  clinica_id UUID,
  role public.user_role_type NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  criado_por UUID,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_valid_dates CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_organizacao ON public.user_roles(organizacao_id) WHERE organizacao_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_clinica ON public.user_roles(clinica_id) WHERE clinica_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_ativo ON public.user_roles(ativo);

-- RLS user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'user_roles_select_own' AND schemaname = 'public' AND tablename = 'user_roles'
  ) THEN
    CREATE POLICY user_roles_select_own ON public.user_roles
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'user_roles_insert_initial' AND schemaname = 'public' AND tablename = 'user_roles'
  ) THEN
    CREATE POLICY user_roles_insert_initial ON public.user_roles
      FOR INSERT WITH CHECK (
        auth.uid() = user_id AND role IN ('proprietaria','visitante','profissionais')
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'user_roles_update_own' AND schemaname = 'public' AND tablename = 'user_roles'
  ) THEN
    CREATE POLICY user_roles_update_own ON public.user_roles
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;