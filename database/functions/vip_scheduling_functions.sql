-- =====================================================
-- FUNÇÕES PARA SISTEMA VIP DE AGENDAMENTO
-- Funções especializadas para gestão de clientes premium
-- =====================================================

-- =====================================================
-- FUNÇÃO: Realocar agendamento para VIP
-- =====================================================

CREATE OR REPLACE FUNCTION realocar_agendamento_para_vip(
  agendamento_original_id UUID,
  novo_horario TIMESTAMPTZ,
  vip_cliente_id UUID,
  motivo TEXT DEFAULT 'Priorização de cliente VIP'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  agendamento_original RECORD;
  novo_agendamento_id UUID;
  resultado JSONB;
BEGIN
  -- Buscar agendamento original
  SELECT * INTO agendamento_original
  FROM public.agendamentos
  WHERE id = agendamento_original_id
    AND status IN ('pendente', 'confirmado');

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Agendamento original não encontrado ou não pode ser realocado'
    );
  END IF;

  -- Verificar se o novo horário está disponível
  IF EXISTS (
    SELECT 1 FROM public.agendamentos
    WHERE profissional_id = agendamento_original.profissional_id
      AND data_agendamento = novo_horario
      AND status IN ('pendente', 'confirmado')
      AND id != agendamento_original_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Novo horário não está disponível'
    );
  END IF;

  -- Iniciar transação
  BEGIN
    -- Atualizar agendamento original
    UPDATE public.agendamentos
    SET 
      data_agendamento = novo_horario,
      motivo_reagendamento = motivo,
      reagendado_por = auth.uid(),
      atualizado_em = NOW(),
      observacoes_internas = COALESCE(observacoes_internas, '') || 
        E'\n[' || NOW()::TEXT || '] Reagendado para acomodar cliente VIP: ' || vip_cliente_id
    WHERE id = agendamento_original_id;

    -- Criar notificação para cliente afetado
    INSERT INTO public.notificacoes (
      cliente_id,
      tipo,
      titulo,
      mensagem,
      canal,
      urgente,
      metadata
    ) VALUES (
      agendamento_original.cliente_id,
      'reagendamento_automatico',
      'Seu agendamento foi reagendado',
      'Seu agendamento foi reagendado para ' || 
        to_char(novo_horario, 'DD/MM/YYYY às HH24:MI') || 
        '. Como compensação, você receberá 15% de desconto no próximo agendamento.',
      'whatsapp',
      true,
      jsonb_build_object(
        'agendamento_id', agendamento_original_id,
        'novo_horario', novo_horario,
        'motivo', motivo,
        'compensacao', '15% desconto próximo agendamento'
      )
    );

    -- Criar notificação para profissional
    INSERT INTO public.notificacoes (
      profissional_id,
      tipo,
      titulo,
      mensagem,
      canal,
      metadata
    ) VALUES (
      agendamento_original.profissional_id,
      'alteracao_agenda',
      'Alteração na agenda',
      'Agendamento de ' || 
        to_char(agendamento_original.data_agendamento, 'DD/MM/YYYY às HH24:MI') ||
        ' foi reagendado para ' ||
        to_char(novo_horario, 'DD/MM/YYYY às HH24:MI') ||
        ' para acomodar cliente VIP.',
      'push',
      jsonb_build_object(
        'agendamento_id', agendamento_original_id,
        'horario_original', agendamento_original.data_agendamento,
        'novo_horario', novo_horario,
        'vip_cliente_id', vip_cliente_id
      )
    );

    resultado := jsonb_build_object(
      'success', true,
      'agendamento_realocado_id', agendamento_original_id,
      'novo_horario', novo_horario,
      'cliente_afetado_id', agendamento_original.cliente_id,
      'notificacoes_enviadas', 2
    );

  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao realocar agendamento: %', SQLERRM;
  END;

  RETURN resultado;
END;
$$;

-- =====================================================
-- FUNÇÃO: Buscar slots disponíveis para data específica
-- =====================================================

