-- Migration: Criar tabela de imagens médicas
-- Description: Implementa sistema de armazenamento seguro de imagens médicas com watermark e controle de acesso
-- Requirements: 6.3, 6.4

-- Criar enum para status de processamento de imagem
DO $ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_processamento_imagem') THEN
        CREATE TYPE status_processamento_imagem AS ENUM (
            'pendente',
            'processando',
            'concluido',
            'erro',
            'rejeitado'
        );
    END IF;
END $;

-- Criar enum para qualidade de imagem
DO $ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'qualidade_imagem') THEN
        CREATE TYPE qualidade_imagem AS ENUM (
            'baixa',
            'media',
            'alta',
            'original'
        );
    END IF;
END $;

-- Criar tabela de imagens médicas
CREATE TABLE IF NOT EXISTS public.imagens_medicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sessao_id UUID NOT NULL REFERENCES public.sessoes_atendimento(id) ON DELETE CASCADE,
    tipo_imagem tipo_imagem NOT NULL,
    
    -- Dados da imagem criptografados/seguros
    url_storage TEXT NOT NULL, -- URL no storage (Supabase Storage)
    url_thumbnail TEXT, -- URL da miniatura
    nome_arquivo_original TEXT NOT NULL,
    nome_arquivo_storage TEXT NOT NULL, -- Nome único no storage
    tamanho_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    resolucao TEXT, -- Ex: "1920x1080"
    qualidade qualidade_imagem DEFAULT 'alta',
    
    -- Metadados médicos
    regiao_corporal TEXT NOT NULL,
    angulo_captura TEXT,
    condicoes_iluminacao TEXT,
    observacoes_imagem TEXT,
    palavras_chave TEXT[], -- Para busca e categorização
    
    -- Controle de acesso e visibilidade
    visivel_paciente BOOLEAN DEFAULT false,
    visivel_outros_profissionais BOOLEAN DEFAULT true,
    requer_consentimento BOOLEAN DEFAULT true,
    consentimento_obtido BOOLEAN DEFAULT false,
    data_consentimento TIMESTAMPTZ,
    
    -- Sistema de watermark e segurança
    watermark_aplicado BOOLEAN DEFAULT false,
    watermark_texto TEXT,
    criptografada BOOLEAN DEFAULT false,
    chave_criptografia TEXT, -- Hash da chave de criptografia
    
    -- Status de processamento
    status_processamento status_processamento_imagem DEFAULT 'pendente',
    erro_processamento TEXT,
    tentativas_processamento INTEGER DEFAULT 0,
    
    -- Metadados técnicos
    exif_data JSONB DEFAULT '{}', -- Dados EXIF da câmera
    hash_arquivo TEXT NOT NULL, -- Hash SHA-256 do arquivo original
    versao_processamento INTEGER DEFAULT 1,
    
    -- Auditoria e rastreamento
    capturada_em TIMESTAMPTZ DEFAULT now(),
    processada_em TIMESTAMPTZ,
    capturada_por UUID NOT NULL REFERENCES auth.users(id),
    aprovada_por UUID REFERENCES auth.users(id),
    data_aprovacao TIMESTAMPTZ,
    
    -- Metadados de armazenamento e backup
    bucket_storage TEXT DEFAULT 'imagens-medicas',
    path_storage TEXT NOT NULL,
    backup_realizado BOOLEAN DEFAULT false,
    backup_url TEXT,
    data_backup TIMESTAMPTZ,
    
    -- Controle de retenção
    data_expiracao DATE, -- Para compliance com LGPD
    arquivada BOOLEAN DEFAULT false,
    data_arquivamento TIMESTAMPTZ,
    motivo_arquivamento TEXT,
    
    -- Timestamps
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CHECK (tamanho_bytes > 0),
    CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/tiff')),
    CHECK (tentativas_processamento >= 0),
    CHECK (versao_processamento > 0),
    CHECK (data_consentimento IS NULL OR consentimento_obtido = true),
    CHECK (data_aprovacao IS NULL OR aprovada_por IS NOT NULL)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_imagens_sessao_id ON public.imagens_medicas(sessao_id);
