-- =============================================================================
-- MIGRAÇÃO 003: TABELA PROFILES
-- =============================================================================
-- Data: 2025-09-14
-- Descrição: Cria a tabela de perfis de usuários (1:1 com auth.users)
-- Dependências: 001_foundation_types_functions.sql
-- Rollback: DROP da tabela profiles

-- =============================================================================
-- TABELA: profiles
-- =============================================================================
-- Perfil do usuário estendendo auth.users com informações adicionais

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Informações pessoais básicas
    email TEXT UNIQUE NOT NULL,
    nome_completo TEXT NOT NULL,
    telefone TEXT,
    avatar_url TEXT,
    
    -- Documentos
    cpf TEXT,
    data_nascimento DATE,
    
    -- Endereço (estrutura flexível)
    endereco JSONB,
    
    -- Status e configurações
    ativo BOOLEAN NOT NULL DEFAULT true,
    primeiro_acesso BOOLEAN NOT NULL DEFAULT true,
    configuracoes_usuario JSONB DEFAULT '{}'::jsonb,
    
    -- Preferências de notificação
    notificacoes_email BOOLEAN DEFAULT true,
    notificacoes_sms BOOLEAN DEFAULT true,
    notificacoes_push BOOLEAN DEFAULT true,
    
    -- Informações de consentimento
    aceita_termos BOOLEAN DEFAULT false,
    aceita_politica_privacidade BOOLEAN DEFAULT false,
    data_aceite_termos TIMESTAMP WITH TIME ZONE,
    
    -- Auditoria
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT profiles_email_valid CHECK (public.validate_email(email)),
    CONSTRAINT profiles_cpf_valid CHECK (cpf IS NULL OR public.validate_cpf(cpf)),
    CONSTRAINT profiles_telefone_format CHECK (
        telefone IS NULL OR 
        telefone ~ '^\+?[1-9]\d{1,14}$'
    ),
    CONSTRAINT profiles_nome_not_empty CHECK (LENGTH(TRIM(nome_completo)) >= 2),
    CONSTRAINT profiles_data_nascimento_valida CHECK (
        data_nascimento IS NULL OR 
        data_nascimento <= CURRENT_DATE - INTERVAL '13 years'
    ),
    CONSTRAINT profiles_avatar_url_format CHECK (
        avatar_url IS NULL OR 
        avatar_url ~ '^https?://'
    )
);

-- =============================================================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email 
    ON public.profiles(email);
    
CREATE INDEX IF NOT EXISTS idx_profiles_cpf 
    ON public.profiles(cpf) 
    WHERE cpf IS NOT NULL;
    
CREATE INDEX IF NOT EXISTS idx_profiles_ativo 
    ON public.profiles(ativo);
    
CREATE INDEX IF NOT EXISTS idx_profiles_primeiro_acesso 
    ON public.profiles(primeiro_acesso);
    
CREATE INDEX IF NOT EXISTS idx_profiles_nome 
    ON public.profiles USING gin(to_tsvector('portuguese', nome_completo));
    
CREATE INDEX IF NOT EXISTS idx_profiles_telefone 
    ON public.profiles(telefone) 
    WHERE telefone IS NOT NULL;

-- =============================================================================
-- TRIGGER PARA ATUALIZAR TIMESTAMP
-- =============================================================================

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- FUNÇÃO PARA CRIAR PROFILE AUTOMATICAMENTE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, nome_completo)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar profile automaticamente quando usuário é criado
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- RLS (ROW LEVEL SECURITY)
-- =============================================================================

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver e editar apenas seu próprio perfil
CREATE POLICY "Usuários podem ver próprio perfil" 
    ON public.profiles
    FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar próprio perfil" 
    ON public.profiles
    FOR UPDATE 
    USING (auth.uid() = id);

-- Política: Super admins podem ver todos os perfis
CREATE POLICY "Super admins podem ver todos os perfis" 
    ON public.profiles
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'super_admin'
            AND ur.ativo = true
        )
    );

-- Política: Profiles são criados automaticamente via trigger
CREATE POLICY "Profiles são criados automaticamente" 
    ON public.profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- =============================================================================
-- FUNÇÕES UTILITÁRIAS PARA PROFILES
-- =============================================================================

-- Função para obter informações básicas do usuário
CREATE OR REPLACE FUNCTION public.get_user_basic_info(user_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'id', p.id,
        'email', p.email,
        'nome_completo', p.nome_completo,
        'telefone', p.telefone,
        'avatar_url', p.avatar_url,
        'primeiro_acesso', p.primeiro_acesso,
        'ativo', p.ativo
    ) INTO result
    FROM public.profiles p
    WHERE p.id = user_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para marcar primeiro acesso como concluído
CREATE OR REPLACE FUNCTION public.complete_onboarding(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.profiles 
    SET primeiro_acesso = false,
        atualizado_em = now()
    WHERE id = user_id AND auth.uid() = user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON TABLE public.profiles IS 'Perfis de usuários com informações estendidas do auth.users';
COMMENT ON COLUMN public.profiles.id IS 'ID do usuário (referência ao auth.users.id)';
COMMENT ON COLUMN public.profiles.email IS 'Email do usuário (sincronizado com auth.users)';
COMMENT ON COLUMN public.profiles.nome_completo IS 'Nome completo do usuário';
COMMENT ON COLUMN public.profiles.telefone IS 'Telefone no formato internacional';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL da foto de perfil';
COMMENT ON COLUMN public.profiles.cpf IS 'CPF do usuário (apenas números)';
COMMENT ON COLUMN public.profiles.data_nascimento IS 'Data de nascimento';
COMMENT ON COLUMN public.profiles.endereco IS 'Endereço em formato JSON flexível';
COMMENT ON COLUMN public.profiles.ativo IS 'Indica se o usuário está ativo no sistema';
COMMENT ON COLUMN public.profiles.primeiro_acesso IS 'Indica se é o primeiro acesso (precisa de onboarding)';
COMMENT ON COLUMN public.profiles.configuracoes_usuario IS 'Configurações personalizadas em JSON';

COMMENT ON FUNCTION public.handle_new_user() IS 'Cria profile automaticamente quando usuário é criado';
COMMENT ON FUNCTION public.get_user_basic_info(UUID) IS 'Retorna informações básicas do usuário em JSON';
COMMENT ON FUNCTION public.complete_onboarding(UUID) IS 'Marca o onboarding como concluído';

-- =============================================================================
-- ROLLBACK SCRIPT (comentado - usar apenas se necessário)
-- =============================================================================

/*
-- Para fazer rollback desta migração, execute:

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.complete_onboarding(UUID);
DROP FUNCTION IF EXISTS public.get_user_basic_info(UUID);
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TABLE IF EXISTS public.profiles CASCADE;
*/

-- =============================================================================
-- FIM DA MIGRAÇÃO 003
-- =============================================================================