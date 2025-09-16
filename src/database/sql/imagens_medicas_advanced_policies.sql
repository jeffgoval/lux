-- Advanced RLS Policies: Imagens Médicas - Controle de Acesso Avançado
-- Description: Políticas avançadas de segurança com controle granular e auditoria
-- Requirements: 6.3, 9.2

-- Política para controle de download baseado em consentimento
CREATE POLICY "Download controlado por consentimento"
ON public.imagens_medicas
FOR SELECT
TO authenticated
USING (
    -- Verificar se é uma requisição de download (baseado em contexto)
    CASE 
        WHEN current_setting('request.headers', true)::JSONB->>'x-download-request' = 'true' THEN
            -- Para download, verificar consentimento e permissões específicas
            (
                -- Paciente pode baixar suas próprias imagens se visível e consentimento obtido
                EXISTS (
                    SELECT 1 
                    FROM public.sessoes_atendimento s
                    JOIN public.prontuarios p ON p.id = s.prontuario_id
                    JOIN public.clientes c ON c.id = p.cliente_id
                    WHERE s.id = sessao_id
                    AND c.user_id = auth.uid()
                    AND visivel_paciente = true
                    AND consentimento_obtido = true
                )
                OR
                -- Profissionais podem baixar se têm permissão na clínica
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
            )
        ELSE
            -- Para visualização normal, usar política padrão
            public.verificar_acesso_imagem(id, auth.uid())
    END
);

-- Política para controle de acesso baseado em horário
CREATE POLICY "Acesso restrito por horário"
ON public.imagens_medicas
FOR SELECT
TO authenticated
USING (
    -- Verificar se está dentro do horário permitido (8h às 22h)
    EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Sao_Paulo') BETWEEN 8 AND 22
    OR
    -- Ou se é admin/proprietário (acesso 24h)
    EXISTS (
        SELECT 1 
        FROM public.sessoes_atendimento s
        JOIN public.prontuarios p ON p.id = s.prontuario_id
        JOIN public.user_roles ur ON ur.clinica_id = p.clinica_id
        WHERE s.id = sessao_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'proprietario', 'super_admin')
        AND ur.ativo = true
    )
    OR
    -- Ou se é emergência médica (baseado em contexto)
    current_setting('request.headers', true)::JSONB->>'x-emergency-access' = 'true'
);

-- Política para controle de acesso baseado em localização (IP)
CREATE POLICY "Controle de acesso por localização"
ON public.imagens_medicas
FOR SELECT
TO authenticated
USING (
    -- Permitir acesso apenas de IPs conhecidos/seguros
    -- (Esta política seria configurada com IPs específicos da clínica)
    inet_client_addr() IS NULL -- Conexões locais sempre permitidas
    OR
    -- IPs da clínica (exemplo - seria configurado dinamicamente)
    inet_client_addr() << inet '192.168.1.0/24'
    OR
    -- Ou se usuário tem permissão de acesso remoto
    EXISTS (
        SELECT 1 
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'proprietario', 'super_admin')
        AND ur.ativo = true
        AND ur.permite_acesso_remoto = true
    )
);

-- Política para controle de acesso baseado em dispositivo
CREATE POLICY "Controle de acesso por dispositivo"
ON public.imagens_medicas
FOR SELECT
TO authenticated
USING (
    -- Verificar se dispositivo está registrado/autorizado
    EXISTS (
        SELECT 1 
        FROM public.dispositivos_autorizados da
        WHERE da.user_id = auth.uid()
        AND da.device_fingerprint = current_setting('request.headers', true)::JSONB->>'x-device-fingerprint'
        AND da.ativo = true
        AND da.data_expiracao > now()
    )
    OR
    -- Ou se é primeiro acesso e usuário tem permissão para registrar dispositivo
    (
        current_setting('request.headers', true)::JSONB->>'x-first-device-access' = 'true'
        AND
        EXISTS (
            SELECT 1 
            FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.ativo = true
        )
    )
);

-- Política para controle de acesso baseado em sessão ativa
CREATE POLICY "Controle de sessão ativa"
ON public.imagens_medicas
FOR SELECT
TO authenticated
USING (
    -- Verificar se usuário tem sessão ativa válida
    EXISTS (
        SELECT 1 
        FROM public.sessoes_usuario su
        WHERE su.user_id = auth.uid()
        AND su.ativo = true
        AND su.data_expiracao > now()
        AND su.ip_address = inet_client_addr()::TEXT
    )
    OR
    -- Ou se é super admin (bypass)
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role = 'super_admin'
        AND ur.ativo = true
    )
);

-- Política para controle de acesso baseado em tentativas de login
CREATE POLICY "Controle por tentativas de acesso"
ON public.imagens_medicas
FOR SELECT
TO authenticated
USING (
    -- Verificar se usuário não excedeu tentativas de acesso
    NOT EXISTS (
        SELECT 1 
        FROM public.tentativas_acesso ta
        WHERE ta.user_id = auth.uid()
        AND ta.ip_address = inet_client_addr()::TEXT
        AND ta.bloqueado_ate > now()
    )
);

