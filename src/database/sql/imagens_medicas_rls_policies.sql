-- RLS Policies: Imagens Médicas
-- Description: Políticas de segurança para controle de acesso granular a imagens médicas
-- Requirements: 6.3, 9.2

-- Habilitar RLS na tabela
ALTER TABLE public.imagens_medicas ENABLE ROW LEVEL SECURITY;

-- Política para SELECT - Visualização de imagens
CREATE POLICY "Visualizar imagens médicas com controle de acesso"
ON public.imagens_medicas
FOR SELECT
TO authenticated
USING (
    -- Verificar acesso usando função específica
    public.verificar_acesso_imagem(id, auth.uid())
    AND
    -- Garantir isolamento por clínica através da sessão
    EXISTS (
        SELECT 1 
        FROM public.sessoes_atendimento s
        JOIN public.prontuarios p ON p.id = s.prontuario_id
        JOIN public.user_roles ur ON ur.clinica_id = p.clinica_id
        WHERE s.id = sessao_id
        AND ur.user_id = auth.uid()
        AND ur.ativo = true
    )
);

-- Política para INSERT - Criação de imagens
CREATE POLICY "Criar imagens médicas"
ON public.imagens_medicas
FOR INSERT
TO authenticated
WITH CHECK (
    -- Usuário deve ter permissão na clínica da sessão
    EXISTS (
        SELECT 1 
        FROM public.sessoes_atendimento s
        JOIN public.prontuarios p ON p.id = s.prontuario_id
        JOIN public.user_roles ur ON ur.clinica_id = p.clinica_id
        WHERE s.id = sessao_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('profissionais', 'admin', 'proprietario')
        AND ur.ativo = true
    )
    AND
    -- Verificar se usuário pode criar imagens (permissão específica)
    EXISTS (
        SELECT 1 
        FROM public.sessoes_atendimento s
        JOIN public.prontuarios p ON p.id = s.prontuario_id
        JOIN public.clinica_profissionais cp ON cp.clinica_id = p.clinica_id
        WHERE s.id = sessao_id
        AND cp.user_id = auth.uid()
        AND cp.pode_criar_prontuarios = true
        AND cp.ativo = true
    )
    AND
    -- Definir usuário como capturador da imagem
    capturada_por = auth.uid()
);

-- Política para UPDATE - Atualização de imagens
CREATE POLICY "Atualizar imagens médicas"
ON public.imagens_medicas
FOR UPDATE
TO authenticated
USING (
    -- Verificar acesso básico
    public.verificar_acesso_imagem(id, auth.uid())
    AND
    -- Permitir atualização apenas para:
    (
        -- 1. Profissional que capturou a imagem
        capturada_por = auth.uid()
        OR
        -- 2. Admin/Proprietário da clínica
        EXISTS (
            SELECT 1 
            FROM public.sessoes_atendimento s
            JOIN public.prontuarios p ON p.id = s.prontuario_id
            JOIN public.user_roles ur ON ur.clinica_id = p.clinica_id
            WHERE s.id = sessao_id
            AND ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'proprietario')
            AND ur.ativo = true
        )
    )
)
WITH CHECK (
    -- Mesmas condições do USING
    public.verificar_acesso_imagem(id, auth.uid())
    AND
    (
        capturada_por = auth.uid()
        OR
        EXISTS (
            SELECT 1 
            FROM public.sessoes_atendimento s
            JOIN public.prontuarios p ON p.id = s.prontuario_id
            JOIN public.user_roles ur ON ur.clinica_id = p.clinica_id
            WHERE s.id = sessao_id
            AND ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'proprietario')
            AND ur.ativo = true
        )
    )
);

