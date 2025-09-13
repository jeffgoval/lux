-- 04 - Organização e Clínicas (núcleo necessário aos hooks)

-- organizacoes (opcional para multi-clínicas)
CREATE TABLE IF NOT EXISTS public.organizacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  plano TEXT DEFAULT 'basico',
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID
);

-- clinicas
CREATE TABLE IF NOT EXISTS public.clinicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj TEXT,
  endereco JSONB DEFAULT '{}'::jsonb,
  telefone_principal TEXT,
  email_contato TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por UUID
);

-- Garantir coluna criado_por quando a tabela já existe sem ela
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinicas' AND column_name = 'criado_por'
  ) THEN
    ALTER TABLE public.clinicas ADD COLUMN criado_por UUID;
  END IF;
END $$;

-- profissionais (informação profissional por usuário)
CREATE TABLE IF NOT EXISTS public.profissionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  registro_profissional TEXT,
  especialidades TEXT[],
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- vinculo clinica x profissional
CREATE TABLE IF NOT EXISTS public.clinica_profissionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cargo TEXT NOT NULL DEFAULT 'Profissional',
  especialidades TEXT[],
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinica_id, user_id)
);

-- referencias básicas
CREATE TABLE IF NOT EXISTS public.especialidades_medicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT UNIQUE NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.templates_procedimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE,
  tipo_procedimento TEXT,
  nome_template TEXT NOT NULL,
  descricao TEXT,
  campos_obrigatorios JSONB DEFAULT '{}'::jsonb,
  campos_opcionais JSONB DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- índices essenciais
CREATE INDEX IF NOT EXISTS idx_clinicas_ativo ON public.clinicas(ativo);
CREATE INDEX IF NOT EXISTS idx_clinica_profissionais_clinica ON public.clinica_profissionais(clinica_id);
CREATE INDEX IF NOT EXISTS idx_clinica_profissionais_user ON public.clinica_profissionais(user_id);

-- RLS essenciais
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinica_profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.especialidades_medicas ENABLE ROW LEVEL SECURITY;

-- Políticas mínimas (permissivas para onboarding)
DO $$
BEGIN
  -- clinicas: criar clínica própria
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'clinicas_insert_own' AND schemaname = 'public' AND tablename = 'clinicas'
  ) THEN
    CREATE POLICY clinicas_insert_own ON public.clinicas
      FOR INSERT WITH CHECK (auth.uid() = criado_por);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'clinicas_select_associated' AND schemaname = 'public' AND tablename = 'clinicas'
  ) THEN
    CREATE POLICY clinicas_select_associated ON public.clinicas
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.clinica_profissionais cp WHERE cp.user_id = auth.uid() AND cp.clinica_id = public.clinicas.id AND cp.ativo = true
        )
      );
  END IF;

  -- clinica_profissionais: o próprio usuário pode criar seu vínculo
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'cp_insert_own' AND schemaname = 'public' AND tablename = 'clinica_profissionais'
  ) THEN
    CREATE POLICY cp_insert_own ON public.clinica_profissionais
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'cp_select_own' AND schemaname = 'public' AND tablename = 'clinica_profissionais'
  ) THEN
    CREATE POLICY cp_select_own ON public.clinica_profissionais
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- profissionais: o próprio usuário gerencia seu registro
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'profissionais_self' AND schemaname = 'public' AND tablename = 'profissionais'
  ) THEN
    CREATE POLICY profissionais_self ON public.profissionais
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  -- templates_procedimentos: leitura conforme vínculo
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'templates_clinic_access' AND schemaname = 'public' AND tablename = 'templates_procedimentos'
  ) THEN
    CREATE POLICY templates_clinic_access ON public.templates_procedimentos
      FOR ALL USING (
        clinica_id IS NULL OR EXISTS (
          SELECT 1 FROM public.clinica_profissionais cp WHERE cp.user_id = auth.uid() AND cp.clinica_id = public.templates_procedimentos.clinica_id AND cp.ativo = true
        )
      ) WITH CHECK (
        clinica_id IS NULL OR EXISTS (
          SELECT 1 FROM public.clinica_profissionais cp WHERE cp.user_id = auth.uid() AND cp.clinica_id = public.templates_procedimentos.clinica_id AND cp.ativo = true
        )
      );
  END IF;

  -- especialidades: leitura pública (ativas)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'especialidades_read' AND schemaname = 'public' AND tablename = 'especialidades_medicas'
  ) THEN
    CREATE POLICY especialidades_read ON public.especialidades_medicas FOR SELECT USING (ativo = true);
  END IF;
END $$;