-- Função para registrar tentativa de acesso
CREATE OR REPLACE FUNCTION public.registrar_tentativa_acesso(
    p_sucesso BOOLEAN DEFAULT true,
    p_motivo_falha TEXT DEFAULT NULL
)
RETURNS VOID AS $
DECLARE
    tentativas_recentes INTEGER;
BEGIN
    -- Contar tentativas recentes (última hora)
    SELECT COUNT(*) INTO tentativas_recentes
    FROM public.tentativas_acesso
    WHERE user_id = auth.uid()
    AND ip_address = inet_client_addr()::TEXT
    AND criado_em > (now() - INTERVAL '1 hour')
    AND sucesso = false;
    
    -- Inserir registro da tentativa
    INSERT INTO public.tentativas_acesso (
        user_id,
        ip_address,
        user_agent,
        sucesso,
        motivo_falha,
        tentativas_anteriores
    ) VALUES (
        auth.uid(),
        inet_client_addr()::TEXT,
        current_setting('request.headers', true)::JSONB->>'user-agent',
        p_sucesso,
        p_motivo_falha,
        tentativas_recentes
    );
    
    -- Se muitas tentativas falharam, bloquear temporariamente
    IF NOT p_sucesso AND tentativas_recentes >= 4 THEN
        UPDATE public.tentativas_acesso 
        SET bloqueado_ate = now() + INTERVAL '30 minutes'
        WHERE user_id = auth.uid()
        AND ip_address = inet_client_addr()::TEXT
        AND criado_em > (now() - INTERVAL '1 hour');
    END IF;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar e aplicar políticas de acesso avançadas
CREATE OR REPLACE FUNCTION public.verificar_politicas_avancadas_imagem(
    p_imagem_id UUID
)
RETURNS JSONB AS $
DECLARE
    resultado JSONB := '{}';
    horario_atual INTEGER;
    ip_cliente INET;
    device_fingerprint TEXT;
    sessao_ativa BOOLEAN := false;
    tentativas_bloqueadas BOOLEAN := false;
BEGIN
    -- Verificar horário
    horario_atual := EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Sao_Paulo');
    resultado := resultado || jsonb_build_object(
        'horario_permitido', horario_atual BETWEEN 8 AND 22
    );
    
    -- Verificar IP
    ip_cliente := inet_client_addr();
    resultado := resultado || jsonb_build_object(
        'ip_cliente', ip_cliente::TEXT,
        'ip_local', ip_cliente IS NULL,
        'ip_rede_clinica', ip_cliente << inet '192.168.1.0/24'
    );
    
    -- Verificar dispositivo
    device_fingerprint := current_setting('request.headers', true)::JSONB->>'x-device-fingerprint';
    resultado := resultado || jsonb_build_object(
        'device_fingerprint', device_fingerprint,
        'dispositivo_autorizado', EXISTS (
            SELECT 1 FROM public.dispositivos_autorizados
            WHERE user_id = auth.uid()
            AND device_fingerprint = device_fingerprint
            AND ativo = true
            AND data_expiracao > now()
        )
    );
    
    -- Verificar sessão ativa
    SELECT EXISTS (
        SELECT 1 FROM public.sessoes_usuario
        WHERE user_id = auth.uid()
        AND ativo = true
        AND data_expiracao > now()
        AND ip_address = ip_cliente::TEXT
    ) INTO sessao_ativa;
    
    resultado := resultado || jsonb_build_object('sessao_ativa', sessao_ativa);
    
    -- Verificar tentativas bloqueadas
    SELECT EXISTS (
        SELECT 1 FROM public.tentativas_acesso
        WHERE user_id = auth.uid()
        AND ip_address = ip_cliente::TEXT
        AND bloqueado_ate > now()
    ) INTO tentativas_bloqueadas;
    
    resultado := resultado || jsonb_build_object('tentativas_bloqueadas', tentativas_bloqueadas);
    
    RETURN resultado;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tabela para dispositivos autorizados
CREATE TABLE IF NOT EXISTS public.dispositivos_autorizados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    device_fingerprint TEXT NOT NULL,
    device_name TEXT,
    device_type TEXT, -- 'desktop', 'mobile', 'tablet'
    browser_info JSONB,
    ip_address TEXT,
    ativo BOOLEAN DEFAULT true,
    data_registro TIMESTAMPTZ DEFAULT now(),
    data_expiracao TIMESTAMPTZ DEFAULT (now() + INTERVAL '90 days'),
    ultimo_acesso TIMESTAMPTZ,
    criado_em TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, device_fingerprint)
);

