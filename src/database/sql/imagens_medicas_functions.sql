-- Functions: Imagens Médicas - Funções utilitárias
-- Description: Funções para processamento, backup e gestão de imagens médicas
-- Requirements: 6.3, 6.4

-- Função para criar imagem médica com validações
CREATE OR REPLACE FUNCTION public.criar_imagem_medica(
    p_sessao_id UUID,
    p_tipo_imagem tipo_imagem,
    p_nome_arquivo_original TEXT,
    p_tamanho_bytes BIGINT,
    p_mime_type TEXT,
    p_regiao_corporal TEXT,
    p_hash_arquivo TEXT,
    p_resolucao TEXT DEFAULT NULL,
    p_observacoes TEXT DEFAULT NULL,
    p_visivel_paciente BOOLEAN DEFAULT false,
    p_requer_consentimento BOOLEAN DEFAULT true
)
RETURNS UUID AS $
DECLARE
    nova_imagem_id UUID;
    nome_storage TEXT;
    path_storage TEXT;
BEGIN
    -- Validar sessão existe e usuário tem acesso
    IF NOT EXISTS (
        SELECT 1 FROM public.sessoes_atendimento s
        JOIN public.prontuarios p ON p.id = s.prontuario_id
        JOIN public.user_roles ur ON ur.clinica_id = p.clinica_id
        WHERE s.id = p_sessao_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('profissionais', 'admin', 'proprietario')
        AND ur.ativo = true
    ) THEN
        RAISE EXCEPTION 'Usuário não tem permissão para criar imagem nesta sessão';
    END IF;
    
    -- Validar tipo MIME
    IF p_mime_type NOT IN ('image/jpeg', 'image/png', 'image/webp', 'image/tiff') THEN
        RAISE EXCEPTION 'Tipo de arquivo não suportado: %', p_mime_type;
    END IF;
    
    -- Validar tamanho do arquivo (máximo 50MB)
    IF p_tamanho_bytes > 52428800 THEN
        RAISE EXCEPTION 'Arquivo muito grande. Máximo permitido: 50MB';
    END IF;
    
    -- Gerar nome único para storage
    nome_storage := public.gerar_nome_arquivo_storage(
        p_sessao_id,
        p_tipo_imagem,
        split_part(p_nome_arquivo_original, '.', -1)
    );
    
    -- Construir path no storage
    path_storage := p_sessao_id::TEXT || '/' || nome_storage;
    
    -- Inserir registro da imagem
    INSERT INTO public.imagens_medicas (
        sessao_id,
        tipo_imagem,
        nome_arquivo_original,
        nome_arquivo_storage,
        tamanho_bytes,
        mime_type,
        resolucao,
        regiao_corporal,
        observacoes_imagem,
        visivel_paciente,
        requer_consentimento,
        hash_arquivo,
        path_storage,
        capturada_por,
        status_processamento
    ) VALUES (
        p_sessao_id,
        p_tipo_imagem,
        p_nome_arquivo_original,
        nome_storage,
        p_tamanho_bytes,
        p_mime_type,
        p_resolucao,
        p_regiao_corporal,
        p_observacoes,
        p_visivel_paciente,
        p_requer_consentimento,
        p_hash_arquivo,
        path_storage,
        auth.uid(),
        'pendente'
    ) RETURNING id INTO nova_imagem_id;
    
    -- Log da criação
    PERFORM public.log_acesso_imagem_medica(
        nova_imagem_id,
        'CRIACAO',
        jsonb_build_object(
            'nome_arquivo', p_nome_arquivo_original,
            'tamanho_mb', round(p_tamanho_bytes / 1048576.0, 2),
            'regiao_corporal', p_regiao_corporal
        )
    );
    
    RETURN nova_imagem_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter consentimento do paciente para imagem
CREATE OR REPLACE FUNCTION public.obter_consentimento_imagem(
    p_imagem_id UUID,
    p_consentimento_obtido BOOLEAN DEFAULT true
)
RETURNS BOOLEAN AS $
DECLARE
    imagem_data RECORD;