-- Política para DELETE - Exclusão de imagens (restrita)
CREATE POLICY "Excluir imagens médicas"
ON public.imagens_medicas
FOR DELETE
TO authenticated
USING (
    -- Apenas admin/proprietário pode excluir
    EXISTS (
        SELECT 1 
        FROM public.sessoes_atendimento s
        JOIN public.prontuarios p ON p.id = s.prontuario_id
        JOIN public.user_roles ur ON ur.clinica_id = p.clinica_id
        WHERE s.id = sessao_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'proprietario')
        AND ur.ativo = true
    )
    AND
    -- Não permitir exclusão de imagens com mais de 30 dias (auditoria)
    capturada_em > (now() - INTERVAL '30 days')
);

-- Política específica para pacientes visualizarem suas próprias imagens
CREATE POLICY "Pacientes visualizam suas imagens"
ON public.imagens_medicas
FOR SELECT
TO authenticated
USING (
    -- Verificar se é o próprio paciente
    EXISTS (
        SELECT 1 
        FROM public.sessoes_atendimento s
        JOIN public.prontuarios p ON p.id = s.prontuario_id
        JOIN public.clientes c ON c.id = p.cliente_id
        WHERE s.id = sessao_id
        AND c.user_id = auth.uid()
    )
    AND
    -- Imagem deve estar visível para paciente
    visivel_paciente = true
    AND
    -- Consentimento deve ter sido obtido
    consentimento_obtido = true
    AND
    -- Imagem deve estar processada (com watermark)
    status_processamento = 'concluido'
    AND
    -- Não deve estar arquivada
    arquivada = false
);

-- Política para super admin (bypass para manutenção)
CREATE POLICY "Super admin acesso total"
ON public.imagens_medicas
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'super_admin'
        AND ur.ativo = true
    )
);

-- Função para auditoria de acesso a imagens
CREATE OR REPLACE FUNCTION public.log_acesso_imagem_medica(
    p_imagem_id UUID,
    p_acao TEXT,
    p_contexto JSONB DEFAULT '{}'
)
RETURNS VOID AS $
DECLARE
    imagem_info RECORD;
