-- =====================================================
-- FUNÇÕES DE DISPONIBILIDADE E BLOQUEIOS
-- Sistema avançado para gestão de disponibilidade
-- =====================================================

-- =====================================================
-- FUNÇÃO PARA VERIFICAR DISPONIBILIDADE DE PROFISSIONAL
-- =====================================================

CREATE OR REPLACE FUNCTION public.verificar_disponibilidade_profissional(
  p_profissional_id UUID,
  p_data_inicio TIMESTAMPTZ,
  p_data_fim TIMESTAMPTZ,
  p_agendamento_excluir UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  conflitos_agendamentos INTEGER;
  conflitos_bloqueios INTEGER;
  horario_funcionamento JSONB;
  disponibilidade_result JSONB;
  dia_semana TEXT;
  horario_inicio TIME;
  horario_fim TIME;
BEGIN
  -- Verificar se está dentro do horário de funcionamento
  dia_semana := LOWER(TO_CHAR(p_data_inicio, 'Day'));
  dia_semana := TRIM(dia_semana);
  
  -- Buscar horário de trabalho do profissional
  SELECT p.horario_trabalho INTO horario_funcionamento
  FROM public.profissionais p
  WHERE p.user_id = p_profissional_id;
  
  -- Se não tem horário definido, assumir disponível 24h
  IF horario_funcionamento IS NULL OR horario_funcionamento = '{}'::jsonb THEN
    horario_funcionamento := jsonb_build_object(
      'monday', jsonb_build_object('start', '08:00', 'end', '18:00', 'closed', false),
      'tuesday', jsonb_build_object('start', '08:00', 'end', '18:00', 'closed', false),
      'wednesday', jsonb_build_object('start', '08:00', 'end', '18:00', 'closed', false),
      'thursday', jsonb_build_object('start', '08:00', 'end', '18:00', 'closed', false),
      'friday', jsonb_build_object('start', '08:00', 'end', '18:00', 'closed', false),
      'saturday', jsonb_build_object('start', '08:00', 'end', '14:00', 'closed', false),
      'sunday', jsonb_build_object('closed', true)
    );
  END IF;
  
  -- Verificar se o dia está fechado
  IF (horario_funcionamento->dia_semana->>'closed')::boolean = true THEN
    RETURN jsonb_build_object(
      'disponivel', false,
      'motivo', 'Profissional não trabalha neste dia',
      'conflitos_agendamentos', 0,
      'conflitos_bloqueios', 0,
      'horario_funcionamento', false
    );
  END IF;
  
  -- Verificar horário de funcionamento
  horario_inicio := (horario_funcionamento->dia_semana->>'start')::TIME;
  horario_fim := (horario_funcionamento->dia_semana->>'end')::TIME;
  
  IF p_data_inicio::TIME < horario_inicio OR p_data_fim::TIME > horario_fim THEN
    RETURN jsonb_build_object(
      'disponivel', false,
      'motivo', 'Fora do horário de funcionamento',
      'conflitos_agendamentos', 0,
      'conflitos_bloqueios', 0,
      'horario_funcionamento', false,
      'horario_permitido', jsonb_build_object(
        'inicio', horario_inicio,
        'fim', horario_fim
      )
    );
  END IF;
  
  -- Verificar conflitos com agendamentos existentes
  SELECT COUNT(*) INTO conflitos_agendamentos
  FROM public.agendamentos a
  WHERE a.profissional_id = p_profissional_id
    AND a.status IN ('confirmado', 'em_andamento', 'pendente')
    AND (p_agendamento_excluir IS NULL OR a.id != p_agendamento_excluir)
    AND (
      (a.data_agendamento, a.data_agendamento + (a.duracao_minutos || ' minutes')::INTERVAL) 
      OVERLAPS 
      (p_data_inicio, p_data_fim)
    );
  
  -- Verificar conflitos com bloqueios
  SELECT COUNT(*) INTO conflitos_bloqueios
  FROM public.bloqueios_agenda b
  WHERE (b.profissional_id = p_profissional_id OR b.profissional_id IS NULL)
    AND b.ativo = true
    AND (b.data_inicio, b.data_fim) OVERLAPS (p_data_inicio, p_data_fim);
  
  -- Montar resultado
  disponibilidade_result := jsonb_build_object(
    'disponivel', (conflitos_agendamentos = 0 AND conflitos_bloqueios = 0),
    'conflitos_agendamentos', conflitos_agendamentos,
    'conflitos_bloqueios', conflitos_bloqueios,
    'horario_funcionamento', true,
    'dia_semana', dia_semana,
    'horario_permitido', jsonb_build_object(
      'inicio', horario_inicio,
      'fim', horario_fim
    )
  );
  
  -- Adicionar motivo se não disponível
  IF conflitos_agendamentos > 0 THEN
    disponibilidade_result := disponibilidade_result || jsonb_build_object(
      'motivo', 'Conflito com agendamento existente'
    );
  ELSIF conflitos_bloqueios > 0 THEN
    disponibilidade_result := disponibilidade_result || jsonb_build_object(
      'motivo', 'Horário bloqueado'
    );
  END IF;
  
  RETURN disponibilidade_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO PARA VERIFICAR DISPONIBILIDADE DE SALA
-- =====================================================

CREATE OR REPLACE FUNCTION public.verificar_disponibilidade_sala(
  p_sala_id UUID,
  p_data_inicio TIMESTAMPTZ,
  p_data_fim TIMESTAMPTZ,
  p_agendamento_excluir UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  conflitos_agendamentos INTEGER;
  conflitos_bloqueios INTEGER;
  sala_ativa BOOLEAN;
  sala_disponivel_agendamento BOOLEAN;
BEGIN
  -- Verificar se a sala existe e está ativa
  SELECT s.ativo, s.disponivel_agendamento 
  INTO sala_ativa, sala_disponivel_agendamento
  FROM public.salas_clinica s
  WHERE s.id = p_sala_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'disponivel', false,
      'motivo', 'Sala não encontrada'
    );
  END IF;
  
  IF NOT sala_ativa THEN
    RETURN jsonb_build_object(
      'disponivel', false,
      'motivo', 'Sala inativa'
    );
  END IF;
  
  IF NOT sala_disponivel_agendamento THEN
    RETURN jsonb_build_object(
      'disponivel', false,
      'motivo', 'Sala não disponível para agendamento'
    );
  END IF;
  
  -- Verificar conflitos com agendamentos existentes
  SELECT COUNT(*) INTO conflitos_agendamentos
  FROM public.agendamentos a
  WHERE a.sala_id = p_sala_id
    AND a.status IN ('confirmado', 'em_andamento', 'pendente')
    AND (p_agendamento_excluir IS NULL OR a.id != p_agendamento_excluir)
    AND (
      (a.data_agendamento, a.data_agendamento + (a.duracao_minutos || ' minutes')::INTERVAL) 
      OVERLAPS 
      (p_data_inicio, p_data_fim)
    );
  
  -- Verificar conflitos com bloqueios
  SELECT COUNT(*) INTO conflitos_bloqueios
  FROM public.bloqueios_agenda b
  WHERE b.sala_id = p_sala_id
    AND b.ativo = true
    AND (b.data_inicio, b.data_fim) OVERLAPS (p_data_inicio, p_data_fim);
  
  RETURN jsonb_build_object(
    'disponivel', (conflitos_agendamentos = 0 AND conflitos_bloqueios = 0),
    'conflitos_agendamentos', conflitos_agendamentos,
    'conflitos_bloqueios', conflitos_bloqueios,
    'motivo', CASE 
      WHEN conflitos_agendamentos > 0 THEN 'Sala ocupada por outro agendamento'
      WHEN conflitos_bloqueios > 0 THEN 'Sala bloqueada'
      ELSE NULL
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO PARA CRIAR BLOQUEIO RECORRENTE
-- =====================================================

CREATE OR REPLACE FUNCTION public.criar_bloqueio_recorrente(
  p_profissional_id UUID,
  p_sala_id UUID,
  p_clinica_id UUID,
  p_data_inicio TIMESTAMPTZ,
  p_data_fim TIMESTAMPTZ,
  p_tipo bloqueio_tipo,
  p_titulo VARCHAR(200),
  p_descricao TEXT,
  p_padrao_recorrencia JSONB,
  p_data_limite DATE DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  bloqueio_id UUID;
  data_atual DATE;
  data_limite_calc DATE;
  contador INTEGER := 0;
  max_ocorrencias INTEGER := 100; -- Limite de segurança
  intervalo_dias INTEGER;
  dias_semana INTEGER[];
  proxima_data TIMESTAMPTZ;
  proxima_data_fim TIMESTAMPTZ;
  duracao INTERVAL;
  resultado JSONB;
BEGIN
  -- Calcular duração do bloqueio
  duracao := p_data_fim - p_data_inicio;
  
  -- Definir data limite (padrão: 1 ano)
  data_limite_calc := COALESCE(p_data_limite, (p_data_inicio::DATE + INTERVAL '1 year')::DATE);
  
  -- Extrair configurações de recorrência
  intervalo_dias := COALESCE((p_padrao_recorrencia->>'interval_days')::INTEGER, 7);
  dias_semana := CASE 
    WHEN p_padrao_recorrencia->'days_of_week' IS NOT NULL THEN
      ARRAY(SELECT jsonb_array_elements_text(p_padrao_recorrencia->'days_of_week'))::INTEGER[]
    ELSE ARRAY[EXTRACT(DOW FROM p_data_inicio)::INTEGER]
  END;
  
  -- Criar bloqueio inicial
  INSERT INTO public.bloqueios_agenda (
    profissional_id,
    sala_id,
    clinica_id,
    data_inicio,
    data_fim,
    tipo,
    titulo,
    descricao,
    recorrente,
    padrao_recorrencia,
    criado_por
  ) VALUES (
    p_profissional_id,
    p_sala_id,
    p_clinica_id,
    p_data_inicio,
    p_data_fim,
    p_tipo,
    p_titulo,
    p_descricao,
    true,
    p_padrao_recorrencia,
    auth.uid()
  ) RETURNING id INTO bloqueio_id;
  
  contador := contador + 1;
  
  -- Criar ocorrências recorrentes
  data_atual := p_data_inicio::DATE + intervalo_dias;
  
  WHILE data_atual <= data_limite_calc AND contador < max_ocorrencias LOOP
    -- Verificar se o dia da semana está nos dias permitidos
    IF EXTRACT(DOW FROM data_atual)::INTEGER = ANY(dias_semana) THEN
      proxima_data := data_atual + (p_data_inicio::TIME);
      proxima_data_fim := proxima_data + duracao;
      
      -- Criar bloqueio recorrente
      INSERT INTO public.bloqueios_agenda (
        profissional_id,
        sala_id,
        clinica_id,
        data_inicio,
        data_fim,
        tipo,
        titulo,
        descricao,
        recorrente,
        padrao_recorrencia,
        criado_por
      ) VALUES (
        p_profissional_id,
        p_sala_id,
        p_clinica_id,
        proxima_data,
        proxima_data_fim,
        p_tipo,
        p_titulo,
        p_descricao,
        true,
        p_padrao_recorrencia || jsonb_build_object('bloqueio_pai_id', bloqueio_id),
        auth.uid()
      );
      
      contador := contador + 1;
    END IF;
    
    data_atual := data_atual + intervalo_dias;
  END LOOP;
  
  resultado := jsonb_build_object(
    'sucesso', true,
    'bloqueio_principal_id', bloqueio_id,
    'total_bloqueios_criados', contador,
    'data_limite', data_limite_calc
  );
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO PARA BUSCAR HORÁRIOS DISPONÍVEIS
-- =====================================================

CREATE OR REPLACE FUNCTION public.buscar_horarios_disponiveis(
  p_profissional_id UUID,
  p_servico_id UUID,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_duracao_minutos INTEGER DEFAULT 60,
  p_intervalo_minutos INTEGER DEFAULT 30,
  p_sala_preferida UUID DEFAULT NULL
)
RETURNS TABLE (
  data_horario TIMESTAMPTZ,
  disponivel BOOLEAN,
  sala_sugerida UUID,
  sala_nome VARCHAR,
  conflitos JSONB
) AS $$
DECLARE
  horario_funcionamento JSONB;
  dia_atual DATE;
  horario_atual TIME;
  data_horario_atual TIMESTAMPTZ;
  disponibilidade_prof JSONB;
  disponibilidade_sala JSONB;
  sala_id UUID;
  sala_nome_var VARCHAR;
BEGIN
  -- Buscar horário de funcionamento do profissional
  SELECT p.horario_trabalho INTO horario_funcionamento
  FROM public.profissionais p
  WHERE p.user_id = p_profissional_id;
  
  -- Loop através dos dias
  dia_atual := p_data_inicio;
  WHILE dia_atual <= p_data_fim LOOP
    DECLARE
      dia_semana TEXT;
      horario_inicio TIME;
      horario_fim TIME;
      dia_fechado BOOLEAN;
    BEGIN
      dia_semana := LOWER(TO_CHAR(dia_atual, 'Day'));
      dia_semana := TRIM(dia_semana);
      
      -- Verificar se o dia está fechado
      dia_fechado := COALESCE((horario_funcionamento->dia_semana->>'closed')::boolean, false);
      
      IF NOT dia_fechado THEN
        horario_inicio := COALESCE((horario_funcionamento->dia_semana->>'start')::TIME, '08:00'::TIME);
        horario_fim := COALESCE((horario_funcionamento->dia_semana->>'end')::TIME, '18:00'::TIME);
        
        -- Loop através dos horários do dia
        horario_atual := horario_inicio;
        WHILE horario_atual + (p_duracao_minutos || ' minutes')::INTERVAL <= horario_fim::TIME LOOP
          data_horario_atual := dia_atual + horario_atual;
          
          -- Verificar disponibilidade do profissional
          disponibilidade_prof := public.verificar_disponibilidade_profissional(
            p_profissional_id,
            data_horario_atual,
            data_horario_atual + (p_duracao_minutos || ' minutes')::INTERVAL
          );
          
          -- Buscar sala disponível
          sala_id := p_sala_preferida;
          sala_nome_var := NULL;
          
          IF sala_id IS NULL THEN
            -- Buscar primeira sala disponível
            SELECT s.id, s.nome INTO sala_id, sala_nome_var
            FROM public.salas_clinica s
            WHERE s.ativo = true 
              AND s.disponivel_agendamento = true
              AND public.verificar_disponibilidade_sala(
                s.id,
                data_horario_atual,
                data_horario_atual + (p_duracao_minutos || ' minutes')::INTERVAL
              )->>'disponivel' = 'true'
            LIMIT 1;
          ELSE
            SELECT s.nome INTO sala_nome_var
            FROM public.salas_clinica s
            WHERE s.id = sala_id;
            
            disponibilidade_sala := public.verificar_disponibilidade_sala(
              sala_id,
              data_horario_atual,
              data_horario_atual + (p_duracao_minutos || ' minutes')::INTERVAL
            );
            
            IF (disponibilidade_sala->>'disponivel')::boolean = false THEN
              sala_id := NULL;
              sala_nome_var := NULL;
            END IF;
          END IF;
          
          -- Retornar resultado
          data_horario := data_horario_atual;
          disponivel := (disponibilidade_prof->>'disponivel')::boolean AND sala_id IS NOT NULL;
          sala_sugerida := sala_id;
          sala_nome := sala_nome_var;
          conflitos := jsonb_build_object(
            'profissional', disponibilidade_prof,
            'sala', COALESCE(disponibilidade_sala, '{}'::jsonb)
          );
          
          RETURN NEXT;
          
          horario_atual := horario_atual + (p_intervalo_minutos || ' minutes')::INTERVAL;
        END LOOP;
      END IF;
    END;
    
    dia_atual := dia_atual + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO PARA VALIDAR AGENDAMENTO COMPLETO
-- =====================================================

CREATE OR REPLACE FUNCTION public.validar_agendamento_completo(
  p_cliente_id UUID,
  p_profissional_id UUID,
  p_servico_id UUID,
  p_sala_id UUID,
  p_data_agendamento TIMESTAMPTZ,
  p_duracao_minutos INTEGER,
  p_agendamento_excluir UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  validacao_result JSONB := jsonb_build_object('valido', true, 'erros', '[]'::jsonb, 'avisos', '[]'::jsonb);
  data_fim TIMESTAMPTZ;
  disponibilidade_prof JSONB;
  disponibilidade_sala JSONB;
  cliente_existe BOOLEAN;
  servico_ativo BOOLEAN;
  intervalo_minimo INTEGER;
  ultimo_agendamento TIMESTAMPTZ;
BEGIN
  data_fim := p_data_agendamento + (p_duracao_minutos || ' minutes')::INTERVAL;
  
  -- Verificar se cliente existe
  SELECT EXISTS(SELECT 1 FROM public.clientes WHERE id = p_cliente_id) INTO cliente_existe;
  IF NOT cliente_existe THEN
    validacao_result := jsonb_set(
      validacao_result,
      '{erros}',
      (validacao_result->'erros') || '["Cliente não encontrado"]'::jsonb
    );
  END IF;
  
  -- Verificar se serviço está ativo
  SELECT ativo INTO servico_ativo FROM public.servicos WHERE id = p_servico_id;
  IF NOT servico_ativo THEN
    validacao_result := jsonb_set(
      validacao_result,
      '{erros}',
      (validacao_result->'erros') || '["Serviço não está ativo"]'::jsonb
    );
  END IF;
  
  -- Verificar disponibilidade do profissional
  disponibilidade_prof := public.verificar_disponibilidade_profissional(
    p_profissional_id,
    p_data_agendamento,
    data_fim,
    p_agendamento_excluir
  );
  
  IF (disponibilidade_prof->>'disponivel')::boolean = false THEN
    validacao_result := jsonb_set(
      validacao_result,
      '{erros}',
      (validacao_result->'erros') || jsonb_build_array('Profissional não disponível: ' || (disponibilidade_prof->>'motivo'))
    );
  END IF;
  
  -- Verificar disponibilidade da sala se especificada
  IF p_sala_id IS NOT NULL THEN
    disponibilidade_sala := public.verificar_disponibilidade_sala(
      p_sala_id,
      p_data_agendamento,
      data_fim,
      p_agendamento_excluir
    );
    
    IF (disponibilidade_sala->>'disponivel')::boolean = false THEN
      validacao_result := jsonb_set(
        validacao_result,
        '{erros}',
        (validacao_result->'erros') || jsonb_build_array('Sala não disponível: ' || (disponibilidade_sala->>'motivo'))
      );
    END IF;
  END IF;
  
  -- Verificar intervalo mínimo entre procedimentos do mesmo tipo
  SELECT s.intervalo_minimo_dias INTO intervalo_minimo
  FROM public.servicos s
  WHERE s.id = p_servico_id;
  
  IF intervalo_minimo > 0 THEN
    SELECT MAX(a.data_agendamento) INTO ultimo_agendamento
    FROM public.agendamentos a
    WHERE a.cliente_id = p_cliente_id
      AND a.servico_id = p_servico_id
      AND a.status IN ('finalizado', 'confirmado', 'em_andamento')
      AND (p_agendamento_excluir IS NULL OR a.id != p_agendamento_excluir);
    
    IF ultimo_agendamento IS NOT NULL AND 
       p_data_agendamento < ultimo_agendamento + (intervalo_minimo || ' days')::INTERVAL THEN
      validacao_result := jsonb_set(
        validacao_result,
        '{avisos}',
        (validacao_result->'avisos') || jsonb_build_array(
          'Intervalo mínimo de ' || intervalo_minimo || ' dias não respeitado. Último procedimento: ' || ultimo_agendamento::DATE
        )
      );
    END IF;
  END IF;
  
  -- Definir se é válido baseado na presença de erros
  validacao_result := jsonb_set(
    validacao_result,
    '{valido}',
    to_jsonb(jsonb_array_length(validacao_result->'erros') = 0)
  );
  
  -- Adicionar detalhes de disponibilidade
  validacao_result := validacao_result || jsonb_build_object(
    'disponibilidade_profissional', disponibilidade_prof,
    'disponibilidade_sala', COALESCE(disponibilidade_sala, '{}'::jsonb)
  );
  
  RETURN validacao_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION public.verificar_disponibilidade_profissional IS 'Verifica disponibilidade completa de profissional considerando horário de trabalho, agendamentos e bloqueios';
COMMENT ON FUNCTION public.verificar_disponibilidade_sala IS 'Verifica disponibilidade de sala considerando agendamentos e bloqueios';
COMMENT ON FUNCTION public.criar_bloqueio_recorrente IS 'Cria bloqueios recorrentes baseados em padrão configurável';
COMMENT ON FUNCTION public.buscar_horarios_disponiveis IS 'Busca horários disponíveis em um período considerando todas as restrições';
COMMENT ON FUNCTION public.validar_agendamento_completo IS 'Validação completa de agendamento com todas as regras de negócio';