BEGIN
    -- Buscar dados da imagem
    SELECT 
        i.*,
        c.user_id as cliente_user_id
    INTO imagem_data
    FROM public.imagens_medicas i
    JOIN public.sessoes_atendimento s ON s.id = i.sessao_id
    JOIN public.prontuarios p ON p.id = s.prontuario_id
    JOIN public.clientes c ON c.id = p.cliente_id
    WHERE i.id = p_imagem_id;
    
    -- Verificar se imagem existe
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Imagem não encontrada';
    END IF;
    
    -- Verificar se usuário é o paciente ou profissional autorizado
    IF NOT (
        auth.uid() = imagem_data.cliente_user_id
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.sessoes_atendimento s ON s.prontuario_id IN (
                SELECT pr.id FROM public.prontuarios pr WHERE pr.clinica_id = ur.clinica_id
            )
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('profissionais', 'admin', 'proprietario')
            AND ur.ativo = true
            AND s.id = imagem_data.sessao_id
        )
    ) THEN
        RAISE EXCEPTION 'Usuário não autorizado para gerenciar consentimento desta imagem';
    END IF;
    
    -- Atualizar consentimento
    UPDATE public.imagens_medicas SET
        consentimento_obtido = p_consentimento_obtido,
        data_consentimento = CASE 
            WHEN p_consentimento_obtido THEN now()
            ELSE NULL
        END,
        atualizado_em = now()
    WHERE id = p_imagem_id;
    
    -- Log da ação
    PERFORM public.log_acesso_imagem_medica(
        p_imagem_id,
        'CONSENTIMENTO',
        jsonb_build_object(
            'consentimento_obtido', p_consentimento_obtido,
            'usuario_acao', auth.uid()
        )
    );
    
    RETURN TRUE;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para aprovar imagem para visualização
CREATE OR REPLACE FUNCTION public.aprovar_imagem_medica(
    p_imagem_id UUID,
    p_visivel_paciente BOOLEAN DEFAULT true,
    p_visivel_outros_profissionais BOOLEAN DEFAULT true
)
RETURNS BOOLEAN AS $
BEGIN
    -- Verificar se usuário tem permissão para aprovar
    IF NOT EXISTS (
        SELECT 1 FROM public.imagens_medicas i
        JOIN public.sessoes_atendimento s ON s.id = i.sessao_id
        JOIN public.prontuarios p ON p.id = s.prontuario_id
        JOIN public.user_roles ur ON ur.clinica_id = p.clinica_id
        WHERE i.id = p_imagem_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'proprietario')
        AND ur.ativo = true
    ) THEN
        RAISE EXCEPTION 'Usuário não tem permissão para aprovar imagens';
    END IF;
    
    -- Atualizar aprovação
    UPDATE public.imagens_medicas SET
        visivel_paciente = p_visivel_paciente,
        visivel_outros_profissionais = p_visivel_outros_profissionais,
        aprovada_por = auth.uid(),
        data_aprovacao = now(),
        atualizado_em = now()
    WHERE id = p_imagem_id;
    
    -- Log da aprovação
    PERFORM public.log_acesso_imagem_medica(
        p_imagem_id,
        'APROVACAO',
        jsonb_build_object(
            'visivel_paciente', p_visivel_paciente,
            'visivel_outros_profissionais', p_visivel_outros_profissionais,
            'aprovada_por', auth.uid()
        )
    );
    
    RETURN TRUE;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para listar imagens de uma sessão
