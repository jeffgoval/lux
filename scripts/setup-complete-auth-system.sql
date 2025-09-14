-- ============================================================================
-- 🚀 SETUP COMPLETO DO SISTEMA DE AUTENTICAÇÃO V2
-- ============================================================================
-- Execute este script no Supabase SQL Editor para configurar:
-- 1. Tabela profiles com trigger automático
-- 2. Tabela user_roles com roles padrão
-- 3. Trigger que cria profile + role automaticamente no cadastro
-- 4. Políticas RLS básicas
-- ============================================================================

-- ============================================================================
-- 1. LIMPAR E RECRIAR TABELA PROFILES
-- ============================================================================

-- Remover trigger e função existentes se existirem
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recriar tabela profiles (se necessário)
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome_completo TEXT DEFAULT 'Usuário', -- Permitir valor padrão
  telefone TEXT,
  avatar_url TEXT,
  cpf TEXT,
  data_nascimento DATE,
  endereco JSONB,
  ativo BOOLEAN NOT NULL DEFAULT true,
  primeiro_acesso BOOLEAN NOT NULL DEFAULT true,
  configuracoes_usuario JSONB DEFAULT '{}'::jsonb,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. CRIAR TABELA USER_ROLES
-- ============================================================================

-- Criar enum para roles se não existir
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM (
        'super_admin',
        'proprietaria', 
        'gerente',
        'profissionais',
        'recepcionistas',
        'visitante',
        'cliente'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Recriar tabela user_roles
DROP TABLE IF EXISTS public.user_roles CASCADE;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role_type NOT NULL DEFAULT 'proprietaria',
  clinica_id UUID, -- Será preenchido quando criar clínica
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id),
  
  -- Constraint para evitar roles duplicadas
  UNIQUE(user_id, role, clinica_id)
);

-- ============================================================================
-- 3. CRIAR FUNÇÃO DE TRIGGER PARA NOVOS USUÁRIOS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Criar perfil automaticamente
  INSERT INTO public.profiles (
    id, 
    email, 
    nome_completo,
    primeiro_acesso,
    ativo,
    criado_em
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'nome_completo',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1),
      'Usuário'
    ),
    true, -- Sempre true para novos usuários (vai para onboarding)
    true,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    atualizado_em = now();

  -- 2. Criar role padrão de proprietária (todo novo usuário é proprietário da sua clínica)
  INSERT INTO public.user_roles (
    user_id, 
    role, 
    ativo, 
    criado_por,
    criado_em
  ) VALUES (
    NEW.id,
    'proprietaria', -- Role padrão
    true,
    NEW.id,
    now()
  )
  ON CONFLICT (user_id, role, clinica_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log erro mas não bloquear criação do usuário
    RAISE WARNING 'Erro ao criar perfil/role para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. CRIAR TRIGGER
-- ============================================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 5. HABILITAR RLS E CRIAR POLÍTICAS BÁSICAS
-- ============================================================================

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roles" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 6. CRIAR FUNÇÃO PARA ATUALIZAR TIMESTAMP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar timestamp automaticamente
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. VERIFICAR SE TUDO FOI CRIADO CORRETAMENTE
-- ============================================================================

-- Verificar tabelas
SELECT 'profiles' as tabela, count(*) as registros FROM public.profiles
UNION ALL
SELECT 'user_roles' as tabela, count(*) as registros FROM public.user_roles;

-- Verificar se trigger existe
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- ============================================================================
-- 8. MENSAGEM DE SUCESSO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ SISTEMA DE AUTENTICAÇÃO V2 CONFIGURADO COM SUCESSO!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 O que foi criado:';
  RAISE NOTICE '   ✅ Tabela profiles com campos corretos';
  RAISE NOTICE '   ✅ Tabela user_roles com enum de roles';
  RAISE NOTICE '   ✅ Trigger automático para novos usuários';
  RAISE NOTICE '   ✅ Políticas RLS básicas';
  RAISE NOTICE '   ✅ Função de atualização de timestamp';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Próximos passos:';
  RAISE NOTICE '   1. Testar cadastro de novo usuário';
  RAISE NOTICE '   2. Verificar se profile e role são criados automaticamente';
  RAISE NOTICE '   3. Testar fluxo de onboarding';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Fluxo completo:';
  RAISE NOTICE '   Cadastro → Profile criado → Role "proprietaria" → Onboarding → Dashboard';
END $$;
