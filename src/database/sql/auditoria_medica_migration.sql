-- Migration: Sistema de auditoria médica
-- Description: Implementa logs de acesso, rastreamento de modificações e assinatura digital
-- Requirements: 6.2, 6.5

-- Criar enum para tipos de operação de auditoria
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_operacao_auditoria') THEN
        CREATE TYPE tipo_operacao_auditoria AS ENUM (
            'create',
            'read',
            'update',
            'delete',
            'export',
            'print',
            'share'
        );
    END IF;
END $$;

-- Criar enum para tipos de entidade auditada
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_entidade_auditoria') THEN
        CREATE TYPE tipo_entidade_auditoria AS ENUM (
            'prontuario',
            'sessao_atendimento',
            'imagem_medica',
            'documento_medico'
        );
    END IF;
END $$;

-- Criar enum para status de assinatura digital
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_assinatura') THEN
        CREATE TYPE status_assinatura AS ENUM (
            'pendente',
            'assinado',
            'rejeitado',
            'expirado'
        );
    END IF;
END $$;

-- Tabela de logs de auditoria médica
CREATE TABLE IF NOT EXISTS public.auditoria_medica (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação da operação
    tipo_operacao tipo_operacao_auditoria NOT NULL,
    tipo_entidade tipo_entidade_auditoria NOT NULL,
    entidade_id UUID NOT NULL,
    
    -- Dados do usuário
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    clinica_id UUID NOT NULL REFERENCES public.clinicas(id),
    
    -- Dados da operação
    dados_anteriores JSONB,
    dados_novos JSONB,
    campos_alterados TEXT[],
    motivo_alteracao TEXT,
    
    -- Metadados técnicos
    ip_address INET,
    user_agent TEXT,
    sessao_id TEXT,
    
    -- Dados temporais
    timestamp_operacao TIMESTAMPTZ DEFAULT now(),
    
    -- Integridade
    hash_operacao TEXT NOT NULL,
    
    -- Índices para consultas
    CONSTRAINT auditoria_entidade_valida CHECK (
        (tipo_entidade = 'prontuario' AND EXISTS (SELECT 1 FROM public.prontuarios WHERE id = entidade_id))
        OR (tipo_entidade = 'sessao_atendimento' AND EXISTS (SELECT 1 FROM public.sessoes_atendimento WHERE id = entidade_id))
        OR tipo_entidade IN ('imagem_medica', 'documento_medico')
    )
);

-- Tabela de assinaturas digitais
CREATE TABLE IF NOT EXISTS public.assinaturas_digitais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Documento/entidade assinada
    tipo_entidade tipo_entidade_auditoria NOT NULL,
    entidade_id UUID NOT NULL,
    
    -- Dados do signatário
    signatario_id UUID NOT NULL REFERENCES auth.users(id),
    clinica_id UUID NOT NULL REFERENCES public.clinicas(id),
    
    -- Dados da assinatura
    hash_documento TEXT NOT NULL,
    assinatura_digital TEXT NOT NULL,
    certificado_digital TEXT,
    
    -- Status e validação
    status status_assinatura DEFAULT 'pendente',
    data_assinatura TIMESTAMPTZ,
    data_expiracao TIMESTAMPTZ,
    
    -- Metadados
    ip_assinatura INET,
    user_agent_assinatura TEXT,
    observacoes TEXT,
    
    -- Auditoria
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CHECK (
        (status = 'assinado' AND data_assinatura IS NOT NULL)
        OR (status != 'assinado' AND data_assinatura IS NULL)
    )
);