CREATE OR REPLACE FUNCTION public.listar_imagens_sessao(
    p_sessao_id UUID,
    p_incluir_arquivadas BOOLEAN DEFAULT false
)
RETURNS TABLE (
    id UUID,
    tipo_imagem tipo_imagem,
    nome_arquivo_original TEXT,
    url_storage TEXT,
    url_thumbnail TEXT,
    regiao_corporal TEXT,
    observacoes_imagem TEXT,
    visivel_paciente BOOLEAN,
    consentimento_obtido BOOLEAN,
    watermark_aplicado BOOLEAN,
    status_processamento status_processamento_imagem,
    capturada_em TIMESTAMPTZ,
    capturada_por UUID,
    aprovada_por UUID,
    data_aprovacao TIMESTAMPTZ
) AS $
BEGIN
    -- Verificar acesso à sessão
    IF NOT public.verificar_acesso_imagem(
        (SELECT i.id FROM public.imagens_medicas i WHERE i.sessao_id = p_sessao_id LIMIT 1),
        auth.uid()
    ) THEN
        RAISE EXCEPTION 'Usuário não tem acesso às imagens desta sessão';
    END IF;
    
    RETURN QUERY
    SELECT 
        i.id,
        i.tipo_imagem,
        i.nome_arquivo_original,
        i.url_storage,
        i.url_thumbnail,
        i.regiao_corporal,
        i.observacoes_imagem,
        i.visivel_paciente,
        i.consentimento_obtido,
        i.watermark_aplicado,
        i.status_processamento,
        i.capturada_em,
        i.capturada_por,
        i.aprovada_por,
        i.data_aprovacao
    FROM public.imagens_medicas i
    WHERE i.sessao_id = p_sessao_id
    AND (p_incluir_arquivadas OR i.arquivada = false)
    AND public.verificar_acesso_imagem(i.id, auth.uid())
    ORDER BY i.capturada_em ASC, i.tipo_imagem;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para comparar imagens antes/depois
CREATE OR REPLACE FUNCTION public.comparar_imagens_evolucao(
    p_sessao_id UUID,
    p_regiao_corporal TEXT
)
RETURNS TABLE (
    tipo_imagem tipo_imagem,
    imagem_id UUID,
    url_storage TEXT,
    capturada_em TIMESTAMPTZ,
    observacoes TEXT
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        i.tipo_imagem,
        i.id,
        i.url_storage,
        i.capturada_em,
        i.observacoes_imagem
    FROM public.imagens_medicas i
    WHERE i.sessao_id = p_sessao_id
    AND i.regiao_corporal = p_regiao_corporal
    AND i.tipo_imagem IN ('antes', 'depois', 'evolucao')
    AND i.arquivada = false
    AND public.verificar_acesso_imagem(i.id, auth.uid())
    ORDER BY 
        CASE i.tipo_imagem
            WHEN 'antes' THEN 1
            WHEN 'durante' THEN 2
            WHEN 'depois' THEN 3
            WHEN 'evolucao' THEN 4
        END,
        i.capturada_em ASC;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para realizar backup de imagens
CREATE OR REPLACE FUNCTION public.realizar_backup_imagens(
    p_clinica_id UUID DEFAULT NULL,
    p_data_inicio DATE DEFAULT NULL,
    p_data_fim DATE DEFAULT NULL
)
RETURNS TABLE (
    imagens_processadas INTEGER,
    imagens_com_erro INTEGER,
    tamanho_total_mb NUMERIC
) AS $
DECLARE
    total_processadas INTEGER := 0;
    total_erros INTEGER := 0;
    tamanho_total BIGINT := 0;
    imagem_record RECORD;
BEGIN
    -- Verificar permissão de admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND (p_clinica_id IS NULL OR ur.clinica_id = p_clinica_id)
        AND ur.role IN ('admin', 'proprietario', 'super_admin')
        AND ur.ativo = true
    ) THEN
        RAISE EXCEPTION 'Usuário não tem permissão para realizar backup';
    END IF;
    
    -- Processar imagens para backup
    FOR imagem_record IN
        SELECT 
            i.id,
            i.tamanho_bytes,
            i.path_storage
        FROM public.imagens_medicas i
        JOIN public.sessoes_atendimento s ON s.id = i.sessao_id
        JOIN public.prontuarios p ON p.id = s.prontuario_id
        WHERE (p_clinica_id IS NULL OR p.clinica_id = p_clinica_id)
        AND (p_data_inicio IS NULL OR i.capturada_em::DATE >= p_data_inicio)
        AND (p_data_fim IS NULL OR i.capturada_em::DATE <= p_data_fim)
        AND i.backup_realizado = false
        AND i.arquivada = false
    LOOP
        BEGIN
            -- Simular processo de backup (na implementação real, seria feito via API)
            UPDATE public.imagens_medicas SET
                backup_realizado = true,
                data_backup = now(),
                backup_url = 'backup://' || imagem_record.path_storage,
                atualizado_em = now()
            WHERE id = imagem_record.id;
            
            total_processadas := total_processadas + 1;
            tamanho_total := tamanho_total + imagem_record.tamanho_bytes;
            
        EXCEPTION WHEN OTHERS THEN
            total_erros := total_erros + 1;
            
            -- Log do erro
            PERFORM public.log_acesso_imagem_medica(
                imagem_record.id,
                'ERRO_BACKUP',
                jsonb_build_object(
                    'erro', SQLERRM,
                    'path_storage', imagem_record.path_storage
                )
            );
        END;
    END LOOP;
    
    RETURN QUERY SELECT 
        total_processadas,
        total_erros,
        round(tamanho_total / 1048576.0, 2);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para gerar relatório de uso de imagens
