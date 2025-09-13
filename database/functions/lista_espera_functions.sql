-- =====================================================
-- FUNÇÕES DE LISTA DE ESPERA INTELIGENTE
-- Sistema avançado de gestão de lista de espera com priorização automática
-- =====================================================

-- =====================================================
-- FUNÇÃO PARA CALCULAR PONTUAÇÃO DE PRIORIDADE
-- =====================================================

CREATE OR REPLACE FUNCTION public.calcular_pontuacao_prioridade(
  p_cliente_id UUID,
  p_servico_id UUID,
  p_categoria_cliente cliente_categoria,
  p_prioridade prioridade_nivel,
  p_data_criacao TIMESTAMPTZ,
  p_flexibilidade_dias INTEGER,
  p_aceita_alternativas BOOLEAN
)
RETURNS INTEGER AS $$
DECLARE
  pontuacao INTEGER := 0;
  historico_cliente JSONB;
  valor_servico DECIMAL;
  tempo_espera_dias INTEGER;
  frequencia_cliente INTEGER;
  cancelamentos_cliente INTEGER;
BEGIN
  -- Pontuação base por categoria de cliente
  CASE p_categoria_cliente
    WHEN 'premium' THEN pontuacao := pontuacao + 1000;
    WHEN 'vip' THEN pontuacao := pontuacao + 800;
    WHEN 'corporativo' THEN pontuacao := pontuacao + 600;
    WHEN 'regular' THEN pontuacao := pontuacao + 400;
  END CASE;
  
  -- Pontuação por nível de prioridade
  CASE p_prioridade
    WHEN 'vip' THEN pontuacao := pontuacao + 500;
    WHEN 'urgente' THEN pontuacao := pontuacao + 400;
    WHEN 'alta' THEN pontuacao := pontuacao + 300;
    WHEN 'normal' THEN pontuacao := pontuacao + 200;
    WHEN 'baixa' THEN pontuacao := pontuacao + 100;
  END CASE;
  
  -- Pontuação por tempo de espera (mais tempo = mais pontos)
  tempo_espera_dias := EXTRACT(DAYS FROM NOW() - p_data_criacao)::INTEGER;
  pontuacao := pontuacao + (tempo_espera_dias * 10);
  
  -- Pontuação por valor do serviço
  SELECT s.preco_base INTO valor_servico
  FROM public.servicos s
  WHERE s.id = p_servico_id;
  
  pontuacao := pontuacao + (valor_servico / 10)::INTEGER;
  
  -- Pontuação por histórico do cliente
  SELECT 
    COUNT(*) FILTER (WHERE a.status = 'finalizado'),
    COUNT(*) FILTER (WHERE a.status = 'cancelado')
  INTO frequencia_cliente, cancelamentos_cliente
  FROM public.agendamentos a
  WHERE a.cliente_id = p_cliente_id
    AND a.criado_em >= NOW() - INTERVAL '1 year';
  
  -- Bônus por fidelidade
  pontuacao := pontuacao + (frequencia_cliente * 20);
  
  -- Penalidade por cancelamentos
  pontuacao := pontuacao - (cancelamentos_cliente * 50);
  
  -- Bônus por flexibilidade
  IF p_flexibilidade_dias >= 14 THEN
    pontuacao := pontuacao + 100;
  ELSIF p_flexibilidade_dias >= 7 THEN
    pontuacao := pontuacao + 50;
  END IF;
  
  IF p_aceita_alternativas THEN
    pontuacao := pontuacao + 75;
  END IF;
  
  -- Garantir pontuação mínima
  pontuacao := GREATEST(pontuacao, 100);
  
  RETURN pontuacao;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO PARA ATUALIZAR POSIÇÕES NA LISTA DE ESPERA
-- =====================================================