CREATE OR REPLACE FUNCTION get_available_slots(
  target_date DATE,
  servico_id UUID,
  profissional_id UUID DEFAULT NULL,
  categoria_cliente cliente_categoria DEFAULT 'regular'
)
RETURNS TABLE (
  data_hora TIMESTAMPTZ,
  profissional_id UUID,
  profissional_nome TEXT,
  sala_id UUID,
  sala_nome TEXT,
  disponibilidade TEXT,
  score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  servico_duracao INTEGER;
  horario_inicio TIME := '08:00';
  horario_fim TIME := '18:00';
  intervalo_minutos INTEGER := 30;
  slot_atual TIMESTAMPTZ;
  slot_fim TIMESTAMPTZ;
BEGIN
  -- Buscar duração do serviço
  SELECT duracao_minutos INTO servico_duracao
  FROM public.servicos
  WHERE id = servico_id;

  IF servico_duracao IS NULL THEN
    RAISE EXCEPTION 'Serviço não encontrado';
  END IF;

  -- Loop pelos horários do dia
  slot_atual := target_date::TIMESTAMPTZ + horario_inicio::TIME;
  
  WHILE slot_atual::TIME <= horario_fim LOOP
    slot_fim := slot_atual + (servico_duracao || ' minutes')::INTERVAL;
    
    -- Verificar se slot está disponível
    IF NOT EXISTS (
      SELECT 1 FROM public.agendamentos a
      WHERE a.profissional_id = COALESCE(get_available_slots.profissional_id, a.profissional_id)
        AND a.status IN ('pendente', 'confirmado', 'em_andamento')
        AND (
          (a.data_agendamento <= slot_atual AND 
           a.data_agendamento + (a.duracao_minutos || ' minutes')::INTERVAL > slot_atual)
          OR
          (a.data_agendamento < slot_fim AND 
           a.data_agendamento + (a.duracao_minutos || ' minutes')::INTERVAL >= slot_fim)
          OR
          (a.data_agendamento >= slot_atual AND a.data_agendamento < slot_fim)
        )
    ) AND NOT EXISTS (
      -- Verificar bloqueios
      SELECT 1 FROM public.bloqueios_agenda b
      WHERE b.profissional_id = COALESCE(get_available_slots.profissional_id, b.profissional_id)
        AND b.ativo = true
        AND b.data_inicio <= slot_atual
        AND b.data_fim >= slot_fim
    ) THEN
      
      -- Retornar slot disponível
      FOR profissional_id, profissional_nome, sala_id, sala_nome IN
        SELECT 
          u.id,
          COALESCE(p.nome, u.email) as nome,
          s.id,
          s.nome
        FROM auth.users u
        LEFT JOIN public.profissionais p ON p.user_id = u.id
        LEFT JOIN public.salas_clinica s ON s.id = (
          SELECT sala_id FROM public.profissional_salas ps 
          WHERE ps.profissional_id = u.id 
          LIMIT 1
        )
        WHERE (get_available_slots.profissional_id IS NULL OR u.id = get_available_slots.profissional_id)
          AND EXISTS (
            SELECT 1 FROM public.profissional_servicos ps2
            WHERE ps2.profissional_id = u.id
              AND ps2.servico_id = get_available_slots.servico_id
          )
      LOOP
        RETURN QUERY SELECT 
          slot_atual,
          profissional_id,
          profissional_nome,
          sala_id,
          sala_nome,
          CASE 
            WHEN categoria_cliente IN ('premium', 'vip') THEN 'preferencial_vip'
            ELSE 'livre'
          END::TEXT,
          CASE 
            WHEN slot_atual::TIME BETWEEN '09:00' AND '11:00' THEN 100
            WHEN slot_atual::TIME BETWEEN '14:00' AND '16:00' THEN 90
            ELSE 70
          END;
      END LOOP;
    END IF;
    
    slot_atual := slot_atual + (intervalo_minutos || ' minutes')::INTERVAL;
  END LOOP;
END;
$$;

-- =====================================================
-- FUNÇÃO: Calcular prioridade de cliente na lista de espera
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_prioridade_lista_espera(
  cliente_id UUID,
  servico_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cliente_categoria cliente_categoria;
  nivel_vip TEXT;
  total_gasto DECIMAL;
  ultima_visita DATE;
  pontuacao INTEGER := 0;
BEGIN
  -- Buscar dados do cliente
  SELECT 
    c.categoria,
    c.nivel_vip,
    COALESCE(c.total_gasto, 0),
    c.ultima_visita
  INTO 
    cliente_categoria,
    nivel_vip,
    total_gasto,
    ultima_visita
  FROM public.clientes c
  WHERE c.id = cliente_id;

  -- Pontuação base por categoria
  CASE cliente_categoria
    WHEN 'premium' THEN pontuacao := pontuacao + 1000;
    WHEN 'vip' THEN pontuacao := pontuacao + 500;
    WHEN 'corporativo' THEN pontuacao := pontuacao + 200;
    ELSE pontuacao := pontuacao + 100;
  END CASE;

  -- Pontuação por nível VIP
  CASE nivel_vip
    WHEN 'diamante' THEN pontuacao := pontuacao + 500;
    WHEN 'platina' THEN pontuacao := pontuacao + 400;
    WHEN 'ouro' THEN pontuacao := pontuacao + 300;
    WHEN 'prata' THEN pontuacao := pontuacao + 200;
    WHEN 'bronze' THEN pontuacao := pontuacao + 100;
  END CASE;

  -- Pontuação por valor gasto (1 ponto por R$ 100)
  pontuacao := pontuacao + (total_gasto / 100)::INTEGER;

  -- Pontuação por tempo sem visita (mais tempo = mais prioridade)
  IF ultima_visita IS NOT NULL THEN
    pontuacao := pontuacao + GREATEST(0, EXTRACT(days FROM NOW() - ultima_visita)::INTEGER);
  ELSE
    pontuacao := pontuacao + 365; -- Cliente novo tem prioridade média
  END IF;

  -- Pontuação por frequência de agendamentos
  pontuacao := pontuacao + (
    SELECT COUNT(*) * 10
    FROM public.agendamentos a
    WHERE a.cliente_id = calcular_prioridade_lista_espera.cliente_id
      AND a.status = 'finalizado'
      AND a.data_agendamento >= NOW() - INTERVAL '1 year'
  );

  RETURN pontuacao;
END;
$$;

-- =====================================================
-- FUNÇÃO: Processar lista de espera automaticamente
-- =====================================================

CREATE OR REPLACE FUNCTION processar_lista_espera_automatica()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item_espera RECORD;
  slots_disponiveis RECORD;
  agendamento_criado UUID;
  total_processados INTEGER := 0;
  total_agendados INTEGER := 0;
  resultado JSONB;
BEGIN
  -- Processar itens ativos da lista de espera ordenados por prioridade
  FOR item_espera IN
    SELECT 
      le.*,
      c.nome as cliente_nome,
      c.telefone as cliente_telefone,
      s.nome as servico_nome,
      s.duracao_minutos
    FROM public.lista_espera le
    JOIN public.clientes c ON c.id = le.cliente_id
    JOIN public.servicos s ON s.id = le.servico_id
    WHERE le.status = 'ativo'
      AND le.expira_em > NOW()
    ORDER BY le.pontuacao_prioridade DESC, le.criado_em ASC
    LIMIT 50 -- Processar até 50 por vez
  LOOP
    total_processados := total_processados + 1;

    -- Buscar slots disponíveis para este cliente
    FOR slots_disponiveis IN
      SELECT * FROM get_available_slots(
        COALESCE(item_espera.data_preferida, CURRENT_DATE + 1),
        item_espera.servico_id,
        item_espera.profissional_preferido,
        item_espera.categoria_cliente
      )
      ORDER BY score DESC
      LIMIT 1
    LOOP
      -- Criar agendamento
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
      ) VALUES (
        item_espera.cliente_id,
        slots_disponiveis.profissional_id,
        item_espera.servico_id,
        slots_disponiveis.sala_id,
        item_espera.clinica_id,
        slots_disponiveis.data_hora,
        item_espera.duracao_minutos,
        'pendente',
        item_espera.categoria_cliente,
        CASE item_espera.categoria_cliente
          WHEN 'premium' THEN 'vip'::prioridade_nivel
          WHEN 'vip' THEN 'alta'::prioridade_nivel
          ELSE 'normal'::prioridade_nivel
        END,
        (SELECT valor FROM public.servicos WHERE id = item_espera.servico_id),
        (SELECT valor FROM public.servicos WHERE id = item_espera.servico_id),
        'Agendamento automático via lista de espera',
        (SELECT id FROM auth.users WHERE email = 'sistema@clinica.com' LIMIT 1)
      ) RETURNING id INTO agendamento_criado;

      -- Atualizar lista de espera
      UPDATE public.lista_espera
      SET 
        status = 'agendado',
        agendamento_criado_id = agendamento_criado,
        atualizado_em = NOW()
      WHERE id = item_espera.id;

      -- Criar notificação para cliente
      INSERT INTO public.notificacoes (
        cliente_id,
        tipo,
        titulo,
        mensagem,
        canal,
        urgente,
        metadata
      ) VALUES (
        item_espera.cliente_id,
        'agendamento_lista_espera',
        'Vaga disponível! Agendamento confirmado',
        'Boa notícia! Conseguimos uma vaga para seu ' || item_espera.servico_nome || 
        ' no dia ' || to_char(slots_disponiveis.data_hora, 'DD/MM/YYYY às HH24:MI') ||
        '. Confirme sua presença respondendo esta mensagem.',
        'whatsapp',
        true,
        jsonb_build_object(
          'agendamento_id', agendamento_criado,
          'lista_espera_id', item_espera.id,
          'data_agendamento', slots_disponiveis.data_hora
        )
      );

      total_agendados := total_agendados + 1;
      EXIT; -- Sair do loop de slots para este cliente
    END LOOP;
  END LOOP;

  resultado := jsonb_build_object(
    'success', true,
    'total_processados', total_processados,
    'total_agendados', total_agendados,
    'processado_em', NOW()
  );

  RETURN resultado;
END;
$$;

-- =====================================================
-- FUNÇÃO: Verificar conflitos de agendamento
-- =====================================================

CREATE OR REPLACE FUNCTION verificar_conflitos_agendamento(
  profissional_id UUID,
  data_agendamento TIMESTAMPTZ,
  duracao_minutos INTEGER,
  agendamento_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conflitos JSONB := '[]'::JSONB;
  conflito RECORD;
  data_fim TIMESTAMPTZ;
BEGIN
  data_fim := data_agendamento + (duracao_minutos || ' minutes')::INTERVAL;

  -- Verificar conflitos com outros agendamentos
  FOR conflito IN
    SELECT 
      a.id,
      a.cliente_id,
      c.nome as cliente_nome,
      a.data_agendamento,
      a.duracao_minutos,
      s.nome as servico_nome,
      a.categoria_cliente,
      'agendamento' as tipo_conflito
    FROM public.agendamentos a
    JOIN public.clientes c ON c.id = a.cliente_id
    JOIN public.servicos s ON s.id = a.servico_id
    WHERE a.profissional_id = verificar_conflitos_agendamento.profissional_id
      AND a.status IN ('pendente', 'confirmado', 'em_andamento')
      AND (agendamento_id IS NULL OR a.id != agendamento_id)
      AND (
        (a.data_agendamento <= data_agendamento AND 
         a.data_agendamento + (a.duracao_minutos || ' minutes')::INTERVAL > data_agendamento)
        OR
        (a.data_agendamento < data_fim AND 
         a.data_agendamento + (a.duracao_minutos || ' minutes')::INTERVAL >= data_fim)
        OR
        (a.data_agendamento >= data_agendamento AND a.data_agendamento < data_fim)
      )
  LOOP
    conflitos := conflitos || jsonb_build_object(
      'tipo', conflito.tipo_conflito,
      'id', conflito.id,
      'cliente_id', conflito.cliente_id,
      'cliente_nome', conflito.cliente_nome,
      'data_agendamento', conflito.data_agendamento,
      'duracao_minutos', conflito.duracao_minutos,
      'servico_nome', conflito.servico_nome,
      'categoria_cliente', conflito.categoria_cliente,
      'pode_ser_realocado', conflito.categoria_cliente = 'regular'
    );
  END LOOP;

  -- Verificar conflitos com bloqueios
  FOR conflito IN
    SELECT 
      b.id,
      b.titulo,
      b.data_inicio,
      b.data_fim,
      b.tipo,
      'bloqueio' as tipo_conflito
    FROM public.bloqueios_agenda b
    WHERE b.profissional_id = verificar_conflitos_agendamento.profissional_id
      AND b.ativo = true
      AND b.data_inicio <= data_fim
      AND b.data_fim >= data_agendamento
  LOOP
    conflitos := conflitos || jsonb_build_object(
      'tipo', conflito.tipo_conflito,
      'id', conflito.id,
      'titulo', conflito.titulo,
      'data_inicio', conflito.data_inicio,
      'data_fim', conflito.data_fim,
      'tipo_bloqueio', conflito.tipo,
      'pode_ser_realocado', false
    );
  END LOOP;

  RETURN jsonb_build_object(
    'tem_conflitos', jsonb_array_length(conflitos) > 0,
    'total_conflitos', jsonb_array_length(conflitos),
    'conflitos', conflitos
  );
END;
$$;

-- =====================================================
-- FUNÇÃO: Atualizar pontuação de prioridade na lista de espera
-- =====================================================

CREATE OR REPLACE FUNCTION atualizar_pontuacoes_lista_espera()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_atualizados INTEGER := 0;
  item RECORD;
BEGIN
  FOR item IN
    SELECT id, cliente_id, servico_id
    FROM public.lista_espera
    WHERE status = 'ativo'
  LOOP
    UPDATE public.lista_espera
    SET 
      pontuacao_prioridade = calcular_prioridade_lista_espera(item.cliente_id, item.servico_id),
      atualizado_em = NOW()
    WHERE id = item.id;
    
    total_atualizados := total_atualizados + 1;
  END LOOP;

  RETURN total_atualizados;
END;
$$;

-- =====================================================
-- GRANTS E PERMISSÕES
-- =====================================================

-- Permitir execução das funções para usuários autenticados
GRANT EXECUTE ON FUNCTION realocar_agendamento_para_vip TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_slots TO authenticated;
GRANT EXECUTE ON FUNCTION calcular_prioridade_lista_espera TO authenticated;
GRANT EXECUTE ON FUNCTION processar_lista_espera_automatica TO authenticated;
GRANT EXECUTE ON FUNCTION verificar_conflitos_agendamento TO authenticated;
GRANT EXECUTE ON FUNCTION atualizar_pontuacoes_lista_espera TO authenticated;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON FUNCTION realocar_agendamento_para_vip IS 'Realoca agendamento de cliente regular para acomodar cliente VIP';
COMMENT ON FUNCTION get_available_slots IS 'Busca slots disponíveis para agendamento considerando categoria do cliente';
COMMENT ON FUNCTION calcular_prioridade_lista_espera IS 'Calcula pontuação de prioridade baseada em múltiplos critérios';
COMMENT ON FUNCTION processar_lista_espera_automatica IS 'Processa automaticamente lista de espera criando agendamentos';
COMMENT ON FUNCTION verificar_conflitos_agendamento IS 'Verifica conflitos de horário para um agendamento';
COMMENT ON FUNCTION atualizar_pontuacoes_lista_espera IS 'Atualiza pontuações de prioridade de todos os itens ativos na lista de espera';