BEGIN
    -- Buscar informações da imagem
    SELECT 
        i.tipo_imagem,
        i.regiao_corporal,
        i.visivel_paciente,
        s.id as sessao_id,
        p.clinica_id,
        c.nome as cliente_nome
    INTO imagem_info
    FROM public.imagens_medicas i
    JOIN public.sessoes_atendimento s ON s.id = i.sessao_id
    JOIN public.prontuarios pr ON pr.id = s.prontuario_id
    JOIN public.clientes c ON c.id = pr.cliente_id
    WHERE i.id = p_imagem_id;
    
    -- Registrar na auditoria médica
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
        p_acao,
        p_imagem_id,
        NULL,
        jsonb_build_object(
            'imagem_id', p_imagem_id,
            'tipo_imagem', imagem_info.tipo_imagem,
            'regiao_corporal', imagem_info.regiao_corporal,
            'visivel_paciente', imagem_info.visivel_paciente,
            'sessao_id', imagem_info.sessao_id,
            'clinica_id', imagem_info.clinica_id,
            'cliente_nome', imagem_info.cliente_nome
        ),
        auth.uid(),
        inet_client_addr()::TEXT,
        current_setting('request.headers', true)::JSONB->>'user-agent',
        p_contexto || jsonb_build_object(
            'timestamp', now(),
            'acao_detalhada', p_acao
        )
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para log automático de acessos
CREATE OR REPLACE FUNCTION public.trigger_log_acesso_imagem_automatico()
RETURNS TRIGGER AS $
BEGIN
    -- Log para SELECT (visualização)
    IF TG_OP = 'SELECT' THEN
        PERFORM public.log_acesso_imagem_medica(
            NEW.id,
            'VISUALIZACAO',
            jsonb_build_object(
                'metodo', 'select_automatico',
                'tabela', 'imagens_medicas'
            )
        );
        RETURN NEW;
    END IF;
    
    -- Log para INSERT (criação)
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_acesso_imagem_medica(
            NEW.id,
            'CRIACAO',
            jsonb_build_object(
                'nome_arquivo', NEW.nome_arquivo_original,
                'tipo_imagem', NEW.tipo_imagem,
                'tamanho_bytes', NEW.tamanho_bytes
            )
        );
        RETURN NEW;
    END IF;
    
    -- Log para UPDATE (modificação)
    IF TG_OP = 'UPDATE' THEN
        PERFORM public.log_acesso_imagem_medica(
            NEW.id,
            'MODIFICACAO',
            jsonb_build_object(
                'campos_alterados', (
                    SELECT jsonb_object_agg(key, value)
                    FROM jsonb_each(to_jsonb(NEW))
                    WHERE key NOT IN ('atualizado_em', 'versao_processamento')
                    AND to_jsonb(NEW)->>key != to_jsonb(OLD)->>key
                )
            )
        );
        RETURN NEW;
    END IF;
    
    -- Log para DELETE (exclusão)
    IF TG_OP = 'DELETE' THEN
        PERFORM public.log_acesso_imagem_medica(
            OLD.id,
            'EXCLUSAO',
            jsonb_build_object(
                'nome_arquivo', OLD.nome_arquivo_original,
                'motivo', 'exclusao_registro'
            )
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger de auditoria
DROP TRIGGER IF EXISTS trigger_auditoria_imagens_medicas ON public.imagens_medicas;
CREATE TRIGGER trigger_auditoria_imagens_medicas
    AFTER INSERT OR UPDATE OR DELETE ON public.imagens_medicas
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_log_acesso_imagem_automatico();

-- Função para verificar integridade das imagens
CREATE OR REPLACE FUNCTION public.verificar_integridade_imagens()
RETURNS TABLE (
    imagem_id UUID,
    problema TEXT,
    severidade TEXT,
    sugestao_correcao TEXT
) AS $
BEGIN
    RETURN QUERY
    -- Verificar imagens sem hash
    SELECT 
        i.id,
        'Hash de arquivo ausente'::TEXT,
        'CRITICO'::TEXT,
        'Recalcular hash do arquivo'::TEXT
    FROM public.imagens_medicas i
    WHERE i.hash_arquivo IS NULL OR i.hash_arquivo = ''
    
    UNION ALL
    
    -- Verificar imagens sem watermark há mais de 1 hora
    SELECT 
        i.id,
        'Watermark não aplicado'::TEXT,
        'ALTO'::TEXT,
        'Executar processamento de watermark'::TEXT
    FROM public.imagens_medicas i
    WHERE i.watermark_aplicado = false
    AND i.criado_em < (now() - INTERVAL '1 hour')
    
    UNION ALL
    
    -- Verificar imagens com muitas tentativas de processamento
    SELECT 
        i.id,
        'Falha no processamento'::TEXT,
        'MEDIO'::TEXT,
        'Verificar logs de erro e reprocessar manualmente'::TEXT
    FROM public.imagens_medicas i
    WHERE i.tentativas_processamento >= 3
    AND i.status_processamento = 'erro'
    
    UNION ALL
    
    -- Verificar imagens órfãs (sessão inexistente)
    SELECT 
        i.id,
        'Sessão de atendimento não encontrada'::TEXT,
        'CRITICO'::TEXT,
        'Verificar integridade referencial'::TEXT
    FROM public.imagens_medicas i
    LEFT JOIN public.sessoes_atendimento s ON s.id = i.sessao_id
    WHERE s.id IS NULL;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON POLICY "Visualizar imagens médicas com controle de acesso" ON public.imagens_medicas IS 'Controla visualização baseada em permissões e contexto clínico';
COMMENT ON POLICY "Pacientes visualizam suas imagens" ON public.imagens_medicas IS 'Permite que pacientes vejam suas próprias imagens quando autorizado';
COMMENT ON FUNCTION public.log_acesso_imagem_medica(UUID, TEXT, JSONB) IS 'Registra acessos a imagens médicas para auditoria';
COMMENT ON FUNCTION public.verificar_integridade_imagens() IS 'Verifica integridade e identifica problemas nas imagens médicas';