CREATE OR REPLACE FUNCTION public.atualizar_posicoes_lista_espera(
  p_servico_id UUID DEFAULT NULL,
  p_profissional_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  registro RECORD;
  posicao INTEGER := 1;
  total_atualizados INTEGER := 0;
BEGIN
  -- Atualizar pontuações primeiro
  UPDATE public.lista_espera
  SET 
    pontuacao_prioridade = public.calcular_pontuacao_prioridade(
      cliente_id,
      servico_id,
      categoria_cliente,
      prioridade,
      criado_em,
      flexibilidade_dias,
      aceita_horarios_alternativos
    ),
    atualizado_em = NOW()
  WHERE status = 'ativo'
    AND (p_servico_id IS NULL OR servico_id = p_servico_id)
    AND (p_profissional_id IS NULL OR profissional_preferido = p_profissional_id);
  
  -- Atualizar posições baseadas na pontuação
  FOR registro IN
    SELECT id
    FROM public.lista_espera
    WHERE status = 'ativo'
      AND (p_servico_id IS NULL OR servico_id = p_servico_id)
      AND (p_profissional_id IS NULL OR profissional_preferido = p_profissional_id)
    ORDER BY pontuacao_prioridade DESC, criado_em ASC
  LOOP
    UPDATE public.lista_espera
    SET posicao_estimada = posicao
    WHERE id = registro.id;
    
    posicao := posicao + 1;
    total_atualizados := total_atualizados + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'sucesso', true,
    'total_atualizados', total_atualizados,
    'atualizado_em', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO PARA ESTIMAR TEMPO DE ESPERA
-- =====================================================

CREATE OR REPLACE FUNCTION public.estimar_tempo_espera(
  p_lista_espera_id UUID
)
RETURNS INTERVAL AS $$
DECLARE
  registro_espera RECORD;
  agendamentos_futuros INTEGER;
  media_agendamentos_dia DECIMAL;
  dias_estimados INTEGER;
  tempo_estimado INTERVAL;
BEGIN
  -- Buscar dados da lista de espera
  SELECT 
    le.*,
    s.duracao_media_minutos,
    s.demanda_media_semanal
  INTO registro_espera
  FROM public.lista_espera le
  JOIN public.servicos s ON s.id = le.servico_id
  WHERE le.id = p_lista_espera_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Contar agendamentos futuros do mesmo serviço
  SELECT COUNT(*) INTO agendamentos_futuros
  FROM public.agendamentos a
  WHERE a.servico_id = registro_espera.servico_id
    AND a.status IN ('confirmado', 'pendente')
    AND a.data_agendamento >= NOW()
    AND (registro_espera.profissional_preferido IS NULL OR a.profissional_id = registro_espera.profissional_preferido);
  
  -- Calcular média de agendamentos por dia baseada na demanda
  media_agendamentos_dia := COALESCE(registro_espera.demanda_media_semanal / 7.0, 2.0);
  
  -- Estimar dias baseado na posição na fila
  dias_estimados := CEIL((registro_espera.posicao_estimada + agendamentos_futuros) / media_agendamentos_dia);
  
  -- Ajustar baseado na flexibilidade
  IF registro_espera.flexibilidade_dias >= 14 THEN
    dias_estimados := dias_estimados * 0.7; -- 30% mais rápido
  ELSIF registro_espera.flexibilidade_dias >= 7 THEN
    dias_estimados := dias_estimados * 0.85; -- 15% mais rápido
  END IF;
  
  -- Ajustar baseado na aceitação de alternativas
  IF registro_espera.aceita_profissional_alternativo THEN
    dias_estimados := dias_estimados * 0.8; -- 20% mais rápido
  END IF;
  
  -- Garantir mínimo de 1 dia
  dias_estimados := GREATEST(dias_estimados, 1);
  
  tempo_estimado := (dias_estimados || ' days')::INTERVAL;
  
  -- Atualizar o registro com a estimativa
  UPDATE public.lista_espera
  SET 
    tempo_espera_estimado = tempo_estimado,
    atualizado_em = NOW()
  WHERE id = p_lista_espera_id;
  
  RETURN tempo_estimado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO PARA NOTIFICAR PRÓXIMO DA LISTA DE ESPERA
-- =====================================================

CREATE OR REPLACE FUNCTION public.notificar_proximo_lista_espera(
  p_data_disponivel TIMESTAMPTZ,
  p_duracao_minutos INTEGER,
  p_profissional_id UUID,
  p_servico_id UUID,
  p_sala_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  proximo_cliente RECORD;
  notificacao_id UUID;
  resultado JSONB;
BEGIN
  -- Buscar próximo cliente na lista de espera
  SELECT le.*, c.nome as cliente_nome, c.telefone, c.email
  INTO proximo_cliente
  FROM public.lista_espera le
  JOIN public.clientes c ON c.id = le.cliente_id
  WHERE le.status = 'ativo'
    AND le.servico_id = p_servico_id
    AND (le.profissional_preferido IS NULL OR le.profissional_preferido = p_profissional_id)
    AND (
      le.data_preferida IS NULL OR 
      p_data_disponivel::DATE <= le.data_preferida + (le.flexibilidade_dias || ' days')::INTERVAL
    )
    AND (
      le.horario_inicio_preferido IS NULL OR
      p_data_disponivel::TIME >= le.horario_inicio_preferido
    )
    AND (
      le.horario_fim_preferido IS NULL OR
      (p_data_disponivel + (p_duracao_minutos || ' minutes')::INTERVAL)::TIME <= le.horario_fim_preferido
    )
    AND (
      le.dias_semana_aceitos IS NULL OR
      EXTRACT(DOW FROM p_data_disponivel)::INTEGER = ANY(le.dias_semana_aceitos)
    )
  ORDER BY le.pontuacao_prioridade DESC, le.criado_em ASC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'motivo', 'Nenhum cliente compatível na lista de espera'
    );
  END IF;
  
  -- Atualizar status para notificado
  UPDATE public.lista_espera
  SET 
    status = 'notificado',
    notificado_em = NOW(),
    tentativas_contato = tentativas_contato + 1,
    ultima_tentativa_contato = NOW(),
    atualizado_em = NOW()
  WHERE id = proximo_cliente.id;
  
  -- Criar registro de notificação (será implementado no sistema de comunicação)
  INSERT INTO public.notificacoes_agendamento (
    lista_espera_id,
    cliente_id,
    tipo_notificacao,
    data_disponivel,
    duracao_minutos,
    profissional_id,
    sala_id,
    prazo_resposta,
    canais_contato,
    status,
    criado_por
  ) VALUES (
    proximo_cliente.id,
    proximo_cliente.cliente_id,
    'vaga_disponivel',
    p_data_disponivel,
    p_duracao_minutos,
    p_profissional_id,
    p_sala_id,
    NOW() + proximo_cliente.tempo_resposta_limite,
    proximo_cliente.preferencia_contato,
    'pendente',
    auth.uid()
  ) RETURNING id INTO notificacao_id;
  
  resultado := jsonb_build_object(
    'sucesso', true,
    'cliente_id', proximo_cliente.cliente_id,
    'cliente_nome', proximo_cliente.cliente_nome,
    'lista_espera_id', proximo_cliente.id,
    'notificacao_id', notificacao_id,
    'data_disponivel', p_data_disponivel,
    'prazo_resposta', NOW() + proximo_cliente.tempo_resposta_limite,
    'canais_contato', proximo_cliente.preferencia_contato,
    'categoria_cliente', proximo_cliente.categoria_cliente,
    'prioridade', proximo_cliente.prioridade
  );
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO PARA PROCESSAR RESPOSTA DA LISTA DE ESPERA
-- =====================================================

CREATE OR REPLACE FUNCTION public.processar_resposta_lista_espera(
  p_lista_espera_id UUID,
  p_aceita_agendamento BOOLEAN,
  p_data_agendamento TIMESTAMPTZ DEFAULT NULL,
  p_observacoes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  registro_espera RECORD;
  agendamento_id UUID;
  resultado JSONB;
BEGIN
  -- Buscar registro da lista de espera
  SELECT * INTO registro_espera
  FROM public.lista_espera
  WHERE id = p_lista_espera_id AND status = 'notificado';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'motivo', 'Registro de lista de espera não encontrado ou não está no status correto'
    );
  END IF;
  
  IF p_aceita_agendamento THEN
    -- Cliente aceitou - criar agendamento
    INSERT INTO public.agendamentos (
      cliente_id,
      profissional_id,
      servico_id,
      sala_id,
      clinica_id,
      data_agendamento,
      duracao_minutos,
      status,
      categoria_cliente,
      prioridade,
      valor_servico,
      valor_final,
      observacoes,
      criado_por
    )
    SELECT 
      le.cliente_id,
      COALESCE(le.profissional_preferido, 
        (SELECT n.profissional_id FROM public.notificacoes_agendamento n WHERE n.lista_espera_id = le.id ORDER BY n.criado_em DESC LIMIT 1)
      ),
      le.servico_id,
      le.sala_preferida,
      le.clinica_id,
      COALESCE(p_data_agendamento,
        (SELECT n.data_disponivel FROM public.notificacoes_agendamento n WHERE n.lista_espera_id = le.id ORDER BY n.criado_em DESC LIMIT 1)
      ),
      COALESCE(
        (SELECT n.duracao_minutos FROM public.notificacoes_agendamento n WHERE n.lista_espera_id = le.id ORDER BY n.criado_em DESC LIMIT 1),
        60
      ),
      'confirmado',
      le.categoria_cliente,
      le.prioridade,
      (SELECT s.preco_base FROM public.servicos s WHERE s.id = le.servico_id),
      (SELECT s.preco_base FROM public.servicos s WHERE s.id = le.servico_id),
      COALESCE(p_observacoes, 'Agendamento criado via lista de espera'),
      auth.uid()
    FROM public.lista_espera le
    WHERE le.id = p_lista_espera_id
    RETURNING id INTO agendamento_id;
    
    -- Atualizar status da lista de espera
    UPDATE public.lista_espera
    SET 
      status = 'agendado',
      notificacao_aceita_em = NOW(),
      agendamento_criado_id = agendamento_id,
      atualizado_em = NOW()
    WHERE id = p_lista_espera_id;
    
    -- Atualizar notificação
    UPDATE public.notificacoes_agendamento
    SET 
      status = 'aceita',
      respondido_em = NOW(),
      agendamento_criado_id = agendamento_id
    WHERE lista_espera_id = p_lista_espera_id AND status = 'pendente';
    
    resultado := jsonb_build_object(
      'sucesso', true,
      'agendamento_criado', true,
      'agendamento_id', agendamento_id,
      'mensagem', 'Agendamento criado com sucesso'
    );
    
  ELSE
    -- Cliente rejeitou - voltar para ativo
    UPDATE public.lista_espera
    SET 
      status = 'ativo',
      notificacao_rejeitada_em = NOW(),
      atualizado_em = NOW()
    WHERE id = p_lista_espera_id;
    
    -- Atualizar notificação
    UPDATE public.notificacoes_agendamento
    SET 
      status = 'rejeitada',
      respondido_em = NOW(),
      observacoes = p_observacoes
    WHERE lista_espera_id = p_lista_espera_id AND status = 'pendente';
    
    resultado := jsonb_build_object(
      'sucesso', true,
      'agendamento_criado', false,
      'mensagem', 'Cliente rejeitou a vaga. Voltou para lista de espera ativa.'
    );
  END IF;
  
  -- Recalcular posições na lista de espera
  PERFORM public.atualizar_posicoes_lista_espera(registro_espera.servico_id);
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO PARA LIMPAR LISTA DE ESPERA EXPIRADA
-- =====================================================

CREATE OR REPLACE FUNCTION public.limpar_lista_espera_expirada()
RETURNS JSONB AS $$
DECLARE
  registros_expirados INTEGER;
  registros_sem_resposta INTEGER;
BEGIN
  -- Expirar registros que passaram da data limite
  UPDATE public.lista_espera
  SET 
    status = 'expirado',
    atualizado_em = NOW()
  WHERE status = 'ativo' 
    AND expira_em < NOW();
  
  GET DIAGNOSTICS registros_expirados = ROW_COUNT;
  
  -- Expirar notificações sem resposta
  UPDATE public.lista_espera
  SET 
    status = 'expirado',
    atualizado_em = NOW()
  WHERE status = 'notificado'
    AND EXISTS (
      SELECT 1 FROM public.notificacoes_agendamento n
      WHERE n.lista_espera_id = lista_espera.id
        AND n.status = 'pendente'
        AND n.prazo_resposta < NOW()
    );
  
  GET DIAGNOSTICS registros_sem_resposta = ROW_COUNT;
  
  -- Atualizar notificações expiradas
  UPDATE public.notificacoes_agendamento
  SET 
    status = 'expirada',
    atualizado_em = NOW()
  WHERE status = 'pendente' 
    AND prazo_resposta < NOW();
  
  RETURN jsonb_build_object(
    'sucesso', true,
    'registros_expirados', registros_expirados,
    'registros_sem_resposta', registros_sem_resposta,
    'total_processados', registros_expirados + registros_sem_resposta,
    'processado_em', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TABELA DE NOTIFICAÇÕES DE AGENDAMENTO
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notificacoes_agendamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  lista_espera_id UUID NOT NULL REFERENCES public.lista_espera(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES auth.users(id),
  sala_id UUID REFERENCES public.salas_clinica(id),
  agendamento_criado_id UUID REFERENCES public.agendamentos(id),
  
  -- Dados da notificação
  tipo_notificacao VARCHAR(50) NOT NULL DEFAULT 'vaga_disponivel',
  data_disponivel TIMESTAMPTZ NOT NULL,
  duracao_minutos INTEGER NOT NULL,
  prazo_resposta TIMESTAMPTZ NOT NULL,
  
  -- Canais de contato
  canais_contato TEXT[] DEFAULT ARRAY['whatsapp', 'sms', 'email'],
  tentativas_envio INTEGER DEFAULT 0,
  ultimo_envio TIMESTAMPTZ,
  
  -- Status e resposta
  status VARCHAR(20) DEFAULT 'pendente', -- pendente, enviada, aceita, rejeitada, expirada
  respondido_em TIMESTAMPTZ,
  observacoes TEXT,
  
  -- Auditoria
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por UUID NOT NULL REFERENCES auth.users(id),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para notificações
CREATE INDEX idx_notificacoes_lista_espera ON public.notificacoes_agendamento(lista_espera_id);
CREATE INDEX idx_notificacoes_cliente ON public.notificacoes_agendamento(cliente_id);
CREATE INDEX idx_notificacoes_status ON public.notificacoes_agendamento(status, prazo_resposta);
CREATE INDEX idx_notificacoes_profissional ON public.notificacoes_agendamento(profissional_id, criado_em DESC);

-- =====================================================
-- TRIGGER PARA ATUALIZAR ESTIMATIVAS AUTOMATICAMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION public.trigger_atualizar_lista_espera()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalcular posições quando há mudanças relevantes
  IF TG_OP = 'INSERT' OR 
     (TG_OP = 'UPDATE' AND (
       OLD.status != NEW.status OR 
       OLD.prioridade != NEW.prioridade OR
       OLD.categoria_cliente != NEW.categoria_cliente
     )) THEN
    
    PERFORM public.atualizar_posicoes_lista_espera(NEW.servico_id);
    
    -- Atualizar estimativa de tempo
    PERFORM public.estimar_tempo_espera(NEW.id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_lista_espera_mudancas
  AFTER INSERT OR UPDATE ON public.lista_espera
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_atualizar_lista_espera();

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION public.calcular_pontuacao_prioridade IS 'Calcula pontuação de prioridade baseada em múltiplos critérios para ordenação inteligente da lista de espera';
COMMENT ON FUNCTION public.atualizar_posicoes_lista_espera IS 'Atualiza posições na lista de espera baseadas na pontuação de prioridade';
COMMENT ON FUNCTION public.estimar_tempo_espera IS 'Estima tempo de espera baseado na posição na fila e demanda histórica';
COMMENT ON FUNCTION public.notificar_proximo_lista_espera IS 'Notifica próximo cliente da lista de espera quando há vaga disponível';
COMMENT ON FUNCTION public.processar_resposta_lista_espera IS 'Processa resposta do cliente (aceita/rejeita) e cria agendamento se aceito';
COMMENT ON FUNCTION public.limpar_lista_espera_expirada IS 'Remove registros expirados da lista de espera automaticamente';

COMMENT ON TABLE public.notificacoes_agendamento IS 'Registro de notificações enviadas para clientes da lista de espera';