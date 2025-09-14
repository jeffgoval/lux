-- =====================================================
-- SCRIPT PARA RECRIAR TABELA PROFILES CORRETAMENTE
-- Data: 2025-09-13
-- =====================================================

-- Primeiro, fazer backup da tabela existente se ela tiver dados
DO $backup$
DECLARE
    table_exists boolean;
    record_count integer;
BEGIN
    -- Verificar se a tabela profiles existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
    ) INTO table_exists;

    IF table_exists THEN
        -- Verificar se tem dados
        EXECUTE 'SELECT COUNT(*) FROM public.profiles' INTO record_count;
        
        IF record_count > 0 THEN
            RAISE NOTICE 'Fazendo backup de % registros da tabela profiles', record_count;
            
            -- Criar backup da tabela com dados
            DROP TABLE IF EXISTS public.profiles_backup_20250913;
            EXECUTE 'CREATE TABLE public.profiles_backup_20250913 AS SELECT * FROM public.profiles';
            
            RAISE NOTICE 'Backup salvo em profiles_backup_20250913';
        END IF;
    END IF;
END $backup$;

-- =====================================================
-- DROPAR TABELA E TRIGGER EXISTENTES
-- =====================================================

-- Dropar trigger se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Dropar função se existir
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Dropar tabela profiles se existir (CASCADE para remover dependências)
DROP TABLE IF EXISTS public.profiles CASCADE;

-- =====================================================
-- CRIAR NOVA TABELA PROFILES COM ESTRUTURA CORRETA
-- =====================================================

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

-- =====================================================
-- CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_cpf ON public.profiles(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX idx_profiles_ativo ON public.profiles(ativo);

-- =====================================================
-- CRIAR FUNÇÃO PARA CRIAÇÃO AUTOMÁTICA DE PERFIL
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_metadata JSONB;
  user_email TEXT;
BEGIN
  -- Extrair metadata e email do usuário
  user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  user_email := COALESCE(NEW.email, '');
  
  -- Criar perfil básico para o novo usuário
  INSERT INTO public.profiles (
    user_id, 
    nome_completo, 
    email,
    telefone,
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
    user_metadata->>'telefone',
    true,
    now()
  );
  
  -- Criar role básico de visitante
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
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, logar mas não interromper criação do usuário
    RAISE NOTICE 'Erro ao criar perfil para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CRIAR TRIGGER PARA NOVOS USUÁRIOS
-- =====================================================

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- HABILITAR ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver e atualizar apenas seu próprio perfil
CREATE POLICY "Users can view and update own profile" 
ON public.profiles 
FOR ALL 
USING (auth.uid() = user_id);

-- Política: Permitir inserção apenas via trigger (SECURITY DEFINER)
CREATE POLICY "Allow profile creation via trigger" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DE TIMESTAMP
-- =====================================================

-- Criar função para atualizar updated_at se não existir
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar timestamp
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- MIGRAR DADOS DO BACKUP (SE EXISTIR)
-- =====================================================

DO $migrate$
DECLARE
    backup_exists boolean;
    migrated_count integer := 0;
BEGIN
    -- Verificar se existe backup
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles_backup_20250913'
    ) INTO backup_exists;

    IF backup_exists THEN
        -- Migrar dados do backup para nova estrutura
        INSERT INTO public.profiles (
            user_id, 
            nome_completo, 
            email, 
            telefone, 
            avatar_url, 
            cpf, 
            data_nascimento, 
            endereco,
            ativo, 
            primeiro_acesso, 
            configuracoes_usuario,
            criado_em
        )
        SELECT 
            user_id,
            COALESCE(nome_completo, ''),
            COALESCE(email, ''),
            telefone,
            avatar_url,
            cpf,
            data_nascimento,
            endereco,
            COALESCE(ativo, true),
            COALESCE(primeiro_acesso, true),
            COALESCE(configuracoes_usuario, '{}'),
            COALESCE(criado_em, now())
        FROM public.profiles_backup_20250913
        ON CONFLICT (user_id) DO NOTHING;
        
        GET DIAGNOSTICS migrated_count = ROW_COUNT;
        
        RAISE NOTICE 'Migrados % registros do backup para nova tabela profiles', migrated_count;
        
        -- Opcional: Remover backup após migração bem-sucedida
        -- DROP TABLE public.profiles_backup_20250913;
    END IF;
END $migrate$;

-- =====================================================
-- CRIAR PERFIS PARA USUÁRIOS EXISTENTES SEM PERFIL
-- =====================================================

DO $create_missing$
DECLARE
    user_record RECORD;
    created_count integer := 0;
BEGIN
    -- Buscar usuários que não têm perfil
    FOR user_record IN 
        SELECT u.id, u.email, u.raw_user_meta_data, u.created_at
        FROM auth.users u
        LEFT JOIN public.profiles p ON p.user_id = u.id
        WHERE p.user_id IS NULL
    LOOP
        -- Criar perfil para usuário sem perfil
        INSERT INTO public.profiles (
            user_id,
            nome_completo,
            email,
            primeiro_acesso,
            criado_em
        ) VALUES (
            user_record.id,
            COALESCE(
                user_record.raw_user_meta_data->>'nome_completo',
                user_record.raw_user_meta_data->>'full_name',
                user_record.raw_user_meta_data->>'name',
                SPLIT_PART(COALESCE(user_record.email, ''), '@', 1)
            ),
            COALESCE(user_record.email, ''),
            true,
            COALESCE(user_record.created_at, now())
        );
        
        -- Criar role básico se não existir
        INSERT INTO public.user_roles (
            user_id,
            role,
            ativo,
            criado_por,
            criado_em
        ) VALUES (
            user_record.id,
            'visitante',
            true,
            user_record.id,
            now()
        ) ON CONFLICT DO NOTHING;
        
        created_count := created_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Criados perfis para % usuários existentes', created_count;
END $create_missing$;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

DO $verify$
DECLARE
    profiles_count integer;
    users_count integer;
    trigger_exists boolean;
BEGIN
    -- Contar profiles e usuários
    SELECT COUNT(*) FROM public.profiles INTO profiles_count;
    SELECT COUNT(*) FROM auth.users INTO users_count;
    
    -- Verificar se trigger existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created'
    ) INTO trigger_exists;
    
    RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
    RAISE NOTICE 'Usuários na auth.users: %', users_count;
    RAISE NOTICE 'Perfis na public.profiles: %', profiles_count;
    RAISE NOTICE 'Trigger configurado: %', trigger_exists;
    
    IF profiles_count = users_count AND trigger_exists THEN
        RAISE NOTICE '✅ SUCESSO: Tabela profiles recriada corretamente!';
    ELSE
        RAISE NOTICE '⚠️  ATENÇÃO: Verifique se todos os perfis foram criados';
    END IF;
END $verify$;

-- =====================================================
-- COMENTÁRIO DE COMPLETUDE
-- =====================================================

COMMENT ON TABLE public.profiles IS 'Tabela de perfis de usuários - Recriada em 2025-09-13 com estrutura correta e trigger automático';

-- =====================================================
-- FIX PROFILES TABLE STRUCTURE
-- Execute this SQL in Supabase SQL Editor
-- =====================================================

-- Drop existing profiles table if it exists (backup data first if needed)
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table with correct structure
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  avatar_url TEXT,
  ativo BOOLEAN DEFAULT true NOT NULL,
  primeiro_acesso BOOLEAN DEFAULT true NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_ativo ON profiles(ativo);

-- Create update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Verify creation
SELECT 'Profiles table created successfully!' as status;

-- Show table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;