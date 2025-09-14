-- =============================================================================
-- 🚀 EXECUÇÃO COMPLETA DE MIGRAÇÕES - SUPABASE
-- =============================================================================
-- ATENÇÃO: Execute este arquivo completo no SQL Editor do Supabase Dashboard
-- 
-- Projeto: luxe-flow-appoint
-- URL: https://shzbgjooydruspqajjkf.supabase.co
-- Data: 2025-09-14
-- 
-- INSTRUÇÕES:
-- 1. Faça login no Supabase Dashboard
-- 2. Vá em SQL Editor  
-- 3. Cole TODO este conteúdo
-- 4. Clique em "Run" para executar tudo de uma vez
--
-- Este arquivo contém todas as 6 migrações em ordem correta de dependências
-- =============================================================================

-- =============================================================================
-- 🎨 MIGRAÇÃO 001: FUNDAÇÃO - EXTENSÕES, TIPOS E FUNÇÕES BASE
-- =============================================================================

-- Habilitar UUID v4
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tipos de plano para organizações
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plano_type') THEN
        CREATE TYPE plano_type AS ENUM ('basico', 'premium', 'enterprise');
    END IF;
END $$;

-- Roles de usuário no sistema
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type') THEN
        CREATE TYPE user_role_type AS ENUM (
            'super_admin', 
            'proprietaria', 
            'gerente', 
            'profissionais', 
            'recepcionistas', 
            'visitante', 
            'cliente'
        );
    END IF;
END $$;

-- Especialidades médicas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'especialidade_medica') THEN
        CREATE TYPE especialidade_medica AS ENUM (
            'dermatologia',
            'cirurgia_plastica',
            'medicina_estetica',
            'fisioterapia_estetica',
            'nutricao',
            'psicologia',
            'enfermagem_estetica',
            'biomedicina_estetica'
        );
    END IF;
END $$;

-- Status de convites
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_convite') THEN
        CREATE TYPE status_convite AS ENUM (
            'pendente',
            'aceito', 
            'recusado',
            'cancelado',
            'expirado'
        );
    END IF;
END $$;

-- Tipos de procedimento
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_procedimento') THEN
        CREATE TYPE tipo_procedimento AS ENUM (
            'botox_toxina',
            'preenchimento', 
            'harmonizacao_facial',
            'laser_ipl',
            'peeling',
            'tratamento_corporal', 
            'skincare_avancado',
            'outro'
        );
    END IF;
END $$;

-- Status do prontuário
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_prontuario') THEN
        CREATE TYPE status_prontuario AS ENUM (
            'ativo',
            'arquivado',
            'transferido'
        );
    END IF;
END $$;