CREATE INDEX IF NOT EXISTS idx_imagens_tipo ON public.imagens_medicas(tipo_imagem);
CREATE INDEX IF NOT EXISTS idx_imagens_capturada_por ON public.imagens_medicas(capturada_por);
CREATE INDEX IF NOT EXISTS idx_imagens_capturada_em ON public.imagens_medicas(capturada_em);
CREATE INDEX IF NOT EXISTS idx_imagens_status ON public.imagens_medicas(status_processamento);
CREATE INDEX IF NOT EXISTS idx_imagens_visivel_paciente ON public.imagens_medicas(visivel_paciente);
CREATE INDEX IF NOT EXISTS idx_imagens_regiao_corporal ON public.imagens_medicas(regiao_corporal);
CREATE INDEX IF NOT EXISTS idx_imagens_hash_arquivo ON public.imagens_medicas(hash_arquivo);
CREATE INDEX IF NOT EXISTS idx_imagens_arquivada ON public.imagens_medicas(arquivada);

-- Índice composto para consultas por sessão e tipo
CREATE INDEX IF NOT EXISTS idx_imagens_sessao_tipo ON public.imagens_medicas(sessao_id, tipo_imagem);

-- Índice para busca por palavras-chave usando GIN
CREATE INDEX IF NOT EXISTS idx_imagens_palavras_chave ON public.imagens_medicas USING GIN(palavras_chave);

-- Índice para dados EXIF usando GIN
CREATE INDEX IF NOT EXISTS idx_imagens_exif_data ON public.imagens_medicas USING GIN(exif_data);

-- Função para gerar nome único de arquivo no storage
CREATE OR REPLACE FUNCTION public.gerar_nome_arquivo_storage(
    p_sessao_id UUID,
    p_tipo_imagem tipo_imagem,
    p_extensao TEXT
)
RETURNS TEXT AS $
DECLARE
    timestamp_str TEXT;
    random_str TEXT;
    nome_arquivo TEXT;
BEGIN
    -- Gerar timestamp
    timestamp_str := to_char(now(), 'YYYYMMDD_HH24MISS');
    
    -- Gerar string aleatória
    random_str := encode(gen_random_bytes(8), 'hex');
    
    -- Construir nome do arquivo
    nome_arquivo := p_sessao_id::TEXT || '_' || 
                   p_tipo_imagem::TEXT || '_' || 
                   timestamp_str || '_' || 
                   random_str || '.' || 
                   p_extensao;
    
    RETURN nome_arquivo;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular hash do arquivo
CREATE OR REPLACE FUNCTION public.calcular_hash_imagem(
    p_conteudo_base64 TEXT
)
RETURNS TEXT AS $
BEGIN
    RETURN encode(
        digest(p_conteudo_base64, 'sha256'),
        'hex'
    );
END;
$ LANGUAGE plpgsql IMMUTABLE;

-- Função para aplicar watermark automático
CREATE OR REPLACE FUNCTION public.aplicar_watermark_imagem(
    p_imagem_id UUID
)
RETURNS BOOLEAN AS $
DECLARE
    imagem_data RECORD;
    clinica_nome TEXT;
    watermark_texto TEXT;
BEGIN
    -- Buscar dados da imagem e clínica
    SELECT 
        i.*,
        c.nome as clinica_nome
    INTO imagem_data
    FROM public.imagens_medicas i
    JOIN public.sessoes_atendimento s ON s.id = i.sessao_id
    JOIN public.prontuarios p ON p.id = s.prontuario_id
    JOIN public.clinicas c ON c.id = p.clinica_id
    WHERE i.id = p_imagem_id;
    
    -- Se não encontrou a imagem, retornar false
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Construir texto do watermark
    watermark_texto := imagem_data.clinica_nome || ' - ' || 
                      to_char(imagem_data.capturada_em, 'DD/MM/YYYY HH24:MI') || ' - ' ||
                      'CONFIDENCIAL';
    
    -- Atualizar registro da imagem
    UPDATE public.imagens_medicas SET
        watermark_aplicado = true,
        watermark_texto = watermark_texto,
        status_processamento = 'concluido',
        processada_em = now(),
        atualizado_em = now()
    WHERE id = p_imagem_id;
    
    RETURN TRUE;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar permissão de acesso à imagem
