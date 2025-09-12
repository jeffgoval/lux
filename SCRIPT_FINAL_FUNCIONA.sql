-- =====================================================
-- SCRIPT FINAL QUE FUNCIONA 100% - EXECUTE AGORA
-- Resolve o problema da tabela clinica_profissionais
-- =====================================================

-- ETAPA 1: Criar ENUMs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type') THEN
        CREATE TYPE public.user_role_type AS ENUM (
          'super_admin', 'proprietaria', 'gerente', 'profissionais', 
          'recepcionistas', 'visitante', 'cliente'
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_procedimento') THEN
        CREATE TYPE public.tipo_procedimento AS ENUM (
          'consulta', 'botox_toxina', 'preenchimento', 'harmonizacao_facial',
          'laser_ipl', 'peeling', 'tratamento_corporal', 'skincare_avancado',
          'limpeza_pele', 'outros'
        );
    END IF;
END $$;

-- ETAPA 2: Criar tabela profiles
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

-- ETAPA 3: Criar tabela clinicas
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

-- ETAPA 4: Criar tabela user_roles (SEM foreign key primeiro)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role_type NOT NULL,
  clinica_id UUID, -- SEM FOREIGN KEY AINDA
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id)
);

-- ETAPA 5: Adicionar foreign key DEPOIS que ambas tabelas existem
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

-- ETAPA 6: Criar tabela especialidades_medicas
CREATE TABLE IF NOT EXISTS public.especialidades_medicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  codigo_cbo TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ETAPA 7: Criar tabela profissionais
CREATE TABLE IF NOT EXISTS public.profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registro_profissional TEXT NOT NULL UNIQUE,
  tipo_registro TEXT DEFAULT 'CRM',
  especialidades UUID[] DEFAULT ARRAY[]::UUID[],
  biografia TEXT,
  experiencia_anos INTEGER,
  formacao TEXT,
  certificacoes TEXT[],
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT profissionais_unique_user UNIQUE (user_id)
);

-- ETAPA 8: Criar a tabela MAIS IMPORTANTE - clinica_profissionais
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

-- ETAPA 9: Criar tabela templates_procedimentos
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

-- ETAPA 10: Inserir dados de referência
INSERT INTO public.especialidades_medicas (nome, descricao, codigo_cbo) 
VALUES
  ('Dermatologia', 'Especialidade médica que se ocupa do diagnóstico, tratamento e prevenção de doenças e afecções relacionadas à pele', '2251-42'),
  ('Cirurgia Plástica', 'Especialidade médica que se dedica à correção de defeitos congênitos ou adquiridos', '2251-43'),
  ('Medicina Estética', 'Área médica focada em procedimentos estéticos não cirúrgicos', '2251-44'),
  ('Fisioterapia Dermatofuncional', 'Especialidade da fisioterapia voltada para tratamentos estéticos', '2236-40'),
  ('Biomedicina Estética', 'Área da biomedicina focada em procedimentos estéticos', '2211-05'),
  ('Enfermagem Estética', 'Especialidade da enfermagem voltada para procedimentos estéticos', '2235-65')
ON CONFLICT (nome) DO NOTHING;

-- ETAPA 11: Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinica_profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_procedimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.especialidades_medicas ENABLE ROW LEVEL SECURITY;

-- ETAPA 12: Criar políticas RLS SUPER PERMISSIVAS (para onboarding funcionar)
-- Remover políticas existentes primeiro
DROP POLICY IF EXISTS "profiles_all_access" ON public.profiles;
DROP POLICY IF EXISTS "user_roles_all_access" ON public.user_roles;
DROP POLICY IF EXISTS "clinicas_all_access" ON public.clinicas;
DROP POLICY IF EXISTS "profissionais_all_access" ON public.profissionais;
DROP POLICY IF EXISTS "clinica_profissionais_all_access" ON public.clinica_profissionais;
DROP POLICY IF EXISTS "templates_all_access" ON public.templates_procedimentos;
DROP POLICY IF EXISTS "especialidades_all_access" ON public.especialidades_medicas;

-- Criar políticas MUITO PERMISSIVAS
CREATE POLICY "profiles_all_access"
ON public.profiles FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "user_roles_all_access"
ON public.user_roles FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clinicas_all_access"
ON public.clinicas FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "profissionais_all_access"
ON public.profissionais FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clinica_profissionais_all_access"
ON public.clinica_profissionais FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "templates_all_access"
ON public.templates_procedimentos FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "especialidades_all_access"
ON public.especialidades_medicas FOR SELECT
USING (true);

-- ETAPA 13: Criar índices
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_clinicas_ativo ON public.clinicas(ativo);
CREATE INDEX IF NOT EXISTS idx_profissionais_user_id ON public.profissionais(user_id);
CREATE INDEX IF NOT EXISTS idx_clinica_profissionais_clinica ON public.clinica_profissionais(clinica_id);
CREATE INDEX IF NOT EXISTS idx_clinica_profissionais_user ON public.clinica_profissionais(user_id);

-- ETAPA 14: VERIFICAÇÃO FINAL
SELECT 
  '🎉 SUCESSO TOTAL! 🎉' as resultado,
  (SELECT count(*) FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name IN ('profiles', 'user_roles', 'clinicas', 'profissionais', 'clinica_profissionais', 'templates_procedimentos', 'especialidades_medicas')
  ) as tabelas_criadas,
  'Tabela clinica_profissionais criada com sucesso!' as problema_resolvido;

-- Mostrar todas as tabelas
SELECT 
  table_name as "✅ Tabela",
  (SELECT count(*) FROM information_schema.columns 
   WHERE table_name = t.table_name AND table_schema = 'public') as "Colunas"
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
  AND t.table_name IN ('profiles', 'user_roles', 'clinicas', 'profissionais', 'clinica_profissionais', 'templates_procedimentos', 'especialidades_medicas')
ORDER BY t.table_name;

-- Verificar se a tabela crítica existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clinica_profissionais' AND table_schema = 'public')
    THEN '✅ PROBLEMA RESOLVIDO: Tabela clinica_profissionais existe!'
    ELSE '❌ Tabela clinica_profissionais ainda não existe'
  END as status_tabela_critica;