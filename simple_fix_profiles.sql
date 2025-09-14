-- Executar este script diretamente no Supabase SQL Editor
-- =====================================================
-- RECRIAR TABELA PROFILES - VERSÃO SIMPLES
-- =====================================================

-- 1. Dropar tabela e dependências existentes
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Criar nova tabela profiles
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_completo TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
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

-- 3. Criar índices
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- 4. Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas de segurança
CREATE POLICY "Users can view and update own profile" 
ON public.profiles 
FOR ALL 
USING (auth.uid() = user_id);

-- 6. Criar função para handle de novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_metadata JSONB;
  user_email TEXT;
BEGIN
  user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  user_email := COALESCE(NEW.email, '');
  
  INSERT INTO public.profiles (
    user_id, 
    nome_completo, 
    email,
    primeiro_acesso,
    criado_em
  ) VALUES (
    NEW.id,
    COALESCE(
      user_metadata->>'nome_completo',
      user_metadata->>'full_name',
      user_metadata->>'name',
      SPLIT_PART(user_email, '@', 1)
    ),
    user_email,
    true,
    now()
  );
  
  -- Criar role básico também
  INSERT INTO public.user_roles (
    user_id, 
    role, 
    ativo, 
    criado_por,
    criado_em
  ) VALUES (
    NEW.id,
    'visitante',
    true,
    NEW.id,
    now()
  ) ON CONFLICT DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro ao criar perfil para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Criar trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Criar função para atualizar timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();