CREATE OR REPLACE FUNCTION public.verificar_acesso_imagem(
    p_imagem_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $
DECLARE
    imagem_data RECORD;
    user_role TEXT;
    clinica_id UUID;
    is_paciente BOOLEAN := false;
BEGIN
    -- Buscar dados da imagem
    SELECT 
        i.*,
        p.clinica_id,
        p.cliente_id
    INTO imagem_data
    FROM public.imagens_medicas i
    JOIN public.sessoes_atendimento s ON s.id = i.sessao_id
    JOIN public.prontuarios pr ON pr.id = s.prontuario_id
    WHERE i.id = p_imagem_id;
    
    -- Se não encontrou a imagem, negar acesso
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    clinica_id := imagem_data.clinica_id;
    
    -- Verificar se é o próprio paciente
    SELECT EXISTS(
        SELECT 1 FROM public.clientes c 
        WHERE c.id = imagem_data.cliente_id 
        AND c.user_id = p_user_id
    ) INTO is_paciente;
    
    -- Se é paciente, verificar se imagem é visível para paciente
    IF is_paciente THEN
        RETURN imagem_data.visivel_paciente AND imagem_data.consentimento_obtido;
    END IF;
    
    -- Verificar role do usuário na clínica
    SELECT ur.role INTO user_role
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id 
    AND ur.clinica_id = clinica_id
    AND ur.ativo = true;
    
    -- Se não tem role na clínica, negar acesso
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Profissionais podem ver imagens se configurado
    IF user_role IN ('profissionais', 'admin', 'proprietario') THEN
        -- Verificar se é o profissional que capturou a imagem
        IF imagem_data.capturada_por = p_user_id THEN
            RETURN TRUE;
        END IF;
        
        -- Verificar se imagem é visível para outros profissionais
        RETURN imagem_data.visivel_outros_profissionais;
    END IF;
    
    -- Recepcionistas só podem ver se aprovado
    IF user_role = 'recepcionista' THEN
        RETURN imagem_data.aprovada_por IS NOT NULL;
    END IF;
    
    -- Por padrão, negar acesso
    RETURN FALSE;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para arquivar imagens antigas
CREATE OR REPLACE FUNCTION public.arquivar_imagens_antigas(
    p_dias_retencao INTEGER DEFAULT 2555 -- ~7 anos por padrão
)
RETURNS INTEGER AS $
DECLARE
    imagens_arquivadas INTEGER := 0;
BEGIN
    -- Arquivar imagens antigas que não estão arquivadas
    UPDATE public.imagens_medicas SET
        arquivada = true,
        data_arquivamento = now(),
        motivo_arquivamento = 'Arquivamento automático por tempo de retenção',
        atualizado_em = now()
    WHERE arquivada = false
    AND capturada_em < (CURRENT_DATE - INTERVAL '1 day' * p_dias_retencao);
    
    GET DIAGNOSTICS imagens_arquivadas = ROW_COUNT;
    
    RETURN imagens_arquivadas;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar dados da imagem
CREATE OR REPLACE FUNCTION public.trigger_atualizar_imagem()
RETURNS TRIGGER AS $
BEGIN
    -- Atualizar timestamp
    NEW.atualizado_em = now();
    
    -- Gerar nome de arquivo no storage se não especificado
    IF NEW.nome_arquivo_storage IS NULL OR NEW.nome_arquivo_storage = '' THEN
        NEW.nome_arquivo_storage = public.gerar_nome_arquivo_storage(
            NEW.sessao_id,
            NEW.tipo_imagem,
            split_part(NEW.nome_arquivo_original, '.', -1)
        );
    END IF;
    
    -- Construir path no storage
    IF NEW.path_storage IS NULL OR NEW.path_storage = '' THEN
        NEW.path_storage = NEW.sessao_id::TEXT || '/' || NEW.nome_arquivo_storage;
    END IF;
    
    -- Aplicar watermark automaticamente se configurado
    IF TG_OP = 'INSERT' AND NEW.watermark_aplicado = false THEN
        -- Marcar para aplicação de watermark (será processado assincronamente)
        NEW.status_processamento = 'pendente';
    END IF;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_imagens_medicas_update ON public.imagens_medicas;
CREATE TRIGGER trigger_imagens_medicas_update
    BEFORE INSERT OR UPDATE ON public.imagens_medicas
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_atualizar_imagem();

-- Trigger para log de auditoria de acesso
CREATE OR REPLACE FUNCTION public.trigger_log_acesso_imagem()
RETURNS TRIGGER AS $
BEGIN
    -- Registrar acesso na auditoria médica
    INSERT INTO public.auditoria_medica (
        tabela_afetada,
        operacao,
        registro_id,
        dados_anteriores,
        dados_novos,
        usuario_id,
        ip_address,
        user_agent,
        contexto_adicional
    ) VALUES (
        'imagens_medicas',
        'SELECT',
        NEW.id,
        NULL,
        jsonb_build_object(
            'imagem_id', NEW.id,
            'tipo_imagem', NEW.tipo_imagem,
            'sessao_id', NEW.sessao_id,
            'visivel_paciente', NEW.visivel_paciente
        ),
        auth.uid(),
        inet_client_addr()::TEXT,
        current_setting('request.headers', true)::JSONB->>'user-agent',
        jsonb_build_object(
            'acao', 'visualizacao_imagem',
            'regiao_corporal', NEW.regiao_corporal
        )
    );
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para processar fila de imagens pendentes
CREATE OR REPLACE FUNCTION public.processar_fila_imagens()
RETURNS INTEGER AS $
DECLARE
    imagem_record RECORD;
    imagens_processadas INTEGER := 0;
BEGIN
    -- Processar imagens pendentes
    FOR imagem_record IN 
        SELECT id FROM public.imagens_medicas 
        WHERE status_processamento = 'pendente'
        AND tentativas_processamento < 3
        ORDER BY criado_em ASC
        LIMIT 10
    LOOP
        -- Tentar aplicar watermark
        IF public.aplicar_watermark_imagem(imagem_record.id) THEN
            imagens_processadas := imagens_processadas + 1;
        ELSE
            -- Incrementar tentativas e marcar erro se necessário
            UPDATE public.imagens_medicas SET
                tentativas_processamento = tentativas_processamento + 1,
                status_processamento = CASE 
                    WHEN tentativas_processamento >= 2 THEN 'erro'::status_processamento_imagem
                    ELSE 'pendente'::status_processamento_imagem
                END,
                erro_processamento = CASE 
                    WHEN tentativas_processamento >= 2 THEN 'Falha após múltiplas tentativas'
                    ELSE erro_processamento
                END,
                atualizado_em = now()
            WHERE id = imagem_record.id;
        END IF;
    END LOOP;
    
    RETURN imagens_processadas;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON TABLE public.imagens_medicas IS 'Armazenamento seguro de imagens médicas com controle de acesso e watermark';
COMMENT ON COLUMN public.imagens_medicas.url_storage IS 'URL da imagem no Supabase Storage';
COMMENT ON COLUMN public.imagens_medicas.hash_arquivo IS 'Hash SHA-256 do arquivo original para verificação de integridade';
COMMENT ON COLUMN public.imagens_medicas.watermark_aplicado IS 'Indica se o watermark foi aplicado à imagem';
COMMENT ON COLUMN public.imagens_medicas.visivel_paciente IS 'Controla se o paciente pode visualizar esta imagem';
COMMENT ON COLUMN public.imagens_medicas.consentimento_obtido IS 'Indica se o consentimento do paciente foi obtido';
COMMENT ON COLUMN public.imagens_medicas.criptografada IS 'Indica se a imagem está criptografada no storage';
COMMENT ON FUNCTION public.verificar_acesso_imagem(UUID, UUID) IS 'Verifica se usuário tem permissão para acessar a imagem';
COMMENT ON FUNCTION public.aplicar_watermark_imagem(UUID) IS 'Aplica watermark automático na imagem';
COMMENT ON FUNCTION public.processar_fila_imagens() IS 'Processa fila de imagens pendentes de watermark';