-- Tabela para sessões de usuário
CREATE TABLE IF NOT EXISTS public.sessoes_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    session_token TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    ativo BOOLEAN DEFAULT true,
    data_inicio TIMESTAMPTZ DEFAULT now(),
    data_expiracao TIMESTAMPTZ DEFAULT (now() + INTERVAL '8 hours'),
    ultimo_acesso TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(session_token)
);

-- Tabela para tentativas de acesso
CREATE TABLE IF NOT EXISTS public.tentativas_acesso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    sucesso BOOLEAN NOT NULL,
    motivo_falha TEXT,
    tentativas_anteriores INTEGER DEFAULT 0,
    bloqueado_ate TIMESTAMPTZ,
    criado_em TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_dispositivos_user_fingerprint ON public.dispositivos_autorizados(user_id, device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_dispositivos_ativo ON public.dispositivos_autorizados(ativo, data_expiracao);
CREATE INDEX IF NOT EXISTS idx_sessoes_user_ativo ON public.sessoes_usuario(user_id, ativo);
CREATE INDEX IF NOT EXISTS idx_sessoes_token ON public.sessoes_usuario(session_token);
CREATE INDEX IF NOT EXISTS idx_tentativas_user_ip ON public.tentativas_acesso(user_id, ip_address);
CREATE INDEX IF NOT EXISTS idx_tentativas_bloqueio ON public.tentativas_acesso(bloqueado_ate) WHERE bloqueado_ate IS NOT NULL;

-- RLS para tabelas de controle
ALTER TABLE public.dispositivos_autorizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tentativas_acesso ENABLE ROW LEVEL SECURITY;

-- Políticas para dispositivos autorizados
CREATE POLICY "Usuários veem seus próprios dispositivos"
ON public.dispositivos_autorizados
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Políticas para sessões de usuário
CREATE POLICY "Usuários veem suas próprias sessões"
ON public.sessoes_usuario
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Políticas para tentativas de acesso
CREATE POLICY "Usuários veem suas próprias tentativas"
ON public.tentativas_acesso
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Política para admins verem tentativas de acesso
CREATE POLICY "Admins veem todas as tentativas"
ON public.tentativas_acesso
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'proprietario', 'super_admin')
        AND ur.ativo = true
    )
);

-- Função para limpar dados antigos
CREATE OR REPLACE FUNCTION public.limpar_dados_acesso_antigos()
RETURNS INTEGER AS $
DECLARE
    registros_removidos INTEGER := 0;
BEGIN
    -- Remover dispositivos expirados há mais de 30 dias
    DELETE FROM public.dispositivos_autorizados
    WHERE data_expiracao < (now() - INTERVAL '30 days');
    
    GET DIAGNOSTICS registros_removidos = ROW_COUNT;
    
    -- Remover sessões expiradas há mais de 7 dias
    DELETE FROM public.sessoes_usuario
    WHERE data_expiracao < (now() - INTERVAL '7 days');
    
    GET DIAGNOSTICS registros_removidos = registros_removidos + ROW_COUNT;
    
    -- Remover tentativas de acesso antigas (mais de 30 dias)
    DELETE FROM public.tentativas_acesso
    WHERE criado_em < (now() - INTERVAL '30 days');
    
    GET DIAGNOSTICS registros_removidos = registros_removidos + ROW_COUNT;
    
    RETURN registros_removidos;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON POLICY "Download controlado por consentimento" ON public.imagens_medicas IS 'Controla downloads baseado em consentimento e permissões específicas';
COMMENT ON POLICY "Acesso restrito por horário" ON public.imagens_medicas IS 'Restringe acesso a horário comercial exceto para admins';
COMMENT ON POLICY "Controle de acesso por localização" ON public.imagens_medicas IS 'Controla acesso baseado no IP de origem';
COMMENT ON POLICY "Controle de acesso por dispositivo" ON public.imagens_medicas IS 'Verifica se dispositivo está autorizado';
COMMENT ON POLICY "Controle de sessão ativa" ON public.imagens_medicas IS 'Verifica se usuário tem sessão ativa válida';
COMMENT ON POLICY "Controle por tentativas de acesso" ON public.imagens_medicas IS 'Bloqueia usuários com muitas tentativas falhadas';

COMMENT ON TABLE public.dispositivos_autorizados IS 'Dispositivos autorizados para acesso a imagens médicas';
COMMENT ON TABLE public.sessoes_usuario IS 'Sessões ativas de usuários para controle de acesso';
COMMENT ON TABLE public.tentativas_acesso IS 'Log de tentativas de acesso para detecção de ataques';

COMMENT ON FUNCTION public.verificar_politicas_avancadas_imagem(UUID) IS 'Verifica todas as políticas avançadas de acesso para uma imagem';
COMMENT ON FUNCTION public.limpar_dados_acesso_antigos() IS 'Remove dados antigos de controle de acesso para manutenção';