-- Função para validar email
CREATE OR REPLACE FUNCTION public.validate_email(email TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para validar CPF (formato básico)
CREATE OR REPLACE FUNCTION public.validate_cpf(cpf TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
    -- Remove caracteres não numéricos
    cpf := REGEXP_REPLACE(cpf, '[^0-9]', '', 'g');
    
    -- Verifica se tem 11 dígitos
    IF LENGTH(cpf) != 11 THEN
        RETURN FALSE;
    END IF;
    
    -- Verifica se não são todos iguais (000.000.000-00, etc.)
    IF cpf IN ('00000000000', '11111111111', '22222222222', '33333333333', 
               '44444444444', '55555555555', '66666666666', '77777777777',
               '88888888888', '99999999999') THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para validar CNPJ (formato básico)
CREATE OR REPLACE FUNCTION public.validate_cnpj(cnpj TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
    -- Remove caracteres não numéricos
    cnpj := REGEXP_REPLACE(cnpj, '[^0-9]', '', 'g');
    
    -- Verifica se tem 14 dígitos
    IF LENGTH(cnpj) != 14 THEN
        RETURN FALSE;
    END IF;
    
    -- Verifica se não são todos iguais
    IF cnpj IN ('00000000000000', '11111111111111', '22222222222222', '33333333333333',
                '44444444444444', '55555555555555', '66666666666666', '77777777777777',
                '88888888888888', '99999999999999') THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar token seguro
CREATE OR REPLACE FUNCTION public.generate_secure_token(length INTEGER DEFAULT 32) 
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- =============================================================================
-- 📚 MIGRAÇÃO 002: ESPECIALIDADES MÉDICAS (TABELA INDEPENDENTE)  
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.especialidades_medicas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT UNIQUE NOT NULL,
    descricao TEXT,
    codigo_conselho TEXT,
    categoria TEXT,
    requer_certificacao BOOLEAN DEFAULT false,
    ativo BOOLEAN NOT NULL DEFAULT true,
    
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT especialidades_nome_not_empty CHECK (LENGTH(TRIM(nome)) > 0),
    CONSTRAINT especialidades_codigo_format CHECK (
        codigo_conselho IS NULL OR 
        LENGTH(TRIM(codigo_conselho)) >= 2
    )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_especialidades_medicas_nome 
    ON public.especialidades_medicas(nome);
CREATE INDEX IF NOT EXISTS idx_especialidades_medicas_ativo 
    ON public.especialidades_medicas(ativo);

-- Trigger para timestamp
CREATE TRIGGER update_especialidades_medicas_updated_at
    BEFORE UPDATE ON public.especialidades_medicas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.especialidades_medicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Especialidades públicas para leitura" 
    ON public.especialidades_medicas
    FOR SELECT 
    USING (ativo = true);

-- Dados seed
INSERT INTO public.especialidades_medicas (nome, descricao, codigo_conselho, categoria, requer_certificacao) 
VALUES 
    ('Dermatologia', 'Especialidade médica focada em doenças da pele', 'CRM', 'médica', true),
    ('Cirurgia Plástica', 'Cirurgia reconstrutiva e estética', 'CRM', 'médica', true),
    ('Medicina Estética', 'Procedimentos estéticos não-cirúrgicos', 'CRM', 'médica', true),
    ('Fisioterapia Estética', 'Fisioterapia aplicada à estética', 'CREFITO', 'fisioterapia', true),
    ('Nutrição', 'Orientação nutricional para estética e saúde', 'CRN', 'nutrição', true),
    ('Psicologia', 'Acompanhamento psicológico em tratamentos estéticos', 'CRP', 'psicologia', true),
    ('Enfermagem Estética', 'Procedimentos estéticos por enfermeiros', 'COREN', 'enfermagem', true),
    ('Biomedicina Estética', 'Procedimentos estéticos por biomédicos', 'CRBM', 'biomedicina', true)
ON CONFLICT (nome) DO NOTHING;

-- =============================================================================
-- 👤 MIGRAÇÃO 003: TABELA PROFILES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    email TEXT UNIQUE NOT NULL,
    nome_completo TEXT NOT NULL,
    telefone TEXT,
    avatar_url TEXT,
    
    cpf TEXT,
    data_nascimento DATE,
    
    endereco JSONB,
    
    ativo BOOLEAN NOT NULL DEFAULT true,
    primeiro_acesso BOOLEAN NOT NULL DEFAULT true,
    configuracoes_usuario JSONB DEFAULT '{}'::jsonb,
    
    notificacoes_email BOOLEAN DEFAULT true,
    notificacoes_sms BOOLEAN DEFAULT true,
    notificacoes_push BOOLEAN DEFAULT true,
    
    aceita_termos BOOLEAN DEFAULT false,
    aceita_politica_privacidade BOOLEAN DEFAULT false,
    data_aceite_termos TIMESTAMP WITH TIME ZONE,
    
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON public.profiles(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_ativo ON public.profiles(ativo);
CREATE INDEX IF NOT EXISTS idx_profiles_primeiro_acesso ON public.profiles(primeiro_acesso);

-- Trigger
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar profile automaticamente
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

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver próprio perfil" 
    ON public.profiles
    FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar próprio perfil" 
    ON public.profiles
    FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Profiles são criados automaticamente" 
    ON public.profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Funções utilitárias
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
-- 🏢 MIGRAÇÃO 004: TABELA ORGANIZAÇÕES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organizacoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    nome TEXT NOT NULL,
    cnpj TEXT,
    razao_social TEXT,
    nome_fantasia TEXT,
    
    plano plano_type NOT NULL DEFAULT 'basico',
    limite_clinicas INTEGER DEFAULT 1,
    limite_usuarios INTEGER DEFAULT 10,
    recursos_habilitados TEXT[] DEFAULT ARRAY['prontuarios', 'agenda', 'estoque'],
    
    email TEXT,
    telefone TEXT,
    website TEXT,
    
    endereco JSONB,
    
    inscricao_estadual TEXT,
    inscricao_municipal TEXT,
    atividade_principal TEXT,
    data_fundacao DATE,
    
    configuracoes JSONB DEFAULT '{}'::jsonb,
    
    ativo BOOLEAN NOT NULL DEFAULT true,
    verificado BOOLEAN NOT NULL DEFAULT false,
    data_verificacao TIMESTAMP WITH TIME ZONE,
    
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    criado_por UUID NOT NULL REFERENCES auth.users(id),
    
    CONSTRAINT organizacoes_cnpj_valid CHECK (
        cnpj IS NULL OR public.validate_cnpj(cnpj)
    ),
    CONSTRAINT organizacoes_email_valid CHECK (
        email IS NULL OR public.validate_email(email)
    ),
    CONSTRAINT organizacoes_nome_not_empty CHECK (
        LENGTH(TRIM(nome)) >= 2
    ),
    CONSTRAINT organizacoes_limites_positivos CHECK (
        limite_clinicas > 0 AND limite_usuarios > 0
    ),
    CONSTRAINT organizacoes_website_format CHECK (
        website IS NULL OR website ~ '^https?://'
    ),
    CONSTRAINT organizacoes_data_fundacao_valida CHECK (
        data_fundacao IS NULL OR data_fundacao <= CURRENT_DATE
    )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_organizacoes_nome 
    ON public.organizacoes USING gin(to_tsvector('portuguese', nome));
CREATE INDEX IF NOT EXISTS idx_organizacoes_cnpj 
    ON public.organizacoes(cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizacoes_ativo 
    ON public.organizacoes(ativo);

-- Trigger
CREATE TRIGGER update_organizacoes_updated_at
    BEFORE UPDATE ON public.organizacoes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.organizacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem criar organizações" 
    ON public.organizacoes
    FOR INSERT 
    WITH CHECK (auth.uid() = criado_por);

-- =============================================================================
-- 🏥 MIGRAÇÃO 005: TABELA CLÍNICAS  
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.clinicas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    
    nome TEXT NOT NULL,
    cnpj TEXT,
    
    endereco_rua TEXT,
    endereco_numero TEXT,
    endereco_complemento TEXT,
    endereco_bairro TEXT,
    endereco_cidade TEXT,
    endereco_estado TEXT,
    endereco_cep TEXT,
    endereco_pais TEXT DEFAULT 'Brasil',
    
    telefone TEXT,
    email TEXT,
    website TEXT,
    whatsapp TEXT,
    
    especialidades TEXT[],
    horario_funcionamento JSONB,
    capacidade_atendimento INTEGER,
    numero_salas INTEGER,
    
    registro_anvisa TEXT,
    alvara_funcionamento TEXT,
    licenca_sanitaria TEXT,
    responsavel_tecnico_nome TEXT,
    responsavel_tecnico_registro TEXT,
    
    configuracoes JSONB DEFAULT '{}'::jsonb,
    
    aceita_convenios BOOLEAN DEFAULT false,
    convenios_aceitos TEXT[],
    
    ativo BOOLEAN NOT NULL DEFAULT true,
    verificado BOOLEAN NOT NULL DEFAULT false,
    data_verificacao TIMESTAMP WITH TIME ZONE,
    
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    criado_por UUID REFERENCES auth.users(id),
    
    CONSTRAINT clinicas_cnpj_valid CHECK (
        cnpj IS NULL OR public.validate_cnpj(cnpj)
    ),
    CONSTRAINT clinicas_email_valid CHECK (
        email IS NULL OR public.validate_email(email)
    ),
    CONSTRAINT clinicas_nome_not_empty CHECK (
        LENGTH(TRIM(nome)) >= 2
    ),
    CONSTRAINT clinicas_cep_format CHECK (
        endereco_cep IS NULL OR endereco_cep ~ '^\d{5}-?\d{3}$'
    ),
    CONSTRAINT clinicas_capacidade_positiva CHECK (
        capacidade_atendimento IS NULL OR capacidade_atendimento > 0
    ),
    CONSTRAINT clinicas_salas_positiva CHECK (
        numero_salas IS NULL OR numero_salas > 0
    ),
    CONSTRAINT clinicas_website_format CHECK (
        website IS NULL OR website ~ '^https?://'
    ),
    CONSTRAINT clinicas_telefone_format CHECK (
        telefone IS NULL OR telefone ~ '^\+?[1-9]\d{1,14}$'
    )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_clinicas_nome 
    ON public.clinicas USING gin(to_tsvector('portuguese', nome));
CREATE INDEX IF NOT EXISTS idx_clinicas_ativo 
    ON public.clinicas(ativo);
CREATE INDEX IF NOT EXISTS idx_clinicas_organizacao_id 
    ON public.clinicas(organizacao_id) WHERE organizacao_id IS NOT NULL;

-- Trigger
CREATE TRIGGER update_clinicas_updated_at
    BEFORE UPDATE ON public.clinicas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 🔐 MIGRAÇÃO 006: TABELA USER_ROLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    clinica_id UUID REFERENCES public.clinicas(id) ON DELETE CASCADE,
    
    role user_role_type NOT NULL,
    
    ativo BOOLEAN NOT NULL DEFAULT true,
    data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    data_fim DATE,
    
    observacoes TEXT,
    
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    criado_por UUID NOT NULL REFERENCES auth.users(id),
    
    CONSTRAINT user_roles_date_logic CHECK (
        data_fim IS NULL OR data_fim > data_inicio
    ),
    CONSTRAINT user_roles_context_required CHECK (
        organizacao_id IS NOT NULL OR clinica_id IS NOT NULL
    ),
    CONSTRAINT user_roles_unique_active UNIQUE(
        user_id, organizacao_id, clinica_id, role
    ) DEFERRABLE INITIALLY DEFERRED
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
    ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_organizacao_id 
    ON public.user_roles(organizacao_id) WHERE organizacao_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_clinica_id 
    ON public.user_roles(clinica_id) WHERE clinica_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_ativo 
    ON public.user_roles(ativo);

-- Função para validar contexto
CREATE OR REPLACE FUNCTION public.validate_user_role_context()
RETURNS TRIGGER AS $$
BEGIN
    -- Se tem clinica_id, verificar se a clínica pertence à organização (se especificada)
    IF NEW.clinica_id IS NOT NULL AND NEW.organizacao_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.clinicas c
            WHERE c.id = NEW.clinica_id
            AND c.organizacao_id = NEW.organizacao_id
        ) THEN
            RAISE EXCEPTION 'Clinic does not belong to the specified organization';
        END IF;
    END IF;
    
    -- Se tem apenas clinica_id, pegar a organizacao_id automaticamente
    IF NEW.clinica_id IS NOT NULL AND NEW.organizacao_id IS NULL THEN
        SELECT organizacao_id INTO NEW.organizacao_id
        FROM public.clinicas
        WHERE id = NEW.clinica_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar contexto
CREATE TRIGGER validate_user_role_context_trigger
    BEFORE INSERT OR UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_user_role_context();

-- RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver próprios roles" 
    ON public.user_roles
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Função para criar role inicial de proprietária
CREATE OR REPLACE FUNCTION public.create_owner_role(
    user_id UUID,
    organizacao_id UUID DEFAULT NULL,
    clinica_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    role_id UUID;
BEGIN
    -- Validar que pelo menos um contexto foi fornecido
    IF organizacao_id IS NULL AND clinica_id IS NULL THEN
        RAISE EXCEPTION 'Either organization_id or clinic_id must be provided';
    END IF;
    
    -- Criar role de proprietária
    INSERT INTO public.user_roles (
        user_id, 
        organizacao_id, 
        clinica_id, 
        role, 
        criado_por
    ) VALUES (
        user_id,
        organizacao_id,
        clinica_id,
        'proprietaria',
        user_id
    ) RETURNING id INTO role_id;
    
    RETURN role_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 🎉 CONCLUSÃO - TODAS AS MIGRAÇÕES APLICADAS
-- =============================================================================

-- Comentários finais nas tabelas principais
COMMENT ON TABLE public.profiles IS 'Perfis de usuários com informações estendidas do auth.users';
COMMENT ON TABLE public.organizacoes IS 'Organizações que podem ter múltiplas clínicas (multi-tenant)';
COMMENT ON TABLE public.clinicas IS 'Clínicas - unidade principal de organização do sistema';
COMMENT ON TABLE public.user_roles IS 'Roles contextuais dos usuários por organização/clínica';
COMMENT ON TABLE public.especialidades_medicas IS 'Tabela de referência para especialidades médicas e estéticas disponíveis no sistema';

-- Log de sucesso
DO $$
BEGIN
    RAISE NOTICE '🎉 MIGRAÇÃO COMPLETA EXECUTADA COM SUCESSO!';
    RAISE NOTICE '📊 Tabelas criadas: profiles, organizacoes, clinicas, user_roles, especialidades_medicas';
    RAISE NOTICE '🔒 RLS habilitado em todas as tabelas';
    RAISE NOTICE '⚡ Índices de performance aplicados';
    RAISE NOTICE '🔧 Funções utilitárias criadas';
    RAISE NOTICE '✅ Sistema pronto para uso!';
END $$;