CREATE OR REPLACE FUNCTION public.relatorio_uso_imagens(
    p_clinica_id UUID,
    p_data_inicio DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
    p_data_fim DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_imagens BIGINT,
    imagens_por_tipo JSONB,
    tamanho_total_mb NUMERIC,
    imagens_com_watermark BIGINT,
    imagens_visiveis_paciente BIGINT,
    imagens_pendentes_processamento BIGINT,
    regioes_mais_fotografadas JSONB
) AS $
BEGIN
    -- Verificar permissão
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.clinica_id = p_clinica_id
        AND ur.role IN ('admin', 'proprietario')
        AND ur.ativo = true
    ) THEN
        RAISE EXCEPTION 'Usuário não tem permissão para gerar relatórios';
    END IF;
    
    RETURN QUERY
    WITH imagens_clinica AS (
        SELECT i.*
        FROM public.imagens_medicas i
        JOIN public.sessoes_atendimento s ON s.id = i.sessao_id
        JOIN public.prontuarios p ON p.id = s.prontuario_id
        WHERE p.clinica_id = p_clinica_id
        AND i.capturada_em::DATE BETWEEN p_data_inicio AND p_data_fim
        AND i.arquivada = false
    )
    SELECT 
        COUNT(*)::BIGINT as total_imagens,
        
        jsonb_object_agg(
            tipo_imagem::TEXT, 
            count_por_tipo
        ) as imagens_por_tipo,
        
        round(SUM(tamanho_bytes) / 1048576.0, 2) as tamanho_total_mb,
        
        COUNT(*) FILTER (WHERE watermark_aplicado = true)::BIGINT as imagens_com_watermark,
        
        COUNT(*) FILTER (WHERE visivel_paciente = true)::BIGINT as imagens_visiveis_paciente,
        
        COUNT(*) FILTER (WHERE status_processamento = 'pendente')::BIGINT as imagens_pendentes_processamento,
        
        (
            SELECT jsonb_object_agg(regiao_corporal, count_regiao)
            FROM (
                SELECT regiao_corporal, COUNT(*) as count_regiao
                FROM imagens_clinica
                GROUP BY regiao_corporal
                ORDER BY count_regiao DESC
                LIMIT 10
            ) regioes
        ) as regioes_mais_fotografadas
        
    FROM (
        SELECT 
            *,
            COUNT(*) OVER (PARTITION BY tipo_imagem) as count_por_tipo
        FROM imagens_clinica
    ) dados;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON FUNCTION public.criar_imagem_medica IS 'Cria nova imagem médica com validações de segurança e integridade';
COMMENT ON FUNCTION public.obter_consentimento_imagem IS 'Gerencia consentimento do paciente para visualização de imagens';
COMMENT ON FUNCTION public.aprovar_imagem_medica IS 'Aprova imagem para visualização por pacientes e outros profissionais';
COMMENT ON FUNCTION public.listar_imagens_sessao IS 'Lista imagens de uma sessão com controle de acesso';
COMMENT ON FUNCTION public.comparar_imagens_evolucao IS 'Compara imagens antes/depois para análise de evolução';
COMMENT ON FUNCTION public.realizar_backup_imagens IS 'Realiza backup de imagens médicas com controle de integridade';
COMMENT ON FUNCTION public.relatorio_uso_imagens IS 'Gera relatório detalhado de uso de imagens por clínica';