-- Tabela de versões de documentos médicos
CREATE TABLE IF NOT EXISTS public.versoes_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Documento original
    tipo_entidade tipo_entidade_auditoria NOT NULL,
    entidade_id UUID NOT NULL,
    
    -- Controle de versão
    numero_versao INTEGER NOT NULL,
    versao_anterior_id UUID REFERENCES public.versoes_documentos(id),
    
    -- Dados da versão
    dados_versao JSONB NOT NULL,
    hash_versao TEXT NOT NULL,
    
    -- Metadados
    criado_por UUID NOT NULL REFERENCES auth.users(id),
    criado_em TIMESTAMPTZ DEFAULT now(),
    motivo_versao TEXT,
    
    -- Constraints
    UNIQUE(tipo_entidade, entidade_id, numero_versao),
    CHECK (numero_versao > 0)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_id ON public.auditoria_medica(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_clinica_id ON public.auditoria_medica(clinica_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidade ON public.auditoria_medica(tipo_entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_timestamp ON public.auditoria_medica(timestamp_operacao);
CREATE INDEX IF NOT EXISTS idx_auditoria_operacao ON public.auditoria_medica(tipo_operacao);

CREATE INDEX IF NOT EXISTS idx_assinaturas_entidade ON public.assinaturas_digitais(tipo_entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_signatario ON public.assinaturas_digitais(signatario_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON public.assinaturas_digitais(status);
CREATE INDEX IF NOT EXISTS idx_assinaturas_data ON public.assinaturas_digitais(data_assinatura);

CREATE INDEX IF NOT EXISTS idx_versoes_entidade ON public.versoes_documentos(tipo_entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_versoes_numero ON public.versoes_documentos(numero_versao);
CREATE INDEX IF NOT EXISTS idx_versoes_criado_por ON public.versoes_documentos(criado_por);

-- Função para calcular hash de operação de auditoria
CREATE OR REPLACE FUNCTION public.calcular_hash_auditoria(
    p_tipo_operacao tipo_operacao_auditoria,
    p_tipo_entidade tipo_entidade_auditoria,
    p_entidade_id UUID,
    p_usuario_id UUID,
    p_dados_anteriores JSONB DEFAULT NULL,
    p_dados_novos JSONB DEFAULT NULL
)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        digest(
            p_tipo_operacao::TEXT || '|' ||
            p_tipo_entidade::TEXT || '|' ||
            p_entidade_id::TEXT || '|' ||
            p_usuario_id::TEXT || '|' ||
            COALESCE(p_dados_anteriores::TEXT, '') || '|' ||
            COALESCE(p_dados_novos::TEXT, '') || '|' ||
            EXTRACT(EPOCH FROM now())::TEXT,
            'sha256'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para registrar operação de auditoria
CREATE OR REPLACE FUNCTION public.registrar_auditoria(
    p_tipo_operacao tipo_operacao_auditoria,
    p_tipo_entidade tipo_entidade_auditoria,
    p_entidade_id UUID,
    p_dados_anteriores JSONB DEFAULT NULL,
    p_dados_novos JSONB DEFAULT NULL,
    p_motivo TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
    clinica_id_var UUID;
    campos_alterados_var TEXT[];
    key_name TEXT;
BEGIN
    -- Determinar clínica baseada no tipo de entidade
    CASE p_tipo_entidade
        WHEN 'prontuario' THEN
            SELECT p.clinica_id INTO clinica_id_var
            FROM public.prontuarios p
            WHERE p.id = p_entidade_id;
        WHEN 'sessao_atendimento' THEN
            SELECT pr.clinica_id INTO clinica_id_var
            FROM public.sessoes_atendimento s
            JOIN public.prontuarios pr ON pr.id = s.prontuario_id
            WHERE s.id = p_entidade_id;
        ELSE
            -- Para outros tipos, tentar obter da sessão atual
            clinica_id_var := NULL;
    END CASE;
    
    -- Calcular campos alterados se for update
    IF p_tipo_operacao = 'update' AND p_dados_anteriores IS NOT NULL AND p_dados_novos IS NOT NULL THEN
        campos_alterados_var := ARRAY[]::TEXT[];
        
        FOR key_name IN SELECT jsonb_object_keys(p_dados_novos)
        LOOP
            IF (p_dados_anteriores->key_name) IS DISTINCT FROM (p_dados_novos->key_name) THEN
                campos_alterados_var := array_append(campos_alterados_var, key_name);
            END IF;
        END LOOP;
    END IF;
    
    -- Inserir registro de auditoria
    INSERT INTO public.auditoria_medica (
        tipo_operacao,
        tipo_entidade,
        entidade_id,
        usuario_id,
        clinica_id,
        dados_anteriores,
        dados_novos,
        campos_alterados,
        motivo_alteracao,
        hash_operacao
    ) VALUES (
        p_tipo_operacao,
        p_tipo_entidade,
        p_entidade_id,
        auth.uid(),
        clinica_id_var,
        p_dados_anteriores,
        p_dados_novos,
        campos_alterados_var,
        p_motivo,
        public.calcular_hash_auditoria(
            p_tipo_operacao,
            p_tipo_entidade,
            p_entidade_id,
            auth.uid(),
            p_dados_anteriores,
            p_dados_novos
        )
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar assinatura digital
CREATE OR REPLACE FUNCTION public.criar_assinatura_digital(
    p_tipo_entidade tipo_entidade_auditoria,
    p_entidade_id UUID,
    p_hash_documento TEXT,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    assinatura_id UUID;
    clinica_id_var UUID;
    assinatura_digital_var TEXT;
BEGIN
    -- Determinar clínica baseada no tipo de entidade
    CASE p_tipo_entidade
        WHEN 'prontuario' THEN
            SELECT p.clinica_id INTO clinica_id_var
            FROM public.prontuarios p
            WHERE p.id = p_entidade_id;
        WHEN 'sessao_atendimento' THEN
            SELECT pr.clinica_id INTO clinica_id_var
            FROM public.sessoes_atendimento s
            JOIN public.prontuarios pr ON pr.id = s.prontuario_id
            WHERE s.id = p_entidade_id;
    END CASE;
    
    -- Gerar assinatura digital (simplificada - em produção usar certificado real)
    assinatura_digital_var := encode(
        digest(
            p_hash_documento || '|' ||
            auth.uid()::TEXT || '|' ||
            EXTRACT(EPOCH FROM now())::TEXT,
            'sha256'
        ),
        'hex'
    );
    
    -- Inserir assinatura
    INSERT INTO public.assinaturas_digitais (
        tipo_entidade,
        entidade_id,
        signatario_id,
        clinica_id,
        hash_documento,
        assinatura_digital,
        status,
        data_assinatura,
        data_expiracao,
        observacoes
    ) VALUES (
        p_tipo_entidade,
        p_entidade_id,
        auth.uid(),
        clinica_id_var,
        p_hash_documento,
        assinatura_digital_var,
        'assinado',
        now(),
        now() + INTERVAL '10 years',
        p_observacoes
    ) RETURNING id INTO assinatura_id;
    
    -- Registrar na auditoria
    PERFORM public.registrar_auditoria(
        'create'::tipo_operacao_auditoria,
        p_tipo_entidade,
        p_entidade_id,
        NULL,
        jsonb_build_object('assinatura_id', assinatura_id),
        'Documento assinado digitalmente'
    );
    
    RETURN assinatura_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar nova versão de documento
CREATE OR REPLACE FUNCTION public.criar_versao_documento(
    p_tipo_entidade tipo_entidade_auditoria,
    p_entidade_id UUID,
    p_dados_versao JSONB,
    p_motivo TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    versao_id UUID;
    proximo_numero INTEGER;
    versao_anterior_id_var UUID;
BEGIN
    -- Obter próximo número de versão
    SELECT COALESCE(MAX(numero_versao), 0) + 1, MAX(id)
    INTO proximo_numero, versao_anterior_id_var
    FROM public.versoes_documentos
    WHERE tipo_entidade = p_tipo_entidade
    AND entidade_id = p_entidade_id;
    
    -- Inserir nova versão
    INSERT INTO public.versoes_documentos (
        tipo_entidade,
        entidade_id,
        numero_versao,
        versao_anterior_id,
        dados_versao,
        hash_versao,
        criado_por,
        motivo_versao
    ) VALUES (
        p_tipo_entidade,
        p_entidade_id,
        proximo_numero,
        versao_anterior_id_var,
        p_dados_versao,
        encode(digest(p_dados_versao::TEXT, 'sha256'), 'hex'),
        auth.uid(),
        p_motivo
    ) RETURNING id INTO versao_id;
    
    -- Registrar na auditoria
    PERFORM public.registrar_auditoria(
        'create'::tipo_operacao_auditoria,
        p_tipo_entidade,
        p_entidade_id,
        NULL,
        jsonb_build_object('versao_id', versao_id, 'numero_versao', proximo_numero),
        COALESCE(p_motivo, 'Nova versão do documento criada')
    );
    
    RETURN versao_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auditoria automática de prontuários
CREATE OR REPLACE FUNCTION public.trigger_auditoria_prontuarios()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.registrar_auditoria(
            'create'::tipo_operacao_auditoria,
            'prontuario'::tipo_entidade_auditoria,
            NEW.id,
            NULL,
            to_jsonb(NEW),
            'Prontuário criado'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.registrar_auditoria(
            'update'::tipo_operacao_auditoria,
            'prontuario'::tipo_entidade_auditoria,
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW),
            'Prontuário atualizado'
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auditoria automática de sessões
CREATE OR REPLACE FUNCTION public.trigger_auditoria_sessoes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.registrar_auditoria(
            'create'::tipo_operacao_auditoria,
            'sessao_atendimento'::tipo_entidade_auditoria,
            NEW.id,
            NULL,
            to_jsonb(NEW),
            'Sessão de atendimento criada'
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.registrar_auditoria(
            'update'::tipo_operacao_auditoria,
            'sessao_atendimento'::tipo_entidade_auditoria,
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW),
            'Sessão de atendimento atualizada'
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar triggers de auditoria
DROP TRIGGER IF EXISTS trigger_auditoria_prontuarios ON public.prontuarios;
CREATE TRIGGER trigger_auditoria_prontuarios
    AFTER INSERT OR UPDATE ON public.prontuarios
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_auditoria_prontuarios();

DROP TRIGGER IF EXISTS trigger_auditoria_sessoes ON public.sessoes_atendimento;
CREATE TRIGGER trigger_auditoria_sessoes
    AFTER INSERT OR UPDATE ON public.sessoes_atendimento
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_auditoria_sessoes();

-- Comentários para documentação
COMMENT ON TABLE public.auditoria_medica IS 'Logs de auditoria para operações em dados médicos';
COMMENT ON TABLE public.assinaturas_digitais IS 'Assinaturas digitais de documentos médicos';
COMMENT ON TABLE public.versoes_documentos IS 'Controle de versões de documentos médicos';
COMMENT ON FUNCTION public.registrar_auditoria(tipo_operacao_auditoria, tipo_entidade_auditoria, UUID, JSONB, JSONB, TEXT) IS 'Registra operação de auditoria médica';
COMMENT ON FUNCTION public.criar_assinatura_digital(tipo_entidade_auditoria, UUID, TEXT, TEXT) IS 'Cria assinatura digital para documento médico';
COMMENT ON FUNCTION public.criar_versao_documento(tipo_entidade_auditoria, UUID, JSONB, TEXT) IS 'Cria nova versão de documento médico';